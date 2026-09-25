require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const errorHandler = require("./middleware/errorHandler");
const { requireAuth, requirePasswordChanged } = require("./middleware/auth");
const stripeWebhookHandler = require("./webhooks/stripe.webhook");

const authRoutes = require("./routes/auth.routes");
const employeeRoutes = require("./routes/employees.routes");
const onboardingRoutes = require("./routes/onboarding.routes");
const leaveRoutes = require("./routes/leaves.routes");
const sickLeaveRoutes = require("./routes/sickLeaves.routes");
const appraisalRoutes = require("./routes/appraisals.routes");
const departmentRoutes = require("./routes/departments.routes");
const companyRoutes = require("./routes/companies.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const announcementRoutes = require("./routes/announcements.routes");
const insightsRoutes = require("./routes/insights.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));

// Stripe webhooks need the raw request body to verify the signature, so this
// route is registered BEFORE express.json() and given its own raw parser.
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);

// Everything else requires a valid token AND (if this is a first login with a
// temp password) that the password has been changed first.
app.use("/api", requireAuth, requirePasswordChanged);

app.use("/api/employees", employeeRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/sick-leaves", sickLeaveRoutes);
app.use("/api/appraisals", appraisalRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/insights", insightsRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`HR system API running on port ${PORT}`));
