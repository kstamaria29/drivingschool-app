-- Driving School App (v1) - Student reminders time support
-- Adds per-reminder time used by device notifications.

alter table if exists public.student_reminders
add column if not exists reminder_time time not null default time '09:00';
