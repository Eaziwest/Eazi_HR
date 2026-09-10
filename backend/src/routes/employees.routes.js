const express = require("express");
const multer = require("multer");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listEmployees, getEmployee, updateEmployee, deactivateEmployee,
  exportEmployees, downloadImportTemplate, importEmployees,
} = require("../controllers/employees.controller");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

// NOTE: these specific routes must come before "/:id" or Express will treat
// "export"/"import" as an :id value.
router.get("/export", requireRole("ADMIN", "HR"), exportEmployees);
router.get("/import-template", requireRole("ADMIN", "HR"), downloadImportTemplate);
router.post("/import", requireRole("ADMIN", "HR"), upload.single("file"), importEmployees);

router.get("/", requireRole("ADMIN", "HR", "MANAGER"), listEmployees);
router.get("/:id", getEmployee); // employees can view their own profile via /me instead in the frontend; HR/manager can view any
router.patch("/:id", requireRole("ADMIN", "HR"), updateEmployee);
router.delete("/:id", requireRole("ADMIN", "HR"), deactivateEmployee);

module.exports = router;
