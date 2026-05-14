"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiTrash2, FiEdit2 } from "react-icons/fi";
import API from "../utils/api";

/* ---------- Utility: pageWrapper style ---------- */
const pageWrapStyle = (mobile) => ({
  width: "100%",
  height: "100%",
  minHeight: 0,
  background: "#f3f4f6",
  padding: mobile ? "16px 12px" : "28px 32px 20px",
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  overflow: "hidden",
  boxSizing: "border-box",
});

/* ---------- StatusBadge ---------- */
function StatusBadge({ status }) {
  const colors = {
    approved: { bg: "#d1fae5", color: "#065f46" },
    pending: { bg: "#fef3c7", color: "#92400e" },
    rejected: { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = colors[status] || colors.pending;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 6,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

/* ---------- TagBadge ---------- */
function TagBadge({ label }) {
  return (
    <span
      style={{
        background: "#fde8e8",
        color: "#c0392b",
        borderRadius: 6,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function ContactsDarkStyles() {
  return (
    <style>{`
      body[data-theme="dark"] .contacts-page {
        background: #0b141a !important;
        color: #e9edef !important;
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
    source: "MANUAL",
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
      source: form.source,
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
          <button onClick={onClose} style={closeBtn}>
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
            ⏳ Your contact will be sent for <strong>admin approval</strong> before being visible.
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
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: 16,
                  padding: 0,
                }}
              >
                {showPassword ? "🙈" : "👁"}
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

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Source</label>
          <select value={form.source} onChange={handle("source")} style={inputStyle}>
            <option value="ORGANIC">ORGANIC</option>
            <option value="IMPORTED">IMPORTED</option>
            <option value="MANUAL">MANUAL</option>
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
    source: contact.source || "MANUAL",
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
      source: form.source,
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
          <button onClick={onClose} style={closeBtn}>
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
            ⏳ Edits will be sent for <strong>admin approval</strong>.
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
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: 16,
                  padding: 0,
                }}
              >
                {showPassword ? "🙈" : "👁"}
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

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Source</label>
          <select value={form.source} onChange={handle("source")} style={inputStyle}>
            <option value="ORGANIC">ORGANIC</option>
            <option value="IMPORTED">IMPORTED</option>
            <option value="MANUAL">MANUAL</option>
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
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
              </th>
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
                <td style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "30%", height: 12, borderRadius: 4 }} />
                </td>
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
        alert("✅ Contact submitted! Waiting for admin approval.");
      } else {
        alert("✅ Contact added successfully!");
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
        alert("✅ Edit submitted! Waiting for admin approval.");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update contact");
    }
  };

  const approveContact = async (id) => {
    try {
      await API.put(`/contacts/${id}/approve`);
      setPendingContacts((prev) => prev.filter((c) => c._id !== id));
      alert("✅ Contact approved!");
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
    return (
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      tagNames.toLowerCase().includes(search.toLowerCase())
    );
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
    gap: 10,
    marginBottom: 16,
    flexWrap: mobile ? "nowrap" : "wrap",
    flexShrink: 0,
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
            <button style={{ ...tabBtn, background: "#0d9488", color: "#fff" }}>
              👥 Managers
            </button>
            <button
              onClick={() => {
                setAdminView("all");
                setLoading(true);
              }}
              style={tabBtn}
            >
              🌐 All Contacts
            </button>
            <button
              onClick={() => {
                setAdminView("pending");
                setLoading(true);
              }}
              style={tabBtn}
            >
              ⏳ Pending Approvals
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
            <button onClick={() => setAdminView("managers")} style={tabBtn}>
              👥 Managers
            </button>
            <button
              onClick={() => {
                setAdminView("all");
                setLoading(true);
              }}
              style={tabBtn}
            >
              🌐 All Contacts
            </button>
            <button style={{ ...tabBtn, background: "#0d9488", color: "#fff" }}>
              ⏳ Pending Approvals
            </button>
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
            Pending Approvals{" "}
            <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 400 }}>
              ({pendingContacts.length})
            </span>
          </h2>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ height: "100%", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
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
                    <tr key={c._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={td}>{c.name}</td>
                      <td style={td}>{c.mobile}</td>
                      <td style={td}>
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            style={{ color: "#0d9488", textDecoration: "none", fontSize: 13 }}
                          >
                            {c.email}
                          </a>
                        ) : (
                          <span style={{ color: "#e74c3c", fontSize: 12, fontWeight: 600 }}>
                            ⚠ No email
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
                              borderRadius: 6,
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => rejectContact(c._id)}
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "none",
                              borderRadius: 6,
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            ❌ Reject
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
            <button onClick={() => setAdminView("managers")} style={tabBtn}>
              👥 Managers
            </button>
            <button style={{ ...tabBtn, background: "#0d9488", color: "#fff" }}>
              {adminView === "manager"
                ? `📋 ${selectedManager?.name}'s Contacts`
                : "🌐 All Contacts"}
            </button>
            <button
              onClick={() => {
                setAdminView("pending");
                setLoading(true);
              }}
              style={tabBtn}
            >
              ⏳ Pending
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
                ← Back to Managers
              </button>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div style={toolbarWrapStyle(isMobile)}>
          <div style={{ position: "relative", width: isMobile ? "100%" : "auto" }}>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, mobile, email or tag"
              style={{
                ...inputStyle,
                width: isMobile ? "100%" : 280,
                paddingLeft: 36,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
                fontSize: 15,
              }}
            >
              🔍
            </span>
          </div>

          <select
            value={filterTagId}
            onChange={(e) => setFilterTagId(e.target.value)}
            style={{ ...inputStyle, width: isMobile ? "100%" : 150 }}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag._id} value={tag._id}>
                {getTagName(tag)}
              </option>
            ))}
          </select>

          <div style={{ flex: isMobile ? "0" : 1 }} />

          {isSuperAdmin && selected.size > 0 && (
            <button
              onClick={deleteSelected}
              style={{ ...secondaryBtn, color: "#e74c3c", borderColor: "#e74c3c" }}
            >
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
            🏷 Add Tag
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ ...primaryBtn, width: isMobile ? "100%" : "auto" }}
          >
            + Add Contact
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
                minWidth: isMobile ? 700 : 0,
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
                  <th style={{ ...stickyTh, textAlign: "left", whiteSpace: "nowrap" }}>
                    Source
                  </th>
                  <th style={{ ...stickyTh, textAlign: "left" }}>Status</th>
                  {isSuperAdmin && <th style={{ ...stickyTh, textAlign: "left" }}>Created By</th>}
                  {isManagerOrAbove && <th style={{ ...stickyTh, textAlign: "left" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        padding: "48px 0",
                        color: "#9ca3af",
                        fontSize: 14,
                      }}
                    >
                      No contacts found. Click "+ Add Contact" to get started.
                    </td>
                  </tr>
                )}
                {paged.map((c, i) => (
                  <tr
                    key={c._id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: selected.has(c._id)
                        ? "#f0fdf4"
                        : i % 2 === 0
                        ? "#fff"
                        : "#fafafa",
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
                    <td style={td}>{c.name}</td>
                    <td style={td}>{c.mobile}</td>
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
                            style={{ color: "#e74c3c", fontSize: 12, fontWeight: 600 }}
                          >
                            ⚠ No email
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
                    <td style={td}>{c.source || "—"}</td>
                    <td style={td}>
                      <StatusBadge status={c.status || "approved"} />
                    </td>
                    {isSuperAdmin && (
                      <td style={{ ...td, fontSize: 12, color: "#6b7280" }}>
                        {c.createdBy?.name || "—"}
                        <br />
                        <span style={{ color: "#9ca3af" }}>{c.createdBy?.role}</span>
                      </td>
                    )}
                    {isManagerOrAbove && (
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setEditingContact(c)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#3b82f6",
                            }}
                            title="Edit"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => deleteSingleContact(c._id, c.name)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#dc3545",
                              }}
                              title="Delete"
                            >
                              <FiTrash2 size={16} />
                            </button>
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

        {/* Pagination */}
        <div style={paginationRow}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={pageBtn(currentPage === 1)}
          >
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
  padding: "9px 12px",
  border: "1.5px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  color: "#1a2233",
  background: "#fff",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 5,
};

const primaryBtn = {
  background: "#0d9488",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const secondaryBtn = {
  background: "#fff",
  color: "#374151",
  border: "1.5px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const tabBtn = {
  background: "#fff",
  border: "1.5px solid #e5e7eb",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "#374151",
};

const stickyTh = {
  padding: "12px 16px",
  fontWeight: 600,
  fontSize: 13,
  color: "#0d9488",
  whiteSpace: "nowrap",
  background: "#f9fafb",
  position: "sticky",
  top: 0,
  zIndex: 2,
  textAlign: "left",
};

const td = { padding: "12px 16px", color: "#374151", fontSize: 14 };

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
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "4px 12px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  fontSize: 16,
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
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};

const tableScroll = {
  height: "100%",
  overflowY: "auto",
  overflowX: "auto",
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalBox = {
  background: "#fff",
  borderRadius: 14,
  padding: "28px 32px",
  width: 440,
  maxWidth: "95vw",
  boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
};

const closeBtn = {
  background: "none",
  border: "none",
  fontSize: 18,
  cursor: "pointer",
  color: "#6b7280",
  padding: "0 4px",
};
