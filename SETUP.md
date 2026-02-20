# Project Sydney — Setup Guide

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

## 2. Supabase Auth Configuration

In your Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://ps-directory.vercel.app` (or your domain)
- **Redirect URLs**: Add `https://ps-directory.vercel.app/auth/callback`

## 3. Bootstrap Your Super Admin Account

1. Go to `https://ps-directory.vercel.app/admin/login`
2. Click **Forgot password?** — this won't work yet (no account), so instead:
3. Go to **Supabase dashboard → Authentication → Users → Add user**
4. Create a user with your email and a temporary password
5. Sign in at `/admin/login` with those credentials
6. In Supabase → **SQL Editor**, run:

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your@email.com'
);
```

7. Refresh `/admin` — you now have full Super Admin access.

## 4. Add Team Members

Once you're signed in as Super Admin:

1. Go to `/admin/users`
2. Enter their email and choose their role
3. Click **Send Invite** — they'll receive an email to set their password

## 5. Resend Email Setup (Optional but Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add a sending domain (or use Resend's shared domain for testing)
4. Add to Vercel environment variables:
   - `RESEND_API_KEY` = your API key
   - `RESEND_FROM_EMAIL` = `noreply@yourdomain.com`

Without `RESEND_API_KEY`, email notifications are silently skipped — everything else works fine.

## Role Reference

| Role | Can do |
|---|---|
| **Superuser** | Quick Add, Bulk Import, edit published listings |
| **Admin** | All above + approve/reject, notification settings, invite superusers |
| **Super Admin** | All above + invite admins, remove users |
