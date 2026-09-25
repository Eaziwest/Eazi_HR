const prisma = require("../config/db");

// employeeCode is generated as "next count + 1", which is only safe when
// requests are strictly sequential. Two employees created at nearly the same
// moment (two HR staff hiring at once, or a bulk import racing a manual
// register call) could both compute the same count and collide on the
// @@unique([companyId, employeeCode]) constraint. Rather than surfacing that
// as an error to whichever request loses the race, we just recompute the next
// code and try again — a handful of retries is enough since only the unlucky
// requests that overlapped within the same tick ever need one.
const MAX_ATTEMPTS = 5;

async function nextEmployeeCode(companyId, bump = 0) {
  const count = await prisma.user.count({ where: { companyId } });
  return `EMP-${String(count + 1 + bump).padStart(4, "0")}`;
}

async function createUserWithEmployeeCode(data) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const employeeCode = await nextEmployeeCode(data.companyId, attempt);
    try {
      // eslint-disable-next-line no-await-in-loop
      return await prisma.user.create({ data: { ...data, employeeCode } });
    } catch (err) {
      const collidedOnCode = err.code === "P2002" && err.meta?.target?.includes?.("employeeCode");
      if (!collidedOnCode) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}

module.exports = { nextEmployeeCode, createUserWithEmployeeCode };
