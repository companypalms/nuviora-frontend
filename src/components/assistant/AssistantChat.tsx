// src/components/assistant/AssistantChat.tsx
// El chat del asistente, abajo del Dashboard del Admin (Etapa 4). Un solo chat: se escribe una pregunta (con fotos, PDF
// o Excel, o dictada con el micrófono), el servidor la guarda y arma la respuesta aparte; aquí se pide cada poco hasta
// que llega, mostrando qué está revisando. Por ahora solo consulta: no cambia nada del sistema.
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack,
    Tooltip, Typography,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { Panel } from "../ui/surface/Panel";
import { AssistantComposer, AssistantComposerHandle } from "./AssistantComposer";
import { MessageView } from "./MessageView";
import { ChatState, SUGGESTIONS, clearChat, fetchChat, fetchMessage, newClientId, sendQuestion } from "./assistant";

/** Cada cuánto se pregunta si la respuesta ya llegó. */
const POLL_MS = 1500;

const Welcome: FC<{ example: boolean; onAsk: (q: string) => void }> = ({ example, onAsk }) => (
    <Stack spacing={1.5} sx={{ py: 2 }}>
        <Typography color="text.secondary">
            Pregúntame lo que quieras de tu negocio: cuánto vendiste, tu ganancia, la efectividad de una vendedora o de una
            agencia, el ranking del equipo, tus metas o lo que tienes pendiente hoy. También puedes mandarme fotos (una factura,
            un comprobante), PDF o Excel, o hablarme con el micrófono.
        </Typography>
        {example && (
            <Alert severity="info" variant="outlined" sx={{ py: 0.25 }}>
                En esta PC funciono en <b>modo ejemplo</b>: entiendo frases simples y te muestro los datos de prueba tal cual. Con la IA
                conectada (en el sistema real) te los explico en palabras.
            </Alert>
        )}
        <Stack direction="row" gap={1} flexWrap="wrap">
            {SUGGESTIONS.map((s) => <Chip key={s} label={s} variant="outlined" onClick={() => onAsk(s)} sx={{ maxWidth: "100%" }} />)}
        </Stack>
    </Stack>
);

export const AssistantChat: FC = () => {
    const [state, setState] = useState<ChatState | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [dragging, setDragging] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<AssistantComposerHandle>(null);

    useEffect(() => {
        let alive = true;
        fetchChat().then((s) => { if (alive) setState(s); }).catch((e) => { if (alive) setLoadError(e.message); });
        return () => { alive = false; };
    }, []);

    // La respuesta que se está armando: se pide cada poco hasta que termina
    const thinkingId = state?.messages.find((m) => m.role === "assistant" && m.status === "thinking")?.id;
    useEffect(() => {
        if (!thinkingId) return;
        let alive = true;
        const timer = window.setInterval(() => {
            fetchMessage(thinkingId)
                .then((m) => { if (alive) setState((s) => s && { ...s, messages: s.messages.map((x) => (x.id === m.id ? m : x)) }); })
                .catch(() => undefined);
        }, POLL_MS);
        return () => { alive = false; window.clearInterval(timer); };
    }, [thinkingId]);

    // Siempre se ve lo último
    const count = state?.messages.length ?? 0;
    const lastProgress = state?.messages[count - 1]?.progress;
    const lastStatus = state?.messages[count - 1]?.status;
    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [count, lastProgress, lastStatus]);

    const send = useCallback(async (text: string, files: File[] = [], onProgress?: (percent: number) => void) => {
        const q = text.trim();
        if ((!q && files.length === 0) || sending || thinkingId) return false;
        setSending(true);
        setError(null);
        try {
            const r = await sendQuestion(q, newClientId(), files, onProgress);
            setState((s) => s && {
                ...s,
                today: r.today,
                messages: [...s.messages.filter((m) => m.id !== r.question.id && m.id !== r.reply.id), r.question, r.reply],
            });
            return true;
        } catch (e) {
            setError((e as Error).message);
            return false;
        } finally {
            setSending(false);
        }
    }, [sending, thinkingId]);

    // Arrastrar archivos sobre el chat los adjunta
    const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
    const dropProps = {
        onDragOver: (e: React.DragEvent) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            setDragging(true);
        },
        onDragLeave: (e: React.DragEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (e: React.DragEvent) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            setDragging(false);
            composerRef.current?.addFiles(e.dataTransfer.files);
        },
    };

    const clear = async () => {
        setConfirmClear(false);
        try {
            await clearChat();
            setState((s) => s && { ...s, messages: [] });
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const available = state?.mode === "openai" || state?.mode === "example";

    return (
        <Panel sx={{ p: 0, display: "flex", flexDirection: "column", height: { xs: "78vh", md: 620 }, minHeight: 420, position: "relative" }} {...(available ? dropProps : {})}>
            {dragging && (
                <Stack
                    alignItems="center"
                    justifyContent="center"
                    gap={1}
                    sx={{ position: "absolute", inset: 8, zIndex: 2, pointerEvents: "none", border: 2, borderStyle: "dashed", borderColor: "primary.main", borderRadius: 2, bgcolor: "background.paper", opacity: 0.95 }}
                >
                    <UploadFileRoundedIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography fontWeight={700}>Suelta aquí tus fotos, PDF o Excel</Typography>
                </Stack>
            )}
            <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                <AutoAwesomeRoundedIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="subtitle1" component="h2" fontWeight={800} noWrap>Tu asistente</Typography>
                {state?.mode === "example" && <Chip size="small" color="warning" variant="outlined" label="Modo ejemplo" />}
                <Box sx={{ flex: 1 }} />
                {state && (
                    <Tooltip title={`Puedes hacer hasta ${state.limit} preguntas por día`}>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", display: { xs: "none", sm: "block" } }}>{state.today}/{state.limit} hoy</Typography>
                    </Tooltip>
                )}
                <IconButton size="small" aria-label="Opciones del chat" onClick={(e) => setMenu(e.currentTarget)} sx={{ flexShrink: 0 }}><MoreVertRoundedIcon fontSize="small" /></IconButton>
                <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                    <MenuItem disabled={!count} onClick={() => { setMenu(null); setConfirmClear(true); }}>Limpiar chat</MenuItem>
                    {state && <MenuItem disabled>Preguntas de hoy: {state.today} de {state.limit}</MenuItem>}
                </Menu>
            </Stack>

            <Box ref={listRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
                {!state && !loadError && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={24} /></Box>}
                {loadError && <Alert severity="error">{loadError}</Alert>}
                {state && count === 0 && <Welcome example={state.mode === "example"} onAsk={send} />}
                <Stack spacing={1.5}>
                    {state?.messages.map((m) => <MessageView key={m.id} message={m} />)}
                </Stack>
            </Box>

            {state && !available && (
                <Alert severity="info" sx={{ m: 1.5 }}>
                    {state.mode === "off" ? "El asistente está apagado." : "La IA no está configurada en este servidor (falta la clave de OpenAI)."}
                </Alert>
            )}
            {state && available && (
                <>
                    {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mx: 1.5, mb: 1, py: 0 }}>{error}</Alert>}
                    <AssistantComposer ref={composerRef} onSend={send} busy={sending || !!thinkingId} />
                </>
            )}

            <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
                <DialogTitle>¿Limpiar el chat?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">Se borra la conversación de la pantalla y el asistente empieza de cero.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClear(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={clear}>Limpiar</Button>
                </DialogActions>
            </Dialog>
        </Panel>
    );
};

export default AssistantChat;
