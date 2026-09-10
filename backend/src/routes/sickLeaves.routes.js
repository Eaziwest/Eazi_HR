const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  requestSickLeave, mySickLeaves, listSickLeaves, decideSickLeave,
} = require("../controllers/sickLeaves.controller");

const router = express.Router();

router.use(requireAuth);

router.post("/", requestSickLeave);
router.get("/me", mySickLeaves);
router.get("/", requireRole("ADMIN", "HR", "MANAGER"), listSickLeaves);
router.patch("/:id/decision", requireRole("ADMIN", "HR", "MANAGER"), decideSickLeave);

module.exports = router;
