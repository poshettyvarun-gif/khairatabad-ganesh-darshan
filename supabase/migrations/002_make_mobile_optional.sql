alter table public.profiles
  alter column mobile drop not null;

alter table public.profiles
  drop constraint if exists profiles_mobile_check;

alter table public.profiles
  add constraint profiles_mobile_check
  check (mobile is null or mobile ~ '^[6-9][0-9]{9}$');
