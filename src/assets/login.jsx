import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail } from "lucide-react";
import api from "./api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/employees/login", form);
      const token = data.token || data.accessToken || data.jwt;
      if (!token) throw new Error("The server did not return a login token.");

      localStorage.setItem("token", token);

      if (data.role) localStorage.setItem("role", String(data.role).toUpperCase());
      if (data.name) localStorage.setItem("userName", data.name);
      if (data.email || form.email) {
        localStorage.setItem("email", data.email || form.email);
      }

      // Use the role returned by the backend; the backend remains authoritative.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : "") ||
        err.message ||
        "Unable to sign in. Check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-icon">EH</div>
          <div>
            <div className="brand-name">EmployeeHub</div>
            <div className="brand-caption">YOUR WORKPLACE, CONNECTED</div>
          </div>
        </div>

        <h1>Welcome back</h1>
        <p className="auth-description">
          Sign in to access your workspace and manage your workday.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Work email</label>
            <div style={{ position: "relative" }}>
              <Mail size={17} style={{ position: "absolute", left: 13, top: 14, color: "#7d899b" }} />
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                style={{ paddingLeft: 40 }}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <LockKeyhole size={17} style={{ position: "absolute", left: 13, top: 14, color: "#7d899b" }} />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                style={{ paddingLeft: 40 }}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>

          <button className="btn btn-primary auth-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to EmployeeHub →"}
          </button>
        </form>

        <p className="auth-footer">
          New to EmployeeHub? <Link to="/register">Create an account</Link>
        </p>
        <p className="auth-note">
          Your account access is managed securely by your organization.
        </p>
      </section>
    </main>
  );
}