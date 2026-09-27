-- Clear demo data from the SkillLink Supabase database
-- Run this in the Supabase SQL editor to reset the app to a blank state.

DELETE FROM public.messages;
DELETE FROM public.transactions;
DELETE FROM public.projects;
DELETE FROM public.proposals;
DELETE FROM public.jobs;
DELETE FROM public.categories;
DELETE FROM public.profiles;

-- Optional: keep the schema but remove all rows.
-- This leaves the app ready for a fresh admin/user setup.
