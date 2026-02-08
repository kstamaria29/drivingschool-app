-- Driving School App (v1) - Student licence card image URLs
-- Stores signed URL pointers for front/back licence card images in Storage.

alter table public.students
add column if not exists license_front_image_url text null;

alter table public.students
add column if not exists license_back_image_url text null;
