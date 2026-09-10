const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  requestLeave, myLeaves, listLeaves, decideLeave, cancelLeave, myBalance,
} = require("../controllers/leaves.controller");

const router = express.Router();

router.use(requireAuth);

router.post("/", requestLeave);
router.get("/me", myLeaves);
router.get("/balance", myBalance);
router.get("/", requireRole("ADMIN", "HR", "MANAGER"), listLeaves);
router.patch("/:id/decision", requireRole("ADMIN", "HR", "MANAGER"), decideLeave);
router.patch("/:id/cancel", cancelLeave);

module.exports = router;
