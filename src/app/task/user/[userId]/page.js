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
const fmtDate = (iso) => {
  if (!iso) return "No date";
  const d = new Date(iso);
  const diff = Math.floor((d - new Date()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};
const isOverdue = (due, st) => st !== "completed" && st !== "cancelled" && due && new Date(due) < new Date();
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
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 22, alignItems: "center" }}>
      <div style={{ width: 180, height: 180, borderRadius: "50%", background: `conic-gradient(${gradient})`, display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px rgba(15,23,42,.06)" }}>
        <div style={{ width: 108, height: 108, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 8px 24px rgba(15,23,42,.08)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: completedRate >= 70 ? "#10b981" : completedRate >= 40 ? "#f59e0b" : "#ef4444" }}>{completedRate}%</div>
            <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 800 }}>Done</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {slices.map(([id, value]) => {
          const cfg = STATUS[id];
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.86rem", fontWeight: 800, color: "#374151" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color }} />
                {cfg.label}
              </span>
              <span style={{ fontSize: "0.86rem", fontWeight: 900, color: cfg.color }}>{value}</span>
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
    <div>
      <div style={{ display: "flex", gap: 6, background: "#f3f4f6", borderRadius: 9, padding: 4, marginBottom: 14 }}>
        {tabs.map(([id, label, count, color]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: "none", borderRadius: 7, padding: "8px 10px", background: tab === id ? "#fff" : "transparent", color: tab === id ? color : "#9ca3af", fontWeight: 900, cursor: "pointer", boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
            {label} ({count})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 26, fontWeight: 700 }}>No tasks in this section</div>
      ) : list.map(task => {
        const status = effectiveStatus(task);
        const cfg = STATUS[status] || STATUS.pending;
        const Icon = cfg.Icon;
        const overdue = isOverdue(task.dueDate, status);
        return (
          <div key={getTaskId(task)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 13px", border: `1px solid ${overdue ? "#fecaca" : "#e5e7eb"}`, borderRadius: 10, marginBottom: 8, background: overdue ? "#fff7f7" : "#fff" }}>
            <Icon size={16} color={cfg.color} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 850, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: ["completed", "cancelled"].includes(status) ? "line-through" : "none" }}>{task.title}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 3, color: overdue ? "#ef4444" : "#6b7280", fontSize: "0.76rem", fontWeight: 700 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FiCalendar size={12} /> {fmtDate(task.dueDate)}</span>
                {overdue && <span>Overdue</span>}
              </div>
            </div>
            <span style={{ color: cfg.color, background: cfg.bg, borderRadius: 999, padding: "4px 9px", fontSize: "0.72rem", fontWeight: 900 }}>{cfg.label}</span>
          </div>
        );
      })}
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
    <div style={{
      position: "fixed", top: 70, left: 88, right: 0, bottom: 0,
      overflowY: "auto",
      background: "linear-gradient(180deg, #f8fafc 0%, #eef7f6 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: "20px 24px",
    }}>
      <div style={{ width: "100%", maxWidth: 1480, margin: "0 auto" }}>
        <button onClick={() => router.back()} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 9, padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 8, color: "#374151", fontWeight: 850, cursor: "pointer", marginBottom: 14 }}>
          <FiArrowLeft size={16} /> Back
        </button>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 16px 40px rgba(15,23,42,.08)" }}>
          <div style={{ background: `linear-gradient(135deg, ${user.color}20, #ffffff)`, padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", borderBottom: "1px solid #eef2f7" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: user.color + "22", color: user.color, display: "grid", placeItems: "center", fontSize: "1.6rem", fontWeight: 950, border: `3px solid ${user.color}55` }}>{user.initial}</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.45rem", color: "#111827", fontWeight: 950 }}>{user.name}</h1>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, background: user.color + "18", color: user.color, padding: "4px 10px", borderRadius: 999, fontWeight: 850, fontSize: "0.78rem" }}><FiUser size={13} /> {roleLabel(user.role)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, padding: "16px 22px", borderBottom: "1px solid #eef2f7" }}>
            {[
              ["Total", userTasks.length, "#0d9488", "#ccfbf1"],
              ["Done", counts.completed, "#10b981", "#d1fae5"],
              ["Cancelled", counts.cancelled, "#6b7280", "#f3f4f6"],
              ["Late", overdueCount, "#ef4444", "#fee2e2"],
            ].map(([label, value, color, bg]) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 950, color }}>{value}</div>
                <div style={{ color: "#6b7280", fontSize: "0.74rem", fontWeight: 850 }}>{label}</div>
              </div>
            ))}
          </div>

           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 22, padding: 22, alignItems: "start" }}>
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 22, background: "#fbfdff", minWidth: 0 }}>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 900, textTransform: "uppercase", marginBottom: 16 }}>Task Progress</div>
              <PieChart counts={counts} total={userTasks.length} />
            </section>
            <section style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 900, textTransform: "uppercase", marginBottom: 12 }}>Assigned Tasks</div>
              <TaskTabs tasks={sortedTasks} effectiveStatus={effectiveStatus} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
