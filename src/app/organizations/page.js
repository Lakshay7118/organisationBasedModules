"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckSquare, MessageCircleMore, Briefcase, Plus, ShieldCheck, Edit, Save, Trash2, X } from "lucide-react";
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
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [editingOrgId, setEditingOrgId] = useState("");
  const [editForm, setEditForm] = useState({ organizationName: "", allowedModules: [] });
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

  return (
    <>
      <style>{`
        .org-page input {
          width: 100%;
          border: 1px solid #dbe3ea;
          border-radius: 8px;
          padding: 11px 12px;
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
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "#e6fffb", color: "#0b535d", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={22} />
          </div>
        </section>

        <form onSubmit={handleSubmit} style={{ border: "1px solid var(--app-border)", borderRadius: 8, background: "var(--app-surface)", padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Organization Name</span>
              <input value={form.organizationName} onChange={(e) => updateField("organizationName", e.target.value)} placeholder="Acme Pvt Ltd" />
            </label>
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

          <div style={{ marginTop: 16 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Module Access</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
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
                      padding: "11px 12px",
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
          </div>

          {error && <div style={{ color: "#dc2626", fontWeight: 700, marginTop: 12 }}>{error}</div>}
          {message && <div style={{ color: "#047857", fontWeight: 700, marginTop: 12 }}>{message}</div>}

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 16,
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
        </form>

        <section style={{ border: "1px solid var(--app-border)", borderRadius: 8, background: "var(--app-surface)", overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--app-border)", display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
            <ShieldCheck size={17} color="#0b535d" />
            Existing Organizations
          </div>

          {loading ? (
            <div style={{ padding: 18, color: "var(--app-text-muted)" }}>Loading...</div>
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
                    const editModules = new Set(editForm.allowedModules);
                    return (
                      <tr key={org._id} style={{ borderTop: "1px solid var(--app-border)" }}>
                        <td style={{ padding: 12, fontWeight: 700, minWidth: 210 }}>
                          {isEditing ? (
                            <input
                              value={editForm.organizationName}
                              onChange={(e) => updateEditField("organizationName", e.target.value)}
                              placeholder="Organization name"
                            />
                          ) : (
                            org.name
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
                                  onClick={() => handleUpdate(org._id)}
                                  disabled={updatingId === org._id}
                                  title="Save"
                                  style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#047857", cursor: updatingId === org._id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  title="Cancel"
                                  style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(org)}
                                title="Edit"
                                style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #dbeafe", background: "#eff6ff", color: "#2563eb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                <Edit size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(org)}
                              disabled={deletingId === org._id}
                              title="Delete"
                              style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff1f2", color: "#dc2626", cursor: deletingId === org._id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
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
