create extension if not exists pgcrypto;
create type public.app_role as enum ('user','admin');
create type public.booking_status as enum ('pending','approved','rejected','cancelled');

create table public.profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 full_name text not null check(length(full_name) between 2 and 100), username text not null check(username ~ '^[A-Za-z0-9_]{3,30}$'),
 mobile text check(mobile is null or mobile ~ '^[6-9][0-9]{9}$'), email text not null, role public.app_role not null default 'user', created_at timestamptz not null default now()
);
create unique index profiles_username_lower_key on public.profiles(lower(username));
create unique index profiles_email_lower_key on public.profiles(lower(email));

create table public.darshan_dates (
 id uuid primary key default gen_random_uuid(), date date not null unique, is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.time_slots (
 id uuid primary key default gen_random_uuid(), darshan_date_id uuid not null references public.darshan_dates(id) on delete restrict,
 start_time time not null, end_time time not null, capacity integer not null check(capacity > 0), booked_count integer not null default 0 check(booked_count >= 0 and booked_count <= capacity),
 is_active boolean not null default true, created_at timestamptz not null default now(), check(start_time < end_time), unique(darshan_date_id,start_time,end_time)
);
alter table public.time_slots add column remaining_capacity integer generated always as (capacity-booked_count) stored;
create index time_slots_date_idx on public.time_slots(darshan_date_id,is_active);

create sequence public.booking_number_seq start 1;
create table public.bookings (
 id uuid primary key default gen_random_uuid(), booking_id text not null unique,
 user_id uuid not null references public.profiles(user_id) on delete restrict, time_slot_id uuid not null references public.time_slots(id) on delete restrict,
 number_of_persons integer not null check(number_of_persons between 1 and 20), status public.booking_status not null default 'pending',
 created_at timestamptz not null default now(), approved_at timestamptz, rejected_at timestamptz, cancelled_at timestamptz,
 check((status <> 'approved') or approved_at is not null), check((status <> 'rejected') or rejected_at is not null), check((status <> 'cancelled') or cancelled_at is not null)
);
create unique index one_live_booking_per_user_slot on public.bookings(user_id,time_slot_id) where status in ('pending','approved');
create index bookings_user_idx on public.bookings(user_id,created_at desc);
create index bookings_slot_status_idx on public.bookings(time_slot_id,status);
create index bookings_status_created_idx on public.bookings(status,created_at desc);

create table public.booking_audit (
 id bigint generated always as identity primary key, booking_uuid uuid not null references public.bookings(id) on delete cascade,
 from_status public.booking_status, to_status public.booking_status not null, changed_by uuid references auth.users(id), changed_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where user_id=auth.uid() and role='admin')
$$;

create or replace function public.create_booking_request(p_time_slot_id uuid,p_persons integer) returns text
language plpgsql security definer set search_path=public as $$
declare v_slot time_slots%rowtype; v_date darshan_dates%rowtype; v_code text;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 if p_persons < 1 or p_persons > 20 then raise exception 'INVALID_PERSONS'; end if;
 select * into v_slot from time_slots where id=p_time_slot_id;
 if not found then raise exception 'INACTIVE_SLOT'; end if;
 select * into v_date from darshan_dates where id=v_slot.darshan_date_id;
 if not v_slot.is_active or not v_date.is_active or v_date.date < current_date then raise exception 'INACTIVE_SLOT'; end if;
 if p_persons > v_slot.remaining_capacity then raise exception 'FULL_SLOT'; end if;
 if exists(select 1 from bookings where user_id=auth.uid() and time_slot_id=p_time_slot_id and status in ('pending','approved')) then raise exception 'DUPLICATE_BOOKING'; end if;
 v_code := 'KGD-'||extract(year from v_date.date)::int||'-'||lpad(nextval('booking_number_seq')::text,6,'0');
 insert into bookings(booking_id,user_id,time_slot_id,number_of_persons) values(v_code,auth.uid(),p_time_slot_id,p_persons);
 return v_code;
end $$;

create or replace function public.approve_booking(p_booking_uuid uuid,p_admin_user_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_booking bookings%rowtype; v_slot time_slots%rowtype;
begin
 if not exists(select 1 from profiles where user_id=p_admin_user_id and role='admin') then raise exception 'UNAUTHORIZED'; end if;
 select * into v_booking from bookings where id=p_booking_uuid for update;
 if not found or v_booking.status <> 'pending' then raise exception 'INVALID_STATUS'; end if;
 select * into v_slot from time_slots where id=v_booking.time_slot_id for update;
 if not v_slot.is_active or v_slot.booked_count+v_booking.number_of_persons>v_slot.capacity then raise exception 'CAPACITY_REACHED'; end if;
 update time_slots set booked_count=booked_count+v_booking.number_of_persons where id=v_slot.id;
 update bookings set status='approved',approved_at=now() where id=v_booking.id;
 insert into booking_audit(booking_uuid,from_status,to_status,changed_by) values(v_booking.id,'pending','approved',p_admin_user_id);
end $$;
create or replace function public.reject_booking(p_booking_uuid uuid,p_admin_user_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v bookings%rowtype; begin if not exists(select 1 from profiles where user_id=p_admin_user_id and role='admin') then raise exception 'UNAUTHORIZED';end if;
select * into v from bookings where id=p_booking_uuid for update;if not found or v.status<>'pending' then raise exception 'INVALID_STATUS';end if;
update bookings set status='rejected',rejected_at=now() where id=v.id;insert into booking_audit(booking_uuid,from_status,to_status,changed_by) values(v.id,'pending','rejected',p_admin_user_id);end $$;
create or replace function public.cancel_booking(p_booking_uuid uuid,p_admin_user_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v bookings%rowtype; begin if not exists(select 1 from profiles where user_id=p_admin_user_id and role='admin') then raise exception 'UNAUTHORIZED';end if;
select * into v from bookings where id=p_booking_uuid for update;if not found or v.status<>'approved' then raise exception 'INVALID_STATUS';end if;
perform 1 from time_slots where id=v.time_slot_id for update;update time_slots set booked_count=booked_count-v.number_of_persons where id=v.time_slot_id;
update bookings set status='cancelled',cancelled_at=now() where id=v.id;insert into booking_audit(booking_uuid,from_status,to_status,changed_by) values(v.id,'approved','cancelled',p_admin_user_id);end $$;

revoke all on function public.approve_booking(uuid,uuid) from public,anon,authenticated;
revoke all on function public.reject_booking(uuid,uuid) from public,anon,authenticated;
revoke all on function public.cancel_booking(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_booking_request(uuid,integer) to authenticated;
grant usage,select on sequence public.booking_number_seq to authenticated;

alter table profiles enable row level security;alter table darshan_dates enable row level security;alter table time_slots enable row level security;alter table bookings enable row level security;alter table booking_audit enable row level security;
create policy "profile own read" on profiles for select to authenticated using(user_id=auth.uid() or is_admin());
create policy "active dates readable" on darshan_dates for select to authenticated using(is_active or is_admin());
create policy "active slots readable" on time_slots for select to authenticated using(is_active or is_admin());
create policy "own bookings read" on bookings for select to authenticated using(user_id=auth.uid() or is_admin());
create policy "admin audit read" on booking_audit for select to authenticated using(is_admin());

create or replace function public.prevent_unsafe_slot_change() returns trigger language plpgsql as $$begin
 if new.capacity<old.booked_count then raise exception 'CAPACITY_BELOW_BOOKED';end if;return new;end$$;
create trigger slot_capacity_guard before update of capacity on time_slots for each row execute function prevent_unsafe_slot_change();
