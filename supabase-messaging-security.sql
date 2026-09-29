-- Apply this migration in the Supabase SQL Editor for an existing SkillLink database.
alter table public.messages enable row level security;

drop policy if exists "Allow public read on messages" on public.messages;
drop policy if exists "Allow public insert on messages" on public.messages;
drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Users can send messages as themselves" on public.messages;
drop policy if exists "Receivers can mark messages read" on public.messages;

create policy "Participants can read messages" on public.messages for select
    using (sender_id = auth.uid()::text or receiver_id = auth.uid()::text);
create policy "Users can send messages as themselves" on public.messages for insert
    with check (sender_id = auth.uid()::text);

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

create table if not exists public.message_typing (
    user_id text not null references public.profiles(id) on delete cascade,
    receiver_id text not null references public.profiles(id) on delete cascade,
    updated_at timestamp with time zone not null default now(),
    primary key (user_id, receiver_id),
    check (user_id <> receiver_id)
);

alter table public.message_typing enable row level security;
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