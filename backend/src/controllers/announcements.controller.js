const { z } = require("zod");
const prisma = require("../config/db");

async function listAnnouncements(req, res) {
  const announcements = await prisma.announcement.findMany({
    where: { companyId: req.user.companyId },
    include: { author: { select: { firstName: true, lastName: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  res.json(announcements);
}

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  pinned: z.boolean().optional(),
});

async function createAnnouncement(req, res) {
  const data = createSchema.parse(req.body);
  const announcement = await prisma.announcement.create({
    data: { ...data, companyId: req.user.companyId, authorId: req.user.id },
  });
  res.status(201).json(announcement);
}

async function deleteAnnouncement(req, res) {
  const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Announcement not found" });
  }
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
