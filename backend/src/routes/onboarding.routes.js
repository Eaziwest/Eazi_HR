const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  getTasksForUser, createTask, completeTask, deleteTask,
} = require("../controllers/onboarding.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/me", getTasksForUser); // employee views their own checklist
router.get("/:userId", requireRole("ADMIN", "HR", "MANAGER"), getTasksForUser);
router.post("/", requireRole("ADMIN", "HR"), createTask);
router.patch("/:id/complete", completeTask); // employee can tick off their own tasks
router.delete("/:id", requireRole("ADMIN", "HR"), deleteTask);

module.exports = router;
