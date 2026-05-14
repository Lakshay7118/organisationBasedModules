"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  FiSearch, FiSend, FiPlus, FiX, FiBell,
  FiTrash2, FiLink, FiPhone, FiChevronRight, FiMinus,
  FiCalendar, FiShield, FiUsers, FiUser, FiEdit2,
} from "react-icons/fi";
import API from "../utils/api";

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
const toDateInput = (iso) => iso ? new Date(iso).toISOString().slice(0, 10) : "";
const toDateTimeInput = (iso) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Math.floor((d - new Date()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};
const isOverdue = (due, st) => st !== "completed" && due && new Date(due) < new Date();

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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(100%, 440px)", margin: 16, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,.18)" }}>
        <div style={{ background: `linear-gradient(135deg, ${u.color}18, ${u.color}08)`, padding: "24px 20px 16px", borderBottom: "1px solid #f0f2f5" }}>
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
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, borderBottom: "1px solid #f0f2f5" }}>
          {[
            { label: "Total", value: userTasks.length, color: "#0d9488", bg: "#ccfbf1" },
            { label: "Done", value: byStatus.completed, color: "#10b981", bg: "#d1fae5" },
            { label: "Cancelled", value: byStatus.cancelled, color: "#6b7280", bg: "#f3f4f6" }, // ← swapped
            { label: "Late", value: overdueTasks.length, color: "#ef4444", bg: "#fee2e2" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "12px 6px", background: s.bg, borderRadius: 10 }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.66rem", color: "#6b7280", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f5" }}>
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
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 16px" }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 12, background: "#f3f4f6", borderRadius: 9, padding: 3 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: "6px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700,
            background: activeTab === t.id ? "#fff" : "transparent",
            color: activeTab === t.id ? t.color : "#9ca3af",
            boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none"
          }}>{t.label}</button>
        ))}
      </div>
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
    <div style={{ marginTop: 5, padding: "5px 9px", background: "rgba(13,148,136,.08)", borderRadius: 7, borderLeft: "2px solid #0d9488" }}>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: "0.72rem", color: "#374151", marginBottom: i < items.length - 1 ? 3 : 0 }}>
          <span style={{ color: "#0d9488", fontWeight: 700 }}>{item.label}:</span> {item.value}
        </div>
      ))}
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
    <div style={{ margin: "8px 12px", background: "#fff", borderRadius: 12, border: "1.5px solid #e5e7eb", overflow: "hidden", flexShrink: 0 }}>
      <div onClick={() => setCollapsed(p => !p)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", cursor: "pointer", background: "#f9fafb", borderBottom: collapsed ? "none" : "1px solid #f0f0f0" }}>
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
            <button onClick={onSubmit} style={{ marginTop: 12, padding: "8px 14px", background: "#0d9488", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.83rem", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
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
    <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, padding: 11, position: "relative", background: "#f9fafb", marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, alignItems: "center" }}>
        <span style={{ fontSize: "0.67rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase" }}>{title}</span>
        <button onClick={onRemove} style={{ background: "#fee2e2", border: "none", borderRadius: 5, cursor: "pointer", padding: "2px 5px", color: "#ef4444" }}><FiMinus size={11} /></button>
      </div>
      {children}
    </div>
  );
}

const getTaskUserId = (u) => (u?._id || u?.id || u)?.toString?.() || "";
const taskToForm = (task, currentUser) => ({
  title: task?.title || "",
  description: task?.description || "",
  assignedTo: (task?.assignedTo || []).map(getTaskUserId).filter(Boolean),
  priority: task?.priority || "medium",
  dueDate: toDateInput(task?.dueDate),
  reminder: toDateTimeInput(task?.reminderAt || task?.reminder),
  isPersonal: task?.isPersonal ?? (isUser(currentUser) ? true : false),
  inputFields: task?.inputFields || [],
  dropdownButtons: task?.dropdownButtons || [],
  quickReplies: task?.quickReplies || [],
  ctaButtons: task?.ctaButtons || [],
  checkboxes: task?.checkboxes || [],
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
  const [form, setForm] = useState(() => taskToForm(task, currentUser));
  const [tab, setTab] = useState("basic");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleAssign = (id) => set("assignedTo", form.assignedTo.includes(id) ? form.assignedTo.filter(x => x !== id) : [...form.assignedTo, id]);
  const addInputField = () => set("inputFields", [...form.inputFields, { id: genId(), label: "", placeholder: "", required: false }]);
  const addDropdown = () => set("dropdownButtons", [...form.dropdownButtons, { id: genId(), title: "", placeholder: "", options: "" }]);
  const addQuickReply = () => set("quickReplies", [...form.quickReplies, { id: genId(), title: "" }]);
  const addCtaButton = () => set("ctaButtons", [...form.ctaButtons, { id: genId(), btnType: "URL", title: "", value: "" }]);
  const addCheckboxGroup = () => set("checkboxes", [...form.checkboxes, { id: genId(), label: "", options: "" }]);
  const patchArr = (key, id, field, val) => set(key, form[key].map(x => x.id === id ? { ...x, [field]: val } : x));
  const removeArr = (key, id) => set(key, form[key].filter(x => x.id !== id));
  const parseOptions = (raw) => { if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean); if (typeof raw === "string") return raw.split(/[,\n]+/).map(s => s.trim()).filter(Boolean); return []; };
  const needsApproval = _isManager && !form.isPersonal && form.assignedTo.length > 0;

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTagContacts([]);
      return;
    }
    setLoadingContacts(true);
    API.get(`/contacts?tag=${selectedTag}`).then(res => setTagContacts(Array.isArray(res.data) ? res.data : [])).catch(() => { }).finally(() => setLoadingContacts(false));
  }, [assignFilter, selectedTag]);

  useEffect(() => {
    if (assignFilter !== "manager_contacts" || !selectedMgr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMgrContacts([]);
      return;
    }
    setLoadingContacts(true);
    API.get(`/contacts?managerId=${selectedMgr}`).then(res => setMgrContacts(Array.isArray(res.data) ? res.data : [])).catch(() => { }).finally(() => setLoadingContacts(false));
  }, [assignFilter, selectedMgr]);

  const contactsWithUsers = useCallback((contactList) => contactList.map(c => ({ contact: c, user: users.find(u => u.phone && c.mobile && (u.phone === c.mobile || u.phone.replace(/\D/g, "") === c.mobile.replace(/\D/g, ""))) })), [users]);

  const assignableList = useMemo(() => {
    if (assignFilter === "tag") return contactsWithUsers(tagContacts).filter(({ contact }) => !assignSearch || contact.name?.toLowerCase().includes(assignSearch.toLowerCase()));
    if (assignFilter === "manager_contacts") return contactsWithUsers(mgrContacts).filter(({ contact }) => !assignSearch || contact.name?.toLowerCase().includes(assignSearch.toLowerCase()));
    return users.filter(u => { if (u.role === "super_admin") return false; if (assignFilter === "user" && u.role !== "user") return false; if (assignFilter === "manager" && u.role !== "manager") return false; if (assignSearch && !u.name?.toLowerCase().includes(assignSearch.toLowerCase())) return false; return true; }).map(u => ({ contact: null, user: u }));
  }, [assignFilter, users, tagContacts, mgrContacts, assignSearch, contactsWithUsers]);

  const handleSubmit = () => {
    if (!form.title.trim()) { alert("Task Title is required"); return; }
    if (!form.dueDate) { alert("Due Date is required"); return; }
    const assignedTo = form.isPersonal ? [currentUser.id] : form.assignedTo;
    const dropdownButtons = form.dropdownButtons.map(dd => ({ ...dd, options: parseOptions(dd.options) }));
    const checkboxes = form.checkboxes.map(cb => ({ ...cb, options: parseOptions(cb.options) }));
    const payload = { ...form, assignedTo, reminderAt: form.reminder || null, dropdownButtons, checkboxes, needsApproval };
    delete payload.reminder;
    if (isEditing) onUpdate(task._id || task.id, payload);
    else onCreate(payload);
    onClose();
  };

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: "0.84rem", outline: "none", color: "#1a2233", background: "#fff", boxSizing: "border-box" };
  const lbl = { fontSize: "0.69rem", fontWeight: 700, color: "#6b7280", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(95%, 480px)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,.22)" }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                <div><label style={lbl}>Priority</label><select value={form.priority} onChange={e => set("priority", e.target.value)} style={inp}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                <div><label style={lbl}>Due Date *</label><input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} style={inp} /></div>
              </div>
              <div><label style={lbl}>Reminder</label><input type="datetime-local" value={form.reminder} onChange={e => set("reminder", e.target.value)} style={inp} /></div>
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div className="task-approval-panel" onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(95%, 460px)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,.18)", overflow: "hidden" }}>
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
function ChatDrawer({ task, currentUser, allTasks, allUsers, onClose, onStatusChange, onDelete, saving, responseInput, setResponseInput, formValues, onFormChange, onSubmit, userTaskStatuses }) {
  const scrollRef = useRef(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [task?.responses]);
  if (!task) return null;

  const _isAdmin = isAdmin(currentUser);
  const isPending = task.approvalStatus === "pending";
  const overdue = isOverdue(task.dueDate, task.status);
  const pCfg = PRIORITY[task.priority] || PRIORITY.medium;
  const assignees = (task.assignedTo || []).map(enrichUser).filter(Boolean);
  const taskId = task._id || task.id;
  const myStatusRec = userTaskStatuses.find(uts => uts.userId.toString() === currentUser?.id && uts.taskId.toString() === taskId.toString());
  const effectiveStatus = myStatusRec ? myStatusRec.status : task.status;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 800, backdropFilter: "blur(2px)" }} />
      <div className="task-drawer" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(100%, 500px)", background: "#fff", zIndex: 900, display: "flex", flexDirection: "column", boxShadow: "-12px 0 48px rgba(0,0,0,.12)", animation: "slideInRight .25s ease", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

        {/* ── Drawer Header ── */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f2f5", background: "#fff", flexShrink: 0 }}>
          {/* Row 1: close + title + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}><FiX size={15} /></button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1a2233", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{task.isPersonal ? "🔒 " : ""}{task.title}</span>
                <span style={{ fontSize: "0.67rem", fontWeight: 700, background: pCfg.bg, color: pCfg.color, padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>{pCfg.label}</span>
                {overdue && <span style={{ fontSize: "0.67rem", fontWeight: 700, background: "#fee2e2", color: "#ef4444", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>⚠ Overdue</span>}
                {isPending && <ApprovalBadge compact />}
              </div>
            </div>
          </div>

          {/* Row 2: status pill + due date + delete — all on ONE line */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap", paddingLeft: 42 }}>
            <StatusPill status={effectiveStatus} onChange={s => onStatusChange(taskId, s)} readonly={isPending && !_isAdmin} />
            {task.dueDate && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: overdue ? "#ef4444" : "#6b7280", whiteSpace: "nowrap", flexShrink: 0 }}>
                <FiCalendar size={11} /> {fmtDate(task.dueDate)}
              </span>
            )}
            {_isAdmin && (
              <button onClick={() => onDelete(taskId)} style={{ marginLeft: "auto", background: "#fee2e2", border: "none", borderRadius: 7, cursor: "pointer", padding: "4px 10px", color: "#ef4444", display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                <FiTrash2 size={11} /> Delete
              </button>
            )}
          </div>

          {isPending && !_isAdmin && (
            <div style={{ marginTop: 8, marginLeft: 42, padding: "5px 10px", background: "#fef3c7", borderRadius: 7, border: "1px solid #fcd34d33", fontSize: "0.71rem", color: "#92400e", fontWeight: 600 }}>
              🔒 Awaiting admin approval — read only.
            </div>
          )}

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, marginTop: 10, background: "#f3f4f6", borderRadius: 9, padding: 3 }}>
            {[["chat", "💬 Chat"], ["details", "📋 Details"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "5px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.77rem", fontWeight: 700, background: activeTab === id ? "#fff" : "transparent", color: activeTab === id ? "#0d9488" : "#9ca3af", boxShadow: activeTab === id ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>{label}</button>
            ))}
          </div>
        </div>

        {/* ── Chat Tab ── */}
        {activeTab === "chat" && (
          <>
            {task.description && (
              <div style={{ margin: "8px 12px 0", padding: "8px 12px", background: "#ccfbf1", borderRadius: 9, borderLeft: "3px solid #0d9488", flexShrink: 0 }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", marginBottom: 2, letterSpacing: "0.04em" }}>Description</div>
                <div style={{ fontSize: "0.83rem", color: "#374151", lineHeight: 1.55 }}>{task.description}</div>
              </div>
            )}
            <TaskFormElements task={task} values={formValues} onSubmit={onSubmit} onChange={onFormChange} readonly={isPending && !_isAdmin} />
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7, background: "#f9fafb" }}>
              {(!task.responses || task.responses.length === 0) ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#9ca3af", padding: 28 }}>
                  <div><div style={{ fontSize: "2rem", marginBottom: 7 }}>💬</div><div style={{ fontSize: "0.83rem" }}>No responses yet</div></div>
                </div>
              ) : task.responses.map(resp => {
                const sender = enrichUser(resp.userId);
                const isMine = sender?.id === currentUser?.id;
                return (
                  <div key={resp._id || resp.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", gap: 7 }}>
                    {!isMine && <Avatar user={sender} size={28} />}
                    <div style={{ maxWidth: "72%" }}>
                      {!isMine && <div style={{ fontSize: "0.69rem", color: sender?.color || "#6b7280", fontWeight: 700, marginBottom: 2 }}>{sender?.name || "Unknown"}</div>}
                      <div style={{ padding: "7px 11px", borderRadius: isMine ? "13px 13px 2px 13px" : "13px 13px 13px 2px", background: isMine ? "#ccfbf1" : "#fff", border: isMine ? "1px solid #5eead4" : "1px solid #e5e7eb", fontSize: "0.85rem", color: "#1a2233", lineHeight: 1.5, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
                        {resp.message && <div>{resp.message}</div>}
                        <FormDataSummary formData={resp.formData} task={task} />
                      </div>
                      <div style={{ fontSize: "0.63rem", color: "#9ca3af", textAlign: isMine ? "right" : "left", marginTop: 2 }}>{fmt(resp.createdAt || resp.timestamp)}{isMine && " ✓✓"}</div>
                    </div>
                    {isMine && <Avatar user={currentUser} size={28} />}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "9px 11px", borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}>
              <input value={responseInput} onChange={e => setResponseInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && !isPending && onSubmit()}
                placeholder={isPending && !_isAdmin ? "Task pending approval — chat locked" : "Write a response…"}
                disabled={isPending && !_isAdmin}
                style={{ flex: 1, height: 38, borderRadius: 20, border: "1.5px solid #e5e7eb", padding: "0 13px", fontSize: "0.87rem", outline: "none", color: "#1a2233", background: isPending && !_isAdmin ? "#f9fafb" : "#fff" }} />
              <button onClick={onSubmit} disabled={saving || (isPending && !_isAdmin)} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: saving || (isPending && !_isAdmin) ? "#a7f3d0" : "#0d9488", color: "#fff", cursor: saving || (isPending && !_isAdmin) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FiSend size={14} />
              </button>
            </div>
          </>
        )}

        {/* ── Details Tab ── */}
        {activeTab === "details" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#f9fafb", borderRadius: 11, padding: 14, border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>👥 Assigned To</div>
              {assignees.length === 0 ? <div style={{ fontSize: "0.83rem", color: "#9ca3af" }}>No users assigned</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {assignees.map(u => {
                    const uTasks = allTasks.filter(t => t.assignedTo?.some(a => (a._id || a.id || a)?.toString() === u.id));
                    const done = uTasks.filter(t => { const rec = userTaskStatuses.find(uts => uts.userId.toString() === u.id && uts.taskId.toString() === (t._id || t.id).toString()); return rec ? rec.status === "completed" : t.status === "completed"; }).length;
                    const rate = uTasks.length ? Math.round(done / uTasks.length * 100) : 0;
                    return (
                      <div key={u.id} onClick={() => setViewingUser(u)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 9, border: "1.5px solid #e5e7eb", cursor: "pointer", background: "#fff" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#ccfbf1"; e.currentTarget.style.borderColor = "#5eead4"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}>
                        <Avatar user={u} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#1a2233" }}>{u.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "#9ca3af", textTransform: "capitalize" }}>{u.role}</div>
                          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ flex: 1, height: 4, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${rate}%`, background: rate >= 70 ? "#10b981" : rate >= 40 ? "#f59e0b" : "#ef4444", borderRadius: 999 }} />
                            </div>
                            <span style={{ fontSize: "0.67rem", fontWeight: 700, color: "#6b7280" }}>{done}/{uTasks.length}</span>
                          </div>
                        </div>
                        <FiChevronRight size={15} color="#9ca3af" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {[
              task.createdBy && { icon: "👤", label: "Created By", val: enrichUser(task.createdBy)?.name },
              task.approvalStatus && { icon: "🛡", label: "Approval", val: task.approvalStatus === "pending" ? "⏳ Pending" : task.approvalStatus === "approved" ? "✅ Approved" : "❌ Rejected" },
              { icon: "📅", label: "Due Date", val: fmtDate(task.dueDate) },
              task.reminder && { icon: "⏰", label: "Reminder", val: new Date(task.reminder).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
              { icon: "🕐", label: "Created", val: new Date(task.createdAt).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
              { icon: "💬", label: "Responses", val: task.responses?.length || 0 },
            ].filter(Boolean).map(({ icon, label, val }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "#f9fafb", borderRadius: 9, border: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: "0.79rem", color: "#6b7280", fontWeight: 600 }}>{icon} {label}</span>
                <span style={{ fontSize: "0.81rem", color: "#1a2233", fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingUser && <UserDetailModal user={viewingUser} allTasks={allTasks} currentUser={currentUser} userTaskStatuses={userTaskStatuses} onClose={() => setViewingUser(null)} />}
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

  const handleResponse = useCallback(async () => {
    const taskId = selectedTaskLive?._id || selectedTaskLive?.id;
    if (!taskId) return;
    const hasText = responseInput.trim().length > 0;
    const hasForm = formValues.quickReplySelected || Object.values(formValues.inputFields).some(Boolean) || Object.values(formValues.dropdownSelections).some(Boolean) || Object.values(formValues.checkboxSelections).some(arr => arr.length > 0);
    if (!hasText && !hasForm) return;
    const formData = { inputFields: Object.entries(formValues.inputFields).map(([id, value]) => ({ id, value })), dropdownSelections: Object.entries(formValues.dropdownSelections).map(([id, selected]) => ({ id, selected })), quickReplySelected: formValues.quickReplySelected, checkboxSelections: Object.entries(formValues.checkboxSelections).map(([id, selected]) => ({ id, selected })) };
    setSaving(true);
    try {
      const res = await API.post(`/tasks/${taskId}/response`, { message: responseInput.trim(), formData });
      if (res.data.success) { setTasks(p => p.map(t => ((t._id || t.id) === taskId ? res.data.data : t))); setSelectedTask(res.data.data); setResponseInput(""); setFormValues({ inputFields: {}, dropdownSelections: {}, quickReplySelected: "", checkboxSelections: {} }); }
    } catch { setError("Failed to send response"); }
    setSaving(false);
  }, [responseInput, formValues, selectedTaskLive]);

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
        body[data-theme="dark"] .task-approval-panel {
          background: #111b21 !important;
          color: #e9edef !important;
          border-color: #2a3942 !important;
          box-shadow: -12px 0 48px rgba(0,0,0,0.35) !important;
        }
        body[data-theme="dark"] .task-drawer [style*="background: #fff"],
        body[data-theme="dark"] .task-drawer [style*="background: rgb(255, 255, 255)"],
        body[data-theme="dark"] .task-approval-panel [style*="background: #fff"],
        body[data-theme="dark"] .task-approval-panel [style*="background: rgb(255, 255, 255)"] {
          background: #111b21 !important;
        }
        body[data-theme="dark"] .task-drawer [style*="background: #f9fafb"],
        body[data-theme="dark"] .task-drawer [style*="background: rgb(249, 250, 251)"],
        body[data-theme="dark"] .task-drawer [style*="background: #f3f4f6"],
        body[data-theme="dark"] .task-drawer [style*="background: rgb(243, 244, 246)"],
        body[data-theme="dark"] .task-approval-panel [style*="background: #f9fafb"],
        body[data-theme="dark"] .task-approval-panel [style*="background: rgb(249, 250, 251)"],
        body[data-theme="dark"] .task-approval-panel [style*="background: #f3f4f6"],
        body[data-theme="dark"] .task-approval-panel [style*="background: rgb(243, 244, 246)"] {
          background: #202c33 !important;
        }
        body[data-theme="dark"] .task-drawer [style*="background: #ccfbf1"],
        body[data-theme="dark"] .task-drawer [style*="background: rgb(204, 251, 241)"] {
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
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: #6b7280"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: rgb(107, 114, 128)"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: #9ca3af"],
        body[data-theme="dark"] .task-approval-panel :is(div, span, input, button, strong)[style*="color: rgb(156, 163, 175)"] {
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .task-drawer input,
        body[data-theme="dark"] .task-drawer textarea,
        body[data-theme="dark"] .task-drawer select {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .task-drawer input::placeholder {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .task-drawer [style*="border-bottom: 1px solid"],
        body[data-theme="dark"] .task-drawer [style*="border-top: 1px solid"],
        body[data-theme="dark"] .task-drawer [style*="border: 1px solid"],
        body[data-theme="dark"] .task-approval-panel [style*="border-bottom: 1px solid"],
        body[data-theme="dark"] .task-approval-panel [style*="border-top: 1px solid"],
        body[data-theme="dark"] .task-approval-panel [style*="border: 1px solid"] {
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
                                        style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                      >
                                        <FiEdit2 size={14} />
                                      </button>
                                    )}
                                    {_isAdmin && (
                                      <button
                                        type="button"
                                        title="Delete task"
                                        onClick={() => handleDelete(task._id || task.id)}
                                        style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #fecaca", background: "#fee2e2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                      >
                                        <FiTrash2 size={14} />
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
                              <button type="button" onClick={() => setEditingTask(task)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                                <FiEdit2 size={13} /> Edit
                              </button>
                            )}
                            {_isAdmin && (
                              <button type="button" onClick={() => handleDelete(task._id || task.id)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #fecaca", background: "#fee2e2", color: "#ef4444", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                                <FiTrash2 size={13} /> Delete
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

      {selectedTaskLive && <ChatDrawer task={selectedTaskLive} currentUser={currentUser} allTasks={tasks} allUsers={users} onClose={() => setSelectedTask(null)} onStatusChange={handleStatusChange} onDelete={handleDelete} saving={saving} responseInput={responseInput} setResponseInput={setResponseInput} formValues={formValues} onFormChange={handleFormChange} onSubmit={handleResponse} userTaskStatuses={userTaskStatuses} />}
      {showCreate && <CreateTaskModal currentUser={currentUser} users={users} onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {editingTask && <CreateTaskModal currentUser={currentUser} users={users} task={editingTask} onClose={() => setEditingTask(null)} onCreate={handleCreate} onUpdate={handleUpdate} />}
      {showApprovals && <ApprovalPanel tasks={tasks} users={users} onApprove={handleApprove} onReject={handleReject} onClose={() => setShowApprovals(false)} />}
    </>
  );
}
