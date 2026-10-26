import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { request } from "../../common/request";
import { useUserStore } from "../../store/user/UserStore";

type GateConversation = {
    conversation_id: number;
    order: { id: number; name: string } | null;
    client: string | null;
    counterpart: { id: number; name: string } | null;
    last_message: { body: string; sender_id: number; created_at: string } | null;
    last_message_at: string | null;
};

type GateStatus = {
    blocked: boolean;
    pending_count: number;
    threshold: number;
    conversations: GateConversation[];
};

const POLL_MS = 15000;

/**
 * Candado del chat interno para agencias.
 *
 * Si la agencia acumula `threshold` (5) conversaciones cuyo último mensaje no es
 * suyo, se muestra un modal a pantalla completa que NO se puede cerrar hasta
 * responder TODAS. El backend además devuelve 423 en el resto de endpoints, así
 * que esto es la cara visible de un bloqueo real, no solo cosmético.
 *
 * Se oculta en /internal-chat para no tapar el chat completo.
 */
export const AgencyChatGateModal = () => {
    const user = useUserStore((s) => s.user);
    const location = useLocation();

    const isAgency = user?.role?.description === "Agencia";

    const [status, setStatus] = useState<GateStatus | null>(null);
    const [replies, setReplies] = useState<Record<number, string>>({});
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // "Pegajoso": una vez que se dispara, no se suelta hasta dejar 0 pendientes.
    const engagedRef = useRef(false);

    const fetchStatus = useCallback(async () => {
        const { ok, response } = await request("/internal-chat/gate-status", "GET");
        if (!ok) return;
        const json: GateStatus = await response.json();

        if (json.blocked) engagedRef.current = true;
        if (json.pending_count === 0) engagedRef.current = false;

        setStatus(json);
    }, []);

    useEffect(() => {
        if (!isAgency || !user?.token) return;
        fetchStatus();
        const id = setInterval(fetchStatus, POLL_MS);
        return () => clearInterval(id);
    }, [isAgency, user?.token, fetchStatus]);

    const sendReply = async (conversationId: number) => {
        const body = (replies[conversationId] ?? "").trim();
        if (!body) return;

        setSendingId(conversationId);
        setError(null);

        const { ok } = await request(
            `/internal-chat/conversations/${conversationId}/messages`,
            "POST",
            { body }
        );

        setSendingId(null);

        if (!ok) {
            setError("No se pudo enviar el mensaje. Intenta de nuevo.");
            return;
        }

        setReplies((r) => {
            const next = { ...r };
            delete next[conversationId];
            return next;
        });
        await fetchStatus();
    };

    if (!isAgency) return null;
    if (location.pathname === "/internal-chat") return null;

    const open =
        !!status &&
        (status.blocked || engagedRef.current) &&
        status.conversations.length > 0;

    if (!open || !status) return null;

    return (
        <Dialog
            open
            fullWidth
            maxWidth="sm"
            disableEscapeKeyDown
            onClose={() => { /* no se puede cerrar manualmente */ }}
            scroll="paper"
        >
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LockRoundedIcon color="error" />
                <Box>
                    <Typography variant="h6" component="div" sx={{ lineHeight: 1.2 }}>
                        Chat interno bloqueado
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Tienes {status.pending_count} conversación(es) sin responder.
                        Respóndelas todas para seguir usando el sistema.
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Stack divider={<Divider flexItem />} spacing={2}>
                    {status.conversations.map((c) => (
                        <Box key={c.conversation_id}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="baseline"
                                sx={{ mb: 0.5 }}
                            >
                                <Typography variant="subtitle2">
                                    Orden {c.order?.name ?? "—"}
                                    {c.client ? ` · ${c.client}` : ""}
                                </Typography>
                                {c.counterpart && (
                                    <Typography variant="caption" color="text.secondary">
                                        {c.counterpart.name}
                                    </Typography>
                                )}
                            </Stack>

                            {c.last_message && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                        bgcolor: "action.hover",
                                        borderRadius: 1,
                                        px: 1.5,
                                        py: 1,
                                        mb: 1,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {c.last_message.body}
                                </Typography>
                            )}

                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <TextField
                                    fullWidth
                                    size="small"
                                    multiline
                                    maxRows={4}
                                    placeholder="Escribe tu respuesta…"
                                    value={replies[c.conversation_id] ?? ""}
                                    onChange={(e) =>
                                        setReplies((r) => ({
                                            ...r,
                                            [c.conversation_id]: e.target.value,
                                        }))
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            sendReply(c.conversation_id);
                                        }
                                    }}
                                    disabled={sendingId === c.conversation_id}
                                />
                                <Button
                                    variant="contained"
                                    onClick={() => sendReply(c.conversation_id)}
                                    disabled={
                                        sendingId === c.conversation_id ||
                                        !(replies[c.conversation_id] ?? "").trim()
                                    }
                                    sx={{ minWidth: 44, px: 1.5, mt: 0.25 }}
                                >
                                    {sendingId === c.conversation_id ? (
                                        <CircularProgress size={18} color="inherit" />
                                    ) : (
                                        <SendRoundedIcon fontSize="small" />
                                    )}
                                </Button>
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </DialogContent>
        </Dialog>
    );
};
