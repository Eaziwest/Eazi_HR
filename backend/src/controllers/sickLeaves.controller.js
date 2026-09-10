const { z } = require("zod");
const prisma = require("../config/db");

function daysBetween(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

const requestSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
  medicalCertificateUrl: z.string().url().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: "End date must be on or after the start date",
  path: ["endDate"],
});

async function requestSickLeave(req, res) {
  const data = requestSchema.parse(req.body);
  const daysRequested = daysBetween(data.startDate, data.endDate);

  const sickLeave = await prisma.sickLeaveRequest.create({
    data: {
      userId: req.user.id,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      daysRequested,
      reason: data.reason,
      medicalCertificateUrl: data.medicalCertificateUrl,
    },
  });

  res.status(201).json(sickLeave);
}

async function mySickLeaves(req, res) {
  const sickLeaves = await prisma.sickLeaveRequest.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(sickLeaves);
}

async function listSickLeaves(req, res) {
  const { status } = req.query;
  const sickLeaves = await prisma.sickLeaveRequest.findMany({
    where: {
      ...(status && { status }),
      user: { companyId: req.user.companyId },
    },
    include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(sickLeaves);
}

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  approverComment: z.string().optional(),
});

async function decideSickLeave(req, res) {
  const data = decisionSchema.parse(req.body);

  const existing = await prisma.sickLeaveRequest.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { companyId: true } } },
  });
  if (!existing || existing.user.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Sick leave request not found" });
  }
  if (existing.status !== "PENDING") {
    return res.status(400).json({ message: `This request has already been ${existing.status.toLowerCase()}` });
  }

  const sickLeave = await prisma.sickLeaveRequest.update({
    where: { id: req.params.id },
    data: { status: data.status, approverComment: data.approverComment, approverId: req.user.id },
  });

  if (data.status === "APPROVED") {
    const year = new Date(sickLeave.startDate).getFullYear();
    await prisma.leaveBalance.upsert({
      where: { userId_year: { userId: sickLeave.userId, year } },
      update: { sickUsed: { increment: sickLeave.daysRequested } },
      create: { userId: sickLeave.userId, year, sickUsed: sickLeave.daysRequested },
    });
  }

  res.json(sickLeave);
}

module.exports = { requestSickLeave, mySickLeaves, listSickLeaves, decideSickLeave };
