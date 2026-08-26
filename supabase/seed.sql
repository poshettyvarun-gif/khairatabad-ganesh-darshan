insert into public.darshan_dates(date) values ('2026-09-05'),('2026-09-06'),('2026-09-07') on conflict do nothing;
insert into public.time_slots(darshan_date_id,start_time,end_time,capacity)
select d.id,t.s,t.e,500 from public.darshan_dates d cross join (values ('06:00'::time,'07:00'::time),('07:00','08:00'),('08:00','09:00'),('09:00','10:00')) t(s,e)
where d.date between '2026-09-05' and '2026-09-07' on conflict do nothing;
