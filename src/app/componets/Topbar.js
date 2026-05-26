"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Menu, Search, LogOut, Bell, X, CheckCheck,
  ChevronRight, Clock, Shield, Users, Megaphone,
  FileText, ListTodo,
} from "lucide-react";
import { getSocket, disconnectSocket } from "../lib/socket";
import API from "../utils/api";

/* ─────────────────────────────────────────
   Notification type config
───────────────────────────────────────── */
const NOTIF_META = {
  task_assigned:               { icon: <ListTodo  size={13} />, color: "#0d9488", bg: "#ccfbf1", label: "Task Assigned",          path: "/task"      },
  response_received:           { icon: <ListTodo  size={13} />, color: "#3b82f6", bg: "#eff6ff", label: "Task Response",          path: "/task"      },
  approval_requested:          { icon: <Shield    size={13} />, color: "#f59e0b", bg: "#fef3c7", label: "Approval Needed",        path: "/task"      },
  task_approved:               { icon: <ListTodo  size={13} />, color: "#10b981", bg: "#d1fae5", label: "Task Approved",          path: "/task"      },
  task_rejected:               { icon: <ListTodo  size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Task Rejected",          path: "/task"      },
  contact_approval_requested:  { icon: <Users     size={13} />, color: "#8b5cf6", bg: "#ede9fe", label: "Contact Pending",        path: "/contacts"  },
  contact_approved:            { icon: <Users     size={13} />, color: "#10b981", bg: "#d1fae5", label: "Contact Approved",       path: "/contacts"  },
  contact_rejected:            { icon: <Users     size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Contact Rejected",       path: "/contacts"  },
  template_approval_requested: { icon: <FileText  size={13} />, color: "#ec4899", bg: "#fce7f3", label: "Template Pending",       path: "/Template"  },
  template_approved:           { icon: <FileText  size={13} />, color: "#10b981", bg: "#d1fae5", label: "Template Approved",      path: "/Template"  },
  template_rejected:           { icon: <FileText  size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Template Rejected",      path: "/Template"  },
  campaign_approval_requested: { icon: <Megaphone size={13} />, color: "#f97316", bg: "#ffedd5", label: "Campaign Pending",       path: "/Campaigns" },
  campaign_approved:           { icon: <Megaphone size={13} />, color: "#10b981", bg: "#d1fae5", label: "Campaign Approved",      path: "/Campaigns" },
  campaign_rejected:           { icon: <Megaphone size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Campaign Rejected",      path: "/Campaigns" },
  profile_approval_requested:  { icon: <Shield    size={13} />, color: "#14b8a6", bg: "#ccfbf1", label: "Profile Pending",        path: "/Settings"  },
  profile_approved:            { icon: <Shield    size={13} />, color: "#10b981", bg: "#d1fae5", label: "Profile Approved",       path: "/Settings"  },
  profile_rejected:            { icon: <Shield    size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Profile Rejected",       path: "/Settings"  },
  support_ticket_created:      { icon: <Bell      size={13} />, color: "#06b6d4", bg: "#cffafe", label: "Support Ticket",         path: "/Settings"  },
  support_ticket_replied:      { icon: <Bell      size={13} />, color: "#3b82f6", bg: "#dbeafe", label: "Support Reply",          path: "/Settings"  },
};

const getMeta = (type) =>
  NOTIF_META[type] || { icon: <Bell size={13} />, color: "#6b7280", bg: "#f3f4f6", label: "Notification", path: null };

const fmtRelative = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return "just now";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
};

/* ─────────────────────────────────────────
   BellBadge
───────────────────────────────────────── */
function BellBadge({ size = 16, active = false, unreadCount = 0 }) {
  return (
    <>
      <Bell size={size} color={active ? "#0d9488" : "#374151"} />
      {unreadCount > 0 && (
        <span style={{
          position: "absolute", top: active ? 5 : 4, right: active ? 5 : 4,
          width: active ? 15 : 16, height: active ? 15 : 16,
          borderRadius: "50%", background: "#ef4444", color: "#fff",
          fontSize: "0.52rem", fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px solid #fff",
        }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   NotifToast
   - Parent passes a new `key` per notification → full remount → timer
     always starts fresh at 100%, no reset logic needed inside
   - onClose must be a stable useCallback ref so the timer dep never changes
───────────────────────────────────────── */
function NotifToast({ notification, onClose, onNavigate }) {
  const meta = getMeta(notification?.type);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 4000;
    const start    = Date.now();

    const tick = setInterval(() => {
      const elapsed   = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (elapsed >= duration) {
        clearInterval(tick);
        onClose();
      }
    }, 40);

    return () => clearInterval(tick);
  }, [onClose]);

  if (!notification) return null;

  const handleClick = () => {
    onClose();
    if (meta.path) onNavigate(meta.path);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -80, scale: 0.92 }}
      animate={{ opacity: 1, y: 0,   scale: 1     }}
      exit={{    opacity: 0, y: -60, scale: 0.94  }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", top: 18, left: "50%",
        transform: "translateX(-50%)", zIndex: 999999,
        width: "min(400px, calc(100vw - 32px))",
        background: "#fff", borderRadius: 16,
        boxShadow: "0 20px 60px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.06)",
        overflow: "hidden", cursor: meta.path ? "pointer" : "default",
      }}
      onClick={handleClick}
    >
      <div style={{ height: 3, background: "#f1f5f9", position: "relative" }}>
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%",
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${meta.color}, ${meta.color}99)`,
          borderRadius: 3, transition: "width 0.04s linear",
        }} />
      </div>

      <div style={{ padding: "12px 14px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: meta.bg, color: meta.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: `0 4px 12px ${meta.color}33`,
        }}>
          {(() => { const I = meta.icon?.type; return I ? <I size={18} /> : <Bell size={18} />; })()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {meta.label}
            </span>
            <button onClick={e => { e.stopPropagation(); onClose(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex", alignItems: "center", marginLeft: 8 }}>
              <X size={13} />
            </button>
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.4, marginBottom: 5 }}>
            {notification.message}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.67rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={9} />
              {fmtRelative(notification.createdAt || notification.timestamp)}
            </span>
            {meta.path && (
              <span style={{ fontSize: "0.67rem", fontWeight: 700, color: meta.color, display: "flex", alignItems: "center", gap: 3 }}>
                View <ChevronRight size={10} />
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   NotifRow
───────────────────────────────────────── */
function NotifRow({ n, onRead, onNavigate, compact = false }) {
  const meta = getMeta(n.type);
  const rowBg = n.read ? "var(--app-surface)" : "color-mix(in srgb, var(--app-surface-2) 86%, #00a884 14%)";
  const hoverBg = "color-mix(in srgb, var(--app-surface-2) 82%, #00a884 18%)";

  const handleClick = async () => {
    if (!n.read) await onRead(n._id || n.id);
    if (meta.path && onNavigate) onNavigate(meta.path);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: compact ? 10 : 11,
        padding: compact ? "11px 12px" : "12px 14px",
        margin: compact ? "0 10px 8px" : "0 12px 10px",
        background: rowBg,
        border: "1px solid var(--app-border)",
        borderRadius: 12,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--app-border) 70%, #00a884 30%)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = rowBg; e.currentTarget.style.borderColor = "var(--app-border)"; }}
    >
      <div style={{
        width: compact ? 30 : 34, height: compact ? 30 : 34,
        borderRadius: compact ? 9 : 10,
        background: `color-mix(in srgb, ${meta.color} 18%, var(--app-surface-2))`,
        color: meta.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
        border: `1px solid color-mix(in srgb, ${meta.color} 35%, transparent)`,
      }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {!compact && (
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: meta.color, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {meta.label}
          </div>
        )}
        <div style={{
          fontSize: compact ? "0.81rem" : "0.83rem",
          color: n.read ? "var(--app-text-muted)" : "var(--app-text)",
          fontWeight: n.read ? 500 : 750, lineHeight: 1.45,
          overflow: compact ? "hidden" : undefined,
          textOverflow: compact ? "ellipsis" : undefined,
          whiteSpace: compact ? "nowrap" : undefined,
        }}>
          {n.message}
        </div>
        <div style={{ fontSize: "0.67rem", color: "var(--app-text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
          <Clock size={9} style={{ verticalAlign: "middle" }} />
          {fmtRelative(n.createdAt || n.timestamp)}
          {meta.path && (
            <span style={{ color: meta.color, fontWeight: 800, marginLeft: 4 }}>
              → {meta.label.split(" ")[0]}
            </span>
          )}
        </div>
      </div>
      {!n.read && (
        <div style={{ width: compact ? 7 : 8, height: compact ? 7 : 8, borderRadius: "50%", background: meta.color, flexShrink: 0, marginTop: compact ? 4 : 5 }} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   NotifDropdown
───────────────────────────────────────── */
function NotifDropdown({ notifications, onRead, onReadAll, onViewAll, onClose, onNavigate }) {
  const preview     = notifications.slice(0, 5);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute", top: "calc(100% + 10px)", right: 0,
        transform: "translateX(-20px)", width: 430, minWidth: 360, maxWidth: "90vw",
        background: "var(--app-surface)", borderRadius: 18,
        boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
        border: "1px solid var(--app-border)", overflow: "hidden", maxHeight: "520px", zIndex: 9999,
        color: "var(--app-text)",
      }}
    >
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--app-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--app-surface)" }}>
        <span style={{ fontWeight: 850, fontSize: "0.92rem", color: "var(--app-text)" }}>
          Notifications
          {unreadCount > 0 && (
            <span style={{ marginLeft: 7, background: "#ef4444", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: "0.62rem", fontWeight: 800 }}>
              {unreadCount}
            </span>
          )}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {unreadCount > 0 && (
            <button onClick={onReadAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", color: "#00a884", fontWeight: 800, padding: 0 }}>
              Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--app-text-muted)", display: "flex", alignItems: "center" }}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div style={{ maxHeight: "354px", overflowY: "auto", paddingTop: 10, background: "var(--app-surface)" }}>
        {preview.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: "var(--app-text-muted)", fontSize: "0.83rem" }}>No notifications</div>
        ) : (
          preview.map(n => (
            <NotifRow key={n._id || n.id} n={n} onRead={onRead}
              onNavigate={(path) => { onClose(); onNavigate(path); }} compact />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <button onClick={onViewAll} style={{
          width: "100%", padding: "12px 14px", background: "var(--app-surface-2)", border: "none",
          borderTop: "1px solid var(--app-border)", cursor: "pointer", fontSize: "0.8rem",
          fontWeight: 800, color: "#00a884", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 5,
        }}>
          View all {notifications.length} notifications <ChevronRight size={13} />
        </button>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   AllNotificationsModal
───────────────────────────────────────── */
function AllNotificationsModal({ notifications, onRead, onReadAll, onClose, onNavigate }) {
  const grouped = {
    unread: notifications.filter(n => !n.read),
    read:   notifications.filter(n =>  n.read),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99998,
        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440,
          maxHeight: "80vh", display: "flex", flexDirection: "column",
          overflow: "hidden", boxShadow: "0 32px 64px rgba(15,23,42,0.18)",
        }}
      >
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f0f2f5", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.96rem", color: "#0f172a" }}>🔔 All Notifications</div>
            <div style={{ fontSize: "0.71rem", color: "#94a3b8", marginTop: 2 }}>
              {grouped.unread.length} unread · {notifications.length} total
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {grouped.unread.length > 0 && (
              <button onClick={onReadAll} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, border: "1.5px solid #0d9488", background: "#ccfbf1", color: "#0d9488", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>🔕</div>
              <div style={{ fontSize: "0.86rem", fontWeight: 600 }}>No notifications yet</div>
            </div>
          ) : (
            <>
              {grouped.unread.length > 0 && (
                <div>
                  <div style={{ padding: "8px 18px 4px", fontSize: "0.63rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", background: "#f8fafc" }}>Unread</div>
                  {grouped.unread.map(n => (
                    <NotifRow key={n._id || n.id} n={n} onRead={onRead}
                      onNavigate={(path) => { onClose(); onNavigate(path); }} />
                  ))}
                </div>
              )}
              {grouped.read.length > 0 && (
                <div>
                  <div style={{ padding: "8px 18px 4px", fontSize: "0.63rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", background: "#f8fafc" }}>Earlier</div>
                  {grouped.read.map(n => (
                    <NotifRow key={n._id || n.id} n={n} onRead={onRead}
                      onNavigate={(path) => { onClose(); onNavigate(path); }} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   MAIN TOPBAR
───────────────────────────────────────── */
export default function Topbar({ onMenuClick, onLogout, title = "Dashboard", hidden = false }) {
  const router = useRouter();

  const topbarRef      = useRef(null);
  const bellRefMobile  = useRef(null);
  const bellRefDesktop = useRef(null);
  const toastKeyRef    = useRef(0);  // incremented per toast → forces AnimatePresence remount

  const [searchValue,     setSearchValue]     = useState("");
  const [userName,        setUserName]        = useState("");
  const [userPhone,       setUserPhone]       = useState("");
  const [userRole,        setUserRole]        = useState("");
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [showAllModal,    setShowAllModal]    = useState(false);
  const [notifications,   setNotifications]   = useState([]);
  const [toastNotif,      setToastNotif]      = useState(null);

  // Stable ref — never changes, so the toast timer dep never triggers a restart
  const closeToast = useCallback(() => setToastNotif(null), []);

  const handleNavigate = useCallback((path) => {
    setShowDropdown(false);
    setShowAllModal(false);
    router.push(path);
  }, [router]);

  /* ── 1. Load user from localStorage ── */
  useEffect(() => {
    const load = () => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        setUserName(u.name || u.phone || "");
        setUserPhone(u.phone || "");
        setUserRole(u.role || "");
      } catch {}
    };
    load();
    window.addEventListener("loginStatusChanged", load);
    return () => window.removeEventListener("loginStatusChanged", load);
  }, []);

  /* ── 2. GSAP entrance ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(topbarRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
    });
    return () => ctx.revert();
  }, []);

  /* ── 3. Fetch existing notifications on page load ────────────────────
     Also shows a toast for the most recent unread one on every refresh.
     This is intentional — the user sees what they missed immediately.
  ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    API.get("/notifications")
      .then((res) => {
        if (cancelled) return;
        const raw    = res.data?.data || [];
        const sorted = raw.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setNotifications(sorted);

        // Toast for the latest unread notification on page load/refresh
        const latestUnread = sorted.find(n => !n.read);
        if (latestUnread) {
          toastKeyRef.current += 1;
          setToastNotif({ ...latestUnread, _toastKey: toastKeyRef.current });
        }
      })
      .catch((err) => console.error("Failed to load notifications:", err));
    return () => { cancelled = true; };
  }, []);

  /* ── 4. Socket: real-time notifications ──────────────────────────────
     Runs once userName is resolved from localStorage.
     Sequence guaranteed: socket already connected (autoConnect:true)
     → emit joinUserRoom → attach listener.

     socket.once("connect", joinRoom) handles the case where this effect
     runs BEFORE the socket finishes its initial TCP handshake.

     socket.on("connect", joinRoom) re-joins on every future reconnect
     so a network drop doesn't silently kill real-time updates.
  ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!userPhone) return;

    const socket = getSocket();

    const joinRoom = () => {
      console.log("📡 Joining room:", userPhone, "| socket:", socket.id);
      socket.emit("joinUserRoom", userPhone);
    };

    // Join immediately if connected, else wait for the connect event
    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
      socket.connect();
    }

    // Re-join on every future reconnect (network drop recovery)
    socket.on("connect", joinRoom);

    // Wipe stale listeners before attaching a fresh one
    socket.off("newNotification");

    const handleNew = (notif) => {
      console.log("✅ Real-time notification:", notif);

      const safeNotif = {
        ...notif,
        _id:       notif._id || notif.id || `temp-${Date.now()}`,
        read:      notif.read ?? false,
        createdAt: notif.createdAt || notif.timestamp || new Date().toISOString(),
      };

      setNotifications((prev) => {
        const exists = prev.some(
          (n) => String(n._id || n.id) === String(safeNotif._id)
        );
        if (exists) {
          return prev.map((n) =>
            String(n._id || n.id) === String(safeNotif._id)
              ? { ...n, ...safeNotif }
              : n
          );
        }
        return [safeNotif, ...prev];
      });

      // New key → AnimatePresence fully remounts the toast
      toastKeyRef.current += 1;
      setToastNotif({ ...safeNotif, _toastKey: toastKeyRef.current });
    };

    socket.on("newNotification", handleNew);

    return () => {
      socket.off("newNotification", handleNew);
      socket.off("connect", joinRoom);
    };
  }, [userPhone]);

  /* ── 5. Close dropdown on outside click ── */
  useEffect(() => {
    const fn = (e) => {
      const inMobile  = bellRefMobile.current?.contains(e.target);
      const inDesktop = bellRefDesktop.current?.contains(e.target);
      if (!inMobile && !inDesktop) setShowDropdown(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleRead = useCallback(async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id || n.id) === id ? { ...n, read: true } : n)
      );
    } catch (err) { console.log(err); }
  }, []);

  const handleReadAll = useCallback(async () => {
    try {
      await API.patch("/notifications/read-all/all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) { console.log(err); }
  }, []);

  const unreadCount   = notifications.filter(n => !n.read).length;
  const avatarInitial = userName?.charAt(0)?.toUpperCase() || "?";

  const handleLogout   = ()  => setShowLogoutPopup(true);
  const confirmLogout  = ()  => { setShowLogoutPopup(false); disconnectSocket(); if (onLogout) onLogout(); };
  const cancelLogout   = ()  => setShowLogoutPopup(false);
  const toggleDropdown = (e) => { e.stopPropagation(); setShowDropdown(p => !p); };

  const dropdownProps = {
    notifications,
    onRead:     handleRead,
    onReadAll:  handleReadAll,
    onViewAll:  () => { setShowDropdown(false); setShowAllModal(true); },
    onClose:    () => setShowDropdown(false),
    onNavigate: handleNavigate,
  };

  if (hidden) return null;

  return (
    <>
      <style>{`
        body[data-theme="dark"] .app-topbar-frame {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.22) !important;
        }
        body[data-theme="dark"] .app-topbar-soft,
        body[data-theme="dark"] .app-topbar-search,
        body[data-theme="dark"] .app-topbar-user {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .app-topbar-title,
        body[data-theme="dark"] .app-topbar-user-name {
          color: #e9edef !important;
        }
        body[data-theme="dark"] .app-topbar-divider {
          background: #2a3942 !important;
        }
        body[data-theme="dark"] .app-topbar-search input {
          color: #e9edef !important;
        }
        body[data-theme="dark"] .app-topbar-search input::placeholder {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .app-topbar-logout {
          background: rgba(239, 68, 68, 0.12) !important;
        }
        body[data-theme="dark"] .app-topbar-soft svg[stroke="#374151"] {
          stroke: #e9edef !important;
        }
        body[data-theme="dark"] .app-topbar-soft[style*="background: rgb(204, 251, 241)"],
        body[data-theme="dark"] .app-topbar-soft[style*="background: #ccfbf1"] {
          background: rgba(0, 168, 132, 0.22) !important;
        }
      `}</style>
      <header
        ref={topbarRef}
        style={{ width: "100%", marginBottom: "14px", boxSizing: "border-box", position: "relative", zIndex: 100 }}
      >
        {/* ══════════ MOBILE ══════════ */}
        <div className="flex md:hidden items-center gap-2" style={{ width: "100%" }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onMenuClick}
            className="app-topbar-soft"
            style={{ width: 40, height: 40, borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Menu size={18} color="#374151" />
          </motion.button>

          <div className="app-topbar-search" style={{ flex: 1, display: "flex", alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "0 12px", height: 40, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", gap: 8 }}>
            <Search size={15} color="#9ca3af" />
            <input value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="Search..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#374151" }} />
          </div>

          <div ref={bellRefMobile} style={{ position: "relative" }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleDropdown}
              className="app-topbar-soft"
              style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              <BellBadge size={17} unreadCount={unreadCount} />
            </motion.button>
            <AnimatePresence>
              {showDropdown && <NotifDropdown {...dropdownProps} />}
            </AnimatePresence>
          </div>

          <motion.button whileTap={{ scale: 0.9 }} onClick={handleLogout}
            style={{ width: 40, height: 40, borderRadius: "50%", background: "#0b535d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", flexShrink: 0, boxShadow: "0 4px 12px rgba(11,83,93,0.35)" }}
          >
            {avatarInitial}
          </motion.button>
        </div>

        {/* ══════════ DESKTOP ══════════ */}
        <div className="hidden md:flex items-center gap-3 app-topbar-frame"
          style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: "10px 16px", boxShadow: "0 2px 12px rgba(15,23,42,0.06)", width: "100%", boxSizing: "border-box" }}
        >
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} onClick={onMenuClick}
            className="app-topbar-soft"
            style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Menu size={17} color="#374151" />
          </motion.button>

          <span className="app-topbar-title" style={{ fontSize: 15, fontWeight: 700, color: "#111827", flexShrink: 0 }}>{title}</span>
          <div className="app-topbar-divider" style={{ width: 1, height: 22, background: "#e2e8f0", flexShrink: 0 }} />

          <div className="app-topbar-search" style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e9eef3", borderRadius: 12, padding: "0 14px", height: 36, gap: 8, width: 280, flexShrink: 0 }}>
            <Search size={14} color="#9ca3af" />
            <input value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="Search chats..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#374151" }} />
          </div>

          <div style={{ flex: 1 }} />

          <div ref={bellRefDesktop} style={{ position: "relative" }}>
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={toggleDropdown}
              className="app-topbar-soft"
              style={{ width: 36, height: 36, borderRadius: 10, background: showDropdown ? "#ccfbf1" : "#f1f5f9", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}
            >
              <BellBadge size={16} active={showDropdown} unreadCount={unreadCount} />
            </motion.button>
            <AnimatePresence>
              {showDropdown && <NotifDropdown {...dropdownProps} />}
            </AnimatePresence>
          </div>

          <div className="app-topbar-user" style={{ display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9", borderRadius: 12, padding: "4px 12px 4px 4px", flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0b535d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
              {avatarInitial}
            </div>
            <span className="app-topbar-user-name" style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{userName || "User"}</span>
          </div>

          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={handleLogout}
            className="app-topbar-logout"
            style={{ width: 36, height: 36, borderRadius: 10, background: "#fff0f0", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <LogOut size={16} color="#ef4444" />
          </motion.button>
        </div>
      </header>

      {/* ══════════ NOTIFICATION TOAST ══════════ */}
      <AnimatePresence>
        {toastNotif && (
          <NotifToast
            key={toastNotif._toastKey}     // new key per notif = full remount = fresh timer
            notification={toastNotif}
            onClose={closeToast}           // stable useCallback, never restarts timer
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>

      {/* ══════════ ALL NOTIFICATIONS MODAL ══════════ */}
      <AnimatePresence>
        {showAllModal && (
          <AllNotificationsModal
            notifications={notifications}
            onRead={handleRead}
            onReadAll={handleReadAll}
            onClose={() => setShowAllModal(false)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>

      {/* ══════════ LOGOUT CONFIRMATION ══════════ */}
      <AnimatePresence>
        {showLogoutPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={cancelLogout}
            style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ background: "#fff", borderRadius: 24, padding: "36px 28px 28px", width: "100%", maxWidth: 360, boxShadow: "0 32px 64px rgba(15,23,42,0.2)", textAlign: "center" }}
            >
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #fff0f0 0%, #ffe4e4 100%)", border: "2px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <LogOut size={26} color="#ef4444" />
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Logout?</div>
              <div style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.6, marginBottom: 28, padding: "0 8px" }}>
                You will be logged out of your account. You can sign back in anytime.
              </div>
              <div style={{ height: 1, background: "#f1f5f9", marginBottom: 20 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={confirmLogout}
                  style={{ width: "100%", padding: "12px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(239,68,68,0.35)" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <LogOut size={16} /> Yes, Logout
                </button>
                <button onClick={cancelLogout}
                  style={{ width: "100%", padding: "12px 0", borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#374151", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
