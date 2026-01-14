# Supabase Migration Guide

## Issue
The `analysis_count`, `analysis_limit`, and other usage tracking columns are missing from your `profiles` table, causing errors when purchasing plans.

## Solution: Run Database Migrations

You need to run two migrations in your Supabase database:

### Migration 1: Create Profiles Table (if not already run)
File: `supabase/migrations/20250120000000_create_profiles_table.sql`

### Migration 2: Add Usage Tracking Columns ⚠️ **REQUIRED**
File: `supabase/migrations/20250120000001_add_usage_tracking.sql`

### Migration 3: Fix RLS Policies (recommended)
File: `supabase/migrations/20250120000002_fix_rls_policies.sql`

## How to Run Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of each migration file (one at a time)
6. Click **Run** (or press Ctrl+Enter)
7. Repeat for each migration file

### Option 2: Via Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

## Migration Files to Run

### 1. `20250120000001_add_usage_tracking.sql`
```sql
-- Add usage tracking columns to profiles table
alter table profiles
  add column if not exists analysis_count integer default 0,
  add column if not exists analysis_limit integer default 0,
  add column if not exists last_analysis_reset timestamp with time zone,
  add column if not exists plan_type text default 'free' check (plan_type in ('free', 'starter', 'monthly')),
  add column if not exists plan_purchased_at timestamp with time zone;

-- Create index for faster queries
create index if not exists idx_profiles_plan_type on profiles(plan_type);

-- Add comments
comment on column profiles.analysis_count is 'Current number of analyses used in the current period';
comment on column profiles.analysis_limit is 'Maximum number of analyses allowed (3 for starter, 12 for monthly)';
comment on column profiles.last_analysis_reset is 'When the analysis count was last reset (for monthly plans)';
comment on column profiles.plan_type is 'Current plan type: free, starter (one-time), or monthly (subscription)';
comment on column profiles.plan_purchased_at is 'When the current plan was purchased';
```

### 2. `20250120000002_fix_rls_policies.sql`
```sql
-- Ensure RLS is enabled
alter table profiles enable row level security;

-- Drop existing policies if they exist (to recreate them)
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;

-- Create policies with explicit grant
create policy "Users can view own profile" 
  on profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on profiles for update 
  using (auth.uid() = id);

-- Allow users to insert their own profile (for initial creation)
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);
```

## Verify Migration Success

After running the migrations, verify the columns exist:

1. Go to Supabase Dashboard → **Table Editor**
2. Select the `profiles` table
3. Check that these columns exist:
   - `analysis_count`
   - `analysis_limit`
   - `last_analysis_reset`
   - `plan_type`
   - `plan_purchased_at`

## After Running Migrations

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R)
2. **Try purchasing a plan again**
3. The membership status should now display correctly

## Troubleshooting

### If you get "column already exists" errors:
- This is fine - the `IF NOT EXISTS` clause prevents errors
- The migration is idempotent (safe to run multiple times)

### If you get permission errors:
- Make sure you're using the service role key for migrations
- Or run migrations via the Supabase Dashboard SQL Editor

### If RLS errors persist:
- Make sure Migration 2 (`fix_rls_policies.sql`) was run
- Check that your user is authenticated when making queries

## Quick Fix (Temporary)

The code has been updated to handle missing columns gracefully, so purchases will work but usage tracking won't be available until migrations are run.
