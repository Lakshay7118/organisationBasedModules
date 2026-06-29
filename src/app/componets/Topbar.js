"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search, LogOut, Bell, X, CheckCheck,
  ChevronRight, Clock, Shield, Users, Megaphone,
  FileText, ListTodo, RotateCcw,
} from "lucide-react";
import { getSocket, disconnectSocket } from "../lib/socket";
import API from "../utils/api";

/* ─────────────────────────────────────────
   Notification type config
───────────────────────────────────────── */
const NOTIF_META = {
  task_assigned:               { icon: <ListTodo  size={13} />, color: "#0d9488", bg: "#ccfbf1", label: "Task",          path: "/task"      },
  response_received:           { icon: <ListTodo  size={13} />, color: "#3b82f6", bg: "#eff6ff", label: "Task",          path: "/task"      },
  task_reminder:               { icon: <Bell      size={13} />, color: "#d97706", bg: "#fef3c7", label: "Task",          path: "/task"      },
  approval_requested:          { icon: <Shield    size={13} />, color: "#d97706", bg: "#fef3c7", label: "Approval",      path: "/task"      },
  task_approved:               { icon: <ListTodo  size={13} />, color: "#059669", bg: "#d1fae5", label: "Task",          path: "/task"      },
  task_rejected:               { icon: <ListTodo  size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Task",          path: "/task"      },
  contact_approval_requested:  { icon: <Users     size={13} />, color: "#7c3aed", bg: "#f3e8ff", label: "Contact",       path: "/contacts"  },
  contact_approved:            { icon: <Users     size={13} />, color: "#059669", bg: "#d1fae5", label: "Contact",       path: "/contacts"  },
  contact_rejected:            { icon: <Users     size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Contact",       path: "/contacts"  },
  template_approval_requested: { icon: <FileText  size={13} />, color: "#ec4899", bg: "#fce7f3", label: "Template",      path: "/Template"  },
  template_approved:           { icon: <FileText  size={13} />, color: "#059669", bg: "#d1fae5", label: "Template",      path: "/Template"  },
  template_rejected:           { icon: <FileText  size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Template",      path: "/Template"  },
  campaign_approval_requested: { icon: <Megaphone size={13} />, color: "#f97316", bg: "#ffedd5", label: "Campaign",      path: "/Campaigns" },
  campaign_approved:           { icon: <Megaphone size={13} />, color: "#059669", bg: "#d1fae5", label: "Campaign",      path: "/Campaigns" },
  campaign_rejected:           { icon: <Megaphone size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Campaign",      path: "/Campaigns" },
  profile_approval_requested:  { icon: <Shield    size={13} />, color: "#14b8a6", bg: "#ccfbf1", label: "Profile",       path: "/Settings"  },
  profile_approved:            { icon: <Shield    size={13} />, color: "#059669", bg: "#d1fae5", label: "Profile",       path: "/Settings"  },
  profile_rejected:            { icon: <Shield    size={13} />, color: "#ef4444", bg: "#fee2e2", label: "Profile",       path: "/Settings"  },
  support_ticket_created:      { icon: <Bell      size={13} />, color: "#06b6d4", bg: "#cffafe", label: "Support",       path: "/Settings?openSupport=1"  },
  support_ticket_replied:      { icon: <Bell      size={13} />, color: "#3b82f6", bg: "#dbeafe", label: "Support",       path: "/Settings?openSupport=1"  },
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
   NotifToast  (unchanged)
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
      if (elapsed >= duration) { clearInterval(tick); onClose(); }
    }, 40);
    return () => clearInterval(tick);
  }, [onClose]);

  if (!notification) return null;

  const handleClick = () => { onClose(); if (meta.path) onNavigate(meta.path); };

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
   NotifRow  ← REDESIGNED (slim)
───────────────────────────────────────── */
function NotifRow({ n, onRead, onNavigate }) {
  const meta = getMeta(n.type);

  const rowBg      = n.read ? "var(--app-surface)" : `color-mix(in srgb, var(--app-surface) 93%, ${meta.color} 7%)`;
  const rowBgHover = `color-mix(in srgb, var(--app-surface-2) 88%, ${meta.color} 12%)`;

  const handleClick = async () => {
    if (!n.read) await onRead(n._id || n.id);
    if (meta.path && onNavigate) onNavigate(meta.path);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        padding: "7px 12px",
        background: rowBg,
        cursor: "pointer",
        transition: "background 0.12s",
        borderBottom: "0.5px solid var(--app-border)",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = rowBgHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
    >
      {/* Icon badge */}
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: meta.bg, color: meta.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
      }}>
        {meta.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "0.8rem",
          color: n.read ? "var(--app-text-muted)" : "var(--app-text)",
          fontWeight: n.read ? 400 : 500,
          lineHeight: 1.4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {n.message}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <Clock size={9} color="var(--app-text-muted)" />
          <span style={{ fontSize: "0.67rem", color: "var(--app-text-muted)" }}>
            {fmtRelative(n.createdAt || n.timestamp)}
          </span>
          {meta.path && (
            <span style={{
              fontSize: "0.67rem", fontWeight: 600,
              color: meta.color,
              background: meta.bg,
              padding: "0 5px", borderRadius: 4,
              lineHeight: "16px",
            }}>
              {meta.label}
            </span>
          )}
        </div>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: meta.color, flexShrink: 0, marginTop: 5,
        }} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   NotifDropdown  ← REDESIGNED (slim)
───────────────────────────────────────── */
function NotifDropdown({ notifications, onRead, onReadAll, onViewAll, onClose, onNavigate }) {
  const preview     = notifications.slice(0, 5);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      exit={{    opacity: 0, y: -4, scale: 0.97  }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute", top: "calc(100% + 10px)", right: 0,
        transform: "translateX(-20px)",
        width: 360, maxWidth: "90vw",
        background: "var(--app-surface)",
        borderRadius: 14,
        boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        border: "1px solid var(--app-border)",
        overflow: "hidden",
        zIndex: 9999,
        color: "var(--app-text)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px 9px",
        borderBottom: "1px solid var(--app-border)",
      }}>
        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--app-text)", display: "flex", alignItems: "center", gap: 6 }}>
          Notifications
          {unreadCount > 0 && (
            <span style={{
              background: "#ef4444", color: "#fff",
              borderRadius: 20, padding: "1px 6px",
              fontSize: "0.6rem", fontWeight: 800,
            }}>
              {unreadCount}
            </span>
          )}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {unreadCount > 0 && (
            <button onClick={onReadAll} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.72rem", color: "#0d9488", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 3, padding: 0,
            }}>
              <CheckCheck size={11} /> Mark all read
            </button>
          )}
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--app-text-muted)", display: "flex", alignItems: "center",
          }}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Rows */}
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {preview.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: "var(--app-text-muted)", fontSize: "0.82rem" }}>
            No notifications
          </div>
        ) : (
          preview.map(n => (
            <NotifRow
              key={n._id || n.id}
              n={n}
              onRead={onRead}
              onNavigate={(path) => { onClose(); onNavigate(path); }}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <button onClick={onViewAll} style={{
          width: "100%", padding: "9px 12px",
          background: "var(--app-surface-2)",
          border: "none", borderTop: "1px solid var(--app-border)",
          cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
          color: "#0d9488",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          View all {notifications.length} notifications <ChevronRight size={12} />
        </button>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   AllNotificationsModal  ← REDESIGNED (slim)
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
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 8  }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--app-surface)",
          borderRadius: 16,
          width: "100%", maxWidth: 420,
          maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 64px rgba(15,23,42,0.18)",
          border: "1px solid var(--app-border)",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid var(--app-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--app-text)" }}>
              All Notifications
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--app-text-muted)", marginTop: 1 }}>
              {grouped.unread.length} unread · {notifications.length} total
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {grouped.unread.length > 0 && (
              <button onClick={onReadAll} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: 20,
                border: "1px solid #0d9488",
                background: "#ccfbf1", color: "#0d9488",
                fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
              }}>
                <CheckCheck size={11} /> Mark all read
              </button>
            )}
            <button onClick={onClose} style={{
              background: "var(--app-surface-2)", border: "none", borderRadius: "50%",
              width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--app-text-muted)",
            }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--app-text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔕</div>
              <div style={{ fontSize: "0.84rem", fontWeight: 600 }}>No notifications yet</div>
            </div>
          ) : (
            <>
              {grouped.unread.length > 0 && (
                <div>
                  <div style={{
                    padding: "6px 12px 4px",
                    fontSize: "0.62rem", fontWeight: 700,
                    color: "var(--app-text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    background: "var(--app-surface-2)",
                  }}>
                    Unread
                  </div>
                  {grouped.unread.map(n => (
                    <NotifRow
                      key={n._id || n.id} n={n} onRead={onRead}
                      onNavigate={(path) => { onClose(); onNavigate(path); }}
                    />
                  ))}
                </div>
              )}
              {grouped.read.length > 0 && (
                <div>
                  <div style={{
                    padding: "6px 12px 4px",
                    fontSize: "0.62rem", fontWeight: 700,
                    color: "var(--app-text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    background: "var(--app-surface-2)",
                  }}>
                    Earlier
                  </div>
                  {grouped.read.map(n => (
                    <NotifRow
                      key={n._id || n.id} n={n} onRead={onRead}
                      onNavigate={(path) => { onClose(); onNavigate(path); }}
                    />
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
   MAIN TOPBAR  (unchanged logic)
───────────────────────────────────────── */
export default function Topbar({ onLogout, title = "Dashboard", hidden = false }) {
  const router = useRouter();

  const topbarRef      = useRef(null);
  const bellRefMobile  = useRef(null);
  const bellRefDesktop = useRef(null);
  const toastKeyRef    = useRef(0);

  const [searchValue,     setSearchValue]     = useState("");
  const [userName,        setUserName]        = useState("");
  const [userId,          setUserId]          = useState("");
  const [userPhone,       setUserPhone]       = useState("");
  const [userRole,        setUserRole]        = useState("");
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [showAllModal,    setShowAllModal]    = useState(false);
  const [notifications,   setNotifications]   = useState([]);
  const [toastNotif,      setToastNotif]      = useState(null);
  const [hasOwnerSession, setHasOwnerSession] = useState(false);

  const closeToast = useCallback(() => setToastNotif(null), []);

  const handleNavigate = useCallback((path) => {
    setShowDropdown(false);
    setShowAllModal(false);
    if (path?.startsWith("/Settings?openSupport=1")) {
      window.dispatchEvent(new Event("openSupportChat"));
    }
    router.push(path);
  }, [router]);

  useEffect(() => {
    const load = () => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        setUserName(u.name || u.phone || "");
        setUserId((u.id || u._id || "").toString());
        setUserPhone(u.phone || "");
        setUserRole(u.role || "");
        setHasOwnerSession(Boolean(localStorage.getItem("ownerSession")));
      } catch {}
    };
    load();
    API.get("/users/me")
      .then((res) => {
        const me = res.data?.data;
        if (!me) return;
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...storedUser, ...me, id: me._id || me.id || storedUser.id }));
        load();
        window.dispatchEvent(new Event("loginStatusChanged"));
      })
      .catch(() => {});
    window.addEventListener("loginStatusChanged", load);
    return () => window.removeEventListener("loginStatusChanged", load);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(topbarRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    let cancelled = false;
    API.get("/notifications")
      .then((res) => {
        if (cancelled) return;
        const raw    = res.data?.data || [];
        const sorted = raw.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(sorted);
        const latestUnread = sorted.find(n => !n.read);
        if (latestUnread) {
          toastKeyRef.current += 1;
          setToastNotif({ ...latestUnread, _toastKey: toastKeyRef.current });
        }
      })
      .catch((err) => console.error("Failed to load notifications:", err));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userPhone && !userId) return;
    const socket = getSocket();
    const joinRoom = () => {
      if (userPhone) socket.emit("joinUserRoom", userPhone);
      if (userId)    socket.emit("joinUserIdRoom", userId);
    };
    if (socket.connected) joinRoom();
    else { socket.once("connect", joinRoom); socket.connect(); }
    socket.on("connect", joinRoom);
    socket.off("newNotification");
    const handleNew = (notif) => {
      const safeNotif = {
        ...notif,
        _id:       notif._id || notif.id || `temp-${Date.now()}`,
        read:      notif.read ?? false,
        createdAt: notif.createdAt || notif.timestamp || new Date().toISOString(),
      };
      setNotifications((prev) => {
        const exists = prev.some(n => String(n._id || n.id) === String(safeNotif._id));
        if (exists) return prev.map(n => String(n._id || n.id) === String(safeNotif._id) ? { ...n, ...safeNotif } : n);
        return [safeNotif, ...prev];
      });
      toastKeyRef.current += 1;
      setToastNotif({ ...safeNotif, _toastKey: toastKeyRef.current });
    };
    socket.on("newNotification", handleNew);
    return () => { socket.off("newNotification", handleNew); socket.off("connect", joinRoom); };
  }, [userPhone, userId]);

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
      setNotifications(prev => prev.map(n => (n._id || n.id) === id ? { ...n, read: true } : n));
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

  const handleBackToOwner = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("ownerSession") || "{}");
      if (!saved.token || !saved.user) return;

      localStorage.setItem("token", saved.token);
      localStorage.setItem("user", saved.user);
      if (saved.role) localStorage.setItem("role", saved.role);
      else localStorage.removeItem("role");
      localStorage.removeItem("ownerSession");
      window.dispatchEvent(new Event("loginStatusChanged"));
      router.push("/organizations");
      window.location.reload();
    } catch {
      localStorage.removeItem("ownerSession");
      setHasOwnerSession(false);
    }
  };

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
        body[data-theme="dark"] .app-topbar-divider { background: #2a3942 !important; }
        body[data-theme="dark"] .app-topbar-search input { color: #e9edef !important; }
        body[data-theme="dark"] .app-topbar-search input::placeholder { color: #8696a0 !important; }
        body[data-theme="dark"] .app-topbar-logout { background: rgba(239, 68, 68, 0.12) !important; }
        body[data-theme="dark"] .app-topbar-soft svg[stroke="#374151"] { stroke: #e9edef !important; }
      `}</style>

      <header
        ref={topbarRef}
        style={{ width: "100%", marginBottom: "14px", boxSizing: "border-box", position: "relative", zIndex: 100 }}
      >
        {/* ══════════ MOBILE ══════════ */}
        <div className="flex md:hidden items-center gap-2" style={{ width: "100%" }}>
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

          {hasOwnerSession && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBackToOwner}
              title="Back to owner"
              className="app-topbar-soft"
              style={{ width: 40, height: 40, borderRadius: "50%", background: "#ccfbf1", color: "#0f766e", border: "1px solid #99f6e4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              <RotateCcw size={17} />
            </motion.button>
          )}

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
          <span className="app-topbar-title" style={{ fontSize: 15, fontWeight: 800, color: "#111827", flexShrink: 0 }}>{title}</span>
          <div className="app-topbar-divider" style={{ width: 1, height: 22, background: "#e2e8f0", flexShrink: 0 }} />

          <div className="app-topbar-search" style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e9eef3", borderRadius: 12, padding: "0 14px", height: 36, gap: 8, width: 280, flexShrink: 0 }}>
            <Search size={14} color="#9ca3af" />
            <input value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="Search chats..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#374151" }} />
          </div>

          <div style={{ flex: 1 }} />

          {hasOwnerSession && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleBackToOwner}
              title="Back to owner"
              style={{
                height: 36,
                borderRadius: 10,
                border: "1px solid #99f6e4",
                background: "#ccfbf1",
                color: "#0f766e",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "0 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              <RotateCcw size={14} />
              Back to owner
            </motion.button>
          )}

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
            key={toastNotif._toastKey}
            notification={toastNotif}
            onClose={closeToast}
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
            style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
