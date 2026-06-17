-- Enable Supabase Realtime for the messages table so chat updates live.
-- Run once in the Supabase SQL editor.
alter publication supabase_realtime add table messages;
