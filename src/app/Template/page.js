"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  Search, RefreshCcw, Compass, CircleDashed, Package, Clock3,
  BadgeCheck, AlertCircle, Star, Copy, Trash2, Plus, CalendarDays,
  Image as ImageIcon, Video, Layout, FileText, ChevronLeft, ChevronRight,
  Edit, X, Upload, Save, CheckCircle, XCircle, Bell,
} from "lucide-react";
import API from "../utils/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const tabs = [
  { id: "Explore",         label: "Explore",          icon: Compass      },
  { id: "All",             label: "All",              icon: CircleDashed },
  { id: "Draft",           label: "Draft",            icon: Package      },
  { id: "Pending",         label: "Pending",          icon: Clock3       },
  { id: "Approved",        label: "Approved",         icon: BadgeCheck   },
  { id: "Action Required", label: "Action Required",  icon: AlertCircle  },
];

const categoryOptions = ["Marketing", "Utility", "Authentication"];
const languageOptions  = ["English", "Hindi", "Spanish", "Arabic"];
const typeOptions      = ["Text", "Media", "Interactive"];
const mediaTypeOptions = ["None", "Image", "Video"];

// ── helpers ──────────────────────────────────────────────────────────────
const firstFilled = (...values) => {
  for (const value of values) {
    if (value === 0 || value === false) return value;
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};
const safeArray  = (v) => (Array.isArray(v) ? v : []);
const resolveUrl = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  if (raw.startsWith("data:image") || raw.startsWith("data:video")) return raw;
  if (raw.startsWith("http")) return raw;
  return `${BACKEND_URL}${raw}`;
};
const normalizeButtons = (item) => {
  const all = [...safeArray(item.buttons), ...safeArray(item.interactiveActions), ...safeArray(item.ctaButtons), ...safeArray(item.quickReplies)];
  return all.map((btn) => (typeof btn === "string" ? btn : btn?.text || btn?.title || btn?.label || btn?.buttonText || btn?.name || "")).filter(Boolean).slice(0, 2);
};
const normalizeCarouselCards = (item) => {
  const rawCards = safeArray(firstFilled(item.carouselItems, item.carousel, item.cards, item.carouselCards, item.items));
  return rawCards.map((card, index) => ({
    id: card?.id || index + 1,
    title: firstFilled(card?.title, card?.header, card?.name, `Card ${index + 1}`),
    description: firstFilled(card?.description, card?.body, card?.text, card?.message, ""),
    image: resolveUrl(firstFilled(card?.image, card?.imageUrl, card?.mediaUrl, card?.url, card?.headerMediaUrl)),
    video: resolveUrl(firstFilled(card?.video, card?.videoUrl)),
    buttons: safeArray(card?.buttons).map((btn) => (typeof btn === "string" ? btn : btn?.text || btn?.title || btn?.label || "")).filter(Boolean).slice(0, 2),
  }));
};
const detectPreviewType = (item) => {
  if (item.mediaType === "Image") return "IMAGE";
  if (item.mediaType === "Video") return "VIDEO";
  if (item.mediaType === "Carousel") return "CAROUSEL";
  const cards = normalizeCarouselCards(item);
  if (cards.length > 0) return "CAROUSEL";
  const explicitType = String(firstFilled(item.type, item.templateType, "TEXT")).toUpperCase().trim();
  if (explicitType.includes("CAROUSEL")) return "CAROUSEL";
  if (explicitType.includes("VIDEO"))    return "VIDEO";
  if (explicitType.includes("IMAGE"))    return "IMAGE";
  const rawUrl = firstFilled(item.imageFile?.url, item.videoFile?.url, item.mediaUrl, item.image, item.imageUrl, item.video, item.videoUrl, item.headerMediaUrl, item.previewMedia);
  if (typeof rawUrl === "string" && rawUrl) {
    const lower = rawUrl.toLowerCase();
    if (lower.match(/\.(mp4|webm|ogg|mov)(\?|$)/)) return "VIDEO";
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/)) return "IMAGE";
  }
  return "TEXT";
};
const getPreviewData = (item) => {
  const previewType = detectPreviewType(item);
  const cards       = normalizeCarouselCards(item);
  const rawMediaUrl = firstFilled(item.imageFile?.url, item.videoFile?.url, item.mediaUrl, item.image, item.imageUrl, item.video, item.videoUrl, item.headerMediaUrl, item.previewMedia);
  return {
    previewType,
    title:    firstFilled(item.name, item.templateName, "Untitled Template"),
    category: firstFilled(item.category, item.templateCategory, "GENERAL"),
    status:   String(firstFilled(item.status, "DRAFT")).toUpperCase(),
    type:     String(firstFilled(item.type, item.templateType, previewType)).toUpperCase(),
    language: firstFilled(item.language, item.templateLanguage, "English"),
    body:     firstFilled(item.format, item.body, item.message, item.content, item.templateContent, ""),
    footer:   firstFilled(item.footer, item.templateFooter, ""),
    mediaUrl: resolveUrl(rawMediaUrl),
    buttons:  normalizeButtons(item),
    cards,
  };
};

// ── CompactTemplatePreview ────────────────────────────────────────────────
function CompactTemplatePreview({ item }) {
  const [activeCard, setActiveCard] = useState(0);
  const preview = getPreviewData(item);
  const nextCard = () => setActiveCard((p) => (p + 1) % preview.cards.length);
  const prevCard = () => setActiveCard((p) => (p - 1 + preview.cards.length) % preview.cards.length);

  if (preview.previewType === "IMAGE" && preview.mediaUrl) return (
    <div className="mini-preview-wrap">
      <div className="mini-preview-badge"><ImageIcon size={11} /> Image</div>
      <img src={preview.mediaUrl} alt={preview.title} className="mini-preview-media" onError={(e) => { e.target.style.display = "none"; }} />
    </div>
  );
  if (preview.previewType === "VIDEO" && preview.mediaUrl) return (
    <div className="mini-preview-wrap">
      <div className="mini-preview-badge"><Video size={11} /> Video</div>
      <video src={preview.mediaUrl} className="mini-preview-media" controls preload="metadata" />
    </div>
  );
  if (preview.previewType === "CAROUSEL" && preview.cards.length > 0) {
    const currentCard = preview.cards[activeCard];
    return (
      <div className="mini-preview-wrap">
        <div className="mini-preview-badge"><Layout size={11} /> Carousel</div>
        <div className="mini-carousel-shell">
          <button className="mini-nav-btn" onClick={prevCard}><ChevronLeft size={14} /></button>
          <div className="mini-carousel-card">
            {currentCard.image ? <img src={currentCard.image} alt={currentCard.title} className="mini-preview-media" />
              : currentCard.video ? <video src={currentCard.video} className="mini-preview-media" controls preload="metadata" />
              : <div className="mini-preview-placeholder"><Layout size={20} /><span>No media</span></div>}
            <div className="mini-carousel-content">
              <div className="mini-carousel-title">{currentCard.title}</div>
              {currentCard.description && <div className="mini-carousel-desc">{currentCard.description}</div>}
            </div>
          </div>
          <button className="mini-nav-btn" onClick={nextCard}><ChevronRight size={14} /></button>
        </div>
        <div className="mini-dots">
          {preview.cards.map((_, i) => <button key={i} className={`mini-dot ${i === activeCard ? "active" : ""}`} onClick={() => setActiveCard(i)} />)}
        </div>
      </div>
    );
  }
  return (
    <div className="mini-preview-wrap">
      <div className="mini-preview-badge"><FileText size={11} /> Text</div>
      <div className="mini-text-preview">{preview.body || "No content added yet"}</div>
    </div>
  );
}

// ── EditTemplateModal ─────────────────────────────────────────────────────
function EditTemplateModal({ templateId, onClose, onUpdate, isSuperAdmin }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm] = useState({ name: "", category: "", language: "", type: "", format: "", footer: "", mediaType: "None", actionType: "all" });
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [carouselItems, setCarouselItems]       = useState([]);
  const [ctaButtons, setCtaButtons]             = useState([]);
  const [quickReplies, setQuickReplies]         = useState([]);
  const [copyCodeButtons, setCopyCodeButtons]   = useState([]);
  const [dropdownButtons, setDropdownButtons]   = useState([]);
  const [inputFields, setInputFields]           = useState([]);
  const [variableValues, setVariableValues]     = useState({});

  useEffect(() => {
    if (!templateId) return;
    API.get(`/templates/${templateId}`)
      .then(res => {
        if (res.data.success && res.data.template) {
          const t = res.data.template;
          setForm({ name: t.name || "", category: t.category || "", language: t.language || "English", type: t.type || "Text", format: t.format || "", footer: t.footer || "", mediaType: t.mediaType || "None", actionType: t.actionType || "all" });
          if (t.imageFile?.url) setImageFile({ url: resolveUrl(t.imageFile.url), file: null });
          if (t.videoFile?.url) setVideoFile({ url: resolveUrl(t.videoFile.url), file: null });
          setCarouselItems(t.carouselItems || []);
          setCtaButtons(t.ctaButtons || []);
          setQuickReplies(t.quickReplies || []);
          setCopyCodeButtons(t.copyCodeButtons || []);
          setDropdownButtons(t.dropdownButtons || []);
          setInputFields(t.inputFields || []);
          setVariableValues(t.variables || {});
        } else setError("Failed to load template data");
      })
      .catch(err => setError(err.response?.data?.error || err.message || "Error loading template"))
      .finally(() => setLoading(false));
  }, [templateId]);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setImageFile({ url: reader.result, file }); setVideoFile(null); };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setVideoFile({ url: reader.result, file }); setImageFile(null); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSaving(true); setError("");
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("category", form.category);
      formData.append("language", form.language);
      formData.append("type", form.type);
      formData.append("format", form.format);
      formData.append("footer", form.footer);
      formData.append("mediaType", form.mediaType);
      formData.append("actionType", form.actionType);
      if (form.mediaType === "Image" && imageFile?.file) formData.append("mediaFile", imageFile.file);
      else if (form.mediaType === "Video" && videoFile?.file) formData.append("mediaFile", videoFile.file);
      formData.append("carouselItems", JSON.stringify(carouselItems || []));
      formData.append("ctaButtons", JSON.stringify(ctaButtons || []));
      formData.append("quickReplies", JSON.stringify(quickReplies || []));
      formData.append("copyCodeButtons", JSON.stringify(copyCodeButtons || []));
      formData.append("dropdownButtons", JSON.stringify(dropdownButtons || []));
      formData.append("inputFields", JSON.stringify(inputFields || []));
      formData.append("variables", JSON.stringify(variableValues || {}));

      const res = await API.put(`/templates/${templateId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });

      if (res.data.success) {
        if (res.data.pendingApproval) {
          alert("✅ Template updated! Sent to admin for approval.");
        }
        onUpdate(res.data.template);
        onClose();
      } else throw new Error(res.data.error || "Update failed");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 24, width: 500, maxWidth: "90vw", textAlign: "center" }}>Loading template...</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, width: 600, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 24px 60px rgba(15,23,42,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>Edit Template</h3>
          <button onClick={onClose} style={{ border: "1px solid #e2e8f0", borderRadius: 10, width: 36, height: 36, background: "#f8fafc", cursor: "pointer" }}><X size={18} /></button>
        </div>

        {!isSuperAdmin && (
          <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#92400e" }}>
            ⏳ Your edits will be sent to <strong>admin for approval</strong> before going live.
          </div>
        )}

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 12, marginBottom: 20, fontSize: 13, color: "#dc2626" }}>{error}</div>}

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Template Name *</label>
            <input type="text" className="form-control" style={{ height: 42, borderRadius: 12, border: "1px solid #dbe5ee", padding: "0 12px" }} value={form.name} onChange={e => handleChange("name", e.target.value.toLowerCase().replace(/\s+/g, "_"))} />
          </div>
          <div className="row g-3">
            <div className="col-6">
              <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Category</label>
              <select className="form-select" style={{ height: 42, borderRadius: 12 }} value={form.category} onChange={e => handleChange("category", e.target.value)}>
                <option value="">Select</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-6">
              <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Language</label>
              <select className="form-select" style={{ height: 42, borderRadius: 12 }} value={form.language} onChange={e => handleChange("language", e.target.value)}>
                {languageOptions.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-6">
              <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Type</label>
              <select className="form-select" style={{ height: 42, borderRadius: 12 }} value={form.type} onChange={e => handleChange("type", e.target.value)}>
                {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-6">
              <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Media Type</label>
              <select className="form-select" style={{ height: 42, borderRadius: 12 }} value={form.mediaType} onChange={e => handleChange("mediaType", e.target.value)} disabled={form.category !== "Marketing"}>
                {mediaTypeOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {form.category === "Marketing" && form.mediaType === "Image" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Image</label>
              {imageFile?.url && <img src={imageFile.url} alt="preview" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 12, marginBottom: 8 }} />}
              <label style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", border: "1px dashed #b9c7d6", borderRadius: 12, padding: "10px", cursor: "pointer", background: "#f8fafc" }}>
                <Upload size={16} /> Change Image
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </label>
            </div>
          )}
          {form.category === "Marketing" && form.mediaType === "Video" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Video</label>
              {videoFile?.url && <video src={videoFile.url} controls style={{ width: "100%", maxHeight: 150, borderRadius: 12, marginBottom: 8 }} />}
              <label style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", border: "1px dashed #b9c7d6", borderRadius: 12, padding: "10px", cursor: "pointer", background: "#f8fafc" }}>
                <Upload size={16} /> Change Video
                <input type="file" accept="video/*" hidden onChange={handleVideoUpload} />
              </label>
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Message Format *</label>
            <textarea rows={4} className="form-control" style={{ borderRadius: 12, border: "1px solid #dbe5ee", padding: "10px" }} value={form.format} onChange={e => handleChange("format", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>Footer (optional)</label>
            <input type="text" className="form-control" style={{ height: 42, borderRadius: 12 }} value={form.footer} onChange={e => handleChange("footer", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
          <button onClick={onClose} style={{ border: "1px solid #dbe5ee", borderRadius: 12, padding: "8px 20px", background: "#fff", fontWeight: 700 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ background: "linear-gradient(135deg,#1f7a85 0%,#0d5b63 100%)", border: "none", borderRadius: 12, padding: "8px 24px", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pending Approvals Panel (admin only) ──────────────────────────────────
function PendingApprovalsPanel({ onApprove, onReject }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/templates/pending")
      .then(res => setPending(res.data.templates || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    try {
      await API.put(`/templates/${id}/approve`);
      setPending(prev => prev.filter(t => t._id !== id));
      onApprove(id);
      alert("✅ Template approved!");
    } catch (err) { alert("Failed to approve"); }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/templates/${id}/reject`);
      setPending(prev => prev.filter(t => t._id !== id));
      onReject(id);
      alert("❌ Template rejected.");
    } catch (err) { alert("Failed to reject"); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading pending approvals...</div>;

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 800, fontSize: 15, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
        <Bell size={18} color="#f59e0b" />
        Pending Template Approvals
        <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{pending.length}</span>
      </div>

      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af", fontSize: 14 }}>🎉 No pending approvals</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={thStyle}>Template Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Submitted By</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((t) => (
              <tr key={t._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={tdStyle}>{t.name}</td>
                <td style={tdStyle}>{t.category}</td>
                <td style={tdStyle}>{t.createdBy?.name || "—"}</td>
                <td style={tdStyle}>
                  <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
                    {t.createdBy?.role}
                  </span>
                </td>
                <td style={tdStyle}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleApprove(t._id)} style={{ background: "#d1fae5", color: "#065f46", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleReject(t._id)} style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "12px 16px", fontWeight: 700, fontSize: 12, color: "#0d9488", textAlign: "left", whiteSpace: "nowrap" };
const tdStyle = { padding: "12px 16px", color: "#374151", fontSize: 14 };

// ── Main TemplatesPage ────────────────────────────────────────────────────
export default function TemplatesPage() {
  const router = useRouter();
  const pageRef = useRef(null);
  const listRef = useRef(null);
  const rowRefs = useRef([]);

  const [search, setSearch]         = useState("");
  const [activeTab, setActiveTab]   = useState("Explore");
  const [templates, setTemplates]   = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [modalItem, setModalItem]   = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const [userRole, setUserRole] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role || "");
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 767);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isSuperAdmin     = userRole === "super_admin";
  const isManagerOrAbove = userRole === "super_admin" || userRole === "manager";

  const isExploreTab = activeTab === "Explore";
  const isPendingTab = activeTab === "PendingApprovals";

  const fetchTemplates = async () => {
    try {
      const res = await API.get("/templates");
      setTemplates(res.data.templates || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
      setTemplates([]);
    } finally {
      setListLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) fetchTemplates();
  }, [userRole]);

  useEffect(() => {
    if (!listLoading && rowRefs.current.length) {
      gsap.fromTo(rowRefs.current.filter(Boolean), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: "power2.out" });
    }
  }, [listLoading, activeTab, templates]);

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase().trim();
    let filtered = [...templates];
    if (activeTab === "Draft")           filtered = filtered.filter(i => String(i.status).toUpperCase() === "DRAFT");
    else if (activeTab === "Pending")    filtered = filtered.filter(i => String(i.status).toUpperCase() === "PENDING");
    else if (activeTab === "Approved")   filtered = filtered.filter(i => String(i.status).toUpperCase() === "APPROVED");
    else if (activeTab === "Action Required") filtered = filtered.filter(i => String(i.status).toUpperCase() === "REJECTED");
    return filtered.filter(item => {
      const p = getPreviewData(item);
      return p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) ||
             p.status.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.body.toLowerCase().includes(q);
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [templates, search, activeTab]);

  const handleRefresh  = () => { setListLoading(true); fetchTemplates(); };
  const handleDelete   = async (id) => {
    if (!confirm("Delete this template permanently?")) return;
    try {
      await API.delete(`/templates/${id}`);
      setTemplates(prev => prev.filter(i => i._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete template");
    }
  };
  const handleCopy = async (item) => {
    try {
      const { _id, createdAt, updatedAt, __v, ...copyData } = item;
      copyData.name = `${copyData.name}_copy`;
      copyData.status = "DRAFT";
      const res = await API.post("/templates", copyData);
      if (res.data.pendingApproval) alert("✅ Copy submitted for admin approval.");
      setTemplates(prev => [res.data.template, ...prev]);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to copy template");
    }
  };
  const handleEdit   = (id) => { setEditingTemplateId(id); setEditModalOpen(true); };
  const handleUpdate = (updatedTemplate) => { setTemplates(prev => prev.map(t => t._id === updatedTemplate._id ? updatedTemplate : t)); };
  const toggleFavorite = (id) => { setTemplates(prev => prev.map(i => i._id === id ? { ...i, favorite: !i.favorite } : i)); };

  const getStatusBadgeClass = (status) => {
    const s = String(status).toUpperCase();
    if (s === "APPROVED") return "status-approved";
    if (s === "REJECTED") return "status-rejected";
    if (s === "PENDING")  return "status-pending";
    return "status-draft";
  };

  const getApprovalBadge = (item) => {
    if (!item.approvalStatus || item.approvalStatus === "approved") return null;
    if (item.approvalStatus === "pending_approval") return (
      <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>⏳ Awaiting Approval</span>
    );
    if (item.approvalStatus === "rejected") return (
      <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>❌ Rejected</span>
    );
    return null;
  };

  rowRefs.current = [];

  // ── Responsive list view function ──────────────────────────────────────
  const renderListView = () => (
    <>
      {/* Desktop header (hidden on mobile) */}
      <div className="d-none d-lg-grid list-head list-grid">
        <div>Name</div><div>Category</div><div>Status</div><div>Approval</div><div>Created</div><div>Actions</div>
      </div>
      <div ref={listRef} className="list-wrap">
        {filteredTemplates.map((item, index) => {
          const preview = getPreviewData(item);
          return (
            <div key={item._id} ref={(el) => { rowRefs.current[index] = el; }} className="list-card" style={{ cursor: "pointer" }}>
              {isMobile ? (
                /* Mobile stacked view */
                <div className="d-flex flex-column gap-2">
                  <div className="template-name">{preview.title}</div>
                  <div className="template-subline">{preview.language} · {preview.category}</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className={getStatusBadgeClass(preview.status)}>{preview.status}</span>
                    {getApprovalBadge(item) || <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>}
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="template-subline" style={{ fontSize: isMobile ? 10 : 11 }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "--"}
                    </span>
                    <div className="d-flex gap-1">
                      <button className="icon-btn" onClick={() => handleEdit(item._id)}><Edit size={15} /></button>
                      <button className="icon-btn" onClick={() => toggleFavorite(item._id)}><Star size={15} color="#8b8b8b" fill={item.favorite ? "#8b8b8b" : "none"} /></button>
                      <button className="icon-btn" onClick={() => handleCopy(item)}><Copy size={15} /></button>
                      {isSuperAdmin && <button className="icon-btn" onClick={() => handleDelete(item._id)}><Trash2 size={15} /></button>}
                    </div>
                  </div>
                </div>
              ) : (
                /* Desktop grid (unchanged) */
                <div className="list-grid">
                  <div>
                    <div className="template-name mb-1">{preview.title}</div>
                    <div className="template-subline mb-0">{preview.language}</div>
                  </div>
                  <div className="template-subline mb-0">{preview.category}</div>
                  <div><span className={getStatusBadgeClass(preview.status)}>{preview.status}</span></div>
                  <div>{getApprovalBadge(item) || <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>}</div>
                  <div className="template-subline mb-0">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "--"}</div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <button className="icon-btn" onClick={() => handleEdit(item._id)} title="Edit"><Edit size={15} /></button>
                    <button className="icon-btn" onClick={() => toggleFavorite(item._id)} title="Favorite"><Star size={15} color="#8b8b8b" fill={item.favorite ? "#8b8b8b" : "none"} /></button>
                    <button className="icon-btn" onClick={() => handleCopy(item)} title="Copy"><Copy size={15} /></button>
                    {isSuperAdmin && (
                      <button className="icon-btn" onClick={() => handleDelete(item._id)} title="Delete"><Trash2 size={15} /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  if (userRole && !isManagerOrAbove) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Access Restricted</div>
        <div style={{ fontSize: 14, color: "#64748b" }}>Templates are only accessible to managers and admins.</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .campaigns-page-shell { min-height: calc(100vh - 70px); background: radial-gradient(circle at top right, rgba(13,91,99,0.06), transparent 22%), linear-gradient(180deg, #f4f7fb 0%, #eef3f8 100%); }
        .campaigns-topbar-box { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 22px; padding: 14px; box-shadow: 0 16px 35px rgba(15,23,42,0.06); backdrop-filter: blur(10px); }
        .campaigns-search-wrap { max-width: 320px; }
        .campaigns-search-input { height: 44px; border-radius: 14px; padding-left: 14px; padding-right: 46px; background: #ffffff; color: #1f2937; font-size: 14px; border: 1px solid #dbe5ee !important; box-shadow: none !important; }
        .campaigns-search-input:focus { border-color: #0d5b63 !important; box-shadow: 0 0 0 4px rgba(13,91,99,0.1) !important; }
        .campaigns-search-btn { top:50%; right:7px; transform:translateY(-50%); width:30px; height:30px; border-radius:10px; background:#e7f7f5; color:#0d5b63; border:none; padding:0; }
        .campaigns-primary-btn { background: linear-gradient(135deg,#1f7a85 0%,#0d5b63 100%); border:none; border-radius:14px; padding:10px 15px; font-weight:700; font-size:13px; color:#fff; box-shadow:0 12px 24px rgba(13,91,99,0.18); }
        .campaigns-secondary-btn { background:#fff; color:#0f172a; border:1px solid #dbe5ee; border-radius:14px; padding:10px 14px; font-weight:700; font-size:13px; }
        .campaigns-tabbar { display:flex; flex-wrap:wrap; gap:10px; }
        .campaigns-tab-btn { border:1px solid #dde7ee !important; background:rgba(255,255,255,0.8) !important; color:#64748b !important; border-radius:999px !important; padding:9px 14px !important; font-size:13px; font-weight:700; transition:all 0.2s ease; }
        .campaigns-tab-btn.active { background:linear-gradient(135deg,#1f7a85 0%,#0d5b63 100%) !important; color:#fff !important; border-color:transparent !important; box-shadow:0 10px 20px rgba(13,91,99,0.18); }
        .explore-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
        .explore-card { background:rgba(255,255,255,0.94); border:1px solid rgba(226,232,240,0.95); border-radius:22px; padding:14px; box-shadow:0 14px 30px rgba(15,23,42,0.05); transition:transform 0.22s ease,box-shadow 0.22s ease; position:relative; overflow:hidden; cursor:pointer; }
        .explore-card:hover { transform:translateY(-4px); box-shadow:0 18px 35px rgba(15,23,42,0.08); }
        .explore-card::before { content:""; position:absolute; inset:0 0 auto 0; height:4px; background:linear-gradient(90deg,#0d5b63 0%,#22c1c3 100%); }
        .card-top-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
        .card-category-badge { display:inline-flex; align-items:center; justify-content:center; min-height:24px; padding:0 10px; border-radius:999px; background:#ecfeff; color:#0f766e; border:1px solid #a5f3fc; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.4px; }
        .fav-btn { width:32px; height:32px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; display:inline-flex; align-items:center; justify-content:center; }
        .template-name { font-size:14px; font-weight:800; color:#0f172a; line-height:1.35; margin-bottom:4px; word-break:break-word; }
        .template-subline { font-size:11px; color:#64748b; font-weight:600; margin-bottom:10px; }
        .mini-preview-wrap { position:relative; overflow:hidden; border-radius:18px; border:1px solid #e2e8f0; background:#fff; }
        .mini-preview-badge { position:absolute; top:8px; left:8px; z-index:2; display:inline-flex; align-items:center; gap:5px; padding:5px 9px; border-radius:999px; background:rgba(15,23,42,0.82); color:#fff; font-size:10px; font-weight:700; }
        .mini-preview-media { width:100%; height:170px; object-fit:cover; display:block; background:#e5e7eb; }
        .mini-text-preview { min-height:170px; padding:42px 12px 12px; font-size:12px; line-height:1.5; color:#334155; display:-webkit-box; -webkit-line-clamp:6; -webkit-box-orient:vertical; overflow:hidden; white-space:pre-wrap; word-break:break-word; }
        .mini-carousel-shell { display:grid; grid-template-columns:32px 1fr 32px; gap:8px; align-items:center; padding:8px; }
        .mini-nav-btn { width:32px; height:32px; border-radius:10px; border:1px solid #dbe4ee; background:#fff; color:#475569; display:inline-flex; align-items:center; justify-content:center; }
        .mini-carousel-card { overflow:hidden; border-radius:14px; border:1px solid #e2e8f0; background:#fff; }
        .mini-carousel-content { padding:10px; }
        .mini-carousel-title { font-size:12px; font-weight:800; color:#0f172a; line-height:1.35; margin-bottom:4px; }
        .mini-carousel-desc { font-size:11px; color:#64748b; line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .mini-preview-placeholder { height:170px; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:6px; color:#64748b; font-size:12px; background:#f8fafc; }
        .mini-dots { display:flex; justify-content:center; gap:6px; padding:0 0 10px; }
        .mini-dot { width:7px; height:7px; border:none; border-radius:999px; background:#cbd5e1; padding:0; }
        .mini-dot.active { width:20px; background:#0d5b63; }
        .card-meta-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:12px; }
        .status-approved,.status-rejected,.status-pending,.status-draft { display:inline-flex; align-items:center; justify-content:center; min-height:26px; padding:0 10px; border-radius:999px; font-size:10px; font-weight:800; text-transform:uppercase; }
        .status-approved { background:#ecfdf3; color:#15803d; border:1px solid #bbf7d0; }
        .status-rejected { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .status-pending  { background:#fff7ed; color:#c2410c; border:1px solid #fdba74; }
        .status-draft    { background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; }
        .template-type-chip { display:inline-flex; align-items:center; justify-content:center; min-height:26px; padding:0 10px; border-radius:999px; background:#f8fafc; color:#334155; border:1px solid #e2e8f0; font-size:10px; font-weight:800; text-transform:uppercase; }
        .card-footer-row { margin-top:12px; padding-top:12px; border-top:1px solid #edf2f7; display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .created-date { display:flex; align-items:center; gap:6px; color:#64748b; font-size:11px; font-weight:700; }
        .card-action-icons { display:flex; align-items:center; gap:7px; }
        .icon-btn { width:32px; height:32px; border-radius:10px; border:1px solid #e2e8f0; background:#fff; color:#64748b; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s ease; }
        .icon-btn:hover { color:#0f172a; border-color:#cbd5e1; background:#f8fafc; }
        .list-wrap { display:grid; gap:12px; }
        .list-card { background:rgba(255,255,255,0.92); border:1px solid rgba(226,232,240,0.95); border-radius:18px; padding:14px 16px; box-shadow:0 12px 24px rgba(15,23,42,0.04); }
        .list-grid { display:grid; grid-template-columns:1.4fr 0.9fr 0.9fr 0.8fr 1fr 0.9fr; gap:10px; align-items:center; }
        .list-head { background:rgba(255,255,255,0.9); border:1px solid rgba(226,232,240,0.95); border-radius:16px; padding:13px 16px; font-size:12px; font-weight:800; color:#0d5b63; }
        .empty-state { background:rgba(255,255,255,0.9); border:1px dashed #cbd5e1; border-radius:20px; padding:40px 20px; text-align:center; color:#64748b; box-shadow:0 12px 24px rgba(15,23,42,0.03); }
        .empty-state-title { font-size:18px; font-weight:800; color:#0f172a; margin-bottom:8px; }
        .empty-state-text  { font-size:13px; font-weight:500; margin-bottom:16px; }
        .loading-box { background:rgba(255,255,255,0.92); border:1px solid rgba(226,232,240,0.95); border-radius:20px; padding:30px; text-align:center; color:#64748b; font-weight:700; }
        .view-detail-btn { width:100%; margin-top:10px; padding:8px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#0d5b63; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s; }
        .view-detail-btn:hover { background:#e0f7f5; border-color:#0d5b63; }
        body[data-theme="dark"] .campaigns-page-shell {
          background: #0b141a !important;
          color: #e9edef;
        }
        body[data-theme="dark"] .campaigns-page-shell .campaigns-topbar-box,
        body[data-theme="dark"] .campaigns-page-shell .explore-card,
        body[data-theme="dark"] .campaigns-page-shell .list-card,
        body[data-theme="dark"] .campaigns-page-shell .list-head,
        body[data-theme="dark"] .campaigns-page-shell .empty-state,
        body[data-theme="dark"] .campaigns-page-shell .loading-box {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.18) !important;
        }
        body[data-theme="dark"] .campaigns-page-shell .campaigns-search-input,
        body[data-theme="dark"] .campaigns-page-shell .campaigns-secondary-btn,
        body[data-theme="dark"] .campaigns-page-shell .campaigns-tab-btn:not(.active),
        body[data-theme="dark"] .campaigns-page-shell .fav-btn,
        body[data-theme="dark"] .campaigns-page-shell .icon-btn,
        body[data-theme="dark"] .campaigns-page-shell .mini-preview-wrap,
        body[data-theme="dark"] .campaigns-page-shell .mini-carousel-card,
        body[data-theme="dark"] .campaigns-page-shell .mini-nav-btn,
        body[data-theme="dark"] .campaigns-page-shell .template-type-chip,
        body[data-theme="dark"] .campaigns-page-shell .view-detail-btn {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .campaigns-page-shell .campaigns-search-input::placeholder {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .campaigns-page-shell .template-name,
        body[data-theme="dark"] .campaigns-page-shell .mini-carousel-title,
        body[data-theme="dark"] .campaigns-page-shell .empty-state-title {
          color: #e9edef !important;
        }
        body[data-theme="dark"] .campaigns-page-shell .template-subline,
        body[data-theme="dark"] .campaigns-page-shell .mini-text-preview,
        body[data-theme="dark"] .campaigns-page-shell .mini-carousel-desc,
        body[data-theme="dark"] .campaigns-page-shell .created-date,
        body[data-theme="dark"] .campaigns-page-shell .empty-state,
        body[data-theme="dark"] .campaigns-page-shell .empty-state-text {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .campaigns-page-shell .mini-preview-placeholder {
          background: #202c33 !important;
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .campaigns-page-shell .card-footer-row {
          border-top-color: #2a3942 !important;
        }
        body[data-theme="dark"] .campaigns-page-shell .card-category-badge {
          background: rgba(0,168,132,0.14) !important;
          border-color: rgba(0,168,132,0.34) !important;
          color: #6ee7b7 !important;
        }
        @media (max-width:1399px) { .explore-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
        @media (max-width:1199px) { .explore-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width:767px) {
          .explore-grid { grid-template-columns:1fr; }
          .campaigns-topbar-box { padding: 12px 10px; }
          .campaigns-search-input { height: 40px; font-size: 13px; padding-left: 12px; padding-right: 40px; }
          .campaigns-search-btn { width: 28px; height: 28px; }
          .campaigns-primary-btn, .campaigns-secondary-btn { padding: 8px 12px; font-size: 12px; border-radius: 12px; }
          .campaigns-tab-btn { padding: 7px 11px; font-size: 12px; }
          .explore-card { padding: 12px; }
          .mini-preview-media { height: 130px; }
          .mini-text-preview { min-height: 130px; padding-top: 36px; }
          .template-name { font-size: 13px; }
          .template-subline { font-size: 10px; }
          .card-meta-row, .card-footer-row { margin-top: 8px; padding-top: 8px; }
          .icon-btn { width: 28px; height: 28px; }
          .list-card { padding: 12px; }
          .list-head { display: none; }
        }
      `}</style>

      {editModalOpen && (
        <EditTemplateModal
          templateId={editingTemplateId}
          onClose={() => setEditModalOpen(false)}
          onUpdate={handleUpdate}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      <div ref={pageRef} className="container-fluid py-3 campaigns-page-shell">
        <div className="d-flex flex-column" style={{ gap: "14px" }}>

          {/* Topbar */}
          <div className="campaigns-topbar-box">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="position-relative w-100 campaigns-search-wrap">
                <input type="text" className="form-control campaigns-search-input" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <button className="btn d-flex align-items-center justify-content-center position-absolute campaigns-search-btn"><Search size={15} /></button>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button className="btn campaigns-primary-btn d-flex align-items-center gap-2" onClick={() => router.push("/Template/addTemplate")} disabled={pageLoading || listLoading}>
                  <Plus size={16} /> Add Template
                </button>
                <button className="btn campaigns-secondary-btn d-flex align-items-center gap-2" onClick={handleRefresh} disabled={pageLoading || listLoading}>
                  <RefreshCcw size={15} /> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="campaigns-tabbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`btn d-flex align-items-center gap-2 campaigns-tab-btn ${activeTab === tab.id ? "active" : ""}`}>
                  <Icon size={15} /><span>{tab.label}</span>
                </button>
              );
            })}
            {isSuperAdmin && (
              <button onClick={() => setActiveTab("PendingApprovals")} className={`btn d-flex align-items-center gap-2 campaigns-tab-btn ${activeTab === "PendingApprovals" ? "active" : ""}`} style={{ position: "relative" }}>
                <Bell size={15} /><span>Pending Approvals</span>
              </button>
            )}
          </div>

          {/* Content */}
          {isPendingTab && isSuperAdmin ? (
            <PendingApprovalsPanel
              onApprove={(id) => setTemplates(prev => prev.map(t => t._id === id ? { ...t, approvalStatus: "approved", status: "APPROVED" } : t))}
              onReject={(id) => setTemplates(prev => prev.map(t => t._id === id ? { ...t, approvalStatus: "rejected", status: "REJECTED" } : t))}
            />
          ) : pageLoading || listLoading ? (
            <div className="loading-box">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No templates found</div>
              <div className="empty-state-text">Create your first WhatsApp template to get started.</div>
              <button className="btn campaigns-primary-btn" onClick={() => router.push("/Template/addTemplate")}>Create First Template</button>
            </div>
          ) : isExploreTab ? (
            <div ref={listRef} className="explore-grid">
              {filteredTemplates.map((item, index) => {
                const preview = getPreviewData(item);
                return (
                  <div key={item._id} ref={(el) => { rowRefs.current[index] = el; }} className="explore-card">
                    <div className="card-top-row">
                      <span className="card-category-badge">{preview.category}</span>
                      <button className="fav-btn" onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id); }}>
                        <Star size={16} color="#8b8b8b" fill={item.favorite ? "#8b8b8b" : "none"} />
                      </button>
                    </div>
                    <div className="template-name">{preview.title}</div>
                    <div className="template-subline">{preview.language}</div>
                    {getApprovalBadge(item) && <div style={{ marginBottom: 8 }}>{getApprovalBadge(item)}</div>}
                    <CompactTemplatePreview item={item} />
                    <div className="card-meta-row">
                      <span className={getStatusBadgeClass(preview.status)}>{preview.status}</span>
                      <span className="template-type-chip">{preview.previewType}</span>
                    </div>
                    <div className="card-footer-row">
                      <div className="created-date">
                        <CalendarDays size={13} />
                        <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "--"}</span>
                      </div>
                      <div className="card-action-icons">
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEdit(item._id); }} title="Edit"><Edit size={15} /></button>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleFavorite(item._id); }} title="Favorite"><Star size={15} color="#8b8b8b" fill={item.favorite ? "#8b8b8b" : "none"} /></button>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleCopy(item); }} title="Copy"><Copy size={15} /></button>
                        {isSuperAdmin && (
                          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }} title="Delete"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            renderListView()
          )}
        </div>
      </div>
    </>
  );
}
