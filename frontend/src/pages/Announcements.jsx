import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Announcements() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  function load() {
    setLoading(true);
    api.get("/announcements").then((res) => setItems(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function post(e) {
    e.preventDefault();
    setError("");
    setPosting(true);
    try {
      await api.post("/announcements", form);
      setForm({ title: "", body: "", pinned: false });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not post announcement"));
    } finally {
      setPosting(false);
    }
  }

  async function remove(id) {
    await api.delete(`/announcements/${id}`);
    load();
  }

  return (
    <div>
      <h1>Announcements</h1>

      {isHR && (
        <div className="card">
          <h3>Post an announcement</h3>
          <form onSubmit={post}>
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea placeholder="What's the update?" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            <label style={{ fontSize: 13, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              Pin to top
            </label>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" disabled={posting}>{posting ? "Posting..." : "Post announcement"}</button>
          </form>
        </div>
      )}

      <div className="card">
        <h3>Company feed</h3>
        {loading && <p>Loading...</p>}
        {!loading && items.length === 0 && <p style={{ color: "var(--text-dim)" }}>No announcements yet.</p>}
        {!loading && items.map((a) => (
          <div className="announcement" key={a.id}>
            <p className="announcement-title">
              {a.pinned && <span className="pin-badge">PINNED</span>}
              {a.title}
            </p>
            <p className="announcement-meta">
              {a.author.firstName} {a.author.lastName} · {new Date(a.createdAt).toLocaleString()}
            </p>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.body}</p>
            {isHR && (
              <button className="secondary" style={{ marginTop: 10 }} onClick={() => remove(a.id)}>Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
