const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Platform owner — manages companies via /companies, not tied to any tenant.
  const superAdminPasswordHash = await bcrypt.hash("SuperAdmin@12345", 10);
  await prisma.user.upsert({
    where: { email: "owner@platform.com" },
    update: {},
    create: {
      firstName: "Platform",
      lastName: "Owner",
      email: "owner@platform.com",
      passwordHash: superAdminPasswordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      companyId: null,
    },
  });

  // A demo company so you can log in and see the HR side of the product too.
  const demoCompany = await prisma.company.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "Demo Company",
      slug: "demo-company",
      contactEmail: "admin@company.com",
      billingStatus: "TRIALING",
      pricePerSeatCents: 500,
    },
  });

  const dept = await prisma.department.upsert({
    where: { companyId_name: { companyId: demoCompany.id, name: "Human Resources" } },
    update: {},
    create: { name: "Human Resources", companyId: demoCompany.id },
  });

  const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      employeeCode: "EMP-0000",
      firstName: "System",
      lastName: "Admin",
      email: "admin@company.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      position: "HR Administrator",
      departmentId: dept.id,
      companyId: demoCompany.id,
    },
  });

  await prisma.leaveBalance.upsert({
    where: { userId_year: { userId: admin.id, year: new Date().getFullYear() } },
    update: {},
    create: { userId: admin.id, year: new Date().getFullYear() },
  });

  console.log("Seeded platform owner -> email: owner@platform.com / password: SuperAdmin@12345");
  console.log("Seeded demo company admin -> email: admin@company.com / password: Admin@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
