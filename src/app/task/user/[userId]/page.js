"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiSlash, FiUser } from "react-icons/fi";
import API from "../../../utils/api";

const PALETTE = ["#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
const STATUS = {
  pending: { label: "Pending", color: "#6b7280", bg: "#f3f4f6", Icon: FiClock },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "#eff6ff", Icon: FiClock },
  completed: { label: "Completed", color: "#10b981", bg: "#d1fae5", Icon: FiCheckCircle },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "#f3f4f6", Icon: FiSlash },
};

const userColor = (id = "") => PALETTE[parseInt(("0000" + id).slice(-4), 16) % PALETTE.length];
const userInitial = (name = "") => (name || "?").trim().charAt(0).toUpperCase();
const enrichUser = (u) => {
  if (!u) return null;
  const id = u._id?.toString?.() || u.id || "";
  return { ...u, id, initial: userInitial(u.name), color: userColor(id) };
};
const roleLabel = (role) => role === "super_admin" ? "Admin" : role === "manager" ? "Manager" : "User";
const startOfLocalDay = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const fmtDate = (iso) => {
  if (!iso) return "No date";
  const d = new Date(iso);
  const diff = Math.round((startOfLocalDay(d) - startOfLocalDay()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};
const isOverdue = (due, st) => st !== "completed" && st !== "cancelled" && due && startOfLocalDay(due) < startOfLocalDay();
const getUserId = (u) => (u?._id || u?.id || u)?.toString();
const getTaskId = (t) => (t?._id || t?.id)?.toString();

function PieChart({ counts, total }) {
  const slices = [
    ["completed", counts.completed || 0],
    ["in_progress", counts.in_progress || 0],
    ["pending", counts.pending || 0],
    ["cancelled", counts.cancelled || 0],
  ];
  let cursor = 0;
  const gradient = total
    ? slices.map(([id, value]) => {
      const start = cursor;
      cursor += (value / total) * 100;
      return `${STATUS[id].color} ${start}% ${cursor}%`;
    }).join(", ")
    : "#e5e7eb 0% 100%";
  const completedRate = total ? Math.round(((counts.completed || 0) / total) * 100) : 0;

  return (
    <div className="task-user-progress-chart" style={{ flex: 1, display: "grid", gridTemplateColumns: "156px 1fr", gap: 22, alignItems: "center", minHeight: 0 }}>
      <div className="task-user-progress-ring" style={{ width: 156, height: 156, borderRadius: "50%", background: `conic-gradient(${gradient})`, display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px rgba(15,23,42,.06)" }}>
        <div className="task-user-progress-center" style={{ width: 92, height: 92, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 8px 24px rgba(15,23,42,.08)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.55rem", fontWeight: 900, color: completedRate >= 70 ? "#10b981" : completedRate >= 40 ? "#f59e0b" : "#ef4444", lineHeight: 1 }}>{completedRate}%</div>
            <div className="task-user-muted" style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 800, marginTop: 4 }}>Done</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
        {slices.map(([id, value]) => {
          const cfg = STATUS[id];
          return (
            <div className="task-user-progress-legend-row" key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.84rem", fontWeight: 800, color: "#374151", minWidth: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                {cfg.label}
              </span>
              <span style={{ fontSize: "0.84rem", fontWeight: 900, color: cfg.color }}>{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskTabs({ tasks, effectiveStatus }) {
  const [tab, setTab] = useState("active");

  const completed = tasks.filter(t => effectiveStatus(t) === "completed");
  const cancelled = tasks.filter(t => effectiveStatus(t) === "cancelled");
  const active = tasks.filter(t => !["completed", "cancelled"].includes(effectiveStatus(t)));

  const tabs = [
    ["active", "Active", active.length, "#3b82f6"],
    ["completed", "Completed", completed.length, "#10b981"],
    ["cancelled", "Cancelled", cancelled.length, "#6b7280"],
  ];

  const list = tab === "completed" ? completed : tab === "cancelled" ? cancelled : active;

  return (
    <div
      className="task-user-tabs-wrap"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        className="task-user-tabs"
        style={{
          display: "flex",
          gap: 6,
          background: "#f3f4f6",
          borderRadius: 9,
          padding: 4,
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        {tabs.map(([id, label, count, color]) => (
          <button
            className={`task-user-tab-button ${tab === id ? "active" : ""}`}
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 7,
              padding: "8px 10px",
              background: tab === id ? "#fff" : "transparent",
              color: tab === id ? color : "#9ca3af",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
            }}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div
        className="task-user-task-list"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {list.length === 0 ? (
          <div
            className="task-user-empty"
            style={{
              textAlign: "center",
              color: "#9ca3af",
              padding: 26,
              fontWeight: 700,
            }}
          >
            No tasks in this section
          </div>
        ) : list.map(task => {
          const status = effectiveStatus(task);
          const cfg = STATUS[status] || STATUS.pending;
          const Icon = cfg.Icon;
          const overdue = isOverdue(task.dueDate, status);

          return (
            <div
              className={`task-user-task-row ${overdue ? "overdue" : ""}`}
              key={getTaskId(task)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 13px",
                border: `1px solid ${overdue ? "#fecaca" : "#e5e7eb"}`,
                borderRadius: 10,
                marginBottom: 8,
                background: overdue ? "#fff7f7" : "#fff",
              }}
            >
              <Icon size={16} color={cfg.color} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="task-user-task-title"
                  style={{
                    fontWeight: 850,
                    color: "#111827",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: ["completed", "cancelled"].includes(status) ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </div>

                <div
                  className="task-user-task-meta"
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 3,
                    color: overdue ? "#ef4444" : "#6b7280",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <FiCalendar size={12} /> {fmtDate(task.dueDate)}
                  </span>
                  {overdue && <span>Overdue</span>}
                </div>
              </div>

              <span
                className="task-user-status-badge"
                style={{
                  color: cfg.color,
                  background: cfg.bg,
                  borderRadius: 999,
                  padding: "4px 9px",
                  fontSize: "0.72rem",
                  fontWeight: 900,
                }}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default function TaskUserDetailPage() {
  const { userId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedTaskId = searchParams.get("taskId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, tasksRes, statusRes] = await Promise.all([
          API.get("/users"),
          API.get("/tasks"),
          API.get("/tasks/user-statuses"),
        ]);
        if (usersRes.data.success) setUsers(usersRes.data.data.map(enrichUser));
        if (tasksRes.data.success) setTasks(tasksRes.data.data);
        if (statusRes.data.success) setStatuses(statusRes.data.data);
      } catch {
        setError("Failed to load user task details.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const user = useMemo(() => {
    const fromUsers = users.find(u => u.id === userId);
    if (fromUsers) return fromUsers;
    for (const task of tasks) {
      const match = (task.assignedTo || []).map(enrichUser).find(u => u?.id === userId);
      if (match) return match;
    }
    return null;
  }, [users, tasks, userId]);

  const userTasks = useMemo(() => tasks.filter(t => (t.assignedTo || []).some(a => getUserId(a) === userId)), [tasks, userId]);
  const effectiveStatus = (task) => {
    const taskId = getTaskId(task);
    const rec = statuses.find(uts => uts.userId?.toString() === userId?.toString() && uts.taskId?.toString() === taskId);
    return rec ? rec.status : task.status;
  };
  const sortedTasks = useMemo(() => {
    return [...userTasks].sort((a, b) => {
      if (getTaskId(a) === highlightedTaskId) return -1;
      if (getTaskId(b) === highlightedTaskId) return 1;
      return new Date(a.dueDate || "9999") - new Date(b.dueDate || "9999");
    });
  }, [userTasks, highlightedTaskId]);
  const counts = userTasks.reduce((acc, task) => {
    const status = effectiveStatus(task);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { pending: 0, in_progress: 0, completed: 0, cancelled: 0 });
  const overdueCount = userTasks.filter(t => isOverdue(t.dueDate, effectiveStatus(t))).length;

  if (loading) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#6b7280", fontWeight: 800 }}>Loading user details...</div>;
  if (error || !user) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#ef4444", fontWeight: 800 }}>{error || "User not found"}</div>;

  
   return (
    <div className="task-user-detail-page" style={{
      position: "fixed", top: 70, left: 88, right: 0, bottom: 0,
      overflow: "hidden",
      background: "linear-gradient(180deg, #f8fafc 0%, #eef7f6 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: "12px 20px",
    }}>
      <style>{`
        body[data-theme="dark"] .task-user-detail-page {
          background: linear-gradient(180deg, #0b141a 0%, #101b22 100%) !important;
          color: #e9edef;
        }
        body[data-theme="dark"] .task-user-back,
        body[data-theme="dark"] .task-user-card,
        body[data-theme="dark"] .task-user-panel {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
          box-shadow: 0 18px 42px rgba(0, 0, 0, .26) !important;
        }
        body[data-theme="dark"] .task-user-back:hover {
          background: #1f2c33 !important;
        }
        body[data-theme="dark"] .task-user-hero {
          background: linear-gradient(135deg, rgba(99, 102, 241, .18), #17232a) !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-user-avatar {
          background: rgba(99, 102, 241, .18) !important;
          border-color: rgba(129, 140, 248, .52) !important;
        }
        body[data-theme="dark"] .task-user-name,
        body[data-theme="dark"] .task-user-task-title {
          color: #f8fafc !important;
        }
        body[data-theme="dark"] .task-user-role {
          background: rgba(99, 102, 241, .18) !important;
        }
        body[data-theme="dark"] .task-user-stats,
        body[data-theme="dark"] .task-user-content-grid {
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-user-stat-card {
          background: #17232a !important;
          border: 1px solid #2a3942;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .03);
        }
        body[data-theme="dark"] .task-user-stat-card.total {
          background: rgba(20, 184, 166, .14) !important;
        }
        body[data-theme="dark"] .task-user-stat-card.done {
          background: rgba(16, 185, 129, .13) !important;
        }
        body[data-theme="dark"] .task-user-stat-card.cancelled {
          background: rgba(148, 163, 184, .12) !important;
        }
        body[data-theme="dark"] .task-user-stat-card.late {
          background: rgba(239, 68, 68, .13) !important;
        }
        body[data-theme="dark"] .task-user-muted,
        body[data-theme="dark"] .task-user-section-title,
        body[data-theme="dark"] .task-user-empty {
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-user-progress-center {
          background: #0b141a !important;
          box-shadow: inset 0 0 0 1px #2a3942, 0 12px 28px rgba(0, 0, 0, .28) !important;
        }
        body[data-theme="dark"] .task-user-progress-ring {
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .06) !important;
        }
        body[data-theme="dark"] .task-user-progress-legend-row span {
          color: #d7e2e8 !important;
        }
        body[data-theme="dark"] .task-user-tabs {
          background: #202c33 !important;
          border: 1px solid #2a3942;
        }
        body[data-theme="dark"] .task-user-tab-button {
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-user-tab-button.active {
          background: #0b141a !important;
          box-shadow: 0 1px 0 rgba(255, 255, 255, .04), 0 8px 18px rgba(0, 0, 0, .18) !important;
        }
        body[data-theme="dark"] .task-user-task-row {
          background: #17232a !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-user-task-row.overdue {
          background: rgba(239, 68, 68, .10) !important;
          border-color: rgba(248, 113, 113, .36) !important;
        }
        body[data-theme="dark"] .task-user-task-meta {
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-user-task-row.overdue .task-user-task-meta {
          color: #ff8f8f !important;
        }
        body[data-theme="dark"] .task-user-status-badge {
          background: #202c33 !important;
          border: 1px solid rgba(255, 255, 255, .06);
        }
        @media (max-width: 760px) {
          .task-user-detail-page {
            left: 0 !important;
            padding: 16px !important;
          }
          .task-user-workspace {
            grid-template-columns: 1fr !important;
            overflow-y: auto !important;
          }
          .task-user-progress-chart {
            grid-template-columns: 1fr !important;
            justify-items: center;
          }
          .task-user-progress-legend-row {
            width: 100%;
          }
        }
      `}</style>
      <div style={{ width: "100%", maxWidth: 1480, height: "100%", margin: "0 auto", display: "flex", flexDirection: "column" }}>
        <button className="task-user-back" onClick={() => router.back()} style={{ width: "fit-content", alignSelf: "flex-start", flexShrink: 0, border: "1px solid #d1d5db", background: "#fff", borderRadius: 9, padding: "7px 11px", display: "inline-flex", alignItems: "center", gap: 8, color: "#374151", fontWeight: 850, cursor: "pointer", marginBottom: 10 }}>
          <FiArrowLeft size={16} /> Back
        </button>

        <div className="task-user-card" style={{ flex: 1, minHeight: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 16px 40px rgba(15,23,42,.08)", display: "flex", flexDirection: "column" }}>
          <div className="task-user-hero" style={{ flexShrink: 0, background: `linear-gradient(135deg, ${user.color}20, #ffffff)`, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", borderBottom: "1px solid #eef2f7" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="task-user-avatar" style={{ width: 56, height: 56, borderRadius: "50%", background: user.color + "22", color: user.color, display: "grid", placeItems: "center", fontSize: "1.45rem", fontWeight: 950, border: `3px solid ${user.color}55` }}>{user.initial}</div>
              <div>
                <h1 className="task-user-name" style={{ margin: 0, fontSize: "1.32rem", color: "#111827", fontWeight: 950 }}>{user.name}</h1>
                <span className="task-user-role" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, background: user.color + "18", color: user.color, padding: "4px 10px", borderRadius: 999, fontWeight: 850, fontSize: "0.78rem" }}><FiUser size={13} /> {roleLabel(user.role)}</span>
              </div>
            </div>
          </div>

          <div className="task-user-workspace task-user-content-grid" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18, padding: 18, alignItems: "stretch", overflow: "hidden", borderTop: "1px solid #eef2f7" }}>
            <div style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="task-user-stats" style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {[
                  ["Total", userTasks.length, "#0d9488", "#ccfbf1"],
                  ["Done", counts.completed, "#10b981", "#d1fae5"],
                  ["Cancelled", counts.cancelled, "#6b7280", "#f3f4f6"],
                  ["Late", overdueCount, "#ef4444", "#fee2e2"],
                ].map(([label, value, color, bg]) => (
                  <div className={`task-user-stat-card ${label.toLowerCase()}`} key={label} style={{ background: bg, borderRadius: 10, padding: "11px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.55rem", fontWeight: 950, color, lineHeight: 1.05 }}>{value}</div>
                    <div className="task-user-muted" style={{ color: "#6b7280", fontSize: "0.74rem", fontWeight: 850 }}>{label}</div>
                  </div>
                ))}
              </div>

            <section className="task-user-panel" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fbfdff", minWidth: 0, minHeight: 0, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="task-user-section-title" style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 900, textTransform: "uppercase", marginBottom: 10 }}>Task Progress</div>
              <PieChart counts={counts} total={userTasks.length} />
            </section>
            </div>

            <section style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div className="task-user-section-title" style={{ flexShrink: 0, fontSize: "0.78rem", color: "#6b7280", fontWeight: 900, textTransform: "uppercase", marginBottom: 12 }}>Assigned Tasks</div>
              <TaskTabs tasks={sortedTasks} effectiveStatus={effectiveStatus} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
