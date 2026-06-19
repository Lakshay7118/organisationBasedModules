"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LiveChatPage from "../componets/LiveChatPage";
import API from "../utils/api";

const canUseChat = (user) => {
  if (user?.role === "super_to_super_admin") return true;
  return Array.isArray(user?.allowedModules) && user.allowedModules.includes("chat");
};

export default function Page() {
  const router = useRouter();
  const [storedUser, setStoredUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      try {
        const cachedUser = JSON.parse(localStorage.getItem("user") || "null");
        if (!cachedUser) {
          router.replace("/");
          return;
        }

        const res = await API.get("/users/me");
        const freshUser = {
          ...cachedUser,
          ...(res.data?.data || {}),
          id: res.data?.data?._id || res.data?.data?.id || cachedUser.id,
        };

        if (cancelled) return;

        localStorage.setItem("user", JSON.stringify(freshUser));
        localStorage.setItem("role", freshUser.role || "");
        setStoredUser(freshUser);

        if (!canUseChat(freshUser)) {
          sessionStorage.setItem(
            "moduleAccessMessage",
            "Your organization does not have access to Live Chat."
          );
          router.replace("/");
        }
      } catch {
        if (!cancelled) router.replace("/");
      } finally {
        if (!cancelled) setChecked(true);
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!checked || !storedUser) return;
    if (!canUseChat(storedUser)) {
      sessionStorage.setItem(
        "moduleAccessMessage",
        "Your organization does not have access to Live Chat."
      );
      router.replace("/");
    }
  }, [checked, router, storedUser]);

  const allowed = useMemo(() => canUseChat(storedUser), [storedUser]);

  if (!checked || !allowed) return null;

  return <LiveChatPage />;
}
