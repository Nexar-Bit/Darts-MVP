-- Create jobs table for analysis tracking
create table if not exists jobs (
  job_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at_unix bigint not null default extract(epoch from now()),
  original_filename text,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  progress numeric(5, 4) default 0 check (progress >= 0 and progress <= 1),
  stage text,
  error_message text,
  overlay_url text,
  overlay_side_url text,
  overlay_front_url text,
  analysis_url text,
  practice_plan_url text,
  practice_plan_txt_url text,
  practice_plan_pdf_url text,
  lesson_plan_url text,
  throws_detected integer,
  result_data jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create index for faster queries
create index if not exists idx_jobs_user_id on jobs(user_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_created_at on jobs(created_at_unix desc);

-- Enable RLS
alter table jobs enable row level security;

-- Create policies
create policy "Users can view own jobs" 
  on jobs for select 
  using (auth.uid() = user_id);

create policy "Users can insert own jobs" 
  on jobs for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own jobs" 
  on jobs for update 
  using (auth.uid() = user_id);
