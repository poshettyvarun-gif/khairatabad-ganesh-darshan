# Khairatabad Ganesh Darshanam Slot Booking

A complete Next.js and Supabase portal for devotee registration, Darshan requests, atomic admin approval, schedule management, role-based access, and secure CSV exports.

## Stack and architecture

- Next.js App Router, React, TypeScript and Tailwind CSS
- Supabase Auth and PostgreSQL with Row Level Security
- Server route handlers for authentication, privileged administration and CSV output
- PostgreSQL functions with row locks for race-safe capacity reservation

Pending requests **do not consume capacity**. `approve_booking` locks both the booking and its slot, re-checks remaining capacity, increments the approved count, and changes status in one transaction. A cancelled approved booking atomically releases its capacity. Requests are limited to 20 people; change both the Zod validation and database check if policy changes.

## Local setup

1. Create a Supabase project. In its SQL editor run `supabase/migrations/001_initial_schema.sql`, then optionally `supabase/seed.sql`.
2. Copy `.env.local.example` to `.env.local` and fill in the project URL, anon key and service-role key. The service-role key is server-only; never prefix it with `NEXT_PUBLIC_` or expose it to client code.
3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open `http://localhost:3000`.

For production, run `npm run lint`, `npm run typecheck`, and `npm run build`, then deploy to Vercel or another Node-compatible host. Add the same environment variables in the host's encrypted settings and set the Supabase Site URL/redirect URLs to the deployment domain.

## Demo users

Passwords are never stored in source. After loading the migration, create demo users by supplying passwords at execution time:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-demo-users.mjs 'Admin-Strong-Password!' 'User-Strong-Password!'
```

This creates usernames `demo_admin` and `demo_user`. In production, create an ordinary account first and promote it only through a trusted SQL/admin operation:

```sql
update public.profiles set role = 'admin' where username = 'your_admin_username';
```

Never offer role selection during public registration.

## Security model

- The browser receives only the anon key. Service-role operations live in server-only modules.
- Login resolves usernames on the server and returns only a generic invalid-credentials error.
- Middleware refreshes sessions; every protected page and API checks the authenticated user again.
- RLS limits devotees to their own profile/bookings and read-only active schedule data. No direct booking mutation policy exists; creation goes through the validated function.
- Privileged status functions are revoked from browser roles and invoked only after server-side admin authorization.
- User CSV queries require both the authenticated owner and `approved` status. Admin exports require the admin role.
- Unique/index/check constraints protect usernames, active duplicate requests, valid counts and slot bounds.
- An immutable audit row records every administrative status transition.

## Features and routes

- Public: `/`, `/login`, `/register`
- Devotee: `/dashboard`, `/booking`, `/my-bookings`
- Admin: `/admin`, `/admin/bookings`, `/admin/schedule`, `/admin/users`
- Approved devotees download one authorized CSV per booking. Admins can export the complete authorized booking dataset.
- Schedule management supports dates, slots, capacities and enable/disable controls. The schema uses `ON DELETE RESTRICT`, so a date or slot with dependent bookings cannot be deleted accidentally. The UI intentionally favors disabling over destructive deletion.

## Supabase notes

The migration creates enums, tables, indexes, RLS policies, audit storage and transactional functions. Apply migrations through the Supabase CLI in a managed workflow if preferred:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Keep email confirmation disabled only for controlled demos. Public registration in this app uses the trusted server admin API to create a confirmed user after validating all fields; enable abuse protection/rate limiting at the edge before a public launch.

## Validation checklist

After connecting a test project, verify registration and username login, role redirects, inactive/full-slot rejection, duplicate prevention, concurrent admin approval, rejection/cancellation, owner-only CSV, admin export, and anonymous/non-admin access to admin URLs. Test at 375px and desktop widths. Database-backed integration tests require a configured Supabase instance; static checks can run without one.
