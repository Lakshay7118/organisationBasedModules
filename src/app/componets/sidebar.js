"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageCircleMore,
  Settings,
  Users,
} from "lucide-react";

const allNavItems = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    id: "organizations",
    label: "Orgs",
    path: "/organizations",
    icon: Building2,
    allowedRoles: ["super_to_super_admin"],
  },
  { id: "live-chat", label: "Live Chat", path: "/live-chat", icon: MessageCircleMore, module: "chat" },
  { id: "task", label: "Task", path: "/task", icon: CheckSquare, module: "task" },
  { id: "contacts", label: "Contacts", path: "/contacts", icon: Users },
  {
    id: "hr",
    label: "HR",
    path: "/HR",
    icon: Briefcase,
    allowedRoles: ["super_to_super_admin", "super_admin", "manager", "hr", "user"],
    module: "hr",
    selfAccessRoles: ["user"],
  },
  {
    id: "campaigns",
    label: "Campaigns",
    path: "/Campaigns",
    icon: Megaphone,
    allowedRoles: ["super_to_super_admin", "super_admin", "manager"],
    module: "chat",
  },
  {
    id: "Template",
    label: "Template",
    path: "/Template",
    icon: FileText,
    allowedRoles: ["super_to_super_admin", "super_admin", "manager"],
    module: "chat",
  },
  { id: "settings", label: "Settings", path: "/Settings", icon: Settings },
];

const readStoredUser = () => {
  if (typeof window === "undefined") return { name: "", role: "", allowedModules: [] };

  try {
    const role = localStorage.getItem("role");
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : {};
    return {
      name: user.name || user.phone || "",
      role: role || user.role || "",
      allowedModules: Array.isArray(user.allowedModules) ? user.allowedModules : [],
    };
  } catch {
    return { name: "", role: "", allowedModules: [] };
  }
};

const canUseModule = (item, userRole, allowedModules) => {
  if (!item.module) return true;
  if (userRole === "super_to_super_admin") return true;
  if (item.selfAccessRoles?.includes(userRole)) return true;
  return allowedModules.includes(item.module);
};

export default function Sidebar({ isOpen, setIsOpen }) {
  const router = useRouter();
  const pathname = usePathname();

  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [userRole, setUserRole] = useState(() => readStoredUser().role);
  const [userName, setUserName] = useState(() => readStoredUser().name);
  const [allowedModules, setAllowedModules] = useState(() => readStoredUser().allowedModules);

  const sidebarRef = useRef(null);
  const logoRef = useRef(null);
  const itemRefs = useRef([]);
  const profileRef = useRef(null);

  const syncStoredUser = useCallback(() => {
    const stored = readStoredUser();
    setUserName(stored.name);
    setUserRole(stored.role);
    setAllowedModules(stored.allowedModules);
  }, []);

  useEffect(() => {
    window.addEventListener("storage", syncStoredUser);
    window.addEventListener("loginStatusChanged", syncStoredUser);
    return () => {
      window.removeEventListener("storage", syncStoredUser);
      window.removeEventListener("loginStatusChanged", syncStoredUser);
    };
  }, [syncStoredUser]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(sidebarRef.current, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
      gsap.fromTo(logoRef.current, { y: -14, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, delay: 0.1 });
      gsap.fromTo(itemRefs.current, { x: -12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, stagger: 0.06, delay: 0.18, ease: "power2.out" });
      gsap.fromTo(profileRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, delay: 0.3 });
    }, sidebarRef);
    return () => ctx.revert();
  }, []);

  const sidebarItems = allNavItems.filter(
    (item) => (!item.allowedRoles || item.allowedRoles.includes(userRole)) &&
      canUseModule(item, userRole, allowedModules)
  );

  const renderSidebarContent = () => (
    <aside
      ref={sidebarRef}
      className="app-sidebar-shell"
      style={{
        width: "84px",
        height: "calc(100dvh - 32px)",
        maxHeight: "calc(100dvh - 32px)",
        background: "linear-gradient(180deg, #083c43 0%, #0b535d 100%)",
        borderRadius: "22px",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 8px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0, flex: 1 }}>
        <motion.div
          ref={logoRef}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: "15px",
            marginBottom: "10px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          W
        </motion.div>

        <div style={{ width: "34px", height: "1px", background: "rgba(255,255,255,0.14)", marginBottom: "8px", flexShrink: 0 }} />

        <nav
          className="app-sidebar-nav"
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0,
            flex: 1,
            paddingRight: 0,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {sidebarItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            const isHovered = hoveredIcon === item.id;

            return (
              <button
                key={item.id}
                ref={(el) => (itemRefs.current[index] = el)}
                onClick={() => {
                  router.push(item.path);
                  setIsOpen(false);
                }}
                title={item.label}
                style={{
                  width: "64px",
                  minHeight: "52px",
                  border: "none",
                  borderRadius: "14px",
                  background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  position: "relative",
                  padding: 0,
                  transition: "background 0.2s ease",
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "10px",
                      bottom: "10px",
                      width: "3px",
                      borderRadius: "0 4px 4px 0",
                      background: "#ffffff",
                    }}
                  />
                )}
                <motion.div
                  onMouseEnter={() => setHoveredIcon(item.id)}
                  onMouseLeave={() => setHoveredIcon(null)}
                  whileHover={{ scale: 1.18 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Icon size={17} strokeWidth={2.2} color={isActive || isHovered ? "#ffffff" : "rgba(255,255,255,0.58)"} />
                </motion.div>
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: isActive ? 700 : 500,
                    lineHeight: 1.1,
                    textAlign: "center",
                    letterSpacing: "0.1px",
                    color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.58)",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, paddingTop: 8 }}>
        {userRole && (
          <span
            style={{
              fontSize: "7px",
              fontWeight: 800,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.5px",
              textAlign: "center",
            }}
          >
              {userRole === "super_to_super_admin" ? "Owner" : userRole === "super_admin" ? "Admin" : userRole}
          </span>
        )}
        <motion.div
          ref={profileRef}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#f3f4f6",
            color: "#0b4b53",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "14px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.16)",
            cursor: "pointer",
          }}
        >
          {userName ? userName.charAt(0).toUpperCase() : "?"}
        </motion.div>
      </div>
    </aside>
  );

  return (
    <>
      <style>{`
        .app-sidebar-nav::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="hidden md:block" style={{ position: "fixed", top: 12, left: 12, zIndex: 1000 }}>
        {renderSidebarContent()}
      </div>

      <motion.div
        className="block md:hidden"
        initial={false}
        animate={{ x: isOpen ? 0 : -130, opacity: isOpen ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 1000,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {renderSidebarContent()}
      </motion.div>
    </>
  );
}
