"use client";

import { io } from "socket.io-client";

// ✅ Auto-detect hostname — works for localhost AND 192.168.x.x
const getSocketURL = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
  }
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // Use same hostname as browser automatically
  return `${window.location.protocol}//${window.location.hostname}:5000`;
};

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(getSocketURL(), {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}
export function disconnectSocket() {
  if (socket) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.phone) {
      socket.emit("leaveUserRoom", user.phone);
    }
    // ✅ wait 400ms so emit reaches server before disconnect
    setTimeout(() => {
      socket?.disconnect();
      socket = null;
    }, 400);
  }
}