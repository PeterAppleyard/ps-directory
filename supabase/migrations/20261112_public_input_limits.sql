-- Tighten what the public (anon key) can write.
--
-- ORDER MATTERS: deploy the app code first (takedowns now go through /api/takedown).
-- Run after 20261002_restrict_public_house_columns.sql.

-- 1. Stories: the old policy was WITH CHECK (true), so anyone calling the API directly
--    could insert a story with status = 'approved' and skip moderation entirely.
drop policy if exists "Public can insert property stories" on public.property_stories;
create policy "Public can insert pending property stories"
	on public.property_stories for insert
	to anon, authenticated
	with check (status = 'pending');

-- 2. Takedowns are now inserted server-side (service role) so admins get emailed.
--    Remove direct public inserts.
drop policy if exists "Public can insert takedown requests" on public.takedown_requests;

-- 3. Length limits on free text from the public. NOT VALID = existing rows aren't checked.
alter table public.property_stories
	add constraint property_stories_author_len check (char_length(author_name) <= 200) not valid,
	add constraint property_stories_story_len check (char_length(story) <= 5000) not valid,
	add constraint property_stories_context_len check (char_length(period_or_context) <= 200) not valid;

-- 4. Image bucket: the submit form and admin both upload compressed WebP (<~1MB).
--    Reject anything else at the storage layer.
update storage.buckets
set file_size_limit = 3145728, -- 3 MB
	allowed_mime_types = array['image/webp']
where id = 'house-images';

-- Worth checking by hand in Storage → Policies: the anon INSERT policy on house-images
-- should not allow UPDATE or DELETE (otherwise anyone could overwrite or delete photos).
-- select policyname, cmd, roles, qual, with_check from pg_policies
-- where schemaname = 'storage' and tablename = 'objects';
