"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit,
  Eye,
  EyeOff,
  Globe2,
  Plus,
  Search,
  Tag,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import API from "../utils/api";

const ROLE_FILTERS = [
  { value: "", label: "All roles" },
  { value: "user", label: "Users" },
  { value: "manager", label: "Managers" },
  { value: "super_admin", label: "Super Admin" },
];

const getContactRole = (contact) =>
  contact.loginUser?.role || contact.role || contact.createdBy?.role || "";

/* ---------- Utility: pageWrapper style ---------- */
const pageWrapStyle = (mobile) => ({
  width: "100%",
  height: "100%",
  minHeight: 0,
  background:
    "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
  padding: mobile ? "14px 10px" : "24px 28px 20px",
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  overflow: "hidden",
  boxSizing: "border-box",
});

/* ---------- StatusBadge ---------- */
function StatusBadge({ status }) {
  const normalized = (status || "pending").toLowerCase();
  const colors = {
    approved: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
    pending: { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    rejected: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  };
  const s = colors[normalized] || colors.pending;
  const label = normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: s.bg,
        color: s.color,
        borderRadius: 8,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

/* ---------- TagBadge ---------- */
function TagBadge({ label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "#ede9fe",
        color: "#7c3aed",
        borderRadius: 8,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <Tag size={12} />
      {label}
    </span>
  );
}

function ActionIconButton({ label, tone = "default", children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={actionIconBtn(tone)}
      {...props}
    >
      {children}
    </button>
  );
}

function LoginAccessToggle({ contact, onToggle }) {
  const hasLogin = Boolean(contact.loginUser?._id);
  const isActive = contact.loginUser?.isActive !== false;

  return (
    <button
      type="button"
      onClick={() => hasLogin && onToggle(contact)}
      disabled={!hasLogin}
      aria-pressed={hasLogin ? isActive : undefined}
      title={hasLogin ? "Toggle login access" : "No login account exists"}
      style={{
        width: 92,
        height: 30,
        borderRadius: 999,
        border: "none",
        background: !hasLogin ? "#e5e7eb" : isActive ? "#d1fae5" : "#fee2e2",
        color: !hasLogin ? "#6b7280" : isActive ? "#065f46" : "#991b1b",
        cursor: hasLogin ? "pointer" : "not-allowed",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: isActive && hasLogin ? "flex-end" : "flex-start",
        padding: 3,
        gap: 4,
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
        opacity: hasLogin ? 1 : 0.75,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          flexShrink: 0,
          order: isActive && hasLogin ? 2 : 0,
        }}
      />
      <span style={{ flex: 1, textAlign: "center", lineHeight: 1 }}>
        {!hasLogin ? "No login" : isActive ? "Active" : "Inactive"}
      </span>
    </button>
  );
}

function ContactsDarkStyles() {
  return (
    <style>{`
      .contacts-page .contacts-table-row {
        transition: background 0.15s ease;
      }
      .contacts-page .contacts-table-row:hover {
        background: #fafbff !important;
      }
      body[data-theme="dark"] .contacts-page {
        background: #0b141a !important;
        color: #e9edef !important;
      }
      body[data-theme="dark"] .contacts-page .contacts-table-row:hover {
        background: #18242b !important;
      }
      body[data-theme="dark"] .contacts-page [style*="background: #fff"],
      body[data-theme="dark"] .contacts-page [style*="background:#fff"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(255, 255, 255)"] {
        background: #111b21 !important;
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .contacts-page [style*="background: #fafafa"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(250, 250, 250)"],
      body[data-theme="dark"] .contacts-page [style*="background: #f9fafb"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(249, 250, 251)"],
      body[data-theme="dark"] .contacts-page [style*="background: #f3f4f6"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(243, 244, 246)"],
      body[data-theme="dark"] .contacts-page [style*="background: #f0fdf4"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(240, 253, 244)"] {
        background: #202c33 !important;
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: #1a2233"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: rgb(26, 34, 51)"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: #111827"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: rgb(17, 24, 39)"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: #374151"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: rgb(55, 65, 81)"] {
        color: #e9edef !important;
      }
      body[data-theme="dark"] .contacts-page :is(p, div, span, label, td, th, button)[style*="color: #6b7280"],
      body[data-theme="dark"] .contacts-page :is(p, div, span, label, td, th, button)[style*="color: rgb(107, 114, 128)"],
      body[data-theme="dark"] .contacts-page :is(p, div, span, label, td, th, button)[style*="color: #9ca3af"],
      body[data-theme="dark"] .contacts-page :is(p, div, span, label, td, th, button)[style*="color: rgb(156, 163, 175)"] {
        color: #aebac1 !important;
      }
      body[data-theme="dark"] .contacts-page th,
      body[data-theme="dark"] .contacts-page [style*="background: #f9fafb"][style*="position: sticky"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(249, 250, 251)"][style*="position: sticky"] {
        background: #202c33 !important;
        color: #00a884 !important;
      }
      body[data-theme="dark"] .contacts-page table,
      body[data-theme="dark"] .contacts-page tr,
      body[data-theme="dark"] .contacts-page td,
      body[data-theme="dark"] .contacts-page th,
      body[data-theme="dark"] .contacts-page [style*="border-bottom: 1px solid"],
      body[data-theme="dark"] .contacts-page [style*="border: 1px solid"],
      body[data-theme="dark"] .contacts-page [style*="border: 1.5px solid"] {
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .contacts-page input,
      body[data-theme="dark"] .contacts-page select {
        background: #202c33 !important;
        border-color: #2a3942 !important;
        color: #e9edef !important;
      }
      body[data-theme="dark"] .contacts-page input::placeholder {
        color: #8696a0 !important;
      }
      body[data-theme="dark"] .contacts-page button[style*="background: #fff"],
      body[data-theme="dark"] .contacts-page button[style*="background: rgb(255, 255, 255)"] {
        background: #202c33 !important;
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .contacts-page .shimmer {
        background: linear-gradient(90deg, #1f2c34 25%, #2a3942 37%, #1f2c34 63%) !important;
        background-size: 200px 100% !important;
      }
    `}</style>
  );
}

/* ---------- AddContactModal ---------- */
function AddContactModal({ onClose, onAdd, availableTags, isSuperAdmin }) {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    tagId: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handle = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = () => {
    const cleanMobile = form.mobile.replace(/\s/g, "").trim();
    if (!cleanMobile) return setError("Mobile number is required.");
    if (!/^\d{10,15}$/.test(cleanMobile))
      return setError("Enter a valid mobile number (10–15 digits).");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError("Enter a valid email address.");
    if (isSuperAdmin && form.email && !form.password)
      return setError("Password is required when email is provided.");
    if (form.password && form.password.length < 6)
      return setError("Password must be at least 6 characters.");
    setError("");
    onAdd({
      name: form.name.trim() || "UNKNOWN",
      mobile: cleanMobile,
      email: form.email.trim() || null,
      password: form.password || undefined,
      tags: form.tagId ? [form.tagId] : [],
      role: form.role,
    });
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={{ ...modalBox, maxHeight: "90vh", overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
            Add Contact
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={17} />
            ✕
          </button>
        </div>

        {error && (
          <p
            style={{
              color: "#e74c3c",
              fontSize: 13,
              marginBottom: 12,
              background: "#fdf0f0",
              padding: "8px 12px",
              borderRadius: 6,
            }}
          >
            {error}
          </p>
        )}

        {!isSuperAdmin && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            <Clock3 size={15} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            Your contact will be sent for <strong>admin approval</strong> before being visible.
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Name</label>
          <input
            value={form.name}
            onChange={handle("name")}
            placeholder="Full name (optional)"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mobile Number *</label>
          <input
            value={form.mobile}
            onChange={handle("mobile")}
            placeholder="e.g. 919876543210"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            Email Address
            {isSuperAdmin && (
              <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6, fontSize: 12 }}>
                (used for login)
              </span>
            )}
          </label>
          <input
            value={form.email}
            onChange={handle("email")}
            placeholder="e.g. john@example.com"
            type="email"
            style={inputStyle}
          />
        </div>

        {isSuperAdmin && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              Password
              <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6, fontSize: 12 }}>
                (required if email is set)
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                value={form.password}
                onChange={handle("password")}
                placeholder="Min. 6 characters"
                type={showPassword ? "text" : "password"}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: 0,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tag</label>
          <select value={form.tagId} onChange={handle("tagId")} style={inputStyle}>
            <option value="">Select a tag</option>
            {availableTags.map((tag) => (
              <option key={tag._id} value={tag._id}>
                {tag.name || tag.tagName}
              </option>
            ))}
          </select>
        </div>

        {isSuperAdmin && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={handle("role")} style={inputStyle}>
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>
          <button onClick={submit} style={primaryBtn}>
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- EditContactModal ---------- */
function EditContactModal({ contact, onClose, onUpdate, availableTags, isSuperAdmin }) {
  const [form, setForm] = useState({
    name: contact.name || "",
    mobile: contact.mobile || "",
    email: contact.email || "",
    password: "",
    tagId: contact.tags && contact.tags.length > 0 ? contact.tags[0]._id : "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const handle = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = () => {
    const cleanMobile = form.mobile.replace(/\s/g, "").trim();
    if (!cleanMobile) return setError("Mobile number is required.");
    if (!/^\d{10,15}$/.test(cleanMobile))
      return setError("Enter a valid mobile number (10–15 digits).");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError("Enter a valid email address.");
    if (form.password && form.password.length < 6)
      return setError("Password must be at least 6 characters.");
    setError("");
    onUpdate(contact._id, {
      name: form.name.trim() || "UNKNOWN",
      mobile: cleanMobile,
      email: form.email.trim() || null,
      password: form.password || undefined,
      tags: form.tagId ? [form.tagId] : [],
    });
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={{ ...modalBox, maxHeight: "90vh", overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
            Edit Contact
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={17} />
            ✕
          </button>
        </div>

        {error && (
          <p
            style={{
              color: "#e74c3c",
              fontSize: 13,
              marginBottom: 12,
              background: "#fdf0f0",
              padding: "8px 12px",
              borderRadius: 6,
            }}
          >
            {error}
          </p>
        )}

        {!isSuperAdmin && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            <Clock3 size={15} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            Edits will be sent for <strong>admin approval</strong>.
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Name</label>
          <input
            value={form.name}
            onChange={handle("name")}
            placeholder="Full name (optional)"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mobile Number *</label>
          <input
            value={form.mobile}
            onChange={handle("mobile")}
            placeholder="e.g. 919876543210"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            Email Address
            {isSuperAdmin && (
              <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6, fontSize: 12 }}>
                (used for login)
              </span>
            )}
          </label>
          <input
            value={form.email}
            onChange={handle("email")}
            placeholder="e.g. john@example.com"
            type="email"
            style={inputStyle}
          />
        </div>

        {isSuperAdmin && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              New Password
              <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6, fontSize: 12 }}>
                (leave blank to keep existing)
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                value={form.password}
                onChange={handle("password")}
                placeholder="Min. 6 characters"
                type={showPassword ? "text" : "password"}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: 0,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tag</label>
          <select value={form.tagId} onChange={handle("tagId")} style={inputStyle}>
            <option value="">Select a tag</option>
            {availableTags.map((tag) => (
              <option key={tag._id} value={tag._id}>
                {tag.name || tag.tagName}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>
          <button onClick={submit} style={primaryBtn}>
            Update Contact
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ManagerCard ---------- */
function ManagerCard({ manager, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        cursor: "pointer",
        border: "1.5px solid #e5e7eb",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0d9488")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#0d9488",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {(manager.name || "M")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#1a2233", fontSize: 15 }}>
            {manager.name || "Unknown"}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{manager.phone}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Skeleton Loader ---------- */
function SkeletonContacts({ isSuperAdmin, isManager, adminView, isMobile }) {
  const shimmerCSS = `
    @keyframes shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
    .shimmer {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
      background-size: 200px 100%;
      animation: shimmer 1.4s ease infinite;
    }
  `;

  if (isSuperAdmin && adminView === "managers") {
    return (
      <div className="contacts-page" style={pageWrapStyle(isMobile)}>
        <ContactsDarkStyles />
        <style>{shimmerCSS}</style>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 18,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div className="shimmer" style={{ width: 42, height: 42, borderRadius: "50%" }} />
              <div style={{ flex: 1 }}>
                <div className="shimmer" style={{ width: "60%", height: 14, borderRadius: 4, marginBottom: 6 }} />
                <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isSuperAdmin && adminView === "pending") {
    return (
      <div className="contacts-page" style={pageWrapStyle(isMobile)}>
        <ContactsDarkStyles />
        <style>{shimmerCSS}</style>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Mobile", "Email", "Created By", "Role", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left" }}>
                    <div className="shimmer" style={{ width: "60%", height: 12, borderRadius: 4 }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, r) => (
                <tr key={r}>
                  {[0, 1, 2, 3, 4, 5].map((c) => (
                    <td key={c} style={{ padding: "12px 16px" }}>
                      <div
                        className="shimmer"
                        style={{
                          width: c === 0 ? "70%" : c === 5 ? "40%" : "50%",
                          height: 12,
                          borderRadius: 4,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Main contacts table skeleton
  const showEmail = isSuperAdmin;
  const showCreatedBy = isSuperAdmin;
  const showLogin = isSuperAdmin;
  const showActions = isSuperAdmin || isManager;
  const showCheckbox = isSuperAdmin;

  return (
    <div className="contacts-page" style={pageWrapStyle(isMobile)}>
      <ContactsDarkStyles />
      <style>{shimmerCSS}</style>
      <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {showCheckbox && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: 20, height: 12, borderRadius: 4 }} />
                </th>
              )}
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "60%", height: 12, borderRadius: 4 }} />
              </th>
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
              </th>
              {showEmail && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
                </th>
              )}
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
              </th>
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
              </th>
              {showLogin && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
                </th>
              )}
              {showCreatedBy && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
                </th>
              )}
              {showActions && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, r) => (
              <tr key={r}>
                {showCheckbox && (
                  <td style={{ padding: "12px 16px" }}>
                    <div className="shimmer" style={{ width: 16, height: 16, borderRadius: 4 }} />
                  </td>
                )}
                <td style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "80%", height: 12, borderRadius: 4 }} />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "70%", height: 12, borderRadius: 4 }} />
                </td>
                {showEmail && (
                  <td style={{ padding: "12px 16px" }}>
                    <div className="shimmer" style={{ width: "60%", height: 12, borderRadius: 4 }} />
                  </td>
                )}
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div className="shimmer" style={{ width: 50, height: 12, borderRadius: 4 }} />
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
                </td>
                {showLogin && (
                  <td style={{ padding: "12px 16px" }}>
                    <div className="shimmer" style={{ width: 76, height: 20, borderRadius: 999 }} />
                  </td>
                )}
                {showCreatedBy && (
                  <td style={{ padding: "12px 16px" }}>
                    <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
                  </td>
                )}
                {showActions && (
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div className="shimmer" style={{ width: 16, height: 16, borderRadius: 4 }} />
                      {isSuperAdmin && (
                        <div className="shimmer" style={{ width: 16, height: 16, borderRadius: 4 }} />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Main ContactsPage ---------- */
export default function ContactsPage() {
  const router = useRouter();

  const [contacts, setContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [managers, setManagers] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [filterTagId, setFilterTagId] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [adminView, setAdminView] = useState("all");
  const [selectedManager, setSelectedManager] = useState(null);
  const [userRole, setUserRole] = useState("");
  const PER_PAGE = 25;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role || "");
    const check = () => setIsMobile(window.innerWidth <= 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isSuperAdmin = userRole === "super_admin";
  const isManager = userRole === "manager";
  const isManagerOrAbove = isSuperAdmin || isManager;

  const fetchContacts = async () => {
    try {
      let url = "/contacts";
      if (isSuperAdmin) {
        if (adminView === "all") url = "/contacts";
        else if (adminView === "manager" && selectedManager)
          url = `/contacts?managerId=${selectedManager._id}`;
        else if (adminView === "pending") url = "/contacts/pending";
        else return;
      }
      if (filterTagId) url += (url.includes("?") ? "&" : "?") + `tag=${filterTagId}`;
      const res = await API.get(url);
      if (adminView === "pending") {
        setPendingContacts(res.data);
      } else {
        const data = Array.isArray(res.data) ? res.data : res.data.contacts || [];
        setContacts(data);
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await API.get("/contacts/managers");
      setManagers(res.data);
    } catch (err) {
      console.error("Failed to fetch managers:", err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await API.get("/tags");
      const data = res.data;
      setTags(
        Array.isArray(data.tags) ? data.tags : Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchTags();
      if (isSuperAdmin) fetchManagers();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole) {
      setLoading(true);
      fetchContacts();
    }
  }, [filterTagId, adminView, selectedManager, userRole]);

  const addContact = async (contact) => {
    try {
      const res = await API.post("/contacts", contact);
      if (res.data.status === "pending") {
        alert("Contact submitted. Waiting for admin approval.");
      } else {
        alert("Contact added successfully.");
      }
      setContacts((prev) => [res.data, ...prev]);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create contact");
    }
  };

  const updateContact = async (id, updatedData) => {
    try {
      const res = await API.put(`/contacts/${id}`, updatedData);
      setContacts((prev) => prev.map((c) => (c._id === id ? res.data : c)));
      if (res.data.status === "pending")
        alert("Edit submitted. Waiting for admin approval.");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update contact");
    }
  };

  const toggleLoginAccess = async (contact) => {
    if (!contact.loginUser?._id) return;

    const nextActive = contact.loginUser.isActive === false;
    try {
      const res = await API.patch(`/contacts/${contact._id}/login-status`, {
        isActive: nextActive,
      });
      setContacts((prev) => prev.map((c) => (c._id === contact._id ? res.data : c)));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update login access");
    }
  };

  const approveContact = async (id) => {
    try {
      await API.put(`/contacts/${id}/approve`);
      setPendingContacts((prev) => prev.filter((c) => c._id !== id));
      alert("Contact approved.");
    } catch (err) {
      alert("Failed to approve");
    }
  };

  const rejectContact = async (id) => {
    try {
      await API.put(`/contacts/${id}/reject`);
      setPendingContacts((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      alert("Failed to reject");
    }
  };

  const deleteSingleContact = async (contactId, contactName) => {
    if (!confirm(`Delete "${contactName}" permanently?`)) return;
    try {
      await API.delete(`/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
      const next = new Set(selected);
      next.delete(contactId);
      setSelected(next);
    } catch (err) {
      alert("Failed to delete contact");
    }
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !confirm(`Delete ${ids.length} contact(s)?`)) return;
    try {
      await Promise.all(ids.map((id) => API.delete(`/contacts/${id}`)));
      setContacts((prev) => prev.filter((c) => !selected.has(c._id)));
      setSelected(new Set());
    } catch (err) {
      alert("Error deleting selected contacts");
    }
  };

  const getTagName = (tag) => {
    if (typeof tag === "string") return tag;
    return tag?.name || tag?.tagName || "";
  };

  const filtered = contacts.filter((c) => {
    const tagNames = (c.tags || []).map(getTagName).join(" ");
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      tagNames.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || getContactRole(c) === roleFilter;
    return matchesSearch && matchesRole;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const toggleAll = () => {
    if (selected.size === paged.length && paged.length > 0) setSelected(new Set());
    else setSelected(new Set(paged.map((c) => c._id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toolbarWrapStyle = (mobile) => ({
    display: "flex",
    flexDirection: mobile ? "column" : "row",
    alignItems: mobile ? "stretch" : "center",
    gap: 12,
    marginBottom: 20,
    flexWrap: mobile ? "nowrap" : "wrap",
    flexShrink: 0,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.05)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
    borderRadius: 22,
    padding: 16,
  });

  // ===== SKELETON LOADING =====
  if (loading) {
    return (
      <SkeletonContacts
        isSuperAdmin={isSuperAdmin}
        isManager={isManager}
        adminView={adminView}
        isMobile={isMobile}
      />
    );
  }

  // ════════════════════════════════════════
  // SUPER ADMIN — MANAGERS LIST VIEW
  // ════════════════════════════════════════
  if (isSuperAdmin && adminView === "managers") {
    return (
      <div className="contacts-page" style={pageWrapStyle(isMobile)}>
        <ContactsDarkStyles />
        <div style={contentShell}>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                setAdminView("all");
                setLoading(true);
              }}
              style={tabBtn}
            >
              <Globe2 size={15} />
              All Contacts
            </button>
            <button style={{ ...tabBtn, ...activeTabBtn }}>
              <Users size={15} />
              Managers
            </button>
            <button
              onClick={() => {
                setAdminView("pending");
                setLoading(true);
              }}
              style={tabBtn}
            >
              <Clock3 size={15} />
              Pending Approvals
              {pendingContacts.length > 0 && (
                <span
                  style={{
                    background: "#e74c3c",
                    color: "#fff",
                    borderRadius: "50%",
                    padding: "1px 6px",
                    fontSize: 11,
                    marginLeft: 6,
                  }}
                >
                  {pendingContacts.length}
                </span>
              )}
            </button>
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
            All Managers
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              overflowY: "auto",
            }}
          >
            {managers.length === 0 && (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>No managers found.</p>
            )}
            {managers.map((mgr) => (
              <ManagerCard
                key={mgr._id}
                manager={mgr}
                onClick={() => {
                  setSelectedManager(mgr);
                  setAdminView("manager");
                  setLoading(true);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // SUPER ADMIN — PENDING APPROVALS VIEW
  // ════════════════════════════════════════
  if (isSuperAdmin && adminView === "pending") {
    return (
      <div className="contacts-page" style={pageWrapStyle(isMobile)}>
        <ContactsDarkStyles />
        <div style={contentShell}>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                setAdminView("all");
                setLoading(true);
              }}
              style={tabBtn}
            >
              <Globe2 size={15} />
              All Contacts
            </button>
            <button onClick={() => setAdminView("managers")} style={tabBtn}>
              <Users size={15} />
              Managers
            </button>
            <button style={{ ...tabBtn, ...activeTabBtn }}>
              <Clock3 size={15} />
              Pending Approvals
            </button>
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
            Pending Approvals{" "}
            <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 400 }}>
              ({pendingContacts.length})
            </span>
          </h2>
          <div style={tableCard}>
            <div style={tableScroll}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 780 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th style={stickyTh}>Name</th>
                    <th style={stickyTh}>Mobile</th>
                    <th style={stickyTh}>Email</th>
                    <th style={stickyTh}>Created By</th>
                    <th style={stickyTh}>Role</th>
                    <th style={stickyTh}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingContacts.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          padding: "48px 0",
                          color: "#9ca3af",
                        }}
                      >
                        No pending approvals 🎉
                      </td>
                    </tr>
                  )}
                  {pendingContacts.map((c) => (
                    <tr
                      key={c._id}
                      className="contacts-table-row"
                      style={{ borderBottom: "1px solid #f3f4f6", background: "#fff" }}
                    >
                      <td style={{ ...td, color: "#0f172a", fontWeight: 750 }}>{c.name}</td>
                      <td style={{ ...td, color: "#475569", fontWeight: 600 }}>{c.mobile}</td>
                      <td style={td}>
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            style={{ color: "#0d9488", textDecoration: "none", fontSize: 13 }}
                          >
                            {c.email}
                          </a>
                        ) : (
                          <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 700 }}>
                            No email
                          </span>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: 13 }}>{c.createdBy?.name || "—"}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {c.createdBy?.role}
                        </div>
                      </td>
                      <td style={td}>
                        <StatusBadge status="pending" />
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => approveContact(c._id)}
                            style={{
                              background: "#d1fae5",
                              color: "#065f46",
                              border: "none",
                              borderRadius: 8,
                              padding: "7px 12px",
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <CheckCircle size={14} />
                            <span style={{ fontSize: 13 }}>Approve</span>
                          </button>
                          <button
                            onClick={() => rejectContact(c._id)}
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "none",
                              borderRadius: 8,
                              padding: "7px 12px",
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <XCircle size={14} />
                            <span style={{ fontSize: 13 }}>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // CONTACTS TABLE VIEW (all roles)
  // ════════════════════════════════════════
  return (
    <div className="contacts-page" style={pageWrapStyle(isMobile)}>
      <ContactsDarkStyles />
      <div style={contentShell}>
        {/* Admin Tabs */}
        {isSuperAdmin && (
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexShrink: 0,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button style={{ ...tabBtn, ...activeTabBtn }}>
              {adminView === "manager" ? (
                <>
                  <Users size={15} />
                  {selectedManager?.name}
                  {"'s Contacts"}
                </>
              ) : (
                <>
                  <Globe2 size={15} />
                  All Contacts
                </>
              )}
            </button>
            <button onClick={() => setAdminView("managers")} style={tabBtn}>
              <Users size={15} />
              Managers
            </button>
            <button
              onClick={() => {
                setAdminView("pending");
                setLoading(true);
              }}
              style={tabBtn}
            >
              <Clock3 size={15} />
              Pending
            </button>
            {adminView === "manager" && (
              <button
                onClick={() => {
                  setAdminView("managers");
                  setSelectedManager(null);
                }}
                style={{
                  ...secondaryBtn,
                  marginLeft: isMobile ? 0 : "auto",
                }}
              >
                <ArrowLeft size={15} />
                Back to Managers
              </button>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div style={toolbarWrapStyle(isMobile)}>
          <div
            style={{
              position: "relative",
              flex: isMobile ? "1 1 100%" : "1 1 340px",
              minWidth: isMobile ? "100%" : 260,
              maxWidth: isMobile ? "100%" : 520,
            }}
          >
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, mobile, email or tag"
              style={{
                ...inputStyle,
                width: "100%",
                paddingLeft: 42,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
                fontSize: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search size={17} />
            </span>
          </div>

          <select
            value={filterTagId}
            onChange={(e) => {
              setFilterTagId(e.target.value);
              setPage(1);
            }}
            style={filterSelectStyle(isMobile, 188)}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag._id} value={tag._id}>
                {getTagName(tag)}
              </option>
            ))}
          </select>

          {isSuperAdmin && (
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              style={filterSelectStyle(isMobile, 178)}
            >
              {ROLE_FILTERS.map((role) => (
                <option key={role.value || "all"} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          )}

          <div style={{ flex: isMobile ? "0" : 1 }} />

          {isSuperAdmin && selected.size > 0 && (
            <button
              onClick={deleteSelected}
              style={{ ...secondaryBtn, color: "#dc2626", borderColor: "#fecaca" }}
            >
              <Trash2 size={15} />
              Delete ({selected.size})
            </button>
          )}

          <button
            onClick={() => router.push("/Tags")}
            style={{
              ...primaryBtn,
              background: "#fff",
              color: "#0d9488",
              border: "1.5px solid #0d9488",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <Tag size={15} />
            Add Tag
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ ...primaryBtn, width: isMobile ? "100%" : "auto" }}
          >
            <Plus size={15} />
            Add Contact
          </button>
        </div>

        {/* Table */}
        <div style={tableCard}>
          <div style={tableScroll}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
                minWidth: isSuperAdmin ? 1040 : 760,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  {isSuperAdmin && (
                    <th style={stickyTh}>
                      <input
                        type="checkbox"
                        checked={
                          selected.size === paged.length && paged.length > 0
                        }
                        onChange={toggleAll}
                      />
                    </th>
                  )}
                  <th style={{ ...stickyTh, textAlign: "left" }}>Name</th>
                  <th style={{ ...stickyTh, textAlign: "left" }}>Mobile</th>
                  {isSuperAdmin && <th style={{ ...stickyTh, textAlign: "left" }}>Email</th>}
                  <th style={{ ...stickyTh, textAlign: "left" }}>Tags</th>
                  <th style={{ ...stickyTh, textAlign: "left" }}>Status</th>
                  {isSuperAdmin && <th style={{ ...stickyTh, textAlign: "left" }}>Login</th>}
                  {isSuperAdmin && <th style={{ ...stickyTh, textAlign: "left" }}>Created By</th>}
                  {isManagerOrAbove && <th style={{ ...stickyTh, textAlign: "left" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        4 +
                        (isSuperAdmin ? 4 : 0) +
                        (isManagerOrAbove ? 1 : 0)
                      }
                      style={{
                        textAlign: "center",
                        padding: "48px 0",
                        color: "#9ca3af",
                        fontSize: 14,
                      }}
                    >
                      No contacts found. Click &quot;+ Add Contact&quot; to get started.
                    </td>
                  </tr>
                )}
                {paged.map((c) => (
                  <tr
                    key={c._id}
                    className="contacts-table-row"
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: selected.has(c._id) ? "#f0fdf4" : "#fff",
                    }}
                  >
                    {isSuperAdmin && (
                      <td style={td}>
                        <input
                          type="checkbox"
                          checked={selected.has(c._id)}
                          onChange={() => toggleOne(c._id)}
                        />
                      </td>
                    )}
                    <td style={{ ...td, color: "#0f172a", fontWeight: 750 }}>
                      {c.name || "Unknown"}
                    </td>
                    <td style={{ ...td, color: "#475569", fontWeight: 600 }}>{c.mobile}</td>
                    {isSuperAdmin && (
                      <td style={td}>
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            style={{
                              color: "#0d9488",
                              textDecoration: "none",
                              fontSize: 13,
                            }}
                          >
                            {c.email}
                          </a>
                        ) : (
                          <span
                            style={{ color: "#dc2626", fontSize: 12, fontWeight: 700 }}
                          >
                            No email
                          </span>
                        )}
                      </td>
                    )}
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {c.tags && c.tags.length > 0 ? (
                          c.tags.map((tag, idx) => (
                            <TagBadge key={idx} label={getTagName(tag)} />
                          ))
                        ) : (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={td}>
                      <StatusBadge status={c.status || "approved"} />
                    </td>
                    {isSuperAdmin && (
                      <td style={td}>
                        <LoginAccessToggle contact={c} onToggle={toggleLoginAccess} />
                      </td>
                    )}
                    {isSuperAdmin && (
                      <td style={{ ...td, fontSize: 12, color: "#6b7280" }}>
                        {c.createdBy?.name || "—"}
                        <br />
                        <span style={{ color: "#9ca3af" }}>{c.createdBy?.role}</span>
                      </td>
                    )}
                    {isManagerOrAbove && (
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <ActionIconButton
                            onClick={() => setEditingContact(c)}
                            label="Edit"
                            tone="edit"
                          >
                            <Edit size={13} />
                          </ActionIconButton>
                          {isSuperAdmin && (
                            <ActionIconButton
                              onClick={() => deleteSingleContact(c._id, c.name)}
                              label="Delete"
                              tone="delete"
                            >
                              <Trash2 size={13} />
                            </ActionIconButton>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={tableFooter}>
            <span>
              Showing {paged.length} of {total} contacts
            </span>
            {(search || filterTagId || roleFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterTagId("");
                  setRoleFilter("");
                  setPage(1);
                }}
                style={clearFilterBtn}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div style={paginationRow}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={pageBtn(currentPage === 1)}
          >
            <ChevronLeft size={16} />
            ‹
          </button>
          <span style={{ fontSize: 13, color: "#374151" }}>
            {total === 0
              ? "0–0 of 0"
              : `${(currentPage - 1) * PER_PAGE + 1}–${Math.min(
                  currentPage * PER_PAGE,
                  total
                )} of ${total}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={pageBtn(currentPage === totalPages)}
          >
            <ChevronRight size={16} />
            ›
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onAdd={addContact}
          availableTags={tags}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      {editingContact && (
        <EditContactModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onUpdate={updateContact}
          availableTags={tags}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}

// ── Shared Styles ────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  border: "1px solid #dbe3eb",
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  color: "#0f172a",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 5,
};

const primaryBtn = {
  background: "linear-gradient(135deg, #0f5f64 0%, #14808a 65%, #22c55e 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  minHeight: 42,
  padding: "0 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 10px 20px rgba(15,95,100,0.16)",
};

const secondaryBtn = {
  background: "#fff",
  color: "#334155",
  border: "1px solid #dbe3eb",
  borderRadius: 999,
  minHeight: 42,
  padding: "0 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const tabBtn = {
  background: "#fff",
  border: "1px solid #dbe3eb",
  borderRadius: 999,
  minHeight: 40,
  padding: "0 15px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const activeTabBtn = {
  background: "linear-gradient(135deg, #0f5f64 0%, #14808a 65%, #22c55e 100%)",
  border: "none",
  color: "#fff",
  boxShadow: "0 10px 20px rgba(15,95,100,0.16)",
};

const stickyTh = {
  padding: "12px 20px",
  fontWeight: 800,
  fontSize: 11,
  color: "#64748b",
  whiteSpace: "nowrap",
  background: "#f8fafc",
  position: "sticky",
  top: 0,
  zIndex: 2,
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const td = { padding: "14px 20px", color: "#334155", fontSize: 13 };

const paginationRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  marginTop: 16,
  flexShrink: 0,
};

const pageBtn = (disabled) => ({
  background: "#fff",
  border: "1px solid #dbe3eb",
  borderRadius: 8,
  width: 34,
  height: 34,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  fontSize: 0,
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const contentShell = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const tableCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const tableScroll = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "auto",
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
};

const tableFooter = {
  padding: "11px 20px",
  borderTop: "1px solid #f1f5f9",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

const clearFilterBtn = {
  background: "none",
  border: "none",
  color: "#0f5f64",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  padding: 0,
};

const filterSelectStyle = (mobile, width = 180) => ({
  ...inputStyle,
  width: mobile ? "100%" : width,
  maxWidth: "100%",
  flex: mobile ? "1 1 100%" : `0 1 ${width}px`,
  minWidth: mobile ? "100%" : 150,
  paddingRight: 36,
});

const actionIconBtn = (tone) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  border: tone === "delete" ? "1px solid #fee2e2" : "1px solid #e5e7eb",
  background: "#fff",
  color: tone === "delete" ? "#dc2626" : tone === "edit" ? "#3b82f6" : "#475569",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.5)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  animation: "appModalBackdropIn 0.32s ease-out both",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const modalBox = {
  background: "#fff",
  borderRadius: 14,
  padding: "28px 32px",
  width: 440,
  maxWidth: "95vw",
  boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
  animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
};

const closeBtn = {
  background: "none",
  border: "none",
  fontSize: 0,
  cursor: "pointer",
  color: "#6b7280",
  padding: "4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
