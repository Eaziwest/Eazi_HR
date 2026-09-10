import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatDuration(startIso, endIso) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function Attendance() {
  const { user } = useAuth();
  const isHR = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "MANAGER";
  const now = useLiveClock();

  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  function loadStatus() { api.get("/attendance/me/status").then((res) => setStatus(res.data)); }
  function loadHistory() { api.get("/attendance/me/history").then((res) => setHistory(res.data)); }
  function loadTeam() { if (isHR) api.get("/attendance/today").then((res) => setTeam(res.data)); }

  useEffect(() => { loadStatus(); loadHistory(); loadTeam(); }, []);

  async function clockIn() {
    setError("");
    setActing(true);
    try {
      await api.post("/attendance/clock-in");
      loadStatus();
      loadHistory();
      loadTeam();
    } catch (err) {
      setError(getErrorMessage(err, "Could not clock in"));
    } finally {
      setActing(false);
    }
  }

  async function clockOut() {
    setError("");
    setActing(true);
    try {
      await api.post("/attendance/clock-out");
      loadStatus();
      loadHistory();
      loadTeam();
    } catch (err) {
      setError(getErrorMessage(err, "Could not clock out"));
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <h1>Attendance</h1>

      <div className="card">
        <p className="clock-display">{now.toLocaleTimeString()}</p>
        <div className="clock-status">
          <span className={`clock-dot ${status?.clockedIn ? "on" : ""}`}></span>
          {status?.clockedIn
            ? `Clocked in since ${new Date(status.openEntry.clockIn).toLocaleTimeString()} (${formatDuration(status.openEntry.clockIn)})`
            : "Not clocked in"}
        </div>
        <div>
          {error && <p className="error-text">{error}</p>}
          {status?.clockedIn ? (
            <button onClick={clockOut} disabled={acting}>{acting ? "..." : "Clock out"}</button>
          ) : (
            <button onClick={clockIn} disabled={acting}>{acting ? "..." : "Clock in"}</button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>My recent activity</h3>
        <table>
          <thead><tr><th>Date</th><th>Clock in</th><th>Clock out</th><th>Duration</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.clockIn).toLocaleDateString()}</td>
                <td>{new Date(h.clockIn).toLocaleTimeString()}</td>
                <td>{h.clockOut ? new Date(h.clockOut).toLocaleTimeString() : "—"}</td>
                <td>{formatDuration(h.clockIn, h.clockOut)}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={4}>No attendance recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {isHR && (
        <div className="card">
          <h3>Team attendance today</h3>
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Clock in</th><th>Clock out</th><th>Duration</th></tr></thead>
            <tbody>
              {team.map((t) => (
                <tr key={t.id}>
                  <td>{t.user.firstName} {t.user.lastName}</td>
                  <td>{t.user.department?.name || "-"}</td>
                  <td>{new Date(t.clockIn).toLocaleTimeString()}</td>
                  <td>{t.clockOut ? new Date(t.clockOut).toLocaleTimeString() : <span className="badge PENDING">Active</span>}</td>
                  <td>{formatDuration(t.clockIn, t.clockOut)}</td>
                </tr>
              ))}
              {team.length === 0 && <tr><td colSpan={5}>No one has clocked in today yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
