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