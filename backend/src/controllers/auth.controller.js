const bcrypt = require("bcryptjs");
const { z } = require("zod");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");
const { syncCompanySeats } = require("../utils/seats");

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  position: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1),
});

// Generates a sequential employee code scoped to one company, e.g. EMP-0001, EMP-0002.
async function nextEmployeeCode(companyId) {
  const count = await prisma.user.count({ where: { companyId } });
  return `EMP-${String(count + 1).padStart(4, "0")}`;
}

// Called by an HR/Admin user to onboard a new employee INTO THEIR OWN COMPANY.
// Does not log the caller in as the new hire — returns the created employee's
// basic info only. SUPER_ADMIN never calls this; use /api/companies instead.
async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const companyId = req.user.companyId;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return res.status(400).json({ message: "Your account isn't linked to a company" });
  if (["SUSPENDED", "CANCELED"].includes(company.billingStatus)) {
    return res.status(402).json({ message: "This company's subscription is not active. Please contact billing support before adding employees." });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const employeeCode = await nextEmployeeCode(companyId);

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      role: data.role || "EMPLOYEE",
      departmentId: data.departmentId,
      managerId: data.managerId,
      position: data.position,
      employeeCode,
      status: "ONBOARDING",
      companyId,
    },
  });

  // Seed a default onboarding checklist for the new hire
  await prisma.onboardingTask.createMany({
    data: [
      { userId: user.id, title: "Sign employment contract", order: 1 },
      { userId: user.id, title: "Submit ID and bank details", order: 2 },
      { userId: user.id, title: "IT setup: laptop, email, accounts", order: 3 },
      { userId: user.id, title: "Complete orientation / company policies", order: 4 },
      { userId: user.id, title: "Meet your manager and team", order: 5 },
    ],
  });

  // Seed a leave balance for the current year
  await prisma.leaveBalance.create({
    data: { userId: user.id, year: new Date().getFullYear() },
  });

  await syncCompanySeats(companyId);

  res.status(201).json({
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, employeeCode: user.employeeCode },
  });
}

async function login(req, res) {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) return res.status(401).json({ message: "Invalid email or password" });

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid email or password" });

  // Company-scoped users are blocked if their employer's subscription has lapsed.
  // SUPER_ADMIN accounts have no company and always bypass this check.
  if (user.companyId) {
    const company = await prisma.company.findUnique({ where: { id: user.companyId } });
    if (!company) return res.status(403).json({ message: "Your company account could not be found. Please contact support." });
    if (["SUSPENDED", "CANCELED"].includes(company.billingStatus)) {
      return res.status(403).json({ message: "Access is currently suspended for your company. Please contact your HR administrator or billing support." });
    }
  }

  const token = signToken({ id: user.id, role: user.role, email: user.email, companyId: user.companyId });
  res.json({
    token,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, employeeCode: user.employeeCode, companyId: user.companyId },
  });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, firstName: true, lastName: true, email: true, role: true,
      employeeCode: true, status: true, position: true, dateHired: true,
      department: true, manager: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true, billingStatus: true } },
    },
  });
  res.json(user);
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

async function changePassword(req, res) {
  const data = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.json({ message: "Password updated successfully" });
}

module.exports = { register, login, me, changePassword };
