create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES
-- ============================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    email text,
    phone text,
    city text,
    created_at timestamptz not null default now()
);

-- ============================================================
-- PREDICTIONS
-- ============================================================

create table public.predictions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,

    event_name text not null,
    location text not null,
    season text not null,
    day_type text not null,

    crowd double precision not null,
    temperature double precision not null,
    humidity double precision not null,
    do_mgl double precision not null,
    bod_mgl double precision not null,
    fecal_coliform double precision not null,

    predicted_waste double precision not null,
    pollution_risk text not null,
    workers_required integer not null,

    created_at timestamptz not null default now()
);

-- ============================================================
-- JOBS
-- ============================================================

create table public.jobs (
    id uuid primary key default gen_random_uuid(),

    prediction_id uuid references public.predictions(id)
        on delete set null,

    created_by uuid references auth.users(id)
        on delete set null,

    event_name text not null,
    location text not null,
    address text not null,

    predicted_waste double precision not null,
    pollution_risk text not null,

    workers_required integer not null
        check (workers_required >= 0),

    accepted_workers integer not null default 0
        check (accepted_workers >= 0),

    reward_per_worker double precision not null
        check (reward_per_worker >= 0),

    latitude double precision,
    longitude double precision,

    status text not null default 'open'
        check (status in ('open', 'full', 'closed')),

    deadline timestamptz not null,

    created_at timestamptz not null default now(),

    check (accepted_workers <= workers_required)
);

-- ============================================================
-- JOB APPLICATIONS
-- ============================================================

create table public.job_applications (
    id uuid primary key default gen_random_uuid(),

    job_id uuid not null references public.jobs(id)
        on delete cascade,

    user_id uuid not null references auth.users(id)
        on delete cascade,

    status text not null default 'accepted'
        check (
            status in (
                'accepted',
                'completed',
                'expired'
            )
        ),

    accepted_at timestamptz not null default now(),

    submission_deadline timestamptz not null,

    completed_at timestamptz,

    created_at timestamptz not null default now(),

    unique (job_id, user_id)
);

-- ============================================================
-- WORK SUBMISSIONS
-- ============================================================

create table public.work_submissions (
    id uuid primary key default gen_random_uuid(),

    application_id uuid not null unique
        references public.job_applications(id)
        on delete cascade,

    user_id uuid not null references auth.users(id)
        on delete cascade,

    job_id uuid not null references public.jobs(id)
        on delete cascade,

    before_image_url text not null,
    after_image_url text not null,

    collected_weight_kg double precision not null
        check (collected_weight_kg > 0),

    status text not null default 'completed'
        check (status in ('completed')),

    submitted_at timestamptz not null default now()
);

-- ============================================================
-- REWARDS
-- ============================================================

create table public.rewards (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references auth.users(id)
        on delete cascade,

    job_id uuid not null references public.jobs(id)
        on delete cascade,

    application_id uuid not null unique
        references public.job_applications(id)
        on delete cascade,

    amount double precision not null
        check (amount >= 0),

    status text not null default 'earned'
        check (status in ('earned')),

    created_at timestamptz not null default now()
);

-- ============================================================
-- CERTIFICATES
-- ============================================================

create table public.certificates (
    id uuid primary key,

    user_id uuid not null references auth.users(id)
        on delete cascade,

    job_id uuid not null references public.jobs(id)
        on delete cascade,

    application_id uuid not null unique
        references public.job_applications(id)
        on delete cascade,

    submission_id uuid not null unique
        references public.work_submissions(id)
        on delete cascade,

    reward_id uuid not null unique
        references public.rewards(id)
        on delete cascade,

    pdf_url text not null,

    reward_amount double precision not null
        check (reward_amount >= 0),

    created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_predictions_user_id
on public.predictions(user_id);

create index idx_jobs_status
on public.jobs(status);

create index idx_jobs_created_at
on public.jobs(created_at desc);

create index idx_job_applications_user_id
on public.job_applications(user_id);

create index idx_job_applications_job_id
on public.job_applications(job_id);

create index idx_work_submissions_user_id
on public.work_submissions(user_id);

create index idx_rewards_user_id
on public.rewards(user_id);

create index idx_certificates_user_id
on public.certificates(user_id);

-- ============================================================
-- AUTOMATIC PROFILE CREATION
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (
        id,
        full_name,
        email
    )
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'full_name',
            ''
        ),
        new.email
    );

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- ============================================================
-- ONE ACCEPTED JOB PER USER PER UTC DAY
-- ============================================================

create unique index one_job_per_user_per_utc_day
on public.job_applications (
    user_id,
    ((accepted_at at time zone 'UTC')::date)
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.work_submissions enable row level security;
alter table public.rewards enable row level security;
alter table public.certificates enable row level security;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ============================================================
-- PREDICTIONS POLICIES
-- ============================================================

create policy "Users can view own predictions"
on public.predictions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own predictions"
on public.predictions
for insert
to authenticated
with check (auth.uid() = user_id);

-- ============================================================
-- JOBS POLICIES
-- ============================================================

create policy "Authenticated users can view jobs"
on public.jobs
for select
to authenticated
using (true);

create policy "Authenticated users can create jobs"
on public.jobs
for insert
to authenticated
with check (auth.uid() = created_by);

-- ============================================================
-- JOB APPLICATION POLICIES
-- ============================================================

create policy "Users can view own job applications"
on public.job_applications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own job applications"
on public.job_applications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own job applications"
on public.job_applications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- WORK SUBMISSION POLICIES
-- ============================================================

create policy "Users can view own work submissions"
on public.work_submissions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own work submissions"
on public.work_submissions
for insert
to authenticated
with check (auth.uid() = user_id);

-- ============================================================
-- REWARD POLICIES
-- ============================================================

create policy "Users can view own rewards"
on public.rewards
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own rewards"
on public.rewards
for insert
to authenticated
with check (auth.uid() = user_id);

-- ============================================================
-- CERTIFICATE POLICIES
-- ============================================================

create policy "Users can view own certificates"
on public.certificates
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own certificates"
on public.certificates
for insert
to authenticated
with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (
    id,
    name,
    public
)
values
    (
        'cleanup-images',
        'cleanup-images',
        true
    ),
    (
        'certificates',
        'certificates',
        true
    )
on conflict (id) do nothing;

-- ============================================================
-- STORAGE POLICIES: CLEANUP IMAGES
-- ============================================================

create policy "Users can upload cleanup images"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'cleanup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public can view cleanup images"
on storage.objects
for select
to public
using (
    bucket_id = 'cleanup-images'
);

-- ============================================================
-- STORAGE POLICIES: CERTIFICATES
-- ============================================================

create policy "Users can upload own certificates"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public can view certificates"
on storage.objects
for select
to public
using (
    bucket_id = 'certificates'
);