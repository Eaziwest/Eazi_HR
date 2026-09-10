import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";

// Triggers a browser download for an authenticated GET endpoint that returns a file
async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", position: "", role: "EMPLOYEE" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [importError, setImportError] = useState("");

  function load() {
    setEmployeesLoading(true);
    api.get("/employees").then((res) => setEmployees(res.data)).finally(() => setEmployeesLoading(false));
  }
  useEffect(load, []);

  async function addEmployee(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/auth/register", form);
      setSuccess(`${form.firstName} ${form.lastName} was added successfully.`);
      setForm({ firstName: "", lastName: "", email: "", password: "", position: "", role: "EMPLOYEE" });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add employee"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportError("");
    setImportResults(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await api.post("/employees/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResults(res.data);
      setImportFile(null);
      load();
    } catch (err) {
      setImportError(getErrorMessage(err, "Import failed"));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <h1>Employees</h1>

      <div className="card">
        <h3>Bulk import from Excel</h3>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: -6 }}>
          Add many employees at once. Download the template, fill in a row per person, then upload it below.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className="secondary"
            onClick={() => downloadFile("/employees/import-template", "employee_import_template.xlsx")}
          >
            Download template
          </button>
        </div>
        <form onSubmit={handleImport}>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
          />
          {importError && <p className="error-text">{importError}</p>}
          <button type="submit" disabled={!importFile || importing}>
            {importing ? "Importing..." : "Import employees"}
          </button>
        </form>

        {importResults && (
          <div style={{ marginTop: 16 }}>
            <p>
              <strong>{importResults.created.length}</strong> employee(s) created
              {importResults.errors.length > 0 && <> · <strong>{importResults.errors.length}</strong> row(s) had errors</>}
            </p>

            {importResults.created.length > 0 && (
              <table>
                <thead><tr><th>Row</th><th>Email</th><th>Employee Code</th><th>Temp Password</th></tr></thead>
                <tbody>
                  {importResults.created.map((c) => (
                    <tr key={c.row}>
                      <td>{c.row}</td>
                      <td>{c.email}</td>
                      <td>{c.employeeCode}</td>
                      <td>{c.temporaryPassword || <em>as provided</em>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {importResults.created.some((c) => c.temporaryPassword) && (
              <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Share these temporary passwords securely with each employee — they aren't shown again.
              </p>
            )}

            {importResults.errors.length > 0 && (
              <table style={{ marginTop: 12 }}>
                <thead><tr><th>Row</th><th>Email</th><th>Error</th></tr></thead>
                <tbody>
                  {importResults.errors.map((err, i) => (
                    <tr key={i}>
                      <td>{err.row}</td>
                      <td>{err.email || "-"}</td>
                      <td className="error-text">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Onboard a new employee</h3>
        <form onSubmit={addEmployee}>
          <input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="HR">HR</option>
            <option value="ADMIN">Admin</option>
          </select>
          {error && <p className="error-text">{error}</p>}
          {success && <p style={{ color: "var(--success)", fontSize: 13 }}>{success}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add employee (creates onboarding checklist automatically)"}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>All employees</h3>
          <button
            type="button"
            className="secondary"
            onClick={() => downloadFile("/employees/export", "employees.xlsx")}
          >
            Export to Excel
          </button>
        </div>
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Position</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {employeesLoading && <tr><td colSpan={5}>Loading employees...</td></tr>}
            {!employeesLoading && employees.map((e) => (
              <tr key={e.id}>
                <td>{e.employeeCode}</td>
                <td>{e.firstName} {e.lastName}</td>
                <td>{e.position || "-"}</td>
                <td>{e.role}</td>
                <td><span className={`badge ${e.status}`}>{e.status}</span></td>
              </tr>
            ))}
            {!employeesLoading && employees.length === 0 && <tr><td colSpan={5}>No employees yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
