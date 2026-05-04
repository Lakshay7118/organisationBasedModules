"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence
import { Menu, Search, LogOut, Bell } from "lucide-react";

export default function Topbar({
  onMenuClick,
  onLogout,
  title = "Dashboard",
  hidden = false,
}) {
  if (hidden) return null;

  const topbarRef = useRef(null);
  const [searchValue, setSearchValue] = useState("");
  const [userName, setUserName] = useState("");
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  // ✅ Read user from localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName(user.name || user.phone || "");
      }
    } catch (e) {}
  }, []);

  // ✅ Also listen for login event so topbar updates without refresh
  useEffect(() => {
    const handleLoginChange = () => {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserName(user.name || user.phone || "");
        }
      } catch (e) {}
    };
    window.addEventListener("loginStatusChanged", handleLoginChange);
    return () =>
      window.removeEventListener("loginStatusChanged", handleLoginChange);
  }, []);

  const avatarInitial = userName?.charAt(0)?.toUpperCase() || "?";

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        topbarRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
    });
    return () => ctx.revert();
  }, []);

  const handleLogout = () => {
    setShowLogoutPopup(true);
  };

  const confirmLogout = () => {
    setShowLogoutPopup(false);
    if (onLogout) onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutPopup(false);
  };

  return (
    <>
      <header
        ref={topbarRef}
        style={{ width: "100%", marginBottom: "14px", boxSizing: "border-box" }}
      >
        {/* ===== MOBILE ===== */}
        <div
          className="flex md:hidden items-center gap-2"
          style={{ width: "100%" }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onMenuClick}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Menu size={18} color="#374151" />
          </motion.button>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0 12px",
              height: "40px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              gap: "8px",
            }}
          >
            <Search size={15} color="#9ca3af" />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "13px",
                background: "transparent",
                color: "#374151",
              }}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLogout}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#0b535d",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "15px",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(11,83,93,0.35)",
            }}
          >
            {avatarInitial}
          </motion.button>
        </div>

        {/* ===== DESKTOP ===== */}
        <div
          className="hidden md:flex items-center gap-3"
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "10px 16px",
            boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Hamburger */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={onMenuClick}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Menu size={17} color="#374151" />
          </motion.button>

          {/* Title */}
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#111827",
              flexShrink: 0,
            }}
          >
            {title}
          </span>

          {/* Divider */}
          <div
            style={{
              width: "1px",
              height: "22px",
              background: "#e2e8f0",
              flexShrink: 0,
            }}
          />

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#f8fafc",
              border: "1px solid #e9eef3",
              borderRadius: "12px",
              padding: "0 14px",
              height: "36px",
              gap: "8px",
              width: "280px",
              flexShrink: 0,
            }}
          >
            <Search size={14} color="#9ca3af" />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search chats..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "13px",
                background: "transparent",
                color: "#374151",
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Bell */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <Bell size={16} color="#374151" />
            <span
              style={{
                position: "absolute",
                top: "7px",
                right: "7px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#ef4444",
                border: "2px solid #fff",
              }}
            />
          </motion.button>

          {/* ✅ User chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f1f5f9",
              borderRadius: "12px",
              padding: "4px 12px 4px 4px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#0b535d",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              {avatarInitial}
            </div>
            <span
              style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}
            >
              {userName || "User"}
            </span>
          </div>

          {/* Logout */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleLogout}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#fff0f0",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <LogOut size={16} color="#ef4444" />
          </motion.button>
        </div>
      </header>

      {/* ===== LOGOUT CONFIRMATION MODAL ===== */}
      <AnimatePresence>
  {showLogoutPopup && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={cancelLogout}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "36px 28px 28px",
          width: "100%",
          maxWidth: 360,
          boxShadow: "0 32px 64px rgba(15,23,42,0.2)",
          textAlign: "center",
        }}
      >
        {/* Icon circle */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg, #fff0f0 0%, #ffe4e4 100%)",
          border: "2px solid #fecaca",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <LogOut size={26} color="#ef4444" />
        </div>

        {/* Title */}
        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
          Sign out?
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.6, marginBottom: 28, padding: "0 8px" }}>
          You will be logged out of your account. You can sign back in anytime.
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f1f5f9", marginBottom: 20 }} />

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={confirmLogout}
            style={{
              width: "100%", padding: "12px 0",
              borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#fff", fontSize: "0.95rem", fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8,
              boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <LogOut size={16} />
            Yes, Logout
          </button>

          <button
            onClick={cancelLogout}
            style={{
              width: "100%", padding: "12px 0",
              borderRadius: 14,
              border: "1.5px solid #e2e8f0",
              background: "#f8fafc",
              color: "#374151", fontSize: "0.95rem", fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
            onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
    </>
  );
}