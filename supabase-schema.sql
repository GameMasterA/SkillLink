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
    rating numeric default 0,
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

insert into public.categories (id, name) values
    ('web-development', 'Web Development'),
    ('ui-ux-design', 'UI/UX Design'),
    ('graphic-design', 'Graphic Design'),
    ('writing', 'Writing'),
    ('marketing', 'Marketing'),
    ('video-editing', 'Video Editing')
on conflict (name) do nothing;

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

create table if not exists public.message_typing (
    user_id text not null references public.profiles(id) on delete cascade,
    receiver_id text not null references public.profiles(id) on delete cascade,
    updated_at timestamp with time zone not null default now(),
    primary key (user_id, receiver_id),
    check (user_id <> receiver_id)
);

-- Enable Row Level Security (RLS) & Real-time Broadcasts
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.jobs enable row level security;
alter table public.proposals enable row level security;
alter table public.projects enable row level security;
alter table public.transactions enable row level security;
alter table public.messages enable row level security;
alter table public.message_typing enable row level security;

-- Permissive public read & authenticated write policies for frictionless client usage
create policy "Allow public read on profiles" on public.profiles for select using (true);
create policy "Allow public read on categories" on public.categories for select using (true);
create policy "Allow public read on jobs" on public.jobs for select using (true);
create policy "Proposal participants can read" on public.proposals for select to authenticated
    using (
        freelancer_id = auth.uid()::text
        or exists (
            select 1 from public.jobs
            where public.jobs.id = public.proposals.job_id
              and public.jobs.client_id = auth.uid()::text
        )
    );
create policy "Allow public insert on profiles" on public.profiles for insert with check (true);
create policy "Allow public update on profiles" on public.profiles for update using (true);
create policy "Allow public insert on jobs" on public.jobs for insert with check (true);
create policy "Allow public update on jobs" on public.jobs for update using (true);
create policy "Allow public read on projects" on public.projects for select using (true);
create policy "Allow public insert on projects" on public.projects for insert with check (true);
create policy "Allow public read on transactions" on public.transactions for select using (true);
create policy "Allow public insert on transactions" on public.transactions for insert with check (true);
create policy "Participants can read messages" on public.messages for select
    using (sender_id = auth.uid()::text or receiver_id = auth.uid()::text);
create policy "Users can send messages as themselves" on public.messages for insert
    with check (sender_id = auth.uid()::text);

revoke all on public.proposals from anon, authenticated;
grant select on public.proposals to authenticated;

revoke all on public.messages from anon;
revoke all on public.messages from authenticated;
grant select, insert on public.messages to authenticated;

create or replace function public.mark_messages_read(p_sender_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    updated_count integer;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'Authentication required';
    end if;

    update public.messages
    set is_read = true
    where receiver_id = auth.uid()::text
      and sender_id = p_sender_id
      and is_read = false;

    get diagnostics updated_count = row_count;
    return updated_count;
end;
$$;

revoke all on function public.mark_messages_read(text) from public, anon, authenticated;
grant execute on function public.mark_messages_read(text) to authenticated;

create or replace function public.submit_proposal(
    p_job_id text,
    p_bid_amount numeric,
    p_delivery_time text,
    p_cover_letter text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    authenticated_id text := auth.uid()::text;
    job_row public.jobs%rowtype;
    proposal_row public.proposals%rowtype;
    freelancer_display_name text;
    current_proposal_count integer;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'Authentication required';
    end if;
    if p_bid_amount is null or p_bid_amount <= 0 or nullif(trim(p_delivery_time), '') is null then
        raise exception using errcode = '22023', message = 'A positive bid and delivery time are required';
    end if;

    select * into job_row
    from public.jobs
    where id = p_job_id and status = 'open' and client_id <> authenticated_id;
    if not found then
        raise exception using errcode = '22023', message = 'This job is not available for proposals';
    end if;

    select coalesce(nullif(trim(name), ''), nullif(trim(concat_ws(' ', first_name, last_name)), ''), email, 'Freelancer')
    into freelancer_display_name
    from public.profiles
    where id = authenticated_id and role = 'freelancer';
    if not found then
        raise exception using errcode = '42501', message = 'A freelancer profile is required to submit a proposal';
    end if;

    if exists (
        select 1 from public.proposals
        where job_id = p_job_id and freelancer_id = authenticated_id
    ) then
        raise exception using errcode = '23505', message = 'You have already applied for this job';
    end if;

    insert into public.proposals (job_id, freelancer_id, freelancer_name, bid_amount, delivery_time, cover_letter, status)
    values (p_job_id, authenticated_id, freelancer_display_name, p_bid_amount, trim(p_delivery_time), coalesce(p_cover_letter, ''), 'pending')
    returning * into proposal_row;

    select count(*)::integer into current_proposal_count
    from public.proposals where job_id = p_job_id;
    update public.jobs set proposals_count = current_proposal_count where id = p_job_id;

    return jsonb_build_object(
        'id', proposal_row.id,
        'job_id', proposal_row.job_id,
        'job_title', job_row.title,
        'client_id', job_row.client_id,
        'freelancer_id', proposal_row.freelancer_id,
        'freelancer_name', proposal_row.freelancer_name,
        'bid_amount', proposal_row.bid_amount,
        'delivery_time', proposal_row.delivery_time,
        'cover_letter', proposal_row.cover_letter,
        'status', proposal_row.status,
        'created_at', proposal_row.created_at,
        'proposals_count', current_proposal_count
    );
end;
$$;

create or replace function public.accept_proposal(p_proposal_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    authenticated_id text := auth.uid()::text;
    proposal_row public.proposals%rowtype;
    job_row public.jobs%rowtype;
    project_row public.projects%rowtype;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'Authentication required';
    end if;

    select * into proposal_row from public.proposals where id = p_proposal_id;
    if not found then
        raise exception using errcode = '22023', message = 'Proposal not found';
    end if;

    select * into job_row from public.jobs
    where id = proposal_row.job_id and client_id = authenticated_id
    for update;
    if not found then
        raise exception using errcode = '42501', message = 'Only the job owner can accept this proposal';
    end if;
    if job_row.status <> 'open' or proposal_row.status <> 'pending' then
        raise exception using errcode = '22023', message = 'This proposal is no longer available';
    end if;

    update public.proposals set status = 'rejected'
    where job_id = job_row.id and id <> proposal_row.id and status = 'pending';
    update public.proposals set status = 'accepted' where id = proposal_row.id returning * into proposal_row;

    insert into public.projects (job_id, title, client_id, freelancer_id, amount, status, milestones)
    values (job_row.id, job_row.title, authenticated_id, proposal_row.freelancer_id, proposal_row.bid_amount, 'in_progress', '[]'::jsonb)
    returning * into project_row;

    update public.jobs set status = 'in_progress' where id = job_row.id;

    return jsonb_build_object('proposal', to_jsonb(proposal_row), 'project', to_jsonb(project_row));
end;
$$;

revoke all on function public.submit_proposal(text, numeric, text, text) from public, anon, authenticated;
revoke all on function public.accept_proposal(text) from public, anon, authenticated;
grant execute on function public.submit_proposal(text, numeric, text, text) to authenticated;
grant execute on function public.accept_proposal(text) to authenticated;

revoke all on public.message_typing from anon, authenticated;

create or replace function public.set_message_typing(p_receiver_id text, p_is_typing boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    authenticated_id text := auth.uid()::text;
begin
    if auth.uid() is null then
        raise exception using errcode = '42501', message = 'Authentication required';
    end if;
    if p_receiver_id is null or p_receiver_id = authenticated_id then
        raise exception using errcode = '22023', message = 'A different recipient is required';
    end if;

    if p_is_typing then
        insert into public.message_typing (user_id, receiver_id, updated_at)
        values (authenticated_id, p_receiver_id, now())
        on conflict (user_id, receiver_id) do update set updated_at = excluded.updated_at;
        return true;
    end if;

    delete from public.message_typing
    where user_id = authenticated_id and receiver_id = p_receiver_id;
    return false;
end;
$$;

create or replace function public.get_message_typing(p_sender_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
    select auth.uid() is not null and exists (
        select 1 from public.message_typing
        where user_id = p_sender_id
          and receiver_id = auth.uid()::text
          and updated_at > now() - interval '6 seconds'
    );
$$;

revoke all on function public.set_message_typing(text, boolean) from public, anon, authenticated;
revoke all on function public.get_message_typing(text) from public, anon, authenticated;
grant execute on function public.set_message_typing(text, boolean) to authenticated;
grant execute on function public.get_message_typing(text) to authenticated;
