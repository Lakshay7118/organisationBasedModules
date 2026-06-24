"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckSquare, MessageCircleMore, Briefcase, Plus, ShieldCheck, Edit, Save, Trash2, X, Mail, KeyRound, LogIn, ChevronDown, Power } from "lucide-react";
import API from "../utils/api";

const moduleOptions = [
  { id: "hr", label: "HR Management", icon: Briefcase },
  { id: "task", label: "Task", icon: CheckSquare },
  { id: "chat", label: "Chat", icon: MessageCircleMore },
];

const initialForm = {
  organizationName: "",
  superAdminName: "",
  superAdminPhone: "",
  superAdminEmail: "",
  superAdminPassword: "",
  allowedModules: ["hr"],
};

export default function OrganizationsPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [editingOrgId, setEditingOrgId] = useState("");
  const [editForm, setEditForm] = useState({ organizationName: "", allowedModules: [] });
  const [expandedOrgId, setExpandedOrgId] = useState("");
  const [credentialForms, setCredentialForms] = useState({});
  const [credentialSavingId, setCredentialSavingId] = useState("");
  const [loginAsId, setLoginAsId] = useState("");
  const [statusSavingId, setStatusSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedModules = useMemo(() => new Set(form.allowedModules), [form.allowedModules]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "super_to_super_admin") {
      router.push("/");
      return;
    }

    let cancelled = false;
    API.get("/organizations")
      .then((res) => {
        if (!cancelled) setOrganizations(res.data?.data || []);
      })
      .catch((err) => setError(err.response?.data?.error || "Failed to load organizations"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleModule = (moduleId) => {
    setForm((prev) => {
      const hasModule = prev.allowedModules.includes(moduleId);
      return {
        ...prev,
        allowedModules: hasModule
          ? prev.allowedModules.filter((item) => item !== moduleId)
          : [...prev.allowedModules, moduleId],
      };
    });
  };

  const startEdit = (org) => {
    setError("");
    setMessage("");
    setEditingOrgId(org._id);
    setEditForm({
      organizationName: org.name || "",
      allowedModules: org.allowedModules?.length ? org.allowedModules : ["hr"],
    });
  };

  const toggleOrgDetails = (org) => {
    setError("");
    setMessage("");
    setExpandedOrgId((current) => (current === org._id ? "" : org._id));
    setCredentialForms((prev) => ({
      ...prev,
      [org._id]: {
        email: prev[org._id]?.email ?? org.superAdmin?.email ?? "",
        password: prev[org._id]?.password ?? "",
      },
    }));
  };

  const updateCredentialField = (orgId, field, value) => {
    setCredentialForms((prev) => ({
      ...prev,
      [orgId]: {
        email: prev[orgId]?.email || "",
        password: prev[orgId]?.password || "",
        [field]: value,
      },
    }));
  };

  const cancelEdit = () => {
    setEditingOrgId("");
    setEditForm({ organizationName: "", allowedModules: [] });
  };

  const updateEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEditModule = (moduleId) => {
    setEditForm((prev) => {
      const hasModule = prev.allowedModules.includes(moduleId);
      return {
        ...prev,
        allowedModules: hasModule
          ? prev.allowedModules.filter((item) => item !== moduleId)
          : [...prev.allowedModules, moduleId],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const res = await API.post("/organizations", form);
      setOrganizations((prev) => [res.data.data.organization, ...prev]);
      setForm(initialForm);
      setShowCreateModal(false);
      setMessage("Organization and super admin created.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not create organization");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (orgId) => {
    setError("");
    setMessage("");
    setUpdatingId(orgId);

    try {
      const res = await API.put(`/organizations/${orgId}`, editForm);
      setOrganizations((prev) => prev.map((org) => (org._id === orgId ? res.data.data : org)));
      cancelEdit();
      setMessage("Organization updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update organization");
    } finally {
      setUpdatingId("");
    }
  };

  const handleDelete = async (org) => {
    if (!window.confirm(`Delete "${org.name}" and its users/data permanently?`)) return;

    setError("");
    setMessage("");
    setDeletingId(org._id);

    try {
      await API.delete(`/organizations/${org._id}`);
      setOrganizations((prev) => prev.filter((item) => item._id !== org._id));
      if (editingOrgId === org._id) cancelEdit();
      setMessage("Organization deleted.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete organization");
    } finally {
      setDeletingId("");
    }
  };

  const handleEmailUpdate = async (org) => {
    const email = credentialForms[org._id]?.email || "";
    setError("");
    setMessage("");
    setCredentialSavingId(`${org._id}:email`);

    try {
      const res = await API.patch(`/organizations/${org._id}/super-admin/email`, { email });
      setOrganizations((prev) => prev.map((item) => (item._id === org._id ? res.data.data : item)));
      setMessage("Super admin email updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update email");
    } finally {
      setCredentialSavingId("");
    }
  };

  const handlePasswordUpdate = async (org) => {
    const password = credentialForms[org._id]?.password || "";
    setError("");
    setMessage("");
    setCredentialSavingId(`${org._id}:password`);

    try {
      await API.patch(`/organizations/${org._id}/super-admin/password`, { password });
      updateCredentialField(org._id, "password", "");
      setMessage("Super admin password updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update password");
    } finally {
      setCredentialSavingId("");
    }
  };

  const handleLoginAs = async (org) => {
    if (!window.confirm(`Login as ${org.superAdmin?.name || org.name}? Your current owner session will be replaced.`)) return;

    setError("");
    setMessage("");
    setLoginAsId(org._id);

    try {
      const currentSession = {
        token: localStorage.getItem("token"),
        user: localStorage.getItem("user"),
        role: localStorage.getItem("role"),
      };
      localStorage.setItem("ownerSession", JSON.stringify(currentSession));

      const res = await API.post(`/organizations/${org._id}/login-as`);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", res.data.user.role);
      window.dispatchEvent(new Event("loginStatusChanged"));
      router.push("/");
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || "Could not login as this organization");
    } finally {
      setLoginAsId("");
    }
  };

  const handleStatusToggle = async (org) => {
    const nextActive = org.isActive === false;
    const action = nextActive ? "activate" : "deactivate";
    if (!window.confirm(`${nextActive ? "Activate" : "Deactivate"} "${org.name}"?${nextActive ? "" : " Users in this organization will not be able to login."}`)) return;

    setError("");
    setMessage("");
    setStatusSavingId(org._id);

    try {
      const res = await API.put(`/organizations/${org._id}`, {
        organizationName: org.name,
        allowedModules: org.allowedModules || [],
        isActive: nextActive,
      });
      setOrganizations((prev) => prev.map((item) => (item._id === org._id ? res.data.data : item)));
      setMessage(`Organization ${action}d.`);
    } catch (err) {
      setError(err.response?.data?.error || `Could not ${action} organization`);
    } finally {
      setStatusSavingId("");
    }
  };

  return (
    <>
      <style>{`
        .org-page input {
          width: 100%;
          border: 1px solid #dbe3ea;
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 14px;
          outline: none;
          background: #fff;
          color: #111827;
        }
        .org-page input:focus {
          border-color: #0b535d;
          box-shadow: 0 0 0 3px rgba(11,83,93,0.12);
        }
        body[data-theme="dark"] .org-page input {
          background: #202c33;
          color: #e9edef;
          border-color: #2a3942;
        }
        .org-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15, 23, 42, 0.54);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          animation: orgBackdropIn 0.28s ease-out both;
        }
        .org-modal-card {
          animation: orgModalIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: 0.05s;
        }
        .org-skeleton {
          position: relative;
          overflow: hidden;
          background: var(--skeleton-gradient);
          background-size: 220% 100%;
          animation: orgSkeletonShimmer 1.25s ease-in-out infinite;
        }
        .org-skeleton-table {
          overflow-x: auto;
        }
        .org-skeleton-table table {
          width: 100%;
          min-width: 860px;
          border-collapse: collapse;
        }
        .org-skeleton-table th,
        .org-skeleton-table td {
          padding: 12px;
          border-top: 1px solid var(--app-border);
        }
        .org-skeleton-table th {
          background: var(--app-surface-2);
        }
        .org-skeleton-line {
          height: 12px;
          border-radius: 999px;
        }
        .org-skeleton-avatar {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .org-skeleton-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .org-skeleton-action {
          width: 34px;
          height: 34px;
          border-radius: 8px;
        }
        @keyframes orgSkeletonShimmer {
          0% { background-position: 120% 0; }
          100% { background-position: -120% 0; }
        }
        @keyframes orgBackdropIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0);
            -webkit-backdrop-filter: blur(0);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
        }
        @keyframes orgModalIn {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div className="org-page" style={{ display: "grid", gap: 18 }}>
        <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--app-text)" }}>
              Organizations
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--app-text-muted)", fontSize: 14 }}>
              Create an organization, assign its super admin, and choose enabled modules.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setForm(initialForm);
              setShowCreateModal(true);
            }}
            style={{
              height: 42,
              border: "none",
              borderRadius: 8,
              padding: "0 16px",
              background: "#0b535d",
              color: "#fff",
              fontWeight: 850,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={17} />
            Add Organization
          </button>
        </section>

        {(error || message) && (
          <div
            style={{
              border: `1px solid ${error ? "#fecaca" : "#bbf7d0"}`,
              background: error ? "#fef2f2" : "#f0fdf4",
              color: error ? "#b91c1c" : "#047857",
              borderRadius: 8,
              padding: "11px 13px",
              fontWeight: 800,
            }}
          >
            {error || message}
          </div>
        )}

        {showCreateModal && (
          <div className="org-modal-backdrop" onClick={() => !saving && setShowCreateModal(false)}>
            <form
              className="org-modal-card"
              onSubmit={handleSubmit}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(760px, 100%)",
                maxHeight: "86vh",
                overflowY: "auto",
                border: "1px solid var(--app-border)",
                borderRadius: 14,
                background: "var(--app-surface)",
                boxShadow: "0 30px 90px rgba(15,23,42,0.28)",
              }}
            >
              <div style={{ padding: "15px 18px 13px", borderBottom: "1px solid var(--app-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "linear-gradient(180deg, rgba(230,255,251,0.65), transparent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e6fffb", color: "#0b535d", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(11,83,93,0.12)" }}>
                    <Building2 size={19} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--app-text)" }}>Add Organization</h3>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--app-text-muted)" }}>Create the tenant, admin account, and module access.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setShowCreateModal(false)}
                  title="Close"
                  style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text)", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: 18, display: "grid", gap: 14 }}>
                <section style={{ display: "grid", gap: 9 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "var(--app-text)" }}>Organization Details</div>
                    <div style={{ fontSize: 11, color: "var(--app-text-muted)", marginTop: 2 }}>Name the workspace owner.</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                    <label>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Organization Name</span>
                    <input value={form.organizationName} onChange={(e) => updateField("organizationName", e.target.value)} placeholder="Acme Pvt Ltd" />
                    </label>
                  </div>
                </section>

                <section style={{ display: "grid", gap: 9 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "var(--app-text)" }}>Super Admin Login</div>
                    <div style={{ fontSize: 11, color: "var(--app-text-muted)", marginTop: 2 }}>This user manages the organization.</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
                    <label>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Super Admin Name</span>
                      <input value={form.superAdminName} onChange={(e) => updateField("superAdminName", e.target.value)} placeholder="Admin name" />
                    </label>
                    <label>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Super Admin Phone</span>
                      <input value={form.superAdminPhone} onChange={(e) => updateField("superAdminPhone", e.target.value)} placeholder="9876543210" />
                    </label>
                    <label>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Super Admin Email</span>
                      <input type="email" value={form.superAdminEmail} onChange={(e) => updateField("superAdminEmail", e.target.value)} placeholder="admin@company.com" />
                    </label>
                    <label>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Temporary Password</span>
                      <input type="password" value={form.superAdminPassword} onChange={(e) => updateField("superAdminPassword", e.target.value)} placeholder="Minimum 6 characters" />
                    </label>
                  </div>
                </section>

                <section style={{ display: "grid", gap: 9 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "var(--app-text)" }}>Module Access</div>
                    <div style={{ fontSize: 11, color: "var(--app-text-muted)", marginTop: 2 }}>Choose enabled modules.</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                    {moduleOptions.map((option) => {
                      const Icon = option.icon;
                      const checked = selectedModules.has(option.id);
                      return (
                        <label
                          key={option.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            border: `1px solid ${checked ? "#0b535d" : "var(--app-border)"}`,
                            borderRadius: 8,
                            padding: "9px 10px",
                            cursor: "pointer",
                            background: checked ? "rgba(11,83,93,0.08)" : "var(--app-surface-2)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleModule(option.id)}
                            style={{ width: 16, height: 16, accentColor: "#0b535d" }}
                          />
                          <Icon size={17} color="#0b535d" />
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{option.label}</span>
                        </label>
                        );
                      })}
                  </div>
                </section>

                {error && <div style={{ color: "#dc2626", fontWeight: 700, marginTop: 12 }}>{error}</div>}
              </div>

              <div style={{ padding: "12px 18px 16px", borderTop: "1px solid var(--app-border)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--app-surface)" }}>
                <button
                  type="button"
                  onClick={() => !saving && setShowCreateModal(false)}
                  disabled={saving}
                  style={{
                    height: 42,
                    border: "1px solid var(--app-border)",
                    borderRadius: 8,
                    padding: "0 16px",
                    background: "var(--app-surface-2)",
                    color: "var(--app-text)",
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    height: 42,
                    border: "none",
                    borderRadius: 8,
                    padding: "0 16px",
                    background: saving ? "#9ca3af" : "#0b535d",
                    color: "#fff",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  <Plus size={17} />
                  {saving ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        )}

        <section style={{ border: "1px solid var(--app-border)", borderRadius: 8, background: "var(--app-surface)", overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--app-border)", display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
            <ShieldCheck size={17} color="#0b535d" />
            Existing Organizations
          </div>

          {loading ? (
            <div className="org-skeleton-table" aria-label="Loading organizations">
              <table>
                <thead>
                  <tr>
                    {["Organization", "Super Admin", "Email", "Modules", "Created", "Actions"].map((label, index) => (
                      <th key={label} style={{ textAlign: index === 5 ? "right" : "left" }}>
                        <div
                          className="org-skeleton org-skeleton-line"
                          style={{ width: index === 5 ? 72 : [118, 96, 136, 82, 68][index] }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      <td style={{ minWidth: 210 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="org-skeleton org-skeleton-avatar" />
                          <div style={{ display: "grid", gap: 7, width: "100%" }}>
                            <div className="org-skeleton org-skeleton-line" style={{ width: rowIndex % 2 ? 148 : 176 }} />
                            <div className="org-skeleton org-skeleton-line" style={{ width: 76, height: 10 }} />
                          </div>
                        </div>
                      </td>
                      <td><div className="org-skeleton org-skeleton-line" style={{ width: rowIndex % 2 ? 104 : 128 }} /></td>
                      <td><div className="org-skeleton org-skeleton-line" style={{ width: rowIndex % 2 ? 156 : 188 }} /></td>
                      <td style={{ minWidth: 260 }}>
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                          <div className="org-skeleton org-skeleton-line" style={{ width: 54, height: 22 }} />
                          <div className="org-skeleton org-skeleton-line" style={{ width: 62, height: 22 }} />
                          <div className="org-skeleton org-skeleton-line" style={{ width: 48, height: 22 }} />
                        </div>
                      </td>
                      <td><div className="org-skeleton org-skeleton-line" style={{ width: 86 }} /></td>
                      <td>
                        <div className="org-skeleton-actions">
                          <div className="org-skeleton org-skeleton-action" />
                          <div className="org-skeleton org-skeleton-action" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : organizations.length === 0 ? (
            <div style={{ padding: 18, color: "var(--app-text-muted)" }}>No organizations created yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr style={{ background: "var(--app-surface-2)", textAlign: "left" }}>
                    <th style={{ padding: 12, fontSize: 12 }}>Organization</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Super Admin</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Email</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Modules</th>
                    <th style={{ padding: 12, fontSize: 12 }}>Created</th>
                    <th style={{ padding: 12, fontSize: 12, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => {
                    const isEditing = editingOrgId === org._id;
                    const isExpanded = expandedOrgId === org._id;
                    const editModules = new Set(editForm.allowedModules);
                    const credentialForm = credentialForms[org._id] || {
                      email: org.superAdmin?.email || "",
                      password: "",
                    };
                    return (
                      <Fragment key={org._id}>
                      <tr
                        onClick={() => !isEditing && toggleOrgDetails(org)}
                        style={{
                          borderTop: "1px solid var(--app-border)",
                          cursor: isEditing ? "default" : "pointer",
                          background: isExpanded ? "rgba(11,83,93,0.035)" : "transparent",
                        }}
                      >
                        <td style={{ padding: 12, fontWeight: 700, minWidth: 210 }}>
                          {isEditing ? (
                            <input
                              value={editForm.organizationName}
                              onChange={(e) => updateEditField("organizationName", e.target.value)}
                              placeholder="Organization name"
                            />
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <ChevronDown
                                size={15}
                                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }}
                              />
                              {org.name}
                              <span
                                style={{
                                  padding: "3px 7px",
                                  borderRadius: 999,
                                  background: org.isActive === false ? "#fee2e2" : "#dcfce7",
                                  color: org.isActive === false ? "#991b1b" : "#166534",
                                  fontSize: 10,
                                  fontWeight: 900,
                                  textTransform: "uppercase",
                                }}
                              >
                                {org.isActive === false ? "Inactive" : "Active"}
                              </span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: 12 }}>{org.superAdmin?.name || "-"}</td>
                        <td style={{ padding: 12 }}>{org.superAdmin?.email || "-"}</td>
                        <td style={{ padding: 12, minWidth: 260 }}>
                          {isEditing ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {moduleOptions.map((option) => (
                                <label
                                  key={option.id}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 9px",
                                    borderRadius: 8,
                                    border: `1px solid ${editModules.has(option.id) ? "#0b535d" : "var(--app-border)"}`,
                                    background: editModules.has(option.id) ? "rgba(11,83,93,0.08)" : "var(--app-surface-2)",
                                    fontSize: 12,
                                    fontWeight: 800,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editModules.has(option.id)}
                                    onChange={() => toggleEditModule(option.id)}
                                    style={{ width: 14, height: 14, accentColor: "#0b535d" }}
                                  />
                                  {option.id.toUpperCase()}
                                </label>
                              ))}
                            </div>
                          ) : (
                            (org.allowedModules || []).map((moduleName) => (
                              <span key={moduleName} style={{ display: "inline-block", marginRight: 6, marginBottom: 4, padding: "3px 8px", borderRadius: 999, background: "#e6fffb", color: "#0b535d", fontSize: 12, fontWeight: 800 }}>
                                {moduleName.toUpperCase()}
                              </span>
                            ))
                          )}
                        </td>
                        <td style={{ padding: 12 }}>{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : "-"}</td>
                        <td style={{ padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleUpdate(org._id);
                                  }}
                                  disabled={updatingId === org._id}
                                  title="Save"
                                  style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#047857", cursor: updatingId === org._id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    cancelEdit();
                                  }}
                                  title="Cancel"
                                  style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startEdit(org);
                                }}
                                title="Edit"
                                style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #dbeafe", background: "#eff6ff", color: "#2563eb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                <Edit size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(org);
                              }}
                              disabled={deletingId === org._id}
                              title="Delete"
                              style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff1f2", color: "#dc2626", cursor: deletingId === org._id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && !isEditing && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0, borderTop: "1px solid var(--app-border)" }}>
                            <div
                              onClick={(event) => event.stopPropagation()}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: 12,
                                padding: 16,
                                background: "var(--app-surface-2)",
                              }}
                            >
                              <label style={{ display: "grid", gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--app-text)" }}>Change Super Admin Email</span>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <input
                                    type="email"
                                    value={credentialForm.email}
                                    onChange={(event) => updateCredentialField(org._id, "email", event.target.value)}
                                    placeholder="admin@company.com"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleEmailUpdate(org)}
                                    disabled={credentialSavingId === `${org._id}:email`}
                                    title="Save email"
                                    style={{ width: 42, borderRadius: 8, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#047857", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                  >
                                    <Mail size={16} />
                                  </button>
                                </div>
                              </label>

                              <label style={{ display: "grid", gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--app-text)" }}>Change Password</span>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <input
                                    type="password"
                                    value={credentialForm.password}
                                    onChange={(event) => updateCredentialField(org._id, "password", event.target.value)}
                                    placeholder="New password"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handlePasswordUpdate(org)}
                                    disabled={credentialSavingId === `${org._id}:password`}
                                    title="Save password"
                                    style={{ width: 42, borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", color: "#b45309", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                  >
                                    <KeyRound size={16} />
                                  </button>
                                </div>
                              </label>

                              <div style={{ display: "grid", gap: 6, alignContent: "end" }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--app-text)" }}>
                                  Login as {org.superAdmin?.name || org.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleLoginAs(org)}
                                  disabled={loginAsId === org._id}
                                  style={{
                                    height: 42,
                                    border: "none",
                                    borderRadius: 8,
                                    background: loginAsId === org._id ? "#9ca3af" : "#0b535d",
                                    color: "#fff",
                                    cursor: loginAsId === org._id ? "not-allowed" : "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    fontWeight: 850,
                                  }}
                                >
                                  <LogIn size={16} />
                                  {loginAsId === org._id ? "Logging in..." : `Login as ${org.superAdmin?.name || "Super Admin"}`}
                                </button>
                              </div>

                              <div style={{ display: "grid", gap: 6, alignContent: "end" }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--app-text)" }}>
                                  Organization Status
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStatusToggle(org)}
                                  disabled={statusSavingId === org._id}
                                  style={{
                                    height: 42,
                                    border: "none",
                                    borderRadius: 8,
                                    background: org.isActive === false ? "#dcfce7" : "#fee2e2",
                                    color: org.isActive === false ? "#166534" : "#991b1b",
                                    cursor: statusSavingId === org._id ? "not-allowed" : "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    fontWeight: 850,
                                  }}
                                >
                                  <Power size={16} />
                                  {statusSavingId === org._id
                                    ? "Saving..."
                                    : org.isActive === false
                                      ? "Activate Organization"
                                      : "Deactivate Organization"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
