# Eazi HR — Rebrand & New Features

This round is a visual overhaul plus four new features. Unlike the SaaS
transformation, **this does NOT require wiping your database** — it only adds
two new tables (`AttendanceEntry`, `Announcement`), it doesn't change or
remove anything existing.

## What's new

- **Rebrand:** the product is now called **Eazi HR**, with a new dark,
  gradient-accented visual design (glassmorphic cards, glowing active nav,
  animated clock display, Inter typeface).
- **Attendance** (`/attendance`): employees clock in/out with a live-updating
  clock; HR/Admin/Manager see a company-wide "who's in today" table.
- **Announcements** (`/announcements`): HR/Admin post company news, optionally
  pinned to the top; every employee sees the feed, and a preview shows on
  their dashboard.
- **Directory** (`/directory`): a searchable, company-wide people finder
  available to every role — search by name, title, or department. Contact
  info (email/phone) is only shown to HR/Admin/Manager.
- **Analytics on the Dashboard**: HR/Admin/Manager now see live charts —
  headcount by department and leave requests by status — powered by the new
  `/api/insights/overview` endpoint.

## Applying this update

```bash
cd backend
npm install              # picks up the new `stripe`-adjacent recharts-free deps (no new backend deps this round beyond what SaaS already added)
npx prisma migrate dev --name add_attendance_and_announcements
npm run dev
```

```bash
cd frontend
npm install               # picks up the new `recharts` dependency for the charts
npm run dev
```

No changes to `.env` are needed for this round — your existing Supabase and
Stripe configuration keeps working as-is.

## Roadmap ideas (not built yet)

- Document vault (upload/download employee documents — contracts, IDs, etc.)
- Org chart visualization built from the manager/reports relation
- Payroll basics (salary structure, payslip generation)
- Push/email notifications instead of just an in-app feed
- Self-serve company signup with card capture (see `SAAS_TRANSFORMATION.md`
  for the rest of that roadmap)
