import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";

const BILLING_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"];

function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "", contactName: "", contactEmail: "", pricePerSeat: "5.00",
    adminFirstName: "", adminLastName: "", adminEmail: "", adminPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  function load() {
    setLoading(true);
    api.get("/companies").then((res) => setCompanies(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function createCompany(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);
    try {
      const pricePerSeatCents = Math.round(parseFloat(form.pricePerSeat || "0") * 100);
      await api.post("/companies", {
        name: form.name,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail,
        pricePerSeatCents,
        admin: {
          firstName: form.adminFirstName,
          lastName: form.adminLastName,
          email: form.adminEmail,
          password: form.adminPassword,
        },
      });
      setSuccess(`${form.name} was created, with ${form.adminFirstName} ${form.adminLastName} as its first Admin.`);
      setForm({ name: "", contactName: "", contactEmail: "", pricePerSeat: "5.00", adminFirstName: "", adminLastName: "", adminEmail: "", adminPassword: "" });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not create company"));
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id, billingStatus) {
    setStatusUpdatingId(id);
    try {
      await api.patch(`/companies/${id}/status`, { billingStatus });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update company status"));
    } finally {
      setStatusUpdatingId(null);
    }
  }

  const totalMRRCents = companies.reduce((sum, c) => sum + (c.monthlyEstimateCents || 0), 0);
  const activeCompanies = companies.filter((c) => c.billingStatus === "ACTIVE").length;

  return (
    <div>
      <h1>Companies</h1>

      <div className="stat-grid">
        <div className="card stat-card">
          <h3>{companies.length}</h3>
          <p>Total companies</p>
        </div>
        <div className="card stat-card">
          <h3>{activeCompanies}</h3>
          <p>Active subscriptions</p>
        </div>
        <div className="card stat-card">
          <h3>{formatMoney(totalMRRCents)}</h3>
          <p>Estimated monthly revenue</p>
        </div>
      </div>

      <div className="card">
        <h3>Onboard a new company</h3>
        <form onSubmit={createCompany}>
          <input placeholder="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Billing contact name (optional)" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <input type="email" placeholder="Billing contact email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} required />
          <label style={{ fontSize: 13, color: "var(--text-dim)" }}>
            Price per seat / month ($)
            <input type="number" min="0" step="0.01" value={form.pricePerSeat} onChange={(e) => setForm({ ...form, pricePerSeat: e.target.value })} required />
          </label>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>First Admin account for this company:</p>
          <input placeholder="Admin first name" value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} required />
          <input placeholder="Admin last name" value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} required />
          <input type="email" placeholder="Admin email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
          <input type="password" placeholder="Temporary admin password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required />

          {error && <p className="error-text">{error}</p>}
          {success && <p style={{ color: "var(--success)", fontSize: 13 }}>{success}</p>}
          <button type="submit" disabled={creating}>{creating ? "Creating..." : "Create company"}</button>
        </form>
      </div>

      <div className="card">
        <h3>All companies</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Contact</th><th>Seats</th><th>Price/seat</th><th>Est. monthly</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6}>Loading...</td></tr>}
            {!loading && companies.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.contactEmail}</td>
                <td>{c.seatCount}</td>
                <td>{formatMoney(c.pricePerSeatCents)}</td>
                <td>{formatMoney(c.monthlyEstimateCents)}</td>
                <td>
                  <select
                    value={c.billingStatus}
                    disabled={statusUpdatingId === c.id}
                    onChange={(e) => updateStatus(c.id, e.target.value)}
                  >
                    {BILLING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!loading && companies.length === 0 && <tr><td colSpan={6}>No companies yet — create your first one above.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
