-- Hide private submission fields on `houses` from the public API.
--
-- RLS only filters rows: anyone holding the anon key (it ships in the site's JS) could
-- request submitter_email, verification_notes, contributor_id and verified_by for every
-- published house. Column-level grants close that off. The admin dashboard and the
-- submit/save-image APIs use the service role, which is unaffected.
--
-- ORDER MATTERS: deploy the app code that stops using select('*') on houses FIRST.
-- Once this runs, any anon/authenticated select('*') on houses fails with
-- "permission denied for table houses".
--
-- When adding a new column that should be public, grant it here AND add it to
-- PUBLIC_HOUSE_COLUMNS in src/lib/houses.ts.

revoke select on public.houses from anon, authenticated;

grant select (
	id,
	slug,
	created_at,
	address_street,
	address_suburb,
	address_state,
	address_postcode,
	latitude,
	longitude,
	style,
	year_built,
	builder_name,
	description,
	condition,
	status,
	listing_url,
	sold_listing_url,
	is_featured
) on public.houses to anon, authenticated;

-- Verify (should return no rows for the private columns):
-- select grantee, column_name from information_schema.column_privileges
-- where table_name = 'houses' and grantee in ('anon', 'authenticated')
--   and column_name in ('submitter_email', 'verification_notes', 'contributor_id', 'verified_by');
