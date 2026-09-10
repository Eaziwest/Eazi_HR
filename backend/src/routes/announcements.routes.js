const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { listAnnouncements, createAnnouncement, deleteAnnouncement } = require("../controllers/announcements.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/", listAnnouncements);
router.post("/", requireRole("ADMIN", "HR"), createAnnouncement);
router.delete("/:id", requireRole("ADMIN", "HR"), deleteAnnouncement);

module.exports = router;
