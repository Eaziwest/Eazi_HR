import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Leaves() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "MANAGER";

  const [myLeaves, setMyLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [form, setForm] = useState({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionId, setActionId] = useState(null);

  function loadMine() {
    api.get("/leaves/me").then((res) => setMyLeaves(res.data));
  }
  function loadAll() {
    if (isHR) api.get("/leaves").then((res) => setAllLeaves(res.data));
  }

  useEffect(() => { loadMine(); loadAll(); }, []);

  async function submitRequest(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/leaves", form);
      setForm({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
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
      await api.patch(`/leaves/${id}/decision`, { status });
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
      await api.patch(`/leaves/${id}/cancel`);
      loadMine();
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not cancel this request"));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <h1>Leave Requests</h1>

      <div className="card">
        <h3>Request time off</h3>
        <form onSubmit={submitRequest}>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="ANNUAL">Annual</option>
            <option value="CASUAL">Casual</option>
            <option value="MATERNITY">Maternity</option>
            <option value="PATERNITY">Paternity</option>
            <option value="UNPAID">Unpaid</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          <textarea placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit request"}</button>
        </form>
      </div>

      <div className="card">
        <h3>My requests</h3>
        {actionError && <p className="error-text">{actionError}</p>}
        <table>
          <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {myLeaves.map((l) => (
              <tr key={l.id}>
                <td>{l.type}</td>
                <td>{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</td>
                <td>{l.daysRequested}</td>
                <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                <td>{l.status === "PENDING" && <button className="secondary" onClick={() => cancel(l.id)} disabled={actionId === l.id}>{actionId === l.id ? "..." : "Cancel"}</button>}</td>
              </tr>
            ))}
            {myLeaves.length === 0 && <tr><td colSpan={5}>No leave requests yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {isHR && (
        <div className="card">
          <h3>Team requests (approvals)</h3>
          <table>
            <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {allLeaves.map((l) => (
                <tr key={l.id}>
                  <td>{l.user.firstName} {l.user.lastName}</td>
                  <td>{l.type}</td>
                  <td>{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</td>
                  <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                  <td>
                    {l.status === "PENDING" && (
                      <>
                        <button onClick={() => decide(l.id, "APPROVED")} disabled={actionId === l.id}>Approve</button>{" "}
                        <button className="secondary" onClick={() => decide(l.id, "REJECTED")} disabled={actionId === l.id}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {allLeaves.length === 0 && <tr><td colSpan={5}>No requests to review.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
