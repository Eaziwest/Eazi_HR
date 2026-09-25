const prisma = require("../config/db");

// Clock in — fails if the employee already has an open (not-clocked-out) entry.
// The findFirst check below is a fast path for the common case; the actual
// guarantee against double clock-ins is the partial unique index on
// (userId) WHERE clockOut IS NULL (see migrations), which the catch block
// below turns into the same friendly message if two requests race each other.
async function clockIn(req, res) {
  const open = await prisma.attendanceEntry.findFirst({
    where: { userId: req.user.id, clockOut: null },
  });
  if (open) return res.status(400).json({ message: "You're already clocked in" });

  try {
    const entry = await prisma.attendanceEntry.create({ data: { userId: req.user.id } });
    res.status(201).json(entry);
  } catch (err) {
    if (err.code === "P2010" || /unique/i.test(err.message || "")) {
      return res.status(409).json({ message: "You're already clocked in" });
    }
    throw err;
  }
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

// HR/Manager view: today's attendance across the whole company.
//
// "Today" only makes sense relative to a timezone. The server may run in UTC
// (typical for most hosts) while the HR viewer is in, say, UTC+6 — using the
// server's local clock for the day boundary would cut off the last few hours
// of their actual "today" or bleed in the tail of "yesterday". The frontend
// passes its own local date + timezone offset (Date.getTimezoneOffset()) so
// the boundary lines up with the viewer's calendar day, not the server's.
async function companyToday(req, res) {
  const { date, tzOffset } = req.query;
  const offsetMinutes = Number(tzOffset) || 0;

  let startOfDay;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    startOfDay = new Date(Date.parse(`${date}T00:00:00.000Z`) + offsetMinutes * 60000);
  } else {
    startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
  }
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const entries = await prisma.attendanceEntry.findMany({
    where: {
      clockIn: { gte: startOfDay, lt: endOfDay },
      user: { companyId: req.user.companyId },
    },
    include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: true } } },
    orderBy: { clockIn: "desc" },
  });
  res.json(entries);
}

module.exports = { clockIn, clockOut, myStatus, myHistory, companyToday };
