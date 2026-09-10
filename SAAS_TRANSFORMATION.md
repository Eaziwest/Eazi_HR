# Multi-Tenant SaaS Transformation

This turns the HR system from a single company's internal tool into a
multi-tenant platform you can sell to many companies, each paying per employee
("seat") per month.

## What's new

### Roles
- **SUPER_ADMIN** — you, the platform owner. Not tied to any company. Manages
  the list of paying companies from the new **Companies** console.
- **ADMIN / HR / MANAGER / EMPLOYEE** — unchanged, but now scoped to exactly
  one company. A company's HR staff can never see or affect another company's
  data — this is enforced on every relevant endpoint (employees, leave,
  appraisals, onboarding), not just in the UI.

### Manual onboarding flow (matches what you asked for)
1. Log in as the platform owner (`owner@platform.com`).
2. Go to the **Companies** page.
3. Fill in the new company's name, billing contact, price per seat, and the
   first Admin account's details — one form creates the company AND its first
   HR/Admin user together.
4. Hand those Admin credentials to the company. They log in and run their own
   onboarding/leave/appraisals exactly like before, just walled off from
   everyone else.

### Per-seat billing (Stripe)
- Every company gets its own Stripe customer + subscription when you create it.
- "Seats" = employees who aren't `TERMINATED`. Adding or terminating an
  employee automatically updates the Stripe subscription quantity.
- If Stripe isn't configured yet (no `STRIPE_SECRET_KEY`), all of this quietly
  no-ops — company/employee management still works fine, you just won't have
  live billing until you add real Stripe keys.
- A webhook at `/api/billing/webhook` keeps `billingStatus` in sync with real
  payment events (`invoice.payment_failed` → `PAST_DUE`,
  `customer.subscription.deleted` → `CANCELED`, etc.).
- You can also manually flip a company's status (e.g. to `SUSPENDED`) from the
  Companies console — useful before you've wired up Stripe, or for manual
  invoicing/collections.
- A company with `SUSPENDED` or `CANCELED` billing status can't log in or add
  new employees, but existing data isn't deleted.

## Setting up Stripe (optional, do this when ready to take real payments)

1. Create a Stripe account, switch to test mode first.
2. Get your API key from https://dashboard.stripe.com/apikeys and put it in
   `backend/.env` as `STRIPE_SECRET_KEY`.
3. Create a webhook endpoint in the Stripe dashboard pointing to
   `https://your-backend-url/api/billing/webhook`, listening for at least:
   `invoice.payment_failed`, `invoice.payment_succeeded`,
   `customer.subscription.deleted`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.
4. Restart the backend. New companies you create from now on will get a real
   Stripe subscription automatically.
5. When you're ready for real money, switch to live-mode keys.

## IMPORTANT: this requires a fresh database

Adding required company-scoping fields (`Department.companyId`, etc.) is a
breaking schema change. Since the only data in your database right now is
test data (a couple of accounts you created while trying things out), the
simplest path is to reset and start clean with the new multi-tenant seed data:

```bash
cd backend
npx prisma migrate reset   # WARNING: wipes all current data in this database
npm run seed
```

This creates:
- **Platform owner:** `owner@platform.com` / `SuperAdmin@12345`
- **Demo company** ("Demo Company") with its own admin:
  `admin@company.com` / `Admin@12345`

Change both of these passwords immediately after logging in (My Profile →
Change password) — don't leave the seeded ones in place once this is real.

If you have real production data you can't afford to lose in the future,
that's a different, more careful migration (add columns as nullable first,
backfill a "legacy company" for existing rows, then make them required) — ask
if you get to that point and we'll do it properly.

## What's NOT built yet (roadmap)

- **Self-serve signup.** Right now only you (SUPER_ADMIN) can create
  companies. A public "start your free trial" page with card capture at
  signup is a separate, sizeable piece of work — happy to build it when
  you're ready to stop onboarding companies by hand.
- **Usage/revenue dashboard** beyond the simple totals shown on the Companies
  page (MRR, churn, growth over time).
- **Per-company custom domains/subdomains.**
- **Seat limits / plan tiers** (currently every company can add unlimited
  employees at the same per-seat price — no "Starter vs Pro" plan structure
  yet).
- **Proration** when seats change mid-billing-cycle — Stripe handles this by
  default when you update subscription quantity, but hasn't been tested
  end-to-end here.
