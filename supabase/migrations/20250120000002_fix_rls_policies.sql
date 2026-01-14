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
