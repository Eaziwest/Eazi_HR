const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { directory, overview } = require("../controllers/insights.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/directory", directory);
router.get("/overview", requireRole("ADMIN", "HR", "MANAGER"), overview);

module.exports = router;
