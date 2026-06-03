"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FiSearch, FiSend, FiPlus, FiX, FiBell,
  FiTrash2, FiLink, FiPhone, FiChevronRight, FiMinus,
  FiCalendar, FiShield, FiUsers, FiUser, FiEdit2,
  FiPaperclip, FiMic, FiFile, FiImage, FiVideo, FiDownload,
  FiAlertTriangle, FiClock, FiMessageSquare, FiList,
  FiPlay, FiPause,
} from "react-icons/fi";
import API from "../utils/api";
import { getSocket } from "../lib/socket";

/* ---------- helpers ---------- */
const PALETTE = ["#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
const userColor = (id = "") => PALETTE[parseInt(("0000" + id).slice(-4), 16) % PALETTE.length];
const userInitial = (name = "") => (name || "?").trim().charAt(0).toUpperCase();
const enrichUser = (u) => {
  if (!u) return null;
  const id = u._id?.toString?.() || u.id || "";
  return { ...u, id, initial: userInitial(u.name), color: userColor(id) };
};
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};
const attachmentUrl = (file = {}) => file.fileUrl || file.url || "";
const attachmentName = (file = {}) => file.fileName || file.filename || "Attachment";
const attachmentType = (file = {}) => {
  if (file.messageType) return file.messageType;
  const mime = file.mimetype || file.mimeType || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
};
const isPdfAttachment = (file = {}) => {
  const name = attachmentName(file).toLowerCase();
  return (file.mimetype || file.mimeType) === "application/pdf" || name.endsWith(".pdf");
};
const downloadAttachment = async (file) => {
  const url = attachmentUrl(file);
  const name = attachmentName(file);
  if (!url) return;

  try {
    const res = await API.post("/upload/download", { url, fileName: name }, { responseType: "blob" });
    const blob = res.data;
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
const uploadTaskFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await API.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const data = res.data || {};
  const messageType = data.messageType ||
    (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "file");
  return {
    url: data.fileUrl,
    fileUrl: data.fileUrl,
    filename: data.fileName || file.name,
    fileName: data.fileName || file.name,
    fileSize: data.fileSize || file.size,
    mimetype: file.type,
    messageType,
  };
};

const PRIORITY = {
  low: { label: "Low", color: "#10b981", bg: "#d1fae5" },
  medium: { label: "Medium", color: "#f59e0b", bg: "#fef3c7" },
  high: { label: "High", color: "#ef4444", bg: "#fee2e2" },
};

const STATUS = {
  pending: { label: "Pending", color: "#6b7280", bg: "#f3f4f6", icon: "⏳" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "#eff6ff", icon: "🔄" },
  completed: { label: "Completed", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "#f3f4f6", icon: "❌" },
};
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER = { in_progress: 0, pending: 1, completed: 2 };

const isAdmin = (u) => u?.role === "super_admin";
const isManager = (u) => u?.role === "manager";
const isUser = (u) => u?.role === "user";

const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const toDateInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toDateTimeInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "â€”";
  const today = new Date();
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((targetDay - todayDay) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};
const isOverdue = (due, st) => {
  if (["completed", "cancelled"].includes(st) || !due) return false;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return false;
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return targetDay < todayDay;
};

/* ---------- Avatar ---------- */
function Avatar({ user, size = 32, onClick }) {
  if (!user) return null;
  const u = enrichUser(user);
  return (
    <div onClick={onClick} title={u.name}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: u.color + "22", color: u.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
        border: `2px solid ${u.color}44`,
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = `0 0 0 3px ${u.color}44`; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {u.initial}
    </div>
  );
}

/* ---------- StatusPill ---------- */
/* ---------- StatusPill ---------- */
let _activePillSetter = null; // global tracker

function StatusPill({ status, onChange, readonly }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({});
  const btnRef = useRef(null);
  const cfg = STATUS[status] || STATUS.pending;

  // Register this pill as the active one; close all others
  const handleOpen = (e) => {
    if (readonly) return;
    if (!open) {
      // Close any other open pill
      if (_activePillSetter && _activePillSetter !== setOpen) {
        _activePillSetter(false);
      }
      _activePillSetter = setOpen;

      // Smart positioning: open upward if near bottom of viewport
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const shouldDropUp = spaceBelow < 180; // 180px = approx dropdown height
        setMenuPos(shouldDropUp
          ? { bottom: window.innerHeight - rect.top + 4, left: rect.left }
          : { top: rect.bottom + 4, left: rect.left }
        );
      }
    } else {
      if (_activePillSetter === setOpen) _activePillSetter = null;
    }
    setOpen(p => !p);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.closest('[data-status-pill]')?.contains(e.target)) {
        setOpen(false);
        if (_activePillSetter === setOpen) _activePillSetter = null;
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div data-status-pill="" style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 20,
          border: `1.5px solid ${cfg.color}30`,
          background: cfg.bg, cursor: readonly ? "default" : "pointer",
          fontSize: "0.72rem", fontWeight: 700, color: cfg.color,
          whiteSpace: "nowrap",
        }}>
        {cfg.icon} {cfg.label} {!readonly && <span style={{ fontSize: "0.55rem" }}>▼</span>}
      </button>
      {open && (
        <div style={{
          position: "fixed", // use fixed so it escapes table overflow
          background: "#fff", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          border: "1px solid #e5e7eb",
          overflow: "hidden", zIndex: 9999, minWidth: 160,
          ...menuPos,
        }}>
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} onClick={() => { onChange(k); setOpen(false); if (_activePillSetter === setOpen) _activePillSetter = null; }}
              style={{
                padding: "9px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                fontSize: "0.82rem", fontWeight: 600, color: v.color,
                background: k === status ? v.bg : "#fff",
              }}
              onMouseEnter={e => e.currentTarget.style.background = v.bg}
              onMouseLeave={e => e.currentTarget.style.background = k === status ? v.bg : "#fff"}>
              {v.icon} {v.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserStatusTrail({ status }) {
  const steps = [
    { id: "pending",     label: "Pending" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed",   label: "Completed" },
    { id: "cancelled",   label: "Cancelled" },
  ];

  const activeIndex = steps.findIndex(s => s.id === status);
  const isCancelled = status === "cancelled";
  const trackColor  = isCancelled ? "#9ca3af" : "#0d9488";

  return (
    <div className="task-status-trail" style={{ width: 260, flexShrink: 0, position: "relative", padding: "6px 0 22px" }}>
      {/* base track */}
      <div className="task-status-trail-base" style={{
        position: "absolute", left: 9, right: 9, top: 15,
        height: 2, background: "#e5e7eb", borderRadius: 999,
      }} />
      {/* filled track */}
      <div className="task-status-trail-fill" style={{
        position: "absolute", left: 9, top: 15,
        height: 2, borderRadius: 999,
        background: trackColor,
        width: activeIndex === 0 ? 0
          : `calc(${(activeIndex / (steps.length - 1)) * 100}% - ${
              activeIndex === steps.length - 1 ? 18 : 6
            }px)`,
      }} />
      {/* dots */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        position: "relative", zIndex: 2,
      }}>
        {steps.map(({ id, label }, index) => {
          const isDone      = !isCancelled && index < activeIndex;
          const isActive    = id === status;
          const isCancelDot = isCancelled && id === "cancelled";

          let bg     = "#f3f4f6";
          let border = "1.5px solid #d1d5db";
          let color  = "transparent";

          if (isDone || isCancelDot) {
            bg     = isCancelDot ? "#9ca3af" : trackColor;
            border = `2px solid ${isCancelDot ? "#9ca3af" : trackColor}`;
            color  = "#fff";
          } else if (isActive && !isCancelled) {
            bg     = "#fff";
            border = `2px solid ${trackColor}`;
          }

          return (
            <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div className={`task-status-dot ${isDone || isCancelDot ? "done" : ""} ${isActive && !isCancelled ? "active" : ""}`} style={{
                width: 20, height: 20, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: bg, border, boxSizing: "border-box",
                fontSize: 10, color,
              }}>
                {isDone && "✓"}
                {isCancelDot && "✕"}
                {isActive && !isCancelled && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: trackColor }} />
                )}
              </div>
              <span className={`task-status-label ${isActive ? "active" : ""}`} style={{
                fontSize: 10, whiteSpace: "nowrap",
                color: isActive
                  ? trackColor
                  : isDone
                  ? "#6b7280"
                  : isCancelled
                  ? "#9ca3af"
                  : "#9ca3af",
                fontWeight: isActive ? 600 : 400,
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApprovalBadge({ compact = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: compact ? "2px 7px" : "3px 10px", borderRadius: 20,
      background: "#fef3c7", border: "1.5px solid #fcd34d44",
      fontSize: compact ? "0.65rem" : "0.72rem", fontWeight: 700, color: "#92400e",
      whiteSpace: "nowrap",
    }}>🕐 Pending Approval</span>
  );
}

/* ---------- UserDetailModal (unchanged) ---------- */
function UserDetailModal({ user, allTasks, currentUser, userTaskStatuses, onClose }) {
  const u = enrichUser(user);
  if (!u) return null;
  const userTasks = allTasks.filter(t => t.assignedTo?.some(a => (a._id || a.id || a)?.toString() === u.id));
  const effectiveStatus = (task) => {
    const rec = userTaskStatuses.find(uts => uts.userId.toString() === u.id && uts.taskId.toString() === (task._id || task.id).toString());
    return rec ? rec.status : task.status;
  };
  const byStatus = {
    pending: userTasks.filter(t => effectiveStatus(t) === "pending").length,
    in_progress: userTasks.filter(t => effectiveStatus(t) === "in_progress").length,
    completed: userTasks.filter(t => effectiveStatus(t) === "completed").length,
    cancelled: userTasks.filter(t => effectiveStatus(t) === "cancelled").length, // ← ADD
  };
  const overdueTasks = userTasks.filter(t => isOverdue(t.dueDate, effectiveStatus(t)));
  const completionRate = userTasks.length ? Math.round((byStatus.completed / userTasks.length) * 100) : 0;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(100%, 440px)", margin: 16, height: "min(85vh, 720px)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,.18)", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
        <div style={{ background: `linear-gradient(135deg, ${u.color}18, ${u.color}08)`, padding: "20px 20px 14px", borderBottom: "1px solid #f0f2f5", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: u.color + "22", color: u.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 800, border: `3px solid ${u.color}55` }}>{u.initial}</div>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#111827" }}>{u.name}</div>
                <span style={{ background: u.color + "22", color: u.color, padding: "2px 8px", borderRadius: 20, fontWeight: 600, fontSize: "0.72rem" }}>{u.role === "super_admin" ? "Admin" : u.role === "manager" ? "Manager" : "User"}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}><FiX size={14} /></button>
          </div>
        </div>
        <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, borderBottom: "1px solid #f0f2f5", flexShrink: 0 }}>
          {[
            { label: "Total", value: userTasks.length, color: "#0d9488", bg: "#ccfbf1" },
            { label: "Done", value: byStatus.completed, color: "#10b981", bg: "#d1fae5" },
            { label: "Cancelled", value: byStatus.cancelled, color: "#6b7280", bg: "#f3f4f6" }, // ← swapped
            { label: "Late", value: overdueTasks.length, color: "#ef4444", bg: "#fee2e2" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", background: s.bg, borderRadius: 10 }}>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.66rem", color: "#6b7280", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f2f5", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#374151" }}>Completion Rate</span>
            <span style={{ fontSize: "0.76rem", fontWeight: 800, color: completionRate >= 70 ? "#10b981" : completionRate >= 40 ? "#f59e0b" : "#ef4444" }}>{completionRate}%</span>
          </div>
          <div style={{ height: 7, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${completionRate}%`, background: completionRate >= 70 ? "#10b981" : completionRate >= 40 ? "#f59e0b" : "#ef4444", borderRadius: 999 }} />
          </div>
        </div>
        <UserTaskTabs userTasks={userTasks} overdueTasks={overdueTasks} effectiveStatus={effectiveStatus} />
      </div>
    </div>
  );
}

function UserTaskTabs({ userTasks, overdueTasks, effectiveStatus }) {
  const [activeTab, setActiveTab] = useState("active");

  const completed = userTasks.filter(t => effectiveStatus(t) === "completed");
  const cancelled = userTasks.filter(t => effectiveStatus(t) === "cancelled");  // ← NEW
  const active = userTasks.filter(t => !["completed", "cancelled"].includes(effectiveStatus(t))); // ← updated

  const tabs = [
    { id: "active", label: `🔄 Active (${active.length})`, color: "#3b82f6" },
    { id: "completed", label: `✅ Done (${completed.length})`, color: "#10b981" },
    { id: "cancelled", label: `❌ Cancelled (${cancelled.length})`, color: "#6b7280" }, // ← NEW
  ];

  const renderTask = (t) => {
    const eff = effectiveStatus(t);
    const over = isOverdue(t.dueDate, eff);
    return (
      <div key={t._id || t.id} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 9, marginBottom: 5,
        background: eff === "completed" ? "#d1fae5" : eff === "cancelled" ? "#f3f4f6" : over ? "#fee2e2" : "#f9fafb",
        border: `1.5px solid ${eff === "completed" ? "#bbf7d0" : eff === "cancelled" ? "#d1d5db" : over ? "#fecaca" : "#e5e7eb"}`
      }}>
        <span style={{ fontSize: "0.9rem" }}>{STATUS[eff]?.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textDecoration: ["completed", "cancelled"].includes(eff) ? "line-through" : "none",
            color: ["completed", "cancelled"].includes(eff) ? "#6b7280" : "#111827"
          }}>{t.title}</div>
          <span style={{ fontSize: "0.67rem", color: over && eff !== "completed" ? "#ef4444" : "#9ca3af" }}>
            📅 {fmtDate(t.dueDate)}{over && eff !== "completed" && eff !== "cancelled" ? " · ⚠ Overdue" : ""}
          </span>
        </div>
        <span style={{ fontSize: "0.64rem", fontWeight: 700, color: STATUS[eff]?.color, background: STATUS[eff]?.bg, padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>{STATUS[eff]?.label}</span>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "10px 20px 16px", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, fontSize: "0.76rem", fontWeight: 800, color: "#374151", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
        Assigned Tasks
      </div>
      <div style={{ flexShrink: 0, display: "flex", gap: 5, marginBottom: 10, background: "#f3f4f6", borderRadius: 9, padding: 3 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: "6px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700,
            background: activeTab === t.id ? "#fff" : "transparent",
            color: activeTab === t.id ? t.color : "#9ca3af",
            boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none"
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
      {activeTab === "completed" && (completed.length === 0
        ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 24, fontSize: "0.84rem" }}>⏳ No completed tasks</div>
        : completed.map(renderTask))}
      {activeTab === "active" && (active.length === 0
        ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 24, fontSize: "0.84rem" }}>🎉 All tasks completed!</div>
        : active.map(renderTask))}
      {activeTab === "cancelled" && (cancelled.length === 0
        ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 24, fontSize: "0.84rem" }}>✅ No cancelled tasks</div>
        : cancelled.map(renderTask))}
      </div>
    </div>
  );
}

/* ---------- FormDataSummary ---------- */
function FormDataSummary({ formData, task }) {
  if (!formData) return null;
  const { inputFields = [], dropdownSelections = [], quickReplySelected = "", checkboxSelections = [] } = formData;
  const items = [];
  if (quickReplySelected) { const qr = task?.quickReplies?.find(q => q.id === quickReplySelected); if (qr) items.push({ label: "Quick Reply", value: qr.title }); }
  inputFields.forEach(f => { if (f.value) { const field = task?.inputFields?.find(x => x.id === f.id); items.push({ label: field?.label || f.id, value: f.value }); } });
  dropdownSelections.forEach(d => { if (d.selected) { const dd = task?.dropdownButtons?.find(x => x.id === d.id); items.push({ label: dd?.title || d.id, value: d.selected }); } });
  const entries = Array.isArray(checkboxSelections) ? checkboxSelections : Object.entries(checkboxSelections || {}).map(([id, selected]) => ({ id, selected }));
  entries.forEach(sel => {
    const vals = Array.isArray(sel.selected) ? sel.selected.filter(Boolean) : sel.selected ? [String(sel.selected)] : [];
    if (vals.length) { const group = task?.checkboxes?.find(cb => cb.id === sel.id); items.push({ label: group?.label || sel.id, value: vals.join(", ") }); }
  });
  if (!items.length) return null;
  return (
    <div className="task-form-summary" style={{ marginTop: 5, padding: "5px 9px", background: "rgba(13,148,136,.08)", borderRadius: 7, borderLeft: "2px solid #0d9488" }}>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: "0.72rem", color: "#374151", marginBottom: i < items.length - 1 ? 3 : 0 }}>
          <span style={{ color: "#0d9488", fontWeight: 700 }}>{item.label}:</span> {item.value}
        </div>
      ))}
    </div>
  );
}

function TaskAttachmentBubble({ file, isMine = false }) {
  const url = attachmentUrl(file);
  if (!url) return null;
  const type = attachmentType(file);
  const name = attachmentName(file);
  const size = typeof file.fileSize === "number" ? formatFileSize(file.fileSize) : file.fileSize;
  const icon = type === "image" ? <FiImage size={14} /> : type === "video" ? <FiVideo size={14} /> : type === "audio" ? <FiMic size={14} /> : <FiFile size={14} />;
  const isPdf = isPdfAttachment(file);

  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 7, color: "inherit", textDecoration: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} style={{ width: "100%", maxWidth: 260, maxHeight: 190, objectFit: "cover", borderRadius: 8, border: "1px solid #d1d5db" }} />
      </a>
    );
  }

  if (type === "video") {
    return (
      <div style={{ marginTop: 7 }}>
        <video src={url} controls style={{ width: "100%", maxWidth: 270, maxHeight: 190, borderRadius: 8, background: "#111827" }} />
        
      </div>
    );
  }

  if (type === "audio") {
   return <AudioPlayer src={url} isMine={isMine} />;
  }

  return (
    <div className={`task-attachment-bubble ${isMine ? "mine" : "theirs"}`} style={{ marginTop: 7, padding: 10, borderRadius: 10, border: `1px solid ${isMine ? "#5eead4" : "#e5e7eb"}`, background: isMine ? "#ecfdf5" : "#fff", display: "flex", alignItems: "center", gap: 10, color: "#1f2937", maxWidth: 310, boxShadow: "0 1px 4px rgba(15,23,42,.06)" }}>
      <div style={{ width: 40, height: 44, borderRadius: 8, background: isPdf ? "#fee2e2" : "#e0f2fe", color: isPdf ? "#dc2626" : "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
        {icon}
        {isPdf && <span style={{ position: "absolute", bottom: 5, fontSize: 8, fontWeight: 900, lineHeight: 1 }}>PDF</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ marginTop: 2, fontSize: "0.67rem", color: "#6b7280" }}>{isPdf ? "PDF document" : "File"}{size ? ` · ${size}` : ""}</div>
        <button type="button" onClick={() => downloadAttachment(file)} style={{ marginTop: 8, padding: "5px 10px", borderRadius: 999, border: "none", color: "#fff", background: "#0d9488", cursor: "pointer", fontSize: "0.68rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <FiDownload size={11} /> Download
        </button>
      </div>
    </div>
  );
}

function TaskAttachmentList({ files = [], isMine = false }) {
  const list = Array.isArray(files) ? files : [];
  if (!list.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {list.map((file, index) => <TaskAttachmentBubble key={`${attachmentUrl(file)}-${index}`} file={file} isMine={isMine} />)}
    </div>
  );
}
function AudioPlayer({ src, isMine = false, variant = "bubble" }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setProgress(audioRef.current.duration ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0);
  };
  const onLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); };
  const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
  const onSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
    setProgress(pct * 100);
  };

const teal = "#0d9488";
  const isCard = variant === "card";
  const bg = isCard ? "rgba(255,255,255,0.45)" : isMine ? "#ccfbf1" : "#f3f4f6";
  const trackBg = isCard ? "#9FE1CB" : isMine ? "#a7f3d0" : "#d1d5db";
  const border = isCard ? "1px solid #9FE1CB" : isMine ? "1px solid #9FE1CB" : "1px solid #e5e7eb";
  const subColor = isCard ? "#0F6E56" : isMine ? "#0F6E56" : "#6b7280";
  const borderRadius = isCard ? 10 : isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px";

  return (
    <div className={`task-audio-player ${isCard ? "card" : isMine ? "mine" : "theirs"}`} style={{
      background: bg, border, borderRadius,
      padding: "10px 12px", minWidth: 220, maxWidth: 280,
    }}>
      <audio
        ref={audioRef} src={src}
        onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded} preload="metadata"
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={togglePlay} style={{
          width: 34, height: 34, borderRadius: "50%",
          background: teal, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0,
        }}>
          {playing ? <FiPause size={14} /> : <FiPlay size={14} style={{ marginLeft: 1 }} />}
        </button>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
          <div onClick={onSeek} style={{ height: 4, background: trackBg, borderRadius: 999, cursor: "pointer", position: "relative", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: teal, borderRadius: 999, transition: "width 0.1s linear" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.67rem", color: subColor, fontWeight: 500 }}>{formatDuration(Math.floor(currentTime))}</span>
            <span style={{ fontSize: "0.67rem", color: subColor }}>{duration ? formatDuration(Math.floor(duration)) : "0:00"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- TaskFormElements ---------- */
function TaskFormElements({ task, values, onChange, onSubmit, readonly = false }) {
  const { quickReplies = [], inputFields = [], dropdownButtons = [], ctaButtons = [], checkboxes = [] } = task;
  const hasAny = quickReplies.length + inputFields.length + dropdownButtons.length + ctaButtons.length + checkboxes.length > 0;
  const [collapsed, setCollapsed] = useState(false);
  if (!hasAny) return null;
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: "0.84rem", outline: "none", color: "#1a2233", background: readonly ? "#f9fafb" : "#fff", boxSizing: "border-box" };
  const normalizeOptions = (raw) => typeof raw === "string" ? raw.split(/[,\n]+/).map(s => s.trim()).filter(Boolean) : Array.isArray(raw) ? raw.map(s => String(s).trim()).filter(Boolean) : [];
  return (
    <div className="task-form-panel" style={{ margin: "8px 12px", background: "#fff", borderRadius: 12, border: "1.5px solid #e5e7eb", overflow: "hidden", flexShrink: 0 }}>
      <div className="task-form-panel-header" onClick={() => setCollapsed(p => !p)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", cursor: "pointer", background: "#f9fafb", borderBottom: collapsed ? "none" : "1px solid #f0f0f0" }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.04em" }}>📝 Task Form {readonly && "(Submitted)"}</span>
        <span style={{ fontSize: "0.6rem", color: "#0d9488", transform: collapsed ? "rotate(-90deg)" : "rotate(0)", transition: ".2s" }}>▼</span>
      </div>
      {!collapsed && (
        <div style={{ padding: "10px 12px 12px" }}>
          {quickReplies.length > 0 && (
            <div style={{ marginBottom: 9 }}>
              <div style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600, marginBottom: 5 }}>Quick Reply</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {quickReplies.map(qr => {
                  const sel = values.quickReplySelected === qr.id;
                  return <button key={qr.id} onClick={() => !readonly && onChange("quickReply", qr.id, qr.id)} style={{ padding: "4px 12px", borderRadius: 20, cursor: readonly ? "default" : "pointer", border: `1.5px solid ${sel ? "#0d9488" : "#e5e7eb"}`, background: sel ? "#ccfbf1" : "#f9fafb", color: sel ? "#0d9488" : "#374151", fontSize: "0.79rem", fontWeight: sel ? 700 : 500 }}>{qr.title}</button>;
                })}
              </div>
            </div>
          )}
          {inputFields.map(field => (
            <div key={field.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600, marginBottom: 3 }}>{field.label || "Input"}{field.required && <span style={{ color: "#ef4444" }}> *</span>}</div>
              <input value={values.inputFields?.[field.id] || ""} onChange={e => !readonly && onChange("inputField", field.id, e.target.value)} placeholder={field.placeholder || "Enter value…"} disabled={readonly} style={inp} />
            </div>
          ))}
          {dropdownButtons.map(dd => (
            <div key={dd.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600, marginBottom: 3 }}>{dd.title || "Select"}</div>
              <select value={values.dropdownSelections?.[dd.id] || ""} onChange={e => !readonly && onChange("dropdown", dd.id, e.target.value)} disabled={readonly} style={{ ...inp, appearance: "auto" }}>
                <option value="">{dd.placeholder || "Select an option…"}</option>
                {normalizeOptions(dd.options).map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
          {checkboxes.map(group => {
            const selected = values.checkboxSelections?.[group.id] || [];
            return (
              <div key={group.id} style={{ marginBottom: 9 }}>
                <div style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600, marginBottom: 5 }}>{group.label || "Select options"}</div>
                {normalizeOptions(group.options).map(opt => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 7, cursor: readonly ? "default" : "pointer", marginBottom: 4 }}>
                    <input type="checkbox" checked={selected.includes(opt)} onChange={e => !readonly && onChange("checkbox", group.id, opt, e.target.checked)} disabled={readonly} style={{ accentColor: "#0d9488", width: 14, height: 14 }} />
                    <span style={{ fontSize: "0.82rem", color: "#374151" }}>{opt}</span>
                  </label>
                ))}
              </div>
            );
          })}
          {ctaButtons.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 4 }}>
              {ctaButtons.map(btn => (
                <a key={btn.id} href={btn.btnType === "URL" ? btn.value : `tel:${btn.value}`} target={btn.btnType === "URL" ? "_blank" : undefined} rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, textDecoration: "none", background: "#0d9488", color: "#fff", fontSize: "0.79rem", fontWeight: 600 }}>
                  {btn.btnType === "URL" ? <FiLink size={12} /> : <FiPhone size={12} />} {btn.title}
                </a>
              ))}
            </div>
          )}
          {!readonly && (
            <button type="button" onClick={() => onSubmit()} style={{ marginTop: 12, padding: "8px 14px", background: "#0d9488", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.83rem", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <FiSend size={13} /> Submit Response
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Create Task Modal ---------- */
function FieldRow({ title, onRemove, children }) {
  return (
    <div className="task-field-row" style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, padding: 11, position: "relative", background: "#f9fafb", marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, alignItems: "center" }}>
        <span style={{ fontSize: "0.67rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase" }}>{title}</span>
        <button onClick={onRemove} style={{ background: "#fee2e2", border: "none", borderRadius: 5, cursor: "pointer", padding: "2px 5px", color: "#ef4444" }}><FiMinus size={11} /></button>
      </div>
      {children}
    </div>
  );
}

const getTaskUserId = (u) => (u?._id || u?.id || u)?.toString?.() || "";
const taskReminderValues = (task) => {
  const reminders = Array.isArray(task?.reminders)
    ? task.reminders.filter(r => !r?.sentAt).map(r => r?.remindAt).filter(Boolean)
    : [];
  const values = reminders.length ? reminders : [task?.reminderAt || task?.reminder].filter(Boolean);
  return values.map(toDateTimeInput).filter(Boolean);
};
const taskToForm = (task, currentUser) => ({
  title: task?.title || "",
  description: task?.description || "",
  assignedTo: (task?.assignedTo || []).map(getTaskUserId).filter(Boolean),
  priority: task?.priority || "medium",
  dueDate: toDateInput(task?.dueDate),
  reminders: taskReminderValues(task),
  isPersonal: task?.isPersonal ?? (isUser(currentUser) ? true : false),
  inputFields: task?.inputFields || [],
  dropdownButtons: task?.dropdownButtons || [],
  quickReplies: task?.quickReplies || [],
  ctaButtons: task?.ctaButtons || [],
  checkboxes: task?.checkboxes || [],
  attachments: task?.attachments || [],
});

function CreateTaskModal({ onClose, onCreate, onUpdate, currentUser, users, task }) {
  const _isAdmin = isAdmin(currentUser);
  const _isManager = isManager(currentUser);
  const _isUser = isUser(currentUser);
  const isEditing = !!task;
  const editNeedsApproval = isEditing && _isManager && !_isAdmin;
  const [assignFilter, setAssignFilter] = useState("all");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedMgr, setSelectedMgr] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [allManagers, setAllManagers] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagContacts, setTagContacts] = useState([]);
  const [mgrContacts, setMgrContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [uploadingTaskFile, setUploadingTaskFile] = useState(false);
  const [isRecordingTaskAudio, setIsRecordingTaskAudio] = useState(false);
  const [taskRecordingSeconds, setTaskRecordingSeconds] = useState(0);
  const [form, setForm] = useState(() => taskToForm(task, currentUser));
  const [tab, setTab] = useState("basic");
  const taskMediaRecorderRef = useRef(null);
  const taskAudioChunksRef = useRef([]);
  const taskAudioStreamRef = useRef(null);
  const taskRecordingTimerRef = useRef(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleAssign = (id) => set("assignedTo", form.assignedTo.includes(id) ? form.assignedTo.filter(x => x !== id) : [...form.assignedTo, id]);
  const addInputField = () => set("inputFields", [...form.inputFields, { id: genId(), label: "", placeholder: "", required: false }]);
  const addDropdown = () => set("dropdownButtons", [...form.dropdownButtons, { id: genId(), title: "", placeholder: "", options: "" }]);
  const addQuickReply = () => set("quickReplies", [...form.quickReplies, { id: genId(), title: "" }]);
  const addCtaButton = () => set("ctaButtons", [...form.ctaButtons, { id: genId(), btnType: "URL", title: "", value: "" }]);
  const addCheckboxGroup = () => set("checkboxes", [...form.checkboxes, { id: genId(), label: "", options: "" }]);
  const addReminder = () => set("reminders", [...(form.reminders || []), ""]);
  const patchReminder = (index, value) => {
    const reminders = (form.reminders || []).length ? form.reminders : [""];
    set("reminders", reminders.map((item, i) => i === index ? value : item));
  };
  const removeReminder = (index) => set("reminders", (form.reminders || []).filter((_, i) => i !== index));
  const patchArr = (key, id, field, val) => set(key, form[key].map(x => x.id === id ? { ...x, [field]: val } : x));
  const removeArr = (key, id) => set(key, form[key].filter(x => x.id !== id));
  const parseOptions = (raw) => { if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean); if (typeof raw === "string") return raw.split(/[,\n]+/).map(s => s.trim()).filter(Boolean); return []; };
  const needsApproval = _isManager && !form.isPersonal && form.assignedTo.length > 0;
  const currentUserId = currentUser?.id || currentUser?._id?.toString();
  const currentUserPhone = currentUser?.phone?.replace(/\D/g, "");
  const isCurrentAssignableUser = useCallback((user, contact) => {
    const userId = user?.id || user?._id?.toString();
    const userPhone = user?.phone?.replace(/\D/g, "");
    const contactPhone = contact?.mobile?.replace(/\D/g, "");
    return Boolean(
      (currentUserId && userId === currentUserId) ||
      (currentUserPhone && (userPhone === currentUserPhone || contactPhone === currentUserPhone))
    );
  }, [currentUserId, currentUserPhone]);

  useEffect(() => {
    API.get("/contacts/managers").then(res => setAllManagers(Array.isArray(res.data) ? res.data : [])).catch(() => { });
    API.get("/contacts").then(res => {
      const tagMap = new Map();
      (Array.isArray(res.data) ? res.data : []).forEach(c => (c.tags || []).forEach(t => { if (t?._id) tagMap.set(t._id.toString(), t); }));
      setAllTags([...tagMap.values()]);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (assignFilter !== "tag" || !selectedTag) {
      setTagContacts([]);
      return;
    }
    setLoadingContacts(true);
    API.get(`/contacts?tag=${selectedTag}`).then(res => setTagContacts(Array.isArray(res.data) ? res.data : [])).catch(() => { }).finally(() => setLoadingContacts(false));
  }, [assignFilter, selectedTag]);

  useEffect(() => {
    if (assignFilter !== "manager_contacts" || !selectedMgr) {
      setMgrContacts([]);
      return;
    }
    setLoadingContacts(true);
    API.get(`/contacts?managerId=${selectedMgr}`).then(res => setMgrContacts(Array.isArray(res.data) ? res.data : [])).catch(() => { }).finally(() => setLoadingContacts(false));
  }, [assignFilter, selectedMgr]);

  const contactsWithUsers = useCallback((contactList) => contactList.map(c => ({ contact: c, user: users.find(u => u.phone && c.mobile && (u.phone === c.mobile || u.phone.replace(/\D/g, "") === c.mobile.replace(/\D/g, ""))) })).filter(({ contact, user }) => !isCurrentAssignableUser(user, contact)), [users, isCurrentAssignableUser]);

  const assignableList = useMemo(() => {
    if (assignFilter === "tag") return contactsWithUsers(tagContacts).filter(({ contact }) => !assignSearch || contact.name?.toLowerCase().includes(assignSearch.toLowerCase()));
    if (assignFilter === "manager_contacts") return contactsWithUsers(mgrContacts).filter(({ contact }) => !assignSearch || contact.name?.toLowerCase().includes(assignSearch.toLowerCase()));
    return users.filter(u => { if (isCurrentAssignableUser(u)) return false; if (u.role === "super_admin") return false; if (assignFilter === "user" && u.role !== "user") return false; if (assignFilter === "manager" && u.role !== "manager") return false; if (assignSearch && !u.name?.toLowerCase().includes(assignSearch.toLowerCase())) return false; return true; }).map(u => ({ contact: null, user: u }));
  }, [assignFilter, users, tagContacts, mgrContacts, assignSearch, contactsWithUsers, isCurrentAssignableUser]);
  const assignableIds = useMemo(() => [...new Set(assignableList.map(({ user }) => user?.id || user?._id?.toString()).filter(Boolean))], [assignableList]);
  const allFilteredSelected = assignableIds.length > 0 && assignableIds.every(id => form.assignedTo.includes(id));
  const toggleFilteredAssignments = () => {
    if (!assignableIds.length) return;
    set("assignedTo", allFilteredSelected
      ? form.assignedTo.filter(id => !assignableIds.includes(id))
      : [...new Set([...form.assignedTo, ...assignableIds])]
    );
  };
  const uploadTaskVoiceBlob = async (blob) => {
    const file = new File([blob], `task_voice_${Date.now()}.webm`, { type: blob.type || "audio/webm" });
    setUploadingTaskFile(true);
    try {
      const uploaded = await uploadTaskFile(file);
      setForm(p => ({ ...p, attachments: [...(p.attachments || []), uploaded] }));
    } catch {
      alert("Failed to upload voice note");
    } finally {
      setUploadingTaskFile(false);
    }
  };
  const stopTaskAudioTracks = () => {
    taskAudioStreamRef.current?.getTracks?.().forEach(track => track.stop());
    taskAudioStreamRef.current = null;
  };
  const startTaskAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      taskAudioStreamRef.current = stream;
      taskAudioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      taskMediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) taskAudioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(taskAudioChunksRef.current, { type: "audio/webm" });
        taskAudioChunksRef.current = [];
        stopTaskAudioTracks();
        if (blob.size > 0) uploadTaskVoiceBlob(blob);
      };
      recorder.start();
      setIsRecordingTaskAudio(true);
      setTaskRecordingSeconds(0);
      taskRecordingTimerRef.current = setInterval(() => setTaskRecordingSeconds(sec => sec + 1), 1000);
    } catch {
      alert("Microphone access is required to record a voice note");
    }
  };
  const stopTaskAudioRecording = () => {
    taskMediaRecorderRef.current?.stop();
    taskMediaRecorderRef.current = null;
    clearInterval(taskRecordingTimerRef.current);
    taskRecordingTimerRef.current = null;
    setIsRecordingTaskAudio(false);
  };
  useEffect(() => () => {
    clearInterval(taskRecordingTimerRef.current);
    stopTaskAudioTracks();
  }, []);
  const removeTaskAttachment = (index) => set("attachments", form.attachments.filter((_, i) => i !== index));

  const handleSubmit = () => {
    if (!form.title.trim()) { alert("Task Title is required"); return; }
    if (!form.dueDate) { alert("Due Date is required"); return; }
    const assignedTo = form.isPersonal ? [currentUser.id] : form.assignedTo;
    const dropdownButtons = form.dropdownButtons.map(dd => ({ ...dd, options: parseOptions(dd.options) }));
    const checkboxes = form.checkboxes.map(cb => ({ ...cb, options: parseOptions(cb.options) }));
    const reminderValues = [...new Set((form.reminders || []).filter(Boolean))].sort();
    const payload = {
      ...form,
      assignedTo,
      reminders: reminderValues.map(remindAt => ({ remindAt })),
      reminderAt: reminderValues[0] || null,
      dropdownButtons,
      checkboxes,
      needsApproval,
    };
    if (isEditing) onUpdate(task._id || task.id, payload);
    else onCreate(payload);
    onClose();
  };

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: "0.84rem", outline: "none", color: "#1a2233", background: "#fff", boxSizing: "border-box" };
  const lbl = { fontSize: "0.69rem", fontWeight: 700, color: "#6b7280", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both" }}>
      <div className="task-create-modal" onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(95%, 480px)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,.22)", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f0f2f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: "0.96rem", color: "#1a2233" }}>{isEditing ? "Edit Task" : "✨ Create New Task"}</span>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}><FiX size={14} /></button>
        </div>
        {needsApproval && !isEditing && (
          <div style={{ margin: "10px 18px 0", padding: "9px 13px", background: "#fef3c7", border: "1.5px solid #fcd34d44", borderRadius: 9, display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ fontSize: "1rem" }}>⚠️</span>
            <div>
              <div style={{ fontSize: "0.79rem", fontWeight: 700, color: "#92400e" }}>Admin Approval Required</div>
              <div style={{ fontSize: "0.71rem", color: "#b45309", marginTop: 2 }}>This task will be sent to admin for approval.</div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 5, padding: "9px 18px", borderBottom: "1px solid #f0f2f5", background: "#f9fafb", marginTop: needsApproval && !isEditing ? 10 : 0 }}>
          {[["basic", "📋 Basic"], ["form", "🧩 Form"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "5px 14px", borderRadius: 20, border: "1.5px solid #e5e7eb", cursor: "pointer", fontSize: "0.77rem", fontWeight: 700, background: tab === id ? "#0d9488" : "#e5e7eb", color: tab === id ? "#fff" : "#6b7280" }}>{label}</button>
          ))}
        </div>
        <div style={{ overflowY: "auto", padding: "14px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 11 }}>
          {tab === "basic" && (
            <>
              <div><label style={lbl}>Task Title *</label><input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Enter task title…" style={inp} /></div>
              <div><label style={lbl}>Description</label><textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Add details…" rows={3} style={{ ...inp, resize: "none", fontFamily: "inherit" }} /></div>
              <div>
                <label style={lbl}>Voice Note</label>
                <button onClick={isRecordingTaskAudio ? stopTaskAudioRecording : startTaskAudioRecording} disabled={uploadingTaskFile} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px dashed #0d9488", background: isRecordingTaskAudio ? "#fee2e2" : "#ecfdf5", color: isRecordingTaskAudio ? "#dc2626" : "#0d9488", cursor: uploadingTaskFile ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <FiMic size={14} /> {uploadingTaskFile ? "Uploading..." : isRecordingTaskAudio ? `Stop recording ${formatDuration(taskRecordingSeconds)}` : "Record voice note"}
                </button>
                {form.attachments?.length > 0 && (
                  <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 6 }}>
                    {form.attachments.map((file, index) => (
                      <div key={`${attachmentUrl(file)}-${index}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <audio src={attachmentUrl(file)} controls style={{ flex: 1, minWidth: 0, height: 34 }} />
                        <button onClick={() => removeTaskAttachment(index)} style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", display: "flex", padding: 2 }}><FiX size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                <div><label style={lbl}>Priority</label><select value={form.priority} onChange={e => set("priority", e.target.value)} style={inp}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                <div><label style={lbl}>Due Date *</label><input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} style={inp} /></div>
              </div>
              <div>
                <label style={lbl}>Reminders</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {((form.reminders || []).length ? form.reminders : [""]).map((reminder, index) => (
                    <div key={index} style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <input type="datetime-local" value={reminder} onChange={e => patchReminder(index, e.target.value)} style={inp} />
                      <button type="button" onClick={() => removeReminder(index)} title="Remove reminder" style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addReminder} style={{ alignSelf: "flex-start", padding: "6px 10px", borderRadius: 8, border: "1px solid #ccfbf1", background: "#ecfdf5", color: "#0d9488", cursor: "pointer", fontSize: "0.74rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}>
                    <FiPlus size={13} /> Add reminder
                  </button>
                </div>
              </div>
              {!_isUser && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px", background: "#f9fafb", borderRadius: 9, border: "1.5px solid #e5e7eb" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "#1a2233" }}>Personal Task</div>
                    <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Only visible to you</div>
                  </div>
                  <div onClick={() => set("isPersonal", !form.isPersonal)} style={{ width: 40, height: 21, borderRadius: 999, cursor: "pointer", background: form.isPersonal ? "#0d9488" : "#d1d5db", position: "relative", transition: "background .2s" }}>
                    <div style={{ position: "absolute", top: 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", left: form.isPersonal ? 21 : 2, transition: "left .2s" }} />
                  </div>
                </div>
              )}
              {_isUser && (
                <div style={{ padding: "9px 11px", background: "#ccfbf1", borderRadius: 9, border: "1.5px solid #5eead4" }}>
                  <div style={{ fontSize: "0.77rem", fontWeight: 600, color: "#0d9488" }}>🔒 Personal tasks only</div>
                  <div style={{ fontSize: "0.67rem", color: "#0f766e", marginTop: 2 }}>Users can only create personal tasks for themselves.</div>
                </div>
              )}
              {(_isAdmin || _isManager) && !form.isPersonal && (
                <div>
                  <label style={lbl}>Assign To {_isManager && !isEditing && <span style={{ color: "#f59e0b", textTransform: "none", fontSize: "0.64rem" }}>⚠ requires admin approval</span>}</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
                    {[{ id: "all", label: "👥 All" }, { id: "user", label: "🙋 Users" }, { id: "manager", label: "💼 Managers" }, { id: "tag", label: "🔖 By Tag" }, { id: "manager_contacts", label: "📋 Manager's Contacts" }].map(f => (
                      <button key={f.id} onClick={() => { setAssignFilter(f.id); setSelectedTag(""); setSelectedMgr(""); }} style={{ padding: "3px 11px", borderRadius: 999, border: "1.5px solid", fontSize: "0.71rem", fontWeight: 700, cursor: "pointer", borderColor: assignFilter === f.id ? "#0d9488" : "#e5e7eb", background: assignFilter === f.id ? "#ccfbf1" : "#f9fafb", color: assignFilter === f.id ? "#0d9488" : "#6b7280" }}>{f.label}</button>
                    ))}
                  </div>
                  {assignFilter === "tag" && <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} style={{ ...inp, marginBottom: 7, appearance: "auto" }}><option value="">— Select a tag —</option>{allTags.map(t => <option key={t._id} value={t._id}>{t.name || t._id}</option>)}</select>}
                  {assignFilter === "manager_contacts" && <select value={selectedMgr} onChange={e => setSelectedMgr(e.target.value)} style={{ ...inp, marginBottom: 7, appearance: "auto" }}><option value="">— Select a manager —</option>{allManagers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select>}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 9px", height: 33, borderRadius: 8, background: "#f3f4f6", marginBottom: 7 }}>
                    <FiSearch size={12} color="#9ca3af" />
                    <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)} placeholder="Search people…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "0.81rem", color: "#1a2233" }} />
                    {assignSearch && <button onClick={() => setAssignSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0 }}><FiX size={11} /></button>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700 }}>{assignableIds.length} filtered</span>
                    <button onClick={toggleFilteredAssignments} disabled={!assignableIds.length || loadingContacts} style={{ border: "1.5px solid #0d9488", background: allFilteredSelected ? "#fff" : "#0d9488", color: allFilteredSelected ? "#0d9488" : "#fff", borderRadius: 999, padding: "4px 11px", fontSize: "0.72rem", fontWeight: 800, cursor: !assignableIds.length || loadingContacts ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <FiUsers size={12} /> {allFilteredSelected ? "Deselect filtered" : "Select all filtered"}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, border: "1.5px solid #e5e7eb", borderRadius: 9, padding: 7, maxHeight: 190, overflowY: "auto" }}>
                    {loadingContacts ? <div style={{ padding: "11px 0", textAlign: "center", fontSize: "0.79rem", color: "#667781" }}>Loading…</div> : assignableList.length === 0 ? <div style={{ padding: "11px 0", textAlign: "center", fontSize: "0.79rem", color: "#667781" }}>{assignFilter === "tag" && !selectedTag ? "Select a tag first" : assignFilter === "manager_contacts" && !selectedMgr ? "Select a manager first" : "No people found"}</div> : assignableList.map(({ contact, user }) => {
                      const id = user?.id || user?._id?.toString();
                      const name = user?.name || contact?.name || "Unknown";
                      const subtitle = user ? `${user.role}${contact ? " · " + contact.mobile : ""}` : `${contact?.mobile || ""} · no account`;
                      const canAssign = !!id;
                      const checked = id ? form.assignedTo.includes(id) : false;
                      const rowKey = contact?._id?.toString() || contact?.mobile || id || name;
                      return (
                        <label key={rowKey} style={{ display: "flex", alignItems: "center", gap: 9, cursor: canAssign ? "pointer" : "not-allowed", padding: "5px 5px", borderRadius: 7, opacity: canAssign ? 1 : 0.45, background: checked ? "#ccfbf1" : "transparent" }}>
                          <input type="checkbox" checked={checked} disabled={!canAssign} onChange={() => canAssign && toggleAssign(id)} style={{ accentColor: "#0d9488" }} />
                          <Avatar user={user || { name, id: "" }} size={28} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1a2233" }}>{name}</div>
                            <div style={{ fontSize: "0.69rem", textTransform: "capitalize", color: canAssign ? "#667781" : "#ef4444" }}>{subtitle}{!canAssign && " ⚠ not registered"}</div>
                          </div>
                          {checked && <span style={{ color: "#0d9488", fontSize: "0.74rem", fontWeight: 700 }}>✓</span>}
                        </label>
                      );
                    })}
                  </div>
                  {form.assignedTo.length > 0 && (
                    <div style={{ marginTop: 5, fontSize: "0.74rem", color: "#0d9488", fontWeight: 600 }}>
                      {form.assignedTo.length} person{form.assignedTo.length > 1 ? "s" : ""} selected
                      <button onClick={() => set("assignedTo", [])} style={{ marginLeft: 9, background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "0.71rem", fontWeight: 600 }}>Clear all</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {tab === "form" && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
                {[["+ Input Field", addInputField], ["+ Dropdown", addDropdown], ["+ Quick Reply", addQuickReply], ["+ CTA Button", addCtaButton], ["+ Checkbox", addCheckboxGroup]].map(([label, action]) => (
                  <button key={label} onClick={action} style={{ padding: "4px 11px", borderRadius: 7, border: "1.5px dashed #0d9488", background: "#ccfbf1", color: "#0d9488", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer" }}>{label}</button>
                ))}
              </div>
              {form.inputFields.map(f => <FieldRow key={f.id} title="Input Field" onRemove={() => removeArr("inputFields", f.id)}><input placeholder="Label" value={f.label} onChange={e => patchArr("inputFields", f.id, "label", e.target.value)} style={{ ...inp, marginBottom: 5 }} /><input placeholder="Placeholder" value={f.placeholder} onChange={e => patchArr("inputFields", f.id, "placeholder", e.target.value)} style={inp} /></FieldRow>)}
              {form.dropdownButtons.map(dd => <FieldRow key={dd.id} title="Dropdown" onRemove={() => removeArr("dropdownButtons", dd.id)}><input placeholder="Title" value={dd.title} onChange={e => patchArr("dropdownButtons", dd.id, "title", e.target.value)} style={{ ...inp, marginBottom: 5 }} /><textarea placeholder="Option A, Option B" value={typeof dd.options === "string" ? dd.options : (Array.isArray(dd.options) ? dd.options.join(", ") : "")} onChange={e => patchArr("dropdownButtons", dd.id, "options", e.target.value)} rows={2} style={{ ...inp, resize: "none", fontFamily: "inherit" }} /></FieldRow>)}
              {form.quickReplies.map(qr => <FieldRow key={qr.id} title="Quick Reply" onRemove={() => removeArr("quickReplies", qr.id)}><input placeholder="Button label" value={qr.title} onChange={e => patchArr("quickReplies", qr.id, "title", e.target.value)} style={inp} /></FieldRow>)}
              {form.ctaButtons.map(btn => <FieldRow key={btn.id} title="CTA Button" onRemove={() => removeArr("ctaButtons", btn.id)}><select value={btn.btnType} onChange={e => patchArr("ctaButtons", btn.id, "btnType", e.target.value)} style={{ ...inp, marginBottom: 5, appearance: "auto" }}><option value="URL">URL</option><option value="Phone Number">Phone Number</option></select><input placeholder="Label" value={btn.title} onChange={e => patchArr("ctaButtons", btn.id, "title", e.target.value)} style={{ ...inp, marginBottom: 5 }} /><input placeholder={btn.btnType === "URL" ? "https://…" : "+91 …"} value={btn.value} onChange={e => patchArr("ctaButtons", btn.id, "value", e.target.value)} style={inp} /></FieldRow>)}
              {form.checkboxes.map(cb => <FieldRow key={cb.id} title="Checkbox Group" onRemove={() => removeArr("checkboxes", cb.id)}><input placeholder="Label" value={cb.label} onChange={e => patchArr("checkboxes", cb.id, "label", e.target.value)} style={{ ...inp, marginBottom: 5 }} /><textarea placeholder="Option A, Option B" value={typeof cb.options === "string" ? cb.options : (Array.isArray(cb.options) ? cb.options.join(", ") : "")} onChange={e => patchArr("checkboxes", cb.id, "options", e.target.value)} rows={2} style={{ ...inp, resize: "none", fontFamily: "inherit" }} /></FieldRow>)}
            </div>
          )}
        </div>
        <div style={{ padding: "11px 18px", borderTop: "1px solid #f0f2f5", display: "flex", gap: 9, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1.5px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.86rem", color: "#374151", fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSubmit} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: (needsApproval && !isEditing) || editNeedsApproval ? "#f59e0b" : "#0d9488", color: "#fff", cursor: "pointer", fontSize: "0.86rem", fontWeight: 700 }}>{editNeedsApproval ? "⚠ Submit Edit for Approval" : isEditing ? "Save Changes" : needsApproval ? "⚠ Submit for Approval" : "Create Task"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Approval Panel ---------- */
function ApprovalPanel({ tasks, users, onApprove, onReject, onClose }) {
  const pending = tasks.filter(t => t.approvalStatus === "pending");
  const getUserName = (id) => { if (id?.name) return id.name; const uid = id?._id || id?.id || id; const u = users.find(u => u.id === uid?.toString()); return u?.name || "Unknown"; };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both" }}>
      <div className="task-approval-panel" onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(95%, 460px)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,.18)", overflow: "hidden", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #f0f2f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.96rem", color: "#1a2233" }}>🛡 Approval Requests</div>
            <div style={{ fontSize: "0.71rem", color: "#9ca3af", marginTop: 2 }}>{pending.length} pending</div>
          </div>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}><FiX size={14} /></button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {pending.length === 0 ? <div style={{ textAlign: "center", padding: 36, color: "#9ca3af" }}><div style={{ fontSize: "2rem" }}>✅</div><div>No pending approvals</div></div> : pending.map(t => {
            const pCfg = PRIORITY[t.pendingUpdate?.changes?.priority || t.priority] || PRIORITY.medium;
            const assignees = (t.assignedTo || []).map(enrichUser).filter(Boolean);
            const isEditRequest = !!t.pendingUpdate?.changes;
            const pendingChanges = t.pendingUpdate?.changes || {};
            const proposedAssignees = Array.isArray(pendingChanges.assignedTo)
              ? pendingChanges.assignedTo.map(id => users.find(u => u.id === id?.toString())).filter(Boolean)
              : assignees;
            return (
              <div key={t._id || t.id} style={{ border: "1.5px solid #fcd34d44", borderRadius: 12, padding: 14, background: "#fef3c7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
                  <div>
                    <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#92400e", textTransform: "uppercase", marginBottom: 4 }}>{isEditRequest ? "Edit Request" : "New Task Request"}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1a2233" }}>{pendingChanges.title || t.title}</div>
                    {(pendingChanges.description ?? t.description) && <div style={{ fontSize: "0.74rem", color: "#6b7280", marginTop: 2 }}>{pendingChanges.description ?? t.description}</div>}
                  </div>
                  <span style={{ fontSize: "0.67rem", fontWeight: 700, background: pCfg.bg, color: pCfg.color, padding: "2px 8px", borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>{pCfg.label}</span>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: "0.73rem", color: "#6b7280", marginBottom: 10, flexWrap: "wrap" }}>
                  <span>👤 <strong style={{ color: "#374151" }}>{getUserName(isEditRequest ? t.pendingUpdate?.requestedBy : t.createdBy)}</strong></span>
                  <span>📅 <strong style={{ color: "#374151" }}>{fmtDate(pendingChanges.dueDate || t.dueDate)}</strong></span>
                  <span>👥 <strong style={{ color: "#374151" }}>{proposedAssignees.map(u => u.name).join(", ") || "—"}</strong></span>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button onClick={() => onApprove(t._id || t.id)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>✓ {isEditRequest ? "Approve Edit" : "Approve"}</button>
                  <button onClick={() => onReject(t._id || t.id)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #ef4444", background: "#fff", color: "#ef4444", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>✕ {isEditRequest ? "Reject Edit" : "Reject"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Chat Drawer ---------- */
function ChatDrawer({ task, currentUser, onClose, onStatusChange, onDelete, onDeleteResponse, saving, responseInput, setResponseInput, formValues, onFormChange, onSubmit, userTaskStatuses }) {
  const scrollRef = useRef(null);
  const responseFileInputRef = useRef(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("chat");
  const [taskAssigneeFilterState, setTaskAssigneeFilterState] = useState({ taskId: null, value: "all" });
  const [hoveredResponseId, setHoveredResponseId] = useState(null);
  const [deletingResponseId, setDeletingResponseId] = useState(null);
  const [uploadingResponseFile, setUploadingResponseFile] = useState(false);
  const [isRecordingResponseAudio, setIsRecordingResponseAudio] = useState(false);
  const [responseRecordingSeconds, setResponseRecordingSeconds] = useState(0);
  const responseMediaRecorderRef = useRef(null);
  const responseAudioChunksRef = useRef([]);
  const responseAudioStreamRef = useRef(null);
  const responseRecordingTimerRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [task?.responses]);
  useEffect(() => () => {
    clearInterval(responseRecordingTimerRef.current);
    responseAudioStreamRef.current?.getTracks?.().forEach(t => t.stop());
  }, []);

  if (!task) return null;

  const _isAdmin = isAdmin(currentUser);
  const isPending = task.approvalStatus === "pending";
  const overdue = isOverdue(task.dueDate, task.status);
  const pCfg = PRIORITY[task.priority] || PRIORITY.medium;
  const assignees = (task.assignedTo || []).map(enrichUser).filter(Boolean);
  const taskId = task._id || task.id;
  const reminderValues = taskReminderValues(task);
  const taskAssigneeFilter = taskAssigneeFilterState.taskId === taskId ? taskAssigneeFilterState.value : "all";
  const myStatusRec = userTaskStatuses.find(uts => uts.userId.toString() === currentUser?.id && uts.taskId.toString() === taskId.toString());
  const effectiveStatus = myStatusRec ? myStatusRec.status : task.status;

  const getAssigneeTaskStatus = (userId) => {
    const rec = userTaskStatuses.find(uts => uts.userId?.toString() === userId?.toString() && uts.taskId?.toString() === taskId?.toString());
    return rec ? rec.status : task.status;
  };
  const assigneeStatusCounts = assignees.reduce((acc, u) => {
    const status = getAssigneeTaskStatus(u.id);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { pending: 0, in_progress: 0, completed: 0, cancelled: 0 });
  const selectedTaskDone = assigneeStatusCounts.completed || 0;
  const selectedTaskRate = assignees.length ? Math.round((selectedTaskDone / assignees.length) * 100) : 0;
  const visibleAssignees = taskAssigneeFilter === "all" ? assignees : assignees.filter(u => getAssigneeTaskStatus(u.id) === taskAssigneeFilter);

  const openUserDetailPage = (userId) => {
    if (!userId) return;
    router.push(`/task/user/${encodeURIComponent(userId)}?taskId=${encodeURIComponent(taskId)}`);
  };
  const handleDeleteResponse = async (responseId) => {
    if (!responseId || deletingResponseId) return;
    if (!window.confirm("Delete this message?")) return;
    setDeletingResponseId(responseId);
    try {
      await onDeleteResponse(taskId, responseId);
    } finally {
      setDeletingResponseId(null);
    }
  };

  const handleResponseFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingResponseFile(true);
    try { const uploaded = await uploadTaskFile(file); await onSubmit([uploaded]); }
    catch { alert("Failed to upload attachment"); }
    finally { setUploadingResponseFile(false); }
  };

  const stopResponseAudioTracks = () => {
    responseAudioStreamRef.current?.getTracks?.().forEach(t => t.stop());
    responseAudioStreamRef.current = null;
  };
  const uploadResponseVoiceBlob = async (blob) => {
    const file = new File([blob], `task_response_${Date.now()}.webm`, { type: blob.type || "audio/webm" });
    setUploadingResponseFile(true);
    try { const uploaded = await uploadTaskFile(file); await onSubmit([uploaded]); }
    catch { alert("Failed to send voice response"); }
    finally { setUploadingResponseFile(false); }
  };
  const startResponseAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      responseAudioStreamRef.current = stream;
      responseAudioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      responseMediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) responseAudioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(responseAudioChunksRef.current, { type: "audio/webm" });
        responseAudioChunksRef.current = [];
        stopResponseAudioTracks();
        if (blob.size > 0) uploadResponseVoiceBlob(blob);
      };
      recorder.start();
      setIsRecordingResponseAudio(true);
      setResponseRecordingSeconds(0);
      responseRecordingTimerRef.current = setInterval(() => setResponseRecordingSeconds(s => s + 1), 1000);
    } catch { alert("Microphone access is required to record audio"); }
  };
  const stopResponseAudioRecording = () => {
    responseMediaRecorderRef.current?.stop();
    responseMediaRecorderRef.current = null;
    clearInterval(responseRecordingTimerRef.current);
    responseRecordingTimerRef.current = null;
    setIsRecordingResponseAudio(false);
  };

  const isLocked = isPending && !_isAdmin;

  return (
    <>
      {/* backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 800, backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", animation: "appModalBackdropIn 0.28s ease-out both" }} />

      {/* drawer */}
      <div className="task-drawer" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(100%, 480px)", background: "#f8fafc", zIndex: 900, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,.10)", animation: "slideInRight .25s ease", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

        {/* ── Header ── */}
        <div className="task-drawer-header" style={{ background: "#fff", borderBottom: "1px solid #f0f2f5", flexShrink: 0 }}>

          {/* row 1: close + title + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 16px 10px" }}>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}>
              <FiX size={14} />
            </button>
            <span style={{ flex: 1, fontSize: "0.94rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.isPersonal ? "🔒 " : ""}{task.title}
            </span>
            {/* priority badge */}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, background: pCfg.bg, color: pCfg.color, fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
              {task.priority === "high" ? <FiAlertTriangle size={10} /> : task.priority === "medium" ? <FiCalendar size={10} /> : null}
              {pCfg.label}
            </span>
            {/* overdue badge */}
            {overdue && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                <FiClock size={10} /> Overdue
              </span>
            )}
            {isPending && <ApprovalBadge compact />}
          </div>

          {/* row 2: status pill + due + delete */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 12px", flexWrap: "nowrap" }}>
            <div style={{ pointerEvents: isLocked ? "none" : "auto" }}>
              <StatusPill status={effectiveStatus} onChange={s => onStatusChange(taskId, s)} readonly={isLocked} />
            </div>
            {task.dueDate && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: overdue ? "#ef4444" : "#6b7280", whiteSpace: "nowrap" }}>
                <FiCalendar size={11} /> {fmtDate(task.dueDate)}
              </span>
            )}
            {_isAdmin && (
              <button onClick={() => onDelete(taskId)} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 8, border: "1px solid #fecaca", background: "#fee2e2", color: "#dc2626", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                <FiTrash2 size={11} /> Delete
              </button>
            )}
          </div>

          {isLocked && (
            <div style={{ margin: "0 16px 10px", padding: "7px 11px", background: "#fef9ec", border: "1px solid #fcd34d55", borderRadius: 8, fontSize: "0.71rem", color: "#92400e", fontWeight: 600 }}>
              🔒 Awaiting admin approval — read only.
            </div>
          )}

          {/* tabs */}
          <div style={{ display: "flex", borderTop: "1px solid #f0f2f5" }}>
            {[["chat", FiMessageSquare, "Chat"], ["details", FiList, "Details"]].map(([id, Icon, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "transparent", color: activeTab === id ? "#0d9488" : "#9ca3af", borderBottom: activeTab === id ? "2px solid #0d9488" : "2px solid transparent", transition: "all .15s" }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat Tab ── */}
        {activeTab === "chat" && (
          <>
            {/* description card */}
            {(task.description || task.attachments?.length > 0) && (
              <div className="task-description-card" style={{ margin: "14px 12px 0", padding: "14px 16px", background: "linear-gradient(135deg, #ecfdf5 0%, #dff7f0 100%)", border: "1px solid #6ee7b7", borderRadius: 14, flexShrink: 0, boxShadow: "0 8px 22px rgba(13,148,136,.08)" }}>
                {task.description && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0d9488", boxShadow: "0 0 0 4px rgba(13,148,136,.12)" }} />
                      <div className="task-description-title" style={{ fontSize: "0.66rem", fontWeight: 800, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</div>
                    </div>
                    <div className="task-description-text" style={{ fontSize: "0.87rem", color: "#064e3b", lineHeight: 1.6, marginBottom: task.attachments?.length ? 12 : 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{task.description}</div>
                  </>
                )}
                {task.attachments?.length > 0 && (
                  <div style={{ marginTop: task.description ? 2 : 0 }}>
                    {!task.description && <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Voice Note</div>}
                    {task.attachments.map((file, i) => {
                      const type = attachmentType(file);
                      const url = attachmentUrl(file);
                      const name = attachmentName(file);
                      if (type === "audio") return <AudioPlayer key={i} src={url} variant="card" />;
                      return <TaskAttachmentBubble key={i} file={file} />;
                    })}
                  </div>
                )}
              </div>
            )}

            <TaskFormElements task={task} values={formValues} onSubmit={onSubmit} onChange={onFormChange} readonly={isLocked} />

            {/* messages */}
            <div ref={scrollRef} className="task-chat-messages" style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {(!task.responses || task.responses.length === 0) ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#9ca3af", padding: 36 }}>
                  <FiMessageSquare size={28} strokeWidth={1.5} />
                  <span style={{ fontSize: "0.84rem" }}>No responses yet</span>
                </div>
              ) : task.responses.map(resp => {
                const sender = enrichUser(resp.userId);
                const isMine = sender?.id === currentUser?.id;
                const hasText = !!resp.message;
                const hasAttachments = resp.attachments?.length > 0;
                const responseId = resp._id || resp.id;
                const showDelete = isMine && hoveredResponseId === responseId;
                const isDeleting = deletingResponseId === responseId;

                return (
                  <div
                    key={responseId}
                    onMouseEnter={() => setHoveredResponseId(responseId)}
                    onMouseLeave={() => setHoveredResponseId(null)}
                    style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", gap: 2 }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, flexDirection: isMine ? "row-reverse" : "row" }}>
                      <Avatar user={sender} size={27} />
                      <div className={`task-message-stack ${isMine ? "mine" : "theirs"}`} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", gap: 4, maxWidth: "82%", minWidth: 0 }}>
                        {!isMine && (
                          <span className="task-sender-name" style={{
                            maxWidth: 170,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: sender?.color ? `${sender.color}18` : "#eef2ff",
                            color: sender?.color || "#4f46e5",
                            fontSize: "0.64rem",
                            fontWeight: 800,
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flexShrink: 0,
                          }}>{sender?.name || "Unknown"}</span>
                        )}
                        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4, maxWidth: "100%", alignItems: isMine ? "flex-end" : "flex-start", paddingTop: isMine ? 4 : 0 }}>
                        {hasText && (
                          <div className={`task-message-bubble ${isMine ? "mine" : "theirs"}`} style={{
                            padding: "8px 13px",
                            borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            background: isMine ? "#ccfbf1" : "#fff",
                            border: isMine ? "1px solid #9FE1CB" : "1px solid #e5e7eb",
                            fontSize: "0.86rem", color: isMine ? "#085041" : "#1a2233",
                            lineHeight: 1.45,
                          }}>
                            {resp.message}
                          </div>
                        )}
                        {hasAttachments && resp.attachments.map((file, idx) => {
                          const type = attachmentType(file);
                          const url = attachmentUrl(file);
                          const name = attachmentName(file);
                          if (type === "audio") return <AudioPlayer key={idx} src={url} isMine={isMine} />;
                          return <TaskAttachmentBubble key={idx} file={file} isMine={isMine} />;
                        })}
                        {resp.formData && <FormDataSummary formData={resp.formData} task={task} />}
                        <div className="task-message-time" style={{ fontSize: "0.63rem", color: "#9ca3af", display: "flex", alignItems: "center", gap: 3, paddingLeft: isMine ? 0 : 2, paddingRight: isMine ? 2 : 0 }}>
                          {fmt(resp.createdAt || resp.timestamp)}
                          {isMine && <span style={{ color: "#0d9488", fontSize: "0.72rem" }}>✓✓</span>}
                        </div>
                          {isMine && (
                            <button
                              type="button"
                              title="Delete message"
                              onClick={() => handleDeleteResponse(responseId)}
                              disabled={isDeleting}
                              style={{
                                position: "absolute",
                                top: -7,
                                right: -9,
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                border: "1px solid #fecaca",
                                background: "#fff",
                                color: "#ef4444",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: isDeleting ? "not-allowed" : "pointer",
                                opacity: showDelete || isDeleting ? 1 : 0,
                                transform: showDelete || isDeleting ? "scale(1)" : "scale(.92)",
                                transition: "opacity .16s ease, transform .16s ease, background .16s ease",
                                boxShadow: "0 4px 12px rgba(239,68,68,.16)",
                                zIndex: 2,
                                pointerEvents: showDelete || isDeleting ? "auto" : "none",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
                            >
                              <FiTrash2 size={13} />
                            </button>
                          )}
                        </div>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>

            {/* input bar */}
            <div className="task-chat-composer" style={{ padding: "10px 12px", borderTop: "1px solid #f0f2f5", background: "#fff", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <input ref={responseFileInputRef} type="file" accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip" hidden onChange={handleResponseFilePick} />

              {/* attach */}
              <button className="task-composer-icon" onClick={() => responseFileInputRef.current?.click()} disabled={saving || uploadingResponseFile || isLocked} title="Attach file"
                style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#f8fafc", color: "#6b7280", cursor: saving || uploadingResponseFile || isLocked ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiPaperclip size={15} />
              </button>

              {/* mic / recording */}
              <button
                className="task-composer-icon"
                onClick={isRecordingResponseAudio ? stopResponseAudioRecording : startResponseAudioRecording}
                disabled={saving || uploadingResponseFile || isLocked}
                title={isRecordingResponseAudio ? "Stop recording" : "Record audio"}
                style={{
                  minWidth: isRecordingResponseAudio ? 78 : 36, height: 36,
                  borderRadius: 999,
                  border: isRecordingResponseAudio ? "1px solid #fecaca" : "1px solid #e5e7eb",
                  background: isRecordingResponseAudio ? "#fee2e2" : "#f8fafc",
                  color: isRecordingResponseAudio ? "#dc2626" : "#6b7280",
                  cursor: saving || uploadingResponseFile || isLocked ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  flexShrink: 0, fontSize: "0.72rem", fontWeight: 700,
                }}>
                <FiMic size={15} />
                {isRecordingResponseAudio && formatDuration(responseRecordingSeconds)}
              </button>

              {/* text input */}
              <input
                className="task-response-input"
                value={responseInput}
                onChange={e => setResponseInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && !isLocked && onSubmit()}
                placeholder={isLocked ? "Awaiting approval…" : "Write a response…"}
                disabled={isLocked || isRecordingResponseAudio}
                style={{ flex: 1, height: 38, borderRadius: 999, border: "1px solid #e5e7eb", padding: "0 14px", fontSize: "0.86rem", outline: "none", color: "#1a2233", background: isLocked ? "#f9fafb" : "#fff" }}
              />

              {/* send */}
              <button className="task-send-button" onClick={() => onSubmit()} disabled={saving || uploadingResponseFile || isRecordingResponseAudio || isLocked}
                style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: saving || uploadingResponseFile || isRecordingResponseAudio || isLocked ? "#a7f3d0" : "#0d9488", color: "#fff", cursor: saving || uploadingResponseFile || isRecordingResponseAudio || isLocked ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiSend size={14} />
              </button>
            </div>
          </>
        )}

        {/* ── Details Tab ── */}
        {activeTab === "details" && (
          <div className="task-details-panel" style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* assignees card */}
            <div className="task-details-card" style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #f0f2f5" }}>
              <div style={{ fontSize: "0.67rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Assigned To</div>
              {/* progress */}
              <div className="task-progress-card" style={{ padding: "10px 12px", background: "#f9fafb", border: "1px solid #f0f2f5", borderRadius: 9, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>Task progress</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: selectedTaskRate >= 70 ? "#10b981" : selectedTaskRate >= 40 ? "#f59e0b" : "#ef4444" }}>{selectedTaskDone}/{assignees.length} · {selectedTaskRate}%</span>
                </div>
                <div style={{ height: 6, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${selectedTaskRate}%`, background: selectedTaskRate >= 70 ? "#10b981" : selectedTaskRate >= 40 ? "#f59e0b" : "#ef4444", borderRadius: 999 }} />
                </div>
              </div>
              {/* filter tabs */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                {[["all","All"], ["completed","Done"], ["pending","Pending"], ["in_progress","Active"], ["cancelled","Cancelled"]].map(([id, label]) => {
                  const active = taskAssigneeFilter === id;
                  const count = id === "all" ? assignees.length : (assigneeStatusCounts[id] || 0);
                  const cfg = STATUS[id] || { color: "#0d9488", bg: "#ccfbf1" };
                  return (
                    <button key={id} className={`task-assignee-filter ${active ? "active" : ""}`} onClick={() => setTaskAssigneeFilterState({ taskId, value: id })}
                      style={{ border: `1px solid ${active ? cfg.color : "#e5e7eb"}`, background: active ? cfg.bg : "#fff", color: active ? cfg.color : "#6b7280", borderRadius: 999, padding: "4px 10px", fontSize: "0.71rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
              {/* assignee list */}
              {assignees.length === 0 ? (
                <div style={{ fontSize: "0.83rem", color: "#9ca3af", textAlign: "center", padding: 16 }}>No users assigned</div>
              ) : visibleAssignees.length === 0 ? (
                <div style={{ fontSize: "0.83rem", color: "#9ca3af", textAlign: "center", padding: 16 }}>No assignees in this status</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {visibleAssignees.map(u => {
                    const userTaskStatus = getAssigneeTaskStatus(u.id);
                    return (
                      <div key={u.id} className="task-assignee-row" onClick={() => openUserDetailPage(u.id)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 10, border: "1px solid #f0f2f5", cursor: "pointer", background: "#fff" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f0fdf9"; e.currentTarget.style.borderColor = "#a7f3d0"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#f0f2f5"; }}>
                        <Avatar user={u} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a2233", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "#9ca3af", textTransform: "capitalize" }}>{u.role}</div>
                        </div>
                        <UserStatusTrail status={userTaskStatus} />
                        <FiChevronRight size={14} color="#d1d5db" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* meta info */}
            <div className="task-details-card task-meta-card" style={{ background: "#fff", borderRadius: 12, padding: "4px 6px", border: "1px solid #f0f2f5" }}>
              {[
                task.createdBy && { icon: <FiUser size={13} />, label: "Created by", val: enrichUser(task.createdBy)?.name },
                task.approvalStatus && { icon: <FiShield size={13} />, label: "Approval", val: task.approvalStatus === "pending" ? "⏳ Pending" : task.approvalStatus === "approved" ? "✅ Approved" : "❌ Rejected" },
                { icon: <FiCalendar size={13} />, label: "Due date", val: fmtDate(task.dueDate) },
                reminderValues.length > 0 && {
                  icon: <FiBell size={13} />,
                  label: "Reminders",
                  val: reminderValues.map(value => new Date(value).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })).join(", "),
                },
                { icon: <FiClock size={13} />, label: "Created", val: new Date(task.createdAt).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
                { icon: <FiMessageSquare size={13} />, label: "Responses", val: task.responses?.length || 0 },
              ].filter(Boolean).map(({ icon, label, val }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 8px", borderBottom: "1px solid #f9fafb" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.78rem", color: "#6b7280", fontWeight: 500 }}>{icon} {label}</span>
                  <span style={{ fontSize: "0.8rem", color: "#1a2233", fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── MAIN PAGE ── */
export default function TaskPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [responseInput, setResponseInput] = useState("");
 const [tab, setTab] = useState("team");
const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formValues, setFormValues] = useState({ inputFields: {}, dropdownSelections: {}, quickReplySelected: "", checkboxSelections: {} });
  const [sortKey, setSortKey] = useState("dueDate");
  const [sortDir, setSortDir] = useState("asc");
  const [userTaskStatuses, setUserTaskStatuses] = useState([]);
  const notifRef = useRef(null);

  // -- auth --
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) { try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentUser(enrichUser(JSON.parse(userStr)));
    } catch { } }
    else { API.get("/users/me").then(res => { if (res.data.success) setCurrentUser(enrichUser(res.data.data)); }).catch(() => { }); }
  }, []);

  // -- fetch tasks, notifications, user statuses --
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const [tRes, nRes, utsRes] = await Promise.all([API.get("/tasks"), API.get("/tasks/notifications"), API.get("/tasks/user-statuses")]);
        if (tRes.data.success) setTasks(tRes.data.data);
        if (nRes.data.success) setNotifications(nRes.data.data);
        if (utsRes.data.success) setUserTaskStatuses(utsRes.data.data);
      } catch { setError("Failed to load tasks."); }
      setIsLoading(false);
    })();
  }, [currentUser]);

  useEffect(() => { API.get("/users").then(res => { if (res.data.success) setUsers(res.data.data.map(enrichUser)); }).catch(() => { }); }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const socket = getSocket();
    const join = () => socket.emit("joinUserIdRoom", currentUser.id);
    if (socket.connected) join();
    else socket.once("connect", join);
    if (!socket.connected) socket.connect();

    const upsertTask = (task) => {
      if (!task) return;
      const taskId = task._id || task.id;
      setTasks(prev => {
        const exists = prev.some(t => (t._id || t.id) === taskId);
        return exists ? prev.map(t => ((t._id || t.id) === taskId ? task : t)) : [task, ...prev];
      });
      setSelectedTask(prev => ((prev?._id || prev?.id) === taskId ? task : prev));
    };
    const removeTask = ({ taskId }) => {
      setTasks(prev => prev.filter(t => (t._id || t.id) !== taskId));
      setSelectedTask(prev => ((prev?._id || prev?.id) === taskId ? null : prev));
    };
    const upsertNotification = (notif) => {
      if (!notif) return;
      const notifUserId = (notif.userId?._id || notif.userId)?.toString();
      if (notifUserId && notifUserId !== currentUser.id) return;
      const safeNotif = {
        ...notif,
        _id: notif._id || notif.id || `temp-${Date.now()}`,
        read: notif.read ?? false,
        createdAt: notif.createdAt || notif.timestamp || new Date().toISOString(),
      };
      setNotifications(prev => {
        const exists = prev.some(n => (n._id || n.id)?.toString() === safeNotif._id.toString());
        if (exists) return prev.map(n => ((n._id || n.id)?.toString() === safeNotif._id.toString() ? { ...n, ...safeNotif } : n));
        return [safeNotif, ...prev];
      });
    };

    socket.on("newTask", upsertTask);
    socket.on("taskUpdated", upsertTask);
    socket.on("taskResponse", upsertTask);
    socket.on("taskDeleted", removeTask);
    socket.on("newNotification", upsertNotification);

    return () => {
      socket.off("connect", join);
      socket.off("newTask", upsertTask);
      socket.off("taskUpdated", upsertTask);
      socket.off("taskResponse", upsertTask);
      socket.off("taskDeleted", removeTask);
      socket.off("newNotification", upsertNotification);
    };
  }, [currentUser?.id]);

  // -- dispatch events for layout --
  useEffect(() => { if (selectedTask) window.dispatchEvent(new CustomEvent("detailViewOpen")); else window.dispatchEvent(new CustomEvent("detailViewClose")); }, [selectedTask]);
  useEffect(() => () => window.dispatchEvent(new CustomEvent("detailViewClose")), []);

  // -- close notif panel on outside click --
  useEffect(() => {
    const fn = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selectedTaskId = selectedTask?._id || selectedTask?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormValues({ inputFields: {}, dropdownSelections: {}, quickReplySelected: "", checkboxSelections: {} });
  }, [selectedTaskId]);

  const handleFormChange = useCallback((type, id, value, checked) => {
    if (type === "quickReply") setFormValues(p => ({ ...p, quickReplySelected: p.quickReplySelected === id ? "" : id }));
    else if (type === "inputField") setFormValues(p => ({ ...p, inputFields: { ...p.inputFields, [id]: value } }));
    else if (type === "dropdown") setFormValues(p => ({ ...p, dropdownSelections: { ...p.dropdownSelections, [id]: value } }));
    else if (type === "checkbox") setFormValues(p => { const cur = p.checkboxSelections[id] || []; return { ...p, checkboxSelections: { ...p.checkboxSelections, [id]: checked ? [...cur, value] : cur.filter(v => v !== value) } }; });
  }, []);

  const handleCreate = useCallback(async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, approvalStatus: form.needsApproval ? "pending" : "approved" };
      delete payload.needsApproval;
      const res = await API.post("/tasks", payload);
      if (res.data.success) { setTasks(p => [res.data.data, ...p]); setSelectedTask(res.data.data); }
      else setError(res.data.message || "Failed to create task");
    } catch { setError("Network error"); }
    setSaving(false);
  }, []);

  const handleUpdate = useCallback(async (taskId, form) => {
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.needsApproval;
      const res = await API.put(`/tasks/${taskId}`, payload);
      if (res.data.success) {
        setTasks(p => p.map(t => ((t._id || t.id) === taskId ? res.data.data : t)));
        if ((selectedTask?._id || selectedTask?.id) === taskId) setSelectedTask(res.data.data);
      } else {
        setError(res.data.message || "Failed to update task");
      }
    } catch {
      setError("Failed to update task");
    }
    setSaving(false);
  }, [selectedTask]);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    if (isAdmin(currentUser)) {
      try { const res = await API.patch(`/tasks/${taskId}/status`, { status: newStatus }); if (res.data.success) { setTasks(p => p.map(t => ((t._id || t.id) === taskId ? res.data.data : t))); if ((selectedTask?._id || selectedTask?.id) === taskId) setSelectedTask(res.data.data); } } catch { setError("Failed to update status"); }
    } else {
      try { const res = await API.patch(`/tasks/${taskId}/user-status`, { status: newStatus }); if (res.data.success) { const record = res.data.data; setUserTaskStatuses(prev => { const filtered = prev.filter(r => !(r.userId.toString() === currentUser.id && r.taskId.toString() === taskId.toString())); return [...filtered, record]; }); } } catch { setError("Failed to update your progress"); }
    }
  }, [currentUser, selectedTask]);

  const handleApprove = useCallback(async (taskId) => {
    try { const res = await API.patch(`/tasks/${taskId}/approve`, { approvalStatus: "approved" }); if (res.data.success) setTasks(p => p.map(t => ((t._id || t.id) === taskId ? res.data.data : t))); else setTasks(p => p.map(t => ((t._id || t.id) === taskId ? { ...t, approvalStatus: "approved" } : t))); } catch { setTasks(p => p.map(t => ((t._id || t.id) === taskId ? { ...t, approvalStatus: "approved" } : t))); }
  }, []);

  const handleReject = useCallback(async (taskId) => {
    const task = tasks.find(t => (t._id || t.id) === taskId);
    const isEditRequest = !!task?.pendingUpdate?.changes;
    if (!window.confirm(isEditRequest ? "Reject this task edit request?" : "Reject and delete this task request?")) return;
    try {
      const res = await API.patch(`/tasks/${taskId}/approve`, { approvalStatus: "rejected" });
      if (res.data?.data) {
        setTasks(p => p.map(t => ((t._id || t.id) === taskId ? res.data.data : t)));
      } else {
        setTasks(p => p.filter(t => (t._id || t.id) !== taskId));
      }
    } catch {
      setError("Failed to reject task request");
    }
  }, [tasks]);

  const handleDelete = useCallback(async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try { await API.delete(`/tasks/${taskId}`); setTasks(p => p.filter(t => (t._id || t.id) !== taskId)); if ((selectedTask?._id || selectedTask?.id) === taskId) setSelectedTask(null); } catch { setError("Failed to delete task"); }
  }, [selectedTask]);

  const selectedTaskLive = useMemo(() => tasks.find(t => (t._id || t.id) === (selectedTask?._id || selectedTask?.id)) || selectedTask, [tasks, selectedTask]);

  const handleResponse = useCallback(async (attachments = []) => {
    const taskId = selectedTaskLive?._id || selectedTaskLive?.id;
    if (!taskId) return;
    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    const hasText = responseInput.trim().length > 0;
    const hasForm = formValues.quickReplySelected || Object.values(formValues.inputFields).some(Boolean) || Object.values(formValues.dropdownSelections).some(Boolean) || Object.values(formValues.checkboxSelections).some(arr => arr.length > 0);
    const hasAttachments = safeAttachments.length > 0;
    if (!hasText && !hasForm && !hasAttachments) return;
    const formData = { inputFields: Object.entries(formValues.inputFields).map(([id, value]) => ({ id, value })), dropdownSelections: Object.entries(formValues.dropdownSelections).map(([id, selected]) => ({ id, selected })), quickReplySelected: formValues.quickReplySelected, checkboxSelections: Object.entries(formValues.checkboxSelections).map(([id, selected]) => ({ id, selected })) };
    setSaving(true);
    try {
      setError("");
      const res = await API.post(`/tasks/${taskId}/response`, { message: responseInput.trim(), formData, attachments: safeAttachments });
      if (res.data?.success && res.data?.data) { setTasks(p => p.map(t => ((t._id || t.id) === taskId ? res.data.data : t))); setSelectedTask(res.data.data); setResponseInput(""); setFormValues({ inputFields: {}, dropdownSelections: {}, quickReplySelected: "", checkboxSelections: {} }); }
      else setError(res.data?.error || res.data?.message || "Failed to send response");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to send response");
    } finally {
      setSaving(false);
    }
  }, [responseInput, formValues, selectedTaskLive]);

  const handleDeleteResponse = useCallback(async (taskId, responseId) => {
    if (!taskId || !responseId) return;
    try {
      const res = await API.delete(`/tasks/${taskId}/response/${responseId}`);
      if (res.data.success) {
        setTasks(p => p.map(t => ((t._id || t.id) === taskId ? res.data.data : t)));
        if ((selectedTask?._id || selectedTask?.id) === taskId) setSelectedTask(res.data.data);
      }
    } catch {
      setError("Failed to delete message");
    }
  }, [selectedTask]);

  const handleReadNotif = useCallback(async (id) => {
    if (id === "all") { await API.patch("/tasks/notifications/read-all"); setNotifications(p => p.map(n => ({ ...n, read: true }))); }
    else { await API.patch(`/tasks/notifications/${id}/read`); setNotifications(p => p.map(n => ((n._id || n.id) === id ? { ...n, read: true } : n))); }
  }, []);

  const unreadCount = notifications.filter(n => !n.read && (n.userId?._id || n.userId)?.toString() === currentUser?.id).length;
  const pendingApprovals = tasks.filter(t => t.approvalStatus === "pending");

const visibleTasks = useMemo(() => {
  let list = tasks.filter(task => {
    const myId = currentUser?.id;
    const isAssigned = task.assignedTo?.some(u => (u._id || u.id || u)?.toString() === myId);
    const isPersonalMine = task.isPersonal && (task.createdBy?._id || task.createdBy?.id || task.createdBy)?.toString() === myId;
    const isCreatorMgr = isManager(currentUser) && (task.createdBy?._id || task.createdBy?.id || task.createdBy)?.toString() === myId;

    if (tab === "my") {
  if (!isAssigned && !isPersonalMine && !isCreatorMgr) return false;
} else {
  // hide all personal tasks from team tab
  if (task.isPersonal) return false;
  if (!isAdmin(currentUser) && !isAssigned && !isCreatorMgr) return false;
}

    const effectiveStatus = (() => {
      if (isAdmin(currentUser)) return task.status;
      const rec = userTaskStatuses.find(
        uts => uts.userId.toString() === myId && uts.taskId.toString() === (task._id || task.id).toString()
      );
      return rec ? rec.status : task.status;
    })();

    if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
    if (search && !task.title?.toLowerCase().includes(search.toLowerCase()) &&
        !task.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  list = [...list].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "title") cmp = (a.title || "").localeCompare(b.title || "");
    if (sortKey === "priority") cmp = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    if (sortKey === "status") cmp = (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2);
    if (sortKey === "dueDate") cmp = new Date(a.dueDate || "9999") - new Date(b.dueDate || "9999");
    return sortDir === "asc" ? cmp : -cmp;
  });

  return list;
}, [tasks, currentUser, tab, statusFilter, search, sortKey, sortDir, userTaskStatuses]);

  const handleSort = (key) => { if (sortKey === key) setSortDir(p => p === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("asc"); } };
  const SortIcon = ({ col }) => { if (sortKey !== col) return <span style={{ color: "#d1d5db", fontSize: "0.6rem" }}>↕</span>; return <span style={{ color: "#0d9488", fontSize: "0.6rem" }}>{sortDir === "asc" ? "↑" : "↓"}</span>; };

  if (!currentUser) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", color: "#6b7280", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>Loading…</div>;

  const _isAdmin = isAdmin(currentUser);
  const _isManager = isManager(currentUser);

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }

        .task-shell-new {
          background: radial-gradient(circle at top left, rgba(15, 95, 100, 0.06), transparent 22%),
                      radial-gradient(circle at top right, rgba(34, 197, 94, 0.05), transparent 20%),
                      linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          min-height: calc(100vh - 70px);
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          position: fixed;
          top: 70px; left: 88px; right: 0; bottom: 0;
          overflow-y: auto;
        }
        .premium-card {
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(15,23,42,0.05);
          box-shadow: 0 16px 40px rgba(15,23,42,0.08);
          border-radius: 24px;
        }
        .hero-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(15,95,100,0.08);
          color: #0f5f64;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .hero-title {
          font-size: 28px;
          font-weight: 800;
          line-height: 1.2;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .hero-subtitle {
          font-size: 13px;
          color: #64748b;
          line-height: 1.7;
          margin: 0;
        }
        .cta-btn {
          min-width: 160px;
          height: 42px;
          border: none;
          border-radius: 999px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          background: linear-gradient(135deg, #0f5f64 0%, #14808a 60%, #22c55e 100%);
          
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .toolbar-card {
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(15,23,42,0.05);
          box-shadow: 0 12px 28px rgba(15,23,42,0.06);
          border-radius: 22px;
          padding: 16px;
        }
        .search-wrap {
          position: relative;
          width: 100%;
        }
        .search-input {
          height: 46px;
          border-radius: 14px;
          border: 1px solid #dbe3eb;
          background: #ffffff;
          padding-left: 42px;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          box-shadow: 0 2px 8px rgba(15,23,42,0.04);
          width: 100%;
        }
        .filter-pill {
          height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid #dbe3eb;
          background: #fff;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .filter-pill-active {
          color: #fff;
          border: none;
          background: linear-gradient(135deg, #0f5f64 0%, #14808a 60%, #22c55e 100%);
          box-shadow: 0 10px 20px rgba(15,95,100,0.16);
        }

        .desktop-table-view { display: block; }
        .mobile-card-view   { display: none; flex-direction: column; gap: 10px; }
        @media (max-width: 767px) {
          .desktop-table-view { display: none; }
          .mobile-card-view   { display: flex; }
        }
        @media (max-width: 820px) {
          .task-shell-new { top: 60px; left: 0; }
        }
        .tr-hover:hover td { background: #f0fdf4 !important; }
        body[data-theme="dark"] .task-shell-new {
          background: #0b141a !important;
          color: #e9edef;
        }
        body[data-theme="dark"] .task-shell-new .toolbar-card,
        body[data-theme="dark"] .task-shell-new .desktop-table-view > div,
        body[data-theme="dark"] .task-shell-new .mobile-card-view > div {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.18) !important;
        }
        body[data-theme="dark"] .task-shell-new .search-input,
        body[data-theme="dark"] .task-shell-new .filter-pill {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
          box-shadow: none !important;
        }
        body[data-theme="dark"] .task-shell-new .search-input::placeholder {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .task-shell-new .filter-pill:not(.filter-pill-active) {
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-shell-new [style*="background: #f3f4f6"],
        body[data-theme="dark"] .task-shell-new [style*="background: rgb(243, 244, 246)"],
        body[data-theme="dark"] .task-shell-new [style*="background: #f9fafb"],
        body[data-theme="dark"] .task-shell-new [style*="background: rgb(249, 250, 251)"] {
          background: #202c33 !important;
        }
        body[data-theme="dark"] .task-shell-new table,
        body[data-theme="dark"] .task-shell-new tbody,
        body[data-theme="dark"] .task-shell-new tr,
        body[data-theme="dark"] .task-shell-new td {
          background: #111b21 !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-shell-new thead tr,
        body[data-theme="dark"] .task-shell-new th {
          background: #202c33 !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-shell-new .tr-hover:hover td {
          background: #202c33 !important;
        }
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: #1a2233"],
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: rgb(26, 34, 51)"],
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: #111827"],
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: rgb(17, 24, 39)"],
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: #374151"],
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: rgb(55, 65, 81)"] {
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: #6b7280"],
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: rgb(107, 114, 128)"],
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: #9ca3af"],
        body[data-theme="dark"] .task-shell-new :is(td, th, div, span, input, button)[style*="color: rgb(156, 163, 175)"] {
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-drawer,
        body[data-theme="dark"] .task-create-modal,
        body[data-theme="dark"] .task-approval-panel {
          background: #111b21 !important;
          color: #e9edef !important;
          border-color: #2a3942 !important;
          box-shadow: -12px 0 48px rgba(0,0,0,0.35) !important;
        }
        body[data-theme="dark"] .task-drawer [style*="background: #fff"],
        body[data-theme="dark"] .task-drawer [style*="background: rgb(255, 255, 255)"],
        body[data-theme="dark"] .task-create-modal [style*="background: #fff"],
        body[data-theme="dark"] .task-create-modal [style*="background: rgb(255, 255, 255)"],
        body[data-theme="dark"] .task-approval-panel [style*="background: #fff"],
        body[data-theme="dark"] .task-approval-panel [style*="background: rgb(255, 255, 255)"] {
          background: #111b21 !important;
        }
        body[data-theme="dark"] .task-drawer [style*="background: #f9fafb"],
        body[data-theme="dark"] .task-drawer [style*="background: rgb(249, 250, 251)"],
        body[data-theme="dark"] .task-drawer [style*="background: #f3f4f6"],
        body[data-theme="dark"] .task-drawer [style*="background: rgb(243, 244, 246)"],
        body[data-theme="dark"] .task-create-modal [style*="background: #f9fafb"],
        body[data-theme="dark"] .task-create-modal [style*="background: rgb(249, 250, 251)"],
        body[data-theme="dark"] .task-create-modal [style*="background: #f3f4f6"],
        body[data-theme="dark"] .task-create-modal [style*="background: rgb(243, 244, 246)"],
        body[data-theme="dark"] .task-create-modal [style*="background: #e5e7eb"],
        body[data-theme="dark"] .task-create-modal [style*="background: rgb(229, 231, 235)"],
        body[data-theme="dark"] .task-create-modal [style*="background: transparent"],
        body[data-theme="dark"] .task-approval-panel [style*="background: #f9fafb"],
        body[data-theme="dark"] .task-approval-panel [style*="background: rgb(249, 250, 251)"],
        body[data-theme="dark"] .task-approval-panel [style*="background: #f3f4f6"],
        body[data-theme="dark"] .task-approval-panel [style*="background: rgb(243, 244, 246)"] {
          background: #202c33 !important;
        }
        body[data-theme="dark"] .task-drawer [style*="background: #ccfbf1"],
        body[data-theme="dark"] .task-drawer [style*="background: rgb(204, 251, 241)"],
        body[data-theme="dark"] .task-create-modal [style*="background: #ccfbf1"],
        body[data-theme="dark"] .task-create-modal [style*="background: rgb(204, 251, 241)"] {
          background: #005c4b !important;
          border-color: #0a7c68 !important;
        }
        body[data-theme="dark"] .task-approval-panel [style*="background: #fef3c7"],
        body[data-theme="dark"] .task-approval-panel [style*="background: rgb(254, 243, 199)"] {
          background: #332701 !important;
          border-color: #8a6d1e !important;
        }
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: #1a2233"],
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: rgb(26, 34, 51)"],
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: #111827"],
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: rgb(17, 24, 39)"],
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: #374151"],
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: rgb(55, 65, 81)"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: #1a2233"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: rgb(26, 34, 51)"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: #111827"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: rgb(17, 24, 39)"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: #374151"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: rgb(55, 65, 81)"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: #1a2233"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: rgb(26, 34, 51)"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: #111827"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: rgb(17, 24, 39)"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: #374151"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: rgb(55, 65, 81)"] {
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: #6b7280"],
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: rgb(107, 114, 128)"],
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: #9ca3af"],
        body[data-theme="dark"] .task-drawer :is(div, span, input, button, strong)[style*="color: rgb(156, 163, 175)"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: #6b7280"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: rgb(107, 114, 128)"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: #9ca3af"],
        body[data-theme="dark"] .task-create-modal :is(div, span, input, textarea, select, button, strong)[style*="color: rgb(156, 163, 175)"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: #6b7280"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: rgb(107, 114, 128)"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: #9ca3af"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: rgb(156, 163, 175)"] {
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-drawer input,
        body[data-theme="dark"] .task-drawer textarea,
        body[data-theme="dark"] .task-drawer select,
        body[data-theme="dark"] .task-create-modal input,
        body[data-theme="dark"] .task-create-modal textarea,
        body[data-theme="dark"] .task-create-modal select {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-drawer input::placeholder,
        body[data-theme="dark"] .task-create-modal input::placeholder,
        body[data-theme="dark"] .task-create-modal textarea::placeholder {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .task-create-modal .task-field-row {
          background: #202c33 !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-create-modal [style*="border-bottom: 1px solid"],
        body[data-theme="dark"] .task-create-modal [style*="border-top: 1px solid"],
        body[data-theme="dark"] .task-create-modal [style*="border: 1px solid"],
        body[data-theme="dark"] .task-create-modal [style*="border: 1.5px solid"] {
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-drawer [style*="border-bottom: 1px solid"],
        body[data-theme="dark"] .task-drawer [style*="border-top: 1px solid"],
        body[data-theme="dark"] .task-drawer [style*="border: 1px solid"],
        body[data-theme="dark"] .task-approval-panel [style*="border-bottom: 1px solid"],
        body[data-theme="dark"] .task-approval-panel [style*="border-top: 1px solid"],
        body[data-theme="dark"] .task-approval-panel [style*="border: 1px solid"] {
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-drawer {
          background: #0b141a !important;
        }
        body[data-theme="dark"] .task-drawer-header {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          box-shadow: 0 1px 0 rgba(255,255,255,0.02) !important;
        }
        body[data-theme="dark"] .task-drawer > [style*="backdrop"] {
          background: rgba(11,20,26,0.68) !important;
        }
        body[data-theme="dark"] .task-description-card {
          background: linear-gradient(135deg, rgba(0,168,132,0.16) 0%, rgba(32,44,51,0.96) 100%) !important;
          border-color: rgba(0,168,132,0.34) !important;
          box-shadow: 0 10px 26px rgba(0,0,0,0.22) !important;
        }
        body[data-theme="dark"] .task-description-card div[style*="color: #064e3b"],
        body[data-theme="dark"] .task-description-card div[style*="color: #0F6E56"] {
          color: #d8fff5 !important;
        }
        body[data-theme="dark"] .task-chat-messages {
          background:
            radial-gradient(circle at 20% 0%, rgba(0,168,132,0.05), transparent 28%),
            linear-gradient(180deg, #111b21 0%, #0b141a 100%) !important;
        }
        body[data-theme="dark"] .task-message-bubble.theirs {
          background: #202c33 !important;
          border-color: #2f414b !important;
          color: #e9edef !important;
          box-shadow: 0 3px 12px rgba(0,0,0,0.16) !important;
        }
        body[data-theme="dark"] .task-message-bubble.mine {
          background: #005c4b !important;
          border-color: #0a7c68 !important;
          color: #e9edef !important;
          box-shadow: 0 3px 12px rgba(0,0,0,0.16) !important;
        }
        body[data-theme="dark"] .task-message-time {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .task-chat-composer {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          box-shadow: 0 -10px 24px rgba(0,0,0,0.18) !important;
        }
        body[data-theme="dark"] .task-composer-icon {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-composer-icon:hover {
          background: #263842 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-response-input {
          background: #0b141a !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-response-input::placeholder {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .task-send-button {
          background: #00a884 !important;
          color: #fff !important;
          box-shadow: 0 8px 18px rgba(0,168,132,0.2) !important;
        }
        body[data-theme="dark"] .task-send-button:disabled {
          background: rgba(0,168,132,0.34) !important;
          box-shadow: none !important;
        }
        body[data-theme="dark"] .task-form-panel {
          background: #111b21 !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-form-panel-header {
          background: #202c33 !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-form-summary {
          background: rgba(0,168,132,0.12) !important;
          border-left-color: #00a884 !important;
        }
        body[data-theme="dark"] .task-form-summary div {
          color: #d7e2e8 !important;
        }
        body[data-theme="dark"] .task-attachment-bubble.theirs {
          background: #202c33 !important;
          border-color: #2f414b !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-attachment-bubble.mine {
          background: #005c4b !important;
          border-color: #0a7c68 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-attachment-bubble div[style*="color: #111827"],
        body[data-theme="dark"] .task-attachment-bubble div[style*="color: #1f2937"] {
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-audio-player.theirs,
        body[data-theme="dark"] .task-audio-player.card {
          background: #202c33 !important;
          border-color: #2f414b !important;
        }
        body[data-theme="dark"] .task-audio-player.mine {
          background: #005c4b !important;
          border-color: #0a7c68 !important;
        }
        body[data-theme="dark"] .task-audio-player span {
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-description-card {
          background: #172a30 !important;
          border-color: #2f5550 !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 24px rgba(0,0,0,0.2) !important;
        }
        body[data-theme="dark"] .task-description-title {
          color: #7debd4 !important;
        }
        body[data-theme="dark"] .task-description-text {
          color: #d7e2e8 !important;
        }
        body[data-theme="dark"] .task-sender-name {
          background: rgba(78,118,255,0.16) !important;
          color: #8fb4ff !important;
          border: 1px solid rgba(78,118,255,0.2) !important;
        }
        body[data-theme="dark"] .task-message-stack.theirs {
          align-items: flex-start !important;
        }
        body[data-theme="dark"] .task-message-stack.mine {
          align-items: flex-end !important;
        }
        body[data-theme="dark"] .task-details-panel {
          background: #0b141a !important;
        }
        body[data-theme="dark"] .task-details-card,
        body[data-theme="dark"] .task-progress-card {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          box-shadow: 0 8px 20px rgba(0,0,0,0.16) !important;
        }
        body[data-theme="dark"] .task-progress-card {
          background: #17232a !important;
        }
        body[data-theme="dark"] .task-details-card > div[style*="border-bottom"] {
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-assignee-filter {
          background: #202c33 !important;
          border-color: #334651 !important;
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-assignee-filter.active {
          background: rgba(0,168,132,0.16) !important;
          border-color: #00a884 !important;
          color: #7debd4 !important;
        }
        body[data-theme="dark"] .task-assignee-row {
          background: #17232a !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .task-assignee-row:hover {
          background: rgba(0,168,132,0.12) !important;
          border-color: rgba(0,168,132,0.42) !important;
        }
        body[data-theme="dark"] .task-status-trail-base {
          background: #334651 !important;
        }
        body[data-theme="dark"] .task-status-dot {
          background: #202c33 !important;
          border-color: #48606c !important;
        }
        body[data-theme="dark"] .task-status-dot.active {
          background: #111b21 !important;
          border-color: #00a884 !important;
        }
        body[data-theme="dark"] .task-status-dot.done {
          background: #00a884 !important;
          border-color: #00a884 !important;
        }
        body[data-theme="dark"] .task-status-label {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .task-status-label.active {
          color: #7debd4 !important;
        }
        body[data-theme="dark"] .task-meta-card span,
        body[data-theme="dark"] .task-meta-card div {
          border-color: #2a3942 !important;
        }
      `}</style>

      {error && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "#fee2e2", color: "#991b1b", padding: "9px 18px", borderRadius: 9, fontSize: "0.84rem", fontWeight: 600, zIndex: 99999, boxShadow: "0 4px 12px rgba(0,0,0,.1)", display: "flex", alignItems: "center", gap: 8 }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}><FiX size={13} /></button>
        </div>
      )}

      <div className="task-shell-new">
        <div className="d-flex flex-column gap-2 gap-md-3 h-100 p-3 p-md-4">

          {/* ── Hero Header (like campaign page) ── */}


          {/* ── Toolbar (search + filter pills + extras) ── */}
          <div className="toolbar-card">
            <div className="d-flex flex-column flex-xl-row gap-2 justify-content-between align-items-stretch align-items-xl-center">
              <div className="search-wrap">
                <FiSearch
                  size={18}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 14,
                    transform: "translateY(-50%)",
                    color: "#64748b",
                    zIndex: 2,
                  }}
                />
                <input
                  className="search-input"
                  placeholder="Search tasks by title or description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="d-flex gap-2 align-items-center">
                {/* Approvals button */}
                {_isAdmin && pendingApprovals.length > 0 && (
                  <button
                    onClick={() => setShowApprovals(true)}
                    className="d-flex align-items-center gap-1"
                    style={{
                      padding: "5px 12px",
                      borderRadius: 16,
                      border: "1.5px solid #fcd34d44",
                      background: "#fef3c7",
                      color: "#92400e",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FiShield size={12} /> Approvals
                    <span
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 16,
                        height: 16,
                        fontSize: "0.58rem",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {pendingApprovals.length}
                    </span>
                  </button>
                )}

                {/* Notifications bell */}
                {/* <div ref={notifRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowNotifPanel((p) => !p)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "none",
                      background: showNotifPanel ? "#ccfbf1" : "#f3f4f6",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                      position: "relative",
                    }}
                  >
                    <FiBell size={15} />
                    {unreadCount > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: "#ef4444",
                          color: "#fff",
                          fontSize: "0.52rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {unreadCount}
                      </div>
                    )}
                  </button>
                  {showNotifPanel && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      background: "#fff",
                      borderRadius: 12,
                      boxShadow: "0 8px 32px rgba(0,0,0,.14)",
                      border: "1px solid #e5e7eb",
                      width: 300,
                      maxWidth: "90vw",
                      maxHeight: 360,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      zIndex: 999,
                    }}>
                      <div style={{ padding: "10px 13px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a2233" }}>Notifications</span>
                        <div style={{ display: "flex", gap: 7 }}>
                          {notifications.some(n => !n.read) && <button onClick={() => handleReadNotif("all")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.71rem", color: "#0d9488", fontWeight: 600 }}>Mark all read</button>}
                          <button onClick={() => setShowNotifPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><FiX size={13} /></button>
                        </div>
                      </div>
                      <div style={{ overflowY: "auto" }}>
                        {notifications.filter(n => (n.userId?._id || n.userId)?.toString() === currentUser?.id).length === 0 ? (
                          <div style={{ padding: 22, textAlign: "center", color: "#9ca3af", fontSize: "0.83rem" }}>No notifications</div>
                        ) : notifications.filter(n => (n.userId?._id || n.userId)?.toString() === currentUser?.id).map(n => (
                          <div key={n._id || n.id} onClick={() => handleReadNotif(n._id || n.id)} style={{ padding: "9px 13px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: n.read ? "#fff" : "#f0f9ff" }}>
                            <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                              <span style={{ fontSize: "1rem" }}>{n.type === "task_assigned" ? "📋" : n.type === "response_received" ? "💬" : "⏰"}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "0.81rem", color: "#1a2233", fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
                                <div style={{ fontSize: "0.67rem", color: "#9ca3af", marginTop: 2 }}>{fmt(n.createdAt || n.timestamp)}</div>
                              </div>
                              {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0d9488", marginTop: 4, flexShrink: 0 }} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div> */}


              </div>
            </div>

            {/* Filter pills */}
           <div className="d-flex justify-between mt-3" style={{ alignItems: "flex-start", gap: 10 }}>
  <div style={{ flex: 1 }}>
    {/* Main tabs */}
    <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 9, padding: 3, marginBottom: 10, height: 50 }}>
      {[
        { id: "team", label: "Team Tasks", icon: <FiUsers size={14} /> },
        { id: "my", label: "My Tasks", icon: <FiUser size={14} /> },
      ].map(({ id, label, icon }) => {
       const count = id === "my"
  ? tasks.filter(t =>
      t.assignedTo?.some(u => (u._id || u.id || u)?.toString() === currentUser?.id) ||
      (t.isPersonal && (t.createdBy?._id || t.createdBy?.id || t.createdBy)?.toString() === currentUser?.id)
    ).length
  : tasks.filter(t => {
      if (t.isPersonal) return false;
      if (isAdmin(currentUser)) return true;
      return t.assignedTo?.some(u => (u._id || u.id || u)?.toString() === currentUser?.id) ||
        (isManager(currentUser) && (t.createdBy?._id || t.createdBy?.id || t.createdBy)?.toString() === currentUser?.id);
    }).length;
        return (
          <button key={id} onClick={() => { setTab(id); setStatusFilter("all"); }}
            style={{
              flex: 1, padding: "6px 0", borderRadius: 7, border: "none", cursor: "pointer",
              fontSize: "0.77rem", fontWeight: 700, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 5,
              background: tab === id ? "linear-gradient(135deg, #0f5f64 0%, #14808a 60%, #22c55e 100%)" : "transparent",
color: tab === id ? "#fff" : "#9ca3af",
boxShadow: tab === id ? "0 4px 12px rgba(13,148,136,0.3)" : "none",
            }}>
            {icon} {label}
            <span style={{
              background: tab === id ? "rgba(255,255,255,0.25)" : "#e5e7eb",
color: tab === id ? "#fff" : "#9ca3af",

              fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 999,
            }}>{count}</span>
          </button>
        );
      })}
    </div>

    {/* Status sub-filters */}
    <div className="d-flex flex-wrap gap-2">
      {[["all", "All"], ["pending", "⏳ Pending"], ["in_progress", "🔄 In Progress"], ["completed", "✅ Done"]].map(([id, label]) => (
        <button key={id}
          className={`filter-pill ${statusFilter === id ? "filter-pill-active" : ""}`}
          onClick={() => setStatusFilter(id)}>
          {label}
        </button>
      ))}
    </div>
  </div>

  <div style={{ paddingTop: 3 }}>
    <button className="cta-btn" onClick={() => setShowCreate(true)} type="button">
      <FiPlus size={18} /> New Task
    </button>
  </div>
</div>
          </div>

          {/* ── Task list ── */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[...Array(6)].map((_, i) => <div key={i} style={{ height: 50, background: "#fff", borderRadius: 9, opacity: 0.7 }} />)}
              </div>
            ) : visibleTasks.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 0", gap: 11 }}>
                <div style={{ fontSize: "2.5rem" }}>📋</div>
                <div style={{ fontSize: "0.96rem", fontWeight: 700, color: "#374151" }}>No tasks found</div>
                <div style={{ fontSize: "0.83rem", color: "#9ca3af" }}>{search ? "Try a different search" : "Create your first task"}</div>
                {!search && <button onClick={() => setShowCreate(true)} style={{ marginTop: 7, padding: "8px 18px", borderRadius: 9, border: "none", background: "#0d9488", color: "#fff", fontSize: "0.84rem", fontWeight: 700, cursor: "pointer" }}>+ Create Task</button>}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="desktop-table-view" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: (_isAdmin || _isManager) ? 780 : 680 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                          {[["title", "Task"], ["priority", "Priority"], ["status", "Status"], ["dueDate", "Due"]].map(([key, label]) => (
                            <th key={key} onClick={() => handleSort(key)} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                              {label} <SortIcon col={key} />
                            </th>
                          ))}
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase" }}>Assigned</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase" }}>💬</th>
                          {(_isAdmin || _isManager) && <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase" }}>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTasks.map(task => {
                          const pCfg = PRIORITY[task.priority] || PRIORITY.medium;
                          const overdue = isOverdue(task.dueDate, task.status);
                          const selected = (selectedTaskLive?._id || selectedTaskLive?.id) === (task._id || task.id);
                          const assignees = (task.assignedTo || []).map(enrichUser).filter(Boolean);
                          const isPending = task.approvalStatus === "pending";
                          const myStatusRec = userTaskStatuses.find(uts => uts.userId.toString() === currentUser.id && uts.taskId.toString() === (task._id || task.id).toString());
                          const effectiveStatus = _isAdmin ? task.status : (myStatusRec ? myStatusRec.status : task.status);
                          const isTaskCreator = (task.createdBy?._id || task.createdBy?.id || task.createdBy)?.toString() === currentUser?.id;
                          const canEditTask = _isAdmin || (_isManager && isTaskCreator);
                          return (
                            <tr key={task._id || task.id} className="tr-hover" onClick={() => setSelectedTask(task)}
                              style={{ borderBottom: "1px solid #f3f4f6", background: selected ? "#f0fdf4" : isPending ? "#fef3c7" : "transparent", borderLeft: selected ? "3px solid #0d9488" : isPending ? "3px solid #f59e0b" : "3px solid transparent", cursor: "pointer" }}>
                              <td style={{ padding: "12px 16px", maxWidth: 260 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "#1a2233", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200, textDecoration: effectiveStatus === "completed" ? "line-through" : "none" }}>
                                    {task.isPersonal && <span style={{ marginRight: 3, fontSize: "0.74rem" }}>🔒</span>}{task.title}
                                  </span>
                                  {isPending && <ApprovalBadge compact />}
                                </div>
                                {task.description && <div style={{ fontSize: "0.71rem", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 210, marginTop: 1 }}>{task.description}</div>}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: pCfg.bg }}>
                                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: pCfg.color }} />
                                  <span style={{ fontSize: "0.71rem", fontWeight: 700, color: pCfg.color }}>{pCfg.label}</span>
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                                <StatusPill status={effectiveStatus} onChange={s => handleStatusChange(task._id || task.id, s)} readonly={isPending && !_isAdmin} />
                              </td>
                              <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                                <span style={{ fontSize: "0.79rem", fontWeight: overdue ? 700 : 500, color: overdue ? "#ef4444" : "#374151" }}>{overdue && "⚠ "}{fmtDate(task.dueDate)}</span>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  {assignees.slice(0, 4).map((u, i) => <div key={u.id} style={{ marginLeft: i > 0 ? -7 : 0, zIndex: 4 - i }}><Avatar user={u} size={26} /></div>)}
                                  {assignees.length > 4 && <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#e5e7eb", color: "#6b7280", fontSize: "0.58rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: -7, border: "2px solid #fff" }}>+{assignees.length - 4}</div>}
                                  {assignees.length === 0 && <span style={{ fontSize: "0.74rem", color: "#d1d5db" }}>—</span>}
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: task.responses?.length > 0 ? "#0d9488" : "#d1d5db" }}>💬 {task.responses?.length || 0}</span>
                              </td>
                              {(_isAdmin || _isManager) && (
                                <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    {canEditTask && (
                                      <button
                                        type="button"
                                        title="Edit task"
                                        onClick={() => setEditingTask(task)}
                                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#3b82f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                      >
                                        <FiEdit2 size={13} />
                                      </button>
                                    )}
                                    {_isAdmin && (
                                      <button
                                        type="button"
                                        title="Delete task"
                                        onClick={() => handleDelete(task._id || task.id)}
                                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                      >
                                        <FiTrash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-card-view">
                  {visibleTasks.map(task => {
                    const pCfg = PRIORITY[task.priority] || PRIORITY.medium;
                    const overdue = isOverdue(task.dueDate, task.status);
                    const assignees = (task.assignedTo || []).map(enrichUser).filter(Boolean);
                    const isPending = task.approvalStatus === "pending";
                    const myStatusRec = userTaskStatuses.find(uts => uts.userId.toString() === currentUser.id && uts.taskId.toString() === (task._id || task.id).toString());
                    const effectiveStatus = _isAdmin ? task.status : (myStatusRec ? myStatusRec.status : task.status);
                    const isTaskCreator = (task.createdBy?._id || task.createdBy?.id || task.createdBy)?.toString() === currentUser?.id;
                    const canEditTask = _isAdmin || (_isManager && isTaskCreator);
                    return (
                      <div key={task._id || task.id} onClick={() => setSelectedTask(task)}
                        style={{ background: "#fff", borderRadius: 12, border: "1.5px solid", borderColor: isPending ? "#fcd34d44" : "#e5e7eb", padding: 14, display: "flex", flexDirection: "column", gap: 9, boxShadow: "0 1px 3px rgba(0,0,0,.05)", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#1a2233", textDecoration: effectiveStatus === "completed" ? "line-through" : "none", maxWidth: "75%" }}>
                            {task.isPersonal && "🔒 "}{task.title}
                          </div>
                          <span style={{ fontSize: "0.67rem", fontWeight: 700, background: pCfg.bg, color: pCfg.color, padding: "2px 8px", borderRadius: 20 }}>{pCfg.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <StatusPill status={effectiveStatus} onChange={s => handleStatusChange(task._id || task.id, s)} readonly={isPending && !_isAdmin} />
                          <span style={{ fontSize: "0.71rem", color: overdue ? "#ef4444" : "#6b7280" }}>📅 {fmtDate(task.dueDate)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            {assignees.slice(0, 3).map(u => <Avatar key={u.id} user={u} size={22} />)}
                            {assignees.length > 3 && <span style={{ fontSize: "0.63rem", color: "#6b7280" }}>+{assignees.length - 3}</span>}
                          </div>
                          <div style={{ fontSize: "0.77rem", fontWeight: 600, color: task.responses?.length > 0 ? "#0d9488" : "#d1d5db" }}>💬 {task.responses?.length || 0}</div>
                        </div>
                        {(_isAdmin || _isManager) && (canEditTask || _isAdmin) && (
                          <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
                            {canEditTask && (
                              <button type="button" title="Edit task" onClick={() => setEditingTask(task)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#3b82f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <FiEdit2 size={13} />
                              </button>
                            )}
                            {_isAdmin && (
                              <button type="button" title="Delete task" onClick={() => handleDelete(task._id || task.id)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <FiTrash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                        {isPending && <ApprovalBadge compact />}
                        {overdue && <div style={{ fontSize: "0.69rem", color: "#ef4444", fontWeight: 600 }}>⚠ Overdue</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedTaskLive && <ChatDrawer task={selectedTaskLive} currentUser={currentUser} onClose={() => setSelectedTask(null)} onStatusChange={handleStatusChange} onDelete={handleDelete} onDeleteResponse={handleDeleteResponse} saving={saving} responseInput={responseInput} setResponseInput={setResponseInput} formValues={formValues} onFormChange={handleFormChange} onSubmit={handleResponse} userTaskStatuses={userTaskStatuses} />}
      {showCreate && <CreateTaskModal currentUser={currentUser} users={users} onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {editingTask && <CreateTaskModal currentUser={currentUser} users={users} task={editingTask} onClose={() => setEditingTask(null)} onCreate={handleCreate} onUpdate={handleUpdate} />}
      {showApprovals && <ApprovalPanel tasks={tasks} users={users} onApprove={handleApprove} onReject={handleReject} onClose={() => setShowApprovals(false)} />}
    </>
  );
}
