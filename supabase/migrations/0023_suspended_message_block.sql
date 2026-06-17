-- =============================================================================
-- Block suspended users from sending chat messages. Server actions already
-- re-check suspension, but chat messages are a client-side insert governed only
-- by RLS - so a suspended user could keep messaging until their token expires.
-- This adds a suspended check to the messages INSERT policy. Reads are
-- unaffected (they can still see their existing conversations).
-- profiles.suspended exists from migration 0014.
-- =============================================================================

drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
  with check (
    sender_id = auth.uid()
    and uid_in_conversation(conversation_id)
    and not exists (select 1 from profiles where id = auth.uid() and suspended = true)
  );
