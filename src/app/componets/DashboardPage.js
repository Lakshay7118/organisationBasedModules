"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiEdit2,
  FiGift,
  FiGrid,
  FiInfo,
  FiMessageCircle,
  FiSmartphone,
  FiUser,
  FiZap,
} from "react-icons/fi";

/* ─── Skeleton helpers (unchanged) ─── */
const skeletonStyle = {
  position: "relative",
  overflow: "hidden",
  backgroundColor: "var(--wa-skeleton-base, #e8f0ee)",
  borderRadius: 8,
};

const shimmerKeyframes = `
@keyframes wa-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

function Skeleton({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div className="wa-skeleton-block" style={{ ...skeletonStyle, width, height, borderRadius: radius, flexShrink: 0, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 0%, var(--skeleton-highlight) 50%, transparent 100%)",
          animation: "wa-shimmer 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════
   SKELETON VARIANTS (same structure, not changed)
═══════════════════════════════════════════════ */
function HeroBannerSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-skeleton-base, #e8f0ee)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={180} height={32} radius={999} style={{ marginBottom: 16 }} />
        <Skeleton width="70%" height={22} style={{ marginBottom: 10 }} />
        <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="60%" height={14} style={{ marginBottom: 24 }} />
        <Skeleton width={140} height={40} radius={10} />
      </div>
    </div>
  );
}

function StatusCardSkeleton() {
  return (
    <div className="col-12 col-md-4">
      <div
        className="card border-0 shadow-sm rounded-4 h-100"
        style={{ backgroundColor: "var(--wa-bg-card)" }}
      >
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <Skeleton width={44} height={44} radius={10} />
            <Skeleton width={30} height={30} radius={999} />
          </div>
          <Skeleton width="60%" height={13} style={{ marginBottom: 12 }} />
          <Skeleton width={80} height={32} radius={999} />
        </div>
      </div>
    </div>
  );
}

function AccessCodeSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <div className="row align-items-center g-3">
          <div className="col-auto">
            <Skeleton width={56} height={56} radius={14} />
          </div>
          <div className="col-12 col-lg">
            <Skeleton width="50%" height={18} style={{ marginBottom: 8 }} />
            <Skeleton width="80%" height={13} />
          </div>
          <div className="col-12 col-md-7 col-lg-4">
            <Skeleton height={50} radius={10} />
          </div>
          <div className="col-12 col-md-5 col-lg-auto" style={{ minWidth: 100 }}>
            <Skeleton height={50} radius={10} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepsBannerSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
      data-skeleton-panel="true"
      style={{ backgroundColor: "var(--wa-skeleton-base, #e8f0ee)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={320} height={32} radius={999} style={{ marginBottom: 20 }} />
        <div className="row g-3">
          {[0, 1, 2, 3].map((i) => (
            <div className="col-12 col-sm-6 col-lg-3" key={i}>
              <div
                className="h-100 rounded-4 p-3"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Skeleton width={34} height={34} radius={999} />
                  <Skeleton width={70} height={24} radius={999} />
                </div>
                <Skeleton width="50%" height={12} style={{ marginBottom: 8 }} />
                <Skeleton width="80%" height={16} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupCardSkeleton() {
  return (
    <div className="card border-0 shadow-sm rounded-4" style={{ backgroundColor: "var(--wa-bg-card)" }}>
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div className="d-flex align-items-center gap-2">
            <Skeleton width={36} height={36} radius={999} />
            <Skeleton width={220} height={20} />
          </div>
          <Skeleton width={80} height={16} />
        </div>
        <div
          className="rounded-4 p-3 p-lg-4"
          style={{ backgroundColor: "var(--wa-success-soft)" }}
        >
          <div className="row align-items-center g-3">
            <div className="col-auto">
              <Skeleton width={60} height={32} radius={999} />
            </div>
            <div className="col-12 col-md">
              <div className="d-flex align-items-center gap-3">
                <Skeleton width={48} height={48} radius={999} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="55%" height={16} style={{ marginBottom: 8 }} />
                  <Skeleton width="75%" height={12} />
                </div>
              </div>
            </div>
            <div className="col-12 col-md-auto">
              <Skeleton width={110} height={40} radius={10} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileAppSkeleton() {
  // Will be reused for "Recent Activity" skeleton in loading state (kept as placeholder)
  return (
    <div
      className="card border-0 shadow-sm rounded-4"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={160} height={18} style={{ marginBottom: 16 }} />
        <div
          className="rounded-4 p-3 mb-3"
          style={{ backgroundColor: "var(--wa-bg-light)" }}
        >
          <div className="row g-3 align-items-center">
            <div className="col-12 col-sm-6 text-center">
              <Skeleton width={150} height={150} radius={14} style={{ margin: "0 auto" }} />
            </div>
            <div className="col-12 col-sm-6">
              <Skeleton height={42} radius={10} style={{ marginBottom: 10 }} />
              <Skeleton height={42} radius={10} />
            </div>
          </div>
        </div>
        <Skeleton width={100} height={12} radius={4} style={{ margin: "12px auto" }} />
        <div className="row g-2">
          {[0, 1, 2, 3].map((i) => (
            <div className="col-12 col-sm-6" key={i}>
              <div
                className="d-flex align-items-center gap-2 rounded-3 p-2"
                style={{ backgroundColor: "var(--wa-bg-light)" }}
              >
                <Skeleton width={30} height={30} radius={999} />
                <Skeleton width="70%" height={13} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div style={{ flex: 1 }}>
            <Skeleton width="65%" height={18} style={{ marginBottom: 8 }} />
            <Skeleton width={110} height={13} />
          </div>
          <Skeleton width={38} height={38} radius={999} />
        </div>
        <Skeleton width={180} height={28} radius={6} style={{ marginBottom: 10 }} />
        <Skeleton width="90%" height={13} style={{ marginBottom: 24 }} />
        <Skeleton width={100} height={16} />
      </div>
    </div>
  );
}

function CreditsCardSkeleton() {
  return (
    <div
      className="card border-0 shadow-sm rounded-4"
      style={{ backgroundColor: "var(--wa-bg-card)" }}
    >
      <div className="card-body p-4">
        <Skeleton width={180} height={16} style={{ marginBottom: 10 }} />
        <Skeleton height={10} radius={999} style={{ marginBottom: 8 }} />
        <div className="d-flex justify-content-between mb-4">
          <Skeleton width={20} height={12} />
          <Skeleton width={60} height={12} />
        </div>
        <Skeleton width={220} height={16} style={{ marginBottom: 16 }} />
        <div className="d-flex justify-content-between align-items-center gap-3">
          <Skeleton width={90} height={36} radius={6} />
          <Skeleton width={110} height={42} radius={10} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   REAL DATA (adapted to internal chat)
═══════════════════════════════════════════ */
const statusCards = [
  {
    title: "Total Users",
    value: "128",
    type: "text",
    textColor: "var(--wa-success)",
    icon: <FiUser size={18} />,
  },
  {
    title: "Open Tasks",
    value: "14",
    type: "text",
    textColor: "var(--wa-warning)",
    icon: <FiActivity size={18} />,
  },
  {
    title: "Active Templates",
    value: "6",
    type: "text",
    textColor: "var(--wa-info, #0d6efd)",
    icon: <FiGrid size={18} />,
  },
];

// Task status breakdown (replaces WhatsApp steps)
const taskStatuses = [
  { label: "Pending", count: 5, color: "var(--wa-warning)", bg: "var(--wa-warning-soft)", icon: <FiClock size={16} /> },
  { label: "In Progress", count: 8, color: "var(--wa-info, #0d6efd)", bg: "#e7f1ff", icon: <FiZap size={16} /> },
  { label: "Completed", count: 127, color: "var(--wa-success)", bg: "var(--wa-success-soft)", icon: <FiCheckCircle size={16} /> },
  { label: "Overdue", count: 2, color: "var(--wa-danger, #dc3545)", bg: "#fce8e8", icon: <FiClock size={16} /> },
];

// Quick links / recent chats (replaces mobile app + features)
const quickLinks = [
  { label: "Create User", icon: <FiUser size={15} />, color: "var(--wa-success)" },
  { label: "New Template", icon: <FiGrid size={15} />, color: "var(--wa-primary, #0d6efd)" },
  { label: "Assign Task", icon: <FiCheckCircle size={15} />, color: "var(--wa-warning)" },
  { label: "Broadcast Message", icon: <FiMessageCircle size={15} />, color: "var(--wa-info, #0d6efd)" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" },
  }),
};

/* ════════════════════════════════════════════
   MAIN DASHBOARD PAGE
═══════════════════════════════════════════ */
export default function DashboardPage() {
  const rootRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".wa-card",
        { opacity: 0, y: 24, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.08, ease: "power3.out" }
      );
    }, rootRef);
    return () => ctx.revert();
  }, [isLoading]);

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <style>{`
        body[data-theme="dark"] .dashboard-page {
          --wa-skeleton-base: #1f2c34;
          --skeleton-highlight: rgba(134, 150, 160, 0.24);
        }
        body[data-theme="dark"] .dashboard-page .wa-skeleton-block {
          background-color: #1f2c34 !important;
        }
        body[data-theme="dark"] .dashboard-page [data-skeleton-panel="true"] {
          background-color: #111b21 !important;
        }
        body[data-theme="dark"] .dashboard-page .card {
          background-color: #111b21 !important;
          border-color: #2a3942 !important;
        }
        body[data-theme="dark"] .dashboard-page [style*="background: rgba(255,255,255,0.12)"],
        body[data-theme="dark"] .dashboard-page [style*="background: rgba(255,255,255,0.1)"],
        body[data-theme="dark"] .dashboard-page [style*="background-color: rgba(255, 255, 255, 0.12)"] {
          background: #202c33 !important;
          background-color: #202c33 !important;
        }
      `}</style>

      <div
        ref={rootRef}
        className="dashboard-page container-fluid py-3 py-lg-4"
        style={{
          minHeight: "100vh",
          background: `linear-gradient(
            180deg,
            var(--wa-bg-page-top) 0%,
            var(--wa-bg-page-mid) 35%,
            var(--wa-bg-page-bottom) 100%
          )`,
        }}
      >
        {isLoading ? (
          /* Skeleton loading (unchanged) */
          <div className="row g-4">
            <div className="col-12 col-xl-8">
              <HeroBannerSkeleton />
              <div className="row g-3 mb-4">
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
          /* ── REAL CONTENT (remodeled) ── */
          <div className="row g-4">
            {/* LEFT COLUMN */}
            <div className="col-12 col-xl-8">
              {/* Hero banner */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={1}
                className="wa-card card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
                style={{ backgroundColor: "var(--wa-bg-card)" }}
              >
                <div
                  className="card-body p-4 p-lg-4"
                  style={{ background: "var(--wa-gradient-primary)" }}
                >
                  <div className="row align-items-center g-3">
                    <div className="col-12 col-lg">
                      <div
                        className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-2 small fw-semibold mb-3"
                        style={{
                          background: "rgba(255,255,255,0.25)",
                          color: "var(--wa-text-white)",
                        }}
                      >
                        <FiMessageCircle size={16} />
                        Internal Communication Hub
                      </div>
                      <h3 className="fw-bold mb-2" style={{ color: "var(--wa-text-white)" }}>
                        Manage your team, tasks, and templates
                      </h3>
                      <p className="mb-0" style={{ color: "var(--wa-text-muted-white)" }}>
                        Create users, assign work, chat instantly, and send template‑based messages all in one place.
                      </p>
                    </div>
                    <div className="col-12 col-lg-auto">
                      <button
                        className="btn fw-semibold rounded-3 px-4 py-2"
                        style={{
                          backgroundColor: "var(--wa-btn-light)",
                          color: "var(--wa-btn-light-text)",
                          border: "none",
                        }}
                      >
                        Quick Actions
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Status cards */}
              <div className="row g-3 mb-4">
                {statusCards.map((item, index) => (
                  <div className="col-12 col-md-4" key={index}>
                    <motion.div
                      custom={index + 2}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      whileHover={{ y: -5 }}
                      className="wa-card card border-0 shadow-sm rounded-4 h-100"
                      style={{ backgroundColor: "var(--wa-bg-card)" }}
                    >
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div
                            className="d-inline-flex align-items-center justify-content-center rounded-3"
                            style={{
                              width: 44,
                              height: 44,
                              backgroundColor: "var(--wa-success-soft)",
                              color: item.textColor,
                            }}
                          >
                            {item.icon}
                          </div>
                          <div
                            className="d-inline-flex align-items-center justify-content-center rounded-circle"
                            style={{
                              width: 30,
                              height: 30,
                              backgroundColor: "var(--wa-icon-circle-bg)",
                              color: "var(--wa-icon-circle-text)",
                            }}
                          >
                            <FiInfo size={14} />
                          </div>
                        </div>
                        <div className="small fw-medium mb-2" style={{ color: "var(--wa-text-secondary)" }}>
                          {item.title}
                        </div>
                        <h3 className="mb-0 fw-bold" style={{ color: item.textColor }}>
                          {item.value}
                        </h3>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* Quick Invite User (replaces Access Code) */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={5}
                whileHover={{ y: -4 }}
                className="wa-card card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
                style={{ backgroundColor: "var(--wa-bg-card)" }}
              >
                <div className="card-body p-4">
                  <div className="row align-items-center g-3">
                    <div className="col-auto">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-4"
                        style={{
                          width: 56,
                          height: 56,
                          background: "var(--wa-gradient-primary)",
                          color: "var(--wa-text-white)",
                        }}
                      >
                        <FiUser size={24} />
                      </div>
                    </div>
                    <div className="col-12 col-lg">
                      <h5 className="fw-bold mb-1" style={{ color: "var(--wa-text-primary)" }}>
                        Quick Invite User
                      </h5>
                      <p className="mb-0" style={{ color: "var(--wa-text-secondary)" }}>
                        Add a new team member by entering their email address.
                      </p>
                    </div>
                    <div className="col-12 col-md-7 col-lg-4">
                      <input
                        type="email"
                        className="form-control rounded-3 shadow-none"
                        placeholder="email@company.com"
                        style={{ minHeight: 50, borderColor: "var(--wa-border-light)" }}
                      />
                    </div>
                    <div className="col-12 col-md-5 col-lg-auto">
                      <button
                        className="btn w-100 rounded-3 fw-semibold px-4"
                        style={{
                          minHeight: 50,
                          backgroundColor: "var(--wa-success)",
                          color: "var(--wa-text-white)",
                          border: "none",
                        }}
                      >
                        Send Invite
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Task Status Overview (replaces Steps banner) */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={6}
                whileHover={{ y: -4 }}
                className="wa-card card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
              >
                <div className="card-body p-4" style={{ background: "var(--wa-gradient-primary)" }}>
                  <div
                    className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-2 mb-4 fw-semibold"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid var(--wa-border-soft)",
                      color: "var(--wa-text-white)",
                    }}
                  >
                    <FiCheckCircle size={16} />
                    Task Status Overview
                  </div>
                  <div className="row g-3">
                    {taskStatuses.map((item, index) => (
                      <div className="col-6 col-sm-6 col-lg-3" key={index}>
                        <div
                          className="h-100 rounded-4 p-3"
                          style={{
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid var(--wa-border-soft)",
                          }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: 34,
                                height: 34,
                                backgroundColor: item.bg,
                                color: item.color,
                              }}
                            >
                              {item.icon}
                            </div>
                            <span
                              className="fw-bold"
                              style={{ color: "var(--wa-text-white)" }}
                            >
                              {item.count}
                            </span>
                          </div>
                          <div className="small fw-medium" style={{ color: "var(--wa-text-soft-white)" }}>
                            {item.label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Create Template / Assign Task card (replaces Setup card) */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={7}
                whileHover={{ y: -4 }}
                className="wa-card card border-0 shadow-sm rounded-4"
                style={{ backgroundColor: "var(--wa-bg-card)" }}
              >
                <div className="card-body p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-inline-flex align-items-center justify-content-center rounded-circle"
                        style={{
                          width: 36,
                          height: 36,
                          backgroundColor: "var(--wa-success-soft)",
                          color: "var(--wa-success)",
                        }}
                      >
                        <FiCheckCircle size={18} />
                      </div>
                      <h5 className="mb-0 fw-bold" style={{ color: "var(--wa-text-primary)" }}>
                        Template & Task Manager
                      </h5>
                    </div>
                    <span className="fw-medium" style={{ color: "var(--wa-text-secondary)" }}>
                      Last updated 10 min ago
                    </span>
                  </div>
                  <div
                    className="rounded-4 border p-3 p-lg-4"
                    style={{
                      backgroundColor: "var(--wa-success-soft)",
                      borderColor: "var(--wa-border-light)",
                    }}
                  >
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <button
                          className="btn w-100 rounded-3 fw-semibold py-3"
                          style={{
                            backgroundColor: "var(--wa-bg-card)",
                            color: "var(--wa-text-primary)",
                            border: "1px solid var(--wa-border-light)",
                          }}
                        >
                          <FiGrid className="me-2" /> Create New Template
                        </button>
                      </div>
                      <div className="col-12 col-md-6">
                        <button
                          className="btn w-100 rounded-3 fw-semibold py-3"
                          style={{
                            backgroundColor: "var(--wa-bg-card)",
                            color: "var(--wa-text-primary)",
                            border: "1px solid var(--wa-border-light)",
                          }}
                        >
                          <FiCheckCircle className="me-2" /> Assign Task
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-12 col-xl-4">
              <div className="d-flex flex-column gap-4">
                {/* Quick Links & Recent Activity (replaces Mobile App card) */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  custom={3}
                  whileHover={{ y: -4 }}
                  className="wa-card card border-0 shadow-sm rounded-4"
                  style={{ backgroundColor: "var(--wa-bg-card)" }}
                >
                  <div className="card-body p-4">
                    <h6 className="fw-bold mb-3" style={{ color: "var(--wa-text-primary)" }}>
                      Quick Actions
                    </h6>
                    <div className="row g-2">
                      {quickLinks.map((item, i) => (
                        <div className="col-12 col-sm-6" key={i}>
                          <motion.div
                            whileHover={{ x: 4 }}
                            className="d-flex align-items-center gap-2 rounded-3 p-2 h-100"
                            style={{ backgroundColor: "var(--wa-bg-light)", cursor: "pointer" }}
                          >
                            <span
                              className="d-inline-flex align-items-center justify-content-center rounded-circle"
                              style={{
                                width: 30,
                                height: 30,
                                backgroundColor: "var(--wa-success-soft)",
                                color: item.color,
                              }}
                            >
                              {item.icon}
                            </span>
                            <span className="small fw-medium" style={{ color: "var(--wa-text-primary)" }}>
                              {item.label}
                            </span>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                    <hr className="my-3" style={{ borderColor: "var(--wa-border-light)" }} />
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold small" style={{ color: "var(--wa-text-primary)" }}>
                        Recent Activity
                      </span>
                      <span className="small" style={{ color: "var(--wa-text-secondary)" }}>Today</span>
                    </div>
                    <ul className="list-unstyled mb-0" style={{ fontSize: "0.85rem" }}>
                      <li className="mb-2" style={{ color: "var(--wa-text-secondary)" }}>
                        <FiUser className="me-2" size={14} /> John invited to Sales team
                      </li>
                      <li className="mb-2" style={{ color: "var(--wa-text-secondary)" }}>
                        <FiCheckCircle className="me-2" size={14} /> Task “Follow‑up” marked done
                      </li>
                      <li className="mb-2" style={{ color: "var(--wa-text-secondary)" }}>
                        <FiMessageCircle className="me-2" size={14} /> Template “Welcome” sent to 45 users
                      </li>
                    </ul>
                  </div>
                </motion.div>

                {/* Admin Profile card (unchanged structure, new text) */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  custom={4}
                  whileHover={{ y: -4 }}
                  className="wa-card card border-0 shadow-sm rounded-4"
                  style={{ backgroundColor: "var(--wa-bg-card)" }}
                >
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="fw-bold mb-1" style={{ color: "var(--wa-text-primary)" }}>
                          Super Admin
                        </h6>
                        <div className="small" style={{ color: "var(--wa-text-secondary)" }}>
                          Internal System Account
                        </div>
                      </div>
                      <button
                        className="btn rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: 38,
                          height: 38,
                          backgroundColor: "var(--wa-bg-light)",
                          color: "var(--wa-text-primary)",
                          border: "none",
                        }}
                      >
                        <FiEdit2 size={16} />
                      </button>
                    </div>
                    <h4 className="fw-bold mb-2" style={{ color: "var(--wa-success)" }}>
                      admin@company.com
                    </h4>
                    <p className="small mb-4" style={{ color: "var(--wa-text-secondary)" }}>
                      Dashboard access • Full control
                    </p>
                    <button
                      className="btn btn-link fw-semibold p-0 text-decoration-none"
                      style={{ color: "var(--wa-success)" }}
                    >
                      Manage Account <FiChevronRight className="ms-1" />
                    </button>
                  </div>
                </motion.div>

                {/* Message Quota card (replaces Credits) */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  custom={5}
                  whileHover={{ y: -4 }}
                  className="wa-card card border-0 shadow-sm rounded-4"
                  style={{ backgroundColor: "var(--wa-bg-card)" }}
                >
                  <div className="card-body p-4">
                    <div className="fw-semibold mb-2" style={{ color: "var(--wa-text-primary)" }}>
                      Monthly Message Quota
                    </div>
                    <div
                      className="progress mb-2"
                      style={{
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: "var(--wa-success-soft)",
                      }}
                    >
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: "43%", backgroundColor: "var(--wa-success)" }}
                      />
                    </div>
                    <div className="d-flex justify-content-between small mb-4" style={{ color: "var(--wa-text-secondary)" }}>
                      <span>0</span>
                      <span>10,000</span>
                    </div>
                    <div className="fw-semibold mb-3" style={{ color: "var(--wa-text-primary)" }}>
                      Plan: Business Pro
                    </div>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                      <h2 className="mb-0 fw-bold" style={{ color: "var(--wa-text-primary)" }}>
                        4,300 / 10,000
                      </h2>
                      <button
                        className="btn rounded-3 fw-semibold px-4"
                        style={{
                          backgroundColor: "var(--wa-success)",
                          color: "var(--wa-text-white)",
                          border: "none",
                        }}
                      >
                        Upgrade Plan
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
