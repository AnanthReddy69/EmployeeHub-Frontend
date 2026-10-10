import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Activity, CalendarCheck, Clock3, Users } from "lucide-react";

const tooltipStyle = {
  contentStyle: {
    background: "#121a2c",
    border: "1px solid rgba(158,174,214,.2)",
    borderRadius: "10px",
    color: "#edf0ff",
    fontSize: "12px",
  },
  labelStyle: { color: "#a69aff" },
};

function MetricCard({ icon: Icon, title, value, caption }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{title}</span>
        <span className="stat-icon"><Icon size={18} /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{caption}</div>
    </article>
  );
}

export default function Analytics({
  employees = [],
  attendance = [],
  leaves = [],
  role = "EMPLOYEE",
}) {
  const isAdmin = ["HR", "MANAGER"].includes(String(role).toUpperCase());

  const pendingLeaves = leaves.filter(
    (item) => String(item.status || "").toUpperCase() === "PENDING"
  ).length;

  const approvedLeaves = leaves.filter(
    (item) => String(item.status || "").toUpperCase() === "APPROVED"
  ).length;

  const departmentCounts = useMemo(() => {
    const counts = {};

    employees.forEach((employee) => {
      const department = employee.department || "Unassigned";
      counts[department] = (counts[department] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [employees]);

  const attendanceByDate = useMemo(() => {
    const records = {};

    attendance.forEach((item) => {
      const date = item.workDate || item.date;
      if (!date) return;

      if (!records[date]) {
        records[date] = { date, present: 0, total: 0 };
      }

      records[date].total += 1;

      const status = String(item.status || "").toUpperCase();
      if (
        status.includes("PRESENT") ||
        item.checkIn ||
        item.checkInTime
      ) {
        records[date].present += 1;
      }
    });

    return Object.values(records)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)
      .map((item) => ({
        ...item,
        date: item.date.slice(5),
      }));
  }, [attendance]);

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="grid stats-grid">
        <MetricCard
          icon={Users}
          title={isAdmin ? "Total employees" : "Directory size"}
          value={employees.length}
          caption="Employee records available"
        />
        <MetricCard
          icon={CalendarCheck}
          title="Leave requests"
          value={leaves.length}
          caption={`${pendingLeaves} pending`}
        />
        <MetricCard
          icon={Activity}
          title="Approved leaves"
          value={approvedLeaves}
          caption="Approved requests"
        />
        <MetricCard
          icon={Clock3}
          title="Attendance records"
          value={attendance.length}
          caption="Records available to your account"
        />
      </div>

      <div className="grid two-col">
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Attendance activity</h2>
              <p>Recent recorded attendance</p>
            </div>
            <Activity size={19} color="#a69aff" />
          </div>

          {attendanceByDate.length > 0 ? (
            <div style={{ width: "100%", height: 270 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceByDate}>
                  <defs>
                    <linearGradient
                      id="attendanceGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#8975ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8975ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="rgba(158,174,214,.10)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#8d9ab5", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#8d9ab5", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present records"
                    stroke="#9582ff"
                    strokeWidth={2.5}
                    fill="url(#attendanceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              Attendance analytics will appear when records are available.
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Department distribution</h2>
              <p>Employees grouped by department</p>
            </div>
            <Users size={19} color="#a69aff" />
          </div>

          {departmentCounts.length > 0 ? (
            <div style={{ width: "100%", height: 270 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentCounts}
                  layout="vertical"
                  margin={{ left: 5, right: 12 }}
                >
                  <CartesianGrid
                    stroke="rgba(158,174,214,.10)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: "#8d9ab5", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={115}
                    tick={{ fill: "#aab5cc", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name="Employees"
                    fill="#8170ff"
                    radius={[0, 5, 5, 0]}
                    maxBarSize={23}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              Department analytics will appear when employee records are available.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}