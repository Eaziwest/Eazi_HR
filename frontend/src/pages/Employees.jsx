import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

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

const STATUS_OPTIONS = ["ONBOARDING", "ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"];

export default function Employees() {
  const { user: me } = useAuth();
  const canGrantAdminRoles = me?.role === "ADMIN";

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", position: "", role: "EMPLOYEE" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [importError, setImportError] = useState("");

  // Edit modal
  const [editing, setEditing] = useState(null); // employee row, or null
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [offboardingId, setOffboardingId] = useState(null);

  function load() {
    setEmployeesLoading(true);
    api.get("/employees").then((res) => setEmployees(res.data)).finally(() => setEmployeesLoading(false));
  }
  useEffect(() => {
    load();
    api.get("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

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

  function openEdit(emp) {
    setEditError("");
    setEditing(emp);
    setEditForm({
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      position: emp.position || "",
      phone: emp.phone || "",
      departmentId: emp.department?.id || "",
      status: emp.status,
      role: emp.role,
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError("");
    setEditSaving(true);
    try {
      const payload = { ...editForm };
      if (!payload.departmentId) delete payload.departmentId;
      if (payload.role === editing.role) delete payload.role; // don't resend unchanged role
      await api.patch(`/employees/${editing.id}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setEditError(getErrorMessage(err, "Could not save changes"));
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleOffboard(emp) {
    const offboarding = emp.status !== "TERMINATED";
    const verb = offboarding ? "remove" : "reinstate";
    if (!window.confirm(`Are you sure you want to ${verb} ${emp.firstName} ${emp.lastName}${offboarding ? " from the company" : ""}?`)) return;

    setOffboardingId(emp.id);
    try {
      if (offboarding) {
        await api.delete(`/employees/${emp.id}`);
      } else {
        await api.patch(`/employees/${emp.id}`, { status: "ACTIVE" });
      }
      load();
    } catch (err) {
      window.alert(getErrorMessage(err, `Could not ${verb} this employee`));
    } finally {
      setOffboardingId(null);
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
          <thead><tr><th>Code</th><th>Name</th><th>Position</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {employeesLoading && <tr><td colSpan={6}>Loading employees...</td></tr>}
            {!employeesLoading && employees.map((e) => (
              <tr key={e.id}>
                <td>{e.employeeCode}</td>
                <td>{e.firstName} {e.lastName}</td>
                <td>{e.position || "-"}</td>
                <td>{e.role}</td>
                <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button type="button" className="secondary" onClick={() => openEdit(e)}>Edit</button>
                    <button
                      type="button"
                      className="secondary"
                      style={e.status !== "TERMINATED" ? { color: "var(--danger)", borderColor: "rgba(255,92,114,0.35)" } : { color: "var(--success)", borderColor: "rgba(47,214,128,0.35)" }}
                      disabled={e.id === me?.id || offboardingId === e.id}
                      title={e.id === me?.id ? "You can't remove your own account" : undefined}
                      onClick={() => toggleOffboard(e)}
                    >
                      {e.status !== "TERMINATED" ? "Remove" : "Reinstate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!employeesLoading && employees.length === 0 && <tr><td colSpan={6}>No employees yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit {editing.firstName} {editing.lastName}</h3>
              <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Close">×</button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="form-row">
                <input placeholder="First name" value={editForm.firstName} onChange={(ev) => setEditForm({ ...editForm, firstName: ev.target.value })} required />
                <input placeholder="Last name" value={editForm.lastName} onChange={(ev) => setEditForm({ ...editForm, lastName: ev.target.value })} required />
              </div>
              <input placeholder="Position" value={editForm.position} onChange={(ev) => setEditForm({ ...editForm, position: ev.target.value })} />
              <input placeholder="Phone" value={editForm.phone} onChange={(ev) => setEditForm({ ...editForm, phone: ev.target.value })} />
              <select value={editForm.departmentId} onChange={(ev) => setEditForm({ ...editForm, departmentId: ev.target.value })}>
                <option value="">No department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="form-row">
                <select value={editForm.status} onChange={(ev) => setEditForm({ ...editForm, status: ev.target.value })}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={editForm.role}
                  disabled={editing.id === me?.id}
                  title={editing.id === me?.id ? "You can't change your own role" : undefined}
                  onChange={(ev) => setEditForm({ ...editForm, role: ev.target.value })}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  {canGrantAdminRoles && <option value="HR">HR</option>}
                  {canGrantAdminRoles && <option value="ADMIN">Admin</option>}
                </select>
              </div>
              {editError && <p className="error-text">{editError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={editSaving}>{editSaving ? "Saving..." : "Save changes"}</button>
                <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
