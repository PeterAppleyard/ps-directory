-- One-off data tidy-up for the live database. NOT a migration — review each step
-- and run by hand in the Supabase SQL editor. Steps 1 and 2 only read.

-- 1. Suburbs that differ only by capitalisation (e.g. "WEST PYMBLE" vs "West Pymble")
select lower(address_suburb) as suburb, array_agg(distinct address_suburb) as spellings, count(*)
from houses
group by 1
having count(distinct address_suburb) > 1;

-- 2. Likely duplicates and test rows: same suburb + street name listed more than once
select lower(address_suburb) as suburb,
       lower(regexp_replace(address_street, '^\d+\w*\s+', '')) as street_name,
       count(*),
       array_agg(slug order by created_at) as slugs,
       array_agg(status order by created_at) as statuses
from houses
group by 1, 2
having count(*) > 1
order by count(*) desc;

-- 3. Fix capitalisation (new submissions are normalised by the app from now on).
--    initcap() also capitalises after hyphens, so check hyphenated suburbs afterwards.
-- update houses
-- set address_suburb = initcap(lower(address_suburb))
-- where address_suburb <> initcap(lower(address_suburb));

-- 4. Remove test listings — easiest from the admin dashboard (Delete also removes the
--    photos from storage, which a SQL delete does not).
