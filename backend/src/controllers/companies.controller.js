const { z } = require("zod");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const stripeBilling = require("../utils/stripe");
const { countBillableSeats } = require("../utils/seats");

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const createCompanySchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().email().transform((e) => e.trim().toLowerCase()),
  pricePerSeatCents: z.number().int().positive().optional(),
  admin: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().transform((e) => e.trim().toLowerCase()),
    password: z.string().min(6),
  }),
});

// Creates a new tenant company plus its first Admin user in one step. This is
// how the platform owner (SUPER_ADMIN) manually onboards a paying customer.
async function createCompany(req, res) {
  const data = createCompanySchema.parse(req.body);

  const baseSlug = slugify(data.name) || "company";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const pricePerSeatCents = data.pricePerSeatCents ?? 500;

  const company = await prisma.company.create({
    data: {
      name: data.name,
      slug,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      pricePerSeatCents,
      billingStatus: "TRIALING",
    },
  });

  // Connect billing (safe no-op if Stripe isn't configured yet)
  try {
    const { stripeCustomerId, stripeSubscriptionId } = await stripeBilling.createCompanySubscription({
      companyId: company.id,
      companyName: company.name,
      contactEmail: company.contactEmail,
      pricePerSeatCents,
      initialSeats: 1,
    });
    if (stripeCustomerId) {
      await prisma.company.update({
        where: { id: company.id },
        data: { stripeCustomerId, stripeSubscriptionId, billingStatus: "ACTIVE" },
      });
    }
  } catch (err) {
    // Don't block company creation if Stripe fails — log it and let the
    // platform owner reconcile billing manually.
    console.error("Stripe setup failed for new company:", err.message);
  }

  const passwordHash = await bcrypt.hash(data.admin.password, 10);
  const admin = await prisma.user.create({
    data: {
      firstName: data.admin.firstName,
      lastName: data.admin.lastName,
      email: data.admin.email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      employeeCode: "EMP-0001",
      companyId: company.id,
    },
  });

  await prisma.leaveBalance.create({
    data: { userId: admin.id, year: new Date().getFullYear() },
  });

  res.status(201).json({
    company,
    admin: { id: admin.id, firstName: admin.firstName, lastName: admin.lastName, email: admin.email },
  });
}

async function listCompanies(req, res) {
  const companies = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });

  const withSeats = await Promise.all(
    companies.map(async (c) => {
      const seatCount = await countBillableSeats(c.id);
      return { ...c, seatCount, monthlyEstimateCents: seatCount * c.pricePerSeatCents };
    })
  );

  res.json(withSeats);
}

async function getCompany(req, res) {
  const company = await prisma.company.findUnique({ where: { id: req.params.id } });
  if (!company) return res.status(404).json({ message: "Company not found" });

  const seatCount = await countBillableSeats(company.id);
  const employees = await prisma.user.findMany({
    where: { companyId: company.id },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, employeeCode: true },
    orderBy: { createdAt: "asc" },
  });

  res.json({ ...company, seatCount, employees });
}

const statusSchema = z.object({
  billingStatus: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"]),
});

// Manually flip a company's billing status — e.g. suspend access if an invoice
// goes unpaid, or reactivate after a manual payment.
async function updateCompanyStatus(req, res) {
  const data = statusSchema.parse(req.body);
  const company = await prisma.company.update({
    where: { id: req.params.id },
    data: {
      billingStatus: data.billingStatus,
      suspendedAt: data.billingStatus === "SUSPENDED" ? new Date() : null,
    },
  });

  if (data.billingStatus === "CANCELED") {
    await stripeBilling.cancelSubscription(company.stripeSubscriptionId);
  }

  res.json(company);
}

module.exports = { createCompany, listCompanies, getCompany, updateCompanyStatus };
