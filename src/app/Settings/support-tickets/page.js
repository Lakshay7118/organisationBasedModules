"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  MessageSquare,
  RefreshCcw,
  Send,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import API from "../../utils/api";

const ISSUE_CATEGORIES = [
  { id: "forgot_password", label: "Forgot password" },
  { id: "login", label: "Login issue" },
  { id: "messages", label: "Messages not sending" },
  { id: "calls", label: "Call not connecting" },
  { id: "billing", label: "Billing or plan" },
  { id: "other", label: "Other issue" },
];

const roleLabel = (role) => (role === "super_admin" ? "Admin" : role || "User");
const issueLabel = (ticket) =>
  ISSUE_CATEGORIES.find((item) => item.id === ticket?.category)?.label || ticket?.category || "Support";
const ticketTone = (ticket) =>
  ticket?.status === "ended" ? "neutral" : ticket?.status === "resolved" ? "approved" : ticket?.status === "open" ? "pending" : "neutral";

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#eef2f7", color: "#475569" },
    pending: { bg: "#fff7ed", color: "#c2410c" },
    approved: { bg: "#dcfce7", color: "#166534" },
    rejected: { bg: "#fee2e2", color: "#b91c1c" },
  };
  const s = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "3px 9px",
      background: s.bg,
      color: s.color,
      fontSize: 12,
      fontWeight: 800,
      textTransform: "capitalize",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

export default function SupportTicketsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [resetDrafts, setResetDrafts] = useState({});
  const [replyStatusDrafts, setReplyStatusDrafts] = useState({});
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  const colors = {
    page: "var(--card-bg)",
    panel: "var(--card-bg)",
    panel2: "var(--app-surface-2)",
    text: "var(--app-text)",
    muted: "var(--app-text-muted)",
    border: "var(--app-border)",
    accent: "#00a884",
    accentSoft: "rgba(0, 168, 132, 0.14)",
    input: "var(--input-bg)",
  };

  const fieldStyle = {
    width: "100%",
    minHeight: 42,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.input,
    color: colors.text,
    padding: "9px 11px",
    fontSize: 14,
    outline: "none",
  };

  const buttonBase = {
    border: "none",
    borderRadius: 8,
    minHeight: 38,
    padding: "0 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  };

  const supportStaff = ["super_admin", "manager"].includes(profile?.role);
  const activeTickets = useMemo(() => tickets.filter((ticket) => ticket.status !== "ended"), [tickets]);
  const endedTickets = useMemo(() => tickets.filter((ticket) => ticket.status === "ended"), [tickets]);
  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket._id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const refreshSupportTickets = useCallback(async () => {
    try {
      const res = await API.get("/users/support-tickets");
      setTickets(res.data?.data || []);
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.error || "Could not refresh support tickets." });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [meRes, ticketRes] = await Promise.all([
          API.get("/users/me"),
          API.get("/users/support-tickets"),
        ]);
        if (cancelled) return;
        setProfile(meRes.data?.data || null);
        setTickets(ticketRes.data?.data || []);
      } catch (error) {
        if (!cancelled) {
          setNotice({ type: "error", text: error.response?.data?.error || "Could not load support tickets." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!tickets.length) {
      setSelectedTicketId(null);
      return;
    }
    if (!selectedTicketId || !tickets.some((ticket) => ticket._id === selectedTicketId)) {
      setSelectedTicketId((activeTickets[0] || endedTickets[0])?._id || null);
    }
  }, [activeTickets, endedTickets, selectedTicketId, tickets]);

  const updateTicket = (updatedTicket) => {
    setTickets((prev) => prev.map((ticket) => ticket._id === updatedTicket._id ? updatedTicket : ticket));
    setSelectedTicketId(updatedTicket._id);
  };

  const replyToTicket = async (ticketId, statusOverride) => {
    const message = replyDrafts[ticketId]?.trim() || (statusOverride === "resolved" ? "Your ticket has been marked as resolved." : "");
    if (!message) {
      setNotice({ type: "error", text: "Write a reply first." });
      return;
    }

    try {
      const res = await API.post(`/users/support-tickets/${ticketId}/replies`, {
        message,
        status: statusOverride || replyStatusDrafts[ticketId] || "in_progress",
      });
      updateTicket(res.data.data);
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      setReplyStatusDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      setNotice({ type: "success", text: "Reply sent to user." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.error || "Could not send reply." });
    }
  };

  const resetTicketPassword = async (ticketId) => {
    const temporaryPassword = resetDrafts[ticketId]?.trim();
    if (!temporaryPassword || temporaryPassword.length < 6) {
      setNotice({ type: "error", text: "Enter a temporary password with at least 6 characters." });
      return;
    }

    try {
      const res = await API.post(`/users/support-tickets/${ticketId}/reset-password`, { temporaryPassword });
      updateTicket(res.data.data);
      setResetDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      setNotice({ type: "success", text: "Temporary password set." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.error || "Could not reset password." });
    }
  };

  const endTicketChat = async (ticketId) => {
    if (!window.confirm("End this support chat for the user?")) return;
    try {
      const res = await API.patch(`/users/support-tickets/${ticketId}/end`);
      updateTicket(res.data.data);
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      setReplyStatusDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      setNotice({ type: "success", text: "Chat ended." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.error || "Could not end chat." });
    }
  };

  const deleteEndedTicket = async (ticketId) => {
    const ticket = tickets.find((item) => item._id === ticketId);
    if (ticket?.status !== "ended") {
      setNotice({ type: "error", text: "Only ended tickets can be deleted." });
      return;
    }
    if (!window.confirm("Delete this ended ticket permanently?")) return;

    try {
      await API.delete(`/users/support-tickets/${ticketId}`);
      setTickets((prev) => prev.filter((item) => item._id !== ticketId));
      setSelectedTicketId(null);
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      setReplyStatusDrafts((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      setResetDrafts((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      setNotice({ type: "success", text: "Ended ticket deleted." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.error || "Could not delete ticket." });
    }
  };

  const renderTicketSummary = (ticket) => {
    const isEnded = ticket.status === "ended";
    const isSelected = selectedTicketId === ticket._id;

    return (
      <div
        key={ticket._id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedTicketId(ticket._id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedTicketId(ticket._id);
          }
        }}
        style={{
          ...rowCardStyle(colors, true),
          alignItems: "flex-start",
          background: isSelected ? colors.accentSoft : colors.panel,
          borderColor: isSelected ? colors.accent : colors.border,
          cursor: "pointer",
        }}
      >
        <Ticket size={17} color={isEnded ? colors.muted : colors.accent} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
            <div style={{ color: colors.text, fontWeight: 850, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ticket.user?.name || ticket.user?.phone || "User"}
            </div>
            <Pill tone={ticketTone(ticket)}>{ticket.status?.replace("_", " ")}</Pill>
          </div>
          <div style={{ color: colors.text, fontSize: 13, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ticket.subject || issueLabel(ticket)}
          </div>
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            {issueLabel(ticket)} - {new Date(ticket.createdAt).toLocaleString()}
          </div>
        </div>
        {isEnded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteEndedTicket(ticket._id);
            }}
            title="Delete ended ticket"
            style={{ ...buttonBase, width: 34, minHeight: 34, padding: 0, background: "#fee2e2", color: "#b91c1c", flexShrink: 0 }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
  };

  const renderTicketDetail = () => {
    if (!selectedTicket) {
      return (
        <div style={{ ...emptyStateStyle(colors), minHeight: 360 }}>
          <Ticket size={28} />
          Select a ticket to view details and reply.
        </div>
      );
    }

    const isEnded = selectedTicket.status === "ended";
    const statusValue = replyStatusDrafts[selectedTicket._id] || (selectedTicket.status === "open" ? "in_progress" : selectedTicket.status || "in_progress");

    return (
      <div style={{ ...rowCardStyle(colors, true), display: "block", background: colors.panel }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <Ticket size={18} color={isEnded ? colors.muted : colors.accent} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ color: colors.text, fontWeight: 900, fontSize: 16 }}>{selectedTicket.subject}</div>
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              {selectedTicket.user?.name || selectedTicket.user?.phone || "User"} - {issueLabel(selectedTicket)} - {new Date(selectedTicket.createdAt).toLocaleString()}
            </div>
            {isEnded && (
              <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                Ended {selectedTicket.endedAt ? new Date(selectedTicket.endedAt).toLocaleString() : ""}{selectedTicket.endedBy?.name ? ` by ${selectedTicket.endedBy.name}` : ""}
              </div>
            )}
          </div>
          <Pill tone={ticketTone(selectedTicket)}>{selectedTicket.status?.replace("_", " ")}</Pill>
          {isEnded && (
            <button type="button" onClick={() => deleteEndedTicket(selectedTicket._id)} style={{ ...buttonBase, background: "#fee2e2", color: "#b91c1c" }}>
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>

        <div style={{ color: colors.text, fontSize: 13, marginTop: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {selectedTicket.message}
        </div>

        {selectedTicket.replies?.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {selectedTicket.replies.map((reply) => (
              <div key={reply._id || reply.createdAt} style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: 10, background: colors.panel2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.muted, fontSize: 12, marginBottom: 4 }}>
                  <MessageSquare size={13} />
                  {reply.sender?.name || roleLabel(reply.senderRole)} - {new Date(reply.createdAt).toLocaleString()}
                </div>
                <div style={{ color: colors.text, fontSize: 13, whiteSpace: "pre-wrap" }}>{reply.message}</div>
              </div>
            ))}
          </div>
        )}

        {!isEnded && (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <textarea
              style={{ ...fieldStyle, minHeight: 96, resize: "vertical" }}
              placeholder="Reply to the user. This appears in their chatbot."
              value={replyDrafts[selectedTicket._id] || ""}
              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [selectedTicket._id]: e.target.value }))}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={statusValue}
                onChange={(e) => setReplyStatusDrafts((prev) => ({ ...prev, [selectedTicket._id]: e.target.value }))}
                style={{ ...fieldStyle, maxWidth: 170 }}
              >
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="open">Open</option>
              </select>
              <button type="button" onClick={() => replyToTicket(selectedTicket._id)} style={{ ...buttonBase, background: colors.accent, color: "#fff" }}>
                <Send size={15} /> Send Reply
              </button>
              <button type="button" onClick={() => replyToTicket(selectedTicket._id, "resolved")} style={{ ...buttonBase, background: "#dcfce7", color: "#166534" }}>
                <Check size={15} /> Solve
              </button>
              <button type="button" onClick={() => endTicketChat(selectedTicket._id)} style={{ ...buttonBase, background: "#fee2e2", color: "#b91c1c" }}>
                <X size={15} /> End Chat
              </button>
            </div>
            {selectedTicket.category === "forgot_password" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  style={{ ...fieldStyle, maxWidth: 260 }}
                  type="password"
                  placeholder="Temporary password"
                  value={resetDrafts[selectedTicket._id] || ""}
                  onChange={(e) => setResetDrafts((prev) => ({ ...prev, [selectedTicket._id]: e.target.value }))}
                />
                <button type="button" onClick={() => resetTicketPassword(selectedTicket._id)} style={{ ...buttonBase, background: "#f59e0b", color: "#111827" }}>
                  Reset Password
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="support-ticket-route" style={{ minHeight: "calc(100vh - 138px)", background: colors.page, borderRadius: 12, overflow: "visible", color: colors.text }}>
      <style>{`
        .support-ticket-route input,
        .support-ticket-route textarea,
        .support-ticket-route select {
          background: var(--input-bg) !important;
          color: var(--app-text) !important;
          border-color: var(--input-border) !important;
        }
          .support-ticket-route-desk {
            display: grid;
            grid-template-columns: minmax(300px, 0.38fr) minmax(0, 0.62fr);
            min-height: 0;
            overflow: visible;
            align-items: start;
          }
          @media (max-width: 900px) {
            .support-ticket-route-desk { grid-template-columns: 1fr; }
            .support-ticket-route-list { border-right: none !important; border-bottom: 1px solid ${colors.border}; }
            .support-ticket-route-detail { position: static !important; }
          }
      `}</style>

      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <button type="button" onClick={() => router.push("/Settings")} style={{ ...buttonBase, background: colors.panel2, color: colors.text, border: `1px solid ${colors.border}`, marginBottom: 12 }}>
            <ArrowLeft size={15} /> Back to Settings
          </button>
          <h1 style={{ margin: 0, color: colors.text, fontSize: 24, fontWeight: 950 }}>Support Ticket Desk</h1>
          <p style={{ margin: "5px 0 0", color: colors.muted, fontSize: 13 }}>
            Compact list on the left. Select a ticket to reply, solve, end, or delete resolved tickets.
          </p>
        </div>
        <button type="button" onClick={refreshSupportTickets} style={{ ...buttonBase, background: colors.panel2, color: colors.text, border: `1px solid ${colors.border}` }}>
          <RefreshCcw size={15} /> Refresh
        </button>
      </div>

      {notice && (
        <div style={{
          margin: "14px 20px 0",
          borderRadius: 8,
          padding: "10px 12px",
          background: notice.type === "error" ? "#fee2e2" : "#dcfce7",
          color: notice.type === "error" ? "#991b1b" : "#166534",
          fontSize: 13,
          fontWeight: 700,
        }}>
          {notice.text}
        </div>
      )}

      {loading ? (
        <div style={{ ...emptyStateStyle(colors), margin: 20 }}>
          <RefreshCcw size={28} />
          Loading support tickets...
        </div>
      ) : !supportStaff ? (
        <div style={{ ...emptyStateStyle(colors), margin: 20 }}>
          <Ticket size={28} />
          Only admins and managers can open the support ticket desk.
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ ...emptyStateStyle(colors), margin: 20 }}>
          <Ticket size={28} />
          No raised tickets yet.
        </div>
      ) : (
        <div className="support-ticket-route-desk">
          <div className="support-ticket-route-list" style={{ borderRight: `1px solid ${colors.border}`, minHeight: 0, padding: 16, display: "grid", alignContent: "start", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <div style={{ color: colors.text, fontWeight: 950 }}>All tickets</div>
              <Pill tone="pending">{activeTickets.length} active</Pill>
              <Pill>{endedTickets.length} ended</Pill>
            </div>
            {activeTickets.map(renderTicketSummary)}
            {endedTickets.length > 0 && (
              <div style={{ color: colors.muted, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 8 }}>Ended Tickets</div>
            )}
            {endedTickets.map(renderTicketSummary)}
          </div>
          <div className="support-ticket-route-detail" style={{ minHeight: 0, padding: 16, position: "sticky", bottom: 16, alignSelf: "end" }}>
            {renderTicketDetail()}
          </div>
        </div>
      )}
    </div>
  );
}

function rowCardStyle(colors, roomy = false) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: roomy ? 14 : 12,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.panel2,
  };
}

function emptyStateStyle(colors) {
  return {
    border: `1px dashed ${colors.border}`,
    borderRadius: 8,
    minHeight: 150,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 8,
    color: colors.muted,
    fontWeight: 800,
    textAlign: "center",
    padding: 18,
  };
}
