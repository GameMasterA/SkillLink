-- ==========================================================================
-- SkillLink — Supabase Cloud Database Architecture (PostgreSQL Schema)
-- Run this SQL in your Supabase SQL Editor to provision the complete cloud backend.
-- ==========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Linked with Supabase Auth users or standalone)
create table if not exists public.profiles (
    id text primary key,
    email text unique not null,
    role text not null check (role in ('freelancer', 'client', 'admin')),
    first_name text,
    last_name text,
    name text,
    avatar_url text,
    title text,
    bio text,
    skills text[] default '{}',
    primary_skill text,
    company text,
    starting_price numeric default 0,
    completed_jobs integer default 0,
    jobs_posted integer default 0,
    rating numeric default 5.0,
    reviews_count integer default 0,
    availability text default 'Available Now',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Categories Table
create table if not exists public.categories (
    id text primary key,
    name text unique not null,
    icon text,
    count integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Jobs Table
create table if not exists public.jobs (
    id text primary key default concat('job-', replace(uuid_generate_v4()::text, '-', '')),
    title text not null,
    summary text,
    description text not null,
    category text not null references public.categories(name) on update cascade,
    budget_min numeric not null default 0,
    budget_max numeric not null default 0,
    experience text default 'Intermediate',
    type text default 'Fixed Price',
    duration text default '1-2 weeks',
    proposals_count integer default 0,
    skills text[] default '{}',
    status text default 'open' check (status in ('open', 'in_progress', 'completed', 'closed')),
    client_id text not null references public.profiles(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Proposals Table
create table if not exists public.proposals (
    id text primary key default concat('prop-', replace(uuid_generate_v4()::text, '-', '')),
    job_id text not null references public.jobs(id) on delete cascade,
    freelancer_id text not null references public.profiles(id) on delete cascade,
    freelancer_name text,
    bid_amount numeric not null,
    delivery_time text not null,
    cover_letter text not null,
    status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Projects (Active Contracts) Table
create table if not exists public.projects (
    id text primary key default concat('proj-', replace(uuid_generate_v4()::text, '-', '')),
    job_id text references public.jobs(id) on delete set null,
    title text not null,
    client_id text not null references public.profiles(id) on delete cascade,
    freelancer_id text not null references public.profiles(id) on delete cascade,
    amount numeric not null,
    status text default 'in_progress' check (status in ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
    milestones jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Escrow & Wallet Transactions Table
create table if not exists public.transactions (
    id text primary key default concat('tx-', replace(uuid_generate_v4()::text, '-', '')),
    user_id text not null references public.profiles(id) on delete cascade,
    type text not null check (type in ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'payment')),
    amount numeric not null,
    status text default 'completed' check (status in ('pending', 'completed', 'failed')),
    reference text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Realtime Messages Table
create table if not exists public.messages (
    id text primary key default concat('msg-', replace(uuid_generate_v4()::text, '-', '')),
    sender_id text not null references public.profiles(id) on delete cascade,
    receiver_id text not null references public.profiles(id) on delete cascade,
    project_id text references public.projects(id) on delete cascade,
    content text not null,
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) & Real-time Broadcasts
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.jobs enable row level security;
alter table public.proposals enable row level security;
alter table public.projects enable row level security;
alter table public.transactions enable row level security;
alter table public.messages enable row level security;

-- Permissive public read & authenticated write policies for frictionless client usage
create policy "Allow public read on profiles" on public.profiles for select using (true);
create policy "Allow public read on categories" on public.categories for select using (true);
create policy "Allow public read on jobs" on public.jobs for select using (true);
create policy "Allow public read on proposals" on public.proposals for select using (true);
create policy "Allow public insert on profiles" on public.profiles for insert with check (true);
create policy "Allow public update on profiles" on public.profiles for update using (true);
create policy "Allow public insert on jobs" on public.jobs for insert with check (true);
create policy "Allow public update on jobs" on public.jobs for update using (true);
create policy "Allow public insert on proposals" on public.proposals for insert with check (true);
create policy "Allow public read on projects" on public.projects for select using (true);
create policy "Allow public insert on projects" on public.projects for insert with check (true);
create policy "Allow public read on transactions" on public.transactions for select using (true);
create policy "Allow public insert on transactions" on public.transactions for insert with check (true);
create policy "Participants can read messages" on public.messages for select
    using (sender_id = auth.uid()::text or receiver_id = auth.uid()::text);
create policy "Users can send messages as themselves" on public.messages for insert
    with check (sender_id = auth.uid()::text);
create policy "Receivers can mark messages read" on public.messages for update
    using (receiver_id = auth.uid()::text)
    with check (receiver_id = auth.uid()::text);

revoke all on public.messages from anon;
revoke all on public.messages from authenticated;
grant select, insert on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;
