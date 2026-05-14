"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  ChevronRight,
  Repeat,
  Clock,
} from "lucide-react";
import API from "../../utils/api";

const steps = [
  "Campaign Name",
  "Select Template",
  "Schedule Campaign",
  "Preview & Send",
];

const extractVariables = (body = "") => {
  const regex = /{{(\d+)}}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(body)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
};

const dayOfWeekOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function LaunchCampaignPage() {
  const router = useRouter();
  const pageRef = useRef(null);
  const stepperLineRefs = useRef([]);
  const stepContentRef = useRef(null);

  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [fullTemplate, setFullTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [tags, setTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [variableMappings, setVariableMappings] = useState({});

  const [form, setForm] = useState({
    campaignName: "",
    messageType: "Pre-approved template message",
    audienceType: "tags",
    selectedTemplateId: "",
    scheduledDate: "",
    scheduledTime: "",
    manualNumbers: "",
    recurrence: {
      type: "one-time",
      interval: 1,
      dayOfWeek: 0,
      dayOfMonth: 1,
      hour: 0,
    },
  });

  // ✅ Read user + role from localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      const role = localStorage.getItem("role");
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (role) setUserRole(role);
    } catch (error) {
      console.error("Invalid user in localStorage:", error);
    }
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await API.get("/templates");
        const allTemplates = res.data.templates || [];

        // ✅ Only show templates that are approved by super_admin
        const approvedTemplates = allTemplates.filter(
          (t) => t.approvalStatus === "approved"
        );

        setTemplates(approvedTemplates);

        if (approvedTemplates.length > 0) {
          setForm((prev) => ({
            ...prev,
            selectedTemplateId: approvedTemplates[0]._id,
          }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchFullTemplate = async () => {
      if (!form.selectedTemplateId) return;
      try {
        const res = await API.get(`/templates/${form.selectedTemplateId}`);
        setFullTemplate(res.data.template);
      } catch (err) {
        console.error("Error fetching full template:", err);
      }
    };
    fetchFullTemplate();
  }, [form.selectedTemplateId]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await API.get("/tags");
        setTags(res.data.tags || []);
      } catch (error) { console.error(error); }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await API.get("/contacts");
        const data = res.data;
        setContacts(Array.isArray(data) ? data : data.contacts || []);
      } catch (err) { console.error(err); }
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await API.get("/groups");
        const data = res.data;
        setGroups(Array.isArray(data) ? data : data.groups || []);
      } catch (err) { console.error(err); }
    };
    fetchGroups();
  }, []);

  const selectedTemplate = fullTemplate;

  useEffect(() => {
    if (selectedTemplate?.format) {
      const vars = extractVariables(selectedTemplate.format);
      const initialMappings = {};
      vars.forEach((v, index) => {
        initialMappings[v] = { type: index === 0 ? "name" : "custom", customValue: "" };
      });
      setVariableMappings(initialMappings);
    } else {
      setVariableMappings({});
    }
  }, [selectedTemplate]);

  const getMappedValue = (variableKey) => {
    const mapping = variableMappings[variableKey];
    if (!mapping) return `{{${variableKey}}}`;
    if (mapping.type === "name") return currentUser?.name || currentUser?.fullName || currentUser?.username || "Customer";
    if (mapping.type === "phone") return currentUser?.phone || currentUser?.mobile || "9876543210";
    if (mapping.type === "custom") return mapping.customValue || `{{${variableKey}}}`;
    return `{{${variableKey}}}`;
  };

  const handleVariableTypeChange = (variableKey, type) => {
    setVariableMappings((prev) => ({
      ...prev,
      [variableKey]: { ...prev[variableKey], type, customValue: type === "custom" ? prev[variableKey]?.customValue || "" : "" },
    }));
  };

  const handleCustomVariableChange = (variableKey, value) => {
    setVariableMappings((prev) => ({
      ...prev,
      [variableKey]: { ...prev[variableKey], customValue: value },
    }));
  };

  const getPreviewMessage = () => {
    if (!selectedTemplate) return "";
    let message = selectedTemplate.format;
    extractVariables(selectedTemplate.format).forEach((variableKey) => {
      message = message.replace(new RegExp(`{{${variableKey}}}`, "g"), getMappedValue(variableKey));
    });
    return message;
  };

  const progressPercent = useMemo(() => ((step - 1) / (steps.length - 1)) * 100, [step]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".launch-animate", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.45, ease: "power3.out" });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    stepperLineRefs.current.forEach((line, index) => {
      if (!line) return;
      gsap.to(line, { width: index < step - 1 ? "100%" : "0%", duration: 0.6, ease: "power3.inOut" });
    });
    if (stepContentRef.current) {
      gsap.fromTo(stepContentRef.current, { opacity: 0, y: 18, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" });
    }
  }, [step]);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleRecurrenceChange = (field, value) => setForm((prev) => ({ ...prev, recurrence: { ...prev.recurrence, [field]: value } }));

  const toggleTagSelection = (tagId) => {
  const strId = String(tagId);
  setSelectedTagIds((prev) =>
    prev.includes(strId) ? prev.filter((id) => id !== strId) : [...prev, strId]
  );
};
 const toggleContactSelection = (id) => {
  const strId = String(id);
  setSelectedContactIds((prev) =>
    prev.includes(strId) ? prev.filter((i) => i !== strId) : [...prev, strId]
  );
};
  const toggleGroupSelection = (id) => {
  const strId = String(id);
  setSelectedGroupIds((prev) =>
    prev.includes(strId)
      ? prev.filter((i) => i !== strId)
      : [...prev, strId]
  );
};

  const handleNext = async () => {
    if (processing) return;

    if (step < steps.length) {
      setProcessing(true);
      gsap.to(stepContentRef.current, {
        opacity: 0.4, y: 8, duration: 0.18,
        onComplete: () => { setStep((prev) => prev + 1); setProcessing(false); },
      });
      return;
    }

    // ── STEP 4: Submit ──
    setProcessing(true);

    const payload = {
      campaignName: form.campaignName,
      messageType: form.messageType,
      audienceType: form.audienceType,
      tagIds: form.audienceType === "tags" ? selectedTagIds : [],
      contactIds: form.audienceType === "contact" ? selectedContactIds : [],
      groupIds: form.audienceType === "group" ? selectedGroupIds : [],
      manualNumbers: form.audienceType === "manual"
        ? form.manualNumbers.split(",").map((n) => n.trim()).filter(Boolean)
        : [],
      templateId: form.selectedTemplateId,
      recurrence: form.recurrence,
      scheduledDateTime: (form.scheduledDate && form.scheduledTime)
  ? `${form.scheduledDate}T${form.scheduledTime}:00+05:30`
  : null,
      variableValues: Object.fromEntries(
        Object.entries(variableMappings).map(([key, mapping]) => [
          key,
          { type: mapping.type, value: mapping.customValue || "" },
        ])
      ),
      messagePreview: getPreviewMessage(),
    };

    try {
      const res = await API.post("/campaigns", payload);
      const data = res.data;

      // ✅ Manager → show pending approval message, don't shoot yet
      if (data.pendingApproval) {
        alert("⏳ Campaign submitted for admin approval!\n\nYour campaign will be scheduled only after the super admin approves it.");
      } else {
        alert("✅ Campaign scheduled successfully!");
      }

      router.push("/Campaigns");
    } catch (error) {
      console.error(error);
      alert("Error scheduling campaign: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => {
    if (processing) return;
    if (step === 1) { router.push("/Campaigns"); return; }
    setStep((prev) => prev - 1);
  };

  const isManager = userRole === "manager";

  return (
    <>
      <style jsx global>{`
        html, body { height: 100%; overflow: hidden; background: #f4f7fb; }
        .launch-shell {
          position: fixed; top: 70px; left: 88px; right: 0; bottom: 0; overflow: hidden;
          background: radial-gradient(circle at top left, rgba(15,95,100,0.06), transparent 24%),
                      radial-gradient(circle at top right, rgba(34,197,94,0.05), transparent 20%),
                      linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .scroll-hidden { overflow-y: auto; overflow-x: hidden; height: 100%; -ms-overflow-style: none; scrollbar-width: none; }
        .scroll-hidden::-webkit-scrollbar { display: none; }
        .premium-card { background: rgba(255,255,255,0.96); border: 1px solid rgba(15,23,42,0.05); box-shadow: 0 16px 40px rgba(15,23,42,0.08); border-radius: 24px; }
        .stepper-wrap { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-radius: 20px; border: 1px solid #eaf0f6; padding: 16px 16px 12px; margin-bottom: 24px; }
        .stepper-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 0; overflow-x: auto; scrollbar-width: none; }
        .stepper-row::-webkit-scrollbar { display: none; }
        .step-item { display: flex; align-items: flex-start; flex: 1; min-width: 130px; }
        .step-node-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
        .step-node { width: 40px; height: 40px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; border: 1px solid #dbe3eb; background: #f8fafc; color: #64748b; transition: all 0.25s ease; z-index: 2; }
        .step-node.active { color: #fff; border-color: transparent; background: linear-gradient(135deg, #0f5f64 0%, #14808a 60%, #22c55e 100%); box-shadow: 0 12px 22px rgba(15,95,100,0.22); }
        .step-node.done { color: #fff; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); box-shadow: 0 10px 20px rgba(34,197,94,0.18); }
        .step-label { margin-top: 8px; font-size: 11px; font-weight: 600; color: #64748b; text-align: center; line-height: 1.3; max-width: 104px; }
        .step-line { position: relative; flex: 1; height: 5px; border-radius: 999px; background: #e5e7eb; margin: 18px 10px 0; overflow: hidden; }
        .step-line-fill { width: 0%; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #0f5f64 0%, #14808a 55%, #22c55e 100%); position: relative; }
        .section-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .section-subtitle { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 0; }
        .form-label { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
        .input-premium, .select-premium { border-radius: 12px !important; border: 1px solid #dbe3eb !important; background: #ffffff !important; transition: all 0.25s ease; font-size: 13px !important; font-weight: 500; color: #0f172a !important; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
        .input-premium:focus, .select-premium:focus { border-color: #14808a !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(20,128,138,0.1) !important; }
        .input-premium { height: 42px; padding: 8px 14px; }
        .select-premium { height: 42px; padding: 8px 14px; }
        .soft-panel { border-radius: 18px; border: 1px solid #e5e7eb; background: linear-gradient(180deg, #fbfdff 0%, #f8fafc 100%); }
        .btn-back-premium { height: 42px; padding: 0 16px; border-radius: 999px; border: 1px solid #dbe3eb; background: #fff; color: #0f172a; font-size: 13px; font-weight: 700; }
        .btn-next-premium { min-width: 150px; height: 44px; padding: 0 20px; border-radius: 999px; border: none; color: #fff; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #0f5f64 0%, #14808a 60%, #22c55e 100%); box-shadow: 0 14px 28px rgba(15,95,100,0.22); transition: all 0.25s ease; }
        .btn-next-premium:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 18px 32px rgba(15,95,100,0.26); }
        .btn-next-premium:disabled { opacity: 0.55; cursor: not-allowed; }
        .template-card { border-radius: 14px; border: 1px solid #e2e8f0; background: #fff; transition: all 0.25s ease; cursor: pointer; }
        .template-card:hover { transform: translateY(-2px); box-shadow: 0 10px 18px rgba(15,23,42,0.08); }
        .template-card.selected { border-color: #14808a; background: #f0fdfa; box-shadow: 0 10px 20px rgba(20,128,138,0.1); }
        .tag-checkbox { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 999px; cursor: pointer; transition: all 0.2s; font-size: 12px; font-weight: 600; background: #fff; color: #334155; }
        .tag-checkbox.selected { background: linear-gradient(135deg, #0f766e 0%, #14808a 100%); color: white; border-color: #0f766e; }
        .contact-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: #fff; }
        .contact-row.selected { background: linear-gradient(135deg, #0f766e 0%, #14808a 100%); border-color: #0f766e; }
        .contact-row.selected span { color: white !important; }
        .message-preview { border-radius: 16px; background: #fff; border: 1px solid #edf2f2; line-height: 1.8; white-space: pre-wrap; font-size: 13px; color: #334155; min-height: 150px; }
        .summary-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
        .summary-row:last-child { border-bottom: none; }
        .summary-key { font-weight: 700; color: #334155; min-width: 140px; }
        .summary-value { text-align: right; color: #64748b; font-weight: 600; flex: 1; }
        .var-card { border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; }
        .audience-scroll { max-height: 220px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #dbe3eb transparent; }
        body[data-theme="dark"] .launch-shell {
          background: radial-gradient(circle at top left, rgba(0,168,132,0.08), transparent 24%),
                      radial-gradient(circle at top right, rgba(34,197,94,0.06), transparent 22%),
                      linear-gradient(180deg, #0b141a 0%, #111b21 100%) !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .premium-card,
        body[data-theme="dark"] .stepper-wrap,
        body[data-theme="dark"] .soft-panel,
        body[data-theme="dark"] .var-card,
        body[data-theme="dark"] .template-card,
        body[data-theme="dark"] .message-preview {
          background: #111b21 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.26) !important;
        }
        body[data-theme="dark"] .stepper-wrap,
        body[data-theme="dark"] .soft-panel {
          background: #111b21 !important;
        }
        body[data-theme="dark"] .input-premium,
        body[data-theme="dark"] .select-premium {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
          box-shadow: none !important;
        }
        body[data-theme="dark"] .input-premium:focus,
        body[data-theme="dark"] .select-premium:focus {
          background: #202c33 !important;
          border-color: #00a884 !important;
          box-shadow: 0 0 0 3px rgba(0,168,132,0.18) !important;
        }
        body[data-theme="dark"] .section-title,
        body[data-theme="dark"] .form-label,
        body[data-theme="dark"] .summary-key,
        body[data-theme="dark"] .template-card .fw-bold,
        body[data-theme="dark"] .soft-panel h5 {
          color: #e9edef !important;
        }
        body[data-theme="dark"] .section-subtitle,
        body[data-theme="dark"] .step-label,
        body[data-theme="dark"] .summary-value,
        body[data-theme="dark"] .text-secondary,
        body[data-theme="dark"] .small {
          color: #8696a0 !important;
        }
        body[data-theme="dark"] .step-node {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #aebac1 !important;
        }
        body[data-theme="dark"] .step-node.active,
        body[data-theme="dark"] .step-node.done {
          color: #fff !important;
          border-color: transparent !important;
        }
        body[data-theme="dark"] .step-line {
          background: #2a3942 !important;
        }
        body[data-theme="dark"] .btn-back-premium,
        body[data-theme="dark"] .tag-checkbox,
        body[data-theme="dark"] .contact-row {
          background: #202c33 !important;
          border-color: #2a3942 !important;
          color: #e9edef !important;
        }
        body[data-theme="dark"] .template-card.selected {
          background: rgba(0,168,132,0.16) !important;
          border-color: #00a884 !important;
        }
        body[data-theme="dark"] .tag-checkbox.selected,
        body[data-theme="dark"] .contact-row.selected {
          background: linear-gradient(135deg, #007867 0%, #00a884 100%) !important;
          border-color: #00a884 !important;
          color: #fff !important;
        }
        body[data-theme="dark"] .summary-row {
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .launch-shell [style*="background: rgb(255, 255, 255)"],
        body[data-theme="dark"] .launch-shell [style*="background: #fff"],
        body[data-theme="dark"] .launch-shell [style*="background: #ffffff"] {
          background: #111b21 !important;
        }
        body[data-theme="dark"] .launch-shell [style*="background: rgb(248, 250, 252)"],
        body[data-theme="dark"] .launch-shell [style*="background: rgb(251, 253, 255)"],
        body[data-theme="dark"] .launch-shell [style*="background: rgb(241, 245, 249)"] {
          background: #202c33 !important;
        }
        @media (max-width: 991px) { .launch-shell { top: 60px; left: 0; } }
      `}</style>

      <div ref={pageRef} className="launch-shell p-3 p-md-4">
        <div className="scroll-hidden">
          <div className="launch-animate premium-card p-3 p-md-4 p-xl-4">

            {/* Top Nav */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <button className="btn btn-back-premium d-inline-flex align-items-center gap-2" onClick={handleBack}>
                <ArrowLeft size={15} /> Back
              </button>
              <div className="text-secondary small fw-semibold">
                {processing ? "Processing..." : `Step ${step} of ${steps.length} • ${Math.round(progressPercent)}% done`}
              </div>
              <button className="btn btn-next-premium d-inline-flex align-items-center justify-content-center gap-2" disabled={processing} onClick={handleNext}>
                {processing ? "Processing..." : step === steps.length ? (
                  isManager ? <><Clock size={15} /> Submit for Approval</> : <><Send size={15} /> Launch Campaign</>
                ) : <>Next <ChevronRight size={15} /></>}
              </button>
            </div>

            {/* ✅ Manager approval notice banner */}
            {isManager && (
              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 12, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={16} />
                <span>As a <strong>Manager</strong>, your campaign will be sent to <strong>Super Admin for approval</strong> before it goes live.</span>
              </div>
            )}

            {/* Stepper */}
            <div className="stepper-wrap">
              <div className="stepper-row">
                {steps.map((label, index) => {
                  const idx = index + 1;
                  const isDone = idx < step;
                  const isActive = idx === step;
                  return (
                    <div key={label} className="step-item">
                      <div className="step-node-wrap">
                        <div className={`step-node ${isDone ? "done" : isActive ? "active" : ""}`}>
                          {isDone ? <CheckCircle2 size={15} /> : idx}
                        </div>
                        <div className="step-label">{label}</div>
                      </div>
                      {idx !== steps.length && (
                        <div className="step-line">
                          <div ref={(el) => (stepperLineRefs.current[index] = el)} className="step-line-fill" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div ref={stepContentRef}>

              {/* ── STEP 1: Campaign Name ── */}
              {step === 1 && (
                <div className="mx-auto" style={{ maxWidth: 720 }}>
                  <h2 className="section-title">Campaign Name</h2>
                  <p className="section-subtitle mb-4">Give your campaign a clear name and choose message type.</p>
                  <div className="soft-panel p-3 p-md-4">
                    <div className="mb-4">
                      <label className="form-label">Campaign Name</label>
                      <input type="text" className="form-control input-premium" placeholder="e.g., Diwali Offer 2025" value={form.campaignName} onChange={(e) => handleChange("campaignName", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Message Type</label>
                      <div className="p-3 border rounded-4 bg-white">
                        <label className="d-flex align-items-start gap-3 m-0" style={{ cursor: "pointer" }}>
                          <input type="radio" checked={form.messageType === "Pre-approved template message"} onChange={() => handleChange("messageType", "Pre-approved template message")} style={{ width: 16, height: 16, marginTop: 4 }} />
                          <div>
                            <div className="fw-bold mb-1" style={{ fontSize: "13px" }}>Pre-approved template message</div>
                            <div className="text-secondary small">Use one of your approved templates for outreach.</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Select Template ── */}
              {step === 2 && (
                <div className="mx-auto" style={{ maxWidth: 820 }}>
                  <h2 className="section-title">Select Template</h2>
                  <p className="section-subtitle mb-4">
                    Only <strong>approved</strong> templates are shown here.
                  </p>

                  {loadingTemplates ? (
                    <div className="text-center py-5">Loading templates...</div>
                  ) : templates.length === 0 ? (
                    // ✅ Clear message when no approved templates exist
                    <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 16, padding: "24px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#92400e", marginBottom: 6 }}>No Approved Templates</div>
                      <div style={{ fontSize: 13, color: "#78350f" }}>
                        You don&apos;t have any approved templates yet. Please wait for the Super Admin to approve your templates before launching a campaign.
                      </div>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {templates.map((template) => (
                        <div key={template._id} className="col-md-6">
                          <div
                            className={`template-card p-3 ${form.selectedTemplateId === template._id ? "selected" : ""}`}
                            onClick={() => handleChange("selectedTemplateId", template._id)}
                          >
                            {/* ✅ Approved badge */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div className="fw-bold">{template.name}</div>
                              <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                ✅ Approved
                              </span>
                            </div>
                            <div className="small text-secondary mb-2">{template.category} • {template.mediaType}</div>
                            <div className="small" style={{ color: "#4b5563", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {template.format}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Schedule Campaign ── */}
              {step === 3 && (
                <div className="mx-auto" style={{ maxWidth: 760 }}>
                  <h2 className="section-title">Schedule Campaign</h2>
                  <p className="section-subtitle mb-4">Select audience, recurrence, and map template variables.</p>
                  <div className="soft-panel p-3 p-md-4">

                    <div className="mb-4">
                      <label className="form-label">Send to</label>
                      <select className="form-select select-premium mb-3" value={form.audienceType} onChange={(e) => { handleChange("audienceType", e.target.value); setAudienceSearch(""); }}>
                        <option value="tags">Tags</option>
                        <option value="contact">Contacts</option>
                        <option value="group">Group</option>
                        <option value="manual">Manual Numbers</option>
                      </select>

                      {["tags", "contact", "group"].includes(form.audienceType) && (
                        <input type="text" className="form-control input-premium mb-3" placeholder={`Search ${form.audienceType}...`} value={audienceSearch} onChange={(e) => setAudienceSearch(e.target.value)} />
                      )}

                      {form.audienceType === "tags" && (
                        <div className="d-flex flex-wrap gap-2">
                          {tags.filter((t) => t.name?.toLowerCase().includes(audienceSearch.toLowerCase())).map((tag) => (
                            <div key={tag._id} className={`tag-checkbox ${selectedTagIds.includes(String(tag._id)) ? "selected" : ""}`}
onClick={() => toggleTagSelection(String(tag._id))}>{tag.name}</div>
                          ))}
                          {tags.length === 0 && <div className="text-secondary small">No tags found.</div>}
                        </div>
                      )}

                      {form.audienceType === "contact" && (
                        <div className="d-flex flex-column gap-2 audience-scroll">
                          {contacts.filter((c) => (c.name || c.mobile || "").toLowerCase().includes(audienceSearch.toLowerCase())).map((contact) => (
                            <div key={contact._id} className={`contact-row ${selectedContactIds.includes(String(contact._id)) ? "selected" : ""}`}
onClick={() => toggleContactSelection(String(contact._id))}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(15,95,100,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#0f5f64", flexShrink: 0 }}>
                                {(contact.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", display: "block" }}>{contact.name || "Unknown"}</span>
                                <span style={{ fontSize: 11, color: "#64748b" }}>{contact.mobile}</span>
                              </div>
                              {selectedContactIds.includes(contact._id) && <CheckCircle2 size={16} color="#fff" />}
                            </div>
                          ))}
                          {contacts.length === 0 && <div className="text-secondary small">No contacts found.</div>}
                        </div>
                      )}

                      {form.audienceType === "group" && (
                        <div className="d-flex flex-wrap gap-2">
                          {groups.filter((g) => (g.groupName || g.name || "").toLowerCase().includes(audienceSearch.toLowerCase())).map((group) => (
                            <div key={group._id} className={`tag-checkbox ${selectedGroupIds.includes(String(group._id)) ? "selected" : ""}`}
onClick={() => toggleGroupSelection(String(group._id))}>
                              {group.groupName || group.name}
                            </div>
                          ))}
                          {groups.length === 0 && <div className="text-secondary small">No groups found.</div>}
                        </div>
                      )}

                      {form.audienceType === "manual" && (
                        <input type="text" className="form-control input-premium" placeholder="+911234567890, +919876543210" value={form.manualNumbers} onChange={(e) => handleChange("manualNumbers", e.target.value)} />
                      )}
                    </div>

                    {/* Recurrence */}
                    <div className="mb-4">
                      <label className="form-label d-flex align-items-center gap-2"><Repeat size={15} /> Recurrence</label>
                      <select className="form-select select-premium mb-3" value={form.recurrence.type} onChange={(e) => handleRecurrenceChange("type", e.target.value)}>
                        <option value="one-time">One-time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="hourly">Hourly</option>
                      </select>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">First Run Date</label>
                          <input type="date" className="form-control input-premium" value={form.scheduledDate} onChange={(e) => handleChange("scheduledDate", e.target.value)} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">First Run Time</label>
                          <input type="time" className="form-control input-premium" value={form.scheduledTime} onChange={(e) => handleChange("scheduledTime", e.target.value)} />
                        </div>
                        {form.recurrence.type !== "one-time" && (
                          <div className="col-md-6">
                            <label className="form-label">Repeat every {form.recurrence.type === "daily" ? "X days" : form.recurrence.type === "weekly" ? "X weeks" : form.recurrence.type === "monthly" ? "X months" : "X hours"}</label>
                            <input type="number" min="1" className="form-control input-premium" value={form.recurrence.interval} onChange={(e) => handleRecurrenceChange("interval", parseInt(e.target.value) || 1)} />
                          </div>
                        )}
                        {form.recurrence.type === "weekly" && (
                          <div className="col-md-6">
                            <label className="form-label">On</label>
                            <select className="form-select select-premium" value={form.recurrence.dayOfWeek} onChange={(e) => handleRecurrenceChange("dayOfWeek", parseInt(e.target.value))}>
                              {dayOfWeekOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                        )}
                        {form.recurrence.type === "monthly" && (
                          <div className="col-md-6">
                            <label className="form-label">On day of month</label>
                            <input type="number" min="1" max="31" className="form-control input-premium" value={form.recurrence.dayOfMonth} onChange={(e) => handleRecurrenceChange("dayOfMonth", parseInt(e.target.value) || 1)} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Template Variables */}
                    {selectedTemplate && extractVariables(selectedTemplate.format).length > 0 && (
                      <div className="mt-4 border-top pt-4">
                        <label className="form-label">Template Variables</label>
                        <p className="text-secondary small mb-3">Variables are auto-detected from the template body. Select a source for each.</p>
                        <div className="row g-3">
                          {extractVariables(selectedTemplate.format).map((varNum) => {
                            const currentMapping = variableMappings[varNum] || { type: "custom", customValue: "" };
                            return (
                              <div className="col-12" key={varNum}>
                                <div className="var-card p-3">
                                  <div className="row g-3 align-items-end">
                                    <div className="col-md-3">
                                      <label className="form-label">{`Variable {{${varNum}}}`}</label>
                                      <input type="text" className="form-control input-premium" value={`{{${varNum}}}`} disabled />
                                    </div>
                                    <div className="col-md-4">
                                      <label className="form-label">Select Type</label>
                                      <select className="form-select select-premium" value={currentMapping.type} onChange={(e) => handleVariableTypeChange(varNum, e.target.value)}>
                                        <option value="name">Name</option>
                                        <option value="phone">Phone Number</option>
                                        <option value="custom">Custom</option>
                                      </select>
                                    </div>
                                    {currentMapping.type === "custom" ? (
                                      <div className="col-md-5">
                                        <label className="form-label">Custom Value</label>
                                        <input type="text" className="form-control input-premium" placeholder={`Enter value for {{${varNum}}}`} value={currentMapping.customValue} onChange={(e) => handleCustomVariableChange(varNum, e.target.value)} />
                                      </div>
                                    ) : (
                                      <div className="col-md-5">
                                        <label className="form-label">Preview Value</label>
                                        <input type="text" className="form-control input-premium" value={getMappedValue(varNum)} disabled />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 4: Preview & Send ── */}
              {step === 4 && (
                <div className="mx-auto" style={{ maxWidth: 920 }}>
                  <h2 className="section-title">Preview & {isManager ? "Submit for Approval" : "Send"}</h2>
                  <p className="section-subtitle mb-4">Review campaign details before {isManager ? "submitting for approval" : "scheduling"}.</p>

                  <div className="row g-4">
                    <div className="col-lg-6">
                      <div className="soft-panel p-4 h-100">
                        <h5 className="fw-bold mb-3">Campaign Details</h5>
                        <div className="summary-row"><div className="summary-key">Name</div><div className="summary-value">{form.campaignName || "-"}</div></div>
                        <div className="summary-row"><div className="summary-key">Audience Type</div><div className="summary-value" style={{ textTransform: "capitalize" }}>{form.audienceType}</div></div>
                        {form.audienceType === "tags" && (<div className="summary-row"><div className="summary-key">Selected Tags</div><div className="summary-value">{selectedTagIds.length > 0 ? tags.filter((t) => selectedTagIds.includes(t._id)).map((t) => t.name).join(", ") : "None"}</div></div>)}
                        {form.audienceType === "contact" && (<div className="summary-row"><div className="summary-key">Selected Contacts</div><div className="summary-value">{selectedContactIds.length > 0 ? contacts.filter((c) => selectedContactIds.includes(c._id)).map((c) => c.name || c.mobile).join(", ") : "None"}</div></div>)}
                        {form.audienceType === "group" && (<div className="summary-row"><div className="summary-key">Selected Groups</div><div className="summary-value">{selectedGroupIds.length > 0 ? groups.filter((g) => selectedGroupIds.includes(g._id)).map((g) => g.groupName || g.name).join(", ") : "None"}</div></div>)}
                        {form.audienceType === "manual" && (<div className="summary-row"><div className="summary-key">Manual Numbers</div><div className="summary-value">{form.manualNumbers || "-"}</div></div>)}
                        <div className="summary-row"><div className="summary-key">Template</div><div className="summary-value">{selectedTemplate?.name || "None"}</div></div>
                        <div className="summary-row"><div className="summary-key">First Run</div><div className="summary-value">{form.scheduledDate || "-"} {form.scheduledTime || ""}</div></div>
                        <div className="summary-row">
                          <div className="summary-key">Recurrence</div>
                          <div className="summary-value" style={{ textTransform: "capitalize" }}>
                            {form.recurrence.type === "one-time" ? "One-time" : `${form.recurrence.type} every ${form.recurrence.interval} ${form.recurrence.type === "daily" ? "day(s)" : form.recurrence.type === "weekly" ? "week(s)" : form.recurrence.type === "monthly" ? "month(s)" : "hour(s)"}`}
                            {form.recurrence.type === "weekly" && ` on ${dayOfWeekOptions.find(d => d.value === form.recurrence.dayOfWeek)?.label}`}
                            {form.recurrence.type === "monthly" && ` on day ${form.recurrence.dayOfMonth}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="soft-panel p-4 h-100">
                        <h5 className="fw-bold mb-3">Message Preview</h5>
                        <div className="message-preview p-3">{getPreviewMessage()}</div>
                      </div>
                    </div>

                    <div className="col-12">
                      {/* ✅ Different banner for manager vs super_admin */}
                      {isManager ? (
                        <div className="p-4 rounded-4 d-flex align-items-start gap-3" style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}>
                          <Clock color="#d97706" size={20} />
                          <div>
                            <div className="fw-bold mb-1" style={{ color: "#92400e" }}>Pending Admin Approval</div>
                            <div className="small" style={{ color: "#78350f" }}>
                              This campaign will be submitted to the Super Admin for review. It will only be scheduled and sent after approval.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-4 d-flex align-items-start gap-3" style={{ background: "linear-gradient(135deg, #ecfdf3 0%, #f0fdf4 100%)", border: "1px solid #bbf7d0" }}>
                          <CheckCircle2 color="#16a34a" size={20} />
                          <div>
                            <div className="fw-bold text-success mb-1">Ready to schedule</div>
                            <div className="text-secondary small">Campaign preview is generated from selected variable mappings.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
