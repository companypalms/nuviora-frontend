// src/components/orders/OrderInternalChat.tsx
// El chat interno de la orden (vendedora ↔ agencia), dentro de la ficha (Fran, 2026-10-02). Lo ven la
// vendedora y la agencia de la orden, la Líder de esa vendedora y el Admin. El hilo se crea con el primer
// mensaje (GET /internal-chat/orders/{id} no crea nada). Desde 2026-10-06 se pueden enviar archivos.
import { FC, useEffect, useRef, useState } from "react";
import { Box, Dialog, DialogTitle, IconButton, Tooltip, Typography } from "@mui/material";
import { CloseRounded, OpenInNewRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { useUserStore } from "../../store/user/UserStore";
import { ChatPanel } from "../internal-chat/chat/ChatPanel";
import { sendChatMessage } from "../internal-chat/chat/chatFiles";
import { ChatMessage, ChatParty, OutgoingMessage } from "../internal-chat/chat/types";

interface Thread {
    conversation_id: number | null;
    counterpart: ChatParty | null;
    messages: ChatMessage[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    orderId: number;
    orderName: string;
}

export const OrderInternalChat: FC<Props> = ({ open, onClose, orderId, orderName }) => {
    const user = useUserStore((s) => s.user);
    const echo = useSocketStore((s) => s.echo);
    const setSocket = useSocketStore((s) => s.setSocket);
    const [thread, setThread] = useState<Thread | null>(null);
    const [loading, setLoading] = useState(false);
    const threadRef = useRef(thread);
    threadRef.current = thread;

    useEffect(() => {
        if (!open) return;
        if (!echo) setSocket();
        setLoading(true);
        setThread(null);
        request(`/internal-chat/orders/${orderId}`, "GET")
            .then(async ({ status, response }) => {
                const data = await response.json().catch(() => ({}));
                if (status >= 200 && status < 300) setThread(data);
                else toast.error(data.message ?? "No se pudo abrir el chat de la orden");
            })
            .finally(() => setLoading(false));
    }, [open, orderId]);

    const append = (msg: ChatMessage, conversationId: number) =>
        setThread((prev) => prev && {
            ...prev,
            conversation_id: conversationId,
            messages: prev.messages.some((m) => m.id === msg.id) ? prev.messages : [...prev.messages, msg],
        });

    // En vivo: los mensajes nuevos del hilo
    const conversationId = thread?.conversation_id ?? null;
    useEffect(() => {
        if (!open || !echo || !conversationId) return;
        const name = `internal-chat.${conversationId}`;
        const channel = echo.private(name);
        const onMessage = (e: { message?: ChatMessage & { conversation_id: number } }) => {
            const msg = e?.message;
            if (!msg || msg.conversation_id !== conversationId) return;
            append({ ...msg, mine: msg.sender_id === user.id }, conversationId);
            if (msg.sender_id !== user.id) request(`/internal-chat/conversations/${conversationId}/read`, "POST");
        };
        channel.listen(".App\\Events\\InternalMessageSent", onMessage);
        channel.listen("InternalMessageSent", onMessage);
        return () => { echo.leave(name); };
    }, [open, echo, conversationId]);

    const send = async (msg: OutgoingMessage, onProgress: (percent: number) => void) => {
        let id = threadRef.current?.conversation_id ?? null;
        if (!id) {
            const opened = await request(`/internal-chat/orders/${orderId}/open`, "POST");
            const data = await opened.response.json().catch(() => ({}));
            if (opened.status < 200 || opened.status >= 300) throw new Error(data.message ?? "No se pudo abrir el chat de la orden");
            id = data.id as number;
        }
        const saved = await sendChatMessage(id, msg, onProgress);
        append(saved, id);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{ sx: { height: { xs: "100%", sm: "85vh" }, m: { xs: 0, sm: 2 }, maxHeight: { xs: "100%", sm: "85vh" }, borderRadius: { xs: 0, sm: 3 } } }}
        >
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>Chat interno · Orden {orderName}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {thread?.counterpart?.name ? `Con ${thread.counterpart.name}` : "Vendedora y agencia de la orden"}
                    </Typography>
                </Box>
                <Tooltip title="Abrir en la pantalla de chats">
                    <IconButton size="small" aria-label="Abrir en la pantalla de chats" onClick={() => window.open(`/internal-chat?order=${orderId}`, "_blank")}>
                        <OpenInNewRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={onClose} aria-label="Cerrar"><CloseRounded /></IconButton>
            </DialogTitle>
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
                <ChatPanel
                    key={orderId}
                    messages={thread?.messages ?? []}
                    loading={loading}
                    userId={user.id}
                    emptyText="Todavía no hay mensajes. Escribe el primero o envía un archivo."
                    onSend={send}
                    disabled={!thread}
                    autoFocus
                />
            </Box>
        </Dialog>
    );
};
