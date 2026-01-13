-- Add usage tracking columns to profiles table
alter table profiles
  add column if not exists analysis_count integer default 0,
  add column if not exists analysis_limit integer default 0,
  add column if not exists last_analysis_reset timestamp with time zone,
  add column if not exists plan_type text default 'free' check (plan_type in ('free', 'starter', 'monthly')),
  add column if not exists plan_purchased_at timestamp with time zone;

-- Create index for faster queries
create index if not exists idx_profiles_plan_type on profiles(plan_type);

-- Add comment
comment on column profiles.analysis_count is 'Current number of analyses used in the current period';
comment on column profiles.analysis_limit is 'Maximum number of analyses allowed (3 for starter, 12 for monthly)';
comment on column profiles.last_analysis_reset is 'When the analysis count was last reset (for monthly plans)';
comment on column profiles.plan_type is 'Current plan type: free, starter (one-time), or monthly (subscription)';
comment on column profiles.plan_purchased_at is 'When the current plan was purchased';
