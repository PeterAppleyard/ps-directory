# PS Archive — Setup Guide

## 1. Database Migration

Run the following SQL in your **Supabase dashboard → SQL Editor**:

```sql
-- Profiles table (stores roles + notification preferences)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'superuser'
    CHECK (role IN ('superuser', 'admin', 'super_admin')),
  email_on_new_submission BOOLEAN NOT NULL DEFAULT true,
  email_on_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add submitter email to houses (for approval notifications)
ALTER TABLE public.houses
  ADD COLUMN IF NOT EXISTS submitter_email TEXT;

-- RLS: users can read their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Add missing profile columns (notification_frequency and theme)

Run in **Supabase → SQL Editor** after creating the profiles table:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_frequency TEXT NOT NULL DEFAULT 'instant'
    CHECK (notification_frequency IN ('instant', 'daily', 'none')),
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system'));
```

### Takedown requests table (for Privacy / Request removal form)

Run in **Supabase → SQL Editor** when adding the privacy and takedown pages:

```sql
CREATE TABLE takedown_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  request_type text NOT NULL CHECK (request_type IN ('full_removal', 'image_removal', 'address_removal')),
  house_url text,
  house_address text,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE takedown_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert takedown requests"
  ON takedown_requests FOR INSERT WITH CHECK (true);
```

(Admins can read rows via the service role in the dashboard or a future admin UI.)

### Property stories (Know this property?)

Run in **Supabase → SQL Editor** when adding the “Know this property?” feature:

```sql
CREATE TABLE property_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  story text NOT NULL,
  period_or_context text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved'))
);

ALTER TABLE property_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert property stories"
  ON property_stories FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read approved property stories"
  ON property_stories FOR SELECT USING (status = 'approved');
```

Admins can set `status = 'approved'` in the Table Editor (or a future admin UI) for stories to appear on the listing.

## 2. Supabase Auth Configuration

In your Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://psvitt.com`
- **Redirect URLs** — add all of these:
  - `https://psvitt.com/auth/callback*`  ← the `*` wildcard is required (allows query strings like `?next=/admin/reset-password`)
  - `http://localhost:5173/auth/callback*`  ← for local dev

> **Important**: The wildcard `*` suffix is mandatory. Without it, the password reset email will redirect to Supabase's own hosted UI instead of the app's `/admin/reset-password` page.

## 3. Bootstrap Your Super Admin Account

1. Go to **Supabase dashboard → Authentication → Users → Add user**
2. Create a user with your email and a temporary password
3. Sign in at `https://psvitt.com/admin/login` with those credentials
4. In Supabase → **SQL Editor**, run:

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your@email.com'
);
```

5. Refresh `/admin` — you now have full Super Admin access.

> **If you already have an account but emails aren't working**, your profile role may have been left as the default `'superuser'`. The email notification query only targets `'admin'` and `'super_admin'` roles. Run the SQL above to fix it.

## 4. Add Team Members

Once you're signed in as Super Admin:

1. Go to `/admin/users`
2. Enter their email and choose their role
3. Click **Send Invite** — they'll receive an email to set their password

## 5. Resend Email Setup (Optional but Recommended)

Email is used to notify admins when a new house is submitted, and to notify submitters when their listing is approved or rejected.

**Checklist:**

1. **Sign up** at [resend.com](https://resend.com).
2. **Create an API key** — Dashboard → API Keys → Create. Copy the key (starts with `re_`). Keep it secret; if exposed, revoke it and create a new one.
3. **From address** — Either verify your own domain in Resend and use e.g. `noreply@yourdomain.com`, or use Resend’s onboarding domain for testing (see Resend docs for allowed senders on your plan).
4. **Local env** — In `.env.local` (or `.env`) add:
   - `RESEND_API_KEY` = your API key
   - `RESEND_FROM_EMAIL` = your verified sender (e.g. `noreply@yourdomain.com`)
5. **Production** — In Vercel (or your host): Project → Settings → Environment Variables. Add the same two variables for Production (and Preview if you want emails on preview deploys).
6. **Restart** — Restart the dev server after changing env so SvelteKit picks up the new values.

Without `RESEND_API_KEY`, email notifications are skipped (you’ll see a log line); the rest of the app works normally.

## Role Reference

| Role | Can do |
|---|---|
| **Superuser** | Quick Add, Bulk Import, edit published listings |
| **Admin** | All above + approve/reject, notification settings, invite superusers |
| **Super Admin** | All above + invite admins, remove users |
