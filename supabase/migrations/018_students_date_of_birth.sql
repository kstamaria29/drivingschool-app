-- Driving School App (v1) - Student date of birth
-- Adds date_of_birth to students for profile display and age calculation.

alter table public.students
add column if not exists date_of_birth date null;
