const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  requestSickLeave, mySickLeaves, listSickLeaves, decideSickLeave, cancelSickLeave,
} = require("../controllers/sickLeaves.controller");

const router = express.Router();

router.use(requireAuth);

router.post("/", requestSickLeave);
router.get("/me", mySickLeaves);
router.get("/", requireRole("ADMIN", "HR", "MANAGER"), listSickLeaves);
router.patch("/:id/decision", requireRole("ADMIN", "HR", "MANAGER"), decideSickLeave);
router.patch("/:id/cancel", cancelSickLeave);

module.exports = router;
