const prisma = require("../config/db");
const stripeBilling = require("./stripe");

// A "seat" is any employee who isn't terminated — onboarding/active/on-leave/
// suspended employees are all still billable, only TERMINATED frees up a seat.
async function countBillableSeats(companyId) {
  return prisma.user.count({
    where: { companyId, status: { not: "TERMINATED" }, role: { not: "SUPER_ADMIN" } },
  });
}

// Recomputes a company's seat count and pushes it to Stripe if billing is connected.
// Safe to call after any hire/termination — no-ops quietly if Stripe isn't configured.
async function syncCompanySeats(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || !company.stripeSubscriptionId) return;

  const seatCount = await countBillableSeats(companyId);
  await stripeBilling.updateSeatCount(company.stripeSubscriptionId, seatCount);
}

module.exports = { countBillableSeats, syncCompanySeats };
