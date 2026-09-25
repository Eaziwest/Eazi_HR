const { verifyToken } = require("../utils/jwt");

// Verifies the JWT sent in the Authorization header and attaches the user to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Restricts a route to one or more roles, e.g. requireRole("ADMIN", "HR")
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }
    next();
  };
}

// Blocks every action until a forced password change is done. Applied globally
// to everything under /api except /api/auth/*, so a first-login temp password
// (from HR registering someone, or the bulk import) can't be used to browse the
// rest of the app before it's changed — closing that gap in the frontend-only
// redirect, which a direct API call could otherwise bypass.
function requirePasswordChanged(req, res, next) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({ code: "MUST_CHANGE_PASSWORD", message: "Please change your password before continuing" });
  }
  next();
}

module.exports = { requireAuth, requireRole, requirePasswordChanged };
