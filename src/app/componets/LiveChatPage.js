"use client";
import { getSocket } from "../lib/socket";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";

import { AnimatePresence, motion } from "framer-motion";
import {
  FiPhone,
  FiSearch,
  FiMoreVertical,
  FiSmile,
  FiSend,
  FiTag,
  FiInfo,
  FiMessageSquare,
  FiFile,
  FiImage,
  FiX,
  FiCheck,
  FiCheckCircle,
  FiArrowLeft,
  FiPlus,
  FiCamera,
  FiHeadphones,
  FiUser,
  FiCalendar,
  FiUsers,
  FiTrash2,
  FiChevronDown,
  FiShare2,
  FiCopy,
  FiCheckSquare,
  FiMic,
  FiMicOff,
} from "react-icons/fi";

import API from "../utils/api";

// ✅ Backend root URL (without /api) for media files
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

const getRtcConfig = () => {
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  return {
    iceServers: turnUrl
      ? [
          ...DEFAULT_ICE_SERVERS,
          {
            urls: turnUrl.split(",").map(url => url.trim()).filter(Boolean),
            username: turnUsername,
            credential: turnCredential,
          },
        ]
      : DEFAULT_ICE_SERVERS,
    iceCandidatePoolSize: 10,
  };
};

const CALL_CONNECT_TIMEOUT_MS = 30000;
const CALL_FAILURE_GRACE_MS = 8000;

const createIdleCallState = () => ({
  status: "idle",
  direction: null,
  chatId: null,
  peerPhone: null,
  peerName: "",
  offer: null,
  startedAt: null,
  error: "",
});

const CALL_ERROR_MESSAGES = {
  "connection-timeout": "Call could not connect. Check both networks and try again.",
  "connection-failed": "Call media connection failed. A TURN server is required for this network.",
  "ice-failed": "Call media connection failed. A TURN server is required for this network.",
};

/* ─────────────────────────────────────────────
  Skeleton components (unchanged)
───────────────────────────────────────────── */
const normalizePhoneKey = (phone) => String(phone || "").replace(/\D/g, "").slice(-10);

const shimmerCSS = `
  @keyframes lc-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  `;

function Skeleton({ width = "100%", height = 14, radius = 6, style = {} }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#e9edef",
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
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
          animation: "lc-shimmer 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function HeaderSkeleton({ wide = false }) {
  return (
    <div
      className="d-flex align-items-center justify-content-between px-3 border-bottom flex-shrink-0"
      style={{ height: 59, background: "#f0f2f5" }}
    >
      <div className="d-flex align-items-center gap-3">
        <Skeleton width={40} height={40} radius={999} />
        {wide && <Skeleton width={80} height={14} />}
      </div>
      <div className="d-flex gap-2">
        <Skeleton width={30} height={30} radius={999} />
        <Skeleton width={30} height={30} radius={999} />
        {wide && <Skeleton width={30} height={30} radius={999} />}
      </div>
    </div>
  );
}

function ChatListSkeleton() {
  return (
    <div
      className="d-flex flex-column bg-white border-end"
      style={{ width: 380, minWidth: 380, height: "100%", overflow: "hidden" }}
    >
      <HeaderSkeleton />
      <div className="p-2 border-bottom bg-white flex-shrink-0">
        <Skeleton height={36} radius={8} />
      </div>
      <div className="d-flex gap-2 p-2 border-bottom bg-white flex-shrink-0">
        {[110, 130, 130].map((w, i) => (
          <Skeleton key={i} width={w} height={32} radius={999} />
        ))}
      </div>
      <div className="flex-grow-1" style={{ overflowY: "hidden" }}>
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="d-flex align-items-center gap-3 px-3 py-3"
            style={{ borderBottom: "1px solid #f0f2f5" }}
          >
            <Skeleton width={49} height={49} radius={999} style={{ flexShrink: 0 }} />
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between mb-2">
                <Skeleton width="50%" height={13} />
                <Skeleton width={40} height={11} />
              </div>
              <Skeleton width="75%" height={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatWindowSkeleton() {
  const bubbles = [
    { side: "left", w: "55%" },
    { side: "right", w: "42%" },
    { side: "left", w: "68%" },
    { side: "right", w: "35%" },
    { side: "left", w: "50%" },
    { side: "right", w: "60%" },
    { side: "right", w: "30%" },
  ];
  return (
    <div
      className="d-flex flex-column chat-bg"
      style={{ flex: 1, height: "100%", overflow: "hidden", minWidth: 0 }}
    >
      <HeaderSkeleton wide />
      <div
        className="flex-grow-1 d-flex flex-column gap-3 px-4 py-4"
        style={{ overflowY: "hidden" }}
      >
        {bubbles.map((b, i) => (
          <div
            key={i}
            className="d-flex"
            style={{ justifyContent: b.side === "right" ? "flex-end" : "flex-start" }}
          >
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                backgroundColor: b.side === "right" ? "#d1f5c9" : "#e9edef",
                borderRadius: b.side === "right" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                width: b.w,
                height: 42,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                  animation: "lc-shimmer 1.6s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        className="d-flex align-items-center gap-2 p-3 border-top flex-shrink-0"
        style={{ background: "#f0f2f5" }}
      >
        <Skeleton width={42} height={42} radius={999} />
        <Skeleton width={42} height={42} radius={999} />
        <Skeleton height={42} radius={24} />
        <Skeleton width={42} height={42} radius={999} />
      </div>
    </div>
  );
}

function ContactInfoSkeleton() {
  return (
    <div
      className="d-flex flex-column border-start bg-white"
      style={{ width: 340, minWidth: 340, height: "100%", overflow: "hidden" }}
    >
      <div
        className="d-flex align-items-center justify-content-center border-bottom flex-shrink-0"
        style={{ height: 59, background: "#f0f2f5" }}
      >
        <Skeleton width={120} height={14} />
      </div>
      <div className="flex-grow-1" style={{ background: "#f7f8fa", overflowY: "hidden" }}>
        <div className="bg-white text-center px-3 py-4" style={{ borderBottom: "10px solid #f0f2f5" }}>
          <Skeleton width={92} height={92} radius={999} style={{ margin: "0 auto 16px" }} />
          <Skeleton width={140} height={16} radius={6} style={{ margin: "0 auto 10px" }} />
          <Skeleton width={110} height={12} radius={6} style={{ margin: "0 auto" }} />
        </div>
        {["Basic Info", "Lead Tag", "Notes"].map((section, si) => (
          <div key={si} className="bg-white mb-2 px-3 py-3">
            <div className="d-flex align-items-center gap-2 mb-3">
              <Skeleton width={16} height={16} radius={4} />
              <Skeleton width={80} height={13} />
            </div>
            {[...Array(si === 0 ? 4 : 1)].map((_, i) => (
              <div key={i} className="mb-3">
                <Skeleton width={50} height={10} style={{ marginBottom: 6 }} />
                <Skeleton width="80%" height={13} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveChatSkeleton() {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      <ChatListSkeleton />
      <ChatWindowSkeleton />
      <ContactInfoSkeleton />
    </div>
  );
}

/* ─────────────────────────────────────────────
  Constants
───────────────────────────────────────────── */
const emojiList = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤩", "😭",
  "😡", "👍", "👏", "🙏", "🔥", "🎉", "❤️", "💯", "👌", "✨",
];

const attachmentItems = [
  { id: "document", label: "Document", icon: FiFile, color: "#6c63ff" },
  { id: "photos", label: "Photos & videos", icon: FiImage, color: "#3b82f6" },
  { id: "camera", label: "Camera", icon: FiCamera, color: "#ec4899" },
  { id: "audio", label: "Audio", icon: FiHeadphones, color: "#f97316" },
  { id: "contact", label: "Contact", icon: FiUser, color: "#0ea5e9" },
];

const popupVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } },
};

/* ─────────────────────────────────────────────
  Main component
───────────────────────────────────────────── */
export default function LiveChatPage() {

  // ── 1. ALL useState ──────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedContactsForGroup, setSelectedContactsForGroup] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showMobileContactInfo, setShowMobileContactInfo] = useState(false);

  const [hoveredChatId, setHoveredChatId] = useState(null);
const [chatDropdown, setChatDropdown] = useState({ open: false, chatId: null, x: 0, y: 0 });
const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
const [deleteTarget, setDeleteTarget] = useState(null); // { chatId, isGroup, mode }
  
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
const [clearTargetId, setClearTargetId] = useState(null);

const [userPresence, setUserPresence] = useState({});

const [showCameraModal, setShowCameraModal] = useState(false);
const [showAudioRecorder, setShowAudioRecorder] = useState(false);
const [showContactPicker, setShowContactPicker] = useState(false);
const [isRecording, setIsRecording] = useState(false);
const [recordingSeconds, setRecordingSeconds] = useState(0);
const [audioBlob, setAudioBlob] = useState(null);
const [callState, setCallState] = useState(createIdleCallState);
const [callSeconds, setCallSeconds] = useState(0);
const [isCallMuted, setIsCallMuted] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(user);
  }, []);

  // ── 2. ALL useRef ─────────────────────────────
  const pageRef = useRef(null);
  const listPanelRef = useRef(null);
  const centerPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const messageScrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const attachmentWrapRef = useRef(null);
  const emojiWrapRef = useRef(null);
  const currentUserRef = useRef(null);
  const selectedChatRef = useRef(null);
  const documentInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
const recordingTimerRef = useRef(null);
const cameraStreamRef = useRef(null);
const videoPreviewRef = useRef(null);
const audioChunksRef = useRef([]);
const callStateRef = useRef(createIdleCallState());
const peerConnectionRef = useRef(null);
const localStreamRef = useRef(null);
const remoteAudioRef = useRef(null);
const pendingIceCandidatesRef = useRef([]);
const callFailureTimerRef = useRef(null);
const callConnectTimerRef = useRef(null);

useEffect(() => {
  selectedChatRef.current = selectedChat;
}, [selectedChat]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ── 3. ALL useEffect ──────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 820);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

// ✅ FETCH CONTACTS (JWT PROTECTED)
useEffect(() => {
  const loadContacts = async () => {
    try {
      const res = await API.get("/contacts");
      setContacts(res.data);
    } catch (err) {
      console.error("Contacts error:", err);
    }
  };

  loadContacts();
}, []);


// ✅ FETCH TAGS (JWT PROTECTED)
useEffect(() => {
  const loadTags = async () => {
    try {
      const res = await API.get("/tags");

      setTags(
        Array.isArray(res.data)
          ? res.data
          : res.data.tags || res.data.data || []
      );
    } catch (err) {
      console.error("Tags error:", err);
    }
  };

  loadTags();
}, []);


useEffect(() => {
  const s = getSocket();
  s.connect();

  // ================== ONLINE / OFFLINE FIX ==================

const handleOnlineUsers = ({ users, lastSeen }) => {
  setUserPresence(() => {
    const next = {};
    users.forEach(phone => {
      next[phone] = { online: true, lastSeen: null };
    });
    Object.entries(lastSeen || {}).forEach(([phone, ts]) => {
      // ✅ don't overwrite users who are currently online
      if (!next[phone]?.online) {
        next[phone] = { online: false, lastSeen: ts };
      }
    });
    return next;
  });
};
  s.on("onlineUsers", handleOnlineUsers);

  // ================== JOIN USER ==================
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const joinUserRoom = () => {
    if (user?.phone) {
      s.emit("joinUserRoom", user.phone);
    }
  };

  if (s.connected) joinUserRoom();
  else s.once("connect", joinUserRoom);

  s.on("connect", joinUserRoom);

  // ================== 🔥 CRITICAL FIX ==================

  // ✅ when tab hidden / minimized / closed
 const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    if (user?.phone) {
      s.emit("joinUserRoom", user.phone);
    }
  }
};

  document.addEventListener("visibilitychange", handleVisibilityChange);

  // ✅ fallback (page close)
  const handleBeforeUnload = () => {
    if (user?.phone) {
      s.emit("leaveUserRoom", user.phone);
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  // ================== CLEANUP ==================
  return () => {
    s.off("onlineUsers", handleOnlineUsers);
    s.off("connect", joinUserRoom);

    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
     s.disconnect();
  };
}, []);

useEffect(() => {
  const s = getSocket();

  const handleGlobalNewMessage = (msg) => {
    // Update chat list for all chats (unread badge + move to top)
    setChatList(prev => {
      const exists = prev.find(c => String(c._id) === String(msg.chatId));
      if (!exists) return prev;
      return [
        {
          ...exists,
          updatedAt: new Date().toISOString(),
          unread:
            String(msg.chatId) !== String(selectedChatRef.current?._id)
              ? (exists.unread || 0) + 1
              : 0,
          // ✅ ADD THIS — keep lastMessage in sync
          lastMessage: {
            text: msg.text || "",
            messageType: msg.messageType || "text",
            fileName: msg.fileName || null,
            createdAt: msg.createdAt,
          },
        },
        ...prev.filter(c => String(c._id) !== String(msg.chatId)),
      ];
    });

    // Only add message to state if this chat is currently open
    const currentChatId = selectedChatRef.current?._id;
    if (String(msg.chatId) !== String(currentChatId)) return;

    const isSentByMe =
      String(msg.sender) === String(currentUserRef.current?.phone);

    // Mark read instantly when message arrives in open chat
    if (!isSentByMe) {
      API.post("/messages/mark-read", { chatId: currentChatId }).catch(console.error);
      getSocket().emit("markRead", { chatId: currentChatId });
    }

    setMessages(prev => {
      const currentMsgs = prev[currentChatId] || [];

      // Avoid duplicates
      if (currentMsgs.some(m => m.id === msg._id)) return prev;

      // Replace optimistic temp message if exists
      const tempIndex = currentMsgs.findIndex(
        m =>
          m.id?.startsWith("tmp-") &&
          m.text === msg.text &&
          Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 5000
      );

     const newMsg = {
  id: msg._id,
  sender: msg.sender,
  type: isSentByMe ? "sent" : "received",
  messageType: msg.messageType || "text",
  text: msg.text || "",
  templateMeta: msg.templateMeta || null,
  createdAt: msg.createdAt,
  time: new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
  delivered: true,
  seen: msg.status === "seen",
  fileName: msg.fileName,
  url: msg.fileUrl,
  isDeleted: false,
  contactName: msg.contactName || null,
  contactPhone: msg.contactPhone || null,
  contactEmail: msg.contactEmail || null,
};

      if (tempIndex !== -1) {
        const updated = [...currentMsgs];
        updated[tempIndex] = newMsg;
        return { ...prev, [currentChatId]: updated };
      }

      return { ...prev, [currentChatId]: [...currentMsgs, newMsg] };
    });
  };

  s.on("newMessage", handleGlobalNewMessage);
  return () => s.off("newMessage", handleGlobalNewMessage);
}, []);

// ✅ Fix — only approved templates
// useEffect(() => {
//   const loadTemplates = async () => {
//     try {
//       const res = await API.get("/templates");
//       const all = Array.isArray(res.data)
//         ? res.data
//         : res.data.templates || res.data.data || [];

//       // ✅ Only show approved templates in chat
//       const approved = all.filter(t => t.approvalStatus === "approved");
//       setTemplates(approved);
//     } catch (err) {
//       console.error("Templates error:", err);
//     }
//   };
//   loadTemplates();
// }, []); 

useEffect(() => {
  const loadChats = async () => {
    try {
      const res = await API.get("/chats");
      console.log("CHAT LIST SAMPLE:", JSON.stringify(res.data[0], null, 2));
     if (Array.isArray(res.data)) {
        setChatList(res.data);

        // ✅ Join ALL chat rooms
        const s = getSocket();
        res.data.forEach(chat => {
          s.emit("joinChat", chat._id);
        });
      } else {
        console.error("Chat list is not an array:", res.data);
        setChatList([]);
      }
    } catch (err) {
      console.error("Chats error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  loadChats();
}, []);


useEffect(() => {
  
  if (!selectedChat) return;

  const chatId = selectedChat._id;
  const s = getSocket();

  s.emit("joinChat", chatId);

  // ✅ FETCH MESSAGES (JWT)
  const loadMessages = async () => {
    try {
      const res = await API.get(`/messages?chatId=${chatId}`);

      const data = res.data;

      setMessages(prev => ({
        ...prev,
        [chatId]: data.map(m => {
          const isSentByMe =
            String(m.sender) === String(currentUserRef.current?.phone);

          return {
            id: m._id,
            sender: m.sender,

            type: isSentByMe ? "sent" : "received",

            messageType: m.messageType || "text",
            text: m.text || "",

            templateMeta: m.templateMeta || null,

            createdAt: m.createdAt,

            time: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),

            delivered: m.status === "delivered" || m.status === "seen",
            seen: m.status === "seen",

            fileName: m.fileName,
            url: m.fileUrl,

            isDeleted: m.isDeleted || false,

            // In both places where you map messages, add:
contactName: m.contactName || null,
contactPhone: m.contactPhone || null,
contactEmail: m.contactEmail || null,
          };
        }),
      }));
    } catch (err) {
      console.error("Messages error:", err);
    }
  };

  loadMessages();

  // ✅ MARK READ (JWT)
  if (currentUser) {
    API.post("/messages/mark-read", { chatId }).catch(console.error);

    s.emit("markRead", { chatId }); // ❗ removed userPhone
  }

  // 🔥 rest of your socket code stays SAME...


  // ✅ TYPING INDICATOR
  const handleUserTyping = ({ chatId: tChatId }) => {
    if (String(tChatId) !== String(chatId)) return;
    setIsUserTyping(true);
    clearTimeout(window._typingTimer);
    window._typingTimer = setTimeout(() => setIsUserTyping(false), 2500);
  };

  // ✅ BLUE DOUBLE TICK — handled by global listener
const handleMessagesSeen = ({ chatId: seenChatId }) => {
  if (String(seenChatId) !== String(chatId)) return;
  setMessages(prev => {
    const msgs = prev[chatId];
    if (!msgs) return prev;
    return {
      ...prev,
      [chatId]: msgs.map(m =>
        m.type === "sent" ? { ...m, seen: true, delivered: true } : m
      ),
    };
  });
};

  // ✅ Register all listeners
  s.on("userTyping", handleUserTyping);
  s.on("messagesSeen", handleMessagesSeen);

  // ✅ Cleanup on unmount / chat change
  return () => {
    s.off("userTyping", handleUserTyping);
    s.off("messagesSeen", handleMessagesSeen);
    clearTimeout(window._typingTimer);
  };

}, [selectedChat, currentUser]);


  useEffect(() => {
    if (messageScrollRef.current)
      messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
  }, [messages, selectedChat, pendingAttachment]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attachmentWrapRef.current && !attachmentWrapRef.current.contains(e.target))
        setAttachmentMenuOpen(false);
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target))
        setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
  if (showCameraModal) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        cameraStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      })
      .catch(() => alert("Camera access denied"));
  } else {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
  }
}, [showCameraModal]);

const resetCallMedia = () => {
  pendingIceCandidatesRef.current = [];
  clearTimeout(callFailureTimerRef.current);
  clearTimeout(callConnectTimerRef.current);
  callFailureTimerRef.current = null;
  callConnectTimerRef.current = null;

  if (peerConnectionRef.current) {
    peerConnectionRef.current.onicecandidate = null;
    peerConnectionRef.current.ontrack = null;
    peerConnectionRef.current.onconnectionstatechange = null;
    peerConnectionRef.current.close();
    peerConnectionRef.current = null;
  }

  localStreamRef.current?.getTracks().forEach(track => track.stop());
  localStreamRef.current = null;

  if (remoteAudioRef.current) {
    remoteAudioRef.current.srcObject = null;
  }

  setIsCallMuted(false);
  setCallSeconds(0);
};

const endCall = (reason = "ended", notifyPeer = true) => {
  const activeCall = callStateRef.current;
  const from = currentUserRef.current?.phone;

  if (notifyPeer && activeCall?.peerPhone && from) {
    getSocket().emit("call:end", {
      to: activeCall.peerPhone,
      from,
      chatId: activeCall.chatId,
      reason,
    });
  }

  resetCallMedia();
  const idleCallState = createIdleCallState();
  callStateRef.current = idleCallState;
  setCallState(idleCallState);
};

const failCall = (reason = "connection-failed", notifyPeer = true) => {
  const message = CALL_ERROR_MESSAGES[reason];
  endCall(reason, notifyPeer);
  if (message) alert(message);
};

const attachRemoteAudio = (stream) => {
  if (!remoteAudioRef.current || !stream) return;

  remoteAudioRef.current.srcObject = stream;
  const playPromise = remoteAudioRef.current.play?.();
  if (playPromise?.catch) playPromise.catch(() => {});
};

const startCallConnectTimeout = () => {
  clearTimeout(callConnectTimerRef.current);
  callConnectTimerRef.current = setTimeout(() => {
    const activeCall = callStateRef.current;
    if (activeCall.status === "outgoing" || activeCall.status === "connecting") {
      failCall("connection-timeout", true);
    }
  }, CALL_CONNECT_TIMEOUT_MS);
};

const markCallConnected = () => {
  const activeCall = callStateRef.current;
  if (activeCall.status === "idle") return;

  clearTimeout(callFailureTimerRef.current);
  clearTimeout(callConnectTimerRef.current);
  callFailureTimerRef.current = null;
  callConnectTimerRef.current = null;

  const connectedCallState = {
    ...activeCall,
    status: "connected",
    startedAt: activeCall.startedAt || Date.now(),
    offer: null,
    error: "",
  };
  callStateRef.current = connectedCallState;
  setCallState(connectedCallState);
};

const scheduleConnectionFailureEnd = (reason = "connection-failed") => {
  if (callFailureTimerRef.current) return;

  callFailureTimerRef.current = setTimeout(() => {
    const pc = peerConnectionRef.current;
    const stillFailed =
      !pc ||
      pc.connectionState === "failed" ||
      pc.connectionState === "closed" ||
      pc.iceConnectionState === "failed";

    if (stillFailed && callStateRef.current.status !== "idle") {
      failCall(reason, true);
    }
  }, CALL_FAILURE_GRACE_MS);
};

const createPeerConnection = (peerPhone, chatId) => {
  const pc = new RTCPeerConnection(getRtcConfig());

  pc.onicecandidate = (event) => {
    const from = currentUserRef.current?.phone;
    if (!event.candidate || !from) {
      console.log("[call] ICE gathering complete", { peerPhone, chatId });
      return;
    }

    console.log("[call] sending ICE candidate", {
      to: peerPhone,
      type: event.candidate.type,
      protocol: event.candidate.protocol,
      address: event.candidate.address,
    });

    getSocket().emit("call:ice-candidate", {
      to: peerPhone,
      from,
      chatId,
      candidate: event.candidate,
    });
  };

  pc.ontrack = (event) => {
    console.log("[call] remote track received", {
      peerPhone,
      streams: event.streams?.length || 0,
      trackKind: event.track?.kind,
    });
    attachRemoteAudio(event.streams?.[0]);
    markCallConnected();
  };

  pc.onconnectionstatechange = () => {
    console.log("[call] connection state", pc.connectionState);

    if (pc.connectionState === "connected") {
      markCallConnected();
      return;
    }

    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      scheduleConnectionFailureEnd("connection-failed");
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log("[call] ICE connection state", pc.iceConnectionState);

    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      markCallConnected();
      return;
    }

    if (pc.iceConnectionState === "failed") {
      scheduleConnectionFailureEnd("ice-failed");
    }
  };

  pc.onicegatheringstatechange = () => {
    console.log("[call] ICE gathering state", pc.iceGatheringState);
  };

  pc.onsignalingstatechange = () => {
    console.log("[call] signaling state", pc.signalingState);
  };

  peerConnectionRef.current = pc;
  return pc;
};

const getLocalAudioStream = async () => {
  if (localStreamRef.current) return localStreamRef.current;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  localStreamRef.current = stream;
  return stream;
};

const addLocalAudioTracks = async (pc) => {
  const stream = await getLocalAudioStream();
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
};

const flushPendingIceCandidates = async () => {
  const pc = peerConnectionRef.current;
  if (!pc || !pc.remoteDescription) return;

  const candidates = [...pendingIceCandidatesRef.current];
  pendingIceCandidatesRef.current = [];

  for (const candidate of candidates) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Failed to add pending ICE candidate:", err);
    }
  }
};

const startVoiceCall = async () => {
  if (!selectedChat || selectedChat.isGroup) return;

  const currentUserPhone = currentUserRef.current?.phone;
  const peerPhone = selectedChat.phone;

  if (!currentUserPhone || !peerPhone) {
    alert("Unable to start call for this chat.");
    return;
  }

  if (callStateRef.current.status !== "idle") {
    alert("You are already in a call.");
    return;
  }

  try {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const pc = createPeerConnection(peerPhone, selectedChat._id);
    await addLocalAudioTracks(pc);

    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);

    const outgoingCallState = {
      status: "outgoing",
      direction: "outgoing",
      chatId: selectedChat._id,
      peerPhone,
      peerName: selectedChat.name || peerPhone,
      offer: null,
      startedAt: null,
      error: "",
    };
    callStateRef.current = outgoingCallState;
    setCallState(outgoingCallState);
    startCallConnectTimeout();

    socket.emit("call:offer", {
      to: peerPhone,
      from: currentUserPhone,
      fromName: currentUserRef.current?.name || currentUserPhone,
      chatId: selectedChat._id,
      offer,
      callType: "audio",
    });
  } catch (err) {
    console.error("Call start failed:", err);
    alert("Could not start the call. Please allow microphone access.");
    endCall("setup-failed", false);
  }
};

const acceptIncomingCall = async () => {
  const incomingCall = callStateRef.current;
  const currentUserPhone = currentUserRef.current?.phone;

  if (incomingCall.status !== "incoming" || !currentUserPhone) return;

  try {
    const pc = createPeerConnection(incomingCall.peerPhone, incomingCall.chatId);
    await addLocalAudioTracks(pc);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    await flushPendingIceCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const connectingCallState = {
      ...incomingCall,
      status: "connecting",
      offer: null,
    };
    callStateRef.current = connectingCallState;
    setCallState(connectingCallState);
    startCallConnectTimeout();

    getSocket().emit("call:answer", {
      to: incomingCall.peerPhone,
      from: currentUserPhone,
      chatId: incomingCall.chatId,
      answer,
    });
  } catch (err) {
    console.error("Call accept failed:", err);
    alert("Could not answer the call. Please allow microphone access.");
    endCall("setup-failed", true);
  }
};

const rejectIncomingCall = () => {
  const incomingCall = callStateRef.current;
  const currentUserPhone = currentUserRef.current?.phone;

  if (incomingCall.status === "incoming" && incomingCall.peerPhone && currentUserPhone) {
    getSocket().emit("call:reject", {
      to: incomingCall.peerPhone,
      from: currentUserPhone,
      chatId: incomingCall.chatId,
      reason: "rejected",
    });
  }

  endCall("rejected", false);
};

const toggleCallMute = () => {
  const nextMuted = !isCallMuted;
  localStreamRef.current?.getAudioTracks().forEach(track => {
    track.enabled = !nextMuted;
  });
  setIsCallMuted(nextMuted);
};

const handleIncomingCall = (payload) => {
  const currentUserPhone = currentUserRef.current?.phone;
  if (
    !currentUserPhone ||
    !payload?.from ||
    normalizePhoneKey(payload.from) === normalizePhoneKey(currentUserPhone)
  ) return;

  if (callStateRef.current.status !== "idle") {
    getSocket().emit("call:busy", {
      to: payload.from,
      from: currentUserPhone,
      chatId: payload.chatId,
    });
    return;
  }

  const incomingCallState = {
    status: "incoming",
    direction: "incoming",
    chatId: payload.chatId,
    peerPhone: payload.from,
    peerName: payload.fromName || payload.from,
    offer: payload.offer,
    startedAt: null,
    error: "",
  };
  callStateRef.current = incomingCallState;
  setCallState(incomingCallState);
};

const handleCallAnswered = async ({ from, answer }) => {
  const activeCall = callStateRef.current;
  if (!answer || normalizePhoneKey(activeCall.peerPhone) !== normalizePhoneKey(from)) return;

  try {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    await flushPendingIceCandidates();

    const connectingCallState = {
      ...activeCall,
      status: "connecting",
      offer: null,
    };
    callStateRef.current = connectingCallState;
    setCallState(connectingCallState);
    startCallConnectTimeout();
    if (pc.connectionState === "connected" || pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      markCallConnected();
    }
  } catch (err) {
    console.error("Call answer failed:", err);
    endCall("answer-failed", true);
  }
};

const handleRemoteIceCandidate = async ({ from, candidate }) => {
  const activeCall = callStateRef.current;
  if (!candidate || normalizePhoneKey(activeCall.peerPhone) !== normalizePhoneKey(from)) return;

  const pc = peerConnectionRef.current;
  if (!pc || !pc.remoteDescription) {
    pendingIceCandidatesRef.current.push(candidate);
    return;
  }

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("Failed to add ICE candidate:", err);
  }
};

const handleCallRejected = ({ from }) => {
  const activeCall = callStateRef.current;
  if (normalizePhoneKey(activeCall.peerPhone) !== normalizePhoneKey(from)) return;

  alert("Call declined.");
  endCall("rejected", false);
};

const handleCallBusy = ({ from }) => {
  const activeCall = callStateRef.current;
  if (normalizePhoneKey(activeCall.peerPhone) !== normalizePhoneKey(from)) return;

  alert("The user is already on another call.");
  endCall("busy", false);
};

const handleRemoteCallEnded = ({ from }) => {
  const activeCall = callStateRef.current;
  if (normalizePhoneKey(activeCall.peerPhone) !== normalizePhoneKey(from)) return;

  endCall("remote-ended", false);
};

useEffect(() => {
  const s = getSocket();

  s.on("call:incoming", handleIncomingCall);
  s.on("call:answered", handleCallAnswered);
  s.on("call:ice-candidate", handleRemoteIceCandidate);
  s.on("call:rejected", handleCallRejected);
  s.on("call:busy", handleCallBusy);
  s.on("call:ended", handleRemoteCallEnded);

  return () => {
    s.off("call:incoming", handleIncomingCall);
    s.off("call:answered", handleCallAnswered);
    s.off("call:ice-candidate", handleRemoteIceCandidate);
    s.off("call:rejected", handleCallRejected);
    s.off("call:busy", handleCallBusy);
    s.off("call:ended", handleRemoteCallEnded);
    endCall("unmounted", true);
  };
}, []);

useEffect(() => {
  if (callState.status !== "connected") return;

  const timer = setInterval(() => {
    const startedAt = callStateRef.current.startedAt || Date.now();
    setCallSeconds(Math.floor((Date.now() - startedAt) / 1000));
  }, 1000);

  return () => clearInterval(timer);
}, [callState.status]);

  // ── 4. useMemo ────────────────────────────────
  const tabs = useMemo(() => {
    if (!Array.isArray(chatList)) return [];
    const count = (s) => chatList.filter((c) => c.status === s).length;
    return [
      { id: "active", label: "ACTIVE", count: count("active") },
      { id: "requesting", label: "REQUESTING", count: count("requesting") },
      { id: "intervened", label: "INTERVENED", count: count("intervened") },
    ];
  }, [chatList]);

  const searchSuggestions = useMemo(() => {
    if (!search.trim() || showContacts) return [];
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.includes(search)
    ).slice(0, 5);
  }, [search, contacts, showContacts]);

  // Find your filteredChats useMemo and change the filter:
const filteredChats = useMemo(() => {
  if (!Array.isArray(chatList)) return [];
  return chatList
    .filter((c) => {
      // ✅ FIX: treat missing/undefined status as "active"
      const chatStatus = c.status || "active";
      return chatStatus === activeTab;
    })
    .filter((c) => {
      const v = search.toLowerCase();
      return (
        (c.name || "").toLowerCase().includes(v) ||
        (c.phone || "").toLowerCase().includes(v) ||
        (c.email || "").toLowerCase().includes(v)
      );
    });
}, [activeTab, chatList, search]);

  useLayoutEffect(() => {
    if (isLoading) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.35 } });
      if (listPanelRef.current) tl.fromTo(listPanelRef.current, { opacity: 0, x: -12 }, { opacity: 1, x: 0 });
      if (centerPanelRef.current) tl.fromTo(centerPanelRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, "-=0.2");
      if (rightPanelRef.current) tl.fromTo(rightPanelRef.current, { opacity: 0, x: 12 }, { opacity: 1, x: 0 }, "-=0.2");
    }, pageRef);
    return () => ctx.revert();
  }, [isLoading]);

  // ── 6. Handlers ───────────────────────────────
  const getTimeNow = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const handleSelectChat = (chat) => {
  setSelectedChat(chat);
  setShowEmojiPicker(false);
  setAttachmentMenuOpen(false);
  setPendingAttachment(null);
  setChatList((prev) =>
    prev.map((item) => item._id === chat._id ? { ...item, unread: 0 } : item)
  );
  if (isMobile) {
    setMobileChatOpen(true);
    window.dispatchEvent(new Event("detailViewOpen")); // ✅ ADD THIS
  }
};

const handleChatDropdownOpen = (e, chat) => {
  e.stopPropagation();
  const rect = e.currentTarget.getBoundingClientRect();
  setChatDropdown({ open: true, chat, x: rect.left - 160, y: rect.bottom + 4 });
};

const closeChatDropdown = () => setChatDropdown({ open: false, chat: null, x: 0, y: 0 });

const handleDeleteChat = async (chatId) => {
  try {
    await API.delete(`/chats/${chatId}`);
    setChatList(prev => prev.filter(c => c._id !== chatId));
    if (selectedChat?._id === chatId) setSelectedChat(null);
  } catch (err) {
    console.error("Delete chat error:", err);
    alert(err.response?.data?.error || "Error deleting chat");
  }
};

const handleDeleteGroup = async (chatId) => {
  try {
    await API.delete(`/groups/${chatId}`);
    setChatList(prev => prev.filter(c => c._id !== chatId));
    if (selectedChat?._id === chatId) setSelectedChat(null);
  } catch (err) {
    console.error("Delete group error:", err);
    alert(err.response?.data?.error || "Error deleting group");
  }
};

const handleClearChat = async (chatId) => {
  try {
    await API.delete(`/chats/clear/${chatId}`); // ✅ match your backend mount path
    setMessages(prev => ({ ...prev, [chatId]: [] }));
  } catch (err) {
    console.error("Clear chat error:", err);
    alert("Error clearing chat");
  }
};

const handlePinChat = (chatId) => {
  setChatList(prev => {
    const chat = prev.find(c => c._id === chatId);
    if (!chat) return prev;
    const pinned = !chat.pinned;
    const updated = prev.map(c => c._id === chatId ? { ...c, pinned } : c);
    return [...updated.filter(c => c.pinned), ...updated.filter(c => !c.pinned)];
  });
  closeChatDropdown();
};

const openDeleteConfirm = (chat, isGroup) => {
  setDeleteTarget({ chatId: chat._id, isGroup });
  setShowDeleteConfirmModal(true);
  closeChatDropdown();
};

  const handleForwardMessage = (msg) => {
    setForwardMessage(msg);
    setShowForwardModal(true);
  };

  const sendForward = async (targetChat) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!forwardMessage || !targetChat) return;

    const payload = {
      chatId: targetChat._id,
      sender: user.phone,
      messageType: forwardMessage.messageType,
      text: forwardMessage.text || "",
      fileUrl: forwardMessage.url || null,
      fileName: forwardMessage.fileName || null,
      templateMeta: forwardMessage.templateMeta || null,
    };

    await API.post("/messages", payload).catch(console.error);

    setShowForwardModal(false);
    setForwardMessage(null);
    setSelectedChat(targetChat);
  };

  // ----- Message deletion handlers -----
  const openDeleteModal = (messageId) => {
    setSelectedMessageId(messageId);
    setShowDeleteModal(true);
  };

const deleteForMe = async () => {
  if (!selectedMessageId) return;

  // 🔥 FIX: skip temp messages
  if (selectedMessageId.startsWith("tmp-")) {
    setMessages(prev => {
      const updated = { ...prev };
      const chatId = selectedChat._id;
      updated[chatId] = updated[chatId].filter(
        msg => msg.id !== selectedMessageId
      );
      return updated;
    });

    setShowDeleteModal(false);
    setSelectedMessageId(null);
    return;
  }

  try {
    const res = await API.delete(`/messages/${selectedMessageId}`, {
      data: { mode: "me" }, // ✅ removed userPhone
    });

    if (res.status === 200) {
      setMessages(prev => {
        const updated = { ...prev };
        const chatId = selectedChat._id;
        updated[chatId] = updated[chatId].filter(
          msg => msg.id !== selectedMessageId
        );
        return updated;
      });

      setShowDeleteModal(false);
      setSelectedMessageId(null);
    }
  } catch (err) {
    console.error(err);
    alert("Error deleting message");
  }
};

const deleteForEveryone = async () => {
  if (!selectedMessageId) return;

  // 🔥 FIX: skip temp messages
  if (selectedMessageId.startsWith("tmp-")) {
    setShowDeleteModal(false);
    setSelectedMessageId(null);
    return;
  }

  try {
    const res = await API.delete(`/messages/${selectedMessageId}`, {
      data: { mode: "everyone" }, // ✅ removed userPhone
    });

    if (res.status === 200) {
      setMessages(prev => {
        const updated = { ...prev };
        const chatId = selectedChat._id;

        updated[chatId] = updated[chatId].map(msg =>
          msg.id === selectedMessageId
            ? {
                ...msg,
                isDeleted: true,
                text: "This message was deleted",
                url: null,
                fileName: null,
              }
            : msg
        );

        return updated;
      });

      setShowDeleteModal(false);
      setSelectedMessageId(null);
    }
  } catch (err) {
    console.error(err);
    alert("Error deleting message");
  }
};


  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const next = chatList.filter((c) => c.status === tabId);
    setSelectedChat(next[0] || null);
    setMobileChatOpen(false);
    setShowEmojiPicker(false);
    setAttachmentMenuOpen(false);
    setPendingAttachment(null);
  };

  const startChatWithContact = async (contact) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!contact.mobile) return;
  try {
    const res = await API.post("/chats", {
      senderPhone: user.phone,
      receiverPhone: contact.mobile,
    });
    
    // ✅ FIX: normalize the chat — backend may return different shape
    const rawChat = res.data;
    const chat = {
      ...rawChat,
      name: rawChat.name || contact.name || rawChat.groupName || contact.mobile,
      phone: rawChat.phone || contact.mobile,
      status: rawChat.status || "active", // ✅ ensure status exists
    };
    
    if (!chat._id) throw new Error("Chat creation failed");
    
    getSocket().emit("joinChat", chat._id);
    
    // ✅ FIX: don't add duplicate, just update if exists
    setChatList(prev => {
      if (!Array.isArray(prev)) return [chat];
      const exists = prev.find(c => c._id === chat._id);
      if (exists) {
        // update name in case it was missing before
        return prev.map(c => c._id === chat._id ? { ...c, name: chat.name, phone: chat.phone } : c);
      }
      return [chat, ...prev];
    });
    
    setSelectedChat(chat);
    setShowContacts(false);
    setSearch("");
    
    if (isMobile) {
      setMobileChatOpen(true);
      window.dispatchEvent(new Event("detailViewOpen"));
    }
  } catch (err) {
    console.error(err);
    alert("Could not create chat with this contact.");
  }
};

  const deleteContact = async (contactId, contactName) => {
    if (!confirm(`Delete "${contactName}" from contacts?`)) return;
    try {
      const res = await API.delete(`/contacts/${contactId}`);
      if (res.status === 200) {
        setContacts(prev => prev.filter(c => c._id !== contactId));
      } else {
        alert("Failed to delete contact");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting contact");
    }
  };

  const createGroup = async () => {
    if (isMobile) {
  setMobileChatOpen(true);
  window.dispatchEvent(new Event("detailViewOpen")); // ✅ ADD THIS
}
    if (!groupName.trim() || selectedContactsForGroup.length === 0) {
      alert("Please enter a group name and select at least one contact");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user"));
    const participants = [user.phone, ...selectedContactsForGroup.map(c => c.mobile)];
    try {
      const res = await API.post("/groups", {
        groupName,
        participants,
        admin: user.phone,
      });
      const newGroup = res.data;
      if (!newGroup._id) throw new Error("Group creation failed");

      // Ensure name field is set (backend may return groupName instead of name)
      const groupWithName = {
        ...newGroup,
        name: newGroup.name || newGroup.groupName || groupName,
      };

      setChatList(prev => [groupWithName, ...prev]);
      setSelectedChat(groupWithName);
      setShowGroupModal(false);
      setGroupName("");
      setSelectedContactsForGroup([]);
      if (isMobile) setMobileChatOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to create group. Make sure your backend has the /api/groups endpoint.");
    }
  };

  const handleSearchUser = async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!search.trim()) return;

  let receiverPhone = search.trim();
  const matchedContact = contacts.find(
    (c) =>
      c.name?.toLowerCase() === search.trim().toLowerCase() ||
      c.mobile === search.trim()
  );
  if (matchedContact) receiverPhone = matchedContact.mobile;

  if (!/^[0-9+\-\s()]+$/.test(receiverPhone)) {
    alert("Please enter a valid phone number or contact name");
    return;
  }

  try {
    const res = await API.post("/chats", {
      senderPhone: user.phone,
      receiverPhone,
    });
    
    const rawChat = res.data;
    // ✅ FIX: normalize name + status
    const chat = {
      ...rawChat,
      name: rawChat.name || matchedContact?.name || receiverPhone,
      phone: rawChat.phone || receiverPhone,
      status: rawChat.status || "active",
    };
    
    if (!chat._id) throw new Error("Chat creation failed");
    getSocket().emit("joinChat", chat._id);

    setChatList((prev) => {
      if (!Array.isArray(prev)) return [chat];
      const exists = prev.find((c) => c._id === chat._id);
      // ✅ FIX: if exists, update it; don't add duplicate
      if (exists) return prev.map(c => c._id === chat._id ? { ...c, name: chat.name } : c);
      return [chat, ...prev];
    });
    
    setSelectedChat(chat);
    setSearch("");
  } catch (err) {
    console.error(err);
    alert("User not found or error creating chat.");
  }
};

const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await API.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (res.status !== 200) throw new Error("Upload failed");

  const data = res.data;

  // ✅ Add audio/ check here
  if (!data.messageType) {
    if (file.type.startsWith("image/")) data.messageType = "image";
    else if (file.type.startsWith("video/")) data.messageType = "video";
    else if (file.type.startsWith("audio/")) data.messageType = "audio"; // ✅ ADD THIS
    else data.messageType = "file";
  }

  return data;
};

const handleSend = async () => {
  if (!selectedChat || (!input.trim() && !pendingAttachment)) return;
  const chatId = selectedChat._id;
  const user = JSON.parse(localStorage.getItem("user"));
  const textToSend = input.trim(); // ✅ always defined here first

   setChatList(prev => {
    const chat = prev.find(c => String(c._id) === String(chatId));
    if (!chat) return prev;
    return [
      {
        ...chat,
        updatedAt: new Date().toISOString(),
        lastMessage: {
          text: textToSend || "",
          messageType: pendingAttachment
            ? pendingAttachment.kind === "image" ? "image"
              : pendingAttachment.kind === "video" ? "video"
              : "file"
            : "text",
          fileName: pendingAttachment?.fileName || null,
          createdAt: new Date().toISOString(),
        },
      },
      ...prev.filter(c => String(c._id) !== String(chatId)),
    ];
  });
  const sendMessage = async (textToSend, attachmentData = null) => {
    let messageData = {
      chatId,
      sender: user.phone,
      text: textToSend || "",
      messageType: "text",
    };
    if (attachmentData) {
      messageData = {
        ...messageData,
        messageType: attachmentData.messageType,
        fileUrl: attachmentData.fileUrl,
        fileName: attachmentData.fileName,
        fileSize: attachmentData.fileSize,
        text: "",
      };
    }
    await API.post("/messages", messageData).catch(console.error);
  };

  if (pendingAttachment) {
    const pa = pendingAttachment;
    setPendingAttachment(null);

    try {
      // ✅ Use rawFile directly — no need to re-fetch blob
      const file = pa.rawFile || await fetch(pa.url).then(r => r.blob()).then(b => new File([b], pa.fileName, { type: b.type }));
      const uploadData = await uploadFile(file);
      await sendMessage("", {
        messageType: uploadData.messageType,
        fileUrl: uploadData.fileUrl,
        fileName: uploadData.fileName || pa.fileName,
        fileSize: uploadData.fileSize || pa.fileSize,
      });
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file");
    }
  }


  if (textToSend) {
    const text = textToSend;
    setInput("");
    setMessages(prev => ({
      ...prev,
      [chatId]: [
        ...(prev[chatId] || []),
        {
  id: `tmp-${Date.now()}`,
  type: "sent",
  messageType: "text",
  text,
  time: getTimeNow(),
  createdAt: new Date().toISOString(),
  delivered: true,    // ✅ double tick immediately on send
  seen: false,
},
      ],
    }));
    await sendMessage(text);
  }

  setShowEmojiPicker(false);
  setAttachmentMenuOpen(false);
};

  const sendTemplate = async (template) => {
    const user = JSON.parse(localStorage.getItem("user"));

    // Convert variables Map to plain object
    let variables = {};
    if (template.variables) {
      try {
        variables = template.variables instanceof Map
          ? Object.fromEntries(template.variables)
          : typeof template.variables === "object"
            ? Object.fromEntries(Object.entries(template.variables))
            : {};
      } catch (e) {
        variables = {};
      }
    }

    const payload = {
      chatId: selectedChat._id,
      sender: user.phone,
      messageType: "template",
      templateMeta: {
        // ✅ FIX 1: try all possible ID fields
        templateId: template._id || template.id || null,

        header: template.name || "",
        footer: template.footer || "",
        mediaType: template.mediaType || "None",
        mediaUrl: template.imageFile?.url ||
          template.imageFile?.path ||
          template.videoFile?.url ||
          template.videoFile?.path || null,
        body: template.format || "",
        variables,

        actions: {
          // ✅ FIX 2: map title→label, value→url correctly
          ctaButtons: (template.ctaButtons || []).map(btn => ({
            id: btn.id,
            label: btn.title || btn.label || "",
            url: btn.value || btn.url || "",
            btnType: btn.btnType || "",
          })),

          quickReplies: (template.quickReplies || []).map(r => ({
            id: r.id,
            title: r.title || r.label || "",
          })),

          copyCodeButtons: (template.copyCodeButtons || []).map(btn => ({
            id: btn.id,
            label: btn.title || btn.label || "",
            value: btn.value || btn.code || "",
          })),

          // ✅ FIX 3: dropdownButtons and inputFields were not being mapped
          dropdownButtons: (template.dropdownButtons || []).map(dd => ({
            id: dd.id,
            title: dd.title || "",
            placeholder: dd.placeholder || "",
            options: dd.options || "",
            parsedOptions: dd.parsedOptions || [],
            selected: dd.selected || "",
          })),

          inputFields: (template.inputFields || []).map(f => ({
            id: f.id,
            label: f.label || "",
            placeholder: f.placeholder || "",
            value: f.value || "",
          })),
        },

        carouselItems: (template.carouselItems || []),
      },
    };

    console.log("SENDING PAYLOAD:", JSON.stringify(payload, null, 2)); // verify before removing
    await API.post("/messages", payload);
  };

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAttachment({
      kind: "image", fileName: file.name,
      fileSize: formatFileSize(file.size), url: URL.createObjectURL(file),
    });
    setAttachmentMenuOpen(false);
    e.target.value = "";
  };

  const handleFilePick = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const kind = isImage ? "image" : isVideo ? "video" : "file";

  setPendingAttachment({
    kind,
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    url: URL.createObjectURL(file),
    rawFile: file, // ✅ keep original file for upload
  });

  setAttachmentMenuOpen(false);
  e.target.value = "";
};

 const handleAttachmentAction = (type) => {
  if (type === "photos") {
    fileInputRef.current?.click();
    setAttachmentMenuOpen(false);
    return;
  }
  if (type === "document") {
    documentInputRef.current?.click();
    setAttachmentMenuOpen(false);
    return;
  }
  if (type === "camera") {
    setShowCameraModal(true);
    setAttachmentMenuOpen(false);
    return;
  }
  if (type === "audio") {
    setShowAudioRecorder(true);
    setAttachmentMenuOpen(false);
    return;
  }
  if (type === "contact") {
    setShowContactPicker(true);
    setAttachmentMenuOpen(false);
    return;
  }
  setAttachmentMenuOpen(false);
};

const capturePhoto = () => {
  const video = videoPreviewRef.current;
  if (!video) return;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
    setPendingAttachment({
      kind: "image",
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      url: URL.createObjectURL(blob),
      rawFile: file,
    });
    setShowCameraModal(false);
  }, "image/jpeg", 0.92);
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(s => s + 1);
    }, 1000);
  } catch (err) {
    alert("Microphone access denied");
  }
};

const stopRecording = () => {
  mediaRecorderRef.current?.stop();
  clearInterval(recordingTimerRef.current);
  setIsRecording(false);
};

const sendAudioMessage = async () => {
  if (!audioBlob || !selectedChat) return;
  const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
  try {
    const uploadData = await uploadFile(file);
    const user = JSON.parse(localStorage.getItem("user"));
    await API.post("/messages", {
      chatId: selectedChat._id,
      sender: user.phone,
      messageType: "audio",
      fileUrl: uploadData.fileUrl,
      fileName: uploadData.fileName || file.name,
      text: "",
    });
    setAudioBlob(null);
    setShowAudioRecorder(false);
    setRecordingSeconds(0);
  } catch (err) {
    alert("Failed to send audio");
  }
};

const sendContactMessage = async (contact) => {
  if (!selectedChat) return;
  const user = JSON.parse(localStorage.getItem("user"));

  // ✅ Optimistic UI update
  const tempMsg = {
    id: `tmp-${Date.now()}`,
    type: "sent",
    messageType: "contact",
    contactName: contact.name,
    contactPhone: contact.mobile,
    contactEmail: contact.email || "",
    text: "",
    time: getTimeNow(),
    createdAt: new Date().toISOString(),
    delivered: false,
    seen: false,
  };

  setMessages(prev => ({
    ...prev,
    [selectedChat._id]: [...(prev[selectedChat._id] || []), tempMsg],
  }));

  await API.post("/messages", {
    chatId: selectedChat._id,
    sender: user.phone,
    messageType: "contact",
    contactName: contact.name,
    contactPhone: contact.mobile,
    contactEmail: contact.email || "",
    text: "",
  }).catch(console.error);

  setShowContactPicker(false);
};

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (selectedChat && currentUser) {
      const s = getSocket();
      s.emit("typing", { chatId: selectedChat._id, user: currentUser.name });
      if (typingTimeout) clearTimeout(typingTimeout);
      setTypingTimeout(setTimeout(() => { }, 1000));
    }
  };

  // Replace your existing lastMessageText function
const lastMessageText = (chatId) => {
  // ✅ Always prefer chatList.lastMessage first (kept in sync)
  const chat = chatList.find(c => c._id === chatId);
  const lm = chat?.lastMessage;

  // ✅ Then check messages array as secondary source
  const msgs = messages[chatId];
  const last = msgs?.[msgs.length - 1];

  // ✅ Pick whichever is newer
  const useMsg =
    last &&
    lm &&
    new Date(last.createdAt) > new Date(lm.createdAt)
      ? "msgs"
      : last && !lm
      ? "msgs"
      : "chatList";

  const source = useMsg === "msgs" ? last : lm;

  if (!source) return "Start conversation";
  if (source.isDeleted) return "🚫 This message was deleted";
 if (source.messageType === "image") return "📷 Photo";
if (source.messageType === "video") return "🎥 Video";
if (source.messageType === "audio") return "🎙️ Audio"; 
if (source.messageType === "file") return `📎 ${source.fileName || "File"}`;
if (source.messageType === "template") return "📋 Template";
if (source.messageType === "contact") return `👤 ${source.contactName || source.text || "Contact"}`;
return source.text || "Start conversation";
};

// Replace your existing lastMessageTime function
const lastMessageTime = (chatId) => {
  const chat = chatList.find(c => c._id === chatId);
  const lm = chat?.lastMessage;

  const msgs = messages[chatId];
  const last = msgs?.[msgs.length - 1];

  // ✅ Pick whichever is newer
  const useMsg =
    last &&
    lm &&
    new Date(last.createdAt) > new Date(lm.createdAt)
      ? "msgs"
      : last && !lm
      ? "msgs"
      : "chatList";

  if (useMsg === "msgs" && last?.createdAt) {
    return new Date(last.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!lm?.createdAt) return "";
  return new Date(lm.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getChatStatus = (chat) => {
  if (chat?.isGroup) return "";        // ← add this
  if (!chat?.phone) return "";
  const presence = userPresence[chat.phone];
  if (!presence) return "Offline";
  if (presence.online) return "Online";

  const ls = presence.lastSeen;
  if (!ls) return "";

  const date = new Date(ls);
  const now = new Date();
  const diffMins = Math.floor((now - date) / 60000);
  const diffHours = Math.floor((now - date) / 3600000);

  if (diffMins < 1) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `Last seen today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return `Last seen ${date.toLocaleDateString([], { day: "numeric", month: "short" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

  // ── 7. JSX ────────────────────────────────────
  return (
    <>
      <style>{`
          html, body { height: 100%; overflow: hidden; }
          .sticky-chat-shell {
            position: fixed;
            top: 70px; left: 88px; right: 0; bottom: 0;
            overflow: hidden;
            background: #f0f2f5;
          }
          .scroll-hidden {
            overflow-y: auto; overflow-x: hidden;
            -ms-overflow-style: none; scrollbar-width: none;
          }
          .scroll-hidden::-webkit-scrollbar { display: none; }
          .chat-bg {
            background-color: #efeae2;
            background-image: radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px);
            background-size: 28px 28px;
          }
          .icon-btn, .chat-item, .send-btn, .tab-pill,
          .composer-action-btn, .attach-row-btn, .emoji-chip {
            will-change: transform, opacity;
            backface-visibility: hidden;
            transform: translateZ(0);
          }
          .icon-btn { transition: background 0.18s ease, transform 0.18s ease; }
          .icon-btn:hover { background: #e9edef !important; }
          .chat-item { transition: background 0.18s ease; }
          .chat-item:hover { background: #f5f6f6 !important; }
          .send-btn { transition: transform 0.18s ease, box-shadow 0.18s ease; }
          .send-btn:hover { transform: scale(1.03); box-shadow: 0 10px 22px rgba(0,168,132,0.2); }
          .tab-pill {
            border: none; white-space: nowrap;
            font-size: 0.78rem; font-weight: 700;
            background: #f0f2f5; color: #54656f;
            transition: background 0.2s ease, color 0.2s ease;
          }
          .tab-pill.active-tab { background: #d9fdd3 !important; color: #005c4b !important; }
          .msg-enter { animation: msgIn 0.22s ease both; }
          .composer-action-btn {
            width: 42px; height: 42px;
            border: none; outline: none;
            border-radius: 50%; background: transparent; color: #54656f;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
            flex-shrink: 0;
          }
          .composer-action-btn:hover { background: #e9edef; }
          .composer-action-btn.active { background: #e7fef5; color: #00a884; }
          .attach-sheet {
            position: absolute; left: 0; bottom: 56px;
            width: 250px; background: #ffffff;
            border-radius: 18px; box-shadow: 0 16px 45px rgba(17,27,33,0.16);
            border: 1px solid rgba(17,27,33,0.06);
            padding: 12px 10px; z-index: 40;
          }
          .attach-row-btn {
            width: 100%; border: none; background: transparent;
            display: flex; align-items: center; gap: 14px;
            padding: 11px 12px; border-radius: 12px; text-align: left;
            transition: background 0.18s ease, transform 0.18s ease;
          }
          .attach-row-btn:hover { background: #f7f8fa; }
          .attach-icon-box {
            width: 28px; height: 28px; border-radius: 999px;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          .emoji-panel {
            position: absolute; left: 0; bottom: 56px;
            width: 280px; background: #ffffff;
            border-radius: 18px; box-shadow: 0 16px 45px rgba(17,27,33,0.16);
            border: 1px solid rgba(17,27,33,0.06);
            padding: 12px; z-index: 40;
          }
          .emoji-chip {
            width: 100%; height: 40px; border: none;
            background: transparent; border-radius: 10px; font-size: 1.15rem;
            transition: background 0.16s ease, transform 0.16s ease;
          }
          .emoji-chip:hover { background: #f5f6f6; transform: translateY(-1px); }
          @keyframes msgIn {
            from { opacity: 0; transform: translateY(8px) scale(0.988); }
            to   { opacity: 1; transform: translateY(0)  scale(1); }
          }
          @media (max-width: 820px) {
  .sticky-chat-shell { top: 60px; left: 0; bottom: 62px; }
  .attach-sheet { width: 220px; }
  .emoji-panel  { width: 250px; }
  
  /* Smaller fonts in chat on mobile */
  .msg-enter .bubble-text { font-size: 0.82rem !important; }
  .chat-item { font-size: 0.88rem !important; }
}
            @media (max-width: 820px) {
  .sticky-chat-shell.chat-active {
    top: 0;         /* topbar is gone */
    bottom: 0;      /* bottom tabs are also hidden when chat open */
  }
}
        `}</style>
      <style>{shimmerCSS}</style>
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {callState.status !== "idle" && createPortal(
        <CallOverlay
          callState={callState}
          callSeconds={callSeconds}
          isMuted={isCallMuted}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
          onEnd={() => endCall("ended", true)}
          onToggleMute={toggleCallMute}
        />,
        document.body
      )}

      <div
  ref={pageRef}
  className={`sticky-chat-shell${isMobile && mobileChatOpen ? " chat-active" : ""}`}
  style={{ padding: "0 10px" }}
>
        <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
<input
  ref={fileInputRef}
  type="file"
  accept="video/*,image/*"
  hidden
  onChange={handleFilePick}
/>
<input
  ref={documentInputRef}
  type="file"
  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip,.rar,.json,.xml"
  hidden
  onChange={handleFilePick}
/>

        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          {isLoading ? (
            <LiveChatSkeleton />
          ) : (
            <>
              {/* LEFT PANEL (unchanged) */}
              {(!isMobile || !mobileChatOpen) && (
                <div
                  ref={listPanelRef}
                  className="d-flex flex-column bg-white border-end"
                  style={{ width: isMobile ? "100%" : "380px", minWidth: isMobile ? "100%" : "380px", height: "100%", minHeight: 0, overflow: "hidden" }}
                >
                  <div className="d-flex align-items-center justify-content-between px-3 border-bottom flex-shrink-0" style={{ height: 59, background: "#f0f2f5" }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 40, height: 40, background: "#dfe5e7", color: "#54656f" }}>K</div>
                      <div className="fw-semibold" style={{ color: "#111b21" }}>
                        <button onClick={() => setShowContacts(false)} className="btn btn-sm p-0 me-2" style={{ fontWeight: !showContacts ? 'bold' : 'normal', color: !showContacts ? '#111b21' : '#54656f', background: 'none', border: 'none' }}>Chats</button>
                        <span style={{ color: '#54656f' }}>|</span>
                        <button onClick={() => setShowContacts(true)} className="btn btn-sm p-0 ms-2" style={{ fontWeight: showContacts ? 'bold' : 'normal', color: showContacts ? '#111b21' : '#54656f', background: 'none', border: 'none' }}>Contacts</button>
                      </div>
                    </div>
                    <div className="d-flex gap-1">
                      <button type="button" onClick={() => setShowGroupModal(true)} className="icon-btn btn border-0 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 38, height: 38, background: "transparent", color: "#54656f" }}><FiUsers size={18} /></button>
                      <HeaderIcon icon={<FiMoreVertical size={18} />} />
                    </div>
                  </div>

                  <div className="p-2 border-bottom flex-shrink-0 bg-white" style={{ position: "relative" }}>
                    <div className="d-flex align-items-center gap-2 px-3" style={{ height: 36, borderRadius: 8, background: "#f0f2f5" }}>
                      <FiSearch size={15} color="#54656f" />
                      <input type="text" placeholder={showContacts ? "Search contacts..." : "Search or start new chat"} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !showContacts) handleSearchUser(); }} style={{ flex: 1, background: "transparent", border: "none", outline: "none" }} />
                      {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#54656f", cursor: "pointer", padding: 0 }}><FiX size={14} /></button>}
                    </div>
                    {searchSuggestions.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 8, right: 8, background: "#fff", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", border: "1px solid #e9edef", zIndex: 999, overflow: "hidden" }}>
                        {searchSuggestions.map(contact => (
                          <div
                            key={contact._id || contact.mobile}
                            onClick={() => { startChatWithContact(contact); setSearch(""); }}
                            className="d-flex align-items-center gap-3 px-3 py-2"
                            style={{ cursor: "pointer", borderBottom: "1px solid #f0f2f5" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f5f6f6"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width: 36, height: 36, background: "#dfe5e7", color: "#54656f", fontSize: "0.9rem" }}>
                              {contact.name?.charAt(0) || "C"}
                            </div>
                            <div>
                              <div style={{ fontSize: "0.92rem", fontWeight: 500, color: "#111b21" }}>{contact.name}</div>
                              <div style={{ fontSize: "0.78rem", color: "#667781" }}>{contact.mobile}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!showContacts && (
                    <div className="d-flex gap-2 p-2 border-bottom bg-white flex-shrink-0 scroll-hidden">
                      {tabs.map((tab) => (
                        <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)} className={`btn rounded-pill px-3 py-2 tab-pill ${activeTab === tab.id ? "active-tab" : ""}`}>{tab.label} ({tab.count})</button>
                      ))}
                    </div>
                  )}

                  <div className="flex-grow-1 scroll-hidden" style={{ minHeight: 0, background: "#fff" }}>
                    {showContacts ? (
                      contacts.length === 0 ? (
                        <div className="text-center p-4" style={{ color: "#667781" }}>No contacts found</div>
                      ) : (
                        contacts
                          .filter((contact) =>
                            search
                              ? (contact.name?.toLowerCase().includes(search.toLowerCase()) ||
                                contact.mobile?.includes(search))
                              : true
                          )
                          .map((contact) => (
                            <div
                              key={contact._id || contact.mobile}
                              className="chat-item w-100 border-0 d-flex align-items-center gap-3 px-3 py-3"
                              style={{ borderBottom: "1px solid #f0f2f5", cursor: "pointer" }}
                            >
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                style={{ width: 49, height: 49, background: "#dfe5e7", color: "#54656f" }}
                                onClick={() => startChatWithContact(contact)}
                              >
                                {contact.name?.charAt(0) || "C"}
                              </div>
                              <div
                                className="flex-grow-1 overflow-hidden"
                                onClick={() => startChatWithContact(contact)}
                              >
                                <div className="text-truncate" style={{ fontSize: "0.98rem", fontWeight: 500, color: "#111b21" }}>
                                  {contact.name}
                                </div>
                                <div className="text-truncate" style={{ fontSize: "0.84rem", color: "#667781" }}>
                                  {contact.mobile}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteContact(contact._id, contact.name);
                                }}
                                className="btn btn-sm p-1"
                                style={{ color: "#dc3545", background: "transparent", border: "none" }}
                                title="Delete contact"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          ))
                      )
                    ) : (
                      filteredChats.length === 0 ? (
                        <div className="text-center p-4" style={{ color: "#667781" }}>No chats found</div>
                      ) : (
                        filteredChats.map((item) => (
  <div
    key={item._id}
    className="chat-item w-100 border-0 d-flex align-items-center gap-3 px-3 py-3"
    style={{
      background: selectedChat?._id === item._id ? "#f0f2f5" : "#ffffff",
      borderBottom: "1px solid #f0f2f5",
      cursor: "pointer",
      position: "relative",
    }}
    onClick={() => handleSelectChat(item)}
    onMouseEnter={() => setHoveredChatId(item._id)}
    onMouseLeave={() => setHoveredChatId(null)}
  >
    <div
      className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
      style={{ width: 49, height: 49, background: "#dfe5e7", color: "#54656f" }}
    >
      {item.name?.charAt(0) || "U"}
    </div>
    <div className="flex-grow-1 overflow-hidden">
      <div className="d-flex align-items-center justify-content-between gap-2">
        <div className="text-truncate" style={{ fontSize: "0.98rem", fontWeight: 500, color: "#111b21" }}>
          {item.name || item.phone}
          {item.pinned && (
            <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "#00a884" }}>📌</span>
          )}
        </div>
        <div className="flex-shrink-0" style={{ fontSize: "0.72rem", color: item.unread > 0 ? "#25d366" : "#667781" }}>
          {lastMessageTime(item._id)}
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-between gap-2 mt-1">
        <div className="text-truncate" style={{ fontSize: "0.84rem", color: "#667781" }}>
          {lastMessageText(item._id)}
        </div>
        {item.unread > 0 && (
          <div
            className="rounded-pill d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
            style={{ minWidth: 20, height: 20, background: "#25d366", fontSize: "0.7rem", padding: "0 6px" }}
          >
            {item.unread}
          </div>
        )}
      </div>
    </div>

    {/* ── WhatsApp-style hover chevron ── */}
    {hoveredChatId === item._id && (
      <button
        onClick={(e) => handleChatDropdownOpen(e, item)}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(255,255,255,0.92)", border: "1px solid #e9edef",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#54656f", zIndex: 2,
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        <FiChevronDown size={14} />
      </button>
    )}
  </div>
))
                      )
                    )}
                  </div>
                </div>
              )}

              {/* CENTER PANEL */}
              {(!isMobile || mobileChatOpen) && (
                <div ref={centerPanelRef} className="d-flex flex-column chat-bg" style={{ flex: 1, height: "100%", minHeight: 0, overflow: "hidden", minWidth: 0 }}>
                  {!selectedChat ? (
  <div
    className="d-flex flex-grow-1 flex-column align-items-center justify-content-center"
    style={{ background: "#f0f2f5", userSelect: "none" }}
  >
    {/* WhatsApp-style lock icon + title */}
    <div style={{ textAlign: "center", marginBottom: 40 }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 300, color: "#111b21", marginBottom: 8 }}>
        WhatsApp for Web
      </div>
      <div style={{ fontSize: "0.88rem", color: "#667781", maxWidth: 360, lineHeight: 1.6 }}>
        Send and receive messages without keeping your phone online.<br />
        Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
      </div>
    </div>

    {/* Action buttons — like WhatsApp Web */}
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
      {[
        {
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          ),
          label: "New contact",
          onClick: () => setShowContacts(true),
        },
        {
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
          label: "New group",
          onClick: () => setShowGroupModal(true),
        },
        {
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          ),
          label: "Find a chat",
          onClick: () => {
            setShowContacts(false);
            // focus the search input
            document.querySelector('input[placeholder*="Search"]')?.focus();
          },
        },
      ].map((btn, i) => (
        <button
          key={i}
          onClick={btn.onClick}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 10, padding: "20px 28px", borderRadius: 16,
            border: "1px solid #e9edef", background: "#fff",
            cursor: "pointer", color: "#54656f",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            transition: "box-shadow 0.2s ease, transform 0.2s ease",
            minWidth: 100,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {btn.icon}
          <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#54656f" }}>
            {btn.label}
          </span>
        </button>
      ))}
    </div>

    {/* End-to-end encryption note */}
    <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 6, color: "#667781", fontSize: "0.78rem" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Your personal messages are end-to-end encrypted
    </div>
  </div>
                  ) : (
                    <>
                      <div className="d-flex align-items-center justify-content-between px-3 border-bottom flex-shrink-0" style={{ height: 59, background: "#f0f2f5" }}>
                        <div className="d-flex align-items-center gap-3 overflow-hidden">
                          {isMobile && (
                            <button type="button" className="btn btn-sm border-0 shadow-none p-1" // Find the back button in the center panel header and update onClick:
onClick={() => {
  setMobileChatOpen(false);
  setSelectedChat(null);
  window.dispatchEvent(new Event("detailViewClose")); // ✅ ADD THIS
}}style={{ color: "#54656f" }}>
                              <FiArrowLeft size={20} />
                            </button>
                          )}
                          <div
                            className="d-flex align-items-center gap-3 overflow-hidden"
                            onClick={() => isMobile ? setShowMobileContactInfo(true) : setShowContactInfo(p => !p)}
                            style={{ cursor: isMobile ? "default" : "pointer", minWidth: 0 }}
                          >
                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width: 40, height: 40, background: "#dfe5e7", color: "#54656f" }}>
                              {selectedChat?.name?.charAt(0) || "U"}
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-truncate" style={{ fontSize: "0.96rem", fontWeight: 500, color: "#111b21" }}>{selectedChat?.name}</div>
<div style={{
  fontSize: "0.78rem",
  color: (!selectedChat?.isGroup && userPresence[selectedChat?.phone]?.online)
    ? "#00a884" : "#667781",
  fontWeight: (!selectedChat?.isGroup && userPresence[selectedChat?.phone]?.online)
    ? 500 : 400,
}}>
  {isUserTyping ? "typing..." : getChatStatus(selectedChat)}
</div>
                            </div>
                          </div>
                        </div>
                        <div className="d-flex gap-1 flex-shrink-0">
                          <HeaderIcon icon={<FiSearch size={18} />} />
                          <HeaderIcon
                            icon={<FiPhone size={18} />}
                            onClick={startVoiceCall}
                            disabled={selectedChat?.isGroup || callState.status !== "idle"}
                            title={selectedChat?.isGroup ? "Voice calls are available in direct chats" : "Voice call"}
                          />
                          <button
                            type="button"
                            onClick={() => isMobile ? setShowMobileContactInfo(true) : setShowContactInfo(p => !p)}
                            className="icon-btn btn border-0 rounded-circle d-flex align-items-center justify-content-center"
                            style={{
                              width: 38,
                              height: 38,
                              background: showContactInfo ? "#d9fdd3" : "transparent",
                              color: showContactInfo ? "#00a884" : "#54656f",
                            }}
                            title="Contact info"
                          >
                            <FiInfo size={18} />
                          </button>
                          <HeaderIcon icon={<FiMoreVertical size={18} />} />
                        </div>
                      </div>

                      <div ref={messageScrollRef} className="flex-grow-1 scroll-hidden d-flex flex-column gap-2 px-3 px-md-4 py-3" style={{ minHeight: 0 }}>
                       {(() => {
  const msgs = messages[selectedChat?._id] || [];
  const rendered = [];
  let lastLabel = null;

  msgs.forEach((msg, index) => {
    const label = getDateLabel(msg.createdAt);
    if (label && label !== lastLabel) {
      lastLabel = label;
      rendered.push(
        <div
          key={`sep-${index}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "8px 0",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.82)",
              color: "#54656f",
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: 8,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              userSelect: "none",
            }}
          >
            {label}
          </div>
        </div>
      );
    }

    rendered.push(
      <div
        key={`${msg.id}-${index}`}
        className="msg-enter"
        style={{
          animationDelay: `${index * 0.02}s`,
          display: "flex",
          justifyContent: msg.type === "sent" ? "flex-end" : "flex-start",
        }}
      >
        <MessageBubble
          msg={msg}
          onDeleteClick={openDeleteModal}
          onForward={handleForwardMessage}
          isGroup={selectedChat?.isGroup}
          contacts={contacts}
           onStartChat={(phone, name) => {        // ✅ ADD THIS
    const contact = { mobile: phone, name };
    startChatWithContact(contact);
  }}
          onSendMessage={async (newMsg) => {
            const user = JSON.parse(localStorage.getItem("user"));
            setMessages(prev => ({
              ...prev,
              [selectedChat._id]: [
                ...(prev[selectedChat._id] || []),
                newMsg
              ]
            }));
            try {
              await API.post("/messages", {
                chatId: selectedChat._id,
                sender: user.phone,
                text: newMsg.text,
                messageType: "text",
              });
            } catch (err) {
              console.error("Send failed:", err);
            }
          }}
        />
      </div>
    );
  });

  return rendered;
})()}
{isUserTyping && <div className="d-flex justify-content-start"><div className="px-3 py-2 rounded-3 bg-white" style={{ fontSize: "0.8rem", color: "#667781" }}>Typing...</div></div>}
                        {isUserTyping && <div className="d-flex justify-content-start"><div className="px-3 py-2 rounded-3 bg-white" style={{ fontSize: "0.8rem", color: "#667781" }}>Typing...</div></div>}
                      </div>

                      {pendingAttachment && (
                        <div
                          className="p-2 border-top flex-shrink-0"
                          style={{ background: "#f0f2f5" }}
                        >
                          <div
                            className="position-relative d-flex align-items-center gap-3 p-2 bg-white border rounded"
                            style={{ minHeight: 96 }}
                          >
                            <button
                              type="button"
                              onClick={() => setPendingAttachment(null)}
                              className="btn btn-sm rounded-circle position-absolute border-0"
                              style={{
                                top: 8,
                                right: 8,
                                width: 28,
                                height: 28,
                                background: "#f0f2f5",
                              }}
                            >
                              <FiX size={14} />
                            </button>

                            {/* 🔥 IMAGE */}
                            {pendingAttachment.kind === "image" ? (
                              <img
                                src={pendingAttachment.url}
                                alt={pendingAttachment.fileName}
                                style={{
                                  width: 76,
                                  height: 76,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  flexShrink: 0,
                                }}
                              />

                            ) : pendingAttachment.kind === "video" ? (
                              /* 🔥 VIDEO (NEW) */
                              <video
                                src={pendingAttachment.url}
                                controls
                                style={{
                                  width: 76,
                                  height: 76,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  flexShrink: 0,
                                }}
                              />

                            ) : (
                              /* 🔥 FILE */
                              <div
                                className="d-flex align-items-center justify-content-center rounded flex-shrink-0"
                                style={{
                                  width: 76,
                                  height: 76,
                                  background: "#f0f2f5",
                                }}
                              >
                                <FiFile size={28} color="#54656f" />
                              </div>
                            )}

                            {/* FILE INFO */}
                            <div className="overflow-hidden">
                              <div
                                className="fw-semibold pe-4 text-break"
                                style={{ color: "#111b21" }}
                              >
                                {pendingAttachment.fileName}
                              </div>
                              <div
                                className="mt-1"
                                style={{ fontSize: "0.82rem", color: "#667781" }}
                              >
                                {pendingAttachment.fileSize}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="d-flex align-items-center gap-2 p-2 p-md-3 border-top position-relative flex-shrink-0" style={{ background: "#f0f2f5" }}>
                        <div ref={attachmentWrapRef} className="position-relative">
                          <motion.button type="button" onClick={() => { setAttachmentMenuOpen((p) => !p); setShowEmojiPicker(false); }} className={`composer-action-btn ${attachmentMenuOpen ? "active" : ""}`} whileTap={{ scale: 0.9 }}>
                            <motion.div animate={{ rotate: attachmentMenuOpen ? 90 : 0 }} transition={{ duration: 0.18, ease: "easeOut" }}>{attachmentMenuOpen ? <FiX size={22} /> : <FiPlus size={24} />}</motion.div>
                          </motion.button>
                          <AnimatePresence>
                            {attachmentMenuOpen && (
                              <motion.div variants={popupVariants} initial="hidden" animate="visible" exit="exit" className="attach-sheet">
                                {attachmentItems.map((item, index) => {
                                  const Icon = item.icon;
                                  return (
                                    <motion.button key={item.id} type="button" onClick={() => handleAttachmentAction(item.id)} className="attach-row-btn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18, delay: index * 0.02 }} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
                                      <div className="attach-icon-box" style={{ color: item.color }}><Icon size={18} /></div>
                                      <span style={{ fontSize: "0.98rem", fontWeight: 500, color: "#1f2937" }}>{item.label}</span>
                                    </motion.button>
                                  );
                                })}
                                {/* Emoji section inside + menu — mobile only */}
{isMobile && (
  <div style={{ padding: "8px 4px 4px" }}>
    <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, marginBottom: 6, paddingLeft: 8 }}>EMOJI</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 4px" }}>
      {emojiList.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => { setInput((p) => p + emoji); setAttachmentMenuOpen(false); }}
          style={{
            width: 36, height: 36, border: "none",
            background: "transparent", borderRadius: 8,
            fontSize: "1.1rem", cursor: "pointer",
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  </div>
)}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Emoji button — desktop only */}
{!isMobile && (
  <div ref={emojiWrapRef} className="position-relative">
    <motion.button type="button" onClick={() => { setShowEmojiPicker((p) => !p); setAttachmentMenuOpen(false); }} className={`composer-action-btn ${showEmojiPicker ? "active" : ""}`} whileTap={{ scale: 0.9 }}>
      <motion.div animate={{ rotate: showEmojiPicker ? -8 : 0, scale: showEmojiPicker ? 1.05 : 1 }} transition={{ duration: 0.18, ease: "easeOut" }}><FiSmile size={21} /></motion.div>
    </motion.button>
    <AnimatePresence>
      {showEmojiPicker && (
        <motion.div variants={popupVariants} initial="hidden" animate="visible" exit="exit" className="emoji-panel">
          <div className="row g-2">
            {emojiList.map((emoji, index) => (
              <div className="col-2" key={emoji}>
                <motion.button type="button" onClick={() => setInput((p) => p + emoji)} className="emoji-chip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, delay: index * 0.008 }} whileTap={{ scale: 0.9 }}>{emoji}</motion.button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}

                        <input type="text" value={input} onChange={handleInputChange} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type a message" className="form-control border-0 shadow-none" style={{ height: 42, borderRadius: 24, background: "#ffffff", paddingLeft: 16, paddingRight: 16 }} />
                        {/* <button
                          type="button"
                          onClick={() => setShowTemplateModal(true)}
                          className="btn border-0 rounded-cir cle d-flex align-items-center justify-content-center"
                          style={{
                            width: 42,
                            height: 42,
                            background: "#e7fef5",
                            color: "#00a884",
                          }}
                        >
                          📄
                        </button> */}
                        <button type="button" onClick={handleSend} className="send-btn btn border-0 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 42, height: 42, background: "#00a884", color: "#ffffff", flexShrink: 0 }}><FiSend size={18} /></button>


                      </div>

                      {/* Mobile Contact Info Bottom Sheet */}
{isMobile && showMobileContactInfo && (
  <div
    onClick={() => setShowMobileContactInfo(false)}
    style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      zIndex: 2000,
      display: "flex",
      alignItems: "flex-end",
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: "#fff",
        borderRadius: "16px 16px 0 0",
        width: "100%",
        maxHeight: "85vh",
        overflowY: "auto",
        paddingBottom: 24,
      }}
    >
      {/* Handle bar */}
      <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#dfe5e7" }} />
      </div>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px 12px", borderBottom: "1px solid #f0f2f5",
      }}>
        <span style={{ fontWeight: 600, fontSize: "1rem", color: "#111b21" }}>
          {selectedChat?.isGroup ? "Group Info" : "Contact Info"}
        </span>
        <button
          onClick={() => setShowMobileContactInfo(false)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#54656f" }}
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Avatar + name */}
      <div style={{ textAlign: "center", padding: "24px 16px 16px", borderBottom: "8px solid #f0f2f5" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "#dfe5e7", color: "#54656f",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem", fontWeight: 700, margin: "0 auto 12px",
        }}>
          {selectedChat?.name?.charAt(0) || "U"}
        </div>
        <div style={{ fontSize: "1.08rem", fontWeight: 500, color: "#111b21" }}>
          {selectedChat?.name}
        </div>
        {!selectedChat?.isGroup && (
          <div style={{ fontSize: "0.84rem", color: "#667781", marginTop: 4 }}>
            {selectedChat?.phone}
          </div>
        )}
      </div>

      {/* Info sections */}
      <div style={{ padding: "0 0 8px" }}>
        {selectedChat?.isGroup ? (
          <DetailCard icon={<FiUsers size={16} />} title="Members"
            customContent={<div>{selectedChat.participants?.join(", ")}</div>} />
        ) : (
          <>
            <DetailCard icon={<FiInfo size={16} />} title="Basic Info"
              items={[
                { label: "Phone", value: selectedChat?.phone },
                { label: "Email", value: selectedChat?.email },
                { label: "City", value: selectedChat?.city },
                { label: "Status", value: selectedChat?.lastSeen },
              ]} />
            <DetailCard icon={<FiTag size={16} />} title="Lead Tag"
              items={[{ label: "Tag", value: tags.find(t => t._id === selectedChat?.tag)?.name || selectedChat?.tag || "No tag" }]} />
            <DetailCard icon={<FiMessageSquare size={16} />} title="Notes"
              customContent={<div style={{ fontSize: "0.9rem", color: "#3b4a54", lineHeight: 1.6 }}>{selectedChat?.notes}</div>} />
          </>
        )}
      </div>
    </div>
  </div>
)}
                    </>
                  )}
                </div>
              )}

              {/* RIGHT PANEL (unchanged) */}
              <AnimatePresence>
  {!isMobile && showContactInfo && (
    <motion.div
      ref={rightPanelRef}
      className="d-flex flex-column border-start bg-white"
      style={{ width: "340px", minWidth: "340px", height: "100%", minHeight: 0, overflow: "hidden" }}
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="d-flex align-items-center justify-content-between border-bottom flex-shrink-0 fw-semibold px-3"
        style={{ height: 59, background: "#f0f2f5", color: "#111b21" }}
      >
        <span>{selectedChat?.isGroup ? "Group Info" : "Contact Info"}</span>
        <button
          onClick={() => setShowContactInfo(false)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#54656f", display: "flex", alignItems: "center" }}
        >
          <FiX size={18} />
        </button>
      </div>

      <div className="flex-grow-1 scroll-hidden" style={{ minHeight: 0, background: "#f7f8fa" }}>
        {selectedChat ? (
          <>
            {/* ── AVATAR + NAME + LIVE STATUS ── */}
            <div className="bg-white text-center px-3 py-4" style={{ borderBottom: "10px solid #f0f2f5" }}>
              {/* Avatar with online dot */}
              <div style={{ position: "relative", width: 92, height: 92, margin: "0 auto 12px" }}>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 92, height: 92, background: "#dfe5e7", color: "#54656f", fontSize: "1.8rem" }}
                >
                  {selectedChat?.name?.charAt(0) || "U"}
                </div>
                {/* Online dot — only for 1-on-1 chats */}
                {!selectedChat?.isGroup && userPresence[selectedChat?.phone]?.online && (
                  <span style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#25d366",
                    border: "2.5px solid #ffffff",
                  }} />
                )}
              </div>

              <div style={{ fontSize: "1.08rem", fontWeight: 500, color: "#111b21" }}>
                {selectedChat?.name}
              </div>

              {!selectedChat?.isGroup && (
                <div style={{ fontSize: "0.84rem", color: "#667781", marginTop: 2 }}>
                  {selectedChat?.phone}
                </div>
              )}

              {/* ── LIVE STATUS BADGE ── */}
              {!selectedChat?.isGroup && (() => {
                const presence = userPresence[selectedChat?.phone];
                if (!presence) return null;

                const isOnline = presence.online;
                const statusText = isOnline ? "Online" : getChatStatus(selectedChat);

                return (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {/* Colored dot */}
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isOnline ? "#25d366" : "#aab8c2",
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: "0.8rem",
                      color: isOnline ? "#00a884" : "#667781",
                      fontWeight: isOnline ? 500 : 400,
                    }}>
                      {statusText}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* ── DETAIL CARDS ── */}
            {selectedChat?.isGroup ? (
              <DetailCard
                icon={<FiUsers size={16} />}
                title="Members"
                customContent={
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedChat.participants?.map((phone, i) => {
                      const contact = contacts.find(c => c.mobile === phone);
                      const presence = userPresence[phone];
                      const isOnline = presence?.online;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* Mini avatar */}
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "#dfe5e7", color: "#54656f",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.8rem", fontWeight: 600, flexShrink: 0,
                            position: "relative",
                          }}>
                            {(contact?.name || phone)?.charAt(0)?.toUpperCase()}
                            {isOnline && (
                              <span style={{
                                position: "absolute", bottom: 0, right: 0,
                                width: 9, height: 9, borderRadius: "50%",
                                background: "#25d366", border: "1.5px solid #fff",
                              }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {contact?.name || phone}
                            </div>
                            <div style={{ fontSize: "0.74rem", color: isOnline ? "#00a884" : "#aab8c2", fontWeight: isOnline ? 500 : 400 }}>
                              {isOnline ? "Online" : (presence?.lastSeen ? getChatStatus({ phone, isGroup: false }) : "Offline")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              />
            ) : (
              <>
                <DetailCard
                  icon={<FiInfo size={16} />}
                  title="Basic Info"
                  items={[
                    { label: "Phone", value: selectedChat?.phone },
                    { label: "Email", value: selectedChat?.email },
                    { label: "City", value: selectedChat?.city },
                    { label: "Status", value: selectedChat?.lastSeen },
                  ]}
                />
                <DetailCard
                  icon={<FiTag size={16} />}
                  title="Lead Tag"
                  items={[{ label: "Tag", value: tags.find(t => t._id === selectedChat.tag)?.name || selectedChat.tag || "No tag" }]}
                />
                <DetailCard
                  icon={<FiMessageSquare size={16} />}
                  title="Notes"
                  customContent={
                    <div style={{ fontSize: "0.9rem", color: "#3b4a54", lineHeight: 1.6 }}>
                      {selectedChat.notes || <span style={{ color: "#aab8c2", fontStyle: "italic" }}>No notes added</span>}
                    </div>
                  }
                />
              </>
            )}
          </>
        ) : (
          <div className="text-center p-4" style={{ color: "#667781" }}>No chat selected</div>
        )}
      </div>
    </motion.div>
  )}
</AnimatePresence>
            </>
          )}
        </div>
      </div>

     {showGroupModal && (
  <GroupModal
    contacts={contacts}
    tags={tags}
    onClose={() => { setShowGroupModal(false); setGroupName(""); setSelectedContactsForGroup([]); }}
    onCreate={createGroup}
    groupName={groupName}
    setGroupName={setGroupName}
    selectedContacts={selectedContactsForGroup}
    setSelectedContacts={setSelectedContactsForGroup}
  />
)}


      {/* Forward Message Modal */}
      {showForwardModal && (
        <div
          onClick={() => setShowForwardModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, width: 360, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e9edef", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: "1rem", color: "#111b21" }}>Forward message to</span>
              <button onClick={() => setShowForwardModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#54656f" }}><FiX size={20} /></button>
            </div>

            {/* Preview of message being forwarded */}
            {forwardMessage && (
              <div style={{ margin: "10px 16px", padding: "8px 12px", background: "#f0f2f5", borderRadius: 8, fontSize: "0.85rem", color: "#54656f", borderLeft: "3px solid #00a884" }}>
                {forwardMessage.messageType === "image" ? "📷 Photo" :
                  forwardMessage.messageType === "file" ? `📎 ${forwardMessage.fileName}` :
                    forwardMessage.messageType === "template" ? `📋 ${forwardMessage.templateMeta?.header || "Template"}` :
                      forwardMessage.text}
              </div>
            )}

            {/* Chat list */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {chatList.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#667781" }}>No chats available</div>
              ) : (
                chatList.map(chat => (
                  <div
                    key={chat._id}
                    onClick={() => sendForward(chat)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f0f2f5" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f5f6f6"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#dfe5e7", color: "#54656f", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                      {chat.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: "0.95rem", color: "#111b21" }}>{chat.name || chat.phone}</div>
                      <div style={{ fontSize: "0.8rem", color: "#667781" }}>{chat.phone}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Modal */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              width: "300px",
              textAlign: "center",
            }}
          >
            <h4>Delete message</h4>
            <p>Choose an option:</p>
            <div className="d-flex flex-column gap-2" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={deleteForMe}
                style={{
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Delete for me
              </button>
              <button
                onClick={deleteForEveryone}
                style={{
                  padding: "8px 16px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Delete for everyone
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#f8f9fa",
                  color: "#212529",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ TEMPLATE MODAL */}
      {showTemplateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowTemplateModal(false)}
        >
          <div
  style={{
    background: "#fff",
    borderRadius: 12,
    width: isMobile ? "70vw" : "400px",
    maxHeight: "70vh",
    overflowY: "auto",
    padding: 16,
  }}
  onClick={(e) => e.stopPropagation()}
>
            <h5>Select Template</h5>

            {templates.length === 0 ? (
              <p>No templates found</p>
            ) : (
              templates.map((t) => (
                <div
                  key={t._id}
                  onClick={() => {
                    sendTemplate(t);
                    setShowTemplateModal(false);
                  }}
                  style={{
                    padding: 10,
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {t.format?.slice(0, 50)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── CAMERA MODAL ── */}
{/* ── CAMERA MODAL ── */}
{showCameraModal && (
  <CameraModal
    isMobile={isMobile}
    videoPreviewRef={videoPreviewRef}
    onCapture={capturePhoto}
    onClose={() => setShowCameraModal(false)}
    selectedChat={selectedChat}
    uploadFile={uploadFile}
    API={API}
  />
)}

{/* ── AUDIO RECORDER MODAL ── */}
{showAudioRecorder && (
  <AudioRecorderModal
    isRecording={isRecording}
    recordingSeconds={recordingSeconds}
    audioBlob={audioBlob}
    onStart={startRecording}
    onStop={stopRecording}
    onSend={sendAudioMessage}
    onReRecord={() => { setAudioBlob(null); setRecordingSeconds(0); }}
    onClose={() => { setShowAudioRecorder(false); setAudioBlob(null); setRecordingSeconds(0); }}
  />
)}

{/* ── CONTACT PICKER MODAL ── */}
{showContactPicker && (
  <ContactPickerModal
    contacts={contacts}
    isMobile={isMobile}
    onSelect={sendContactMessage}
    onClose={() => setShowContactPicker(false)}
  />
)}

{/* ── Chat item dropdown portal ── */}
{chatDropdown.open && createPortal(
  <>
    <div onClick={closeChatDropdown} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
    <div style={{
      position: "fixed", top: chatDropdown.y, left: chatDropdown.x,
      zIndex: 9999, background: "#fff", borderRadius: 10,
      boxShadow: "0 6px 24px rgba(0,0,0,0.14)", border: "1px solid #e9edef",
      minWidth: 192, overflow: "hidden",
    }}>
      {[
        {
  label: "Clear chat",
  icon: "🗑",
  onClick: () => {
    setClearTargetId(chatDropdown.chat._id);
    setShowClearConfirmModal(true);
    closeChatDropdown();
  },
},
        {
          label: chatDropdown.chat?.pinned ? "Unpin chat" : "Pin chat",
          icon: "📌",
          onClick: () => handlePinChat(chatDropdown.chat._id),
        },
        {
          label: chatDropdown.chat?.isGroup ? "Delete group" : "Delete chat",
          icon: "✕",
          danger: true,
          onClick: () => openDeleteConfirm(chatDropdown.chat, !!chatDropdown.chat?.isGroup),
        },
      ].map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          style={{
            width: "100%", padding: "11px 16px", border: "none",
            background: "transparent", display: "flex", alignItems: "center", gap: 12,
            fontSize: "0.88rem", color: item.danger ? "#dc3545" : "#111b21",
            cursor: "pointer", textAlign: "left",
            borderBottom: i < 2 ? "1px solid #f0f2f5" : "none",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f5f6f6"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  </>,
  document.body
)}

{/* ── Delete confirm modal ── */}
{showDeleteConfirmModal && deleteTarget && (
  <div
    onClick={() => setShowDeleteConfirmModal(false)}
    style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000,
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: "#fff", borderRadius: 14, width: 320, padding: "24px 20px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "1rem", color: "#111b21", marginBottom: 6 }}>
        {deleteTarget.isGroup ? "Delete group?" : "Delete chat?"}
      </div>
      <div style={{ fontSize: "0.85rem", color: "#667781", marginBottom: 20 }}>
        This will remove the {deleteTarget.isGroup ? "group" : "chat"} from your list.
        If someone messages you again, it will reappear.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={async () => {
            deleteTarget.isGroup
              ? await handleDeleteGroup(deleteTarget.chatId)
              : await handleDeleteChat(deleteTarget.chatId);
            setShowDeleteConfirmModal(false);
          }}
          style={{
            padding: "10px 16px", borderRadius: 8, fontSize: "0.88rem",
            border: "1px solid #e9edef", background: "#f8f9fa",
            color: "#dc3545", cursor: "pointer", textAlign: "left", fontWeight: 500,
          }}
        >
          🙈 Delete for me
          <div style={{ fontSize: "0.75rem", color: "#667781", marginTop: 2 }}>
            Removes from your view only
          </div>
        </button>

        <button
          onClick={() => setShowDeleteConfirmModal(false)}
          style={{
            padding: "9px 16px", borderRadius: 8, fontSize: "0.88rem",
            border: "1px solid #e9edef", background: "transparent",
            color: "#667781", cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{showClearConfirmModal && clearTargetId && (
  <div
    onClick={() => setShowClearConfirmModal(false)}
    style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10000,
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: "#fff", borderRadius: 14, width: 320,
        padding: "24px 20px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "1rem", color: "#111b21", marginBottom: 6 }}>
        Clear chat?
      </div>
      <div style={{ fontSize: "0.85rem", color: "#667781", marginBottom: 20 }}>
        All messages will be removed from your view. This cannot be undone.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={async () => {
            await handleClearChat(clearTargetId);
            setShowClearConfirmModal(false);
            setClearTargetId(null);
          }}
          style={{
            padding: "10px 16px", borderRadius: 8,
            border: "none", background: "#dc3545",
            color: "#fff", cursor: "pointer",
            fontSize: "0.88rem", fontWeight: 500,
          }}
        >
          🗑 Yes, clear chat
        </button>
        <button
          onClick={() => {
            setShowClearConfirmModal(false);
            setClearTargetId(null);
          }}
          style={{
            padding: "9px 16px", borderRadius: 8,
            border: "1px solid #e9edef", background: "transparent",
            color: "#667781", cursor: "pointer", fontSize: "0.88rem",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}
/* ─────────────────────────────────────────────
  Sub-components
───────────────────────────────────────────── */
function MessageBubble({
  msg,
  onDeleteClick,
  onForward,
  onSelect,
  isSelected,
  multiSelectMode,
  onSendMessage,
   isGroup,      // ← ADD
  contacts,
  onStartChat, 
}) {
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const bubbleRef = useRef(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [isMobileView, setIsMobileView] = useState(false);
useEffect(() => {
  const check = () => setIsMobileView(window.innerWidth <= 820);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []); 

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isMine = msg.type === "sent";
  const isTemplate = !!msg.templateMeta;

  // ── Bubble wrapper style — strip padding/bg/radius for templates
  const bubbleBase = {
    alignSelf: isMine ? "flex-end" : "flex-start",
    maxWidth: isTemplate ? 280 : "65%",
    // Templates own their own card — no double wrapper
    background: isTemplate ? "transparent" : isMine ? "#d9fdd3" : "#ffffff",
    color: "#111b21",
    padding: isTemplate ? 0 : "6px 8px 6px 10px",
    borderRadius: isTemplate
      ? 0
      : isMine
        ? "7.5px 7.5px 0 7.5px"
        : "7.5px 7.5px 7.5px 0",
    boxShadow: isTemplate ? "none" : "0 1px 0.5px rgba(11,20,26,0.13)",
    wordBreak: "break-word",
    position: "relative",
  };


  if (msg.isDeleted) {
    return (
      <div style={bubbleBase}>
        <div style={{ fontStyle: "italic", color: "#667781", fontSize: "0.85rem" }}>
          This message was deleted
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    if (msg.messageType === "text" && msg.text) navigator.clipboard.writeText(msg.text);
    setShowMenu(false);
  };
  const handleForward = () => {
    if (onForward) onForward(msg);
    else alert("Forward functionality not yet implemented.");
    setShowMenu(false);
  };
  const handleInfo = () => {
    alert(`Message sent at ${getFormattedTime()}`);
    setShowMenu(false);
  };
  const handleSelectToggle = () => {
    if (onSelect) onSelect(msg.id);
    setShowMenu(false);
  };
  const handleDeleteClick = () => {
    onDeleteClick(msg.id);
    setShowMenu(false);
  };

  const btnLabel = (btn) =>
    btn.label || btn.title || btn.text || btn.buttonText || "Button";
  const btnUrl = (btn) => btn.url || btn.value || btn.link || null;
  const btnCopyValue = (btn) => btn.value || btn.code || btn.copyCode || null;

  const parseTemplate = (text, variables = {}) => {
    if (!text) return "";
    return text.replace(/\{\{(\d+)\}\}/g, (_, num) => {
      const v = variables[num];
      if (!v) return `{{${num}}}`;
      if (v.type === "name") return "[Contact Name]";
      if (v.type === "number") return "[Phone Number]";
      return v.value || `{{${num}}}`;
    });
  };

  // ── WhatsApp markdown: *bold*, _italic_, ~strike~
  const parseWhatsAppMarkdown = (text) => {
    if (!text) return null;
    const parts = [];
    const regex = /(\*[^*]+\*|_[^_]+_|~[^~]+~)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex)
        parts.push(text.slice(lastIndex, match.index));
      const raw = match[0];
      if (raw.startsWith("*") && raw.endsWith("*"))
        parts.push(<strong key={match.index}>{raw.slice(1, -1)}</strong>);
      else if (raw.startsWith("_") && raw.endsWith("_"))
        parts.push(<em key={match.index}>{raw.slice(1, -1)}</em>);
      else if (raw.startsWith("~") && raw.endsWith("~"))
        parts.push(<s key={match.index}>{raw.slice(1, -1)}</s>);
      lastIndex = match.index + raw.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length ? parts : text;
  };

  const getFormattedTime = () => {
    const raw = msg.time || msg.createdAt;

    if (!raw) return "";

    // ✅ अगर already "11:31 AM" jaisa hai → directly return
    if (typeof raw === "string" && raw.includes("AM") || raw.includes("PM")) {
      return raw;
    }

    const date = new Date(raw);

    if (isNaN(date.getTime())) {
      console.log("❌ Invalid date:", raw);
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleQuickReplySend = (text) => {
    const newMsg = {
      id: `tmp-quick-reply-${text}`,
      text: text,
      type: "sent",
      messageType: "text",
      createdAt: new Date().toISOString(),
    };

    console.log("Sending quick reply:", newMsg);

    // 🔴 IMPORTANT: yahan apna actual send function lagao
    // Example:
    if (typeof onSendMessage === "function") {
      onSendMessage(newMsg);
    }
  };

const renderContent = () => {
    // ─── TEMPLATE MESSAGE ───────────────────────────────────────
    if (msg.templateMeta) {
      const t = msg.templateMeta;
      const actions = t.actions || {};

      const dropdownsWithOptions = (actions.dropdownButtons || []).map((dd) => {
        let optionsArray = [];
        if (Array.isArray(dd.options))
          optionsArray = dd.options
            .map((o) => (typeof o === "object" ? o.label || o.value || "" : String(o)))
            .filter(Boolean);
        else if (typeof dd.options === "string")
          optionsArray = dd.options.split(",").map((o) => o.trim()).filter(Boolean);
        else if (dd.parsedOptions) optionsArray = dd.parsedOptions;
        return { ...dd, optionsArray };
      });

      const hasButtons =
        dropdownsWithOptions.length > 0 ||
        actions.inputFields?.length > 0 ||
        actions.ctaButtons?.length > 0 ||
        actions.copyCodeButtons?.length > 0 ||
        actions.quickReplies?.length > 0;

      const bodyText = msg.text ||
        parseTemplate(t.resolvedText || t.body || "", t.variables || {});

      const waBtnBase = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "10px 12px",
        fontSize: "0.88rem",
        color: "#0096de",
        fontWeight: 500,
        cursor: "pointer",
        background: "#fff",
        border: "none",
        borderTop: "0.5px solid #e0e0e0",
        width: "100%",
        fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
      };

      const ctaIcon = (btn) => {
        const type = (btn.type || btn.subType || "").toLowerCase();
        if (type.includes("phone") || type.includes("call"))
          return (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5 2 2 0 0 1 3.58 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 10a16 16 0 0 0 6 6z" />
            </svg>
          );
        return (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        );
      };

      return (
        <div
          style={{
            background: isMine ? "#d9fdd3" : "#ffffff",
            borderRadius: isMine ? "8px 8px 0 8px" : "0 8px 8px 8px",
            overflow: "hidden",
            width: 280,
            fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
            boxShadow: "0 1px 2px rgba(11,20,26,0.13)",
          }}
        >
          {/* ── HEADER IMAGE ── */}
          {t.mediaType === "Image" && t.mediaUrl && (
            <img
              src={t.mediaUrl.startsWith("http") ? t.mediaUrl : `${BACKEND_URL}${t.mediaUrl}`}
              alt="template"
              style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
            />
          )}

          {/* ── HEADER VIDEO ── */}
          {t.mediaType === "Video" && t.mediaUrl && (
            <video controls style={{ width: "100%", display: "block", maxHeight: 180 }}>
              <source
                src={t.mediaUrl.startsWith("http") ? t.mediaUrl : `${BACKEND_URL}${t.mediaUrl}`}
              />
            </video>
          )}

          {/* ── HEADER TEXT (only when no media) ── */}
          {t.header && t.mediaType !== "Image" && t.mediaType !== "Video" && (
            <div
              style={{
                padding: "10px 10px 0",
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "#111b21",
              }}
            >
              {t.header}
            </div>
          )}

          {t.mediaType === "Carousel" && t.carouselItems?.length > 0 && (
            <div style={{ display: "flex", overflowX: "auto", gap: 8, padding: 8 }}>
              {t.carouselItems.map((item, idx) => {
                const imgSrc =
                  item.mediaUrl?.startsWith("http") ||
                    item.mediaUrl?.startsWith("data:image")
                    ? item.mediaUrl
                    : item.mediaUrl
                      ? `${BACKEND_URL}/${item.mediaUrl}`
                      : null;

                return (
                  <div
                    key={idx}
                    style={{
                      minWidth: 180,
                      border: "0.5px solid #e0e0e0",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt=""
                        onError={(e) => {
                          e.target.src =
                            "https://dummyimage.com/300x200/cccccc/000000&text=No+Image";
                        }}
                        style={{
                          width: "100%",
                          height: 110,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: 110,
                          background: "#eee",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          color: "#888",
                        }}
                      >
                        No Image
                      </div>
                    )}

                    <div style={{ padding: "6px 8px 8px" }}>
                      {item.title && (
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#111b21" }}>
                          {item.title}
                        </div>
                      )}

                      {item.description && (
                        <div style={{ fontSize: "0.8rem", color: "#667781", marginTop: 2 }}>
                          {item.description}
                        </div>
                      )}

                      {item.button && (
                        <div
                          style={{
                            marginTop: 8,
                            paddingTop: 6,
                            borderTop: "0.5px solid #e0e0e0",
                            color: "#0096de",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            textAlign: "center",
                            cursor: "pointer",
                          }}
                        >
                          {item.button}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BODY ── */}
          {bodyText && (
            <div
              style={{
                padding: "8px 10px 4px",
                fontSize: "0.9rem",
                lineHeight: 1.6,
                color: "#111b21",
                whiteSpace: "pre-wrap",
              }}
            >
              {parseWhatsAppMarkdown(bodyText)}
            </div>
          )}

          {/* ── FOOTER ── */}
          {t.footer && (
            <div style={{ padding: "2px 10px 2px", fontSize: "0.75rem", color: "#667781" }}>
              {t.footer}
            </div>
          )}

          {/* ── TIMESTAMP ── */}
          <MessageMeta msg={msg} inline={false} />

          {/* ── BUTTONS ── */}
          {hasButtons && (
            <>
              <div style={{ height: "0.5px", background: "#e0e0e0" }} />

              {/* Dropdowns */}
              {dropdownsWithOptions.map((dd, i) => (
                <div key={dd.id || i} style={{ padding: "6px 10px" }}>
                  {dd.title && (
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 4, color: "#111b21" }}>
                      {dd.title}
                    </div>
                  )}
                  <select
                    defaultValue={dd.selected || ""}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "0.85rem",
                      background: "#fff",
                    }}
                  >
                    <option value="">{dd.placeholder || "Select an option"}</option>
                    {dd.optionsArray.map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Input fields */}
              {actions.inputFields?.map((field, i) => (
                <div key={field.id || i} style={{ padding: "6px 10px" }}>
                  {field.label && (
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 4, color: "#111b21" }}>
                      {field.label}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder={field.placeholder || ""}
                    defaultValue={field.value || ""}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "0.85rem",
                      background: "#fff",
                    }}
                  />
                </div>
              ))}

              {/* Copy code buttons */}
              {actions.copyCodeButtons?.map((btn, i) => (
                <button
                  key={btn.id || i}
                  onClick={() => {
                    const val = btn.value || btn.code || btn.text || btn.label;

                    console.log("COPY VALUE:", val); // debug
                    console.log("BTN OBJECT:", btn);

                    if (!val) return;

                    navigator.clipboard.writeText(val);

                    // ✅ Show feedback
                    setCopiedIndex(i);

                    setTimeout(() => {
                      setCopiedIndex(null);
                    }, 1500);
                  }}
                  style={waBtnBase}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>

                  {copiedIndex === i ? "Copied ✓" : (btn.label || btn.text || "Copy")}
                </button>
              ))}

              {/* CTA buttons */}
              {actions.ctaButtons?.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: actions.ctaButtons.length === 2 ? "row" : "column",
                  }}
                >
                  {actions.ctaButtons.map((btn, i) => (
                    <button
                      key={btn.id || i}
                      onClick={() => {
                        const url = btnUrl(btn);
                        if (url) window.open(url, "_blank");
                      }}
                      style={{
                        ...waBtnBase,
                        flex: 1,
                        borderRight:
                          actions.ctaButtons.length === 2 && i === 0
                            ? "0.5px solid #e0e0e0"
                            : "none",
                      }}
                    >
                      {ctaIcon(btn)}
                      {btnLabel(btn)}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick replies */}
              {actions.quickReplies?.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: actions.quickReplies.length > 2 ? "column" : "row",
                  }}
                >
                  {actions.quickReplies.map((reply, i) => (
                    <button
                      key={reply.id || i}
                      onClick={() => handleQuickReplySend(btnLabel(reply))}
                      style={{
                        ...waBtnBase,
                        flex: 1,
                        borderRight:
                          actions.quickReplies.length === 2 && i === 0
                            ? "0.5px solid #e0e0e0"
                            : "none",
                      }}
                    >
                      {btnLabel(reply)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // ─── IMAGE MESSAGE ──────────────────────────────────────────
    if (msg.messageType === "image") {
      return (
        <>
          <img
            src={msg.url}
            alt={msg.fileName || "image"}
            onClick={() =>
              setPreviewMedia({ type: "image", url: msg.url })
            }
            style={{
              width: "240px",
              maxWidth: "100%",
              height:"300px",
              objectFit: "cover", // Added to prevent image stretching
              borderRadius: 6,
              display: "block",
              cursor: "pointer", // 👈 important
            }}
          />
        </>
      );
    }

    // ─── AUDIO MESSAGE ──────────────────────────────────────────
    // ─── AUDIO MESSAGE ──────────────────────────────────────────
if (msg.messageType === "audio") {
  return <AudioBubble msg={msg} isMine={isMine} />;
}
    // ─── CONTACT MESSAGE ────────────────────────────────────────
  // ─── CONTACT MESSAGE ────────────────────────────────────────
if (msg.messageType === "contact") {
  return <ContactBubble msg={msg} isMine={isMine} onStartChat={onStartChat} />;
}

     // ─── CAMERA MESSAGE ─────────────────────────────────────────
    if (msg.messageType === "camera") {
      return (
        <div style={{ position: "relative", width: "240px", maxWidth: "100%" }}>
          <img
            src={msg.url}
            alt="Camera capture"
            onClick={() => setPreviewMedia && setPreviewMedia({ type: "image", url: msg.url })}
            style={{
              width: "100%",
              height: "300px",
              objectFit: "cover",
              borderRadius: 6,
              display: "block",
              cursor: "pointer",
            }}
          />
          <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(17, 27, 33, 0.6)", borderRadius: 12, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 600 }}>Photo</span>
          </div>
        </div>
      );
    }

    // ─── VIDEO MESSAGE ──────────────────────────────────────────
    if (msg.messageType === "video") {
      return (
        <>
          <video
            src={msg.url}
            controls
            onClick={() =>
              setPreviewMedia({ type: "video", url: msg.url })
            }
            style={{
              width: "240px",
              maxWidth: "100%",
              borderRadius: 6,
              cursor: "pointer",
            }}
          />
        </>
      );
    }

    // ─── FILE MESSAGE ──────────────────────────────────────────
    if (msg.messageType === "file") {
      const ext = (msg.fileName || "").split(".").pop().toLowerCase();
      const extConfig = {
        pdf:  { color: "#e74c3c", label: "PDF"  },
        csv:  { color: "#27ae60", label: "CSV"  },
        xlsx: { color: "#27ae60", label: "XLSX" },
        xls:  { color: "#27ae60", label: "XLS"  },
        doc:  { color: "#2980b9", label: "DOC"  },
        docx: { color: "#2980b9", label: "DOCX" },
        ppt:  { color: "#e67e22", label: "PPT"  },
        pptx: { color: "#e67e22", label: "PPTX" },
        txt:  { color: "#7f8c8d", label: "TXT"  },
        zip:  { color: "#8e44ad", label: "ZIP"  },
        rar:  { color: "#8e44ad", label: "RAR"  },
        json: { color: "#f39c12", label: "JSON" },
        xml:  { color: "#16a085", label: "XML"  },
      };
      const cfg = extConfig[ext] || { color: "#54656f", label: ext.toUpperCase() || "FILE" };

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px", minWidth: 220, maxWidth: 280 }}>
          <div style={{ width: 46, height: 52, borderRadius: 8, background: cfg.color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, gap: 3, boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
            <FiFile size={20} color="#fff" />
            <span style={{ fontSize: "0.52rem", color: "#fff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {cfg.label}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.87rem", fontWeight: 600, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={msg.fileName}>
              {msg.fileName}
            </div>
            <div style={{ fontSize: "0.73rem", color: "#667781", marginTop: 2 }}>
              {msg.fileSize || ext.toUpperCase()}
            </div>
          </div>
          {msg.url && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
              <a href={msg.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Open" style={{ width: 30, height: 30, borderRadius: "50%", background: "#e7fef5", border: "1px solid #b2f0d8", display: "flex", alignItems: "center", justifyContent: "center", color: "#00a884", textDecoration: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(msg.url);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = blobUrl;
                    link.download = msg.fileName || `file.${ext}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                  } catch (err) {
                    window.open(msg.url, "_blank");
                  }
                }}
                title="Download"
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "#f0f2f5", border: "1px solid #e9edef",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#54656f", cursor: "pointer",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button> 
            </div>
          )}
        </div>
      );
    }

    // ─── TEXT MESSAGE ──────────────────────────────────────────
    return (
      <div style={{ fontSize: isMine ? (window.innerWidth <= 820 ? "0.82rem" : "0.9rem") : (window.innerWidth <= 820 ? "0.82rem" : "0.9rem"), lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {msg.text}
      </div>
    );
  };
  // Resolve sender display name for group messages
const getSenderName = () => {
  if (!isGroup || msg.type === "sent") return null;
  const contact = contacts?.find(c => c.mobile === msg.sender);
  return contact?.name || msg.sender || "Unknown";
};
const senderName = getSenderName();

  return (
  <div
    ref={bubbleRef}
    style={{
      ...bubbleBase,
      ...(isSelected ? { outline: "2px solid #00a884", outlineOffset: 1 } : {}),
    }}
    onMouseEnter={() => setShowActions(true)}
    onMouseLeave={() => { setShowActions(false); setShowMenu(false); }}
  >
    {/* ── SENDER NAME (group received messages only) ── */}
    {senderName && (
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          color: stringToColor(msg.sender), // consistent color per sender
          marginBottom: 2,
          paddingBottom: 1,
        }}
      >
        {senderName}
      </div>
    )}
      {/* Multi-select checkbox */}
      {multiSelectMode && (
        <div
          style={{
            position: "absolute",
            left: -28,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={handleSelectToggle}
            style={{ width: 18, height: 18, cursor: "pointer" }}
          />
        </div>
      )}

      {/* Hover action button */}
      {showActions && !multiSelectMode && (
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 160;
            setMenuPos({
              top: spaceBelow < menuHeight ? rect.top - menuHeight - 4 : rect.bottom + 4,
              left: rect.right - 180,
            });
            setShowMenu((s) => !s);
          }}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #ddd",
            borderRadius: "50%",
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#54656f",
            zIndex: 2,
          }}
        >
          <FiChevronDown size={14} />
        </button>
      )}

      {/* Context menu portal */}
      {showMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999,
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "1px solid #e0e0e0",
              minWidth: 180,
              overflow: "hidden",
            }}
          >
            <MenuItem icon={<FiShare2 size={14} />} label="Forward" onClick={handleForward} />
            {msg.messageType === "text" && (
              <MenuItem icon={<FiCopy size={14} />} label="Copy" onClick={handleCopy} />
            )}
            <MenuItem icon={<FiInfo size={14} />} label="Message info" onClick={handleInfo} />
            <MenuItem
              icon={<FiTrash2 size={14} />}
              label="Delete"
              onClick={handleDeleteClick}
              danger
            />
            {multiSelectMode !== undefined && (
              <MenuItem
                icon={<FiCheckSquare size={14} />}
                label={isSelected ? "Deselect" : "Select"}
                onClick={handleSelectToggle}
              />
            )}
          </div>,
          document.body
        )}

      {/* Content */}
      {renderContent()}

      {/* Meta (time + ticks) — only for non-template messages */}
      {!isTemplate && <MessageMeta msg={msg} inline={msg.messageType === "text"} />}

      {previewMedia &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
            }}
          >
            {/* ❌ CLOSE BUTTON */}
            <button
              onClick={() => setPreviewMedia(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            {/* MEDIA */}
            {previewMedia.type === "image" ? (
              <img
                src={previewMedia.url}
                alt=""
                style={{
                  maxWidth: "95%",
                  maxHeight: "95%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                style={{
                  maxWidth: "95%",
                  maxHeight: "95%",
                }}
              />
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

/* ─────────────────────────────────────────────
  CameraModal — photo + video
───────────────────────────────────────────── */


/* ─────────────────────────────────────────────
  CameraModal — Responsive (Full screen mobile / Centered modal desktop)
───────────────────────────────────────────── */
export function CameraModal({ isMobile, videoPreviewRef, onCapture, onClose, selectedChat, uploadFile, API }) {
  const [mode, setMode] = useState("photo"); // "photo" | "video"
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const [flash, setFlash] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [isSending, setIsSending] = useState(false);

  const handleCapture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    onCapture();
  };

  const startVideoRecording = async () => {
    const stream = videoPreviewRef.current?.srcObject;
    if (!stream) return;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const combined = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      const mr = new MediaRecorder(combined, { mimeType: "video/webm" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecordingVideo(true);
      setVideoSeconds(0);
      timerRef.current = setInterval(() => setVideoSeconds(s => s + 1), 1000);
    } catch (err) {
      alert("Microphone access needed for video recording");
    }
  };

  const stopAndSendVideo = async () => {
    clearInterval(timerRef.current);
    setIsRecordingVideo(false);
    setIsSending(true);

    await new Promise(resolve => {
      mediaRecorderRef.current.onstop = resolve;
      mediaRecorderRef.current.stop();
    });

    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const file = new File([blob], `video_${Date.now()}.webm`, { type: "video/webm" });

    try {
      const uploadData = await uploadFile(file);
      const user = JSON.parse(localStorage.getItem("user"));
      await API.post("/messages", {
        chatId: selectedChat._id,
        sender: user.phone,
        messageType: "video",
        fileUrl: uploadData.fileUrl,
        fileName: uploadData.fileName || file.name,
        text: "",
      });
      onClose();
    } catch (err) {
      alert("Failed to send video");
    } finally {
      setIsSending(false);
    }
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10001,
      }}
      onClick={() => { if (!isRecordingVideo) onClose(); }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? "100vw" : 640,
          height: isMobile ? "100dvh" : 480,
          borderRadius: isMobile ? 0 : 24,
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          background: "#000", position: "relative",
          boxShadow: isMobile ? "none" : "0 24px 48px rgba(0,0,0,0.5)",
          border: isMobile ? "none" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Flash overlay */}
        {flash && (
          <div style={{
            position: "absolute", inset: 0, background: "#fff",
            zIndex: 10, opacity: 0.7,
            animation: "flashFade 0.3s ease forwards",
            pointerEvents: "none",
          }} />
        )}

        {/* Top bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "16px", zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
        }}>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)", border: "none",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)", transition: "background 0.2s",
          }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
             onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}>
            <FiX size={18} />
          </button>

          {/* Recording indicator */}
          {isRecordingVideo && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(0,0,0,0.5)", borderRadius: 99,
              padding: "4px 12px", backdropFilter: "blur(4px)",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#e74c3c",
                animation: "pulse 1s ease infinite",
              }} />
              <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {fmt(videoSeconds)}
              </span>
            </div>
          )}

          <div style={{ width: 36 }} />
        </div>

        {/* Video preview */}
        <video
          ref={videoPreviewRef}
          autoPlay muted playsInline
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            display: "block", background: "#111",
          }}
        />

        {/* Bottom controls */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: isMobile ? "24px 24px 40px" : "20px 24px 32px",
          background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        }}>
          {/* Mode switcher */}
          {!isRecordingVideo && (
            <div style={{
              display: "flex", gap: 0, background: "rgba(255,255,255,0.15)",
              borderRadius: 99, padding: 3, backdropFilter: "blur(4px)",
            }}>
              {["photo", "video"].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "6px 22px", borderRadius: 99, border: "none",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#111" : "#fff",
                  fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s ease", textTransform: "capitalize",
                }}>
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Shutter / record button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
            <button
              onClick={() => {
                if (mode === "photo") {
                  handleCapture();
                } else if (!isRecordingVideo) {
                  startVideoRecording();
                } else {
                  stopAndSendVideo();
                }
              }}
              disabled={isSending}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                border: `4px solid ${isRecordingVideo ? "#e74c3c" : "#fff"}`,
                background: "transparent",
                cursor: "pointer", position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.15s ease",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {isSending ? (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  animation: "spin 0.8s linear infinite",
                }} />
              ) : mode === "photo" ? (
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#fff" }} />
              ) : isRecordingVideo ? (
                <div style={{ width: 26, height: 26, borderRadius: 6, background: "#e74c3c" }} />
              ) : (
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#e74c3c" }} />
              )}
            </button>
          </div>

          {isRecordingVideo && (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem", fontWeight: 500 }}>
              Tap stop to send video
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes flashFade { from { opacity: 0.7; } to { opacity: 0; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
  AudioRecorderModal — Bottom sheet mobile / Centered desktop
───────────────────────────────────────────── */
export function AudioRecorderModal({ isMobile, isRecording, recordingSeconds, audioBlob, onStart, onStop, onSend, onReRecord, onClose }) {
  const [bars, setBars] = useState(Array(28).fill(4));
  const animRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      const animate = () => {
        setBars(prev => prev.map(() => Math.floor(4 + Math.random() * 28)));
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isRecording, audioBlob]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  return (
    <div
      onClick={() => { if (!isRecording && !audioBlob) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex", 
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 10001,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: isMobile ? "100%" : 440,
          background: "#fff",
          borderRadius: isMobile ? "24px 24px 0 0" : "24px",
          padding: isMobile ? "8px 0 40px" : "32px 0 40px",
          display: "flex", flexDirection: "column", alignItems: "center",
          boxShadow: isMobile ? "0 -8px 40px rgba(0,0,0,0.2)" : "0 20px 48px rgba(0,0,0,0.15)",
        }}
      >
        {/* Handle for mobile only */}
        {isMobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: "#dfe5e7", margin: "8px 0 20px" }} />}

        {/* Title */}
        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#111b21", marginBottom: 28 }}>
          {audioBlob ? "Preview Message" : isRecording ? "Recording Audio…" : "Voice Message"}
        </div>

        {/* Waveform */}
        <div style={{
          display: "flex", alignItems: "center", gap: 3,
          height: 48, padding: "0 32px", width: "100%", boxSizing: "border-box",
        }}>
          {bars.map((h, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: 99,
              background: isRecording
                ? `rgba(0,168,132,${0.4 + (h / 32) * 0.6})`
                : audioBlob ? "#0096de" : "#dfe5e7",
              height: audioBlob
                ? `${12 + Math.sin(i * 0.7) * 10 + Math.cos(i * 1.3) * 8}px`
                : `${h}px`,
              transition: isRecording ? "height 0.08s ease" : "none",
              minWidth: 3,
            }} />
          ))}
        </div>

        {/* Timer */}
        <div style={{
          fontSize: "2.2rem", fontWeight: 300,
          color: isRecording ? "#e74c3c" : "#111b21",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.05em",
          margin: "24px 0 32px",
        }}>
          {fmt(recordingSeconds)}
        </div>

        {/* Controls */}
        {!audioBlob ? (
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {/* Cancel */}
            {!isRecording ? (
              <button onClick={onClose} style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "#f0f2f5", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#54656f", transition: "background 0.2s",
              }} onMouseEnter={e => e.currentTarget.style.background = "#e9edef"}
                 onMouseLeave={e => e.currentTarget.style.background = "#f0f2f5"}>
                <FiX size={20} />
              </button>
            ) : <div style={{ width: 48 }} />}

            {/* Record/Stop button */}
            <button
              onClick={isRecording ? onStop : onStart}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: isRecording ? "#e74c3c" : "#00a884",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isRecording
                  ? "0 0 0 8px rgba(231,76,60,0.15)"
                  : "0 0 0 8px rgba(0,168,132,0.15)",
                transition: "all 0.2s ease",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {isRecording
                ? <div style={{ width: 22, height: 22, borderRadius: 4, background: "#fff" }} />
                : <FiHeadphones size={28} color="#fff" />
              }
            </button>

            <div style={{ width: 48 }} />
          </div>
        ) : (
          /* After recording — preview controls */
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 32px", width: "100%", boxSizing: "border-box" }}>
            <button onClick={onReRecord} style={{
              flex: 1, padding: "14px 0", borderRadius: 12,
              border: "1.5px solid #e9edef", background: "#fff",
              color: "#54656f", fontSize: "0.95rem", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.2s",
            }} onMouseEnter={e => e.currentTarget.style.background = "#f7f8fa"}
               onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <FiHeadphones size={18} /> Re-record
            </button>
            <button onClick={onSend} style={{
              flex: 1, padding: "14px 0", borderRadius: 12,
              border: "none", background: "#00a884",
              color: "#fff", fontSize: "0.95rem", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.2s",
            }} onMouseEnter={e => e.currentTarget.style.background = "#009c7a"}
               onMouseLeave={e => e.currentTarget.style.background = "#00a884"}>
              <FiSend size={18} /> Send
            </button>
          </div>
        )}

        {isRecording && (
          <div style={{ marginTop: 20, fontSize: "0.8rem", color: "#aab8c2", fontWeight: 500 }}>
            Tap stop when done
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
  ContactPickerModal — Bottom sheet mobile / Centered desktop
───────────────────────────────────────────── */
export function ContactPickerModal({ contacts, isMobile, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = contacts.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile?.includes(search)
  );

  const grouped = filtered.reduce((acc, c) => {
    const letter = (c.name?.[0] || "#").toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  const sortedLetters = Object.keys(grouped).sort();

  const avatarColor = (name = "") => {
    const colors = [
      ["#E1F5EE", "#0F6E56"],
      ["#E6F1FB", "#185FA5"],
      ["#FAEEDA", "#854F0B"],
      ["#EEEDFE", "#534AB7"],
      ["#FAECE7", "#993C1D"],
      ["#EAF3DE", "#3B6D11"],
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 10001,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : 420,
          height: isMobile ? "90dvh" : 640,
          background: "#fff",
          borderRadius: isMobile ? "24px 24px 0 0" : "24px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: isMobile
            ? "0 -8px 40px rgba(0,0,0,0.18)"
            : "0 20px 48px rgba(0,0,0,0.15)",
        }}
      >
        {/* Handle */}
        {isMobile && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "10px 0 0",
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "#dfe5e7",
              }}
            />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: isMobile ? "12px 16px 8px" : "20px 20px 10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "#111b21",
              }}
            >
              Share Contact
            </span>

            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#f0f2f5",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#54656f",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#e9edef")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#f0f2f5")
              }
            >
              <FiX size={14} />
            </button>
          </div>

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#f0f2f5",
              borderRadius: 10,
              padding: "8px 12px",
            }}
          >
            <FiSearch size={14} color="#54656f" />

            <input
              type="text"
              placeholder="Search contacts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.85rem",
                color: "#111b21",
              }}
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#54656f",
                  padding: 0,
                }}
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Contact list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 0",
                color: "#667781",
              }}
            >
              <FiUser
                size={34}
                style={{ marginBottom: 10, opacity: 0.3 }}
              />

              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                No contacts found
              </div>
            </div>
          ) : (
            sortedLetters.map((letter) => (
              <div key={letter}>
                {/* Letter */}
                <div
                  style={{
                    padding: isMobile ? "8px 16px 4px" : "8px 20px 4px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#00a884",
                    letterSpacing: "0.04em",
                  }}
                >
                  {letter}
                </div>

                {grouped[letter].map((contact) => {
                  const [bg, fg] = avatarColor(contact.name);
                  const isChosen = selected?._id === contact._id;

                  return (
                    <div
                      key={contact._id || contact.mobile}
                      onClick={() =>
                        setSelected(isChosen ? null : contact)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: isMobile ? "8px 16px" : "8px 20px",
                        cursor: "pointer",
                        background: isChosen ? "#f0faf8" : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isChosen)
                          e.currentTarget.style.background = "#f7f8fa";
                      }}
                      onMouseLeave={(e) => {
                        if (!isChosen)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: bg,
                          color: fg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          flexShrink: 0,
                        }}
                      >
                        {contact.name?.charAt(0) || "?"}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: "0.85rem",
                            color: "#111b21",
                            marginBottom: 1,
                          }}
                        >
                          {contact.name}
                        </div>

                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#667781",
                          }}
                        >
                          {contact.mobile}
                        </div>
                      </div>

                      {/* Check */}
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          flexShrink: 0,
                          border: isChosen
                            ? "none"
                            : "1.5px solid #d1d7db",
                          background: isChosen
                            ? "#00a884"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                      >
                        {isChosen && (
                          <FiCheck
                            size={12}
                            color="#fff"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Bottom send section */}
        {selected && (
          <div
            style={{
              padding: isMobile ? "10px 16px 24px" : "14px 20px 20px",
              borderTop: "1px solid #f0f2f5",
              background: "#fff",
              animation: "slideUp 0.2s ease forwards",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#f7f8fa",
                borderRadius: 10,
                padding: "8px 12px",
                marginBottom: 14,
              }}
            >
              {(() => {
                const [bg, fg] = avatarColor(selected.name);

                return (
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: bg,
                      color: fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    {selected.name?.charAt(0)}
                  </div>
                );
              })()}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#111b21",
                  }}
                >
                  {selected.name}
                </div>

                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#667781",
                  }}
                >
                  {selected.mobile}
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#aab8c2",
                  padding: 4,
                }}
              >
                <FiX size={16} />
              </button>
            </div>

            <button
              onClick={() => onSelect(selected)}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: "#00a884",
                color: "#fff",
                fontSize: "0.88rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#009c7a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#00a884")
              }
            >
              <FiSend size={16} /> Send Contact
            </button>
          </div>
        )}

        <style>{`
          @keyframes slideUp {
            from {
              transform: translateY(10px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
// Helper component for menu items
function MenuItem({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 16px",
        border: "none",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: "13px",
        color: danger ? "#dc3545" : "#111b21",
        cursor: "pointer",
        textAlign: "left",
        borderBottom: "1px solid #f0f0f0",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f6f6")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AudioBubble({ msg, isMine }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setCurrentTime(a.currentTime);
    setProgress(a.currentTime / a.duration);
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * a.duration;
    setProgress(ratio);
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const activeColor = isMine ? "#00a884" : "#8696a0";
  const trackColor = isMine ? "#b3ebdd" : "#dfe5e7";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px", minWidth: 200, maxWidth: 260 }}>
      <audio
        ref={audioRef}
        src={msg.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Play/Pause button */}
      <div
        onClick={togglePlay}
        style={{
          width: 40, height: 40, borderRadius: "50%",
          background: isMine ? "#00a884" : "#dfe5e7",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isMine ? "#fff" : "#54656f"}>
            <rect x="5" y="4" width="4" height="16" rx="1"/>
            <rect x="15" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isMine ? "#fff" : "#54656f"}>
            <polygon points="6,4 20,12 6,20"/>
          </svg>
        )}
      </div>

      {/* Progress bar + time */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Track */}
        <div
          onClick={handleSeek}
          style={{
            height: 4, borderRadius: 2,
            background: trackColor,
            cursor: "pointer", marginBottom: 5,
            position: "relative",
          }}
        >
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${progress * 100}%`,
            background: activeColor,
            borderRadius: 2,
            transition: "width 0.1s linear",
          }} />
        </div>
        {/* Time */}
        <div style={{ fontSize: "0.72rem", color: "#8696a0", fontVariantNumeric: "tabular-nums" }}>
          {playing || currentTime > 0 ? fmt(currentTime) : fmt(duration)}
        </div>
      </div>
    </div>
  );
}

function ContactBubble({ msg, isMine, onStartChat }) {
  const name = msg.contactName || "Contact";
  const phone = msg.contactPhone || "";
  const email = msg.contactEmail || "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{
      minWidth: 220,
      maxWidth: 280,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Contact row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: "50%",
          background: "#dfe5e7", color: "#54656f",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 600, fontSize: "1.1rem", flexShrink: 0,
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: "0.95rem",
            color: "#111b21", marginBottom: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {name}
          </div>
          {phone && (
            <div style={{ fontSize: "0.8rem", color: "#667781" }}>{phone}</div>
          )}
          {email && (
            <div style={{
              fontSize: "0.75rem", color: "#667781",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {email}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "0.5px", background: isMine ? "#b3ebdd" : "#e9edef", margin: "0 10px" }} />

      {/* Action button */}
      <div
        onClick={() => onStartChat && phone && onStartChat(phone, name)}
        style={{
          padding: "10px 12px",
          textAlign: "center",
          fontSize: "0.88rem",
          fontWeight: 600,
          color: "#00a884",
          cursor: phone ? "pointer" : "default",
        }}
      >
        Send Message
      </div>
    </div>
  );
}
function SingleTick() {
  return (
  <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
    <path
      d="M1.5 5.5L5 9L12.5 1.5"
      stroke="#8696a0"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
  );
}

function DoubleTick({ tickColor }) {
  return (
  <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
    {/* First tick (back) */}
    <path
      d="M1 5.5L4.5 9L10 2"
      stroke={tickColor}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Second tick (front, offset right) */}
    <path
      d="M5 5.5L8.5 9L16 1.5"
      stroke={tickColor}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
  );
}

function MessageMeta({ msg, inline = false }) {
  const tickColor = msg.seen ? "#53bdeb" : "#8696a0";

  return (
    <div
      className="d-flex justify-content-end align-items-center gap-1 px-1.5"
      style={{ marginTop: inline ? "-2px" : "5px", fontSize: "0.68rem", color: "#667781" }}
    >
      <span>{msg.time}</span>
      {msg.type === "sent" && (
        <span style={{ display: "flex" , alignItems: "center", lineHeight: 1 }}>
          {msg.delivered || msg.seen ? <DoubleTick tickColor={tickColor} /> : <SingleTick />}
        </span>
      )}
    </div>
  );
}

function HeaderIcon({ icon, onClick, title, disabled = false, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="icon-btn btn border-0 rounded-circle d-flex align-items-center justify-content-center"
      style={{
        width: 38,
        height: 38,
        background: active ? "#d9fdd3" : "transparent",
        color: active ? "#00a884" : "#54656f",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {icon}
    </button>
  );
}

function formatCallDuration(seconds = 0) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function CallOverlay({ callState, callSeconds, isMuted, onAccept, onReject, onEnd, onToggleMute }) {
  const isIncoming = callState.status === "incoming";
  const isConnected = callState.status === "connected";
  const statusText =
    callState.status === "incoming"
      ? "Incoming voice call"
      : callState.status === "outgoing"
      ? "Calling..."
      : callState.status === "connecting"
      ? "Connecting..."
      : formatCallDuration(callSeconds);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "rgba(17,27,33,0.64)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#ffffff",
          borderRadius: 18,
          boxShadow: "0 20px 52px rgba(0,0,0,0.25)",
          padding: "26px 22px 22px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: "50%",
            background: "#d9fdd3",
            color: "#005c4b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "2rem",
            fontWeight: 700,
          }}
        >
          {(callState.peerName || callState.peerPhone || "?").charAt(0).toUpperCase()}
        </div>

        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#111b21", marginBottom: 4 }}>
          {callState.peerName || callState.peerPhone}
        </div>
        <div style={{ fontSize: "0.9rem", color: isConnected ? "#00a884" : "#667781", marginBottom: 22 }}>
          {statusText}
        </div>

        {isIncoming ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
            <button
              type="button"
              onClick={onReject}
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                border: "none",
                background: "#ef4444",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Decline"
            >
              <FiX size={22} />
            </button>
            <button
              type="button"
              onClick={onAccept}
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                border: "none",
                background: "#00a884",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Answer"
            >
              <FiPhone size={22} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            {isConnected && (
              <button
                type="button"
                onClick={onToggleMute}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  border: "1px solid #e9edef",
                  background: isMuted ? "#fef2f2" : "#f0f2f5",
                  color: isMuted ? "#dc2626" : "#54656f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
              </button>
            )}
            <button
              type="button"
              onClick={onEnd}
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                border: "none",
                background: "#ef4444",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="End call"
            >
              <FiX size={21} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({ icon, title, items = [], customContent }) {
  return (
    <div className="bg-white mb-2 px-3 py-3">
      <div className="d-flex align-items-center gap-2 mb-3 fw-semibold" style={{ color: "#008069", fontSize: "0.92rem" }}>{icon}{title}</div>
      {customContent ? (
        <div>{customContent}</div>
      ) : (
        <div className="d-grid gap-3">
          {items.map((item, i) => (
            <div key={i}>
              <div style={{ fontSize: "0.76rem", color: "#667781", marginBottom: 4 }}>{item.label}</div>
              <div className="text-break" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupModal({ contacts, tags, onClose, onCreate, groupName, setGroupName, selectedContacts, setSelectedContacts }) {
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");

  const AVATAR_RAMPS = [
    ["#E6F1FB", "#185FA5"], ["#E1F5EE", "#0F6E56"],
    ["#FAEEDA", "#854F0B"], ["#EEEDFE", "#534AB7"], ["#FAECE7", "#993C1D"],
  ];
  const avatarColors = (name) => AVATAR_RAMPS[name.charCodeAt(0) % AVATAR_RAMPS.length];

  const filteredContacts = useMemo(() => {
  const q = search.toLowerCase();
  return contacts.filter((c) => {
    if (filter === "users" && c.role !== "user") return false;
    if (filter === "managers" && c.role !== "manager") return false;
    if (filter === "tag" && tagFilter) {
  const hasTag = c.tags?.some(t => String(t._id) === String(tagFilter));
  if (!hasTag) return false;
}
    if (q && !c.name?.toLowerCase().includes(q) && !c.mobile?.includes(q)) return false;

    console.log("contact sample:", JSON.stringify(contacts[0], null, 2));
console.log("tag sample:", JSON.stringify(tags[0], null, 2));
    return true;
  });
  
}, [contacts, filter, tagFilter, search, tags]);

  const toggle = (contact) => {
    const exists = selectedContacts.some((c) => c.mobile === contact.mobile);
    setSelectedContacts(exists
      ? selectedContacts.filter((c) => c.mobile !== contact.mobile)
      : [...selectedContacts, contact]
    );
  };

  const isSelected = (contact) => selectedContacts.some((c) => c.mobile === contact.mobile);
  const canCreate = groupName.trim().length > 0 && selectedContacts.length > 0;
  const step = canCreate ? 2 : 1;

  const FILTER_TABS = [
    { id: "all", label: "All" },
    { id: "users", label: "Users" },
    { id: "managers", label: "Managers" },
    { id: "tag", label: "By Tag" },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff", borderRadius: 16,
          width: "100%", maxWidth: 460,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* ── HEADER ── */}
        <div style={{ padding: "18px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "1rem", color: "#111b21" }}>Create new group</div>
              <div style={{ fontSize: "0.75rem", color: "#667781", marginTop: 2 }}>
                Step {step} of 2 — {step === 1 ? "Name your group" : "Add members"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 24, height: 4, borderRadius: 2, background: "#00a884" }} />
              <div style={{ width: 24, height: 4, borderRadius: 2, background: step === 2 ? "#00a884" : "#e9edef" }} />
              <button
                onClick={onClose}
                style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#667781", display: "flex", alignItems: "center" }}
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {/* Group name */}
          <input
            type="text"
            placeholder="Group name (e.g. Weekend Plan 🌴)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid #e9edef",
              background: "#f0f2f5", fontSize: "0.93rem",
              color: "#111b21", outline: "none", marginBottom: 12,
            }}
          />

          {/* Selected chips */}
          {selectedContacts.length > 0 && (
            <div
              style={{
                display: "flex", flexWrap: "wrap", gap: 6,
                marginBottom: 12, maxHeight: 80, overflowY: "auto",
              }}
            >
              {selectedContacts.map((c) => {
                const [bg, fg] = avatarColors(c.name || "?");
                return (
                  <span
                    key={c.mobile}
                    onClick={() => toggle(c)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 8px 4px 6px", borderRadius: 99,
                      background: bg, color: fg,
                      fontSize: "0.78rem", cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: fg, color: bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.68rem", fontWeight: 700, flexShrink: 0,
                    }}>
                      {c.name?.charAt(0) || "?"}
                    </span>
                    {c.name?.split(" ")[0]}
                    <FiX size={11} style={{ opacity: 0.7 }} />
                  </span>
                );
              })}
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #e9edef", margin: "0 -20px", padding: "0 20px" }}>
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setFilter(tab.id); setTagFilter(""); }}
                style={{
                  border: "none", background: "transparent",
                  padding: "8px 14px", fontSize: "0.8rem", cursor: "pointer",
                  color: filter === tab.id ? "#00a884" : "#667781",
                  fontWeight: filter === tab.id ? 600 : 400,
                  borderBottom: filter === tab.id ? "2px solid #00a884" : "2px solid transparent",
                  marginBottom: -1, whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tag dropdown */}
          {filter === "tag" && (
            <div style={{ padding: "10px 0 4px" }}>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #e9edef", fontSize: "0.85rem",
                  background: "#f0f2f5", color: "#111b21", outline: "none",
                }}
              >
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search */}
          <div style={{ position: "relative", margin: "10px 0 6px" }}>
            <FiSearch
              size={14}
              color="#667781"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            />
            <input
              type="text"
              placeholder="Search contacts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "8px 12px 8px 32px", borderRadius: 8,
                border: "1px solid #e9edef", background: "#f0f2f5",
                fontSize: "0.85rem", color: "#111b21", outline: "none",
              }}
            />
          </div>
        </div>

        {/* ── CONTACT LIST ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 0" }}>
          {filteredContacts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "#667781", fontSize: "0.88rem" }}>
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const selected = isSelected(contact);
              const [bg, fg] = avatarColors(contact.name || "?");
              return (
                <div
                  key={contact._id || contact.mobile}
                  onClick={() => toggle(contact)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: "0.5px solid #f0f2f5",
                    cursor: "pointer",
                    background: selected ? "#f0faf7" : "transparent",
                    borderRadius: selected ? 8 : 0,
                    padding: selected ? "10px 8px" : "10px 0",
                    margin: selected ? "0 -8px" : 0,
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: bg, color: fg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.9rem", fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    {contact.name?.charAt(0) || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.93rem", fontWeight: 500, color: "#111b21", marginBottom: 2 }}>
                      {contact.name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#667781" }}>
                      {contact.mobile}
                      {contact.role && (
                        <span style={{
                          marginLeft: 6, padding: "1px 7px", borderRadius: 99,
                          background: contact.role === "manager" ? "#fff3cd" : "#e9edef",
                          color: contact.role === "manager" ? "#856404" : "#54656f",
                          fontSize: "0.7rem", fontWeight: 500,
                        }}>
                          {contact.role}
                        </span>
                      )}
                      {contact.tag && tags.find(t => t._id === contact.tag) && (
                        <span style={{
                          marginLeft: 4, padding: "1px 7px", borderRadius: 99,
                          background: "#d9fdd3", color: "#005c4b",
                          fontSize: "0.7rem", fontWeight: 500,
                        }}>
                          {tags.find(t => t._id === contact.tag)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Custom circular checkbox */}
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      border: selected ? "none" : "1.5px solid #ccc",
                      background: selected ? "#00a884" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {selected && <FiCheck size={12} color="#fff" strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── FOOTER ── */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "0.5px solid #e9edef",
            flexShrink: 0, display: "flex",
            alignItems: "center", justifyContent: "space-between",
            background: "#fafafa",
          }}
        >
          <span style={{ fontSize: "0.82rem", color: "#667781" }}>
            {selectedContacts.length > 0
              ? `${selectedContacts.length} member${selectedContacts.length > 1 ? "s" : ""} selected`
              : "No members selected"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setSelectedContacts([])}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: "0.85rem",
                border: "1px solid #e9edef", background: "transparent",
                color: "#667781", cursor: "pointer",
              }}
            >
              Clear
            </button>
            <button
              onClick={onCreate}
              disabled={!canCreate}
              style={{
                padding: "8px 22px", borderRadius: 8, fontSize: "0.85rem",
                border: "none",
                background: canCreate ? "#00a884" : "#e9edef",
                color: canCreate ? "#fff" : "#aaa",
                cursor: canCreate ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              Create group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generates a consistent color per phone number — like WhatsApp group sender colors
function stringToColor(str = "") {
  const palette = [
    "#e17055", "#6c5ce7", "#00b894", "#0984e3",
    "#fd79a8", "#00cec9", "#fdcb6e", "#a29bfe",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function getDateLabel(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}
