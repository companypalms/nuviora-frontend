// Chat interno (vendedora ↔ agencia, un hilo por orden). A la izquierda la bandeja; a la derecha el hilo, con
// archivos, notas de voz y la orden a un toque (2026-10-06). En el teléfono se ve una cosa a la vez.
import { useEffect, useRef, useState } from "react";
import {
    Avatar, Box, Chip, Divider, IconButton, InputAdornment, List, Stack, TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import {
    AddCommentRounded, ArrowBackRounded, CloseRounded, ForumRounded, ReceiptLongRounded, SearchRounded,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { OrderDialog } from "../../components/orders/OrderDialog";
import { ChatPanel } from "../../components/internal-chat/chat/ChatPanel";
import { sendChatMessage } from "../../components/internal-chat/chat/chatFiles";
import { ChatMessage, OutgoingMessage } from "../../components/internal-chat/chat/types";
import { useValidateSession } from "../../hooks/useValidateSession";
import { request } from "../../common/request";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { playNotificationSound } from "../../lib/sound";
import { LeaderViewSelect } from "../my-group/LeaderViewSelect";
import { appendLeaderView, LeaderView, MY_ORDERS } from "../my-group/leaderView";
import { ConversationRow } from "./ConversationRow";
import { colorFor, Conversation, initials, orderLabel, partyLabel } from "./inbox";
import { OrderPickerDialog } from "./OrderPickerDialog";

export const InternalChatPage = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const echo = useSocketStore((s) => s.echo);
    const setSocket = useSocketStore((s) => s.setSocket);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const isAdmin = ["Admin", "Gerente", "Master"].includes(user.role?.description ?? "");
    const isLite = !!user.is_lite_view;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [chatSearch, setChatSearch] = useState("");
    const [onlyUnread, setOnlyUnread] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);

    // La Líder elige ver sus hilos, los de todo su grupo o los de una vendedora (Fran, 2026-10-02)
    const [view, setView] = useState<LeaderView>(MY_ORDERS);
    const viewParams = new URLSearchParams();
    appendLeaderView(viewParams, view);
    const viewQuery = viewParams.toString();
    const viewQueryRef = useRef(viewQuery);
    viewQueryRef.current = viewQuery;

    const selectedRef = useRef<Conversation | null>(null);
    selectedRef.current = selected;

    // Con la vista de ahora (el aviso en vivo la llama desde un efecto que no se vuelve a armar)
    const fetchConversations = async () => {
        const vq = viewQueryRef.current;
        const { ok, response } = await request(`/internal-chat/conversations${vq ? `?${vq}` : ""}`, "GET");
        if (ok) setConversations(await response.json());
    };

    useEffect(() => {
        if (!isValid) return;
        fetchConversations();
        if (!echo) setSocket();
    }, [isValid, view.scope, view.sellerId]);

    // ── Abrir un hilo ──────────────────────────────────────────────
    const openConversation = async (conv: Conversation) => {
        setSelected(conv);
        setMessages([]);
        setLoadingMessages(true);
        const { ok, response } = await request(`/internal-chat/conversations/${conv.id}/messages`, "GET");
        setLoadingMessages(false);
        if (ok) {
            setMessages(await response.json());
            setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
        } else {
            toast.error("No se pudieron cargar los mensajes");
        }
    };

    const openByOrderId = async (orderId: number) => {
        const { ok, response } = await request(`/internal-chat/orders/${orderId}/open`, "POST");
        if (!ok) {
            const err = await response.json().catch(() => ({}));
            toast.error(err.message ?? "No se pudo abrir el chat de la orden");
            return;
        }
        const conv = await response.json();
        await fetchConversations();
        openConversation({ ...conv, vendedor: null, agency: null, last_message: null, last_message_at: null, unread: 0 });
    };

    // Deep-link: /internal-chat?order=123 (botón en la orden)
    useEffect(() => {
        if (!isValid) return;
        const orderId = searchParams.get("order");
        if (orderId) {
            openByOrderId(parseInt(orderId, 10));
            searchParams.delete("order");
            setSearchParams(searchParams, { replace: true });
        }
    }, [isValid]);

    // ── En vivo: el hilo abierto ───────────────────────────────────
    useEffect(() => {
        if (!echo || !selected) return;
        const channelName = `internal-chat.${selected.id}`;
        const channel = echo.private(channelName);
        const onMessage = (e: { message?: ChatMessage & { conversation_id: number } }) => {
            const msg = e?.message;
            if (!msg || selectedRef.current?.id !== msg.conversation_id) return;
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, mine: msg.sender_id === user.id }]));
            if (msg.sender_id !== user.id) {
                playNotificationSound();
                request(`/internal-chat/conversations/${msg.conversation_id}/read`, "POST");
            }
        };
        channel.listen(".App\\Events\\InternalMessageSent", onMessage);
        channel.listen("InternalMessageSent", onMessage);
        return () => { echo.leave(channelName); };
    }, [echo, selected?.id]);

    // ── En vivo: la bandeja (canal personal) ───────────────────────
    useEffect(() => {
        if (!echo || !user.id) return;
        const channelName = `App.Models.User.${user.id}`;
        const channel = echo.private(channelName);
        const onAny = (e: { message?: { conversation_id: number; sender_id: number } }) => {
            const msg = e?.message;
            if (msg && msg.sender_id !== user.id && selectedRef.current?.id !== msg.conversation_id) playNotificationSound();
            fetchConversations();
        };
        channel.listen(".App\\Events\\InternalMessageSent", onAny);
        channel.listen("InternalMessageSent", onAny);
        return () => { echo.leave(channelName); };
    }, [echo, user.id]);

    const send = async (msg: OutgoingMessage, onProgress: (percent: number) => void) => {
        const conv = selectedRef.current;
        if (!conv) return;
        const saved = await sendChatMessage(conv.id, msg, onProgress);
        setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
        fetchConversations();
    };

    // ── Bandeja filtrada ───────────────────────────────────────────
    const q = chatSearch.trim().toLowerCase();
    const unreadTotal = conversations.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0);
    const shown = conversations.filter((c) => {
        if (onlyUnread && c.unread === 0) return false;
        if (!q) return true;
        return [c.order?.name, c.client, c.counterpart?.name, c.vendedor?.name, c.agency?.name].some((v) => (v ?? "").toLowerCase().includes(q));
    });

    if (loadingSession) return <Loading />;
    if (!isValid) return null;

    const showInbox = !isMobile || !selected;
    const showThread = !isMobile || !!selected;
    const selectedParty = selected ? partyLabel(selected, isAdmin) : "";
    const selectedAvatar = selected ? selected.counterpart?.name ?? selected.agency?.name ?? selectedParty : "";

    return (
        <Layout noMargin>
            <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
                {showInbox && (
                    <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0, borderRight: { md: "1px solid" }, borderColor: { md: "divider" }, display: "flex", flexDirection: "column", bgcolor: "background.paper" }}>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                            {isLite && (
                                <Tooltip title="Volver">
                                    <IconButton size="small" onClick={() => navigate("/orders")} aria-label="Volver"><ArrowBackRounded /></IconButton>
                                </Tooltip>
                            )}
                            <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>Chat interno</Typography>
                            {!isAdmin && (
                                <Tooltip title={view.scope ? "Nuevo chat por orden de tu grupo" : "Nuevo chat por orden"}>
                                    <IconButton color="primary" onClick={() => setPickerOpen(true)} aria-label="Nuevo chat por orden"><AddCommentRounded /></IconButton>
                                </Tooltip>
                            )}
                        </Stack>

                        {!isAdmin && user.leader_group && (
                            <Box sx={{ px: 1.5, pb: 1 }}>
                                <LeaderViewSelect value={view} onChange={(v) => { setView(v); setSelected(null); setMessages([]); }} minWidth={0} fullWidth />
                            </Box>
                        )}

                        <Box sx={{ px: 1.5, pb: 1 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Buscar por orden, cliente, agencia…"
                                value={chatSearch}
                                onChange={(e) => setChatSearch(e.target.value)}
                                inputProps={{ "aria-label": "Buscar chats" }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" sx={{ color: "text.disabled" }} /></InputAdornment>,
                                    endAdornment: chatSearch ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setChatSearch("")} edge="end" aria-label="Borrar búsqueda"><CloseRounded fontSize="small" /></IconButton>
                                        </InputAdornment>
                                    ) : undefined,
                                }}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.default" } }}
                            />
                            {!isAdmin && (
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <Chip label="Todos" size="small" color={onlyUnread ? "default" : "primary"} variant={onlyUnread ? "outlined" : "filled"} onClick={() => setOnlyUnread(false)} />
                                    <Chip label={`No leídos${unreadTotal ? ` · ${unreadTotal}` : ""}`} size="small" color={onlyUnread ? "primary" : "default"} variant={onlyUnread ? "filled" : "outlined"} onClick={() => setOnlyUnread(true)} />
                                </Stack>
                            )}
                        </Box>
                        <Divider />

                        <List sx={{ overflowY: "auto", flex: 1, p: 0 }}>
                            {shown.length === 0 && (
                                <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                                    <Typography variant="body2">
                                        {q ? "No se encontraron conversaciones." : onlyUnread ? "No tienes mensajes sin leer." : isAdmin ? "No hay conversaciones." : "Toca + para iniciar un chat por una orden."}
                                    </Typography>
                                </Box>
                            )}
                            {shown.map((c) => (
                                <ConversationRow key={c.id} conversation={c} selected={selected?.id === c.id} isAdmin={isAdmin} userId={user.id} onClick={() => openConversation(c)} />
                            ))}
                        </List>
                    </Box>
                )}

                {showThread && (
                    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
                        {!selected ? (
                            <Box sx={{ m: "auto", textAlign: "center", color: "text.secondary", px: 3 }}>
                                <ForumRounded sx={{ fontSize: 56, opacity: 0.35 }} />
                                <Typography variant="h6" sx={{ mt: 1 }}>Elige una conversación</Typography>
                                <Typography variant="body2">Puedes enviar mensajes, fotos, videos, PDF y notas de voz.</Typography>
                            </Box>
                        ) : (
                            <>
                                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: { xs: 1, sm: 2 }, py: 1.25, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                                    {isMobile && (
                                        <IconButton onClick={() => setSelected(null)} aria-label="Volver a la bandeja"><ArrowBackRounded /></IconButton>
                                    )}
                                    <Avatar sx={{ bgcolor: colorFor(selectedAvatar), fontWeight: 700 }}>{initials(selectedAvatar)}</Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ lineHeight: 1.25 }}>
                                            {orderLabel(selected)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                                            {[selectedParty, selected.client && `Cliente: ${selected.client}`].filter(Boolean).join(" · ")}
                                        </Typography>
                                    </Box>
                                    {selected.order && (
                                        <Tooltip title="Ver la orden">
                                            <IconButton onClick={() => setOrderOpen(true)} aria-label="Ver la orden"><ReceiptLongRounded /></IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>
                                <ChatPanel
                                    key={selected.id}
                                    messages={messages}
                                    loading={loadingMessages}
                                    userId={user.id}
                                    emptyText="Todavía no hay mensajes. Escribe el primero o envía un archivo."
                                    onSend={send}
                                    autoFocus={!isMobile}
                                />
                            </>
                        )}
                    </Box>
                )}
            </Box>

            <OrderPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} viewQuery={viewQuery} onPick={openByOrderId} />
            {orderOpen && selected?.order && <OrderDialog id={selected.order.id} open={orderOpen} setOpen={setOrderOpen} />}
        </Layout>
    );
};
