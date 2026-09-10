const express = require("express");
const { register, login, me, changePassword } = require("../controllers/auth.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Creating new employee accounts is an HR/Admin action, not public self-signup.
// The very first admin account is created by the seed script instead.
router.post("/register", requireAuth, requireRole("ADMIN", "HR"), register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.patch("/me/password", requireAuth, changePassword);

module.exports = router;
