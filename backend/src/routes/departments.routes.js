const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const departments = await prisma.department.findMany({
    where: { companyId: req.user.companyId },
    orderBy: { name: "asc" },
  });
  res.json(departments);
});

router.post("/", requireRole("ADMIN", "HR"), async (req, res) => {
  const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
  const department = await prisma.department.create({ data: { name, companyId: req.user.companyId } });
  res.status(201).json(department);
});

module.exports = router;
