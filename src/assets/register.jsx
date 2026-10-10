import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "./api";

const departments = [
  "Artificial Intelligence",
  "AI & Machine Intelligence",
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Human Resources",
  "Finance",
  "Marketing",
  "Operations",
];

const designations = ["EMPLOYEE", "HR", "MANAGER"];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/employees/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department,
        designation: form.designation,
        password: form.password,
      });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : "") ||
        "Registration failed. Check your details or try another email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-icon">EH</div>
          <div>
            <div className="brand-name">EmployeeHub</div>
            <div className="brand-caption">CREATE YOUR ACCOUNT</div>
          </div>
        </div>

        <h1>Join your workspace</h1>
        <p className="auth-description">
          Create your employee profile to get started.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" value={form.name}
                onChange={update} placeholder="Enter your full name" required />
            </div>

            <div className="form-group">
              <label htmlFor="email">Work email</label>
              <input id="email" name="email" type="email" value={form.email}
                onChange={update} placeholder="you@company.com" required />
            </div>

            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select id="department" name="department" value={form.department}
                onChange={update} required>
                <option value="" disabled>Select department</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="designation">Designation</label>
              <select id="designation" name="designation" value={form.designation}
                onChange={update} required>
                <option value="" disabled>Select designation</option>
                {designations.map((d) => (
                  <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-span">
              <label htmlFor="password">Password (minimum 8 characters)</label>
              <input id="password" name="password" type="password"
                autoComplete="new-password" minLength={8} value={form.password}
                onChange={update} placeholder="Create a secure password" required />
            </div>
          </div>

          <button className="btn btn-primary auth-button" disabled={loading}>
            {loading ? "Creating account..." : "Create employee account →"}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-note">
          Your requested designation does not grant privileges by itself.
          HR or manager access must be assigned by an authorized administrator.
        </p>
      </section>
    </main>
  );
}