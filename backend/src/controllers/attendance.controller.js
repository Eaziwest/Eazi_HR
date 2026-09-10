const prisma = require("../config/db");

// Clock in — fails if the employee already has an open (not-clocked-out) entry.
async function clockIn(req, res) {
  const open = await prisma.attendanceEntry.findFirst({
    where: { userId: req.user.id, clockOut: null },
  });
  if (open) return res.status(400).json({ message: "You're already clocked in" });

  const entry = await prisma.attendanceEntry.create({ data: { userId: req.user.id } });
  res.status(201).json(entry);
}

async function clockOut(req, res) {
  const open = await prisma.attendanceEntry.findFirst({
    where: { userId: req.user.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  if (!open) return res.status(400).json({ message: "You're not currently clocked in" });

  const entry = await prisma.attendanceEntry.update({
    where: { id: open.id },
    data: { clockOut: new Date() },
  });
  res.json(entry);
}

async function myStatus(req, res) {
  const open = await prisma.attendanceEntry.findFirst({
    where: { userId: req.user.id, clockOut: null },
  });
  res.json({ clockedIn: Boolean(open), openEntry: open || null });
}

async function myHistory(req, res) {
  const entries = await prisma.attendanceEntry.findMany({
    where: { userId: req.user.id },
    orderBy: { clockIn: "desc" },
    take: 30,
  });
  res.json(entries);
}

// HR/Manager view: today's attendance across the whole company
async function companyToday(req, res) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const entries = await prisma.attendanceEntry.findMany({
    where: {
      clockIn: { gte: startOfDay },
      user: { companyId: req.user.companyId },
    },
    include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: true } } },
    orderBy: { clockIn: "desc" },
  });
  res.json(entries);
}

module.exports = { clockIn, clockOut, myStatus, myHistory, companyToday };
