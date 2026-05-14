"use client";

import "./globals.css";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./componets/sidebar";
import Topbar from "./componets/Topbar";
import BottomTabs from "./componets/BottomTabs";
import "bootstrap/dist/css/bootstrap.min.css";

const PALETTE = [
  "#6366f1","#f43f5e","#f59e0b","#10b981","#3b82f6",
  "#8b5cf6","#ec4899","#06b6d4"
];
const userColor   = (id = "") =>
  PALETTE[parseInt(("0000" + id).slice(-4), 16) % PALETTE.length];
const userInitial = (name = "") => (name || "?").trim().charAt(0).toUpperCase();
const enrichUser  = (u) => {
  if (!u) return null;
  const id = u._id?.toString?.() || u.id || "";
  return { ...u, id, initial: userInitial(u.name), color: userColor(id) };
};

export default function RootLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile]         = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);
  const [currentUser, setCurrentUser]   = useState(null);
  const [theme, setTheme]               = useState("light");

  const pathname = usePathname();
  const router   = useRouter();
  const activeTab = pathname?.split("/")[1] || "dashboard";

  const checkLoginStatus = useCallback(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      if (pathname !== "/") router.push("/");
    } else {
      try {
        const parsed = JSON.parse(user);
        setCurrentUser(enrichUser(parsed));
      } catch {
        setCurrentUser({ name: "User", initial: "?", color: "#6b7280" });
      }
      setIsLoggedIn(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    // localStorage is the app's auth source, so this effect reconciles layout state after route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkLoginStatus();
  }, [checkLoginStatus]);

  useEffect(() => {
    const applyTheme = (nextTheme) => {
      const safeTheme = nextTheme === "dark" ? "dark" : "light";
      setTheme(safeTheme);
      document.documentElement.dataset.theme = safeTheme;
      document.body.dataset.theme = safeTheme;
    };

    applyTheme(localStorage.getItem("settingsTheme") || "light");

    const onStorage = (event) => {
      if (event.key === "settingsTheme") applyTheme(event.newValue || "light");
    };
    const onThemeChanged = (event) => applyTheme(event.detail || localStorage.getItem("settingsTheme") || "light");

    window.addEventListener("storage", onStorage);
    window.addEventListener("settingsThemeChanged", onThemeChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("settingsThemeChanged", onThemeChanged);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("storage", checkLoginStatus);
    window.addEventListener("loginStatusChanged", checkLoginStatus);
    return () => {
      window.removeEventListener("storage", checkLoginStatus);
      window.removeEventListener("loginStatusChanged", checkLoginStatus);
    };
  }, [checkLoginStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      const user = localStorage.getItem("user");
      if (!user) {
        setIsLoggedIn(false);
        setCurrentUser(null);
        if (pathname !== "/") router.push("/");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pathname, router]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ✅ Single source of truth for chat open/close


useEffect(() => {
  const onOpen  = () => {
    console.log("detailViewOpen fired"); // ✅ add this to confirm event fires
    setChatOpen(true);
  };
  const onClose = () => {
    console.log("detailViewClose fired");
    setChatOpen(false);
  };
  window.addEventListener("detailViewOpen",  onOpen);
  window.addEventListener("detailViewClose", onClose);
  return () => {
    window.removeEventListener("detailViewOpen",  onOpen);
    window.removeEventListener("detailViewClose", onClose);
  };
}, []);

  // ✅ Both Topbar and BottomTabs use this same value
  const hideChrome = isMobile && chatOpen;

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setCurrentUser(null);
    router.push("/");
    window.dispatchEvent(new Event("loginStatusChanged"));
  };

  const titleMap = {
    dashboard:      "Dashboard",
    "live-chat":    "Live Chat",
    history:        "History",
    contacts:       "Contacts",
    campaigns:      "Campaigns",
    "ads-manager":  "Ads Manager",
    flows:          "Flows",
    manage:         "Manage",
    developer:      "Developer",
    "all-projects": "All Projects",
    Settings:       "Settings",
    settings:       "Settings",
  };

  if (!isLoggedIn) {
    return (
      <html lang="en" data-theme={theme}>
        <body
          data-theme={theme}
          style={{
            margin: 0,
            background: "var(--app-bg)",
            color: "var(--app-text)",
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            overflowY: "auto",
          }}
        >
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en" data-theme={theme}>
      <body
        data-theme={theme}
        style={{
          margin: 0,
          background: "var(--app-bg)",
          color: "var(--app-text)",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          overflowY: "auto",
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            .main-content {
              margin-left: 108px !important;
            }
          }
          body[data-theme="dark"] .bg-white,
          body[data-theme="dark"] .bg-light {
            background-color: var(--app-surface) !important;
            color: var(--app-text) !important;
          }
          body[data-theme="dark"] .text-dark,
          body[data-theme="dark"] .text-black {
            color: var(--app-text) !important;
          }
          body[data-theme="dark"] .text-muted,
          body[data-theme="dark"] .text-secondary {
            color: var(--app-text-muted) !important;
          }
          body[data-theme="dark"] .border,
          body[data-theme="dark"] .border-top,
          body[data-theme="dark"] .border-end,
          body[data-theme="dark"] .border-bottom,
          body[data-theme="dark"] .border-start {
            border-color: var(--app-border) !important;
          }
        `}</style>

        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 998,
            }}
            className="md:hidden"
          />
        )}

        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <main
          className="main-content"
          style={{
            marginLeft: 0,
            minHeight: "100vh",
            padding: "14px 10px 0px 10px",
            paddingBottom: isMobile ? "74px" : "14px",
            boxSizing: "border-box",
          }}
        >
          <Topbar
            hidden={hideChrome}
            title={titleMap[activeTab] || "Dashboard"}
            user={currentUser}
            onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
            onLogout={handleLogout}
          />

          <div
            className="app-content-shell"
            style={{
            background: "var(--card-bg)",
            border: "1px solid var(--app-border)",
            borderRadius: "20px",
            padding: "18px",
            boxShadow: "var(--card-shadow)",
            color: "var(--app-text)",
          }}
          >
            {children}
          </div>
        </main>

        {/* ✅ hidden prop keeps BottomTabs in sync with Topbar */}
        <BottomTabs hidden={hideChrome} />
      </body>
    </html>
  );
}
