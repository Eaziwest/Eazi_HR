const { z } = require("zod");
const prisma = require("../config/db");

async function getTasksForUser(req, res) {
  const userId = req.params.userId || req.user.id;

  // Only allow viewing tasks for a user in your own company
  if (userId !== req.user.id) {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
    if (!target || target.companyId !== req.user.companyId) {
      return res.status(404).json({ message: "Employee not found" });
    }
  }

  const tasks = await prisma.onboardingTask.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });
  res.json(tasks);
}

const createTaskSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  order: z.number().int().optional(),
});

async function createTask(req, res) {
  const data = createTaskSchema.parse(req.body);

  const target = await prisma.user.findUnique({ where: { id: data.userId }, select: { companyId: true } });
  if (!target || target.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const task = await prisma.onboardingTask.create({ data });
  res.status(201).json(task);
}

async function completeTask(req, res) {
  const existing = await prisma.onboardingTask.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { companyId: true } } },
  });
  if (!existing || existing.user.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Task not found" });
  }

  const isOwner = existing.userId === req.user.id;
  const isHRorAdmin = ["ADMIN", "HR"].includes(req.user.role);
  if (!isOwner && !isHRorAdmin) {
    return res.status(403).json({ message: "You can only complete your own onboarding tasks" });
  }

  const task = await prisma.onboardingTask.update({
    where: { id: req.params.id },
    data: { completed: true, completedAt: new Date() },
  });

  // If all tasks for this employee are complete, flip their status to ACTIVE
  const remaining = await prisma.onboardingTask.count({
    where: { userId: task.userId, completed: false },
  });
  if (remaining === 0) {
    await prisma.user.update({ where: { id: task.userId }, data: { status: "ACTIVE" } });
  }

  res.json(task);
}

async function deleteTask(req, res) {
  const existing = await prisma.onboardingTask.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { companyId: true } } },
  });
  if (!existing || existing.user.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Task not found" });
  }

  await prisma.onboardingTask.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { getTasksForUser, createTask, completeTask, deleteTask };
