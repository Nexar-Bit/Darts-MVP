# Database Migration Guide

This guide explains how to set up and update your Supabase database for the Dart Throw Analysis Platform.

## 📋 Migration Files

The project includes 4 migration files that must be run in order:

1. `20250120000000_create_profiles_table.sql` - Creates the profiles table
2. `20250120000001_add_usage_tracking.sql` - Adds usage tracking columns
3. `20250120000002_fix_rls_policies.sql` - Fixes RLS policies
4. `20250120000003_create_jobs_table.sql` - Creates the jobs table

## 🗄️ Database Schema

### `profiles` Table

Stores user profile and subscription information.

**Columns:**
- `id` (uuid, primary key) - References `auth.users.id`
- `email` (text) - User email
- `is_paid` (boolean, default: false) - Payment status
- `stripe_customer_id` (text) - Stripe customer ID
- `stripe_subscription_id` (text) - Stripe subscription ID
- `analysis_count` (integer, default: 0) - Current analysis usage
- `analysis_limit` (integer, default: 0) - Maximum analyses allowed
- `last_analysis_reset` (timestamp) - When count was last reset
- `plan_type` (text, default: 'free') - Plan type: 'free', 'starter', or 'monthly'
- `plan_purchased_at` (timestamp) - When plan was purchased
- `updated_at` (timestamp) - Last update time

**Indexes:**
- Primary key on `id`
- Index on `plan_type`

**RLS Policies:**
- Users can view own profile
- Users can update own profile
- Users can insert own profile

**Triggers:**
- `on_auth_user_created` - Automatically creates profile when user signs up

### `jobs` Table

Stores video analysis job information.

**Columns:**
- `job_id` (uuid, primary key) - Unique job identifier
- `user_id` (uuid) - References `auth.users.id`
- `created_at_unix` (bigint) - Creation timestamp (Unix epoch)
- `original_filename` (text) - Original video filename
- `status` (text, default: 'queued') - Job status: 'queued', 'running', 'done', 'failed'
- `progress` (numeric) - Progress (0.0 to 1.0)
- `stage` (text) - Current processing stage
- `error_message` (text) - Error message if failed
- `overlay_url` (text) - Overlay video URL
- `overlay_side_url` (text) - Side overlay video URL
- `overlay_front_url` (text) - Front overlay video URL
- `analysis_url` (text) - Analysis results URL
- `practice_plan_url` (text) - Practice plan URL
- `practice_plan_txt_url` (text) - Practice plan text URL
- `practice_plan_pdf_url` (text) - Practice plan PDF URL
- `lesson_plan_url` (text) - Lesson plan URL
- `throws_detected` (integer) - Number of throws detected
- `result_data` (jsonb) - Full result data as JSON
- `updated_at` (timestamp) - Last update time

**Indexes:**
- Primary key on `job_id`
- Index on `user_id`
- Index on `status`
- Index on `created_at_unix` (descending)

**RLS Policies:**
- Users can view own jobs
- Users can insert own jobs
- Users can update own jobs

---

## 🚀 How to Apply Migrations

### Method 1: Supabase Dashboard (Recommended for Beginners)

1. **Go to Supabase Dashboard**
   - Navigate to [supabase.com](https://supabase.com)
   - Select your project
   - Go to **SQL Editor**

2. **Run Each Migration**
   - Open each migration file in order
   - Copy the entire SQL content
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
   - Verify success message

3. **Verify Tables Created**
   - Go to **Table Editor**
   - You should see `profiles` and `jobs` tables
   - Check that columns match the schema above

### Method 2: Supabase CLI (Recommended for Developers)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Push Migrations**
   ```bash
   supabase db push
   ```

   This will apply all migrations in the `supabase/migrations/` folder.

### Method 3: Manual SQL Execution

If you prefer to run migrations manually:

1. **Connect to your database** (via psql, pgAdmin, or Supabase Dashboard)
2. **Run each migration file in order:**
   ```sql
   -- Run migration 1
   \i supabase/migrations/20250120000000_create_profiles_table.sql
   
   -- Run migration 2
   \i supabase/migrations/20250120000001_add_usage_tracking.sql
   
   -- Run migration 3
   \i supabase/migrations/20250120000002_fix_rls_policies.sql
   
   -- Run migration 4
   \i supabase/migrations/20250120000003_create_jobs_table.sql
   ```

---

## ✅ Verification Steps

After running migrations, verify everything is set up correctly:

### 1. Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'jobs');
```

Should return:
- `profiles`
- `jobs`

### 2. Check Profiles Table Columns

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

Should include all columns listed in the schema above.

### 3. Check Jobs Table Columns

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;
```

Should include all columns listed in the schema above.

### 4. Check RLS Policies

```sql
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'jobs');
```

Should show policies for both tables.

### 5. Check Triggers

```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

Should show `on_auth_user_created` trigger.

### 6. Test RLS Policies

```sql
-- This should work (viewing your own profile)
SELECT * FROM profiles WHERE id = auth.uid();

-- This should fail (viewing someone else's profile)
-- (Will return empty if RLS is working correctly)
```

---

## 🔄 Updating Existing Database

If you already have a database with some tables, the migrations use `IF NOT EXISTS` and `IF NOT EXISTS` clauses to safely add missing columns/tables.

### Safe Migration Order

The migrations are designed to be **idempotent** (safe to run multiple times):

1. **Migration 1** - Creates `profiles` table (will fail if exists, but that's OK)
2. **Migration 2** - Adds columns with `IF NOT EXISTS` (safe to re-run)
3. **Migration 3** - Drops and recreates policies (safe to re-run)
4. **Migration 4** - Creates `jobs` table with `IF NOT EXISTS` (safe to re-run)

### If You Have Existing Data

If you already have a `profiles` table with data:

1. **Backup your data first:**
   ```sql
   -- Export existing profiles
   COPY profiles TO '/tmp/profiles_backup.csv' WITH CSV HEADER;
   ```

2. **Run migrations** - They will add missing columns safely

3. **Update existing records** (if needed):
   ```sql
   -- Set default values for new columns
   UPDATE profiles 
   SET 
     analysis_count = COALESCE(analysis_count, 0),
     analysis_limit = COALESCE(analysis_limit, 0),
     plan_type = COALESCE(plan_type, 'free')
   WHERE analysis_count IS NULL 
      OR analysis_limit IS NULL 
      OR plan_type IS NULL;
   ```

---

## 🐛 Troubleshooting

### Error: "relation already exists"

**Cause:** Table already exists from previous migration run.

**Solution:** This is OK - the migration will skip creating existing tables. Continue with next migration.

### Error: "column already exists"

**Cause:** Column was added in a previous migration.

**Solution:** Migration 2 uses `IF NOT EXISTS` - it should skip existing columns. If error persists, check the migration file.

### Error: "permission denied"

**Cause:** RLS policies are blocking access.

**Solution:** 
1. Verify you're authenticated: `SELECT auth.uid();`
2. Check RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';`
3. Verify policies exist (see verification steps above)

### Error: "trigger already exists"

**Cause:** Trigger was created in a previous migration.

**Solution:** The trigger uses `CREATE OR REPLACE` - it should update if exists. If error persists, drop and recreate:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Then re-run migration 1
```

### RLS Policies Not Working

**Symptoms:** Users can't access their own data.

**Solution:**
1. Verify RLS is enabled: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
2. Re-run migration 3 to recreate policies
3. Test with: `SELECT * FROM profiles WHERE id = auth.uid();`

---

## 📝 Migration Checklist

Use this checklist when setting up your database:

- [ ] Migration 1: `create_profiles_table.sql` - Run successfully
- [ ] Migration 2: `add_usage_tracking.sql` - Run successfully
- [ ] Migration 3: `fix_rls_policies.sql` - Run successfully
- [ ] Migration 4: `create_jobs_table.sql` - Run successfully
- [ ] Verify `profiles` table exists with all columns
- [ ] Verify `jobs` table exists with all columns
- [ ] Verify RLS policies are active
- [ ] Verify trigger `on_auth_user_created` exists
- [ ] Test user signup creates profile automatically
- [ ] Test RLS policies (users can only see own data)

---

## 🔗 Related Documentation

- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/tables)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)

---

## 💡 Quick Reference

**View all tables:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

**View table structure:**
```sql
\d profiles  -- In psql
-- OR
SELECT * FROM information_schema.columns 
WHERE table_name = 'profiles';
```

**Check RLS status:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**View all policies:**
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'public';
```

---

**Last Updated:** 2025-01-20
**Migration Version:** 4 migrations (all required)
