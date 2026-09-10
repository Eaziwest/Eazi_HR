const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  createCompany, listCompanies, getCompany, updateCompanyStatus,
} = require("../controllers/companies.controller");

const router = express.Router();

router.use(requireAuth, requireRole("SUPER_ADMIN"));

router.post("/", createCompany);
router.get("/", listCompanies);
router.get("/:id", getCompany);
router.patch("/:id/status", updateCompanyStatus);

module.exports = router;
