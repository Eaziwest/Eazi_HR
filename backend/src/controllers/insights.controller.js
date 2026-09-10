const prisma = require("../config/db");

// Read-only, lightweight company directory — available to every role, not just HR.
// Deliberately excludes sensitive fields (no email/phone) unless the viewer is HR/Admin.
async function directory(req, res) {
  const canSeeContactInfo = ["ADMIN", "HR", "MANAGER"].includes(req.user.role);

  const employees = await prisma.user.findMany({
    where: { companyId: req.user.companyId, status: { not: "TERMINATED" } },
    select: {
      id: true, firstName: true, lastName: true, position: true, status: true,
      department: { select: { name: true } },
      manager: { select: { firstName: true, lastName: true } },
      email: canSeeContactInfo,
      phone: canSeeContactInfo,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  res.json(employees);
}

// Aggregate numbers for the HR analytics dashboard — all scoped to the caller's company.
async function overview(req, res) {
  const companyId = req.user.companyId;

  const [headcountByDept, leavesByStatus, ratingCounts, statusCounts] = await Promise.all([
    prisma.user.groupBy({
      by: ["departmentId"],
      where: { companyId, status: { not: "TERMINATED" } },
      _count: true,
    }),
    prisma.leaveRequest.groupBy({
      by: ["status"],
      where: { user: { companyId } },
      _count: true,
    }),
    prisma.appraisal.groupBy({
      by: ["rating"],
      where: { employee: { companyId }, rating: { not: null } },
      _count: true,
    }),
    prisma.user.groupBy({
      by: ["status"],
      where: { companyId },
      _count: true,
    }),
  ]);

  const departments = await prisma.department.findMany({ where: { companyId } });
  const deptNameById = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  res.json({
    headcountByDepartment: headcountByDept.map((row) => ({
      department: row.departmentId ? (deptNameById[row.departmentId] || "Unknown") : "Unassigned",
      count: row._count,
    })),
    leavesByStatus: leavesByStatus.map((row) => ({ status: row.status, count: row._count })),
    ratingDistribution: ratingCounts.map((row) => ({ rating: row.rating, count: row._count })),
    employeesByStatus: statusCounts.map((row) => ({ status: row.status, count: row._count })),
  });
}

module.exports = { directory, overview };
