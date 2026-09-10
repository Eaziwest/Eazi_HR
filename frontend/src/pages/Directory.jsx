import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function initials(first, last) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
}

export default function Directory() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get("/insights/directory").then((res) => setPeople(res.data)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.position || ""} ${p.department?.name || ""}`.toLowerCase().includes(q)
    );
  }, [people, query]);

  return (
    <div>
      <h1>Directory</h1>
      <div className="card">
        <input
          placeholder="Search by name, role, or department..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 420 }}
        />
      </div>

      {loading && <p>Loading...</p>}

      {!loading && (
        <div className="directory-grid">
          {filtered.map((p) => (
            <div className="directory-card" key={p.id}>
              <div className="directory-avatar">{initials(p.firstName, p.lastName)}</div>
              <h4>{p.firstName} {p.lastName}</h4>
              <p>{p.position || "No title set"}</p>
              <p>{p.department?.name || "No department"}</p>
              {p.email && <p style={{ marginTop: 6 }}>{p.email}</p>}
              {p.phone && <p>{p.phone}</p>}
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: "var(--text-dim)" }}>No matching colleagues found.</p>}
        </div>
      )}
    </div>
  );
}
