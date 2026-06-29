"use client";

import "./globals.css";
import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./componets/sidebar";
import Topbar from "./componets/Topbar";
import BottomTabs from "./componets/BottomTabs";
import { Bot, Send, X } from "lucide-react";
import API from "./utils/api";
import "bootstrap/dist/css/bootstrap.min.css";

const ROUTE_MODULES = [
  { prefix: "/live-chat", module: "chat" },
  { prefix: "/campaigns", module: "chat" },
  { prefix: "/template", module: "chat" },
  { prefix: "/task", module: "task" },
  { prefix: "/hr", module: "hr" },
];

const getRouteModule = (pathname = "") => {
  const path = pathname.toLowerCase();
  return ROUTE_MODULES.find((item) => path === item.prefix || path.startsWith(`${item.prefix}/`));
};

const canAccessRoute = (user, pathname = "") => {
  const routeModule = getRouteModule(pathname);
  if (!routeModule) return true;
  if (user?.role === "super_to_super_admin") return true;
  return Array.isArray(user?.allowedModules) && user.allowedModules.includes(routeModule.module);
};

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

const SUPPORT_ISSUES = [
  { id: "forgot_password", label: "Forgot password", priority: "high" },
  { id: "login", label: "Login issue", priority: "high" },
  { id: "messages", label: "Messages not sending", priority: "medium" },
  { id: "calls", label: "Call not connecting", priority: "high" },
  { id: "billing", label: "Billing or plan", priority: "medium" },
  { id: "other", label: "Other issue", priority: "medium" },
];

function GlobalSupportPanel({ open, onClose, user }) {
  const [tickets, setTickets] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [guestMessages, setGuestMessages] = useState([]);

  const userId = (user?._id || user?.id || "").toString();
  const canUseSupportApi = Boolean(userId);
  const activeTicket = tickets
    .filter((ticket) => ticket.status !== "ended")
    .find((ticket) => {
      const ticketUserId = (ticket.user?._id || ticket.user?.id || ticket.user || "").toString();
      return !userId || !ticketUserId || ticketUserId === userId;
    });

  const loadTickets = useCallback(async () => {
    if (!open || !canUseSupportApi) return;
    setLoading(true);
    try {
      const res = await API.get("/users/support-tickets");
      setTickets(res.data?.data || []);
    } catch (error) {
      console.error("Could not load support tickets:", error);
    } finally {
      setLoading(false);
    }
  }, [canUseSupportApi, open]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setInterval(loadTickets, 8000);
    return () => window.clearInterval(timer);
  }, [loadTickets, open]);

  const messages = useMemo(() => {
    const intro = [{
      by: "bot",
      text: canUseSupportApi
        ? `Hi ${user?.name || "there"}, how can support help?`
        : "Hi there, how can I help with login or account access?",
    }];
    if (!canUseSupportApi) return [...intro, ...guestMessages];
    if (!activeTicket) return intro;

    const ticketMessages = [
      { by: "user", text: activeTicket.subject, meta: new Date(activeTicket.createdAt).toLocaleString() },
      { by: "bot", text: `Ticket is ${activeTicket.status?.replace("_", " ") || "open"}. Replies will appear here.` },
      ...(activeTicket.replies || []).map((reply) => {
        const senderId = (reply.sender?._id || reply.sender?.id || reply.sender || "").toString();
        return {
          by: senderId && senderId === userId ? "user" : "bot",
          text: reply.message,
          meta: reply.sender?.name || reply.senderRole || "",
        };
      }),
    ];

    return [...intro, ...ticketMessages];
  }, [activeTicket, canUseSupportApi, guestMessages, user?.name, userId]);

  const sendMessage = async (text = input, issue = null) => {
    const message = text.trim();
    if (!message || sending) return;

    setSending(true);
    try {
      if (!canUseSupportApi) {
        setGuestMessages((prev) => [
          ...prev,
          { by: "user", text: message },
          {
            by: "bot",
            text: "For account-specific support, please log in first. If you cannot log in, share this issue with an admin or manager so they can reset your access.",
          },
        ]);
        setInput("");
      } else if (activeTicket) {
        await API.post(`/users/support-tickets/${activeTicket._id}/user-replies`, { message });
      } else {
        await API.post("/users/support-tickets", {
          category: issue?.id || "other",
          subject: message.slice(0, 70),
          message,
          priority: issue?.priority || "medium",
        });
      }
      setInput("");
      await loadTickets();
    } catch (error) {
      console.error("Could not send support message:", error);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes supportPanelOpen {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: "min(440px, calc(100vw - 28px))",
          maxHeight: "min(680px, calc(100vh - 40px))",
          background: "var(--app-surface)",
          color: "var(--app-text)",
          border: "1px solid var(--app-border)",
          borderRadius: 16,
          boxShadow: "0 26px 70px rgba(15,23,42,0.22)",
          zIndex: 90,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transformOrigin: "bottom right",
          animation: "supportPanelOpen 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
      <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--app-border)" }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#00a884", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bot size={19} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800 }}>Customer Support</div>
          <div style={{ color: "var(--app-text-muted)", fontSize: 12 }}>{!canUseSupportApi ? "Login help" : activeTicket ? "Replying in your active ticket" : "Create a support ticket"}</div>
        </div>
        <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--app-border)", background: "var(--app-surface-2)", color: "var(--app-text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 220, overflowY: "auto", padding: 14, background: "var(--app-surface-2)", display: "flex", flexDirection: "column", gap: 9 }}>
        {loading && messages.length <= 1 ? (
          <div style={{ color: "var(--app-text-muted)", textAlign: "center", marginTop: 32 }}>Loading support chat...</div>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.by}-${index}`} style={{ display: "flex", justifyContent: msg.by === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "84%", borderRadius: msg.by === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.by === "user" ? "#d9fdd3" : "var(--app-surface)", border: "1px solid var(--app-border)", padding: "9px 11px", fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                {msg.text}
                {msg.meta && <div style={{ color: "var(--app-text-muted)", fontSize: 11, marginTop: 4 }}>{msg.meta}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: 14, display: "grid", gap: 10 }}>
        {!activeTicket && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {SUPPORT_ISSUES.map((issue) => (
              <button key={issue.id} type="button" disabled={sending} onClick={() => sendMessage(issue.label, issue)} style={{ border: "1px solid var(--app-border)", borderRadius: 999, background: "var(--app-surface-2)", color: "var(--app-text)", padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer" }}>
                {issue.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder={canUseSupportApi ? (activeTicket ? "Reply to support..." : "Type your issue...") : "Type your login issue..."}
            style={{ flex: 1, height: 42, borderRadius: 999, border: "1px solid var(--app-border)", background: "var(--input-bg)", color: "var(--app-text)", padding: "0 14px", outline: "none" }}
          />
          <button type="button" disabled={sending || !input.trim()} onClick={() => sendMessage()} style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: "#00a884", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: sending || !input.trim() ? "not-allowed" : "pointer", opacity: sending || !input.trim() ? 0.65 : 1 }}>
            <Send size={17} />
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

function ChatbotLauncher({ isMobile, isLoggedIn, hidden = false, onOpen }) {
  const buttonSize = isMobile ? 36 : 40;

  if (hidden) return null;

  return (
    <button
      type="button"
      aria-label="Open chatbot"
      title="Chatbot"
      onClick={onOpen}
      style={{
        position: "fixed",
        right: isMobile ? 14 : 20,
        bottom: isLoggedIn && isMobile ? 86 : 18,
        width: buttonSize,
        height: buttonSize,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.38)",
        background: "linear-gradient(135deg, #0f5f64 0%, #15a878 100%)",
        color: "#fff",
        boxShadow: "0 12px 26px rgba(15,95,100,0.22)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 60,
      }}
    >
      <Bot size={isMobile ? 16 : 18} strokeWidth={2.4} />
    </button>
  );
}

function AppBootSkeleton({ title = "Dashboard", theme = "light" }) {
  const skeleton = {
    background: "var(--skeleton-gradient)",
    backgroundSize: "220% 100%",
    animation: "appBootSkeleton 1.25s ease-in-out infinite",
  };

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
          @keyframes appBootSkeleton {
            0% { background-position: 120% 0; }
            100% { background-position: -120% 0; }
          }
          @media (min-width: 768px) {
            .app-boot-main {
              margin-left: 108px !important;
            }
          }
        `}</style>
        <div className="hidden md:block" style={{ position: "fixed", top: 12, left: 12, zIndex: 1000 }}>
          <aside
            style={{
              width: 84,
              height: "calc(100dvh - 32px)",
              borderRadius: 22,
              background: "linear-gradient(180deg, #083c43 0%, #0b535d 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              padding: "12px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(255,255,255,0.14)" }} />
            <div style={{ width: 34, height: 1, background: "rgba(255,255,255,0.16)" }} />
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} style={{ width: 64, height: 52, borderRadius: 14, background: index === 0 ? "rgba(255,255,255,0.13)" : "transparent", display: "grid", placeItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: 10, background: "rgba(255,255,255,0.14)" }} />
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.82)" }} />
          </aside>
        </div>
        <main
          className="app-boot-main"
          style={{
            marginLeft: 0,
            minHeight: "100vh",
            padding: 10,
            paddingTop: 14,
            boxSizing: "border-box",
          }}
        >
          <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 850, color: "var(--app-text)" }}>{title}</div>
              <div style={{ marginTop: 8, width: 180, height: 12, borderRadius: 999, ...skeleton }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, ...skeleton }} />
              <div style={{ width: 42, height: 42, borderRadius: 14, ...skeleton }} />
              <div style={{ width: 148, height: 44, borderRadius: 14, ...skeleton }} />
            </div>
          </div>
          <div
            style={{
              minHeight: "calc(100vh - 110px)",
              borderRadius: 20,
              border: "1px solid var(--app-border)",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
              padding: 18,
            }}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ width: "min(380px, 70%)", height: 22, borderRadius: 999, ...skeleton }} />
              <div style={{ width: "min(620px, 88%)", height: 12, borderRadius: 999, ...skeleton }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, marginTop: 10 }}>
                <div style={{ height: 140, borderRadius: 10, ...skeleton }} />
                <div style={{ height: 140, borderRadius: 10, ...skeleton }} />
                <div style={{ height: 210, borderRadius: 10, ...skeleton }} />
                <div style={{ height: 210, borderRadius: 10, ...skeleton }} />
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

export default function RootLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [authChecked, setAuthChecked]   = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile]         = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);
  const [supportOpen, setSupportOpen]   = useState(false);
  const [currentUser, setCurrentUser]   = useState(null);
  const [theme, setTheme]               = useState("light");

  const pathname = usePathname();
  const router   = useRouter();
  const activeTab = pathname?.split("/")[1] || "dashboard";
  const isHrPage = pathname?.toLowerCase() === "/hr";
  const isLiveChatPage = pathname?.toLowerCase() === "/live-chat";

  const checkLoginStatus = useCallback(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setAuthChecked(true);
      if (pathname !== "/") router.push("/");
    } else {
      try {
        const parsed = JSON.parse(user);
        setCurrentUser(enrichUser(parsed));
        if (!canAccessRoute(parsed, pathname)) {
          sessionStorage.setItem(
            "moduleAccessMessage",
            `Your organization does not have access to the ${getRouteModule(pathname)?.module || "requested"} module.`
          );
          router.replace("/");
        }
      } catch {
        setCurrentUser({ name: "User", initial: "?", color: "#6b7280" });
      }
      setIsLoggedIn(true);
      setAuthChecked(true);
    }
  }, [pathname, router]);

  const refreshCurrentUser = useCallback(async () => {
    if (!localStorage.getItem("token")) return;

    try {
      const res = await API.get("/users/me");
      const freshUser = res.data?.data;
      if (!freshUser) return;

      const previous = JSON.parse(localStorage.getItem("user") || "{}");
      const mergedUser = {
        ...previous,
        ...freshUser,
        id: freshUser._id || freshUser.id || previous.id,
      };

      localStorage.setItem("user", JSON.stringify(mergedUser));
      localStorage.setItem("role", mergedUser.role || "");
      setCurrentUser(enrichUser(mergedUser));
      window.dispatchEvent(new Event("loginStatusChanged"));

      if (!canAccessRoute(mergedUser, pathname)) {
        sessionStorage.setItem(
          "moduleAccessMessage",
          `Your organization does not have access to the ${getRouteModule(pathname)?.module || "requested"} module.`
        );
        router.replace("/");
      }
    } catch (error) {
      console.error("Could not refresh current user:", error);
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
    if (!isLoggedIn) return;
    const timer = window.setTimeout(() => {
      refreshCurrentUser();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn, refreshCurrentUser]);

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
    setChatOpen(true);
  };
  const onClose = () => {
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
  const hideChatbotLauncher = supportOpen || (isLiveChatPage && chatOpen);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("ownerSession");
    setIsLoggedIn(false);
    setCurrentUser(null);
    router.push("/");
    window.dispatchEvent(new Event("loginStatusChanged"));
  };

  const openChatbot = useCallback(() => {
    setSupportOpen(true);
  }, []);

  const titleMap = {
    dashboard:      "Dashboard",
    organizations:  "Organizations",
    "live-chat":    "Live Chat",
    task:           "Task",
    history:        "History",
    contacts:       "Contacts",
    HR:             "HR Management",
    hr:             "HR Management",
    Template:       "Template",
    template:       "Template",
    Campaigns:      "Campaigns",
    campaigns:      "Campaigns",
    "ads-manager":  "Ads Manager",
    flows:          "Flows",
    manage:         "Manage",
    developer:      "Developer",
    "all-projects": "All Projects",
    Settings:       "Settings",
    settings:       "Settings",
  };

  if (!authChecked) {
    return <AppBootSkeleton title={titleMap[activeTab] || "Dashboard"} theme={theme} />;
  }

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
          @keyframes appModalBackdropIn {
            from {
              opacity: 0;
              backdrop-filter: blur(0);
              -webkit-backdrop-filter: blur(0);
            }
            to {
              opacity: 1;
              backdrop-filter: blur(6px);
              -webkit-backdrop-filter: blur(6px);
            }
          }
          @keyframes appModalCardIn {
            from {
              opacity: 0;
              transform: translateY(14px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
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
            paddingTop: isHrPage ? "10px" : "14px",
            paddingRight: "10px",
            paddingBottom: isMobile ? "74px" : isHrPage ? "10px" : "14px",
            paddingLeft: "10px",
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
            background: isHrPage ? "transparent" : "var(--card-bg)",
            border: isHrPage ? "0" : "1px solid var(--app-border)",
            borderRadius: isHrPage ? "0" : "20px",
            paddingTop: isHrPage ? "0" : "18px",
            paddingRight: isHrPage ? "0" : "18px",
            paddingBottom: isHrPage ? "0" : "18px",
            paddingLeft: isHrPage ? "0" : "18px",
            boxShadow: isHrPage ? "none" : "var(--card-shadow)",
            color: "var(--app-text)",
          }}
          >
            {children}
          </div>
        </main>

        {/* ✅ hidden prop keeps BottomTabs in sync with Topbar */}
        <BottomTabs hidden={hideChrome} />
        <ChatbotLauncher isMobile={isMobile} isLoggedIn hidden={hideChatbotLauncher} onOpen={openChatbot} />
        <GlobalSupportPanel open={supportOpen} onClose={() => setSupportOpen(false)} user={currentUser} />
      </body>
    </html>
  );
}
