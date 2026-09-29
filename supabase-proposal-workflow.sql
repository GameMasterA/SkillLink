alter table public.proposals enable row level security;
drop policy if exists "Allow public read on proposals" on public.proposals;
drop policy if exists "Allow public insert on proposals" on public.proposals;
drop policy if exists "Proposal participants can read" on public.proposals;
create policy "Proposal participants can read" on public.proposals for select to authenticated
    using (
        freelancer_id = auth.uid()::text
        or exists (
            select 1 from public.jobs
            where public.jobs.id = public.proposals.job_id
              and public.jobs.client_id = auth.uid()::text
        )
    );
revoke all on public.proposals from anon, authenticated;
grant select on public.proposals to authenticated;

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