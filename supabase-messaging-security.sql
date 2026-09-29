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
create policy "Receivers can mark messages read" on public.messages for update
    using (receiver_id = auth.uid()::text)
    with check (receiver_id = auth.uid()::text);

revoke all on public.messages from anon;
revoke all on public.messages from authenticated;
grant select, insert on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;