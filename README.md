# Eazi HR

A full-stack, multi-tenant HR platform covering **employee onboarding,
attendance, leave, appraisals, announcements, and a company directory** —
sold to companies as a per-seat monthly subscription.

- **Backend:** Node.js, Express, PostgreSQL, Prisma ORM, JWT auth, Stripe billing
- **Frontend:** React (Vite), React Router, Axios

## Features

- **Auth & roles:** Admin, HR, Manager, Employee — JWT-based login
- **Onboarding:** auto-generated checklist for every new hire; employee ticks off tasks; status flips to `ACTIVE` once complete
- **Leave management:** request/approve/reject annual, casual, maternity, paternity, unpaid leave; running balance per employee per year
- **Sick leave:** request with optional medical certificate link; HR/manager approval flow
- **Appraisals:** HR/manager starts a review cycle, fills in achievements/strengths/areas for improvement/rating; employee acknowledges
- **Employee directory:** HR can view, add, and update staff records and departments
- **Excel import/export:** HR can export the full employee list to `.xlsx`, download a blank import template, and bulk-add employees by uploading a filled-in spreadsheet (auto-generates onboarding checklists, leave balances, and temporary passwords for each new hire)
- **Attendance:** employees clock in/out from a live dashboard widget; HR sees who's clocked in company-wide today
- **Announcements:** HR/Admin post company-wide news, optionally pinned; everyone sees a feed and a preview on their dashboard
- **Directory:** searchable, company-wide colleague finder available to every role
- **Analytics dashboard:** HR/Admin/Manager see live charts — headcount by department, leave requests by status
- **Multi-tenant SaaS:** a platform-owner Super Admin console for onboarding paying companies, with per-seat Stripe billing that syncs automatically as employees are hired/terminated (see `SAAS_TRANSFORMATION.md`)

## Project structure

```
hr-system/
  backend/     Express API + Prisma schema
  frontend/    React (Vite) client
```

## Getting started

### 1. Backend

```bash
cd backend
npm install
--do not run cp .env.example .env      # then edit DATABASE_URL and JWT_SECRET
npx prisma migrate dev --name init
npm run seed               # creates admin@company.com / Admin@12345
npm run dev                # runs on http://localhost:4000
```

Requires a running PostgreSQL instance matching `DATABASE_URL` in `.env`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # points to the backend API
npm run dev                # runs on http://localhost:5173
```

Log in with the seeded admin account, or have HR add new employees from the **Employees** page (this auto-creates their onboarding checklist and login).

## API overview

| Area        | Endpoints |
|-------------|-----------|
| Auth        | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Employees   | `GET/PATCH/DELETE /api/employees`, `GET /api/employees/export`, `GET /api/employees/import-template`, `POST /api/employees/import` (multipart file upload) |
| Onboarding  | `GET /api/onboarding/me`, `POST /api/onboarding`, `PATCH /api/onboarding/:id/complete` |
| Leaves      | `POST /api/leaves`, `GET /api/leaves/me`, `GET /api/leaves`, `PATCH /api/leaves/:id/decision` |
| Sick leaves | `POST /api/sick-leaves`, `GET /api/sick-leaves/me`, `PATCH /api/sick-leaves/:id/decision` |
| Appraisals  | `POST /api/appraisals`, `GET /api/appraisals/me`, `PATCH /api/appraisals/:id` |

Full request/response shapes are visible in each `*.controller.js` file.

## Roadmap ideas

- Email notifications on leave decisions
- File upload for medical certificates and documents
- Org chart view built from the manager/reports relation
- Payroll integration

## Pushing this to GitHub

This project was generated locally and isn't connected to GitHub yet. From the `hr-system` folder:

```bash
git init
git add .
git commit -m "Initial commit: HR system (onboarding, leaves, sick leave, appraisals)"
git branch -M main
git remote add origin https://github.com/Eaziwest/hr-system.git
git push -u origin main
```

Create the empty repo first at **https://github.com/new** (name it `hr-system`, don't initialize with a README), then run the commands above.
