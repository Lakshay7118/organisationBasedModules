"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  Search,
  RefreshCcw,
  Send,
  ChevronRight,
  Megaphone,
  CalendarDays,
  PlayCircle,
  PauseCircle,
  Play,
  Trash2,
  Bell,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  X,
  Save,
  Repeat,
} from "lucide-react";
import API from "../utils/api";

/* ---------- shared styles ---------- */
const pageStyles = {
  shell: {
    background:
      "radial-gradient(circle at top left, rgba(15, 95, 100, 0.06), transparent 22%), radial-gradient(circle at top right, rgba(34, 197, 94, 0.05), transparent 20%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    minHeight: "calc(100vh - 70px)",
  },
  premiumCard: {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.05)",
    boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
    borderRadius: "24px",
  },
  statCard: {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.05)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
    borderRadius: "22px",
    padding: "18px",
    height: "100%",
  },
  statIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(15,95,100,0.12), rgba(34,197,94,0.12))",
    color: "#0f5f64",
    marginBottom: "14px",
  },
  heroChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(15,95,100,0.08)",
    color: "#0f5f64",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "10px",
  },
  heroTitle: {
    fontSize: "28px",
    fontWeight: 800,
    lineHeight: 1.2,
    color: "#0f172a",
    marginBottom: "6px",
  },
  heroSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: 1.7,
    margin: 0,
  },
  launchBtn: {
    minWidth: "160px",
    height: "42px",
    border: "none",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 700,
    background:
      "linear-gradient(135deg, #0f5f64 0%, #14808a 60%, #22c55e 100%)",
    boxShadow: "0 14px 28px rgba(15,95,100,0.22)",
    cursor: "pointer",
  },
  toolbarCard: {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.05)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
    borderRadius: "22px",
    padding: "16px",
  },
  searchWrap: {
    position: "relative",
    width: "100%",
  },
  searchInput: {
    height: "46px",
    borderRadius: "14px",
    border: "1px solid #dbe3eb",
    background: "#ffffff",
    paddingLeft: "42px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#0f172a",
    boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
    width: "100%",
  },
  refreshBtn: {
    height: "44px",
    padding: "0 16px",
    borderRadius: "999px",
    border: "1px solid #dbe3eb",
    background: "#fff",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  filterPill: {
    height: "36px",
    padding: "0 14px",
    borderRadius: "999px",
    border: "1px solid #dbe3eb",
    background: "#fff",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  filterPillActive: {
    color: "#fff",
    border: "none",
    background:
      "linear-gradient(135deg, #0f5f64 0%, #14808a 60%, #22c55e 100%)",
    boxShadow: "0 10px 20px rgba(15,95,100,0.16)",
  },
};

/* ---------- Helpers ---------- */

// Normalize any ID to string (handles ObjectId objects or plain strings)
const toStr = (id) => {
  if (!id) return "";
  if (typeof id === "object") return (id._id || id).toString();
  return id.toString();
};

function formatDateTime(dateStr) {
  if (!dateStr) return { date: "—", time: "" };
  const d = new Date(dateStr);
  if (isNaN(d)) return { date: "—", time: "" };
  const date = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return { date, time };
}

function getAudienceLabel(campaign) {
  const type = campaign.audienceType;
  if (type === "tags") {
    const count = campaign.tagIds?.length || 0;
    return { icon: "🏷️", label: `${count} tag${count !== 1 ? "s" : ""}`, color: "#7c3aed", bg: "#ede9fe" };
  }
  if (type === "contact") {
    const count = campaign.contactIds?.length || 0;
    return { icon: "👤", label: `${count} contact${count !== 1 ? "s" : ""}`, color: "#0369a1", bg: "#e0f2fe" };
  }
  if (type === "group") {
    const count = campaign.groupIds?.length || 0;
    return { icon: "👥", label: `${count} group${count !== 1 ? "s" : ""}`, color: "#0f766e", bg: "#ccfbf1" };
  }
  if (type === "manual") {
    const count = campaign.manualNumbers?.length || 0;
    return { icon: "📱", label: `${count} number${count !== 1 ? "s" : ""}`, color: "#b45309", bg: "#fef3c7" };
  }
  return { icon: "—", label: "Unknown", color: "#64748b", bg: "#f1f5f9" };
}

function getRecurrenceLabel(recurrence) {
  if (!recurrence || recurrence.type === "one-time") return null;
  const map = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", hourly: "Hourly" };
  const label = map[recurrence.type] || recurrence.type;
  const interval = recurrence.interval > 1 ? ` ×${recurrence.interval}` : "";
  return label + interval;
}

function statusStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "scheduled") return { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" };
  if (s === "sent")      return { bg: "#dcfce7", color: "#166534", dot: "#22c55e" };
  if (s === "paused")    return { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" };
  if (s === "draft")     return { bg: "#f8fafc", color: "#64748b", dot: "#cbd5e1" };
  if (s === "cancelled") return { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" };
  if (s === "failed")    return { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" };
  if (s === "active" || s === "running") return { bg: "#dcfce7", color: "#166534", dot: "#22c55e" };
  return { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" };
}

function ApprovalBadge({ status }) {
  if (!status || status === "approved") {
    return (
      <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
        ✓ Approved
      </span>
    );
  }
  if (status === "pending_approval") {
    return (
      <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
        ⏳ Pending
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
        ✕ Rejected
      </span>
    );
  }
  return null;
}

/* ---------- Skeleton components ---------- */
function SkeletonLine({ width = "100%", height = 14, radius = 8 }) {
  return (
    <div style={{ width, height, borderRadius: radius, background: "var(--skeleton-gradient)", backgroundSize: "200% 100%", animation: "pulse 1.2s ease-in-out infinite" }} />
  );
}

function HeaderSkeleton() {
  return (
    <div style={pageStyles.premiumCard} className="p-3 p-md-4">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-start align-items-lg-center">
        <div className="w-100">
          <SkeletonLine width={180} height={24} radius={8} />
          <div className="mt-2"><SkeletonLine width={260} height={14} radius={6} /></div>
        </div>
        <SkeletonLine width={170} height={44} radius={999} />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="row g-2 g-md-3">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="col-6 col-xl-3">
          <div style={pageStyles.statCard}>
            <SkeletonLine width={90} height={13} />
            <div className="mt-3"><SkeletonLine width={70} height={24} /></div>
            <div className="mt-2"><SkeletonLine width={120} height={12} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchFilterSkeleton() {
  return (
    <div style={pageStyles.toolbarCard}>
      <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-stretch align-items-lg-center">
        <div className="rounded-4" style={{ width: "100%", height: 46, background: "var(--skeleton-gradient)", backgroundSize: "200% 100%", animation: "pulse 1.2s ease-in-out infinite" }} />
        <div className="rounded-pill" style={{ width: 120, height: 44, background: "var(--skeleton-gradient)", backgroundSize: "200% 100%", animation: "pulse 1.2s ease-in-out infinite" }} />
      </div>
      <div className="d-flex flex-wrap gap-2 mt-3">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="rounded-pill" style={{ width: 90, height: 36, background: "var(--skeleton-gradient)", backgroundSize: "200% 100%", animation: "pulse 1.2s ease-in-out infinite" }} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Stat Card ---------- */
function StatCard({ icon: Icon, label, value, subtext }) {
  return (
    <div style={pageStyles.statCard}>
      <div style={pageStyles.statIcon}><Icon size={18} /></div>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, marginTop: "6px" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>{subtext}</div>
    </div>
  );
}

/* ---------- Pending Approvals Panel ---------- */
function PendingApprovalsPanel({ onApprove, onReject }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/campaigns/pending")
      .then((res) => setPending(res.data.campaigns || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    try {
      await API.put(`/campaigns/${id}/approve`);
      setPending((prev) => prev.filter((c) => c._id !== id));
      onApprove(id);
      alert("✅ Campaign approved!");
    } catch (err) { alert("Failed to approve"); }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/campaigns/${id}/reject`);
      setPending((prev) => prev.filter((c) => c._id !== id));
      onReject(id);
      alert("❌ Campaign rejected.");
    } catch (err) { alert("Failed to reject"); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading pending approvals...</div>;

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 800, fontSize: 15, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
        <Bell size={18} color="#f59e0b" />
        Pending Campaign Approvals
        <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{pending.length}</span>
      </div>
      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af", fontSize: 14 }}>🎉 No pending approvals</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 600 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Campaign Name", "Submitted By", "Role", "Date", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", fontWeight: 700, fontSize: 12, color: "#0d9488", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", color: "#374151", fontSize: 13, fontWeight: 600 }}>{c.campaignName}</td>
                  <td style={{ padding: "12px 16px", color: "#374151", fontSize: 13 }}>{c.createdBy?.name || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{c.createdBy?.role}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#374151", fontSize: 13 }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleApprove(c._id)} style={{ background: "#d1fae5", color: "#065f46", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button onClick={() => handleReject(c._id)} style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Edit Campaign Modal ---------- */
function EditCampaignModal({ campaignId, onClose, onUpdate, isSuperAdmin }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("basics");
  const [form, setForm] = useState({
    campaignName: "",
    messageType: "Pre-approved template message",
    audienceType: "tags",
    tagIds: [],
    contactIds: [],
    groupIds: [],
    manualNumbers: "",
    templateId: "",
    scheduledDateTime: "",
    recurrence: { type: "one-time", interval: 1 },
    messagePreview: "",
  });

  const [templates, setTemplates] = useState([]);
  const [tags, setTags] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (!campaignId) return;
    const fetchData = async () => {
      try {
        const [campaignRes, templatesRes, tagsRes, contactsRes, groupsRes] = await Promise.all([
          API.get(`/campaigns/${campaignId}`),
          API.get("/templates"),
          API.get("/tags"),
          API.get("/contacts"),
          API.get("/groups"),
        ]);

        if (campaignRes.data.success) {
          const c = campaignRes.data.campaign;

          // ✅ FIX: Normalize all IDs to plain strings
          // contactIds/tagIds/groupIds may come as ObjectId objects or strings
          const normalizeIds = (arr) =>
            (arr || []).map((id) =>
              typeof id === "object" ? (id._id || id).toString() : id.toString()
            );

          // ✅ FIX: Convert scheduledDateTime to local datetime-local format (IST)
          let scheduledDTLocal = "";
          if (c.scheduledDateTime) {
            const d = new Date(c.scheduledDateTime);
            // Convert UTC → IST for datetime-local input
            const IST_OFFSET = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(d.getTime() + IST_OFFSET);
            scheduledDTLocal = istDate.toISOString().slice(0, 16);
          }

          setForm({
            campaignName: c.campaignName || "",
            messageType: c.messageType || "Pre-approved template message",
            audienceType: c.audienceType || "tags",
            tagIds: normalizeIds(c.tagIds),
            contactIds: normalizeIds(c.contactIds),
            groupIds: normalizeIds(c.groupIds),
            manualNumbers: (c.manualNumbers || []).join("\n"),
            templateId: c.templateId?._id
              ? c.templateId._id.toString()
              : c.templateId
              ? c.templateId.toString()
              : "",
            scheduledDateTime: scheduledDTLocal,
            recurrence: c.recurrence || { type: "one-time", interval: 1 },
            messagePreview: c.messagePreview || "",
          });
        }

        setTemplates(templatesRes.data.templates || []);
        setTags(tagsRes.data.tags || []);
        // ✅ Normalize contacts from API too
        const rawContacts = contactsRes.data;
        setContacts(Array.isArray(rawContacts) ? rawContacts : rawContacts.contacts || []);
        const rawGroups = groupsRes.data;
        setGroups(Array.isArray(rawGroups) ? rawGroups : rawGroups.groups || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [campaignId]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // ✅ FIX: Use string comparison for checkboxes
  const handleArrayToggle = (field, id, checked) => {
    const idStr = id.toString();
    setForm((prev) => {
      const arr = (prev[field] || []).map(String);
      if (checked) return { ...prev, [field]: [...arr, idStr] };
      return { ...prev, [field]: arr.filter((v) => v !== idStr) };
    });
  };

  const isChecked = (field, id) =>
    form[field].map(String).includes(id.toString());

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        manualNumbers: form.manualNumbers
          ? form.manualNumbers.split("\n").map((n) => n.trim()).filter(Boolean)
          : [],
        // ✅ Send with IST offset so backend stores correct UTC
        scheduledDateTime: form.scheduledDateTime
          ? `${form.scheduledDateTime}:00+05:30`
          : null,
      };
      const res = await API.put(`/campaigns/${campaignId}`, payload);
      if (res.data.success) {
        if (res.data.pendingApproval) alert("✅ Campaign updated! Sent to admin for approval.");
        onUpdate(res.data.campaign);
        onClose();
      } else {
        throw new Error(res.data.error || "Update failed");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "basics", label: "Basics", icon: "📋" },
    { id: "audience", label: "Audience", icon: "👥" },
    { id: "schedule", label: "Schedule", icon: "📅" },
    { id: "preview", label: "Preview", icon: "👁️" },
  ];

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 12,
    border: "1px solid var(--campaign-modal-input-border, #dbe3eb)",
    background: "var(--campaign-modal-input-bg, #fff)", fontSize: 13,
    fontWeight: 500, color: "var(--campaign-modal-text, #0f172a)", outline: "none",
    transition: "border 0.2s", boxSizing: "border-box",
  };

  const checkboxGroupStyle = {
    maxHeight: 180, overflowY: "auto", border: "1px solid var(--campaign-modal-border, #e5e7eb)",
    borderRadius: 12, padding: "10px 14px", display: "flex",
    flexDirection: "column", gap: 8, background: "var(--campaign-modal-soft, #fafbfc)",
  };

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "48px 40px", textAlign: "center", boxShadow: "0 24px 60px rgba(15,23,42,0.18)", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>Loading campaign...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        body[data-theme="dark"] .campaign-edit-modal {
          --campaign-modal-bg: #111b21;
          --campaign-modal-header-bg: linear-gradient(180deg, #1f2c33 0%, #111b21 100%);
          --campaign-modal-body-bg: #0b141a;
          --campaign-modal-soft: #17232a;
          --campaign-modal-soft-2: #202c33;
          --campaign-modal-text: #e9edef;
          --campaign-modal-title: #f8fafc;
          --campaign-modal-muted: #aebac1;
          --campaign-modal-border: #2a3942;
          --campaign-modal-input-bg: #202c33;
          --campaign-modal-input-border: #33444c;
          --campaign-modal-tab-active-bg: #0b141a;
          --campaign-modal-tab-muted: #aebac1;
          --campaign-modal-selected-bg: rgba(20, 184, 166, 0.16);
          --campaign-modal-selected-border: #22d3c5;
          --campaign-modal-template-bg: #111b21;
          --campaign-modal-template-hover: #17232a;
          background: var(--campaign-modal-bg) !important;
          border: 1px solid var(--campaign-modal-border);
          color: var(--campaign-modal-text);
        }
        body[data-theme="dark"] .campaign-edit-header {
          background: var(--campaign-modal-header-bg) !important;
          border-color: var(--campaign-modal-border) !important;
        }
        body[data-theme="dark"] .campaign-edit-title,
        body[data-theme="dark"] .campaign-edit-template-name {
          color: var(--campaign-modal-title) !important;
        }
        body[data-theme="dark"] .campaign-edit-body {
          background: var(--campaign-modal-body-bg) !important;
          color: var(--campaign-modal-text);
          scrollbar-color: #687982 #17232a;
        }
        body[data-theme="dark"] .campaign-edit-label {
          color: #c7d2da !important;
        }
        body[data-theme="dark"] .campaign-edit-body label,
        body[data-theme="dark"] .campaign-edit-body label span,
        body[data-theme="dark"] .campaign-edit-body label div {
          color: #c7d2da !important;
        }
        body[data-theme="dark"] .campaign-edit-input,
        body[data-theme="dark"] .campaign-edit-input option,
        body[data-theme="dark"] .campaign-edit-body input,
        body[data-theme="dark"] .campaign-edit-body select,
        body[data-theme="dark"] .campaign-edit-body textarea {
          background: var(--campaign-modal-input-bg) !important;
          border-color: var(--campaign-modal-input-border) !important;
          color: var(--campaign-modal-text) !important;
        }
        body[data-theme="dark"] .campaign-edit-input::placeholder {
          color: #7f9098 !important;
        }
        body[data-theme="dark"] .campaign-edit-tab.active {
          background: var(--campaign-modal-tab-active-bg) !important;
          border-color: var(--campaign-modal-border) !important;
          border-bottom-color: var(--campaign-modal-tab-active-bg) !important;
          color: #2dd4bf !important;
        }
        body[data-theme="dark"] .campaign-edit-tab:not(.active) {
          color: var(--campaign-modal-tab-muted) !important;
        }
        body[data-theme="dark"] .campaign-edit-close {
          background: #202c33 !important;
          border-color: #33444c !important;
        }
        body[data-theme="dark"] .campaign-edit-close svg {
          color: #aebac1;
          stroke: #aebac1;
        }
        body[data-theme="dark"] .campaign-template-option {
          background: var(--campaign-modal-template-bg) !important;
          border-color: var(--campaign-modal-border) !important;
        }
        body[data-theme="dark"] .campaign-template-option.selected {
          background: var(--campaign-modal-selected-bg) !important;
          border-color: var(--campaign-modal-selected-border) !important;
          box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.24);
        }
        body[data-theme="dark"] .campaign-template-meta {
          color: var(--campaign-modal-muted) !important;
        }
        body[data-theme="dark"] .campaign-template-option > div:last-child {
          color: var(--campaign-modal-muted) !important;
        }
        body[data-theme="dark"] .campaign-edit-body button:not(.campaign-edit-tab) {
          border-color: var(--campaign-modal-input-border) !important;
        }
        body[data-theme="dark"] .campaign-edit-preview-box {
          background: rgba(0, 168, 132, 0.12) !important;
          border-color: rgba(0, 168, 132, 0.34) !important;
          color: var(--campaign-modal-text) !important;
        }
        body[data-theme="dark"] .campaign-edit-preview-box span {
          color: var(--campaign-modal-muted) !important;
        }
        body[data-theme="dark"] .campaign-edit-summary-box,
        body[data-theme="dark"] .campaign-edit-footer {
          background: var(--campaign-modal-soft) !important;
          border-color: var(--campaign-modal-border) !important;
        }
        body[data-theme="dark"] .campaign-edit-summary-title,
        body[data-theme="dark"] .campaign-edit-summary-key {
          color: var(--campaign-modal-title) !important;
        }
        body[data-theme="dark"] .campaign-edit-summary-value {
          color: var(--campaign-modal-muted) !important;
        }
        body[data-theme="dark"] .campaign-edit-summary-row {
          border-bottom-color: var(--campaign-modal-input-border) !important;
        }
        body[data-theme="dark"] .campaign-edit-secondary-btn {
          background: #111b21 !important;
          border-color: var(--campaign-modal-input-border) !important;
          color: var(--campaign-modal-title) !important;
        }
      `}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="campaign-edit-modal" style={{ background: "var(--campaign-modal-bg, #fff)", borderRadius: 24, width: 680, maxWidth: "95vw", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(15,23,42,0.22)", overflow: "hidden", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="campaign-edit-header" style={{ padding: "20px 24px 0", borderBottom: "1px solid var(--campaign-modal-border, #f1f5f9)", background: "var(--campaign-modal-header-bg, linear-gradient(180deg, #f8fafc 0%, #fff 100%))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(15,95,100,0.08)", color: "#0f5f64", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                ✏️ EDIT CAMPAIGN
              </div>
              <h3 className="campaign-edit-title" style={{ fontSize: 20, fontWeight: 800, color: "var(--campaign-modal-title, #0f172a)", margin: 0 }}>{form.campaignName || "Campaign"}</h3>
            </div>
            <button className="campaign-edit-close" onClick={onClose} style={{ border: "1px solid #e2e8f0", borderRadius: 10, width: 36, height: 36, background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <X size={16} color="#64748b" />
            </button>
          </div>
          {!isSuperAdmin && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: "8px 14px", marginBottom: 16, fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
              <span>⏳</span>
              <span>Your edits will be sent to <strong>admin for approval</strong> before going live.</span>
            </div>
          )}

          {/* Section tabs — scrollable on mobile */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none" }}>
            {sections.map((s) => (
              <button className={`campaign-edit-tab ${activeSection === s.id ? "active" : ""}`} key={s.id} onClick={() => setActiveSection(s.id)} style={{ padding: "8px 12px", borderRadius: "10px 10px 0 0", border: "1px solid transparent", borderBottom: "none", background: activeSection === s.id ? "var(--campaign-modal-tab-active-bg, #fff)" : "transparent", borderColor: activeSection === s.id ? "var(--campaign-modal-border, #e5e7eb)" : "transparent", borderBottomColor: activeSection === s.id ? "var(--campaign-modal-tab-active-bg, #fff)" : "transparent", marginBottom: activeSection === s.id ? -1 : 0, fontSize: 12, fontWeight: 700, color: activeSection === s.id ? "#0f5f64" : "var(--campaign-modal-tab-muted, #94a3b8)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span className="d-none d-sm-inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="campaign-edit-body" style={{ flex: 1, overflowY: "auto", padding: "24px", scrollbarWidth: "thin", background: "var(--campaign-modal-body-bg, #fff)" }}>
          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#991b1b", marginBottom: 16 }}>
              ❌ {error}
            </div>
          )}

          {/* BASICS */}
          {activeSection === "basics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label className="campaign-edit-label" style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Campaign Name *</label>
                <input className="campaign-edit-input" type="text" style={inputStyle} value={form.campaignName} onChange={(e) => handleChange("campaignName", e.target.value)} placeholder="e.g. Diwali Offer 2025" />
              </div>
              <div>
                <label className="campaign-edit-label" style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Message Type</label>
                <select className="campaign-edit-input" style={inputStyle} value={form.messageType} onChange={(e) => handleChange("messageType", e.target.value)}>
                  <option value="Pre-approved template message">Pre-approved template message</option>
                  <option value="Custom message">Custom message</option>
                </select>
              </div>
              {form.messageType === "Pre-approved template message" && (
                <div>
                  <label className="campaign-edit-label" style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 8 }}>Select Template</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {templates.filter((t) => t.approvalStatus === "approved").map((t) => (
                      <div className={`campaign-template-option ${form.templateId === t._id.toString() ? "selected" : ""}`} key={t._id} onClick={() => handleChange("templateId", t._id.toString())} style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer", border: `1px solid ${form.templateId === t._id.toString() ? "var(--campaign-modal-selected-border, #14808a)" : "var(--campaign-modal-border, #e5e7eb)"}`, background: form.templateId === t._id.toString() ? "var(--campaign-modal-selected-bg, #f0fdfa)" : "var(--campaign-modal-template-bg, #fff)", transition: "all 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                          <div className="campaign-edit-template-name" style={{ fontWeight: 700, fontSize: 13, color: "var(--campaign-modal-title, #0f172a)" }}>{t.name}</div>
                          <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>✅ Approved</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{t.category} • {t.mediaType}</div>
                      </div>
                    ))}
                    {templates.filter((t) => t.approvalStatus === "approved").length === 0 && (
                      <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>No approved templates available.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUDIENCE */}
          {activeSection === "audience" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Audience Type</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["tags", "contact", "group", "manual"].map((type) => (
                    <button key={type} onClick={() => handleChange("audienceType", type)} style={{ padding: "8px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid", cursor: "pointer", transition: "all 0.2s", borderColor: form.audienceType === type ? "#14808a" : "#dbe3eb", background: form.audienceType === type ? "linear-gradient(135deg,#0f5f64,#14808a)" : "#fff", color: form.audienceType === type ? "#fff" : "#334155" }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {form.audienceType === "tags" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>
                    Select Tags <span style={{ color: "#0f5f64" }}>({form.tagIds.length} selected)</span>
                  </label>
                  <div style={checkboxGroupStyle}>
                    {tags.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>No tags found.</div>}
                    {tags.map((tag) => (
                      <label key={tag._id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, padding: "4px 0" }}>
                        <input
                          type="checkbox"
                          checked={isChecked("tagIds", tag._id)}
                          onChange={(e) => handleArrayToggle("tagIds", tag._id, e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: "#0f5f64" }}
                        />
                        <span style={{ color: "#334155", fontWeight: 600 }}>{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.audienceType === "contact" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>
                    Select Contacts <span style={{ color: "#0f5f64" }}>({form.contactIds.length} selected)</span>
                  </label>
                  <div style={checkboxGroupStyle}>
                    {contacts.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>No contacts found.</div>}
                    {contacts.map((c) => (
                      <label key={c._id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, padding: "4px 0" }}>
                        <input
                          type="checkbox"
                          checked={isChecked("contactIds", c._id)}
                          onChange={(e) => handleArrayToggle("contactIds", c._id, e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: "#0f5f64" }}
                        />
                        <div>
                          <span style={{ color: "#334155", fontWeight: 600 }}>{c.name || "Unknown"}</span>
                          <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 6 }}>{c.mobile}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.audienceType === "group" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>
                    Select Groups <span style={{ color: "#0f5f64" }}>({form.groupIds.length} selected)</span>
                  </label>
                  <div style={checkboxGroupStyle}>
                    {groups.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>No groups found.</div>}
                    {groups.map((g) => (
                      <label key={g._id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, padding: "4px 0" }}>
                        <input
                          type="checkbox"
                          checked={isChecked("groupIds", g._id)}
                          onChange={(e) => handleArrayToggle("groupIds", g._id, e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: "#0f5f64" }}
                        />
                        <span style={{ color: "#334155", fontWeight: 600 }}>{g.groupName || g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.audienceType === "manual" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Manual Numbers (one per line)</label>
                  <textarea style={{ ...inputStyle, height: 120, resize: "vertical" }} value={form.manualNumbers} onChange={(e) => handleChange("manualNumbers", e.target.value)} placeholder={"+911234567890\n+919876543210"} />
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE */}
          {activeSection === "schedule" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>
                  Scheduled Date & Time <span style={{ color: "#94a3b8", fontWeight: 500 }}>(IST)</span>
                </label>
                <input type="datetime-local" style={inputStyle} value={form.scheduledDateTime} onChange={(e) => handleChange("scheduledDateTime", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 8 }}>Recurrence</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["one-time", "hourly", "daily", "weekly", "monthly"].map((type) => (
                    <button key={type} onClick={() => handleChange("recurrence", { ...form.recurrence, type })} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid", cursor: "pointer", transition: "all 0.2s", borderColor: form.recurrence.type === type ? "#14808a" : "#dbe3eb", background: form.recurrence.type === type ? "linear-gradient(135deg,#0f5f64,#14808a)" : "#fff", color: form.recurrence.type === type ? "#fff" : "#334155" }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {form.recurrence.type !== "one-time" && (
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, border: "1px solid #e5e7eb", fontSize: 13, color: "#64748b" }}>
                  <div style={{ fontWeight: 700, color: "#334155", marginBottom: 8 }}>Repeat every</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input type="number" min="1" style={{ ...inputStyle, width: 80 }} value={form.recurrence.interval || 1} onChange={(e) => handleChange("recurrence", { ...form.recurrence, interval: parseInt(e.target.value) || 1 })} />
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      {form.recurrence.type === "hourly" ? "hour(s)" : form.recurrence.type === "daily" ? "day(s)" : form.recurrence.type === "weekly" ? "week(s)" : "month(s)"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PREVIEW */}
          {activeSection === "preview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label className="campaign-edit-label" style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Message Preview</label>
                <div className="campaign-edit-preview-box" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, padding: 16, minHeight: 120, fontSize: 13, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {form.messagePreview || <span style={{ color: "#94a3b8" }}>No preview available.</span>}
                </div>
              </div>
              <div className="campaign-edit-summary-box" style={{ background: "#f8fafc", borderRadius: 12, padding: 16, border: "1px solid #e5e7eb" }}>
                <div className="campaign-edit-summary-title" style={{ fontWeight: 700, color: "#334155", fontSize: 13, marginBottom: 12 }}>Campaign Summary</div>
                {[
                  ["Name", form.campaignName || "—"],
                  ["Audience", form.audienceType],
                  ["Recurrence", form.recurrence.type],
                  ["Scheduled (IST)", form.scheduledDateTime ? form.scheduledDateTime.replace("T", " ") : "—"],
                ].map(([k, v]) => (
                  <div className="campaign-edit-summary-row" key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #e2e8f0", fontSize: 13 }}>
                    <span className="campaign-edit-summary-key" style={{ fontWeight: 700, color: "#334155" }}>{k}</span>
                    <span className="campaign-edit-summary-value" style={{ color: "#64748b", fontWeight: 600, textTransform: "capitalize" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="campaign-edit-footer" style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {sections.map((s) => (
              <div key={s.id} onClick={() => setActiveSection(s.id)} style={{ width: 8, height: 8, borderRadius: "50%", cursor: "pointer", background: activeSection === s.id ? "linear-gradient(135deg,#0f5f64,#22c55e)" : "#dbe3eb", transition: "all 0.2s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="campaign-edit-secondary-btn" onClick={onClose} style={{ border: "1px solid #dbe3eb", borderRadius: 12, padding: "9px 20px", background: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#334155" }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{ background: saving ? "#94a3b8" : "linear-gradient(135deg,#0f5f64 0%,#14808a 60%,#22c55e 100%)", border: "none", borderRadius: 12, padding: "9px 24px", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 8px 20px rgba(15,95,100,0.22)" }}>
              <Save size={15} />
              {saving ? "Saving..." : isSuperAdmin ? "Save Changes" : "Submit for Approval"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

/* ================================================================
   Main Page Component
================================================================ */
export default function CampaignsPage() {
  const router = useRouter();
  const pageRef = useRef(null);
  const contentRef = useRef(null);
  const rowsRef = useRef([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("campaigns");
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");

  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role");
      let id = null;
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          id = userObj._id || userObj.id;
        }
      } catch (e) {}
      setUserRole(role || "");
      setUserId(id || "");
    }
  }, []);

  const isSuperAdmin = userRole === "super_to_super_admin" || userRole === "super_admin";
  const isManager = userRole === "manager";
  const isManagerOrAbove = isSuperAdmin || isManager;

  const isOwner = (campaign) => {
    if (!userId) return false;
    const createdBy = campaign.createdBy;
    const ownerId = typeof createdBy === "object" ? createdBy?._id : createdBy;
    return ownerId?.toString() === userId;
  };

  // ✅ Updated filters — status-based, no more Broadcast/API
  const STATUS_FILTERS = [
    { label: "All",       value: "all" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Sent",      value: "sent" },
    { label: "Paused",    value: "paused" },
    { label: "Draft",     value: "draft" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Recurring", value: "recurring" },
  ];

  // Replace your existing fetchCampaigns function


const fetchCampaigns = async (silent = false) => {
  if (!silent) setIsLoading(true);
  try {
    const res = await API.get("/campaigns");
    const data = res.data;
    setCampaigns(data.success && Array.isArray(data.campaigns) ? data.campaigns : []);
    setLastRefreshed(new Date()); // ✅ track refresh time
  } catch {
    if (!silent) setCampaigns([]);
  } finally {
    if (!silent) setIsLoading(false);
  }
};

useEffect(() => {
  if (userRole) fetchCampaigns();
}, [userRole]);

// ✅ ADD THIS NEW useEffect right after:
useEffect(() => {
  if (!userRole) return;
  const hasActiveRecurring = campaigns.some(
    (c) => c.recurrence?.type && c.recurrence.type !== "one-time" && c.status === "scheduled"
  );
  if (!hasActiveRecurring) return;
  const interval = setInterval(() => fetchCampaigns(true), 30_000);
  return () => clearInterval(interval);
}, [campaigns, userRole]);

  useEffect(() => {
    if (userRole) fetchCampaigns();
  }, [userRole]);

  const handleDelete = async (campaignId, campaignName) => {
    if (!confirm(`Delete campaign "${campaignName}" permanently?`)) return;
    try {
      await API.delete(`/campaigns/${campaignId}`);
      setCampaigns((prev) => prev.filter((c) => c._id !== campaignId));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete campaign");
    }
  };

  const handleToggleStatus = async (campaign) => {
    const newStatus = campaign.status === "paused" ? "scheduled" : "paused";
    setUpdatingId(campaign._id);
    try {
      const res = await API.patch(`/campaigns/${campaign._id}/status`, { status: newStatus });
      if (res.data.success && res.data.campaign) {
        setCampaigns((prev) => prev.map((c) => c._id === campaign._id ? res.data.campaign : c));
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error updating campaign status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      const matchSearch =
        (c.campaignName || "").toLowerCase().includes(q) ||
        (c.status || "").toLowerCase().includes(q) ||
        (c.audienceType || "").toLowerCase().includes(q);

      let matchFilter = true;
      if (activeFilter !== "all") {
        if (activeFilter === "recurring") {
          matchFilter = c.recurrence?.type && c.recurrence.type !== "one-time";
        } else {
          matchFilter = (c.status || "").toLowerCase() === activeFilter;
        }
      }

      return matchSearch && matchFilter;
    });
  }, [campaigns, search, activeFilter]);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const scheduled = campaigns.filter((c) => c.status === "scheduled").length;
    const sent = campaigns.filter((c) => c.status === "sent").length;
    const recurring = campaigns.filter((c) => c.recurrence?.type && c.recurrence.type !== "one-time").length;
    return { total, scheduled, sent, recurring };
  }, [campaigns]);

  const handleUpdate = (updatedCampaign) => {
    setCampaigns((prev) => prev.map((c) => c._id === updatedCampaign._id ? updatedCampaign : c));
  };

  useEffect(() => {
    if (isLoading || !contentRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(contentRef.current, { opacity: 0, y: 18, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power3.out" });
      const validRows = rowsRef.current.filter(Boolean);
      if (validRows.length) {
        gsap.fromTo(validRows, { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.4, delay: 0.1, ease: "power2.out", clearProps: "all" });
      }
    }, pageRef);
    return () => ctx.revert();
  }, [isLoading, filteredData, activeTab]);

  rowsRef.current = [];

  if (userRole && !isManagerOrAbove) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Access Restricted</div>
        <div style={{ fontSize: 14, color: "#64748b" }}>Campaigns are only accessible to managers and admins.</div>
      </div>
    );
  }

  const isPendingTab = activeTab === "pending";

  return (
    <>
      {editingCampaignId && (
        <EditCampaignModal
          campaignId={editingCampaignId}
          onClose={() => setEditingCampaignId(null)}
          onUpdate={handleUpdate}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      <style jsx global>{`
        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .filter-scroll::-webkit-scrollbar { display: none; }
        .table-scroll::-webkit-scrollbar { width: 4px; }
        .table-scroll::-webkit-scrollbar-thumb { background: #dbe3eb; border-radius: 4px; }
        .action-btn { transition: transform 0.15s, box-shadow 0.15s; }
        .action-btn:hover { transform: translateY(-1px); }
        @keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(0.65); }
}
        body[data-theme="dark"] .campaign-page-root {
          background: #0b141a !important;
          color: #e9edef;
        }
        body[data-theme="dark"] .campaign-page-root [style*="rgba(255,255,255"],
        body[data-theme="dark"] .campaign-page-root [style*="rgba(255, 255, 255"],
        body[data-theme="dark"] .campaign-page-root [style*="background: #fff"],
        body[data-theme="dark"] .campaign-page-root [style*="background: rgb(255, 255, 255)"] {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.18) !important;
        }
        body[data-theme="dark"] .campaign-page-root [style*="background: #f8"],
        body[data-theme="dark"] .campaign-page-root [style*="background: #f9"],
        body[data-theme="dark"] .campaign-page-root [style*="background: #fa"],
        body[data-theme="dark"] .campaign-page-root [style*="background: rgb(248"],
        body[data-theme="dark"] .campaign-page-root [style*="background: rgb(249"],
        body[data-theme="dark"] .campaign-page-root [style*="background: rgb(250"] {
          background: #202c33 !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .campaign-page-root :is(input, select, textarea, .form-control) {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .campaign-page-root :is(input, textarea)::placeholder {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .campaign-page-root [style*="color: #0f172a"],
        body[data-theme="dark"] .campaign-page-root [style*="color: rgb(15, 23, 42)"],
        body[data-theme="dark"] .campaign-page-root [style*="color: #334155"],
        body[data-theme="dark"] .campaign-page-root [style*="color: rgb(51, 65, 85)"] {
          color: #e9edef !important;
        }
        body[data-theme="dark"] .campaign-page-root [style*="color: #64748b"],
        body[data-theme="dark"] .campaign-page-root [style*="color: rgb(100, 116, 139)"],
        body[data-theme="dark"] .campaign-page-root [style*="color: #94a3b8"],
        body[data-theme="dark"] .campaign-page-root [style*="color: rgb(148, 163, 184)"] {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .campaign-page-root .table-scroll > div:hover {
          background: #202c33 !important;
        }
        body[data-theme="dark"] .campaign-page-root .table-scroll::-webkit-scrollbar-thumb {
          background: #2a3942;
        }
        @media (max-width: 575px) {
          .stat-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .hero-title { font-size: 20px !important; }
          .hero-subtitle { font-size: 12px !important; }
        }
      `}</style>

      <div ref={pageRef} className="container-fluid py-2 py-md-4 campaign-page-root" style={pageStyles.shell}>
        <div className="d-flex flex-column gap-2 gap-md-3 h-100">
          {isLoading ? (
            <>
              <HeaderSkeleton />
              <StatsSkeleton />
              <SearchFilterSkeleton />
            </>
          ) : (
            <div ref={contentRef} className="d-flex flex-column gap-2 gap-md-3">

              {/* ── Header ── */}
              <div style={pageStyles.premiumCard} className="p-3 p-md-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-start align-items-lg-center">
                  <div>
                    <div style={pageStyles.heroChip}><Megaphone size={14} />CAMPAIGNS</div>
                    <div style={pageStyles.heroTitle} className="hero-title">Broadcast & Automation</div>
                    <div style={pageStyles.heroSubtitle} className="hero-subtitle">Manage all your WhatsApp campaigns from one dashboard.</div>
                  </div>
                  <button
                    style={pageStyles.launchBtn}
                    className="btn d-inline-flex align-items-center justify-content-center gap-2"
                    onClick={() => router.push("/Campaigns/launch")}
                    type="button"
                  >
                    <Plus size={16} />Launch Campaign<ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* ── Stats ── */}
              <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <StatCard icon={Megaphone}    label="Total"     value={stats.total}     subtext="All campaigns" />
                <StatCard icon={CalendarDays} label="Scheduled" value={stats.scheduled} subtext="Upcoming" />
                <StatCard icon={Send}         label="Sent"      value={stats.sent}       subtext="Completed" />
                <StatCard icon={Repeat}       label="Recurring" value={stats.recurring}  subtext="Auto-repeating" />
              </div>

              {/* ── Tab row ── */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={() => setActiveTab("campaigns")}
                  className="btn"
                  style={{ ...pageStyles.filterPill, ...(activeTab === "campaigns" ? pageStyles.filterPillActive : {}) }}
                >
                  📋 Campaigns
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => setActiveTab("pending")}
                    className="btn d-flex align-items-center gap-2"
                    style={{ ...pageStyles.filterPill, ...(isPendingTab ? pageStyles.filterPillActive : {}) }}
                  >
                    <Bell size={13} /> Pending Approvals
                  </button>
                )}
              </div>

              {/* ── Pending Approvals ── */}
              {isPendingTab && isSuperAdmin ? (
                <PendingApprovalsPanel
                  onApprove={(id) => setCampaigns((prev) => prev.map((c) => c._id === id ? { ...c, approvalStatus: "approved", status: "scheduled" } : c))}
                  onReject={(id) => setCampaigns((prev) => prev.map((c) => c._id === id ? { ...c, approvalStatus: "rejected", status: "cancelled" } : c))}
                />
              ) : (
                <>
                  {/* ── Toolbar ── */}
                  <div style={pageStyles.toolbarCard}>
                    <div className="d-flex flex-column flex-xl-row gap-2 justify-content-between align-items-stretch align-items-xl-center">
                      <div style={pageStyles.searchWrap}>
                        <Search size={18} style={{ position: "absolute", top: "50%", left: 14, transform: "translateY(-50%)", color: "#64748b", zIndex: 2 }} />
                        <input
                          className="form-control"
                          style={pageStyles.searchInput}
                          placeholder="Search by name, status, audience type…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="d-flex gap-2 align-items-center">
  {lastRefreshed && (
    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap" }}>
      ↻ {lastRefreshed.toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: true, timeZone: "Asia/Kolkata"
      })}
    </span>
  )}
  <button
    className="btn d-inline-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-xl-grow-0"
    style={pageStyles.refreshBtn}
    onClick={() => fetchCampaigns(false)}
    type="button"
  >
    <RefreshCcw size={15} />Refresh
  </button>
</div>
                    </div>

                    {/* ── Status filters ── */}
                    <div className="filter-scroll" style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
                      {STATUS_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          className="btn"
                          style={{ ...pageStyles.filterPill, ...(activeFilter === f.value ? pageStyles.filterPillActive : {}) }}
                          onClick={() => setActiveFilter(f.value)}
                        >
                          {f.label}
                          {/* Show count badge */}
                          <span style={{
                            marginLeft: 6,
                            background: activeFilter === f.value ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                            color: activeFilter === f.value ? "#fff" : "#64748b",
                            borderRadius: 999,
                            padding: "0 6px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}>
                            {f.value === "all"
                              ? campaigns.length
                              : f.value === "recurring"
                              ? campaigns.filter((c) => c.recurrence?.type && c.recurrence.type !== "one-time").length
                              : campaigns.filter((c) => (c.status || "").toLowerCase() === f.value).length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Table ── */}
                  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, overflow: "hidden" }}>

                    {/* Desktop header */}
                    <div className="d-none d-lg-flex" style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      <div style={{ flex: "2" }}>Campaign</div>
                      <div style={{ flex: "1.2" }}>Audience</div>
                      <div style={{ flex: "1.4" }}>Next Run (IST)</div>
                      <div style={{ flex: "1" }}>Recurrence</div>
                      <div style={{ flex: "0.9" }}>Status</div>
                      <div style={{ flex: "0.9" }}>Approval</div>
                      <div style={{ flex: "1" }}>Actions</div>
                    </div>

                    {/* Rows */}
                    <div className="table-scroll" style={{ maxHeight: "58vh", overflowY: "auto" }}>
                      {filteredData.length === 0 ? (
                        <div style={{ padding: "56px 20px", textAlign: "center" }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, marginBottom: 4 }}>No campaigns found</div>
                          <div style={{ color: "#94a3b8", fontSize: 13 }}>Try adjusting your search or filters</div>
                        </div>
                      ) : (
                        filteredData.map((campaign, index) => {
                          const isUpdating = updatingId === campaign._id;
                          const isPaused = campaign.status === "paused";
                          const canEdit = isSuperAdmin || (isManager && isOwner(campaign));
                          const canDelete = isSuperAdmin || (isManager && isOwner(campaign));

                          const audience = getAudienceLabel(campaign);
                          const isRecurring = campaign.recurrence?.type && campaign.recurrence.type !== "one-time";

                          // ✅ Show nextRun for recurring (scheduled after 1st run), else scheduledDateTime
                          const displayDT = formatDateTime(
                            isRecurring && campaign.status === "scheduled"
                              ? campaign.nextRun
                              : campaign.scheduledDateTime
                          );
                          const recLabel = getRecurrenceLabel(campaign.recurrence);
                          const ss = statusStyle(campaign.status);

                          return (
                            <div
                              key={campaign._id}
                              ref={(el) => { rowsRef.current[index] = el; }}
                              style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbff")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              {/* ── Desktop row ── */}
                              <div className="d-none d-lg-flex align-items-center" style={{ padding: "14px 20px", gap: 8 }}>

                                {/* Campaign name + sent count */}
                                <div style={{ flex: "2" }}>
  <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 3 }}>{campaign.campaignName}</div>
  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
    <span style={{ background: "#f1f5f9", borderRadius: 4, padding: "1px 7px", fontWeight: 700, fontSize: 11, color: "#475569" }}>
      📤 {isRecurring ? (campaign.lastSentCount ?? campaign.sentCount ?? 0) : (campaign.sentCount || 0)} sent
    </span>
    {isRecurring && (campaign.runCount || 0) > 0 && (
      <span style={{ background: "#f0fdf4", borderRadius: 4, padding: "1px 7px", fontWeight: 700, fontSize: 11, color: "#166534" }}>
        🔁 ran {campaign.runCount}×
      </span>
    )}
    {isRecurring && campaign.status === "scheduled" && (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0fdf4", borderRadius: 4, padding: "1px 7px", fontWeight: 700, fontSize: 11, color: "#166534" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "livePulse 1.4s ease-in-out infinite" }} />
        Live
      </span>
    )}
  </div>
</div>

                                {/* Audience */}
                                <div style={{ flex: "1.2" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: audience.bg, color: audience.color, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>
                                    <span>{audience.icon}</span>{audience.label}
                                  </span>
                                </div>

                                {/* Date/time */}
                                <div style={{ flex: "1.4" }}>
                                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {isRecurring && campaign.status === "scheduled" ? "Next run" : "Scheduled"}
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{displayDT.date}</div>
                                  {displayDT.time && <div style={{ fontSize: 12, color: "#0f5f64", fontWeight: 700 }}>{displayDT.time}</div>}

                                  {/* ADD THIS LINE RIGHT AFTER: */}
{isRecurring && campaign.lastRunAt && (
  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
    Last: {formatDateTime(campaign.lastRunAt).time}
  </div>
)}
                                </div>

                                {/* Recurrence */}
                                <div style={{ flex: "1" }}>
                                  {recLabel ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", color: "#166534", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>
                                      🔁 {recLabel}
                                    </span>
                                  ) : (
                                    <span style={{ background: "#f8fafc", color: "#64748b", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>
                                      1× Once
                                    </span>
                                  )}
                                </div>

                                {/* Status */}
                                <div style={{ flex: "0.9" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: ss.bg, color: ss.color, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: ss.dot, flexShrink: 0 }} />
                                    {(campaign.status || "draft").charAt(0).toUpperCase() + (campaign.status || "draft").slice(1)}
                                  </span>
                                </div>

                                {/* Approval */}
                                <div style={{ flex: "0.9" }}>
                                  <ApprovalBadge status={campaign.approvalStatus} />
                                </div>

                                {/* Actions */}
                                <div style={{ flex: "1", display: "flex", gap: 6 }}>
                                  {canEdit && (
                                    <>
                                      <button
                                        className="action-btn"
                                        onClick={() => handleToggleStatus(campaign)}
                                        disabled={isUpdating}
                                        title={isPaused ? "Resume" : "Pause"}
                                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: isUpdating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isUpdating ? 0.5 : 1, color: isPaused ? "#16a34a" : "#f59e0b" }}
                                      >
                                        {isPaused ? <Play size={13} /> : <PauseCircle size={13} />}
                                      </button>
                                      <button
                                        className="action-btn"
                                        onClick={() => setEditingCampaignId(campaign._id)}
                                        title="Edit"
                                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}
                                      >
                                        <Edit size={13} />
                                      </button>
                                    </>
                                  )}
                                  {canDelete && (
                                    <button
                                      className="action-btn"
                                      onClick={() => handleDelete(campaign._id, campaign.campaignName)}
                                      title="Delete"
                                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* ── Mobile card ── */}
                              <div className="d-block d-lg-none" style={{ padding: "14px 16px" }}>
                                {/* Top row: name + actions */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{campaign.campaignName}</div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: ss.bg, color: ss.color, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: ss.dot }} />
                                        {(campaign.status || "draft").charAt(0).toUpperCase() + (campaign.status || "draft").slice(1)}
                                      </span>
                                      <ApprovalBadge status={campaign.approvalStatus} />
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                    {canEdit && (
                                      <>
                                        <button onClick={() => handleToggleStatus(campaign)} disabled={isUpdating} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isPaused ? "#16a34a" : "#f59e0b" }}>
                                          {isPaused ? <Play size={13} /> : <PauseCircle size={13} />}
                                        </button>
                                        <button onClick={() => setEditingCampaignId(campaign._id)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                                          <Edit size={13} />
                                        </button>
                                      </>
                                    )}
                                    {canDelete && (
                                      <button onClick={() => handleDelete(campaign._id, campaign.campaignName)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Meta chips */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: audience.bg, color: audience.color, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                                    {audience.icon} {audience.label}
                                  </span>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0f9ff", color: "#0369a1", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                                    📅 {displayDT.date} {displayDT.time}
                                  </span>
                                  {recLabel && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0fdf4", color: "#166534", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                                      🔁 {recLabel}
                                    </span>
                                  )}
                                  {/* REPLACE WITH THIS: */}
<span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", color: "#475569", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
  📤 {isRecurring ? (campaign.lastSentCount ?? campaign.sentCount ?? 0) : (campaign.sentCount || 0)} sent
</span>
{isRecurring && campaign.status === "scheduled" && (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0fdf4", color: "#166534", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "livePulse 1.4s ease-in-out infinite" }} />
    Live
  </span>
)}
                                  {isRecurring && campaign.runCount > 0 && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0fdf4", color: "#166534", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                                      🔁 ran {campaign.runCount}×
                                    </span>
                                  )}
                                </div>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer count */}
                    <div style={{ padding: "10px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                        Showing {filteredData.length} of {campaigns.length} campaigns
                      </span>
                      {filteredData.length !== campaigns.length && (
                        <button onClick={() => { setSearch(""); setActiveFilter("all"); }} style={{ background: "none", border: "none", color: "#0f5f64", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
