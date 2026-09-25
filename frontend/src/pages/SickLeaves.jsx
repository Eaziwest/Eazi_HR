import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function SickLeaves() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "MANAGER";

  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "", medicalCertificateUrl: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionId, setActionId] = useState(null);

  function loadMine() { api.get("/sick-leaves/me").then((res) => setMine(res.data)); }
  function loadAll() { if (isHR) api.get("/sick-leaves").then((res) => setAll(res.data)); }

  useEffect(() => { loadMine(); loadAll(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/sick-leaves", form);
      setForm({ startDate: "", endDate: "", reason: "", medicalCertificateUrl: "" });
      loadMine();
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit request"));
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(id, status) {
    setActionError("");
    setActionId(id);
    try {
      await api.patch(`/sick-leaves/${id}/decision`, { status });
      loadAll();
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not update this request"));
    } finally {
      setActionId(null);
    }
  }

  async function cancel(id) {
    setActionError("");
    setActionId(id);
    try {
      await api.patch(`/sick-leaves/${id}/cancel`);
      loadMine();
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not cancel this request"));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <h1>Sick Leave</h1>

      <div className="card">
        <h3>Report sick leave</h3>
        <form onSubmit={submit}>
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          <textarea placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <input placeholder="Medical certificate URL (optional)" value={form.medicalCertificateUrl} onChange={(e) => setForm({ ...form, medicalCertificateUrl: e.target.value })} />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</button>
        </form>
      </div>

      <div className="card">
        <h3>My sick leave history</h3>
        {actionError && <p className="error-text">{actionError}</p>}
        <table>
          <thead><tr><th>Dates</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {mine.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}</td>
                <td>{s.daysRequested}</td>
                <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                <td>
                  {s.status === "PENDING" && (
                    <button className="secondary" onClick={() => cancel(s.id)} disabled={actionId === s.id}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {mine.length === 0 && <tr><td colSpan={4}>No sick leave recorded.</td></tr>}
          </tbody>
        </table>
      </div>

      {isHR && (
        <div className="card">
          <h3>Team sick leave (approvals)</h3>
          {actionError && <p className="error-text">{actionError}</p>}
          <table>
            <thead><tr><th>Employee</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {all.map((s) => (
                <tr key={s.id}>
                  <td>{s.user.firstName} {s.user.lastName}</td>
                  <td>{new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}</td>
                  <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                  <td>
                    {s.status === "PENDING" && (
                      <>
                        <button onClick={() => decide(s.id, "APPROVED")} disabled={actionId === s.id}>Approve</button>{" "}
                        <button className="secondary" onClick={() => decide(s.id, "REJECTED")} disabled={actionId === s.id}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {all.length === 0 && <tr><td colSpan={4}>No requests to review.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
