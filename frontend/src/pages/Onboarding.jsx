import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";

export default function Onboarding() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingId, setCompletingId] = useState(null);

  function load() {
    api.get("/onboarding/me").then((res) => setTasks(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function complete(id) {
    setError("");
    setCompletingId(id);
    try {
      await api.patch(`/onboarding/${id}/complete`);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this task"));
    } finally {
      setCompletingId(null);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Onboarding Checklist</h1>
      <div className="card">
        {error && <p className="error-text">{error}</p>}
        <table>
          <thead>
            <tr><th></th><th>Task</th><th>Due</th><th>Status</th></tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => !t.completed && complete(t.id)}
                    disabled={t.completed || completingId === t.id}
                  />
                </td>
                <td>{t.title}</td>
                <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</td>
                <td>{t.completed ? <span className="badge APPROVED">Done</span> : <span className="badge PENDING">Pending</span>}</td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan={4}>No onboarding tasks assigned.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
