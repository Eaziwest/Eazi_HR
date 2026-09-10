import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Appraisals() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "MANAGER";

  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", period: "", goals: "" });
  const [selected, setSelected] = useState(null);
  const [reviewForm, setReviewForm] = useState({});

  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [ackError, setAckError] = useState("");
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  function loadMine() { api.get("/appraisals/me").then((res) => setMine(res.data)); }
  function loadAll() { if (isHR) api.get("/appraisals").then((res) => setAll(res.data)); }
  function loadEmployees() { if (isHR) api.get("/employees").then((res) => setEmployees(res.data)); }

  useEffect(() => { loadMine(); loadAll(); loadEmployees(); }, []);

  async function createAppraisal(e) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await api.post("/appraisals", form);
      setForm({ employeeId: "", period: "", goals: "" });
      loadAll();
    } catch (err) {
      setCreateError(getErrorMessage(err, "Could not create appraisal"));
    } finally {
      setCreating(false);
    }
  }

  function openReview(appraisal) {
    setSelected(appraisal);
    setReviewError("");
    setReviewForm({
      achievements: appraisal.achievements || "",
      strengths: appraisal.strengths || "",
      areasForImprovement: appraisal.areasForImprovement || "",
      rating: appraisal.rating || 3,
      status: "REVIEWED",
    });
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewError("");
    setReviewSubmitting(true);
    try {
      await api.patch(`/appraisals/${selected.id}`, reviewForm);
      setSelected(null);
      loadAll();
    } catch (err) {
      setReviewError(getErrorMessage(err, "Could not submit review"));
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function acknowledge(id) {
    setAckError("");
    setAcknowledgingId(id);
    try {
      await api.patch(`/appraisals/${id}`, { status: "ACKNOWLEDGED" });
      loadMine();
    } catch (err) {
      setAckError(getErrorMessage(err, "Could not acknowledge this appraisal"));
    } finally {
      setAcknowledgingId(null);
    }
  }

  return (
    <div>
      <h1>Appraisals</h1>

      <div className="card">
        <h3>My performance reviews</h3>
        {ackError && <p className="error-text">{ackError}</p>}
        <table>
          <thead><tr><th>Period</th><th>Reviewer</th><th>Rating</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {mine.map((a) => (
              <tr key={a.id}>
                <td>{a.period}</td>
                <td>{a.reviewer?.firstName} {a.reviewer?.lastName}</td>
                <td>{a.rating ? `${a.rating} / 5` : "-"}</td>
                <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                <td>
                  {a.status === "REVIEWED" && (
                    <button onClick={() => acknowledge(a.id)} disabled={acknowledgingId === a.id}>
                      {acknowledgingId === a.id ? "Saving..." : "Acknowledge"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {mine.length === 0 && <tr><td colSpan={5}>No appraisals yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {isHR && (
        <>
          <div className="card">
            <h3>Start a new appraisal cycle</h3>
            <form onSubmit={createAppraisal}>
              <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                ))}
              </select>
              <input placeholder="Period (e.g. 2026-H1)" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required />
              <textarea placeholder="Goals for this period" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
              {createError && <p className="error-text">{createError}</p>}
              <button type="submit" disabled={creating}>{creating ? "Creating..." : "Create appraisal"}</button>
            </form>
          </div>

          <div className="card">
            <h3>All appraisals</h3>
            <table>
              <thead><tr><th>Employee</th><th>Period</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {all.map((a) => (
                  <tr key={a.id}>
                    <td>{a.employee.firstName} {a.employee.lastName}</td>
                    <td>{a.period}</td>
                    <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                    <td><button className="secondary" onClick={() => openReview(a)}>Fill review</button></td>
                  </tr>
                ))}
                {all.length === 0 && <tr><td colSpan={4}>No appraisals created.</td></tr>}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
              Only the reviewer who started an appraisal cycle (or an Admin/HR user) can fill in its review.
            </p>
          </div>

          {selected && (
            <div className="card">
              <h3>Review: {selected.employee.firstName} {selected.employee.lastName} ({selected.period})</h3>
              <form onSubmit={submitReview}>
                <textarea placeholder="Achievements" value={reviewForm.achievements} onChange={(e) => setReviewForm({ ...reviewForm, achievements: e.target.value })} />
                <textarea placeholder="Strengths" value={reviewForm.strengths} onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })} />
                <textarea placeholder="Areas for improvement" value={reviewForm.areasForImprovement} onChange={(e) => setReviewForm({ ...reviewForm, areasForImprovement: e.target.value })} />
                <select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
                </select>
                {reviewError && <p className="error-text">{reviewError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={reviewSubmitting}>{reviewSubmitting ? "Submitting..." : "Submit review"}</button>
                  <button type="button" className="secondary" onClick={() => setSelected(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
