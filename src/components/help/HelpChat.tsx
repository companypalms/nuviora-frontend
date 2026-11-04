// src/components/help/HelpChat.tsx
// .96 (dueño, 2026-11-03: "un pequeño chat flotante para que él le pueda preguntar a la IA cualquier duda que tenga sobre
// cómo utilizar su rol o el del editor… nada de información que pueda usar si me monta competencia"): el botón "¿Dudas?"
// abajo a la derecha de las pantallas de los editores. Abre un chat corto con preguntas de ejemplo; en la computadora es
// una ventana pequeña al lado de la pantalla y en el celular ocupa toda la pantalla. Lo que se habló hoy queda guardado.
import React, { useEffect, useRef, useState } from "react";
import { Box, ButtonBase, CircularProgress, Dialog, IconButton, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
import { ArrowUpwardRounded, CloseRounded, HelpOutlineRounded } from "@mui/icons-material";
import { useUserStore } from "../../store/user/UserStore";
import { EDITOR_ROLES } from "../meta-ads/editorShared";
import { appear, cardSx, geist, inkSx, lineSx, useTokens } from "../ui/design";
import { TextAction } from "../ui/designParts";
import { HELP_MAX, HELP_SUGGESTIONS, HelpMessage, HelpState, askHelp, fetchHelp, rememberOpen, wasOpen } from "./help";

export const HelpChat: React.FC = () => {
    const role = useUserStore((s) => s.user.role?.description ?? "");
    const isEditor = EDITOR_ROLES.includes(role);
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const t = useTokens();
    const [state, setState] = useState<HelpState | null>(null);
    const [open, setOpen] = useState(() => !phone && wasOpen());

    useEffect(() => {
        if (!isEditor) return;
        fetchHelp().then(setState).catch(() => setState(null));
    }, [isEditor]);

    if (!isEditor || !state || !state.book || (state.mode !== "openai" && state.mode !== "example")) return null;
    const show = (value: boolean) => { setOpen(value); rememberOpen(value && !phone); };

    const panel = <HelpPanel state={state} setState={setState} onClose={() => show(false)} phone={phone} />;
    return (
        <>
            {!open && (
                <ButtonBase
                    onClick={() => show(true)}
                    aria-label="¿Dudas? Abrir la ayuda"
                    sx={{
                        ...geist, ...inkSx(t), ...appear,
                        position: "fixed", zIndex: 1250, right: 16, bottom: "calc(16px + env(safe-area-inset-bottom))",
                        height: { xs: 48, sm: 44 }, px: 2, gap: 1, borderRadius: "999px", fontSize: 15, fontWeight: 600,
                        boxShadow: "0 6px 20px rgba(20,23,28,0.22)",
                    }}
                >
                    <HelpOutlineRounded sx={{ fontSize: 20 }} />
                    ¿Dudas?
                </ButtonBase>
            )}
            {phone ? (
                <Dialog open={open} onClose={() => show(false)} fullScreen aria-label="Ayuda ¿Dudas?">{panel}</Dialog>
            ) : open && (
                <Box
                    role="dialog"
                    aria-label="Ayuda ¿Dudas?"
                    sx={{
                        ...cardSx(t), ...appear, position: "fixed", zIndex: 1250, right: 16, bottom: 16, width: 380,
                        height: "min(600px, calc(100vh - 32px))", display: "flex", flexDirection: "column", overflow: "hidden",
                        boxShadow: "0 12px 40px rgba(20,23,28,0.22)",
                    }}
                >
                    {panel}
                </Box>
            )}
        </>
    );
};

const HelpPanel: React.FC<{ state: HelpState; setState: (s: HelpState) => void; onClose: () => void; phone: boolean }> = ({ state, setState, onClose, phone }) => {
    const t = useTokens();
    const [text, setText] = useState("");
    const [pending, setPending] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const bottom = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const leader = state.book === "lider";

    useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [state.messages.length, pending]);
    useEffect(() => { if (!phone) input.current?.focus(); }, [phone]);

    const send = async (question: string, retryOf?: number) => {
        const q = question.trim();
        if (!q || pending || state.left === 0) return;
        setPending(q);
        setError(null);
        setText("");
        try {
            const r = await askHelp(q);
            const kept = retryOf ? state.messages.filter((m) => m.id !== retryOf) : state.messages;
            setState({ ...state, messages: [...kept, r.message], left: r.left });
        } catch (e) {
            setError((e as Error).message);
            if (!retryOf) setText(q);
        } finally {
            setPending(null);
        }
    };

    const empty = state.messages.length === 0 && !pending;
    return (
        <Box sx={{ ...geist, display: "flex", flexDirection: "column", height: "100%", bgcolor: t.card, color: t.ink }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: 2, pt: 1.5, pb: 1.25, borderBottom: `1px solid ${t.line}` }}>
                <HelpOutlineRounded sx={{ fontSize: 22, mt: 0.25 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>¿Dudas?</Typography>
                    <Typography sx={{ fontSize: 13, color: t.muted }}>
                        {leader ? "Te explico cómo usar tus pantallas y las de los editores." : "Te explico cómo usar tus pantallas."}
                    </Typography>
                    {state.mode === "example" && (
                        <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.25 }}>PC de pruebas: respuestas de ejemplo, sin IA.</Typography>
                    )}
                </Box>
                <IconButton aria-label="Cerrar la ayuda" onClick={onClose} sx={{ mr: -1, mt: -0.5 }}><CloseRounded /></IconButton>
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
                {empty && (
                    <Box sx={appear}>
                        <Typography sx={{ fontSize: 14.5, mb: 1.25 }}>Pregúntame cómo hacer algo en el sistema. Por ejemplo:</Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {HELP_SUGGESTIONS[state.book ?? "editor"].map((s) => (
                                <ButtonBase key={s} onClick={() => send(s)} disabled={state.left === 0}
                                    sx={{ ...lineSx(t), border: `1px solid ${t.line}`, justifyContent: "flex-start", textAlign: "left", px: 1.5, minHeight: 44, fontSize: 14.5 }}>
                                    {s}
                                </ButtonBase>
                            ))}
                        </Box>
                        <Typography sx={{ fontSize: 12.5, color: t.faint, mt: 1.5 }}>
                            Solo sé cómo usar {leader ? "estas pantallas" : "tus pantallas"}. Lo demás, pregúntale {leader ? "al dueño" : "al editor líder"}.
                        </Typography>
                    </Box>
                )}
                {state.messages.map((m) => (
                    <Exchange key={m.id} m={m} onRetry={() => send(m.question, m.id)} busy={!!pending} />
                ))}
                {pending && (
                    <>
                        <Question text={pending} />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: t.muted, fontSize: 14 }} aria-live="polite">
                            <CircularProgress size={14} sx={{ color: t.muted }} /> Pensando…
                        </Box>
                    </>
                )}
                <div ref={bottom} />
            </Box>

            <Box sx={{ px: 2, pt: 1, pb: "calc(12px + env(safe-area-inset-bottom))", borderTop: `1px solid ${t.line}` }}>
                {error && <Typography role="alert" sx={{ fontSize: 13, color: t.red, mb: 0.75 }}>{error}</Typography>}
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                    <TextField
                        inputRef={input}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
                        placeholder={state.left === 0 ? "Mañana puedes preguntar de nuevo" : "Escribe tu duda…"}
                        disabled={state.left === 0}
                        multiline
                        maxRows={4}
                        fullWidth
                        size="small"
                        inputProps={{ maxLength: HELP_MAX, "aria-label": "Tu duda" }}
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontSize: 15 } }}
                    />
                    <IconButton aria-label="Enviar" onClick={() => send(text)} disabled={!text.trim() || !!pending || state.left === 0}
                        sx={{ ...inkSx(t), px: 0, width: 40, height: 40, flexShrink: 0, "&.Mui-disabled": { bgcolor: t.soft, color: t.faint } }}>
                        <ArrowUpwardRounded />
                    </IconButton>
                </Box>
                {/* .99: el líder no tiene tope (limit null) */}
                {state.limit !== null && (
                    <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.75 }}>
                        {state.left === 0
                            ? `Ya usaste tus ${state.limit} preguntas de hoy. Mañana tienes ${state.limit} más.`
                            : `Te quedan ${state.left} de ${state.limit} preguntas hoy.`}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

const Question: React.FC<{ text: string }> = ({ text }) => {
    const t = useTokens();
    return (
        <Box sx={{ alignSelf: "flex-end", maxWidth: "85%", bgcolor: t.soft, borderRadius: "10px", px: 1.5, py: 1, fontSize: 14.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {text}
        </Box>
    );
};

const Exchange: React.FC<{ m: HelpMessage; onRetry: () => void; busy: boolean }> = ({ m, onRetry, busy }) => {
    const t = useTokens();
    return (
        <>
            <Question text={m.question} />
            {m.failed ? (
                <Typography sx={{ fontSize: 14, color: t.red }}>
                    No pude responder ahora. {!busy && <TextAction onClick={onRetry} sx={{ color: t.ink, textDecoration: "underline" }}>Intentar de nuevo</TextAction>}
                </Typography>
            ) : (
                <Typography sx={{ fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.answer}</Typography>
            )}
        </>
    );
};
