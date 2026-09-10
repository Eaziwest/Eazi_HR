import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="login-wrapper">
      <div className="card" style={{ width: 360, textAlign: "center" }}>
        <h2>Page not found</h2>
        <p style={{ color: "var(--text-dim)" }}>The page you're looking for doesn't exist or was moved.</p>
        <Link to="/"><button type="button" style={{ marginTop: 8 }}>Back to dashboard</button></Link>
      </div>
    </div>
  );
}
