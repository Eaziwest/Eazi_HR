# Developer Review — Fixes Applied

This review found and fixed 4 real security holes, 2 correctness bugs, and a set of
UX gaps. Nothing here changes the database schema in a way that requires a fresh
migration beyond the `directUrl` addition already covered in the setup steps below.

## Security fixes (previously exploitable by any logged-in — or even logged-out — user)

1. **Open registration endpoint.** `POST /api/auth/register` had no authentication
   at all. Anyone could create their own account with `role: "ADMIN"` and get
   instant admin access, without logging in first. Now requires an existing
   Admin/HR session. The very first admin account still comes from `npm run seed`.
2. **Employee data leak.** Any logged-in employee could fetch any other
   employee's full profile (email, phone, manager, direct reports) via
   `GET /api/employees/:id`. Now restricted to your own record, or Admin/HR/Manager.
3. **Appraisal tampering.** `GET`/`PATCH /api/appraisals/:id` had no ownership
   checks — an employee who obtained another appraisal's ID could view it or
   edit its rating and comments. Now: only the reviewer or Admin/HR can fill in
   the assessment; the employee being reviewed can only add their own comment
   and acknowledge it once it's been reviewed.
4. **Onboarding task tampering.** `PATCH /api/onboarding/:id/complete` let any
   authenticated user mark *any* onboarding task complete, not just their own.
   Now restricted to the task owner or Admin/HR.

## Correctness fixes

5. Leave and sick-leave requests now reject an end date earlier than the start date.
6. Approving/rejecting the same leave or sick-leave request twice is now blocked
   (previously could double-count against the employee's leave balance).

## UX improvements

7. **Change Password page** (new "My Profile" nav item) — the seeded admin
   password is shown in plain text on the login screen, so being able to change
   it is important. Requires your current password to change it.
8. Visiting `/login` while already signed in now redirects straight to the dashboard.
9. Added a proper "Page not found" screen instead of a blank page on bad URLs.
10. Sidebar logout is now a real button (was a non-functional `<a href="#">` link),
    added a role badge, and the sidebar is now usable on mobile-width screens.
11. Forms across the app (Login, Employees, Leaves, Sick Leaves, Appraisals,
    Onboarding) now show loading states while submitting, disable buttons to
    prevent double-submits, and surface specific validation error messages
    instead of a generic "Validation failed."
12. Fixed a display bug where every appraisal always showed a yellow "PENDING"
    style badge regardless of its actual status (Draft/Submitted/Reviewed/
    Acknowledged now each have their own color).

## Database connection (Supabase / pooled Postgres)

`backend/prisma/schema.prisma` now declares `directUrl` alongside `url`, and
`.env.example` explains the difference:

- `DATABASE_URL` — your pooled "Transaction" connection string (port 6543,
  `?pgbouncer=true`), used by the running app.
- `DIRECT_URL` — your "Session" or direct connection string (port 5432), used
  only by `prisma migrate`.

Copy both directly from Supabase's dashboard (Project Settings → Database →
Connection string) rather than typing them by hand — stray characters here are
a common source of connection failures.

## Verifying the admin account works end-to-end

1. `cd backend && npm install`
2. Fill in `.env` (copy from `.env.example`) with your real database credentials.
3. `npx prisma migrate dev --name init`
4. `npm run seed` — creates `admin@company.com` / `Admin@12345`
5. `npm run dev`
6. `cd ../frontend && npm install && npm run dev`
7. Log in as the seeded admin, then immediately go to **My Profile → Change
   password** and set a real password — don't leave the default in place.
