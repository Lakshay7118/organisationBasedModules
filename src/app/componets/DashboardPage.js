"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import {
  FiActivity,
  FiChevronRight,
  FiEdit2,
  FiGrid,
  FiMessageCircle,
  FiUser,
  FiZap,
  FiCheckCircle,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";
import API from "../utils/api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ─── Shimmer animation ─── */
const shimmerKeyframes = `
@keyframes wa-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

/* ─── Skeleton base ─── */
function Skeleton({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "var(--wa-skeleton-base, #e8f0ee)",
        borderRadius: radius,
        width,
        height,
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 0%, var(--skeleton-highlight, rgba(255,255,255,0.55)) 50%, transparent 100%)",
          animation: "wa-shimmer 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ─── Skeleton variants ─── */
function HeroBannerSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4" style={{ background: "var(--wa-gradient-primary)" }}>
        <Skeleton width={180} height={26} style={{ marginBottom: 12 }} />
        <Skeleton width="70%" height={20} style={{ marginBottom: 8 }} />
        <Skeleton width="90%" height={14} />
      </div>
    </div>
  );
}

function StatusCardSkeleton() {
  return (
    <div className="col-6 col-lg-3">
      <div
        className="card border-0 shadow-sm rounded-4"
        data-skeleton-panel="true"
        style={{ backgroundColor: "var(--wa-bg-card)" }}
      >
        <div className="card-body p-3">
          <div className="d-flex justify-content-between mb-3">
            <Skeleton width={36} height={36} radius={8} />
            <Skeleton width={48} height={16} />
          </div>
          <Skeleton width={72} height={24} style={{ marginBottom: 6 }} />
          <Skeleton width={56} height={13} />
        </div>
      </div>
    </div>
  );
}

function AccessCodeSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={200} height={18} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={140} />
      </div>
    </div>
  );
}

function StepsBannerSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={180} height={18} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={80} />
      </div>
    </div>
  );
}

function SetupCardSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={160} height={18} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={60} />
      </div>
    </div>
  );
}

function MobileAppSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={140} height={18} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={100} />
      </div>
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <div className="d-flex align-items-center gap-3 mb-3">
          <Skeleton width={42} height={42} radius={50} />
          <div className="flex-fill">
            <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
            <Skeleton width={80} height={13} />
          </div>
        </div>
        <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={13} />
      </div>
    </div>
  );
}

function CreditsCardSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={160} height={18} style={{ marginBottom: 12 }} />
        <Skeleton width={80} height={36} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={8} />
      </div>
    </div>
  );
}

/* ─── Quick links data ─── */
const quickLinks = [
  {
    label: "Assign Task",
    description: "Create and delegate work",
    icon: <FiCheckCircle size={16} />,
    color: "#0d9488",
    bg: "var(--wa-success-soft)",
    path: "/task?action=create",
    roles: ["super_to_super_admin", "super_admin", "manager", "user"],
    module: "task",
  },
  {
    label: "Create User",
    description: "Add contact or teammate",
    icon: <FiUser size={16} />,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    path: "/contacts?action=create",
    roles: ["super_to_super_admin", "super_admin", "manager", "hr"],
  },
  {
    label: "New Template",
    description: "Prepare a message format",
    icon: <FiGrid size={16} />,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    path: "/Template?action=create",
    roles: ["super_to_super_admin", "super_admin", "manager"],
    module: "chat",
  },
  {
    label: "Broadcast",
    description: "Start a campaign message",
    icon: <FiMessageCircle size={16} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    path: "/Campaigns",
    roles: ["super_to_super_admin", "super_admin", "manager"],
    module: "chat",
  },
];

const emptyDashboard = {
  user: { name: "", email: "", phone: "", role: "", allowedModules: [] },
  metrics: {},
  taskStatus: {},
  recentActivity: [],
};

/* ─── Utilities ─── */
const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const roleLabel = (role) => {
  if (role === "super_to_super_admin") return "Owner";
  if (role === "super_admin") return "Super Admin";
  return role
    ? role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "User";
};

const canUseModule = (module, role, allowedModules = [], selfAccessRoles = []) => {
  if (!module) return true;
  if (role === "super_to_super_admin") return true;
  if (selfAccessRoles.includes(role)) return true;
  return allowedModules.includes(module);
};

const canUseDashboardItem = (item, role, allowedModules = []) => {
  if (item.roles && !item.roles.includes(role)) return false;
  return canUseModule(item.module, role, allowedModules, item.selfAccessRoles);
};

const timeAgo = (value) => {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "Just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const activityTone = (type) => {
  if (type === "task")
    return { color: "#0d9488", bg: "rgba(13,148,136,0.1)", icon: <FiCheckCircle size={14} /> };
  if (type === "template")
    return { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", icon: <FiGrid size={14} /> };
  if (type === "campaign")
    return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <FiMessageCircle size={14} /> };
  if (type === "contact")
    return { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: <FiUser size={14} /> };
  return { color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: <FiActivity size={14} /> };
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "U";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" },
  }),
};

/* ─── Custom recharts tooltip ─── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "var(--wa-bg-card)",
        border: "1px solid var(--wa-border-light)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        color: "var(--wa-text-primary)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || p.color }}>
          {p.value} tasks
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════ */
export default function DashboardPage() {
  const rootRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loadError, setLoadError] = useState("");
  const [loadedAt, setLoadedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    API.get("/dashboard/summary")
      .then((res) => {
        if (cancelled) return;
        setDashboard(res.data?.data || emptyDashboard);
        setLoadedAt(new Date());
        setLoadError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error.response?.data?.error || "Could not load dashboard data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".wa-card",
        { opacity: 0, y: 20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.07, ease: "power3.out" }
      );
    }, rootRef);
    return () => ctx.revert();
  }, [isLoading]);

  /* ── Derived data ── */
  const metrics = dashboard.metrics || {};
  const taskStatus = dashboard.taskStatus || {};
  const dashboardUser = dashboard.user || {};
  const organization = dashboardUser.organization || {};
  const recentActivity = dashboard.recentActivity || [];
  const userRole = dashboardUser.role || "";
  const allowedModules = Array.isArray(dashboardUser.allowedModules)
    ? dashboardUser.allowedModules
    : [];
  const canViewTask = canUseModule("task", userRole, allowedModules);
  const canViewChat = canUseModule("chat", userRole, allowedModules);
  const canViewCampaignTools =
    ["super_to_super_admin", "super_admin", "manager"].includes(userRole) &&
    canViewChat;
  const canViewHr = canUseModule("hr", userRole, allowedModules);
  const canViewContacts = userRole !== "user";
  const canViewActivityType = (type) => {
    if (type === "task") return canViewTask;
    if (["template", "campaign", "message"].includes(type)) return canViewChat;
    if (type === "contact") return canViewContacts;
    if (type === "hr") return canViewHr;
    return true;
  };
  const visibleQuickLinks = quickLinks.filter((item) =>
    canUseDashboardItem(item, userRole, allowedModules)
  );
  const visibleRecentActivity = recentActivity.filter((activity) =>
    canViewActivityType(activity.type)
  );
  const emptyActivityModules = [
    canViewTask ? "tasks" : "",
    canViewChat ? "templates" : "",
    canViewContacts ? "contacts" : "",
    canViewChat ? "campaigns" : "",
    canViewHr ? "HR updates" : "",
  ].filter(Boolean);

  const taskTotal = Object.values(taskStatus).reduce((a, b) => a + (Number(b) || 0), 0);
  const completedTasks = Number(taskStatus.completed || 0);
  const completionRate = taskTotal ? Math.round((completedTasks / taskTotal) * 100) : 0;
  const messageTotal = Number(metrics.messages || 0);
  const campaignTotal = Number(metrics.campaigns || 0);
  const activeCampaigns = Number(metrics.activeCampaigns || 0);
  const campaignProgress = campaignTotal
    ? Math.min(100, Math.round((activeCampaigns / campaignTotal) * 100))
    : 0;

  const taskStatusData = [
    { name: "Pending", value: Number(taskStatus.pending || 0), color: "#f59e0b" },
    { name: "In Progress", value: Number(taskStatus.inProgress || 0), color: "#3b82f6" },
    { name: "Completed", value: completedTasks, color: "#0d9488" },
    { name: "Overdue", value: Number(taskStatus.overdue || 0), color: "#ef4444" },
  ];

  const donutData = [
    { name: "Completed", value: completedTasks, color: "#0d9488" },
    { name: "Remaining", value: Math.max(0, taskTotal - completedTasks), color: "#e2e8f0" },
  ];

  const kpiCards = [
    {
      label: "Contacts",
      value: formatNumber(metrics.contacts),
      icon: <FiUser size={16} />,
      trend: "+12%",
      up: true,
      color: "#0d9488",
      soft: "rgba(13,148,136,0.1)",
      visible: canViewContacts,
    },
    {
      label: "Active Staff",
      value: formatNumber(metrics.activeStaff),
      icon: <FiZap size={16} />,
      trend: "+5%",
      up: true,
      color: "#3b82f6",
      soft: "rgba(59,130,246,0.1)",
      visible: canViewHr,
    },
    {
      label: "Departments",
      value: formatNumber(metrics.departments),
      icon: <FiGrid size={16} />,
      trend: "—",
      up: null,
      color: "#8b5cf6",
      soft: "rgba(139,92,246,0.1)",
      visible: canViewHr,
    },
    {
      label: "Chats",
      value: formatNumber(metrics.chats),
      icon: <FiMessageCircle size={16} />,
      trend: "+18%",
      up: true,
      color: "#f59e0b",
      soft: "rgba(245,158,11,0.1)",
      visible: canViewChat,
    },
  ].filter((item) => item.visible);

  const managerTiles = [
    {
      label: "Templates",
      value: metrics.templates,
      icon: <FiGrid size={22} color="#8b5cf6" style={{ marginBottom: 8 }} />,
      path: "/Template",
      visible: canViewCampaignTools,
    },
    {
      label: "Tasks",
      value: metrics.tasks,
      icon: <FiCheckCircle size={22} color="var(--wa-success)" style={{ marginBottom: 8 }} />,
      path: "/task",
      visible: ["super_to_super_admin", "super_admin", "manager"].includes(userRole) && canViewTask,
    },
  ].filter((item) => item.visible);

  const workspaceSummaryItems = [
    {
      label: "Contacts",
      value: metrics.contacts,
      icon: <FiUser size={18} />,
      color: "#0d9488",
      bg: "rgba(13,148,136,0.1)",
      path: "/contacts",
      visible: canViewContacts,
    },
    {
      label: "Campaigns",
      value: metrics.campaigns,
      icon: <FiMessageCircle size={18} />,
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.12)",
      path: "/Campaigns",
      visible: canViewCampaignTools,
    },
    {
      label: "Departments",
      value: metrics.departments,
      icon: <FiGrid size={18} />,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.1)",
      path: "/HR",
      visible: canViewHr,
    },
    {
      label: "Active Staff",
      value: metrics.activeStaff,
      icon: <FiZap size={18} />,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      path: "/HR",
      visible: canViewHr,
    },
  ].filter((item) => item.visible);

  const statusBadge =
    completionRate > 75
      ? { label: "On Track", color: "var(--wa-success)", bg: "var(--wa-success-soft)" }
      : completionRate > 40
      ? { label: "Needs Attention", color: "var(--wa-warning)", bg: "var(--wa-warning-soft)" }
      : { label: "At Risk", color: "var(--wa-danger)", bg: "var(--wa-danger-soft)" };

  /* ── Profile stat rows ── */
  const profileStats = [
    { label: "Templates", value: formatNumber(metrics.templates), visible: canViewCampaignTools },
    { label: "Tasks", value: formatNumber(metrics.tasks), visible: canViewTask },
    {
      label: "Allowed modules",
      value: dashboardUser.allowedModules?.length
        ? dashboardUser.allowedModules.length
        : "All",
      visible: true,
    },
  ].filter((row) => row.visible);

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <style>{`
        .dashboard-page {
          --skeleton-highlight: rgba(255, 255, 255, 0.55);
        }
        body[data-theme="dark"] .dashboard-page {
          --wa-skeleton-base: #1f2c34;
          --skeleton-highlight: rgba(134, 150, 160, 0.2);
        }
        body[data-theme="dark"] .dashboard-page [data-skeleton-panel="true"] {
          background-color: #111b21 !important;
        }
        body[data-theme="dark"] .dashboard-page .card {
          background-color: #111b21 !important;
          border-color: #2a3942 !important;
        }
        .db-kpi-card { transition: transform 0.2s ease; }
        .db-kpi-card:hover { transform: translateY(-4px); }
        .db-quick-link { transition: background 0.15s ease; }
        .db-quick-link:hover { background-color: var(--wa-bg-light) !important; }
        .db-activity-item { transition: background 0.15s ease; }
        .db-activity-item:hover { background-color: var(--wa-bg-light) !important; border-radius: 8px; }
      `}</style>

      <div
        ref={rootRef}
        className="dashboard-page container-fluid py-3 py-lg-4"
        style={{
          minHeight: "100vh",
          background: `linear-gradient(180deg, var(--wa-bg-page-top) 0%, var(--wa-bg-page-mid) 35%, var(--wa-bg-page-bottom) 100%)`,
        }}
      >
        {isLoading ? (
          /* ── Skeleton layout ── */
          <div className="row g-4">
            <div className="col-12 col-xl-8">
              <HeroBannerSkeleton />
              <div className="row g-3 mb-4">
                <StatusCardSkeleton />
                <StatusCardSkeleton />
                <StatusCardSkeleton />
                <StatusCardSkeleton />
              </div>
              <AccessCodeSkeleton />
              <StepsBannerSkeleton />
              <SetupCardSkeleton />
            </div>
            <div className="col-12 col-xl-4">
              <div className="d-flex flex-column gap-4">
                <MobileAppSkeleton />
                <ProfileCardSkeleton />
                <CreditsCardSkeleton />
              </div>
            </div>
          </div>
        ) : (
          /* ── Main layout ── */
          <div className="row g-4">

            {loadError && (
              <div className="col-12">
                <div className="alert alert-warning rounded-4 border-0 mb-0">{loadError}</div>
              </div>
            )}

            {/* ════════ LEFT COLUMN ════════ */}
            <div className="col-12 col-xl-8">

              {/* ── Hero Banner ── */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={1}
                className="wa-card card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
                style={{ backgroundColor: "var(--wa-bg-card)" }}
              >
                <div className="card-body p-4" style={{ background: "var(--wa-gradient-primary)" }}>
                  <div className="row align-items-center g-3">
                    <div className="col-12 col-lg">
                      <div className="d-flex align-items-center gap-3 flex-wrap flex-sm-nowrap">
                        <span
                          className="d-inline-flex align-items-center justify-content-center"
                          style={{
                            width: 92,
                            height: 92,
                            borderRadius: 20,
                            background: organization.logoUrl
                              ? `center / cover no-repeat url("${organization.logoUrl}")`
                              : "rgba(255,255,255,0.2)",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.28)",
                            boxShadow: "0 16px 34px rgba(0,0,0,0.16)",
                            fontSize: 30,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {!organization.logoUrl && (organization.name || "W").charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <span
                            className="d-inline-flex rounded-pill px-3 py-1 mb-3"
                            style={{
                              background: "rgba(255,255,255,0.18)",
                              border: "1px solid rgba(255,255,255,0.28)",
                              fontSize: 12,
                              color: "#fff",
                              fontWeight: 600,
                            }}
                          >
                            {organization.name || "Internal Communication Hub"}
                          </span>
                          <h4 className="fw-bold mb-1" style={{ color: "#fff" }}>
                            Welcome back{dashboardUser.name ? `, ${dashboardUser.name}` : ""}
                          </h4>
                          <p className="mb-0" style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
                            Live view of your dashboard data from this workspace.
                          </p>
                        </div>
                      </div>
                    </div>
                    {canViewTask && (
                    <div className="col-12 col-lg-auto">
                      <button
                        type="button"
                        onClick={() => window.location.assign("/task")}
                        className="btn fw-semibold rounded-3 px-4 py-2 d-flex align-items-center gap-2"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.18)",
                          color: "#fff",
                          border: "1.5px solid rgba(255,255,255,0.35)",
                          fontSize: 14,
                        }}
                      >
                        Open Tasks <FiChevronRight size={15} />
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ── KPI Cards ── */}
              {kpiCards.length > 0 && (
              <div className="row g-3 mb-4">
                {kpiCards.map((stat, idx) => (
                  <div className="col-6 col-lg-3" key={stat.label}>
                    <motion.div
                      custom={idx + 2}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      className="wa-card card border-0 shadow-sm rounded-4 h-100 db-kpi-card"
                      style={{ backgroundColor: "var(--wa-bg-card)" }}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div
                            className="d-flex align-items-center justify-content-center rounded-3"
                            style={{
                              width: 36,
                              height: 36,
                              backgroundColor: stat.soft,
                              color: stat.color,
                            }}
                          >
                            {stat.icon}
                          </div>
                          <div className="d-flex align-items-center gap-1">
                            {stat.up === true && (
                              <FiTrendingUp size={12} color="var(--wa-success)" />
                            )}
                            {stat.up === false && (
                              <FiTrendingDown size={12} color="var(--wa-danger)" />
                            )}
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color:
                                  stat.up === true
                                    ? "var(--wa-success)"
                                    : stat.up === false
                                    ? "var(--wa-danger)"
                                    : "var(--wa-text-secondary)",
                              }}
                            >
                              {stat.trend}
                            </span>
                          </div>
                        </div>
                        <div
                          className="fw-bold"
                          style={{ fontSize: 22, color: "var(--wa-text-primary)", lineHeight: 1.1 }}
                        >
                          {stat.value}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--wa-text-secondary)", marginTop: 4 }}>
                          {stat.label}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
              )}

              {/* ── Task Analytics ── */}
              {canViewTask && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={6}
                className="wa-card card border-0 shadow-sm rounded-4 mb-4"
                style={{ backgroundColor: "var(--wa-bg-card)" }}
              >
                <div className="card-body p-4">
                  {/* Header */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                    <div>
                      <h5
                        className="fw-bold mb-1"
                        style={{ color: "var(--wa-text-primary)", fontSize: 16 }}
                      >
                        Task analytics
                      </h5>
                      <p className="mb-0" style={{ fontSize: 13, color: "var(--wa-text-secondary)" }}>
                        {formatNumber(taskTotal)} total tasks · {completionRate}% completion rate
                      </p>
                    </div>
                    <span
                      className="rounded-pill px-3 py-1"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color,
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="row g-4 align-items-center">
                    {/* Donut + legend */}
                    <div className="col-12 col-lg-4">
                      <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={78}
                              paddingAngle={4}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                            >
                              {donutData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <text
                              x="50%"
                              y="46%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{
                                fontSize: 26,
                                fontWeight: 800,
                                fill: "var(--wa-text-primary)",
                              }}
                            >
                              {completionRate}%
                            </text>
                            <text
                              x="50%"
                              y="62%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ fontSize: 12, fill: "var(--wa-text-secondary)" }}
                            >
                              done
                            </text>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Color legend */}
                      <div className="d-flex flex-wrap justify-content-center gap-2 mt-1">
                        {taskStatusData.map((s) => (
                          <div key={s.name} className="d-flex align-items-center gap-1">
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                backgroundColor: s.color,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: 11, color: "var(--wa-text-secondary)" }}>
                              {s.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bar chart */}
                    <div className="col-12 col-lg-8">
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={taskStatusData}
                            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--wa-border-light)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: "var(--wa-text-secondary)", fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: "var(--wa-text-secondary)", fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              content={<CustomTooltip />}
                              cursor={{ fill: "rgba(0,0,0,0.04)" }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                              {taskStatusData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              )}

              {/* ── Template & Task Manager ── */}
              {managerTiles.length > 0 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={7}
                className="wa-card card border-0 shadow-sm rounded-4"
                style={{ backgroundColor: "var(--wa-bg-card)" }}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-4">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-3"
                        style={{
                          width: 34,
                          height: 34,
                          backgroundColor: "var(--wa-success-soft)",
                          color: "var(--wa-success)",
                        }}
                      >
                        <FiCheckCircle size={16} />
                      </div>
                      <h5
                        className="mb-0 fw-bold"
                        style={{ color: "var(--wa-text-primary)", fontSize: 16 }}
                      >
                        Template & task manager
                      </h5>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--wa-text-secondary)" }}>
                      Updated {loadedAt ? timeAgo(loadedAt) : "just now"}
                    </span>
                  </div>

                  <div className="row g-3">
                    {managerTiles.map((tile) => (
                    <div className={managerTiles.length === 1 ? "col-12" : "col-6"} key={tile.label}>
                      <div
                        className="rounded-4 p-3 text-center"
                        style={{
                          backgroundColor: "var(--wa-bg-light)",
                          border: "1px solid var(--wa-border-light)",
                        }}
                      >
                        {tile.icon}
                        <div
                          className="fw-bold"
                          style={{ fontSize: 26, color: "var(--wa-text-primary)", lineHeight: 1 }}
                        >
                          {formatNumber(tile.value)}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--wa-text-secondary)",
                            marginBottom: 12,
                            marginTop: 3,
                          }}
                        >
                          {tile.label}
                        </div>
                        <button
                          type="button"
                          onClick={() => window.location.assign(tile.path)}
                          className="btn w-100 rounded-3 fw-semibold"
                          style={{
                            backgroundColor: "var(--wa-bg-card)",
                            color: "var(--wa-text-primary)",
                            border: "1px solid var(--wa-border-light)",
                            fontSize: 13,
                            padding: "7px 0",
                          }}
                        >
                          View all
                        </button>
                      </div>
                    </div>
                    ))}
                  </div>

                  {/* Overdue alert */}
                  {Number(taskStatus.overdue) > 0 && (
                    <div
                      className="d-flex align-items-center gap-2 rounded-3 p-3 mt-3"
                      style={{
                        backgroundColor: "var(--wa-danger-soft)",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <FiActivity size={14} color="var(--wa-danger)" />
                      <span style={{ fontSize: 13, color: "var(--wa-danger)", fontWeight: 500 }}>
                        {formatNumber(taskStatus.overdue)} overdue{" "}
                        {Number(taskStatus.overdue) === 1 ? "task needs" : "tasks need"} attention
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
              )}

              {/* Workspace Summary */}

              {workspaceSummaryItems.length > 0 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={8}
                className="wa-card card border-0 shadow-sm rounded-4 mt-4"
                style={{ backgroundColor: "var(--wa-bg-card)" }}
              >
                <div className="card-body p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                    <div>
                      <h5 className="fw-bold mb-1" style={{ color: "var(--wa-text-primary)", fontSize: 16 }}>
                        Workspace summary
                      </h5>
                      <p className="mb-0" style={{ fontSize: 13, color: "var(--wa-text-secondary)" }}>
                        A quick look at the active parts of your workspace.
                      </p>
                    </div>
                    <span
                      className="rounded-pill px-3 py-1"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--wa-success)",
                        backgroundColor: "var(--wa-success-soft)",
                      }}
                    >
                      Live data
                    </span>
                  </div>

                  <div className="row g-3">
                    {workspaceSummaryItems.map((item) => (
                      <div className="col-12 col-sm-6 col-lg-3" key={item.label}>
                        <button
                          type="button"
                          onClick={() => window.location.assign(item.path)}
                          className="w-100 h-100 text-start rounded-4"
                          style={{
                            minHeight: 112,
                            padding: 14,
                            border: "1px solid var(--wa-border-light)",
                            background: "var(--wa-bg-light)",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                            style={{
                              width: 38,
                              height: 38,
                              color: item.color,
                              backgroundColor: item.bg,
                            }}
                          >
                            {item.icon}
                          </span>
                          <div
                            className="fw-bold"
                            style={{ color: "var(--wa-text-primary)", fontSize: 22, lineHeight: 1 }}
                          >
                            {formatNumber(item.value)}
                          </div>
                          <div style={{ color: "var(--wa-text-secondary)", fontSize: 12, marginTop: 4 }}>
                            {item.label}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
              )}
            </div>

            {/* ════════ RIGHT COLUMN ════════ */}
            <div className="col-12 col-xl-4">
              <div className="d-flex flex-column gap-4">

                {/* ── Quick Actions ── */}
              {visibleQuickLinks.length > 0 && (
              <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  custom={3}
                  className="wa-card card border-0 shadow-sm rounded-4"
                  style={{ backgroundColor: "var(--wa-bg-card)" }}
                >
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6
                          className="fw-bold mb-0"
                          style={{ color: "var(--wa-text-primary)", fontSize: 15 }}
                        >
                          Quick actions
                        </h6>
                        <div style={{ fontSize: 12, color: "var(--wa-text-secondary)", marginTop: 2 }}>
                          Fast shortcuts for daily work
                        </div>
                      </div>
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                          width: 32,
                          height: 32,
                          backgroundColor: "var(--wa-success-soft)",
                          color: "var(--wa-success)",
                        }}
                      >
                        <FiZap size={14} />
                      </div>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      {visibleQuickLinks.map((item, i) => (
                        <motion.button
                          key={item.label}
                          type="button"
                          whileHover={{ x: 3 }}
                          onClick={() => window.location.assign(item.path)}
                          className="db-quick-link w-100 d-flex align-items-center justify-content-between text-start rounded-3"
                          style={{
                            padding: "10px 12px",
                            border: "1px solid var(--wa-border-light)",
                            backgroundColor:
                              i === 0 ? "var(--wa-success-soft)" : "var(--wa-bg-card)",
                            cursor: "pointer",
                          }}
                        >
                          <span className="d-flex align-items-center gap-3">
                            <span
                              className="d-flex align-items-center justify-content-center rounded-3"
                              style={{
                                width: 36,
                                height: 36,
                                backgroundColor: item.bg,
                                color: item.color,
                                flexShrink: 0,
                              }}
                            >
                              {item.icon}
                            </span>
                            <span>
                              <span
                                className="d-block fw-semibold"
                                style={{ color: "var(--wa-text-primary)", fontSize: 13 }}
                              >
                                {item.label}
                              </span>
                              <span style={{ color: "var(--wa-text-secondary)", fontSize: 11 }}>
                                {item.description}
                              </span>
                            </span>
                          </span>
                          <FiChevronRight
                            size={15}
                            style={{ color: item.color, flexShrink: 0 }}
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>
              </motion.div>
              )}

                {/* ── Recent Activity ── */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  custom={4}
                  className="wa-card card border-0 shadow-sm rounded-4"
                  style={{ backgroundColor: "var(--wa-bg-card)" }}
                >
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6
                        className="fw-bold mb-0"
                        style={{ color: "var(--wa-text-primary)", fontSize: 15 }}
                      >
                        Recent activity
                      </h6>
                      <span
                        className="rounded-pill px-2 py-1"
                        style={{
                          backgroundColor: "var(--wa-bg-light)",
                          color: "var(--wa-text-secondary)",
                          border: "1px solid var(--wa-border-light)",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {visibleRecentActivity.length} items
                      </span>
                    </div>

                    {visibleRecentActivity.length === 0 ? (
                      <div
                        className="rounded-4 text-center p-4"
                        style={{
                          backgroundColor: "var(--wa-bg-light)",
                          border: "1px dashed var(--wa-border-light)",
                        }}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-2"
                          style={{
                            width: 38,
                            height: 38,
                            backgroundColor: "var(--wa-success-soft)",
                            color: "var(--wa-success)",
                          }}
                        >
                          <FiActivity size={16} />
                        </div>
                        <div
                          className="fw-semibold"
                          style={{ color: "var(--wa-text-primary)", fontSize: 14 }}
                        >
                          No recent activity yet
                        </div>
                        <div style={{ color: "var(--wa-text-secondary)", fontSize: 12, marginTop: 4 }}>
                          {emptyActivityModules.length
                            ? `${emptyActivityModules.join(", ")} will appear here.`
                            : "Activity for your enabled modules will appear here."}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {visibleRecentActivity.slice(0, 5).map((activity, index) => {
                          const tone = activityTone(activity.type);
                          const isLast = index === Math.min(visibleRecentActivity.length, 5) - 1;
                          return (
                            <div
                              key={(activity.type || "a") + index}
                              className="db-activity-item d-flex align-items-start gap-3"
                              style={{
                                padding: "9px 6px",
                                borderBottom: isLast
                                  ? "none"
                                  : "1px solid var(--wa-border-light)",
                              }}
                            >
                              <span
                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                style={{
                                  width: 32,
                                  height: 32,
                                  backgroundColor: tone.bg,
                                  color: tone.color,
                                }}
                              >
                                {tone.icon}
                              </span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span className="d-flex justify-content-between gap-2">
                                  <span
                                    className="fw-semibold text-truncate"
                                    style={{ color: "var(--wa-text-primary)", fontSize: 13 }}
                                  >
                                    {activity.title}
                                  </span>
                                  {activity.date && (
                                    <span
                                      style={{
                                        color: "var(--wa-text-secondary)",
                                        fontSize: 11,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {timeAgo(activity.date)}
                                    </span>
                                  )}
                                </span>
                                <span
                                  className="d-block text-truncate"
                                  style={{
                                    color: "var(--wa-text-secondary)",
                                    fontSize: 12,
                                    marginTop: 2,
                                  }}
                                >
                                  {activity.description || "Workspace activity"}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* ── Admin Profile Card ── */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  custom={5}
                  className="wa-card card border-0 shadow-sm rounded-4"
                  style={{ backgroundColor: "var(--wa-bg-card)" }}
                >
                  <div className="card-body p-4">
                    {/* Header row */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0"
                        style={{
                          width: 42,
                          height: 42,
                          backgroundColor: "var(--wa-success-soft)",
                          color: "var(--wa-success)",
                          fontSize: 15,
                        }}
                      >
                        {getInitials(dashboardUser.name || dashboardUser.email)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="fw-bold text-truncate"
                          style={{ color: "var(--wa-text-primary)", fontSize: 14 }}
                        >
                          {roleLabel(dashboardUser.role)}
                        </div>
                        <div
                          className="text-truncate"
                          style={{ fontSize: 12, color: "var(--wa-text-secondary)" }}
                        >
                          {dashboardUser.phone || "System Account"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.location.assign("/Settings")}
                        className="btn d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                        style={{
                          width: 34,
                          height: 34,
                          backgroundColor: "var(--wa-bg-light)",
                          color: "var(--wa-text-secondary)",
                          border: "1px solid var(--wa-border-light)",
                          padding: 0,
                        }}
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </div>

                    <div
                      className="fw-semibold text-truncate mb-1"
                      style={{ color: "var(--wa-success)", fontSize: 14 }}
                    >
                      {dashboardUser.email || dashboardUser.name || "Account"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--wa-text-secondary)", marginBottom: 14 }}>
                      Dashboard access · {formatNumber(metrics.users)} users visible
                    </div>

                    {/* Stats */}
                    <div style={{ borderTop: "1px solid var(--wa-border-light)", paddingTop: 10 }}>
                      {profileStats.map((row, i) => (
                        <div
                          key={row.label}
                          className="d-flex justify-content-between align-items-center py-2"
                          style={{
                            borderBottom:
                              i < profileStats.length - 1
                                ? "1px solid var(--wa-border-light)"
                                : "none",
                          }}
                        >
                          <span style={{ fontSize: 13, color: "var(--wa-text-secondary)" }}>
                            {row.label}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--wa-text-primary)",
                            }}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn w-100 mt-3 rounded-3 fw-semibold d-flex align-items-center justify-content-center gap-1"
                      onClick={() => window.location.assign("/Settings")}
                      style={{
                        backgroundColor: "var(--wa-bg-light)",
                        color: "var(--wa-text-secondary)",
                        border: "1px solid var(--wa-border-light)",
                        fontSize: 13,
                        padding: "8px 0",
                      }}
                    >
                      Manage account <FiChevronRight size={13} />
                    </button>
                  </div>
                </motion.div>

                {/* ── Messages & Campaigns ── */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  custom={6}
                  className="wa-card card border-0 shadow-sm rounded-4"
                  style={{
                    backgroundColor: "var(--wa-bg-card)",
                    display: canViewCampaignTools ? undefined : "none",
                  }}
                >
                  <div className="card-body p-4">
                    <h6
                      className="fw-bold mb-3"
                      style={{ color: "var(--wa-text-primary)", fontSize: 15 }}
                    >
                      Messages & campaigns
                    </h6>

                    {/* Big number */}
                    <div className="mb-3">
                      <div
                        className="fw-bold"
                        style={{
                          fontSize: 30,
                          color: "var(--wa-text-primary)",
                          lineHeight: 1.1,
                        }}
                      >
                        {formatNumber(messageTotal)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--wa-text-secondary)", marginTop: 2 }}>
                        Messages sent
                      </div>
                    </div>

                    {/* Stat rows */}
                    <div style={{ borderTop: "1px solid var(--wa-border-light)", paddingTop: 10 }}>
                      <div
                        className="d-flex justify-content-between align-items-center py-2"
                        style={{ borderBottom: "1px solid var(--wa-border-light)" }}
                      >
                        <span style={{ fontSize: 13, color: "var(--wa-text-secondary)" }}>
                          Total campaigns
                        </span>
                        <span
                          style={{ fontSize: 13, fontWeight: 600, color: "var(--wa-text-primary)" }}
                        >
                          {formatNumber(campaignTotal)}
                        </span>
                      </div>
                      <div
                        className="d-flex justify-content-between align-items-center py-2"
                        style={{ borderBottom: "1px solid var(--wa-border-light)" }}
                      >
                        <span style={{ fontSize: 13, color: "var(--wa-text-secondary)" }}>
                          Active campaigns
                        </span>
                        <span
                          className="rounded-pill px-2 py-1"
                          style={{
                            backgroundColor: "var(--wa-success-soft)",
                            color: "var(--wa-success)",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {formatNumber(activeCampaigns)} live
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span style={{ fontSize: 12, color: "var(--wa-text-secondary)" }}>
                          Campaign activity
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--wa-text-primary)",
                          }}
                        >
                          {campaignProgress}%
                        </span>
                      </div>
                      <div
                        className="rounded-pill overflow-hidden"
                        style={{ height: 7, backgroundColor: "var(--wa-success-soft)" }}
                      >
                        <div
                          className="rounded-pill"
                          style={{
                            height: "100%",
                            width: `${campaignProgress}%`,
                            backgroundColor: "var(--wa-success)",
                            transition: "width 1s ease",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--wa-text-secondary)", marginTop: 4 }}>
                        {formatNumber(activeCampaigns)} of {formatNumber(campaignTotal)} campaigns
                        active
                      </div>
                    </div>

                    {/* Footer row */}
                    <div
                      className="d-flex align-items-center justify-content-between mt-3 pt-3"
                      style={{ borderTop: "1px solid var(--wa-border-light)" }}
                    >
                      <div
                        className="d-flex align-items-center gap-1"
                        style={{ fontSize: 13, color: "var(--wa-text-secondary)" }}
                      >
                        <FiMessageCircle size={13} />
                        {formatNumber(metrics.chats)} active chats
                      </div>
                      <button
                        type="button"
                        onClick={() => window.location.assign("/Campaigns")}
                        className="btn rounded-3 fw-semibold px-3 py-1"
                        style={{
                          backgroundColor: "var(--wa-success)",
                          color: "#fff",
                          border: "none",
                          fontSize: 12,
                        }}
                      >
                        Broadcast
                      </button>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
