const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  createAppraisal, updateAppraisal, myAppraisals, listAppraisals, getAppraisal,
} = require("../controllers/appraisals.controller");

const router = express.Router();

router.use(requireAuth);

router.post("/", requireRole("ADMIN", "HR", "MANAGER"), createAppraisal);
router.get("/me", myAppraisals);
router.get("/", requireRole("ADMIN", "HR", "MANAGER"), listAppraisals);
router.get("/:id", getAppraisal);
router.patch("/:id", updateAppraisal); // reviewer fills assessment; employee can acknowledge/comment

module.exports = router;
