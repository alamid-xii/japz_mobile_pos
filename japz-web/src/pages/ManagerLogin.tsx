import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function ManagerLogin() {
  const { user, login, loading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  if (isInitialized && user?.role === "admin")
    return <Navigate to="/admin/reservations" replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/admin/reservations", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }
  return (
    <section className="container page-section login-section">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back to Japz
      </Link>
      <form className="panel manager-login" onSubmit={submit}>
        <div className="empty-icon">
          <LockKeyhole size={26} />
        </div>
        <span className="eyebrow">JAPZ RESERVATION MANAGEMENT</span>
        <h1>Welcome back.</h1>
        <p className="panel-intro">
          Sign in with your Japz administrator account.
        </p>
        {error && (
          <div className="message error" role="alert">
            {error}
          </div>
        )}
        <label htmlFor="manager-email">Email address</label>
        <input
          id="manager-email"
          required
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="manager-password">Password</label>
        <div className="password-input">
          <input
            id="manager-password"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            maxLength={200}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button className="button" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
          <ArrowRight size={17} />
        </button>
        <Link to="/forgot-password" className="text-link">
          Forgot your password?
        </Link>
        <p className="field-hint">
          Booking a table?{" "}
          <Link to="/reserve">Make a reservation without an account.</Link>
        </p>
      </form>
    </section>
  );
}
