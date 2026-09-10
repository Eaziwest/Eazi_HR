const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { clockIn, clockOut, myStatus, myHistory, companyToday } = require("../controllers/attendance.controller");

const router = express.Router();
router.use(requireAuth);

router.post("/clock-in", clockIn);
router.post("/clock-out", clockOut);
router.get("/me/status", myStatus);
router.get("/me/history", myHistory);
router.get("/today", requireRole("ADMIN", "HR", "MANAGER"), companyToday);

module.exports = router;
