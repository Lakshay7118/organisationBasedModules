"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutTemplate,
  Globe,
  FileText,
  MessageSquareText,
  ListChecks,
  MousePointerClick,
  Link2,
  Phone,
  Copy,
  Plus,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Video,
  Layers3,
  Hash,
} from "lucide-react";
import API from "../../utils/api";   // ✅ using your axios instance

const categoryOptions = ["Marketing", "Utility", "Authentication"];
const languageOptions = ["English", "Hindi", "Spanish", "Arabic"];
const typeOptions = ["Text", "Media", "Interactive"];
const mediaTypeOptions = ["None", "Image", "Video", "Carousel"];

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const colors = {
  primary: "#0f766e",
  primaryDark: "#115e59",
  text: "var(--app-text)",
  textSoft: "var(--app-text-muted)",
  border: "var(--app-border)",
  bgSoft: "var(--app-surface-2)",
};

const fieldStyle = {
  height: "42px",
  borderRadius: "12px",
  border: `1px solid ${colors.border}`,
  background: colors.bgSoft,
  boxShadow: "none",
  fontSize: "12px",
  fontWeight: 500,
  color: colors.text,
  paddingLeft: "12px",
  paddingRight: "12px",
  transition: "all 0.2s ease",
};

const textareaStyle = {
  ...fieldStyle,
  minHeight: "120px",
  resize: "vertical",
  paddingTop: "12px",
};

const sectionStyle = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: "18px",
  padding: "16px",
};

const infoBoxStyle = {
  background: "var(--app-surface-2)",
  border: "1px dashed var(--app-border)",
  borderRadius: "12px",
  padding: "10px 12px",
  color: "var(--app-text-muted)",
  fontSize: "12px",
  lineHeight: 1.6,
};

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  fontWeight: 700,
  color: colors.text,
  marginBottom: "8px",
};

const iconBoxStyle = {
  width: "24px",
  height: "24px",
  borderRadius: "8px",
  background: "rgba(15, 118, 110, 0.08)",
  color: "#0f766e",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const actionBoxStyle = {
  background: "var(--app-surface-2)",
  border: "1px solid var(--app-border)",
  borderRadius: "16px",
  padding: "12px",
};

const removeBtnStyle = {
  width: "36px",
  height: "36px",
  border: "1px solid var(--app-border)",
  borderRadius: "10px",
  background: "var(--app-surface)",
  color: "var(--app-text-muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewActionBtn = {
  border: "1px solid #d1fae5",
  background: "#f0fdf4",
  color: "#065f46",
  borderRadius: "10px",
  minHeight: "34px",
  padding: "0 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  fontSize: "11px",
  fontWeight: 700,
};

const inputFocus = (e) => {
  e.target.style.border = `1px solid ${colors.primary}`;
  e.target.style.background = "var(--input-bg)";
  e.target.style.boxShadow = "0 0 0 4px rgba(15, 118, 110, 0.08)";
};

const inputBlur = (e) => {
  e.target.style.border = `1px solid ${colors.border}`;
  e.target.style.background = colors.bgSoft;
  e.target.style.boxShadow = "none";
};

export default function NewTemplatePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    category: "",
    language: "",
    name: "",
    type: "",
    format: "Hello {{1}}, your code will expire in {{2}} mins.",
    footer: "",
    actionType: "all",
    mediaType: "None",
  });

  const [variableValues, setVariableValues] = useState({});

  const [ctaButtons, setCtaButtons] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [copyCodeButtons, setCopyCodeButtons] = useState([]);
  const [dropdownButtons, setDropdownButtons] = useState([]);
  const [inputFields, setInputFields] = useState([]);

  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [carouselItems, setCarouselItems] = useState([]);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submittedData, setSubmittedData] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (form.category !== "Marketing") {
      setForm((prev) => ({ ...prev, mediaType: "None" }));
      setImageFile(null);
      setVideoFile(null);
      setCarouselItems([]);
      setActiveCarouselIndex(0);
    }
  }, [form.category]);

  // Extract placeholders from format and initialize variable values
  useEffect(() => {
    const regex = /\{\{(\d+)\}\}/g;
    const matches = [...form.format.matchAll(regex)];
    const placeholders = [...new Set(matches.map(m => m[1]))];
    setVariableValues(prev => {
      const newValues = { ...prev };
      placeholders.forEach(ph => {
        if (!(ph in newValues)) {
          newValues[ph] = { type: "manual", value: "" };
        }
      });
      Object.keys(newValues).forEach(key => {
        if (!placeholders.includes(key)) delete newValues[key];
      });
      return newValues;
    });
  }, [form.format]);

  const formattedPreview = useMemo(() => {
    let text = form.format || "Your template message will appear here...";
    Object.entries(variableValues).forEach(([key, config]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      let displayVal;
      if (config.type === "name")   displayVal = `[Contact Name]`;
      else if (config.type === "number") displayVal = `[Phone Number]`;
      else displayVal = config.value || `{{${key}}}`;
      text = text.replace(regex, displayVal);
    });
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    text = text.replace(/\*([^*]+)\*/g, "<b>$1</b>");
    text = text.replace(/_([^_]+)_/g, "<i>$1</i>");
    text = text.replace(/~([^~]+)~/g, "<s>$1</s>");
    text = text.replace(/\n/g, "<br/>");
    return text;
  }, [form.format, variableValues]);

  const parsedDropdowns = useMemo(() => {
    return dropdownButtons.map((item) => ({
      ...item,
      parsedOptions: (item.options || "")
        .split(",")
        .map((opt) => opt.trim())
        .filter(Boolean),
    }));
  }, [dropdownButtons]);

  const counts = {
    quickReplies: quickReplies.length,
    url: ctaButtons.filter((b) => b.type === "URL").length,
    phone: ctaButtons.filter((b) => b.type === "Phone Number").length,
    copyCode: copyCodeButtons.length,
    dropdown: dropdownButtons.length,
    input: inputFields.length,
  };

  const showCTA = form.actionType === "callToActions" || form.actionType === "all";
  const showQuickReplies = form.actionType === "quickReplies" || form.actionType === "all";

  const visiblePreviewButtons = useMemo(() => {
    if (form.actionType === "none") return [];

    let items = [];

    if (showCTA) {
      items = [
        ...items,
        ...ctaButtons.filter((item) => item.title.trim()),
        ...copyCodeButtons
          .filter((item) => item.title.trim())
          .map((item) => ({ ...item, type: "Copy Code" })),
      ];
    }

    if (showQuickReplies) {
      items = [
        ...items,
        ...quickReplies
          .filter((item) => item.title.trim())
          .map((item) => ({ ...item, type: "Quick Reply" })),
      ];
    }

    return items;
  }, [form.actionType, showCTA, showQuickReplies, ctaButtons, copyCodeButtons, quickReplies]);

  useEffect(() => {
    if (activeCarouselIndex >= carouselItems.length && carouselItems.length > 0) {
      setActiveCarouselIndex(0);
    }
    if (carouselItems.length === 0) {
      setActiveCarouselIndex(0);
    }
  }, [carouselItems, activeCarouselIndex]);

  const addQuickReply = () => {
    if (quickReplies.length >= 10) return;
    setQuickReplies((prev) => [...prev, { id: makeId(), title: "" }]);
  };

  const addURL = () => {
    if (counts.url >= 2) return;
    setCtaButtons((prev) => [
      ...prev,
      { id: makeId(), type: "URL", title: "", value: "" },
    ]);
  };

  const addPhone = () => {
    if (counts.phone >= 1) return;
    setCtaButtons((prev) => [
      ...prev,
      { id: makeId(), type: "Phone Number", title: "", value: "" },
    ]);
  };

  const addCopyCode = () => {
    if (counts.copyCode >= 1) return;
    setCopyCodeButtons((prev) => [...prev, { id: makeId(), title: "" }]);
  };

  const addDropdown = () => {
    if (counts.dropdown >= 3) return;
    setDropdownButtons((prev) => [
      ...prev,
      {
        id: makeId(),
        title: "",
        placeholder: "",
        options: "",
        selected: "",
      },
    ]);
  };

  const addInputField = () => {
    if (counts.input >= 3) return;
    setInputFields((prev) => [
      ...prev,
      {
        id: makeId(),
        label: "",
        placeholder: "",
        value: "",
      },
    ]);
  };

  const addCarouselCard = () => {
    if (carouselItems.length >= 10) return;
    setCarouselItems((prev) => [
      ...prev,
      {
        id: makeId(),
        title: "",
        description: "",
        button: "",
        mediaUrl: "",
        mediaType: "image",
      },
    ]);
  };

  const updateCTA = (id, key, value) => {
    setCtaButtons((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const removeCTA = (id) => {
    setCtaButtons((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuickReply = (id, value) => {
    setQuickReplies((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: value } : item))
    );
  };

  const removeQuickReply = (id) => {
    setQuickReplies((prev) => prev.filter((item) => item.id !== id));
  };

  const updateCopyCode = (id, value) => {
    setCopyCodeButtons((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: value } : item))
    );
  };

  const removeCopyCode = (id) => {
    setCopyCodeButtons((prev) => prev.filter((item) => item.id !== id));
  };

  const updateDropdown = (id, key, value) => {
    setDropdownButtons((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const removeDropdown = (id) => {
    setDropdownButtons((prev) => prev.filter((item) => item.id !== id));
  };

  const updateInputField = (id, key, value) => {
    setInputFields((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const removeInputField = (id) => {
    setInputFields((prev) => prev.filter((item) => item.id !== id));
  };

  const updateCarouselItem = (id, key, value) => {
    setCarouselItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const removeCarouselItem = (id) => {
    setCarouselItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageFile({
        name: file.name,
        type: file.type,
        url: reader.result,
        file: file,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoFile({
        name: file.name,
        type: file.type,
        url: reader.result,
        file: file,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCarouselMediaUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCarouselItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                mediaUrl: reader.result,
                mediaType: file.type.startsWith("video/") ? "video" : "image",
                mediaFile: file,
              }
            : item
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    if (!form.category) return "Please select template category.";
    if (!form.language) return "Please select template language.";
    if (!form.name.trim()) return "Please enter template name.";
    if (!/^[a-z0-9_]+$/.test(form.name.trim())) {
      return "Template name must contain only lowercase letters, numbers, and underscores.";
    }
    if (!form.type) return "Please select template type.";
    if (!form.format.trim()) return "Please enter template format.";

    if (form.category !== "Marketing" && form.mediaType !== "None") {
      return "Media is allowed only for marketing templates.";
    }

    if (form.category === "Marketing" && form.mediaType === "Image" && !imageFile?.url) {
      return "Please upload an image.";
    }

    if (form.category === "Marketing" && form.mediaType === "Video" && !videoFile?.url) {
      return "Please upload a video.";
    }

    if (form.category === "Marketing" && form.mediaType === "Carousel") {
      if (carouselItems.length === 0) return "Please add at least one carousel card.";
      for (const item of carouselItems) {
        if (!item.title.trim()) return "Please fill carousel card title.";
        if (!item.description.trim()) return "Please fill carousel card description.";
        if (!item.mediaUrl) return "Please upload media for each carousel card.";
      }
    }

    for (const item of ctaButtons) {
      if (!item.title.trim()) return "Please fill CTA button title.";
      if (!item.value.trim()) return "Please fill CTA button value.";
    }

    for (const item of quickReplies) {
      if (!item.title.trim()) return "Please fill quick reply title.";
    }

    for (const item of copyCodeButtons) {
      if (!item.title.trim()) return "Please fill copy code title.";
    }

    for (const item of dropdownButtons) {
      if (!item.title.trim()) return "Please fill dropdown title.";
      if (!item.options.trim()) return "Please add dropdown options.";
    }

    for (const item of inputFields) {
      if (!item.label.trim()) return "Please fill input field label.";
      if (!item.placeholder.trim()) return "Please fill input field placeholder.";
    }

    return "";
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      setSubmitError(error);
      setSubmitMessage("");
      setSubmittedData(null);
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("category", form.category);
      formData.append("language", form.language);
      formData.append("type", form.type);
      formData.append("format", form.format);
      formData.append("footer", form.footer);
      formData.append("actionType", form.actionType);
      formData.append("mediaType", form.mediaType);
      formData.append("createdBy", JSON.parse(localStorage.getItem("user"))?.phone || "anonymous");
      formData.append("variables", JSON.stringify(
        Object.fromEntries(
          Object.entries(variableValues).map(([k, v]) => [k, { type: v.type, value: v.value }])
        )
      ));

      if (form.mediaType === "Image" && imageFile?.file) {
        formData.append("mediaFile", imageFile.file);
      }
      if (form.mediaType === "Video" && videoFile?.file) {
        formData.append("mediaFile", videoFile.file);
      }

      if (imageFile && !imageFile.file) formData.append("imageFile", JSON.stringify(imageFile));
      if (videoFile && !videoFile.file) formData.append("videoFile", JSON.stringify(videoFile));
      formData.append("carouselItems", JSON.stringify(carouselItems));
      formData.append("ctaButtons", JSON.stringify(ctaButtons));
      formData.append("quickReplies", JSON.stringify(quickReplies));
      formData.append("copyCodeButtons", JSON.stringify(copyCodeButtons));
      formData.append("dropdownButtons", JSON.stringify(dropdownButtons));
      formData.append("inputFields", JSON.stringify(inputFields));

      // ✅ API call with multipart form data (axios will set correct headers)
      const res = await API.post("/templates", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const result = res.data;
      setSubmittedData(result.template);
setSubmitError("");
setSubmitMessage(
  result.pendingApproval
    ? "⏳ Template submitted for admin approval! You'll be notified once approved."
    : "✅ Template created successfully."
);

      setTimeout(() => {
        router.push("/Template");
      }, 700);
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.error || err.message || "Something went wrong while saving the template.");
      setSubmitMessage("");
      setSubmittedData(null);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
      category: "",
      language: "",
      name: "",
      type: "",
      format: "Hello {{1}}, your code will expire in {{2}} mins.",
      footer: "",
      actionType: "all",
      mediaType: "None",
    });
    setVariableValues({});
    setCtaButtons([]);
    setQuickReplies([]);
    setCopyCodeButtons([]);
    setDropdownButtons([]);
    setInputFields([]);
    setImageFile(null);
    setVideoFile(null);
    setCarouselItems([]);
    setActiveCarouselIndex(0);
    setSubmitError("");
    setSubmitMessage("");
    setSubmittedData(null);
  };

  const currentCarouselItem =
    carouselItems.length > 0 ? carouselItems[activeCarouselIndex] : null;

  // Helper to update variable value
  const updateVariable = (key, field, val) => {
    setVariableValues(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: val }
    }));
  };

  return (
    <div
      className="add-template-page"
      style={{
        minHeight: "100vh",
        padding: "20px",
        background: "var(--app-bg)",
        color: "var(--app-text)",
      }}
    >
      <div className="container-fluid" style={{ maxWidth: "1450px" }}>
        <div className="row g-4">
          <div className="col-12 col-xl-7">
            <div className="d-flex flex-column gap-3">
              {/* Header section – unchanged */}
              <div className="d-flex align-items-start gap-3 mb-1">
                <div
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    boxShadow: "0 14px 30px rgba(15, 118, 110, 0.22)",
                    flexShrink: 0,
                  }}
                >
                  <LayoutTemplate size={22} />
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: colors.text, letterSpacing: "-0.4px" }}>New Template</h1>
                    <span style={{ background: "rgba(15,118,110,0.08)", color: colors.primary, fontSize: "10px", fontWeight: 800, padding: "6px 10px", borderRadius: "999px" }}>Template</span>
                  </div>
                  <p style={{ margin: "6px 0 0", color: colors.textSoft, fontSize: "13px" }}>Create template with working actions and live preview.</p>
                </div>
              </div>

              {/* Basic Info section */}
              <div style={sectionStyle}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <Label icon={<ListChecks size={14} />} title="Template Category" />
                    <select className="form-select" style={fieldStyle} value={form.category} onChange={(e) => handleChange("category", e.target.value)} onFocus={inputFocus} onBlur={inputBlur}>
                      <option value="">Select message category</option>
                      {categoryOptions.map((item) => (<option key={item} value={item}>{item}</option>))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <Label icon={<Globe size={14} />} title="Template Language" />
                    <select className="form-select" style={fieldStyle} value={form.language} onChange={(e) => handleChange("language", e.target.value)} onFocus={inputFocus} onBlur={inputBlur}>
                      <option value="">Select message language</option>
                      {languageOptions.map((item) => (<option key={item} value={item}>{item}</option>))}
                    </select>
                  </div>
                  <div className="col-12">
                    <Label icon={<LayoutTemplate size={14} />} title="Template Name" />
                    <input type="text" className="form-control" style={fieldStyle} placeholder="Enter template name" value={form.name} onChange={(e) => handleChange("name", e.target.value.toLowerCase().replace(/\s+/g, "_"))} onFocus={inputFocus} onBlur={inputBlur} />
                    <p style={{ margin: "8px 0 0", fontSize: "11px", color: colors.textSoft }}>Only lowercase letters, numbers and underscores are allowed.</p>
                  </div>
                  <div className={form.category === "Marketing" ? "col-12 col-md-6" : "col-12"}>
                    <Label icon={<FileText size={14} />} title="Template Type" />
                    <select className="form-select" style={fieldStyle} value={form.type} onChange={(e) => handleChange("type", e.target.value)} onFocus={inputFocus} onBlur={inputBlur}>
                      <option value="">Select message type</option>
                      {typeOptions.map((item) => (<option key={item} value={item}>{item}</option>))}
                    </select>
                  </div>
                  {form.category === "Marketing" && (
                    <div className="col-12 col-md-6">
                      <Label icon={<Layers3 size={14} />} title="Media Type" />
                      <select className="form-select" style={fieldStyle} value={form.mediaType} onChange={(e) => handleChange("mediaType", e.target.value)} onFocus={inputFocus} onBlur={inputBlur}>
                        {mediaTypeOptions.map((item) => (<option key={item} value={item}>{item}</option>))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Media Upload (Marketing only) */}
              {form.category === "Marketing" && form.mediaType !== "None" && (
                <div style={sectionStyle}>
                  <Label icon={<Upload size={14} />} title="Media Upload" />
                  <div style={infoBoxStyle}>
                    {form.mediaType === "Image" && "Upload one image for this marketing template."}
                    {form.mediaType === "Video" && "Upload one video for this marketing template."}
                    {form.mediaType === "Carousel" && "Add carousel cards. Each card should have media, title and description."}
                  </div>
                  {form.mediaType === "Image" && (
                    <div className="mt-3">
                      <label className="uploadBox"><input type="file" accept="image/*" onChange={handleImageUpload} hidden /><ImageIcon size={18} /><span>{imageFile?.name || "Upload Image"}</span></label>
                    </div>
                  )}
                  {form.mediaType === "Video" && (
                    <div className="mt-3">
                      <label className="uploadBox"><input type="file" accept="video/*" onChange={handleVideoUpload} hidden /><Video size={18} /><span>{videoFile?.name || "Upload Video"}</span></label>
                    </div>
                  )}
                  {form.mediaType === "Carousel" && (
                    <div className="mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <strong style={{ fontSize: "13px", color: colors.text }}>Carousel Cards</strong>
                        <button type="button" className="btn" onClick={addCarouselCard} style={{ minHeight: "38px", borderRadius: "12px", border: "1px solid #d6dde5", background: "#fff", color: "#334155", padding: "0 12px", display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "11px" }}><Plus size={14} /> Add Card</button>
                      </div>
                      {carouselItems.length === 0 && <div style={infoBoxStyle}>No carousel cards added yet.</div>}
                      {carouselItems.map((item, index) => (
                        <div key={item.id} style={actionBoxStyle} className="mb-3">
                          <div className="row g-2 align-items-start">
                            <div className="col-12 col-md-3"><div className="actionTitle">Card {index + 1} Title</div><input type="text" className="form-control" style={fieldStyle} placeholder="Card title" value={item.title} onChange={(e) => updateCarouselItem(item.id, "title", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                            <div className="col-12 col-md-4"><div className="actionTitle">Description</div><input type="text" className="form-control" style={fieldStyle} placeholder="Card description" value={item.description} onChange={(e) => updateCarouselItem(item.id, "description", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                            <div className="col-12 col-md-3"><div className="actionTitle">Button Title</div><input type="text" className="form-control" style={fieldStyle} placeholder="Shop Now" value={item.button} onChange={(e) => updateCarouselItem(item.id, "button", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                            <div className="col-12 col-md-1 d-flex justify-content-md-center"><button type="button" onClick={() => removeCarouselItem(item.id)} style={removeBtnStyle}><X size={16} /></button></div>
                            <div className="col-12"><div className="actionTitle">Upload Image / Video</div><label className="uploadBox"><input type="file" accept="image/*,video/*" onChange={(e) => handleCarouselMediaUpload(item.id, e)} hidden />{item.mediaType === "video" ? <Video size={18} /> : <ImageIcon size={18} />}<span>{item.mediaUrl ? "Media Uploaded" : "Upload Media"}</span></label></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Template Format */}
              <div style={sectionStyle}>
                <Label icon={<MessageSquareText size={14} />} title="Template Format" />
                <div style={infoBoxStyle}>
                  <div>Use text formatting - <b>*bold*</b>, <i>_italic_</i> and <s>~strikethrough~</s></div>
                  <div>Your message content. Up to 1024 characters allowed.</div>
                  <div>Example: Hello {"{{1}}"}, your code will expire in {"{{2}}"} mins.</div>
                </div>
                <div className="mt-3">
                  <textarea rows={5} className="form-control" style={textareaStyle} placeholder="Enter your message here..." value={form.format} onChange={(e) => handleChange("format", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} maxLength={1024} />
                  <div style={{ fontSize: "10px", color: colors.textSoft, textAlign: "right", marginTop: "4px" }}>{form.format.length}/1024</div>
                </div>
                <div className="mt-3">
                  <Label icon={<FileText size={14} />} title="Template Footer (Optional)" />
                  <input type="text" className="form-control" style={fieldStyle} placeholder="Enter footer text" value={form.footer} onChange={(e) => handleChange("footer", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>

              {/* Variable Values Section */}
              {Object.keys(variableValues).length > 0 && (
                <div style={sectionStyle}>
                  <Label icon={<Hash size={14} />} title="Variable Values (for preview)" />
                  <div style={infoBoxStyle}>
                    Choose how each variable is resolved — use the contact&apos;s registered <b>Name</b>, their <b>Phone Number</b>, or enter a <b>Manual</b> value for preview.
                  </div>

                  <div className="d-flex flex-column gap-3 mt-3">
                    {Object.entries(variableValues).map(([key, config]) => (
                      <div
                        key={key}
                        style={{
                          background: "var(--app-surface-2)",
                          border: "1px solid var(--app-border)",
                          borderRadius: "14px",
                          padding: "14px",
                        }}
                      >
                        <div style={{
                          fontSize: "12px", fontWeight: 800, color: colors.text,
                          marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px"
                        }}>
                          <span style={{
                            background: "rgba(15,118,110,0.1)", color: colors.primary,
                            borderRadius: "8px", padding: "3px 9px", fontSize: "11px", fontFamily: "monospace"
                          }}>
                            {`{{${key}}}`}
                          </span>
                          <span style={{ color: colors.textSoft, fontWeight: 600 }}>Variable {key}</span>
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textSoft, marginBottom: "8px" }}>
                            Resolve as
                          </div>
                          <div className="d-flex gap-2 flex-wrap">
                            {[
                              { value: "name",   label: "Contact Name",   icon: "👤" },
                              { value: "number", label: "Phone Number",    icon: "📞" },
                              { value: "manual", label: "Manual Value",    icon: "✏️" },
                            ].map(opt => (
                              <label
                                key={opt.value}
                                style={{
                                  minHeight: "38px",
                                  padding: "0 13px",
                                  borderRadius: "10px",
                                  border: config.type === opt.value
                                    ? `1px solid ${colors.primary}`
                                    : "1px solid var(--app-border)",
                                  background: config.type === opt.value
                                    ? "rgba(15,118,110,0.08)"
                                    : "var(--app-surface)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "7px",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: config.type === opt.value ? colors.primary : "var(--app-text)",
                                  transition: "all 0.18s ease",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`var_type_${key}`}
                                  checked={config.type === opt.value}
                                  onChange={() => updateVariable(key, "type", opt.value)}
                                  style={{ accentColor: colors.primary, cursor: "pointer" }}
                                />
                                <span>{opt.icon}</span>
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {config.type === "name" && (
                          <div style={{
                            height: "42px", borderRadius: "12px",
                            border: "1px dashed #b9c7d6", background: "#f0fdf4",
                            display: "flex", alignItems: "center", paddingLeft: "12px",
                            fontSize: "12px", fontWeight: 700, color: "#15803d", gap: "8px"
                          }}>
                            <span>👤</span>
                            <span>Will be replaced with contact&apos;s registered name</span>
                          </div>
                        )}
                        {config.type === "number" && (
                          <div style={{
                            height: "42px", borderRadius: "12px",
                            border: "1px dashed #b9c7d6", background: "#eff6ff",
                            display: "flex", alignItems: "center", paddingLeft: "12px",
                            fontSize: "12px", fontWeight: 700, color: "#1d4ed8", gap: "8px"
                          }}>
                            <span>📞</span>
                            <span>Will be replaced with contact&apos;s phone number</span>
                          </div>
                        )}
                        {config.type === "manual" && (
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textSoft, marginBottom: "6px" }}>
                              Preview value
                            </div>
                            <input
                              type="text"
                              className="form-control"
                              style={fieldStyle}
                              placeholder={`Enter a value to preview {{${key}}}`}
                              value={config.value}
                              onChange={(e) => updateVariable(key, "value", e.target.value)}
                              onFocus={inputFocus}
                              onBlur={inputBlur}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Actions */}
              <div style={sectionStyle}>
                <Label icon={<MousePointerClick size={14} />} title="Interactive Actions" />
                <div style={infoBoxStyle}>
                  <div>Add working CTA buttons, quick replies, dropdowns and inputs.</div>
                  <div>Button title and quick reply title max length is 25 characters.</div>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <RadioCard label="None" checked={form.actionType === "none"} onChange={() => handleChange("actionType", "none")} />
                  <RadioCard label="Call to Actions" checked={form.actionType === "callToActions"} onChange={() => handleChange("actionType", "callToActions")} />
                  <RadioCard label="Quick Replies" checked={form.actionType === "quickReplies"} onChange={() => handleChange("actionType", "quickReplies")} />
                  <RadioCard label="All" checked={form.actionType === "all"} onChange={() => handleChange("actionType", "all")} />
                </div>

                {form.actionType !== "none" && (
                  <div className="d-flex flex-wrap gap-2 mt-4 mb-3">
                    {(form.actionType === "quickReplies" || form.actionType === "all") && (
                      <ActionChip label="Quick Replies" count={counts.quickReplies} icon={<Plus size={14} />} onClick={addQuickReply} disabled={counts.quickReplies >= 10} />
                    )}
                    {(form.actionType === "callToActions" || form.actionType === "all") && (
                      <>
                        <ActionChip label="URL" count={counts.url} icon={<Plus size={14} />} onClick={addURL} disabled={counts.url >= 2} />
                        <ActionChip label="Phone Number" count={counts.phone} icon={<Plus size={14} />} onClick={addPhone} disabled={counts.phone >= 1} />
                        <ActionChip label="Copy Code" count={counts.copyCode} icon={<Plus size={14} />} onClick={addCopyCode} disabled={counts.copyCode >= 1} />
                        <ActionChip label="Dropdown" count={counts.dropdown} icon={<Plus size={14} />} onClick={addDropdown} disabled={counts.dropdown >= 3} />
                        <ActionChip label="Input Field" count={counts.input} icon={<Plus size={14} />} onClick={addInputField} disabled={counts.input >= 3} />
                      </>
                    )}
                  </div>
                )}

                {/* CTA Buttons (URL / Phone) */}
                {showCTA && ctaButtons.map((btn, index) => (
                  <div key={btn.id} style={actionBoxStyle} className="mb-3">
                    <div className="row g-2 align-items-start">
                      <div className="col-12 col-md-3"><div className="actionTitle">CTA {index + 1}</div><select className="form-select" style={fieldStyle} value={btn.type} onChange={(e) => updateCTA(btn.id, "type", e.target.value)} onFocus={inputFocus} onBlur={inputBlur}><option value="URL">URL</option><option value="Phone Number">Phone Number</option></select></div>
                      <div className="col-12 col-md-4"><div className="actionTitle">Button Title</div><input type="text" className="form-control" style={fieldStyle} placeholder="Button title" maxLength={25} value={btn.title} onChange={(e) => updateCTA(btn.id, "title", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /><div className="smallCount">{btn.title.length}/25</div></div>
                      {btn.type === "Phone Number" && <div className="col-12 col-md-2"><div className="actionTitle">Code</div><input type="text" className="form-control" style={fieldStyle} value="+91" readOnly /></div>}
                      <div className={`col-12 ${btn.type === "Phone Number" ? "col-md-2" : "col-md-4"}`}><div className="actionTitle">{btn.type === "URL" ? "URL Value" : "Phone Number"}</div><input type="text" className="form-control" style={fieldStyle} placeholder={btn.type === "URL" ? "https://example.com" : "9876543210"} value={btn.value} onChange={(e) => updateCTA(btn.id, "value", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                      <div className="col-12 col-md-1 d-flex justify-content-md-center"><button type="button" onClick={() => removeCTA(btn.id)} style={removeBtnStyle}><X size={16} /></button></div>
                    </div>
                  </div>
                ))}

                {/* Quick Replies */}
                {showQuickReplies && quickReplies.map((item, index) => (
                  <div key={item.id} style={actionBoxStyle} className="mb-3">
                    <div className="row g-2 align-items-start">
                      <div className="col-12 col-md-3"><div className="actionTitle">Quick Reply {index + 1}</div></div>
                      <div className="col-12 col-md-8"><input type="text" className="form-control" style={fieldStyle} placeholder="Quick reply title" maxLength={25} value={item.title} onChange={(e) => updateQuickReply(item.id, e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /><div className="smallCount">{item.title.length}/25</div></div>
                      <div className="col-12 col-md-1 d-flex justify-content-md-center"><button type="button" onClick={() => removeQuickReply(item.id)} style={removeBtnStyle}><X size={16} /></button></div>
                    </div>
                  </div>
                ))}

                {/* Copy Code Buttons */}
                {showCTA && copyCodeButtons.map((item, index) => (
                  <div key={item.id} style={actionBoxStyle} className="mb-3">
                    <div className="row g-2 align-items-start">
                      <div className="col-12 col-md-3"><div className="actionTitle">Copy Code {index + 1}</div></div>
                      <div className="col-12 col-md-8"><input type="text" className="form-control" style={fieldStyle} placeholder="Button title" maxLength={25} value={item.title} onChange={(e) => updateCopyCode(item.id, e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /><div className="smallCount">{item.title.length}/25</div></div>
                      <div className="col-12 col-md-1 d-flex justify-content-md-center"><button type="button" onClick={() => removeCopyCode(item.id)} style={removeBtnStyle}><X size={16} /></button></div>
                    </div>
                  </div>
                ))}

                {/* Dropdowns */}
                {showCTA && dropdownButtons.map((item, index) => (
                  <div key={item.id} style={actionBoxStyle} className="mb-3">
                    <div className="row g-2 align-items-start">
                      <div className="col-12 col-md-3"><div className="actionTitle">Dropdown {index + 1}</div><input type="text" className="form-control" style={fieldStyle} placeholder="Dropdown title" maxLength={25} value={item.title} onChange={(e) => updateDropdown(item.id, "title", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                      <div className="col-12 col-md-4"><div className="actionTitle">Placeholder</div><input type="text" className="form-control" style={fieldStyle} placeholder="Select option" value={item.placeholder} onChange={(e) => updateDropdown(item.id, "placeholder", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                      <div className="col-12 col-md-4"><div className="actionTitle">Options</div><input type="text" className="form-control" style={fieldStyle} placeholder="Option 1, Option 2, Option 3" value={item.options} onChange={(e) => updateDropdown(item.id, "options", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                      <div className="col-12 col-md-1 d-flex justify-content-md-center"><button type="button" onClick={() => removeDropdown(item.id)} style={removeBtnStyle}><X size={16} /></button></div>
                    </div>
                  </div>
                ))}

                {/* Input Fields */}
                {showCTA && inputFields.map((item, index) => (
                  <div key={item.id} style={actionBoxStyle} className="mb-3">
                    <div className="row g-2 align-items-start">
                      <div className="col-12 col-md-3"><div className="actionTitle">Input Field {index + 1}</div><input type="text" className="form-control" style={fieldStyle} placeholder="Input label" maxLength={25} value={item.label} onChange={(e) => updateInputField(item.id, "label", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                      <div className="col-12 col-md-4"><div className="actionTitle">Placeholder</div><input type="text" className="form-control" style={fieldStyle} placeholder="Enter value" value={item.placeholder} onChange={(e) => updateInputField(item.id, "placeholder", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                      <div className="col-12 col-md-4"><div className="actionTitle">Preview Value</div><input type="text" className="form-control" style={fieldStyle} placeholder="Type here" value={item.value} onChange={(e) => updateInputField(item.id, "value", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} /></div>
                      <div className="col-12 col-md-1 d-flex justify-content-md-center"><button type="button" onClick={() => removeInputField(item.id)} style={removeBtnStyle}><X size={16} /></button></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit status */}
              {(submitError || submitMessage) && (
                <div style={{ borderRadius: "14px", padding: "12px 14px", border: submitError ? "1px solid #fecaca" : "1px solid #bbf7d0", background: submitError ? "#fef2f2" : "#f0fdf4", color: submitError ? "#b91c1c" : "#166534", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", fontWeight: 700 }}>
                  {submitError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                  <span>{submitError || submitMessage}</span>
                </div>
              )}

              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={handleSubmit} disabled={saving} style={{ border: "none", background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)", color: "#fff", minHeight: "46px", borderRadius: "14px", padding: "0 20px", fontWeight: 800, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 12px 24px rgba(15, 118, 110, 0.18)", opacity: saving ? 0.8 : 1 }}><Send size={15} />{saving ? "Saving..." : "Submit Template"}</button>
                <button type="button" className="btn" onClick={handleReset} disabled={saving} style={{ minHeight: "46px", borderRadius: "14px", padding: "0 18px", fontWeight: 700, fontSize: "13px", border: "1px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)" }}>Reset</button>
              </div>

              {submittedData && (
                <div style={sectionStyle}>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: colors.text, marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}><Sparkles size={15} /> Submitted Data</div>
                  <pre style={{ margin: 0, fontSize: "11px", color: "var(--app-text)", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "var(--app-surface-2)", border: "1px solid var(--app-border)", borderRadius: "12px", padding: "12px", maxHeight: "320px", overflow: "auto" }}>{JSON.stringify(submittedData, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN – STICKY PREVIEW */}
          <div className="col-12 col-xl-5">
            <div style={{ position: "relative", height: "100%" }}>
              <div className="stickyPreview">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div><h4 style={{ margin: 0, fontWeight: 800, color: colors.text, fontSize: "17px" }}>Template Preview</h4><p style={{ margin: "5px 0 0", color: colors.textSoft, fontSize: "11px" }}>Live preview of your message and actions.</p></div>
                    <div style={{ padding: "7px 12px", borderRadius: "999px", background: "rgba(34, 197, 94, 0.12)", color: "#15803d", fontSize: "11px", fontWeight: 800 }}>WhatsApp</div>
                  </div>

                  <div style={{ background: "#d9fdd3", borderRadius: "22px", overflow: "hidden", border: "1px solid #dbe3ea", minHeight: "330px", maxHeight: "700px", display: "flex", flexDirection: "column" }}>
                    <div style={{ background: "#167c74", color: "#fff", padding: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "16px" }}>W</div>
                      <div><div style={{ fontWeight: 800, fontSize: "14px" }}>Template Message</div><div style={{ fontSize: "11px", opacity: 0.9 }}>Business Account</div></div>
                    </div>
                    <div style={{ padding: "14px", flex: 1, display: "flex", justifyContent: "flex-end", backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)", backgroundSize: "18px 18px", overflowY: "auto" }}>
                      <div style={{ width: "100%", maxWidth: "340px", background: "#ffffff", borderRadius: "16px 16px 8px 16px", padding: "14px", boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)", border: "1px solid rgba(15, 23, 42, 0.05)", alignSelf: "flex-start" }}>
                        {/* Media preview */}
                        {form.category === "Marketing" && form.mediaType === "Image" && imageFile?.url && (<div style={{ marginBottom: "10px" }}><img src={imageFile.url} alt="Template" style={{ width: "100%", height: "190px", objectFit: "cover", borderRadius: "12px" }} /></div>)}
                        {form.category === "Marketing" && form.mediaType === "Video" && videoFile?.url && (<div style={{ marginBottom: "10px" }}><video src={videoFile.url} controls style={{ width: "100%", height: "190px", objectFit: "cover", borderRadius: "12px", background: "#000" }} /></div>)}
                        {form.category === "Marketing" && form.mediaType === "Carousel" && currentCarouselItem && (
                          <div style={{ marginBottom: "12px" }}>
                            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
                              {currentCarouselItem.mediaUrl ? (currentCarouselItem.mediaType === "video" ? <video src={currentCarouselItem.mediaUrl} controls style={{ width: "100%", height: "170px", objectFit: "cover", background: "#000" }} /> : <img src={currentCarouselItem.mediaUrl} alt={currentCarouselItem.title} style={{ width: "100%", height: "170px", objectFit: "cover" }} />) : <div style={{ height: "170px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b", fontSize: "12px", fontWeight: 700 }}>No media</div>}
                              <div style={{ padding: "10px" }}><div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>{currentCarouselItem.title || "Card title"}</div><div style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>{currentCarouselItem.description || "Card description"}</div>{currentCarouselItem.button && (<button type="button" className="btn mt-2" style={previewActionBtn}>{currentCarouselItem.button}</button>)}</div>
                            </div>
                            {carouselItems.length > 1 && (<div className="d-flex align-items-center justify-content-between mt-2"><button type="button" className="btn btn-sm" onClick={() => setActiveCarouselIndex((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1))} style={navBtnStyle}>Prev</button><div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>{activeCarouselIndex + 1} / {carouselItems.length}</div><button type="button" className="btn btn-sm" onClick={() => setActiveCarouselIndex((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1))} style={navBtnStyle}>Next</button></div>)}
                          </div>
                        )}

                        <div style={{ fontSize: "10px", fontWeight: 800, color: colors.primary, marginBottom: "8px" }}>{(form.category || "Category") + " • " + (form.language || "Language")}</div>
                        <div style={{ fontSize: "13px", color: "var(--app-text)", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: formattedPreview }} />
                        {form.footer && <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e5e7eb", fontSize: "10px", color: "#6b7280" }}>{form.footer}</div>}

                        {/* Dropdowns (interactive) */}
                        {parsedDropdowns.length > 0 && (
                          <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
                            {parsedDropdowns.map((item) => (
                              <div key={item.id}>
                                <div style={{ fontSize: "10px", fontWeight: 800, color: "#475569", marginBottom: "5px" }}>{item.title || "Dropdown"}</div>
                                <div style={{ position: "relative" }}>
                                  <select className="form-select" style={{ ...fieldStyle, height: "38px", fontSize: "11px", paddingRight: "34px" }} value={item.selected || ""} onChange={(e) => updateDropdown(item.id, "selected", e.target.value)}>
                                    <option value="">{item.placeholder || "Select option"}</option>
                                    {item.parsedOptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
                                  </select>
                                  <ChevronDown size={14} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Input Fields (interactive) */}
                        {inputFields.length > 0 && (
                          <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
                            {inputFields.map((item) => (
                              <div key={item.id}>
                                <div style={{ fontSize: "10px", fontWeight: 800, color: "#475569", marginBottom: "5px" }}>{item.label || "Input Label"}</div>
                                <input type="text" className="form-control" style={{ ...fieldStyle, height: "38px", fontSize: "11px", color: colors.text }} placeholder={item.placeholder || "Enter value"} value={item.value} onChange={(e) => updateInputField(item.id, "value", e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Buttons (CTA, Quick Replies, Copy Code) */}
                        {visiblePreviewButtons.length > 0 && (
                          <div style={{ marginTop: "10px", display: "grid", gap: "6px" }}>
                            {visiblePreviewButtons.map((item, i) => (
                              <button key={i} type="button" className="btn" style={previewActionBtn}>
                                {item.type === "URL" ? <Link2 size={13} /> : item.type === "Phone Number" ? <Phone size={13} /> : item.type === "Copy Code" ? <Copy size={13} /> : <MousePointerClick size={13} />}
                                <span>{item.title}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: "8px", textAlign: "right", fontSize: "9px", color: "#6b7280" }}>12:45 PM</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3" style={{ display: "grid", gap: "7px" }}>
                    <PreviewMeta label="Name" value={form.name || "template_name"} />
                    <PreviewMeta label="Type" value={form.type || "Text"} />
                    <PreviewMeta label="Media" value={form.category === "Marketing" ? form.mediaType || "None" : "Not Allowed"} />
                    <PreviewMeta label="Action Mode" value={form.actionType === "none" ? "None" : form.actionType === "callToActions" ? "Call to Actions" : form.actionType === "quickReplies" ? "Quick Replies" : "All"} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .stickyPreview { position: sticky; top: 20px; align-self: flex-start; }
        .col-xl-5 { position: relative; overflow: visible; }
        @media (max-width: 1199px) { .stickyPreview { position: static; } }
        .actionTitle { font-size: 11px; font-weight: 700; color: var(--app-text); margin-bottom: 6px; }
        .smallCount { font-size: 10px; color: var(--app-text-muted); text-align: right; margin-top: 4px; }
        .uploadBox { min-height: 46px; border-radius: 14px; border: 1px dashed var(--app-border); background: var(--app-surface-2); color: var(--app-text); display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; font-size: 12px; font-weight: 700; padding: 12px 14px; transition: 0.2s ease; }
        .uploadBox:hover { border-color: #0f766e; background: var(--app-surface); }
        body[data-theme="dark"] .add-template-page .form-control,
        body[data-theme="dark"] .add-template-page .form-select {
          background: var(--input-bg) !important;
          color: var(--app-text) !important;
          border-color: var(--input-border) !important;
        }
        body[data-theme="dark"] .add-template-page [style*="background: rgb(246, 248, 251)"],
        body[data-theme="dark"] .add-template-page [style*="background: rgb(251, 253, 255)"],
        body[data-theme="dark"] .add-template-page [style*="background: rgb(248, 250, 252)"],
        body[data-theme="dark"] .add-template-page [style*="background: rgb(243, 244, 246)"] {
          background: var(--app-surface-2) !important;
        }
        body[data-theme="dark"] .add-template-page [style*="background: rgb(255, 255, 255)"],
        body[data-theme="dark"] .add-template-page [style*="background-color: rgb(255, 255, 255)"] {
          background: var(--app-surface) !important;
        }
      `}</style>
    </div>
  );
}

const navBtnStyle = {
  border: "1px solid var(--app-border)",
  background: "var(--app-surface)",
  borderRadius: "10px",
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--app-text)",
  padding: "5px 12px",
};

function Label({ icon, title }) {
  return (
    <label style={labelStyle}>
      <span style={iconBoxStyle}>{icon}</span>
      <span>{title}</span>
    </label>
  );
}

function RadioCard({ label, checked, onChange }) {
  return (
    <label style={{ minHeight: "42px", padding: "0 12px", borderRadius: "12px", border: checked ? "1px solid #0f766e" : "1px solid var(--app-border)", background: checked ? "rgba(15,118,110,0.08)" : "var(--app-surface)", display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "var(--app-text)" }}>
      <input type="radio" checked={checked} onChange={onChange} style={{ width: "15px", height: "15px", accentColor: "#0f766e", cursor: "pointer" }} />
      <span>{label}</span>
    </label>
  );
}

function ActionChip({ label, count, icon, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn" style={{ minHeight: "38px", borderRadius: "12px", border: "1px solid var(--app-border)", background: disabled ? "var(--app-surface-2)" : "var(--app-surface)", color: disabled ? "var(--app-text-muted)" : "var(--app-text)", padding: "0 12px", display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "11px", boxShadow: disabled ? "none" : "0 6px 14px rgba(15, 23, 42, 0.04)" }}>
      <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      <span>{label}</span>
      <span style={{ minWidth: "26px", height: "22px", borderRadius: "999px", background: "var(--app-surface-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px", fontSize: "10px", fontWeight: 800, color: "var(--app-text-muted)" }}>{count}</span>
    </button>
  );
}

function PreviewMeta({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", background: "var(--app-surface-2)", border: "1px solid var(--app-border)", padding: "9px 11px", borderRadius: "11px", fontSize: "11px" }}>
      <span style={{ color: "var(--app-text-muted)" }}>{label}:</span>
      <strong style={{ color: "var(--app-text)", fontWeight: 700 }}>{value}</strong>
    </div>
  );
}
