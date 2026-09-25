const { z } = require("zod");
const prisma = require("../config/db");

function daysBetween(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1; // inclusive
}

const requestSchema = z.object({
  type: z.enum(["ANNUAL", "CASUAL", "MATERNITY", "PATERNITY", "UNPAID", "OTHER"]),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: "End date must be on or after the start date",
  path: ["endDate"],
});

async function requestLeave(req, res) {
  const data = requestSchema.parse(req.body);
  const daysRequested = daysBetween(data.startDate, data.endDate);

  if (data.type === "ANNUAL") {
    const year = new Date(data.startDate).getFullYear();
    const balance = await prisma.leaveBalance.upsert({
      where: { userId_year: { userId: req.user.id, year } },
      update: {},
      create: { userId: req.user.id, year },
    });
    const pending = await prisma.leaveRequest.aggregate({
      where: { userId: req.user.id, type: "ANNUAL", status: "PENDING" },
      _sum: { daysRequested: true },
    });
    const alreadyCommitted = balance.annualUsed + (pending._sum.daysRequested || 0);
    const remaining = balance.annualEntitlement - alreadyCommitted;
    if (daysRequested > remaining) {
      return res.status(400).json({
        message: `This request exceeds your remaining annual leave balance (${remaining} day${remaining === 1 ? "" : "s"} left, ${daysRequested} requested).`,
      });
    }
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: req.user.id,
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      daysRequested,
      reason: data.reason,
    },
  });

  res.status(201).json(leave);
}

async function myLeaves(req, res) {
  const leaves = await prisma.leaveRequest.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(leaves);
}

// HR/Manager view: all leave requests within their own company, optionally filtered by status
async function listLeaves(req, res) {
  const { status } = req.query;
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      ...(status && { status }),
      user: { companyId: req.user.companyId },
    },
    include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(leaves);
}

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  approverComment: z.string().optional(),
});

async function decideLeave(req, res) {
  const data = decisionSchema.parse(req.body);

  const existing = await prisma.leaveRequest.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { companyId: true } } },
  });
  if (!existing || existing.user.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Leave request not found" });
  }
  if (existing.status !== "PENDING") {
    return res.status(400).json({ message: `This request has already been ${existing.status.toLowerCase()}` });
  }

  if (data.status === "APPROVED" && existing.type === "ANNUAL") {
    const year = new Date(existing.startDate).getFullYear();
    const balance = await prisma.leaveBalance.upsert({
      where: { userId_year: { userId: existing.userId, year } },
      update: {},
      create: { userId: existing.userId, year },
    });
    const remaining = balance.annualEntitlement - balance.annualUsed;
    if (existing.daysRequested > remaining) {
      return res.status(409).json({
        message: `Approving this would exceed the employee's remaining annual leave balance (${remaining} day${remaining === 1 ? "" : "s"} left, ${existing.daysRequested} requested).`,
      });
    }
  }

  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status: data.status, approverComment: data.approverComment, approverId: req.user.id },
  });

  if (data.status === "APPROVED") {
    const year = new Date(leave.startDate).getFullYear();
    await prisma.leaveBalance.upsert({
      where: { userId_year: { userId: leave.userId, year } },
      update: { annualUsed: { increment: leave.type === "ANNUAL" ? leave.daysRequested : 0 } },
      create: { userId: leave.userId, year, annualUsed: leave.type === "ANNUAL" ? leave.daysRequested : 0 },
    });
  }

  res.json(leave);
}

async function cancelLeave(req, res) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!leave || leave.userId !== req.user.id) {
    return res.status(403).json({ message: "You can only cancel your own leave requests" });
  }
  if (leave.status !== "PENDING") {
    return res.status(400).json({ message: "Only pending requests can be cancelled" });
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status: "CANCELLED" },
  });
  res.json(updated);
}

async function myBalance(req, res) {
  const year = new Date().getFullYear();
  const balance = await prisma.leaveBalance.upsert({
    where: { userId_year: { userId: req.user.id, year } },
    update: {},
    create: { userId: req.user.id, year },
  });
  res.json(balance);
}

module.exports = { requestLeave, myLeaves, listLeaves, decideLeave, cancelLeave, myBalance };
