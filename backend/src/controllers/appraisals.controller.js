const { z } = require("zod");
const prisma = require("../config/db");

const createSchema = z.object({
  employeeId: z.string().uuid(),
  period: z.string().min(1),
  goals: z.string().optional(),
});

// A manager/HR initiates an appraisal cycle for an employee in their own company
async function createAppraisal(req, res) {
  const data = createSchema.parse(req.body);

  const employee = await prisma.user.findUnique({ where: { id: data.employeeId }, select: { companyId: true } });
  if (!employee || employee.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const appraisal = await prisma.appraisal.create({
    data: {
      employeeId: data.employeeId,
      reviewerId: req.user.id,
      period: data.period,
      goals: data.goals,
    },
  });
  res.status(201).json(appraisal);
}

const reviewerUpdateSchema = z.object({
  goals: z.string().optional(),
  achievements: z.string().optional(),
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "REVIEWED"]).optional(),
});

const employeeUpdateSchema = z.object({
  employeeComment: z.string().optional(),
  status: z.literal("ACKNOWLEDGED").optional(),
});

// The reviewer (or HR/Admin in the SAME company) fills in the assessment; the
// employee being reviewed can only add their own comment and acknowledge it
// once it's been reviewed.
async function updateAppraisal(req, res) {
  const appraisal = await prisma.appraisal.findUnique({
    where: { id: req.params.id },
    include: { employee: { select: { companyId: true } } },
  });
  if (!appraisal || appraisal.employee.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Appraisal not found" });
  }

  const isReviewer = appraisal.reviewerId === req.user.id;
  const isEmployee = appraisal.employeeId === req.user.id;
  const isHRorAdmin = ["ADMIN", "HR"].includes(req.user.role);

  let data;
  if (isReviewer || isHRorAdmin) {
    data = reviewerUpdateSchema.parse(req.body);
  } else if (isEmployee) {
    data = employeeUpdateSchema.parse(req.body);
    if (data.status === "ACKNOWLEDGED" && appraisal.status !== "REVIEWED") {
      return res.status(400).json({ message: "You can only acknowledge an appraisal once it has been reviewed" });
    }
  } else {
    return res.status(403).json({ message: "You do not have permission to update this appraisal" });
  }

  const updated = await prisma.appraisal.update({ where: { id: req.params.id }, data });
  res.json(updated);
}

async function myAppraisals(req, res) {
  const appraisals = await prisma.appraisal.findMany({
    where: { employeeId: req.user.id },
    include: { reviewer: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(appraisals);
}

// HR/Manager: appraisals within their own company, optionally filtered
async function listAppraisals(req, res) {
  const { employeeId, reviewerId } = req.query;
  const appraisals = await prisma.appraisal.findMany({
    where: {
      employee: { companyId: req.user.companyId },
      ...(employeeId && { employeeId }),
      ...(reviewerId && { reviewerId }),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      reviewer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(appraisals);
}

async function getAppraisal(req, res) {
  const appraisal = await prisma.appraisal.findUnique({
    where: { id: req.params.id },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true, companyId: true } },
      reviewer: { select: { firstName: true, lastName: true } },
    },
  });
  if (!appraisal || appraisal.employee.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Appraisal not found" });
  }

  const canView = appraisal.employeeId === req.user.id
    || appraisal.reviewerId === req.user.id
    || ["ADMIN", "HR"].includes(req.user.role);
  if (!canView) return res.status(403).json({ message: "You do not have permission to view this appraisal" });

  res.json(appraisal);
}

module.exports = { createAppraisal, updateAppraisal, myAppraisals, listAppraisals, getAppraisal };
