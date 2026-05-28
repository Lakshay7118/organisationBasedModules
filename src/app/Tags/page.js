"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  PauseCircle,
  Play,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import API from "../utils/api";

// ── Helper: get tag name safely ──────────────────────────────────────────────
const getTagName = (tag) => tag?.name || tag?.tagName || "";

const ROLE_FILTERS = [
  { value: "", label: "All roles" },
  { value: "user", label: "Users" },
  { value: "manager", label: "Managers" },
  { value: "super_admin", label: "Super Admin" },
];

const getTagCreatorRole = (tag) => tag.createdByUser?.role || tag.createdBy?.role || "";

function TagsPageStyles() {
  return (
    <style>{`
      .tags-page .tags-table-row {
        transition: background 0.15s ease;
      }
      .tags-page .tags-table-row:hover {
        background: #fafbff !important;
      }
      @keyframes tagsSkeletonShimmer {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
      .tags-page .tags-skeleton {
        background: linear-gradient(90deg, #eef3f8 25%, #f8fafc 37%, #eef3f8 63%);
        background-size: 200% 100%;
        animation: tagsSkeletonShimmer 1.25s ease-in-out infinite;
      }
      .tags-page .tags-skeleton-row {
        border-bottom: 1px solid #f3f4f6;
        background: #fff;
      }
      .tags-page .tags-skeleton-row:nth-child(odd) {
        background: #fbfcff;
      }
      body[data-theme="dark"] .tags-page {
        background: #0b141a !important;
        color: #e9edef !important;
      }
      body[data-theme="dark"] .tags-page .tags-table-row:hover {
        background: #18242b !important;
      }
      body[data-theme="dark"] .tags-page [style*="background: #fff"],
      body[data-theme="dark"] .tags-page [style*="background:#fff"],
      body[data-theme="dark"] .tags-page [style*="background: rgb(255, 255, 255)"] {
        background: #111b21 !important;
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .tags-page [style*="background: #f8fafc"],
      body[data-theme="dark"] .tags-page [style*="background: rgb(248, 250, 252)"],
      body[data-theme="dark"] .tags-page [style*="background: #f1f5f9"],
      body[data-theme="dark"] .tags-page [style*="background: rgb(241, 245, 249)"] {
        background: #202c33 !important;
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .tags-page th,
      body[data-theme="dark"] .tags-page [style*="position: sticky"] {
        background: #202c33 !important;
        color: #aebac1 !important;
      }
      body[data-theme="dark"] .tags-page table,
      body[data-theme="dark"] .tags-page tr,
      body[data-theme="dark"] .tags-page td,
      body[data-theme="dark"] .tags-page th,
      body[data-theme="dark"] .tags-page [style*="border: 1px solid"],
      body[data-theme="dark"] .tags-page [style*="border-bottom: 1px solid"] {
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .tags-page input,
      body[data-theme="dark"] .tags-page textarea {
        background: #202c33 !important;
        border-color: #2a3942 !important;
        color: #e9edef !important;
      }
      body[data-theme="dark"] .tags-page input::placeholder,
      body[data-theme="dark"] .tags-page textarea::placeholder {
        color: #8696a0 !important;
      }
      body[data-theme="dark"] .tags-page .tags-skeleton {
        background: linear-gradient(90deg, #202c33 25%, #2a3942 37%, #202c33 63%) !important;
        background-size: 200% 100% !important;
      }
      body[data-theme="dark"] .tags-page .tags-skeleton-row,
      body[data-theme="dark"] .tags-page .tags-skeleton-row:nth-child(odd) {
        background: #111b21 !important;
      }
      @media (prefers-reduced-motion: reduce) {
        .tags-page .tags-skeleton {
          animation: none;
        }
      }
    `}</style>
  );
}

function TagBadge({ label }) {
  return (
    <span style={tagBadgeStyle}>
      <Tag size={12} />
      {label}
    </span>
  );
}

function ActionIconButton({ label, tone = "default", children, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} style={actionIconBtn(tone)} {...props}>
      {children}
    </button>
  );
}

// ── Add Tag Modal (no category) ──────────────────────────────────────────────
function SkeletonBlock({ width = "100%", height = 16, radius = 8, style }) {
  return (
    <span
      className="tags-skeleton"
      style={{
        display: "inline-block",
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

function TagsPageSkeleton({ isMobile }) {
  const tableRows = Array.from({ length: 6 });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <SkeletonBlock width={82} height={38} radius={999} />
        <div>
          <SkeletonBlock width={86} height={20} radius={6} style={{ display: "block", marginBottom: 7 }} />
          <SkeletonBlock width={260} height={13} radius={6} style={{ maxWidth: "72vw" }} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(15,23,42,0.05)",
          boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
          borderRadius: 22,
          padding: 16,
        }}
      >
        <SkeletonBlock
          width={isMobile ? "100%" : 520}
          height={44}
          radius={14}
          style={{ maxWidth: "100%", flex: isMobile ? "1 1 100%" : "1 1 340px" }}
        />
        <SkeletonBlock width={isMobile ? "100%" : 178} height={44} radius={14} />
        <div style={{ flex: 1 }} />
        <SkeletonBlock width={isMobile ? "100%" : 112} height={42} radius={999} />
      </div>

      <div style={tableWrap}>
        <div style={tableScroll}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Tag Name", "First Message", "Status", "Action"].map((h) => (
                  <th key={h} style={{ ...th, textAlign: h === "Action" ? "center" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((_, index) => (
                <tr key={index} className="tags-skeleton-row">
                  <td style={td}>
                    <SkeletonBlock width={index % 2 ? 126 : 156} height={30} radius={8} />
                  </td>
                  <td style={{ ...td, maxWidth: 260 }}>
                    <SkeletonBlock width={index % 2 ? 180 : 240} height={15} radius={6} />
                  </td>
                  <td style={td}>
                    <SkeletonBlock width={82} height={30} radius={8} />
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <SkeletonBlock width={32} height={32} radius={8} />
                      <SkeletonBlock width={32} height={32} radius={8} />
                      <SkeletonBlock width={32} height={32} radius={8} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={tableFooter}>
          <SkeletonBlock width={118} height={12} radius={6} />
          <SkeletonBlock width={72} height={12} radius={6} />
        </div>
      </div>
    </>
  );
}

function AddTagModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("Tag name is required.");
    setError("");
    onAdd({ name: name.trim() });
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2233" }}>Add Tag</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Create a new tag to organize your contacts</p>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        {error && (
          <p style={{ color: "#e74c3c", fontSize: 13, marginBottom: 12, background: "#fdf0f0", padding: "8px 12px", borderRadius: 6 }}>
            {error}
          </p>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Tag Name <span style={{ color: "#dc2626" }}>*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. VIP, New Lead, Support"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button onClick={submit} style={primaryBtn}>
            <Plus size={15} />
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit First Message Modal ────────────────────────────────────────────────
function EditMessageModal({ tag, onClose, onSave }) {
  const [msg, setMsg] = useState(tag.firstMessage || "");
  const tagName = getTagName(tag);

  return (
    <div style={overlay}>
      <div style={{ ...modalBox, width: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a2233" }}>
            First Message - <span style={{ color: "#0d9488" }}>{tagName}</span>
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={5}
          placeholder="Type the first message sent when this tag is assigned..."
          style={{ ...inputStyle, resize: "vertical", padding: "12px", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button onClick={() => { onSave(msg); onClose(); }} style={primaryBtn}>
            <Save size={15} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: isActive ? "#dcfce7" : "#fee2e2",
        color: isActive ? "#166534" : "#991b1b",
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
          background: isActive ? "#22c55e" : "#ef4444",
          display: "inline-block",
        }}
      />
      {status}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // 📱 Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch tags from backend
  const fetchTags = async () => {
    try {
      const res = await API.get("/tags");
      const data = res.data;
      setTags(data.tags || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Could not load tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // Add tag (POST)
  const addTag = async (newTag) => {
    const userId = localStorage.getItem("userId") || "test_user";
    const payload = { name: newTag.name, createdBy: userId };
    try {
      const res = await API.post("/tags", payload);
      const data = res.data;
      setTags((prev) => [data.tag || data, ...prev]);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create tag");
    }
  };

  // Toggle status (PUT)
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await API.put(`/tags/${id}`, { status: newStatus });
      const data = res.data;
      setTags((prev) => prev.map((t) => (t._id === id ? (data.tag || data) : t)));
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    }
  };

  // Delete tag (DELETE)
  const deleteTag = async (id) => {
    if (!confirm("Delete this tag? It will be removed from all contacts.")) return;
    try {
      await API.delete(`/tags/${id}`);
      setTags((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  // Save first message (PUT)
  const saveMessage = async (id, message) => {
    try {
      const res = await API.put(`/tags/${id}`, { firstMessage: message });
      const data = res.data;
      setTags((prev) => prev.map((t) => (t._id === id ? (data.tag || data) : t)));
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    }
  };

  // Filter tags based on search
  const filtered = tags.filter((t) => {
    const tagName = getTagName(t);
    const matchesSearch = tagName.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || getTagCreatorRole(t) === roleFilter;
    return matchesSearch && matchesRole;
  });

  // ── responsive style factories ──────────────────────────────────────────
  const pageWrapStyle = (mobile) => ({
    minHeight: "100%",
    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    padding: mobile ? "14px 10px" : "24px 28px 20px",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    overflow: "hidden",
    boxSizing: "border-box",
  });

  const toolbarStyle = (mobile) => ({
    display: "flex",
    alignItems: mobile ? "stretch" : "center",
    flexDirection: mobile ? "column" : "row",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.05)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
    borderRadius: 22,
    padding: 16,
  });

  const searchInputStyle = (mobile) => ({
    ...inputStyle,
    width: "100%",
    paddingLeft: 42,
  });

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="tags-page" style={pageWrapStyle(isMobile)}>
        <TagsPageStyles />
        <TagsPageSkeleton isMobile={isMobile} />
      </div>
    );
  }

  return (
    <div className="tags-page" style={pageWrapStyle(isMobile)}>
      <TagsPageStyles />
      {/* Back + Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/contacts")} style={backBtn}>
          <ArrowLeft size={15} />
          Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1a2233" }}>Tags</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>
            Manage tags to categorize and segment your contacts
          </p>
        </div>
      </div>

      {/* Toolbar — responsive */}
      <div style={toolbarStyle(isMobile)}>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags..."
            style={searchInputStyle(isMobile)}
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
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={filterSelectStyle(isMobile, 178)}
        >
          {ROLE_FILTERS.map((role) => (
            <option key={role.value || "all"} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowAddModal(true)} style={{ ...primaryBtn, width: isMobile ? "100%" : "auto" }}>
          <Plus size={15} />
          Add Tag
        </button>
      </div>

      {/* Table — responsive */}
      <div style={tableWrap}>
        <div style={tableScroll}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              {["Tag Name", "First Message", "Status", "Action"].map((h) => (
                <th
                  key={h}
                  style={{ ...th, textAlign: h === "Action" ? "center" : "left" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "56px 0", color: "#9ca3af", fontSize: 14 }}>
                  {tags.length === 0
                    ? 'No tags yet. Click "+ Add Tag" to create one.'
                    : "No tags match your search."}
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <tr
                key={t._id}
                className="tags-table-row"
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: "#fff",
                }}
              >
                {/* Tag Name */}
                <td style={td}>
                  <TagBadge label={getTagName(t)} />
                </td>

                {/* First Message */}
                <td style={{ ...td, maxWidth: 260 }}>
                  {t.firstMessage ? (
                    <span
                      style={{ color: "#334155", cursor: "pointer", fontWeight: 600 }}
                      onClick={() => setEditingMsg(t)}
                      title="Click to edit"
                    >
                      {t.firstMessage.length > 60 ? t.firstMessage.slice(0, 57) + "..." : t.firstMessage}
                    </span>
                  ) : (
                    <button
                      onClick={() => setEditingMsg(t)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0d9488",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Plus size={13} />
                      Set message
                    </button>
                  )}
                </td>

                {/* Status */}
                <td style={td}>
                  <StatusBadge status={t.status || "Active"} />
                </td>

                {/* Action */}
                <td style={{ ...td, textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                    <ActionIconButton
                      onClick={() => toggleStatus(t._id, t.status)}
                      label={t.status === "Active" ? "Deactivate" : "Activate"}
                      tone={t.status === "Active" ? "pause" : "activate"}
                    >
                      {t.status === "Active" ? <PauseCircle size={13} /> : <Play size={13} />}
                    </ActionIconButton>
                    <ActionIconButton
                      onClick={() => setEditingMsg(t)}
                      label="Edit first message"
                      tone="edit"
                    >
                      <Edit size={13} />
                    </ActionIconButton>
                    <ActionIconButton
                      onClick={() => deleteTag(t._id)}
                      label="Delete tag"
                      tone="delete"
                    >
                      <Trash2 size={13} />
                    </ActionIconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div style={tableFooter}>
          <span>
            Showing {filtered.length} of {tags.length} tags
          </span>
          {(search || roleFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("");
              }}
              style={clearFilterBtn}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddTagModal onClose={() => setShowAddModal(false)} onAdd={addTag} />
      )}
      {editingMsg && (
        <EditMessageModal
          tag={editingMsg}
          onClose={() => setEditingMsg(null)}
          onSave={(msg) => saveMessage(editingMsg._id, msg)}
        />
      )}
    </div>
  );
}

// ── Styles (unchanged, just exported for use) ─────────────────────────────────
const inputStyle = {
  width: "100%",
  minHeight: 44,
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
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const backBtn = {
  background: "#fff",
  border: "1px solid #dbe3eb",
  borderRadius: 999,
  minHeight: 38,
  padding: "0 14px",
  fontSize: 13,
  cursor: "pointer",
  color: "#334155",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

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

const th = {
  padding: "12px 20px",
  fontWeight: 800,
  fontSize: 11,
  color: "#64748b",
  whiteSpace: "nowrap",
  background: "#f8fafc",
  position: "sticky",
  top: 0,
  zIndex: 2,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const td = {
  padding: "14px 20px",
  color: "#334155",
  fontSize: 13,
  verticalAlign: "middle",
};

const tableWrap = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  overflow: "hidden",
};

const tableScroll = {
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

const tagBadgeStyle = {
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
};

const actionIconBtn = (tone) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  border: tone === "delete" ? "1px solid #fee2e2" : "1px solid #e5e7eb",
  background: "#fff",
  color:
    tone === "delete"
      ? "#dc2626"
      : tone === "edit"
      ? "#3b82f6"
      : tone === "pause"
      ? "#f59e0b"
      : tone === "activate"
      ? "#16a34a"
      : "#475569",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});
