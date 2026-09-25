const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, me, changePassword } = require("../controllers/auth.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Login is the one public, unauthenticated endpoint here, which makes it the
// obvious target for a password-guessing script. 10 attempts / 15 min per IP
// is generous for a real user who mistyped a password but slows a brute force
// attempt down to a crawl.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please wait a few minutes and try again." },
});

// Creating new employee accounts is an HR/Admin action, not public self-signup.
// The very first admin account is created by the seed script instead.
router.post("/register", requireAuth, requireRole("ADMIN", "HR"), register);
router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, me);
router.patch("/me/password", requireAuth, changePassword);

module.exports = router;
