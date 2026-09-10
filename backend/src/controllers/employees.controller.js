const { z } = require("zod");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const { syncCompanySeats } = require("../utils/seats");

const VALID_ROLES = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"];

async function nextEmployeeCode(companyId) {
  const count = await prisma.user.count({ where: { companyId } });
  return `EMP-${String(count + 1).padStart(4, "0")}`;
}

// Everything below is scoped to req.user.companyId — one company's HR staff
// can never see or touch another company's employee records.

async function listEmployees(req, res) {
  const { status, departmentId } = req.query;

  const employees = await prisma.user.findMany({
    where: {
      companyId: req.user.companyId,
      ...(status && { status }),
      ...(departmentId && { departmentId }),
    },
    select: {
      id: true, employeeCode: true, firstName: true, lastName: true, email: true,
      role: true, status: true, position: true, dateHired: true,
      department: true, manager: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(employees);
}

async function getEmployee(req, res) {
  const isSelf = req.params.id === req.user.id;
  const canViewAny = ["ADMIN", "HR", "MANAGER"].includes(req.user.role);
  if (!isSelf && !canViewAny) {
    return res.status(403).json({ message: "You can only view your own profile" });
  }

  const employee = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, employeeCode: true, firstName: true, lastName: true, email: true,
      role: true, status: true, position: true, dateHired: true, phone: true,
      companyId: true,
      department: true, manager: { select: { id: true, firstName: true, lastName: true } },
      reports: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
  });

  if (!employee || employee.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Employee not found" });
  }
  delete employee.companyId;
  res.json(employee);
}

const updateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["ONBOARDING", "ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).optional(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
});

async function updateEmployee(req, res) {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const data = updateSchema.parse(req.body);
  const employee = await prisma.user.update({
    where: { id: req.params.id },
    data,
  });

  // A status change (e.g. to/from TERMINATED) affects billable seat count.
  if (data.status) await syncCompanySeats(req.user.companyId);

  res.json(employee);
}

async function deactivateEmployee(req, res) {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.user.companyId) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const employee = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "TERMINATED" },
  });

  await syncCompanySeats(req.user.companyId);

  res.json(employee);
}

// Downloads this company's employees as an .xlsx file
async function exportEmployees(req, res) {
  const employees = await prisma.user.findMany({
    where: { companyId: req.user.companyId },
    include: { department: true, manager: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Employees");

  sheet.columns = [
    { header: "Employee Code", key: "employeeCode", width: 14 },
    { header: "First Name", key: "firstName", width: 16 },
    { header: "Last Name", key: "lastName", width: 16 },
    { header: "Email", key: "email", width: 28 },
    { header: "Role", key: "role", width: 12 },
    { header: "Position", key: "position", width: 20 },
    { header: "Department", key: "department", width: 18 },
    { header: "Manager", key: "manager", width: 20 },
    { header: "Status", key: "status", width: 14 },
    { header: "Date Hired", key: "dateHired", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  employees.forEach((e) => {
    sheet.addRow({
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      role: e.role,
      position: e.position || "",
      department: e.department?.name || "",
      manager: e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : "",
      status: e.status,
      dateHired: e.dateHired.toISOString().split("T")[0],
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=employees.xlsx");
  await workbook.xlsx.write(res);
  res.end();
}

// Downloads a blank template with the columns expected by /import
async function downloadImportTemplate(req, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Employees");

  sheet.columns = [
    { header: "First Name", key: "firstName", width: 16 },
    { header: "Last Name", key: "lastName", width: 16 },
    { header: "Email", key: "email", width: 28 },
    { header: "Password", key: "password", width: 16 },
    { header: "Position", key: "position", width: 20 },
    { header: "Role", key: "role", width: 14 },
    { header: "Department", key: "department", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    firstName: "Jane", lastName: "Doe", email: "jane.doe@company.com",
    password: "", position: "Software Engineer", role: "EMPLOYEE", department: "Engineering",
  });

  const notes = workbook.addWorksheet("Instructions");
  notes.getColumn(1).width = 90;
  notes.addRow(["Required columns: First Name, Last Name, Email"]);
  notes.addRow(["Password is optional — leave blank to auto-generate a temporary password (shown in the import results)"]);
  notes.addRow(["Role must be one of: ADMIN, HR, MANAGER, EMPLOYEE (defaults to EMPLOYEE if left blank or invalid)"]);
  notes.addRow(["Department is created automatically if it doesn't already exist"]);
  notes.addRow(["Each imported employee automatically gets a standard onboarding checklist"]);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=employee_import_template.xlsx");
  await workbook.xlsx.write(res);
  res.end();
}

// Bulk-creates employees from an uploaded .xlsx file, all scoped to the
// uploader's own company (multer puts the buffer on req.file)
async function importEmployees(req, res) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const companyId = req.user.companyId;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return res.status(400).json({ message: "Your account isn't linked to a company" });
  if (["SUSPENDED", "CANCELED"].includes(company.billingStatus)) {
    return res.status(402).json({ message: "This company's subscription is not active. Please contact billing support before adding employees." });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ message: "The uploaded file has no worksheets" });

  const headerMap = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    if (cell.value) headerMap[String(cell.value).trim().toLowerCase()] = colNumber;
  });

  const required = ["first name", "last name", "email"];
  const missing = required.filter((col) => !headerMap[col]);
  if (missing.length > 0) {
    return res.status(400).json({ message: `Missing required column(s): ${missing.join(", ")}` });
  }

  const getVal = (row, col) => {
    const idx = headerMap[col];
    if (!idx) return undefined;
    const value = row.getCell(idx).value;
    if (value === null || value === undefined) return undefined;
    return String(value).trim() || undefined;
  };

  const results = { created: [], errors: [] };

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const firstName = getVal(row, "first name");
    const lastName = getVal(row, "last name");
    const emailRaw = getVal(row, "email");
    const email = emailRaw ? emailRaw.toLowerCase() : undefined;

    if (!firstName && !lastName && !email) continue; // skip fully blank rows

    if (!firstName || !lastName || !email) {
      results.errors.push({ row: rowNumber, message: "First Name, Last Name, and Email are all required" });
      continue;
    }

    try {
      const position = getVal(row, "position");
      const departmentName = getVal(row, "department");
      const roleRaw = (getVal(row, "role") || "EMPLOYEE").toUpperCase();
      const role = VALID_ROLES.includes(roleRaw) ? roleRaw : "EMPLOYEE";
      const providedPassword = getVal(row, "password");
      const tempPassword = providedPassword || crypto.randomBytes(4).toString("hex");

      let departmentId;
      if (departmentName) {
        const dept = await prisma.department.upsert({
          where: { companyId_name: { companyId, name: departmentName } },
          update: {},
          create: { name: departmentName, companyId },
        });
        departmentId = dept.id;
      }

      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const employeeCode = await nextEmployeeCode(companyId);

      const user = await prisma.user.create({
        data: {
          firstName, lastName, email, passwordHash, role, position, departmentId,
          employeeCode, status: "ONBOARDING", companyId,
        },
      });

      await prisma.onboardingTask.createMany({
        data: [
          { userId: user.id, title: "Sign employment contract", order: 1 },
          { userId: user.id, title: "Submit ID and bank details", order: 2 },
          { userId: user.id, title: "IT setup: laptop, email, accounts", order: 3 },
          { userId: user.id, title: "Complete orientation / company policies", order: 4 },
          { userId: user.id, title: "Meet your manager and team", order: 5 },
        ],
      });
      await prisma.leaveBalance.create({ data: { userId: user.id, year: new Date().getFullYear() } });

      results.created.push({
        row: rowNumber,
        employeeCode,
        email,
        temporaryPassword: providedPassword ? undefined : tempPassword,
      });
    } catch (err) {
      const message = err.code === "P2002" ? "Email already exists" : err.message;
      results.errors.push({ row: rowNumber, email, message });
    }
  }

  await syncCompanySeats(companyId);

  res.json(results);
}

module.exports = {
  listEmployees, getEmployee, updateEmployee, deactivateEmployee,
  exportEmployees, downloadImportTemplate, importEmployees,
};
