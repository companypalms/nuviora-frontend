// src/components/assistant/AssistantChat.tsx
// El chat del asistente, abajo del Dashboard del Admin (Etapa 4, paso 2). Un solo chat: se escribe una pregunta, el
// servidor la guarda y arma la respuesta aparte; aquí se pide cada poco hasta que llega, mostrando qué está revisando.
// En este paso solo consulta (ventas, dinero, equipo, metas, alertas, calendario): no cambia nada del sistema.
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, TextField,
    Tooltip, Typography,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Panel } from "../ui/surface/Panel";
import { MessageView } from "./MessageView";
import { ChatState, SUGGESTIONS, clearChat, fetchChat, fetchMessage, newClientId, sendQuestion } from "./assistant";

/** Cada cuánto se pregunta si la respuesta ya llegó. */
const POLL_MS = 1500;

const Welcome: FC<{ example: boolean; onAsk: (q: string) => void }> = ({ example, onAsk }) => (
    <Stack spacing={1.5} sx={{ py: 2 }}>
        <Typography color="text.secondary">
            Pregúntame lo que quieras de tu negocio: cuánto vendiste, tu ganancia, la efectividad de una vendedora o de una
            agencia, el ranking del equipo, tus metas o lo que tienes pendiente hoy.
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
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

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

    const send = useCallback(async (text: string) => {
        const q = text.trim();
        if (!q || sending || thinkingId) return;
        setSending(true);
        setError(null);
        try {
            const r = await sendQuestion(q, newClientId());
            setInput("");
            setState((s) => s && {
                ...s,
                today: r.today,
                messages: [...s.messages.filter((m) => m.id !== r.question.id && m.id !== r.reply.id), r.question, r.reply],
            });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSending(false);
        }
    }, [sending, thinkingId]);

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
        <Panel sx={{ p: 0, display: "flex", flexDirection: "column", height: { xs: "78vh", md: 620 }, minHeight: 420 }}>
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
                <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>
                    {error && <Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 1, py: 0 }}>{error}</Alert>}
                    <Stack direction="row" gap={1} alignItems="flex-end">
                        <TextField
                            fullWidth
                            multiline
                            maxRows={6}
                            size="small"
                            placeholder="Pregúntale lo que quieras de tu negocio…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    send(input);
                                }
                            }}
                            slotProps={{ htmlInput: { "aria-label": "Mensaje para el asistente", maxLength: 4000 } }}
                        />
                        <IconButton color="primary" aria-label="Enviar" onClick={() => send(input)} disabled={!input.trim() || sending || !!thinkingId}>
                            {sending ? <CircularProgress size={20} /> : <SendRoundedIcon />}
                        </IconButton>
                    </Stack>
                    <Typography variant="caption" color="text.disabled" sx={{ display: { xs: "none", sm: "block" }, mt: 0.5 }}>
                        Enter envía · Shift + Enter baja de línea
                    </Typography>
                </Box>
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
