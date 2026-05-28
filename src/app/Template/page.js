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
const mediaTypeOptions = ["None", "Image", "Video", "Carousel"];

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
const makeTemplateEditId = () => `edit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const normalizeEditCtaButtons = (items) =>
  safeArray(items).map((btn) => ({
    id: btn?.id || makeTemplateEditId(),
    type: btn?.type || btn?.btnType || "URL",
    title: btn?.title || "",
    value: btn?.value || "",
  }));
const normalizeEditCarouselItems = (items) =>
  safeArray(items).map((item, index) => {
    const rawMime = item?.mediaType || item?.mimeType || "";
    return {
      id: item?.id || makeTemplateEditId(),
      title: item?.title || "",
      description: item?.description || "",
      button: item?.button || "",
      mediaUrl: resolveUrl(item?.mediaUrl || item?.url || item?.image || item?.video || ""),
      mediaType: String(rawMime).toLowerCase().includes("video") ? "video" : "image",
      position: index,
    };
  });
const normalizeTemplateVariables = (variables) => {
  if (!variables || typeof variables !== "object") return {};
  return Object.fromEntries(
    Object.entries(variables).map(([key, config]) => [
      key,
      {
        type: config?.type || "manual",
        value: config?.value || "",
      },
    ])
  );
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 24, width: 500, maxWidth: "90vw", textAlign: "center", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }}>Loading template...</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, width: 600, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 24px 60px rgba(15,23,42,0.18)", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
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
function EditTemplateModalV2({ templateId, onClose, onUpdate, isSuperAdmin }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("basics");
  const [form, setForm] = useState({
    name: "",
    category: "",
    language: "",
    type: "",
    format: "",
    footer: "",
    mediaType: "None",
    actionType: "all",
  });
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [carouselItems, setCarouselItems] = useState([]);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [ctaButtons, setCtaButtons] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [copyCodeButtons, setCopyCodeButtons] = useState([]);
  const [dropdownButtons, setDropdownButtons] = useState([]);
  const [inputFields, setInputFields] = useState([]);
  const [variableValues, setVariableValues] = useState({});

  useEffect(() => {
    if (!templateId) return;
    API.get(`/templates/${templateId}`)
      .then((res) => {
        if (!res.data.success || !res.data.template) throw new Error("Failed to load template data");
        const t = res.data.template;
        setForm({
          name: t.name || "",
          category: t.category || "",
          language: t.language || "English",
          type: t.type || "Text",
          format: t.format || "",
          footer: t.footer || "",
          mediaType: t.mediaType || "None",
          actionType: t.actionType || "all",
        });
        setImageFile(t.imageFile?.url ? { ...t.imageFile, url: resolveUrl(t.imageFile.url), file: null } : null);
        setVideoFile(t.videoFile?.url ? { ...t.videoFile, url: resolveUrl(t.videoFile.url), file: null } : null);
        setCarouselItems(normalizeEditCarouselItems(t.carouselItems));
        setCtaButtons(normalizeEditCtaButtons(t.ctaButtons));
        setQuickReplies(safeArray(t.quickReplies).map((item) => ({ id: item?.id || makeTemplateEditId(), title: item?.title || "" })));
        setCopyCodeButtons(safeArray(t.copyCodeButtons).map((item) => ({ id: item?.id || makeTemplateEditId(), title: item?.title || "" })));
        setDropdownButtons(safeArray(t.dropdownButtons).map((item) => ({ id: item?.id || makeTemplateEditId(), title: item?.title || "", placeholder: item?.placeholder || "", options: item?.options || "", selected: item?.selected || "" })));
        setInputFields(safeArray(t.inputFields).map((item) => ({ id: item?.id || makeTemplateEditId(), label: item?.label || "", placeholder: item?.placeholder || "", value: item?.value || "" })));
        setVariableValues(normalizeTemplateVariables(t.variables));
      })
      .catch((err) => setError(err.response?.data?.error || err.message || "Error loading template"))
      .finally(() => setLoading(false));
  }, [templateId]);

  useEffect(() => {
    const regex = /\{\{(\d+)\}\}/g;
    const placeholders = [...new Set([...form.format.matchAll(regex)].map((match) => match[1]))];
    setVariableValues((prev) => {
      const next = normalizeTemplateVariables(prev);
      placeholders.forEach((key) => {
        if (!next[key]) next[key] = { type: "manual", value: "" };
      });
      Object.keys(next).forEach((key) => {
        if (!placeholders.includes(key)) delete next[key];
      });
      return next;
    });
  }, [form.format]);

  useEffect(() => {
    if (form.category !== "Marketing") setForm((prev) => ({ ...prev, mediaType: "None" }));
  }, [form.category]);

  useEffect(() => {
    if (form.mediaType === "None") {
      setImageFile(null);
      setVideoFile(null);
      setCarouselItems([]);
    }
    if (form.mediaType === "Image") {
      setVideoFile(null);
      setCarouselItems([]);
    }
    if (form.mediaType === "Video") {
      setImageFile(null);
      setCarouselItems([]);
    }
    if (form.mediaType === "Carousel") {
      setImageFile(null);
      setVideoFile(null);
    }
  }, [form.mediaType]);

  useEffect(() => {
    if (activeCarouselIndex >= carouselItems.length && carouselItems.length > 0) setActiveCarouselIndex(0);
  }, [activeCarouselIndex, carouselItems.length]);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const showCTA = form.actionType === "callToActions" || form.actionType === "all";
  const showQuickReplies = form.actionType === "quickReplies" || form.actionType === "all";
  const currentCarouselItem = carouselItems[activeCarouselIndex];

  const formattedPreview = useMemo(() => {
    let text = form.format || "Your template message will appear here...";
    Object.entries(variableValues).forEach(([key, config]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      const displayValue = config.type === "name"
        ? "[Contact Name]"
        : config.type === "number"
        ? "[Phone Number]"
        : config.value || `{{${key}}}`;
      text = text.replace(regex, displayValue);
    });
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return text
      .replace(/\*([^*]+)\*/g, "<b>$1</b>")
      .replace(/_([^_]+)_/g, "<i>$1</i>")
      .replace(/~([^~]+)~/g, "<s>$1</s>")
      .replace(/\n/g, "<br/>");
  }, [form.format, variableValues]);

  const parsedDropdowns = useMemo(() => (
    dropdownButtons.map((item) => ({
      ...item,
      parsedOptions: (item.options || "").split(",").map((opt) => opt.trim()).filter(Boolean),
    }))
  ), [dropdownButtons]);

  const counts = {
    quickReplies: quickReplies.length,
    url: ctaButtons.filter((btn) => btn.type === "URL").length,
    phone: ctaButtons.filter((btn) => btn.type === "Phone Number").length,
    copyCode: copyCodeButtons.length,
    dropdown: dropdownButtons.length,
    input: inputFields.length,
  };

  const visiblePreviewButtons = useMemo(() => {
    if (form.actionType === "none") return [];
    const items = [];
    if (showCTA) {
      items.push(...ctaButtons.filter((item) => item.title.trim()));
      items.push(...copyCodeButtons.filter((item) => item.title.trim()).map((item) => ({ ...item, type: "Copy Code" })));
    }
    if (showQuickReplies) {
      items.push(...quickReplies.filter((item) => item.title.trim()).map((item) => ({ ...item, type: "Quick Reply" })));
    }
    return items;
  }, [form.actionType, showCTA, showQuickReplies, ctaButtons, copyCodeButtons, quickReplies]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageFile({ name: file.name, type: file.type, url: reader.result, file });
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setVideoFile({ name: file.name, type: file.type, url: reader.result, file });
    reader.readAsDataURL(file);
  };

  const handleCarouselMediaUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCarouselItems((prev) => prev.map((item) => (
        item.id === id
          ? { ...item, mediaUrl: reader.result, mediaType: file.type.startsWith("video/") ? "video" : "image", mediaFile: file }
          : item
      )));
    };
    reader.readAsDataURL(file);
  };

  const addCarouselCard = () => carouselItems.length < 10 && setCarouselItems((prev) => [...prev, { id: makeTemplateEditId(), title: "", description: "", button: "", mediaUrl: "", mediaType: "image" }]);
  const updateCarouselItem = (id, key, value) => setCarouselItems((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  const addQuickReply = () => counts.quickReplies < 10 && setQuickReplies((prev) => [...prev, { id: makeTemplateEditId(), title: "" }]);
  const addURL = () => counts.url < 2 && setCtaButtons((prev) => [...prev, { id: makeTemplateEditId(), type: "URL", title: "", value: "" }]);
  const addPhone = () => counts.phone < 1 && setCtaButtons((prev) => [...prev, { id: makeTemplateEditId(), type: "Phone Number", title: "", value: "" }]);
  const addCopyCode = () => counts.copyCode < 1 && setCopyCodeButtons((prev) => [...prev, { id: makeTemplateEditId(), title: "" }]);
  const addDropdown = () => counts.dropdown < 3 && setDropdownButtons((prev) => [...prev, { id: makeTemplateEditId(), title: "", placeholder: "", options: "", selected: "" }]);
  const addInputField = () => counts.input < 3 && setInputFields((prev) => [...prev, { id: makeTemplateEditId(), label: "", placeholder: "", value: "" }]);
  const updateCTA = (id, key, value) => setCtaButtons((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  const updateById = (setter, id, key, value) => setter((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  const removeById = (setter, id) => setter((prev) => prev.filter((item) => item.id !== id));

  const validateForm = () => {
    if (!form.category) return "Please select template category.";
    if (!form.language) return "Please select template language.";
    if (!form.name.trim()) return "Please enter template name.";
    if (!/^[a-z0-9_]+$/.test(form.name.trim())) return "Template name must contain only lowercase letters, numbers, and underscores.";
    if (!form.type) return "Please select template type.";
    if (!form.format.trim()) return "Please enter template format.";
    if (form.category !== "Marketing" && form.mediaType !== "None") return "Media is allowed only for marketing templates.";
    if (form.category === "Marketing" && form.mediaType === "Image" && !imageFile?.url) return "Please upload an image.";
    if (form.category === "Marketing" && form.mediaType === "Video" && !videoFile?.url) return "Please upload a video.";
    if (form.category === "Marketing" && form.mediaType === "Carousel") {
      if (!carouselItems.length) return "Please add at least one carousel card.";
      for (const item of carouselItems) {
        if (!item.title.trim()) return "Please fill carousel card title.";
        if (!item.description.trim()) return "Please fill carousel card description.";
        if (!item.mediaUrl) return "Please upload media for every carousel card.";
      }
    }
    if (showCTA) {
      for (const item of ctaButtons) {
        if (!item.title.trim()) return "Please fill CTA button title.";
        if (!item.value.trim()) return "Please fill CTA button value.";
      }
      for (const item of copyCodeButtons) if (!item.title.trim()) return "Please fill copy-code button title.";
      for (const item of dropdownButtons) {
        if (!item.title.trim()) return "Please fill dropdown title.";
        if (!item.options.trim()) return "Please add dropdown options.";
      }
      for (const item of inputFields) {
        if (!item.label.trim()) return "Please fill input field label.";
        if (!item.placeholder.trim()) return "Please fill input field placeholder.";
      }
    }
    if (showQuickReplies) {
      for (const item of quickReplies) if (!item.title.trim()) return "Please fill quick reply title.";
    }
    return "";
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("category", form.category);
      formData.append("language", form.language);
      formData.append("type", form.type);
      formData.append("format", form.format);
      formData.append("footer", form.footer);
      formData.append("mediaType", form.mediaType);
      formData.append("actionType", form.actionType);
      if (form.mediaType === "Image" && imageFile?.file) formData.append("mediaFile", imageFile.file);
      if (form.mediaType === "Video" && videoFile?.file) formData.append("mediaFile", videoFile.file);
      if (imageFile && !imageFile.file) formData.append("imageFile", JSON.stringify(imageFile));
      if (videoFile && !videoFile.file) formData.append("videoFile", JSON.stringify(videoFile));
      formData.append("carouselItems", JSON.stringify(form.mediaType === "Carousel" ? carouselItems.map(({ mediaFile, position, ...item }) => item) : []));
      formData.append("ctaButtons", JSON.stringify(showCTA ? ctaButtons : []));
      formData.append("quickReplies", JSON.stringify(showQuickReplies ? quickReplies : []));
      formData.append("copyCodeButtons", JSON.stringify(showCTA ? copyCodeButtons : []));
      formData.append("dropdownButtons", JSON.stringify(showCTA ? dropdownButtons : []));
      formData.append("inputFields", JSON.stringify(showCTA ? inputFields : []));
      formData.append("variables", JSON.stringify(variableValues || {}));

      const res = await API.put(`/templates/${templateId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (!res.data.success) throw new Error(res.data.error || "Update failed");
      if (res.data.pendingApproval) alert("Template updated and sent to admin for approval.");
      onUpdate(res.data.template);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "basics", label: "Basics", Icon: FileText },
    { id: "media", label: "Media", Icon: ImageIcon },
    { id: "message", label: "Message", Icon: Layout },
    { id: "variables", label: "Variables", Icon: AlertCircle },
    { id: "actions", label: "Actions", Icon: Plus },
    { id: "preview", label: "Preview", Icon: BadgeCheck },
  ];

  const inputStyle = { width: "100%", minHeight: 42, borderRadius: 12, border: "1px solid #dbe3eb", background: "#fff", padding: "0 12px", color: "#0f172a", fontSize: 13, fontWeight: 600, outline: "none" };
  const textareaStyle = { ...inputStyle, minHeight: 132, padding: "12px", lineHeight: 1.55, resize: "vertical" };
  const labelStyle = { fontSize: 12, fontWeight: 800, color: "#334155", display: "flex", alignItems: "center", gap: 7, marginBottom: 7 };
  const sectionBox = { border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fff" };
  const actionRow = { border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#fbfdff" };
  const iconButton = { width: 34, height: 34, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#64748b", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
  const primaryButton = { border: "none", borderRadius: 12, minHeight: 42, padding: "0 18px", color: "#fff", background: "linear-gradient(135deg,#0f5f64 0%,#14808a 70%,#22c55e 100%)", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 12px 24px rgba(15,95,100,0.18)", cursor: "pointer" };
  const secondaryButton = { border: "1px solid #dbe3eb", borderRadius: 12, minHeight: 42, padding: "0 16px", background: "#fff", color: "#334155", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };
  const uploadBox = { border: "1px dashed #b9c7d6", borderRadius: 14, minHeight: 50, padding: "0 14px", background: "#f8fafc", color: "#334155", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
  const FieldLabel = ({ icon, children }) => <label style={labelStyle}>{icon}{children}</label>;
  const RemoveButton = ({ onClick }) => <button type="button" onClick={onClick} style={iconButton} title="Remove"><X size={15} /></button>;
  const AddChip = ({ label, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} style={{ minHeight: 36, borderRadius: 999, border: "1px solid #dbe3eb", background: disabled ? "#f1f5f9" : "#fff", color: disabled ? "#94a3b8" : "#0f5f64", padding: "0 12px", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 7, cursor: disabled ? "not-allowed" : "pointer" }}>
      <Plus size={13} /> {label}
    </button>
  );

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 22, padding: 36, width: 420, maxWidth: "90vw", textAlign: "center", boxShadow: "0 24px 60px rgba(15,23,42,0.18)", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
          <Clock3 size={34} color="#0f5f64" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 800, color: "#0f172a" }}>Loading template...</div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "appModalBackdropIn 0.32s ease-out both", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, width: 960, maxWidth: "96vw", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(15,23,42,0.22)", animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(180deg,#f8fafc 0%,#fff 100%)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(15,95,100,0.08)", color: "#0f5f64", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 800, marginBottom: 7 }}>
                <Edit size={13} /> EDIT TEMPLATE
              </div>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 900 }}>{form.name || "Template"}</h3>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 12, fontWeight: 700 }}>{form.category || "Category"} / {form.type || "Type"} / {form.mediaType || "None"}</div>
            </div>
            <button type="button" onClick={onClose} style={{ ...iconButton, width: 38, height: 38 }}><X size={17} /></button>
          </div>
          {!isSuperAdmin && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: "8px 12px", marginBottom: 14, color: "#92400e", fontSize: 12, fontWeight: 700 }}>
              Your edits will be sent to admin for approval before going live.
            </div>
          )}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none" }}>
            {sections.map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => setActiveSection(id)} style={{ padding: "9px 12px", borderRadius: "10px 10px 0 0", border: "1px solid transparent", borderBottom: "none", background: activeSection === id ? "#fff" : "transparent", borderColor: activeSection === id ? "#e5e7eb" : "transparent", marginBottom: activeSection === id ? -1 : 0, color: activeSection === id ? "#0f5f64" : "#94a3b8", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", flexShrink: 0 }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#fbfdff" }}>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 13, color: "#dc2626", fontWeight: 700 }}>{error}</div>}

          {activeSection === "basics" && (
            <div style={{ ...sectionBox, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel icon={<FileText size={14} />}>Template Name *</FieldLabel>
                <input style={inputStyle} value={form.name} onChange={(e) => handleChange("name", e.target.value.toLowerCase().replace(/\s+/g, "_"))} placeholder="template_name" />
              </div>
              <div><FieldLabel icon={<Package size={14} />}>Category *</FieldLabel><select style={inputStyle} value={form.category} onChange={(e) => handleChange("category", e.target.value)}><option value="">Select category</option>{categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div><FieldLabel icon={<CalendarDays size={14} />}>Language *</FieldLabel><select style={inputStyle} value={form.language} onChange={(e) => handleChange("language", e.target.value)}><option value="">Select language</option>{languageOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div><FieldLabel icon={<Layout size={14} />}>Template Type *</FieldLabel><select style={inputStyle} value={form.type} onChange={(e) => handleChange("type", e.target.value)}><option value="">Select type</option>{typeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div><FieldLabel icon={<ImageIcon size={14} />}>Media Type</FieldLabel><select style={{ ...inputStyle, opacity: form.category === "Marketing" ? 1 : 0.65 }} value={form.mediaType} onChange={(e) => handleChange("mediaType", e.target.value)} disabled={form.category !== "Marketing"}>{mediaTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            </div>
          )}

          {activeSection === "media" && (
            <div style={{ ...sectionBox, display: "grid", gap: 16 }}>
              {form.category !== "Marketing" && <div style={{ border: "1px dashed #cbd5e1", borderRadius: 14, padding: 16, background: "#f8fafc", color: "#64748b", fontSize: 13, fontWeight: 700 }}>Media uploads are available only for Marketing templates.</div>}
              {form.category === "Marketing" && form.mediaType === "None" && <div style={{ border: "1px dashed #cbd5e1", borderRadius: 14, padding: 16, background: "#f8fafc", color: "#64748b", fontSize: 13, fontWeight: 700 }}>Choose Image, Video, or Carousel in Basics to edit media.</div>}
              {form.category === "Marketing" && form.mediaType === "Image" && <div><FieldLabel icon={<ImageIcon size={14} />}>Image Header</FieldLabel>{imageFile?.url && <img src={imageFile.url} alt="Template image" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 16, marginBottom: 12, border: "1px solid #e5e7eb" }} />}<label style={uploadBox}><Upload size={16} /> Change Image<input type="file" accept="image/*" hidden onChange={handleImageUpload} /></label></div>}
              {form.category === "Marketing" && form.mediaType === "Video" && <div><FieldLabel icon={<Video size={14} />}>Video Header</FieldLabel>{videoFile?.url && <video src={videoFile.url} controls style={{ width: "100%", maxHeight: 240, borderRadius: 16, marginBottom: 12, background: "#000" }} />}<label style={uploadBox}><Upload size={16} /> Change Video<input type="file" accept="video/*" hidden onChange={handleVideoUpload} /></label></div>}
              {form.category === "Marketing" && form.mediaType === "Carousel" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><FieldLabel icon={<Layout size={14} />}>Carousel Cards</FieldLabel><button type="button" onClick={addCarouselCard} disabled={carouselItems.length >= 10} style={secondaryButton}><Plus size={14} /> Add Card</button></div>
                  {carouselItems.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>No carousel cards yet.</div>}
                  {carouselItems.map((item, index) => (
                    <div key={item.id} style={actionRow}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}><strong style={{ color: "#0f172a", fontSize: 13 }}>Card {index + 1}</strong><RemoveButton onClick={() => removeById(setCarouselItems, item.id)} /></div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}><input style={inputStyle} placeholder="Card title" value={item.title} onChange={(e) => updateCarouselItem(item.id, "title", e.target.value)} /><input style={inputStyle} placeholder="Description" value={item.description} onChange={(e) => updateCarouselItem(item.id, "description", e.target.value)} /><input style={inputStyle} placeholder="Button title" value={item.button} onChange={(e) => updateCarouselItem(item.id, "button", e.target.value)} /></div>
                      <label style={{ ...uploadBox, marginTop: 10 }}>{item.mediaType === "video" ? <Video size={16} /> : <ImageIcon size={16} />}{item.mediaUrl ? "Media Uploaded" : "Upload Image / Video"}<input type="file" accept="image/*,video/*" hidden onChange={(e) => handleCarouselMediaUpload(item.id, e)} /></label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "message" && (
            <div style={{ ...sectionBox, display: "grid", gap: 16 }}>
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 12, padding: 12, color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>Use variables like <strong>{"{{1}}"}</strong>. Formatting supports <strong>*bold*</strong>, <strong>_italic_</strong>, and <strong>~strikethrough~</strong>.</div>
              <div><FieldLabel icon={<FileText size={14} />}>Message Format *</FieldLabel><textarea style={textareaStyle} value={form.format} maxLength={1024} onChange={(e) => handleChange("format", e.target.value)} placeholder="Enter your message..." /><div style={{ textAlign: "right", color: "#94a3b8", fontSize: 11, fontWeight: 700, marginTop: 4 }}>{form.format.length}/1024</div></div>
              <div><FieldLabel icon={<FileText size={14} />}>Footer</FieldLabel><input style={inputStyle} value={form.footer} onChange={(e) => handleChange("footer", e.target.value)} placeholder="Optional footer text" /></div>
            </div>
          )}

          {activeSection === "variables" && (
            <div style={{ ...sectionBox, display: "grid", gap: 14 }}>
              {Object.keys(variableValues).length === 0 && <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>No variables found in the message format.</div>}
              {Object.entries(variableValues).map(([key, config]) => (
                <div key={key} style={actionRow}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}><strong style={{ color: "#0f172a", fontSize: 13 }}>Variable {"{{"}{key}{"}}"}</strong><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[["name", "Contact Name"], ["number", "Phone Number"], ["manual", "Manual"]].map(([value, label]) => <button key={value} type="button" onClick={() => setVariableValues((prev) => ({ ...prev, [key]: { ...prev[key], type: value } }))} style={{ border: "1px solid", borderColor: config.type === value ? "#0f5f64" : "#dbe3eb", background: config.type === value ? "#e6fffb" : "#fff", color: config.type === value ? "#0f5f64" : "#475569", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{label}</button>)}</div></div>
                  {config.type === "manual" && <input style={inputStyle} placeholder={`Preview value for {{${key}}}`} value={config.value || ""} onChange={(e) => setVariableValues((prev) => ({ ...prev, [key]: { ...prev[key], value: e.target.value } }))} />}
                </div>
              ))}
            </div>
          )}

          {activeSection === "actions" && (
            <div style={{ ...sectionBox, display: "grid", gap: 16 }}>
              <div><FieldLabel icon={<Plus size={14} />}>Action Mode</FieldLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{[["none", "None"], ["callToActions", "Call to Actions"], ["quickReplies", "Quick Replies"], ["all", "All"]].map(([value, label]) => <button key={value} type="button" onClick={() => handleChange("actionType", value)} style={{ border: "1px solid", borderColor: form.actionType === value ? "#0f5f64" : "#dbe3eb", background: form.actionType === value ? "linear-gradient(135deg,#0f5f64,#14808a)" : "#fff", color: form.actionType === value ? "#fff" : "#334155", borderRadius: 999, minHeight: 38, padding: "0 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{label}</button>)}</div></div>
              {form.actionType !== "none" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{showQuickReplies && <AddChip label={`Quick Reply (${counts.quickReplies}/10)`} onClick={addQuickReply} disabled={counts.quickReplies >= 10} />}{showCTA && <AddChip label={`URL (${counts.url}/2)`} onClick={addURL} disabled={counts.url >= 2} />}{showCTA && <AddChip label={`Phone (${counts.phone}/1)`} onClick={addPhone} disabled={counts.phone >= 1} />}{showCTA && <AddChip label={`Copy Code (${counts.copyCode}/1)`} onClick={addCopyCode} disabled={counts.copyCode >= 1} />}{showCTA && <AddChip label={`Dropdown (${counts.dropdown}/3)`} onClick={addDropdown} disabled={counts.dropdown >= 3} />}{showCTA && <AddChip label={`Input (${counts.input}/3)`} onClick={addInputField} disabled={counts.input >= 3} />}</div>}
              {showCTA && ctaButtons.map((item, index) => <div key={item.id} style={actionRow}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}><select style={inputStyle} value={item.type} onChange={(e) => updateCTA(item.id, "type", e.target.value)}><option value="URL">URL</option><option value="Phone Number">Phone Number</option></select><input style={inputStyle} maxLength={25} placeholder={`CTA ${index + 1} title`} value={item.title} onChange={(e) => updateCTA(item.id, "title", e.target.value)} /><input style={inputStyle} placeholder={item.type === "URL" ? "https://example.com" : "9876543210"} value={item.value} onChange={(e) => updateCTA(item.id, "value", e.target.value)} /><RemoveButton onClick={() => removeById(setCtaButtons, item.id)} /></div></div>)}
              {showQuickReplies && quickReplies.map((item, index) => <div key={item.id} style={actionRow}><div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 38px", gap: 10 }}><input style={inputStyle} maxLength={25} placeholder={`Quick reply ${index + 1}`} value={item.title} onChange={(e) => updateById(setQuickReplies, item.id, "title", e.target.value)} /><RemoveButton onClick={() => removeById(setQuickReplies, item.id)} /></div></div>)}
              {showCTA && copyCodeButtons.map((item) => <div key={item.id} style={actionRow}><div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 38px", gap: 10 }}><input style={inputStyle} maxLength={25} placeholder="Copy code button title" value={item.title} onChange={(e) => updateById(setCopyCodeButtons, item.id, "title", e.target.value)} /><RemoveButton onClick={() => removeById(setCopyCodeButtons, item.id)} /></div></div>)}
              {showCTA && dropdownButtons.map((item, index) => <div key={item.id} style={actionRow}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}><input style={inputStyle} maxLength={25} placeholder={`Dropdown ${index + 1} title`} value={item.title} onChange={(e) => updateById(setDropdownButtons, item.id, "title", e.target.value)} /><input style={inputStyle} placeholder="Placeholder" value={item.placeholder} onChange={(e) => updateById(setDropdownButtons, item.id, "placeholder", e.target.value)} /><input style={inputStyle} placeholder="Option 1, Option 2" value={item.options} onChange={(e) => updateById(setDropdownButtons, item.id, "options", e.target.value)} /><RemoveButton onClick={() => removeById(setDropdownButtons, item.id)} /></div></div>)}
              {showCTA && inputFields.map((item, index) => <div key={item.id} style={actionRow}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}><input style={inputStyle} maxLength={25} placeholder={`Input ${index + 1} label`} value={item.label} onChange={(e) => updateById(setInputFields, item.id, "label", e.target.value)} /><input style={inputStyle} placeholder="Placeholder" value={item.placeholder} onChange={(e) => updateById(setInputFields, item.id, "placeholder", e.target.value)} /><input style={inputStyle} placeholder="Preview value" value={item.value} onChange={(e) => updateById(setInputFields, item.id, "value", e.target.value)} /><RemoveButton onClick={() => removeById(setInputFields, item.id)} /></div></div>)}
            </div>
          )}

          {activeSection === "preview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
              <div style={{ ...sectionBox, background: "#eef5f1" }}>
                <div style={{ maxWidth: 430, margin: "0 auto", background: "#fff", borderRadius: 18, border: "1px solid #dbe3eb", padding: 14, boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
                  {form.category === "Marketing" && form.mediaType === "Image" && imageFile?.url && <img src={imageFile.url} alt="Template preview" style={{ width: "100%", maxHeight: 210, objectFit: "cover", borderRadius: 12, marginBottom: 10 }} />}
                  {form.category === "Marketing" && form.mediaType === "Video" && videoFile?.url && <video src={videoFile.url} controls style={{ width: "100%", maxHeight: 210, borderRadius: 12, marginBottom: 10, background: "#000" }} />}
                  {form.category === "Marketing" && form.mediaType === "Carousel" && currentCarouselItem && <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>{currentCarouselItem.mediaUrl ? (currentCarouselItem.mediaType === "video" ? <video src={currentCarouselItem.mediaUrl} controls style={{ width: "100%", height: 180, objectFit: "cover", background: "#000" }} /> : <img src={currentCarouselItem.mediaUrl} alt={currentCarouselItem.title || "Carousel card"} style={{ width: "100%", height: 180, objectFit: "cover" }} />) : <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>No media</div>}<div style={{ padding: 10 }}><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{currentCarouselItem.title || "Card title"}</div><div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 3 }}>{currentCarouselItem.description || "Card description"}</div>{currentCarouselItem.button && <button type="button" style={{ ...secondaryButton, minHeight: 34, marginTop: 8 }}>{currentCarouselItem.button}</button>}</div>{carouselItems.length > 1 && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px 10px" }}><button type="button" style={iconButton} onClick={() => setActiveCarouselIndex((prev) => prev === 0 ? carouselItems.length - 1 : prev - 1)}><ChevronLeft size={15} /></button><span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{activeCarouselIndex + 1} / {carouselItems.length}</span><button type="button" style={iconButton} onClick={() => setActiveCarouselIndex((prev) => prev === carouselItems.length - 1 ? 0 : prev + 1)}><ChevronRight size={15} /></button></div>}</div>}
                  <div style={{ color: "#0f5f64", fontSize: 10, fontWeight: 900, marginBottom: 8, textTransform: "uppercase" }}>{form.category || "Category"} / {form.language || "Language"}</div>
                  <div style={{ color: "#111827", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: formattedPreview }} />
                  {form.footer && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e7eb", color: "#64748b", fontSize: 11 }}>{form.footer}</div>}
                  {showCTA && parsedDropdowns.map((item) => <select key={item.id} style={{ ...inputStyle, marginTop: 10, height: 38 }} value={item.selected || ""} onChange={(e) => updateById(setDropdownButtons, item.id, "selected", e.target.value)}><option value="">{item.placeholder || item.title || "Select option"}</option>{item.parsedOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>)}
                  {showCTA && inputFields.map((item) => <input key={item.id} style={{ ...inputStyle, marginTop: 10, height: 38 }} placeholder={item.placeholder || "Enter value"} value={item.value} onChange={(e) => updateById(setInputFields, item.id, "value", e.target.value)} />)}
                  {visiblePreviewButtons.length > 0 && <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{visiblePreviewButtons.map((item, index) => <button key={`${item.id}-${index}`} type="button" style={secondaryButton}>{item.type === "Phone Number" ? "Call" : item.type === "URL" ? "Open" : item.type === "Copy Code" ? "Copy" : "Reply"} / {item.title}</button>)}</div>}
                </div>
              </div>
              <div style={{ ...sectionBox, display: "grid", gap: 12, alignSelf: "start" }}>{[["Name", form.name || "-"], ["Type", form.type || "-"], ["Media", form.category === "Marketing" ? form.mediaType : "Not allowed"], ["Actions", form.actionType], ["Variables", String(Object.keys(variableValues).length)], ["Carousel Cards", String(carouselItems.length)]].map(([label, value]) => <div key={label}><div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>{label}</div><div style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, wordBreak: "break-word" }}>{value}</div></div>)}</div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12, background: "#fff" }}>
          <button type="button" onClick={onClose} style={secondaryButton}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.75 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
            <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  if (loading) return <PendingApprovalsSkeleton />;

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

function SkeletonLine({ width = "100%", height = 14, radius = 999, className = "" }) {
  return (
    <div
      className={`template-skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

function TemplateExploreSkeleton({ count = 8 }) {
  return (
    <div className="explore-grid" aria-label="Loading templates">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="explore-card template-skeleton-card">
          <div className="card-top-row">
            <SkeletonLine width="96px" height={24} />
            <SkeletonLine width="32px" height={32} radius={10} />
          </div>
          <SkeletonLine width="78%" height={16} radius={8} />
          <div style={{ marginTop: 8 }}>
            <SkeletonLine width="42%" height={12} radius={8} />
          </div>
          <div className="mini-preview-wrap" style={{ marginTop: 12 }}>
            <SkeletonLine width="100%" height={170} radius={18} />
          </div>
          <div className="card-meta-row">
            <SkeletonLine width="82px" height={26} />
            <SkeletonLine width="72px" height={26} />
          </div>
          <div className="card-footer-row">
            <SkeletonLine width="112px" height={13} radius={8} />
            <div className="card-action-icons">
              {[1, 2, 3].map((item) => (
                <SkeletonLine key={item} width="32px" height={32} radius={10} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateListSkeleton({ rows = 6 }) {
  return (
    <>
      <div className="d-none d-lg-grid list-head list-grid">
        {["Name", "Category", "Status", "Approval", "Created", "Actions"].map((label) => (
          <SkeletonLine key={label} width={label === "Name" ? "74px" : "62px"} height={12} radius={6} />
        ))}
      </div>
      <div className="list-wrap" aria-label="Loading template rows">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="list-card">
            <div className="d-none d-lg-grid list-grid">
              <div>
                <SkeletonLine width="72%" height={15} radius={8} />
                <div style={{ marginTop: 8 }}>
                  <SkeletonLine width="36%" height={11} radius={8} />
                </div>
              </div>
              <SkeletonLine width="70%" height={13} radius={8} />
              <SkeletonLine width="82px" height={26} />
              <SkeletonLine width="96px" height={24} />
              <SkeletonLine width="88px" height={12} radius={8} />
              <div className="d-flex align-items-center gap-2">
                {[1, 2, 3].map((item) => (
                  <SkeletonLine key={item} width="32px" height={32} radius={10} />
                ))}
              </div>
            </div>
            <div className="d-flex d-lg-none flex-column gap-2">
              <SkeletonLine width="78%" height={15} radius={8} />
              <SkeletonLine width="52%" height={11} radius={8} />
              <div className="d-flex align-items-center gap-2">
                <SkeletonLine width="82px" height={26} />
                <SkeletonLine width="96px" height={24} />
              </div>
              <div className="d-flex align-items-center justify-content-between gap-2">
                <SkeletonLine width="88px" height={12} radius={8} />
                <div className="d-flex gap-1">
                  {[1, 2, 3].map((item) => (
                    <SkeletonLine key={item} width="28px" height={28} radius={10} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PendingApprovalsSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
        <SkeletonLine width="28px" height={28} radius={10} />
        <SkeletonLine width="190px" height={16} radius={8} />
        <SkeletonLine width="34px" height={20} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 760 }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              {["Template Name", "Category", "Submitted By", "Role", "Date", "Actions"].map((label) => (
                <th key={label} style={thStyle}>
                  <SkeletonLine width={label === "Template Name" ? "120px" : "72px"} height={12} radius={6} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, row) => (
              <tr key={row} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={tdStyle}><SkeletonLine width="150px" height={14} radius={8} /></td>
                <td style={tdStyle}><SkeletonLine width="84px" height={14} radius={8} /></td>
                <td style={tdStyle}><SkeletonLine width="110px" height={14} radius={8} /></td>
                <td style={tdStyle}><SkeletonLine width="86px" height={24} /></td>
                <td style={tdStyle}><SkeletonLine width="86px" height={14} radius={8} /></td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <SkeletonLine width="88px" height={30} radius={8} />
                    <SkeletonLine width="78px" height={30} radius={8} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
        @keyframes templateSkeletonShimmer {
          0% { background-position: -220px 0; }
          100% { background-position: calc(220px + 100%) 0; }
        }
        .template-skeleton {
          display: block;
          max-width: 100%;
          background: linear-gradient(90deg, #eef2f7 0%, #f8fafc 50%, #eef2f7 100%);
          background-size: 220px 100%;
          animation: templateSkeletonShimmer 1.25s ease-in-out infinite;
        }
        .template-skeleton-card {
          pointer-events: none;
          cursor: default;
        }
        .template-skeleton-card:hover {
          transform: none;
        }
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
        body[data-theme="dark"] .campaigns-page-shell .template-skeleton {
          background: linear-gradient(90deg, #1f2c34 0%, #2a3942 50%, #1f2c34 100%) !important;
          background-size: 220px 100% !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .template-skeleton { animation: none; }
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
        <EditTemplateModalV2
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
            isExploreTab ? <TemplateExploreSkeleton /> : <TemplateListSkeleton />
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
