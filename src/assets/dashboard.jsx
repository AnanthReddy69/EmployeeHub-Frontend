import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, Building2, CalendarDays, Check, ChevronRight,
  Clock3, LayoutDashboard, LogOut, Menu, Megaphone, Plus,
  RefreshCw, Search, ShieldCheck, Users, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import Analytics from "./Analytics";

const upper = (value) => String(value || "EMPLOYEE").toUpperCase();

function getToday() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function messageFrom(error) {
  return (
    error.response?.data?.message ||
    (typeof error.response?.data === "string" ? error.response.data : "") ||
    "The request failed. Check your connection and try again."
  );
}

function Badge({ children }) {
  const status = upper(children);
  let style = "badge-blue";

  if (["APPROVED", "PRESENT", "ACTIVE", "HR"].includes(status)) {
    style = "badge-green";
  } else if (["REJECTED", "ABSENT", "INACTIVE"].includes(status)) {
    style = "badge-red";
  } else if (["PENDING", "MANAGER", "IN PROGRESS"].includes(status)) {
    style = "badge-amber";
  }

  return <span className={`badge ${style}`}>{children || "—"}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal">
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [role, setRole] = useState(upper(localStorage.getItem("role")));
  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "Team member"
  );
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [page, setPage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    salary: "",
  });

  const [leaveForm, setLeaveForm] = useState({
    leaveType: "CASUAL",
    startDate: getToday(),
    endDate: getToday(),
    reason: "",
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
  });

  const isManager = role === "MANAGER";
  const isHR = role === "HR";
  const canManageEmployees = isManager || isHR;
  const canReviewLeaves = isManager || isHR;
  const canPublish = isManager || isHR;

  const logout = () => {
    ["token", "role", "userName", "email"].forEach((key) =>
      localStorage.removeItem(key)
    );
    navigate("/login", { replace: true });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const requests = [
      api.get("/employees"),
      api.get(canReviewLeaves ? "/attendance" : "/attendance/me"),
      api.get(canReviewLeaves ? "/leaves" : "/leaves/me"),
      api.get("/announcements"),
    ];

    const results = await Promise.allSettled(requests);

    const readList = (result, setter) => {
      if (result.status !== "fulfilled") {
        setter([]);
        return;
      }

      const data = result.value.data;
      setter(Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []);
    };

    readList(results[0], setEmployees);
    readList(results[1], setAttendance);
    readList(results[2], setLeaves);
    readList(results[3], setAnnouncements);

    if (results.every((result) => result.status === "rejected")) {
      setError("Could not load workspace data. Check the backend and your login session.");
    } else if (results.some((result) => result.status === "rejected")) {
      setError("Some dashboard information could not be loaded. Check your access permissions.");
    }

    setLoading(false);
  }, [canReviewLeaves]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    api.get("/employees/me")
      .then(({ data }) => {
        if (cancelled) return;

        if (data.name) {
          setUserName(data.name);
          localStorage.setItem("userName", data.name);
        }
        if (data.email) {
          setEmail(data.email);
          localStorage.setItem("email", data.email);
        }
        if (data.role) {
          setRole(upper(data.role));
          localStorage.setItem("role", upper(data.role));
        }
      })
      .catch(() => {
        // Keep profile details received at login if this endpoint is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const notify = (text) => {
    setSuccess(text);
    setError("");
    window.setTimeout(() => setSuccess(""), 3500);
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) =>
      [
        employee.name,
        employee.email,
        employee.department,
        employee.designation,
        employee.role,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [employees, search]);

  const pendingLeaves = leaves.filter(
    (item) => upper(item.status) === "PENDING"
  ).length;

  async function checkAttendance(action) {
    setError("");

    try {
      await api.post(`/attendance/${action}`);
      notify(action === "check-in" ? "Check-in recorded." : "Check-out recorded.");
      await loadData();
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  async function submitLeave(event) {
    event.preventDefault();

    if (leaveForm.endDate < leaveForm.startDate) {
      setError("The end date cannot be earlier than the start date.");
      return;
    }

    try {
      await api.post("/leaves", leaveForm);
      setModal("");
      setLeaveForm({
        leaveType: "CASUAL",
        startDate: getToday(),
        endDate: getToday(),
        reason: "",
      });
      notify("Leave request submitted.");
      await loadData();
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  async function reviewLeave(id, status) {
    try {
      await api.patch(`/leaves/${id}/decision`, { status });
      notify(`Leave request marked ${status.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  const openEdit = (employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      name: employee.name || "",
      email: employee.email || "",
      department: employee.department || "",
      designation: employee.designation || "",
      salary: employee.salary ?? "",
    });
    setModal("employee");
  };

  async function saveEmployee(event) {
    event.preventDefault();

    if (!selectedEmployee) return;

    const payload = {
      name: employeeForm.name.trim(),
      email: employeeForm.email.trim(),
      department: employeeForm.department,
      designation: employeeForm.designation,
    };

    if (employeeForm.salary !== "") {
      payload.salary = Number(employeeForm.salary);
    }

    try {
      await api.put(`/employees/${selectedEmployee.id}`, payload);
      setModal("");
      notify("Employee details updated.");
      await loadData();
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  async function deleteEmployee(employee) {
    if (!window.confirm(`Delete ${employee.name}? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/employees/${employee.id}`);
      notify("Employee deleted.");
      await loadData();
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  async function changeRole(employee, nextRole) {
    if (employee.email === email) {
      setError("You cannot change your own role.");
      return;
    }

    if (!window.confirm(`Change ${employee.name}'s role to ${nextRole}?`)) {
      return;
    }

    try {
      await api.patch(`/employees/${employee.id}/role`, { role: nextRole });
      notify("Employee role updated.");
      await loadData();
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  async function publishAnnouncement(event) {
    event.preventDefault();

    try {
      await api.post("/announcements", announcementForm);
      setModal("");
      setAnnouncementForm({ title: "", message: "" });
      notify("Announcement published.");
      await loadData();
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Employees", icon: Users },
    { label: "Attendance", icon: Clock3 },
    { label: "Leave Requests", icon: CalendarDays },
    { label: "Announcements", icon: Megaphone },
    ...(isManager ? [{ label: "Role Management", icon: ShieldCheck }] : []),
  ];

  const titleMap = {
    Overview: "Workspace overview",
    Employees: "Employee directory",
    Attendance: "Attendance management",
    "Leave Requests": "Leave management",
    Announcements: "Company announcements",
    "Role Management": "Access & role management",
  };

  function renderEmployeeTable() {
    return (
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>People in your workspace</h2>
            <p>Find colleagues and view team information</p>
          </div>
          <Badge>{employees.length} employees</Badge>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people or departments..."
            />
          </div>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                {(isHR || isManager) && <th>Salary</th>}
                {isManager && <th>Access role</th>}
                {canManageEmployees && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="person-cell">
                      <div className="avatar">
                        {(employee.name || "E").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="person-name">{employee.name}</div>
                        <div className="person-email">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{employee.department || "—"}</td>
                  <td>{employee.designation || "—"}</td>
                  {(isHR || isManager) && (
                    <td>
                      {employee.salary == null
                        ? "—"
                        : `₹${Number(employee.salary).toLocaleString("en-IN")}`}
                    </td>
                  )}
                  {isManager && <td><Badge>{employee.role || "EMPLOYEE"}</Badge></td>}
                  {canManageEmployees && (
                    <td>
                      <div className="action-row">
                        <button className="btn btn-secondary btn-small" onClick={() => openEdit(employee)}>
                          Edit
                        </button>
                        {isHR && (
                          <button className="btn btn-danger btn-small" onClick={() => deleteEmployee(employee)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!filteredEmployees.length && (
                <tr><td colSpan={7}><div className="empty-state">No employees found.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderAttendance() {
    return (
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>{canReviewLeaves ? "Team attendance" : "My attendance"}</h2>
            <p>Attendance history and check-in records</p>
          </div>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {!canReviewLeaves && (
          <div className="action-row" style={{ marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={() => checkAttendance("check-in")}>
              <Clock3 size={14} /> Check in
            </button>
            <button className="btn btn-secondary" onClick={() => checkAttendance("check-out")}>
              <Check size={14} /> Check out
            </button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr>
              {canReviewLeaves && <th>Employee</th>}
              <th>Date</th><th>Check in</th><th>Check out</th><th>Status</th>
            </tr></thead>
            <tbody>
              {attendance.map((item, index) => (
                <tr key={item.id || index}>
                  {canReviewLeaves && (
                    <td>{item.employeeName || item.employee?.name || item.email || "Employee"}</td>
                  )}
                  <td>{item.workDate || item.date || "—"}</td>
                  <td>{item.checkInTime || item.checkIn || "—"}</td>
                  <td>{item.checkOutTime || item.checkOut || "—"}</td>
                  <td><Badge>{item.status || "RECORDED"}</Badge></td>
                </tr>
              ))}
              {!attendance.length && (
                <tr><td colSpan={canReviewLeaves ? 5 : 4}><div className="empty-state">No attendance records available yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderLeaves() {
    return (
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>{canReviewLeaves ? "Team leave requests" : "My leave requests"}</h2>
            <p>Review request dates, reasons and approval status</p>
          </div>
          {!canReviewLeaves && (
            <button className="btn btn-primary" onClick={() => setModal("leave")}>
              <Plus size={14} /> Request leave
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr>
              {canReviewLeaves && <th>Employee</th>}
              <th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th>
              {canReviewLeaves && <th>Actions</th>}
            </tr></thead>
            <tbody>
              {leaves.map((leave, index) => (
                <tr key={leave.id || index}>
                  {canReviewLeaves && (
                    <td>{leave.employeeName || leave.employee?.name || leave.email || "Employee"}</td>
                  )}
                  <td>{leave.leaveType || leave.type || "Leave"}</td>
                  <td>{leave.startDate || "—"}</td>
                  <td>{leave.endDate || "—"}</td>
                  <td style={{ whiteSpace: "normal", minWidth: 120 }}>{leave.reason || "—"}</td>
                  <td><Badge>{leave.status || "PENDING"}</Badge></td>
                  {canReviewLeaves && (
                    <td><div className="action-row">
                      {upper(leave.status) === "PENDING" && <>
                        <button className="btn btn-primary btn-small" onClick={() => reviewLeave(leave.id, "APPROVED")}>Approve</button>
                        <button className="btn btn-danger btn-small" onClick={() => reviewLeave(leave.id, "REJECTED")}>Reject</button>
                      </>}
                    </div></td>
                  )}
                </tr>
              ))}
              {!leaves.length && (
                <tr><td colSpan={7}><div className="empty-state">No leave requests found.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderAnnouncements() {
    return (
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>Company updates</h2>
            <p>News and announcements for your workplace</p>
          </div>
          {canPublish && (
            <button className="btn btn-primary" onClick={() => setModal("announcement")}>
              <Plus size={14} /> New announcement
            </button>
          )}
        </div>

        {announcements.map((item, index) => (
          <article className="notice" key={item.id || index}>
            <h3>{item.title || "Company announcement"}</h3>
            <p>{item.message || item.content || ""}</p>
            <small>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : "EmployeeHub update"}
            </small>
          </article>
        ))}

        {!announcements.length && <div className="empty-state">No announcements yet.</div>}
      </section>
    );
  }

  function renderOverview() {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Welcome back, {userName.split(" ")[0]}.</h1>
            <p>Your workspace, team activity and important updates in one place.</p>
          </div>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="grid stats-grid">
          <div className="stat-card">
            <div className="stat-top"><span className="stat-label">Team members</span><span className="stat-icon"><Users size={18} /></span></div>
            <div className="stat-value">{employees.length}</div>
            <div className="stat-foot">Employee records available</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><span className="stat-label">Attendance records</span><span className="stat-icon"><Clock3 size={18} /></span></div>
            <div className="stat-value">{attendance.length}</div>
            <div className="stat-foot">Records available to you</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><span className="stat-label">Leave requests</span><span className="stat-icon"><CalendarDays size={18} /></span></div>
            <div className="stat-value">{leaves.length}</div>
            <div className="stat-foot">{pendingLeaves} pending requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-top"><span className="stat-label">Announcements</span><span className="stat-icon"><Megaphone size={18} /></span></div>
            <div className="stat-value">{announcements.length}</div>
            <div className="stat-foot">Workplace updates</div>
          </div>
        </div>

        <div className="grid two-col">
          <section className="card">
            <div className="card-heading">
              <div><h2>Quick actions</h2><p>Shortcuts for your workday</p></div>
              <Activity size={19} color="#a69aff" />
            </div>

            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => checkAttendance("check-in")}><Clock3 size={14} /> Check in</button>
              <button className="btn btn-secondary" onClick={() => checkAttendance("check-out")}><Check size={14} /> Check out</button>
              <button className="btn btn-secondary" onClick={() => { setPage("Leave Requests"); if (!canReviewLeaves) setModal("leave"); }}><CalendarDays size={14} /> Leave requests</button>
              <button className="btn btn-secondary" onClick={() => setPage("Announcements")}><Bell size={14} /> Announcements</button>
            </div>

            <div className="card-heading" style={{ marginTop: 27 }}>
              <div><h2>Latest announcements</h2><p>Recent workplace updates</p></div>
              <button className="btn btn-secondary btn-small" onClick={() => setPage("Announcements")}>View all <ChevronRight size={13} /></button>
            </div>

            {announcements.slice(0, 3).map((item, index) => (
              <article className="notice" key={item.id || index}>
                <h3>{item.title}</h3><p>{item.message || item.content}</p>
              </article>
            ))}
            {!announcements.length && <div className="empty-state">New announcements will appear here.</div>}
          </section>

          <section className="card">
            <div className="card-heading">
              <div><h2>Workspace profile</h2><p>Your account overview</p></div>
              <Building2 size={19} color="#a69aff" />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 25 }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 17 }}>{userName.slice(0, 1).toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{userName}</div>
                <div style={{ color: "#929db7", fontSize: 11, marginTop: 5, overflowWrap: "anywhere" }}>{email || "Signed-in account"}</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="stat-label">Access level</div>
              <div style={{ marginTop: 9 }}><Badge>{role}</Badge></div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="stat-label">Today's date</div>
              <div style={{ marginTop: 8, fontWeight: 600, fontSize: 12 }}>
                {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

            {canReviewLeaves && (
              <div>
                <div className="stat-label">Pending leave approvals</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{pendingLeaves}</div>
              </div>
            )}
          </section>
        </div>

        <div style={{ marginTop: 22 }}>
          <Analytics employees={employees} attendance={attendance} leaves={leaves} role={role} />
        </div>
      </>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">EH</div>
          <div>
            <div className="brand-name">EmployeeHub</div>
            <div className="brand-caption">PEOPLE & WORKPLACE</div>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => {
                setPage(label);
                setMobileOpen(false);
                setError("");
              }}
            >
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">{userName.slice(0, 1).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div className="profile-name">{userName}</div>
              <div className="profile-role">{role.toLowerCase()}</div>
            </div>
          </div>
          <button className="nav-item" onClick={logout}><LogOut size={17} /> Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
              <Menu size={18} />
            </button>
            <div>
              <div className="topbar-title">{titleMap[page] || page}</div>
              <div className="topbar-subtitle">EmployeeHub / {page}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={loadData} title="Refresh"><RefreshCw size={16} /></button>
            <div className="avatar">{userName.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          {error && <div className="error-banner">{error} <button className="btn btn-secondary btn-small" onClick={() => setError("")}>Dismiss</button></div>}
          {success && <div className="success-banner">{success}</div>}

          {loading ? (
            <div className="loading">Loading your workspace…</div>
          ) : (
            <>
              {page === "Overview" && renderOverview()}
              {page === "Employees" && renderEmployeeTable()}
              {page === "Attendance" && renderAttendance()}
              {page === "Leave Requests" && renderLeaves()}
              {page === "Announcements" && renderAnnouncements()}

              {page === "Role Management" && isManager && (
                <section className="card">
                  <div className="card-heading">
                    <div><h2>Employee access control</h2><p>Assign the appropriate access level for each team member.</p></div>
                    <ShieldCheck size={20} color="#a69aff" />
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Employee</th><th>Department</th><th>Current role</th><th>Change role</th></tr></thead>
                      <tbody>
                        {employees.map((employee) => (
                          <tr key={employee.id}>
                            <td><div className="person-name">{employee.name}</div><div className="person-email">{employee.email}</div></td>
                            <td>{employee.department || "—"}</td>
                            <td><Badge>{employee.role || "EMPLOYEE"}</Badge></td>
                            <td>
                              <select
                                className="input"
                                style={{ width: 145 }}
                                value={upper(employee.role)}
                                disabled={employee.email === email}
                                onChange={(event) => changeRole(employee, event.target.value)}
                              >
                                <option value="EMPLOYEE">Employee</option>
                                <option value="HR">HR</option>
                                <option value="MANAGER">Manager</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {modal === "leave" && (
        <Modal title="Request leave" onClose={() => setModal("")}>
          <form onSubmit={submitLeave}>
            <div className="form-group">
              <label>Leave type</label>
              <select value={leaveForm.leaveType} onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}>
                <option value="CASUAL">Casual leave</option>
                <option value="SICK">Sick leave</option>
                <option value="PERSONAL">Personal leave</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group"><label>Start date</label><input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required /></div>
              <div className="form-group"><label>End date</label><input type="date" min={leaveForm.startDate} value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required /></div>
            </div>
            <div className="form-group"><label>Reason</label><textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Briefly explain your request" required /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal("")}>Cancel</button>
              <button className="btn btn-primary">Submit request</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "employee" && (
        <Modal title="Edit employee details" onClose={() => setModal("")}>
          <form onSubmit={saveEmployee}>
            <div className="form-group"><label>Full name</label><input value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} required /></div>
            <div className="form-grid">
              <div className="form-group"><label>Department</label><input value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} required /></div>
              <div className="form-group"><label>Designation</label><input value={employeeForm.designation} onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })} required /></div>
            </div>
            {(isHR || isManager) && <div className="form-group"><label>Salary (₹)</label><input type="number" min="0" value={employeeForm.salary} onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })} /></div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal("")}>Cancel</button>
              <button className="btn btn-primary">Save changes</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "announcement" && (
        <Modal title="Publish announcement" onClose={() => setModal("")}>
          <form onSubmit={publishAnnouncement}>
            <div className="form-group"><label>Announcement title</label><input value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} required /></div>
            <div className="form-group"><label>Message</label><textarea value={announcementForm.message} onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })} required /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal("")}>Cancel</button>
              <button className="btn btn-primary">Publish</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}