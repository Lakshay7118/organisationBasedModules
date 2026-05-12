"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare, CheckSquare, Users, Settings } from "lucide-react";

const tabs = [
  { id: "live-chat", label: "Live Chat", icon: MessageSquare, path: "/live-chat" },
  { id: "contacts",  label: "Contacts",  icon: Users,         path: "/contacts"  },
  { id: "task",      label: "Task",      icon: CheckSquare,   path: "/task"      },
  { id: "settings",  label: "Settings",  icon: Settings,      path: "/Settings"  },
];

export default function BottomTabs({ hidden = false }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile || hidden) return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        height: 60,
        background: "#fff",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 999,
        boxShadow: "0 -2px 12px rgba(0,0,0,0.07)",
      }}
    >
      {tabs.map((tab) => {
        const Icon     = tab.icon;
        const isActive = pathname === tab.path;
        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "8px 0",
              color: isActive ? "#0b535d" : "#9ca3af",
              position: "relative",
            }}
          >
            {isActive && (
              <div style={{
                position: "absolute",
                top: 0, left: "50%",
                transform: "translateX(-50%)",
                width: 32, height: 3,
                borderRadius: "0 0 3px 3px",
                background: "#0b535d",
              }} />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 400 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
