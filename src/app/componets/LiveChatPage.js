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
} from "react-icons/fi";

import API from "../utils/api";

// ✅ Backend root URL (without /api) for media files
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

/* ─────────────────────────────────────────────
  Skeleton components (unchanged)
───────────────────────────────────────────── */
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
useEffect(() => {
  selectedChatRef.current = selectedChat;
}, [selectedChat]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.phone) {
    s.emit("joinUserRoom", user.phone);
  }

  // 🔥 Global handler — updates left panel preview for ALL chats
const handleGlobalNewMessage = (msg) => {

  // ✅ REMOVED early return — both handlers run, dedup prevents duplicates

  // ✅ Add message to state for non-selected chats
  // For selected chat, the per-chat handleNewMessage handles it
  if (String(msg.chatId) !== String(selectedChatRef.current?._id)) {
    setMessages(prev => {
      const chatId = msg.chatId;
      const currentMsgs = prev[chatId] || [];
      if (currentMsgs.some(m =>
        m.id === msg._id ||
        (m.text === msg.text && Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 3000)
      )) return prev;

      const isSentByMe = String(msg.sender) === String(currentUserRef.current?.phone);
      return {
        ...prev,
        [chatId]: [...currentMsgs, {
          id: msg._id,
          sender: msg.sender,
          type: isSentByMe ? "sent" : "received",
          messageType: msg.messageType || "text",
          text: msg.text || "",
          templateMeta: msg.templateMeta || null,
          createdAt: msg.createdAt,
          time: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          delivered: !isSentByMe,
          seen: false,
          fileName: msg.fileName,
          url: msg.fileUrl,
          isDeleted: false,
        }],
      };
    });
  }

  // ✅ Always update chat list (move to top + unread) for ALL messages
 // Replace this entire setChatList block inside handleGlobalNewMessage:
setChatList(prev => {
  const chat = prev.find(c => String(c._id) === String(msg.chatId));
  const isByMe = String(msg.sender) === String(currentUserRef.current?.phone);
  const isCurrentlyOpen = String(msg.chatId) === String(selectedChatRef.current?._id);

  if (!chat) {
    API.get("/chats").then(res => {
      if (Array.isArray(res.data)) {
        const restored = res.data.find(c => String(c._id) === String(msg.chatId));
        if (restored) {
          setChatList(prev2 => {
            const exists = prev2.find(c => String(c._id) === String(msg.chatId));
            if (exists) return prev2;
            return [{ ...restored, unread: isByMe || isCurrentlyOpen ? 0 : 1 }, ...prev2];
          });
          getSocket().emit("joinChat", msg.chatId);
        }
      }
    }).catch(console.error);
    return prev;
  }

  const updated = {
    ...chat,
    // ✅ FIX: don't increment unread if message is by me OR chat is currently open
    unread: (isByMe || isCurrentlyOpen) ? chat.unread : (chat.unread || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  return [updated, ...prev.filter(c => String(c._id) !== String(msg.chatId))];
});
};

  s.on("newMessage", handleGlobalNewMessage);

  // ✅ Single tick → Double tick (delivered)
  const handleMessageDelivered = ({ messageId, chatId }) => {
    setMessages(prev => {
      if (!prev[chatId]) return prev;
      return {
        ...prev,
        [chatId]: prev[chatId].map(m =>
          // match by real id OR mark last temp message as delivered
          (m.id === messageId || (String(m.id).startsWith("tmp-") && m.type === "sent"))
            ? { ...m, delivered: true, id: m.id.startsWith("tmp-") ? messageId : m.id }
            : m
        ),
      };
    });
  };
  s.on("messageDelivered", handleMessageDelivered);

  // ✅ Global seen handler — works even when chat is not selected
  const handleGlobalMessagesSeen = ({ chatId }) => {
    setMessages(prev => {
      if (!prev[chatId]) return prev;
      return {
        ...prev,
        [chatId]: prev[chatId].map(m =>
          m.type === "sent" ? { ...m, seen: true, delivered: true } : m
        ),
      };
    });
  };

  s.on("messagesSeen", handleGlobalMessagesSeen);

// ✅ ADD THIS — listens for campaign-created chats
const handleChatUpdated = ({ chatId, isNewChat, lastMessage, participants }) => {
  const s = getSocket();

  // ✅ Step 1: Join the room immediately
  s.emit("joinChat", chatId);

  // ✅ Step 2: Update chat list
  setChatList(prev => {
    const exists = prev.find(c => String(c._id) === String(chatId));
     console.log("📋 Chat exists in list?", !!exists, "| chatId:", chatId);
    if (exists) {
      // Chat already in list — just update lastMessage + unread + move to top
      const updated = {
        ...exists,
        lastMessage,
        unread: (exists.unread || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      return [updated, ...prev.filter(c => String(c._id) !== String(chatId))];
    }

    // ✅ New chat — add it to the top of the list
    const otherPhone = participants?.find(
      p => p !== currentUserRef.current?.phone
    ) || "Unknown";

    // Try to resolve contact name
    const matchedContact = contacts.find(c => c.mobile === otherPhone);

    return [
      {
        _id: chatId,
        participants,
        lastMessage,
        status: "active",
        unread: 1,
        name: matchedContact?.name || otherPhone,
        phone: otherPhone,
      },
      ...prev,
    ];
  });

  // ✅ Step 3: KEY FIX — Always re-fetch messages from DB for this chat
  // This bypasses the race condition where emit fires before socket joins room
  // DB always has the message regardless of socket timing
  API.get(`/messages?chatId=${chatId}`)
    .then(res => {
      setMessages(prev => ({
        ...prev,
        [chatId]: res.data.map(m => {
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
          };
        }),
      }));
    })
    .catch(err => console.error("❌ Message fetch failed:", err));
};
s.on("chatUpdated", handleChatUpdated);

// ── NEW LISTENERS ──
const handleChatCleared = ({ chatId }) => {
  setMessages(prev => ({ ...prev, [chatId]: [] }));
};

const handleChatPinned = ({ chatId, pinned }) => {
  setChatList(prev => {
    const updated = prev.map(c => c._id === chatId ? { ...c, pinned } : c);
    return [...updated.filter(c => c.pinned), ...updated.filter(c => !c.pinned)];
  });
};

const handleChatDeletedPermanently = ({ chatId }) => {
  setChatList(prev => prev.filter(c => String(c._id) !== String(chatId)));
  if (String(selectedChatRef.current?._id) === String(chatId)) {
    setSelectedChat(null);
    setMobileChatOpen(false);
  }
  setMessages(prev => {
    const updated = { ...prev };
    delete updated[chatId];
    return updated;
  });
};

s.on("chatCleared", handleChatCleared);
s.on("chatPinned", handleChatPinned);
s.on("chatDeletedPermanently", handleChatDeletedPermanently);

return () => {
  s.off("newMessage", handleGlobalNewMessage);
  s.off("messageDelivered", handleMessageDelivered);
  s.off("messagesSeen", handleGlobalMessagesSeen);
  s.off("chatUpdated", handleChatUpdated);
  s.off("chatCleared", handleChatCleared);
  s.off("chatPinned", handleChatPinned);
  s.off("chatDeletedPermanently", handleChatDeletedPermanently);
};
}, []);

// ✅ Fix — only approved templates
useEffect(() => {
  const loadTemplates = async () => {
    try {
      const res = await API.get("/templates");
      const all = Array.isArray(res.data)
        ? res.data
        : res.data.templates || res.data.data || [];

      // ✅ Only show approved templates in chat
      const approved = all.filter(t => t.approvalStatus === "approved");
      setTemplates(approved);
    } catch (err) {
      console.error("Templates error:", err);
    }
  };
  loadTemplates();
}, []); 

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

 const handleNewMessage = (msg) => {
  if (String(msg.chatId) !== String(chatId)) return;

  const isSentByMe =
    String(msg.sender) === String(currentUserRef.current?.phone);

  // ✅ FIX: mark read instantly when message arrives in open chat
  if (!isSentByMe) {
    API.post("/messages/mark-read", { chatId }).catch(console.error);
    getSocket().emit("markRead", { chatId });
  }

  setMessages(prev => {
    const currentMsgs = prev[chatId] || [];

    const tempIndex = currentMsgs.findIndex(m =>
      m.id && String(m.id).startsWith("tmp-") &&
      m.text === msg.text &&
      Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 5000
    );

    if (tempIndex !== -1) {
      const updatedMsgs = [...currentMsgs];
      updatedMsgs[tempIndex] = {
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
        seen: false,
        fileName: msg.fileName,
        url: msg.fileUrl,
        isDeleted: false,
      };
      return { ...prev, [chatId]: updatedMsgs };
    }

    if (currentMsgs.some(m => m.id === msg._id)) return prev;

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
      delivered: !isSentByMe,
      seen: false,
      fileName: msg.fileName,
      url: msg.fileUrl,
      isDeleted: false,
    };

    return { ...prev, [chatId]: [...currentMsgs, newMsg] };
  });

  // ✅ move this chat to top
  setChatList(prev => {
    const chat = prev.find(c => String(c._id) === String(msg.chatId));
    if (!chat) return prev;
    return [
      { ...chat, updatedAt: new Date().toISOString() },
      ...prev.filter(c => String(c._id) !== String(msg.chatId)),
    ];
  });
};

  // ✅ TYPING INDICATOR
  const handleUserTyping = ({ chatId: tChatId }) => {
    if (String(tChatId) !== String(chatId)) return;
    setIsUserTyping(true);
    clearTimeout(window._typingTimer);
    window._typingTimer = setTimeout(() => setIsUserTyping(false), 2500);
  };

  // ✅ BLUE DOUBLE TICK — handled by global listener
  const handleMessagesSeen = () => {};

  // ✅ Register all listeners
  s.on("newMessage", handleNewMessage);
  s.on("userTyping", handleUserTyping);
  s.on("messagesSeen", handleMessagesSeen);

  // ✅ Cleanup on unmount / chat change
  return () => {
    s.off("newMessage", handleNewMessage);
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
    return res.data;
  };

  const handleSend = async () => {
  if (!selectedChat || (!input.trim() && !pendingAttachment)) return;
  const chatId = selectedChat._id;
  const user = JSON.parse(localStorage.getItem("user"));

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
    if (pa.url && pa.url.startsWith("blob:")) {
      try {
        const blob = await fetch(pa.url).then(r => r.blob());
        const file = new File([blob], pa.fileName, { type: blob.type });
        const uploadData = await uploadFile(file);
        await sendMessage("", {
          messageType: uploadData.messageType,
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.fileName,
          fileSize: uploadData.fileSize,
        });
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload file");
      }
    } else {
      await sendMessage("", {
        messageType: pa.kind,
        fileUrl: pa.url,
        fileName: pa.fileName,
        fileSize: pa.fileSize,
      });
    }
  }

  if (input.trim()) {
    const text = input.trim();
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
          delivered: false,
          seen: false,
        },
      ],
    }));
    await sendMessage(text);
  }

  setShowEmojiPicker(false);
  setAttachmentMenuOpen(false);

  // ✅ ADDED: move this chat to top after sending
  setChatList(prev => {
    const chat = prev.find(c => String(c._id) === String(chatId));
    if (!chat) return prev;
    return [
      { ...chat, updatedAt: new Date().toISOString() },
      ...prev.filter(c => String(c._id) !== String(chatId)),
    ];
  });
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

    setPendingAttachment({
      kind: isImage ? "image" : isVideo ? "video" : "file",
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      url: URL.createObjectURL(file),
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
  setAttachmentMenuOpen(false);
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
  const msgs = messages[chatId];
  const last = msgs?.[msgs.length - 1];

  if (last) {
    if (last.isDeleted) return "🚫 This message was deleted";
    if (last.messageType === "image") return "📷 Photo";
    if (last.messageType === "video") return "🎥 Video";
    if (last.messageType === "file") return `📎 ${last.fileName}`;
    if (last.messageType === "template") return "📋 Template";
    return last.text || "Start conversation";
  }

  // ✅ Fallback to backend lastMessage on refresh
  const chat = chatList.find(c => c._id === chatId);
  const lm = chat?.lastMessage;
  if (!lm) return "Start conversation";
  if (lm.messageType === "image") return "📷 Photo";
  if (lm.messageType === "video") return "🎥 Video";
  if (lm.messageType === "file") return `📎 ${lm.fileName || "File"}`;
  if (lm.messageType === "template") return "📋 Template";
  return lm.text || "Start conversation";
};

// Replace your existing lastMessageTime function
const lastMessageTime = (chatId) => {
  const msgs = messages[chatId];
  const last = msgs?.[msgs.length - 1];
  if (last?.time) return last.time;

  // ✅ Fallback to backend
  const chat = chatList.find(c => c._id === chatId);
  const lm = chat?.lastMessage;
  if (!lm?.createdAt) return "";
  return new Date(lm.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
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
                              <div style={{ fontSize: "0.78rem", color: "#667781" }}>{selectedChat.lastSeen}</div>
                            </div>
                          </div>
                        </div>
                        <div className="d-flex gap-1 flex-shrink-0">
                          <HeaderIcon icon={<FiSearch size={18} />} />
                          <HeaderIcon icon={<FiPhone size={18} />} />
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
                        {(messages[selectedChat?._id] || []).map((msg, index) => (
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
                              onSendMessage={async (newMsg) => {
                                const user = JSON.parse(localStorage.getItem("user"));

                                // ✅ 1. UI me turant show (optimistic)
                                setMessages(prev => ({
                                  ...prev,
                                  [selectedChat._id]: [
                                    ...(prev[selectedChat._id] || []),
                                    newMsg
                                  ]
                                }));

                                // ✅ 2. Backend ko bhejo (IMPORTANT)
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
                        ))}
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
                        <button
                          type="button"
                          onClick={() => setShowTemplateModal(true)}
                          className="btn border-0 rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: 42,
                            height: 42,
                            background: "#e7fef5",
                            color: "#00a884",
                          }}
                        >
                          📄
                        </button>
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
      <div className="d-flex align-items-center justify-content-center border-bottom flex-shrink-0 fw-semibold" style={{ height: 59, background: "#f0f2f5", color: "#111b21" }}>
        {selectedChat?.isGroup ? "Group Info" : "Contact Info"}
      </div>
      <div className="flex-grow-1 scroll-hidden" style={{ minHeight: 0, background: "#f7f8fa" }}>
        {selectedChat ? (
          <>
            <div className="bg-white text-center px-3 py-4" style={{ borderBottom: "10px solid #f0f2f5" }}>
              <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 fw-bold" style={{ width: 92, height: 92, background: "#dfe5e7", color: "#54656f", fontSize: "1.8rem" }}>{selectedChat?.name?.charAt(0) || "U"}</div>
              <div style={{ fontSize: "1.08rem", fontWeight: 500, color: "#111b21" }}>{selectedChat?.name}</div>
              {!selectedChat?.isGroup && <div style={{ fontSize: "0.84rem", color: "#667781", marginTop: 4 }}>{selectedChat?.phone}</div>}
            </div>
            {selectedChat?.isGroup ? (
              <DetailCard icon={<FiUsers size={16} />} title="Members" customContent={<div>{selectedChat.participants?.join(", ")}</div>} />
            ) : (
              <>
                <DetailCard icon={<FiInfo size={16} />} title="Basic Info" items={[{ label: "Phone", value: selectedChat?.phone }, { label: "Email", value: selectedChat?.email }, { label: "City", value: selectedChat?.city }, { label: "Status", value: selectedChat?.lastSeen }]} />
                <DetailCard icon={<FiTag size={16} />} title="Lead Tag" items={[{ label: "Tag", value: tags.find(t => t._id === selectedChat.tag)?.name || selectedChat.tag || "No tag" }]} />
                <DetailCard icon={<FiMessageSquare size={16} />} title="Notes" customContent={<div style={{ fontSize: "0.9rem", color: "#3b4a54", lineHeight: 1.6 }}>{selectedChat.notes}</div>} />
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
      id: Date.now(),
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
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px 6px",
              fontSize: 11,
              color: "#667781",
            }}
          >
            {getFormattedTime()}
            {/* Read receipt ticks for sent messages */}
            {isMine && (
              <svg width="16" height="11" viewBox="0 0 16 11">
                <path
                  d="M11.071.653a.75.75 0 0 1 .001 1.06l-6.01 6.009a.75.75 0 0 1-1.06 0L1.47 5.19a.75.75 0 1 1 1.06-1.06l2.003 2.002 5.479-5.48a.75.75 0 0 1 1.059.001z"
                  fill={msg.status === "read" ? "#53bdeb" : "#8696a0"}
                />
                <path
                  d="M14.571.653a.75.75 0 0 1 .001 1.06l-6.01 6.009a.75.75 0 0 1-.53.22.75.75 0 0 1-.53-.22l-.53-.53a.75.75 0 1 1 1.06-1.06l5.479-5.48a.75.75 0 0 1 1.06.001z"
                  fill={msg.status === "read" ? "#53bdeb" : "#8696a0"}
                />
              </svg>
            )}
          </div>

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
              borderRadius: 6,
              display: "block",
              cursor: "pointer", // 👈 important
            }}
          />
        </>
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
      return (
        <div className="d-flex align-items-center gap-2">
          <FiFile size={20} style={{ flexShrink: 0, color: "#54656f" }} />
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{msg.fileName}</div>
            {msg.fileSize && (
              <div style={{ fontSize: "0.75rem", color: "#667781" }}>{msg.fileSize}</div>
            )}
          </div>
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

  return (
    <div
      ref={bubbleRef}
      style={{
        ...bubbleBase,
        ...(isSelected
          ? { outline: "2px solid #00a884", outlineOffset: 1 }
          : {}),
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowMenu(false);
      }}
    >
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

function MessageMeta({ msg, inline = false }) {
  return (
    <div
      className="d-flex justify-content-end align-items-center gap-1"
      style={{ marginTop: inline ? "-2px" : "5px", fontSize: "0.68rem", color: "#667781" }}
    >
      <span>{msg.time}</span>
      {msg.type === "sent" && (
        <>
          {msg.seen ? (
            // Blue double tick (seen)
            <span style={{ color: "#53bdeb", display: "flex", alignItems: "center" }}>
              <FiCheckCircle size={12} />
            </span>
          ) : msg.delivered ? (
            // Grey double tick (delivered but not seen)
            <span style={{ display: "flex", alignItems: "center", gap: "-4px" }}>
              <FiCheck size={12} />
              <FiCheck size={12} style={{ marginLeft: "-5px" }} />
            </span>
          ) : (
            // Single grey tick (sent but not delivered)
            <span style={{ display: "flex", alignItems: "center" }}>
              <FiCheck size={12} />
            </span>
          )}

          
        </>
      )}
    </div>
  );
}

function HeaderIcon({ icon }) {
  return (
    <button type="button" className="icon-btn btn border-0 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 38, height: 38, background: "transparent", color: "#54656f" }}>
      {icon}
    </button>
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

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}