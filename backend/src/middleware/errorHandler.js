// Catches errors thrown (or passed via next(err)) anywhere in the app.
// Works with express-async-errors so async route handlers don't need try/catch everywhere.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === "P2002") {
    // Prisma unique constraint violation
    return res.status(409).json({ message: `A record with this ${err.meta?.target?.join(", ")} already exists` });
  }

  if (err.name === "ZodError") {
    return res.status(400).json({ message: "Validation failed", errors: err.errors });
  }

  // Prisma connection/engine errors (P1xxx codes) contain internal file paths and
  // stack details in err.message — never send that to the client, just log it.
  const isPrismaInternalError = typeof err.code === "string" && err.code.startsWith("P1");
  if (isPrismaInternalError || err.name === "PrismaClientInitializationError" || err.name === "PrismaClientKnownRequestError") {
    return res.status(503).json({ message: "The server can't reach the database right now. Please try again shortly." });
  }

  const status = err.status || 500;
  const message = status >= 500 ? "Something went wrong on our end. Please try again." : (err.message || "Something went wrong");
  res.status(status).json({ message });
}

module.exports = errorHandler;
