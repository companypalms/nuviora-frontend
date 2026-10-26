// Donde se escribe en el chat interno: texto, archivos (botón, pegar o arrastrar sobre el hilo), emojis y notas
// de voz. Enter envía; Shift+Enter hace un salto de línea.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, Button, CircularProgress, IconButton, Popover, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { AttachFileRounded, EmojiEmotionsRounded, MicRounded, SendRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { CHAT_ACCEPT, CHAT_MAX_FILES, chatFileProblem, isPreviewableImage } from "./chatFiles";
import { PendingFile, PendingFiles } from "./PendingFiles";
import { OutgoingMessage } from "./types";
import { useVoiceRecorder } from "./useVoiceRecorder";

const EMOJIS = ["👍", "🙏", "✅", "❌", "⚠️", "👌", "😊", "😂", "🙌", "💪", "🔥", "⏰", "📦", "🚚", "🏍️", "📍", "💵", "💰", "📞", "👋", "🤝", "😅", "🤔", "❤️"];

export interface ChatComposerHandle {
    addFiles: (files: FileList | File[]) => void;
}

interface Props {
    /** Envía un mensaje; si falla, lanza un Error con el motivo. */
    onSend: (msg: OutgoingMessage, onProgress: (percent: number) => void) => Promise<void>;
    disabled?: boolean;
    autoFocus?: boolean;
}

let nextId = 0;

export const ChatComposer = forwardRef<ChatComposerHandle, Props>(({ onSend, disabled, autoFocus }, ref) => {
    const [text, setText] = useState("");
    const [pending, setPending] = useState<PendingFile[]>([]);
    const [sending, setSending] = useState(false);
    const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const pendingRef = useRef(pending);
    pendingRef.current = pending;

    const addFiles = (list: FileList | File[]) => {
        const files = Array.from(list);
        const room = CHAT_MAX_FILES - pendingRef.current.length;
        if (files.length > room) toast.warning(`Se pueden enviar hasta ${CHAT_MAX_FILES} archivos a la vez.`);
        const accepted: PendingFile[] = [];
        for (const file of files.slice(0, Math.max(0, room))) {
            const problem = chatFileProblem(file);
            if (problem) {
                toast.error(problem);
                continue;
            }
            accepted.push({ id: `f${++nextId}`, file, preview: isPreviewableImage(file) ? URL.createObjectURL(file) : undefined });
        }
        if (accepted.length) setPending((prev) => [...prev, ...accepted]);
        inputRef.current?.focus();
    };
    useImperativeHandle(ref, () => ({ addFiles }));

    const removePending = (id: string) => {
        setPending((prev) => {
            const item = prev.find((p) => p.id === id);
            if (item?.preview) URL.revokeObjectURL(item.preview);
            return prev.filter((p) => p.id !== id);
        });
    };
    // Al cerrar el chat se sueltan las miniaturas
    useEffect(() => () => pendingRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), []);

    const setProgress = (id: string, progress: number) => setPending((prev) => prev.map((p) => (p.id === id ? { ...p, progress } : p)));

    const send = async () => {
        const body = text.trim();
        const files = pendingRef.current;
        if (sending || disabled || (!body && files.length === 0)) return;
        setSending(true);
        try {
            if (files.length === 0) {
                await onSend({ body }, () => {});
                setText("");
            } else {
                let caption = body;
                for (const item of files) {
                    setProgress(item.id, 0);
                    await onSend({ body: caption, file: item.file }, (p) => setProgress(item.id, p));
                    removePending(item.id);
                    if (caption) {
                        caption = "";
                        setText("");
                    }
                }
            }
        } catch (e) {
            setPending((prev) => prev.map((p) => ({ ...p, progress: undefined })));
            toast.error(e instanceof Error ? e.message : "No se pudo enviar");
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const voice = useVoiceRecorder(async (file) => {
        setSending(true);
        try {
            await onSend({ body: "", file, voice: true }, () => {});
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo enviar la nota de voz");
        } finally {
            setSending(false);
        }
    });

    const startVoice = async () => {
        try {
            await voice.start();
        } catch {
            toast.error("No se pudo usar el micrófono. Revisa el permiso del navegador.");
        }
    };

    const insertEmoji = (emoji: string) => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? text.length;
        const end = el?.selectionEnd ?? text.length;
        setText(text.slice(0, start) + emoji + text.slice(end));
        setEmojiAnchor(null);
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(start + emoji.length, start + emoji.length);
        });
    };

    const canSend = !!text.trim() || pending.length > 0;
    const roundButton = { width: 40, height: 40, flexShrink: 0 };

    if (voice.recording) {
        const mm = Math.floor(voice.seconds / 60);
        const ss = String(voice.seconds % 60).padStart(2, "0");
        return (
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1.25 }} role="status">
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "error.main", animation: "blink 1s infinite", "@keyframes blink": { "50%": { opacity: 0.2 } } }} />
                <Typography fontWeight={700} color="error.main" sx={{ fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Grabando nota de voz…</Typography>
                <Button color="inherit" onClick={() => voice.stop(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
                <Button variant="contained" onClick={() => voice.stop(true)} endIcon={<SendRounded />} sx={{ textTransform: "none" }}>Enviar</Button>
            </Stack>
        );
    }

    return (
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: { xs: 1, sm: 1.5 }, py: 1 }}>
            {pending.length > 0 && <PendingFiles items={pending} sending={sending} onRemove={removePending} />}
            <Stack direction="row" alignItems="flex-end" spacing={0.5}>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    hidden
                    accept={CHAT_ACCEPT}
                    onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = "";
                    }}
                />
                <Tooltip title="Adjuntar fotos, videos o documentos (hasta 50 MB)">
                    <span>
                        <IconButton onClick={() => fileRef.current?.click()} disabled={disabled || sending} aria-label="Adjuntar archivo" sx={roundButton}>
                            <AttachFileRounded />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Emojis">
                    <span>
                        <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)} disabled={disabled} aria-label="Emojis" sx={{ ...roundButton, display: { xs: "none", sm: "inline-flex" } }}>
                            <EmojiEmotionsRounded />
                        </IconButton>
                    </span>
                </Tooltip>
                <Popover
                    open={!!emojiAnchor}
                    anchorEl={emojiAnchor}
                    onClose={() => setEmojiAnchor(null)}
                    anchorOrigin={{ vertical: "top", horizontal: "left" }}
                    transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                >
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 36px)", gap: 0.25, p: 1 }}>
                        {EMOJIS.map((em) => (
                            <IconButton key={em} onClick={() => insertEmoji(em)} aria-label={`Insertar ${em}`} sx={{ fontSize: "1.25rem", width: 36, height: 36 }}>
                                {em}
                            </IconButton>
                        ))}
                    </Box>
                </Popover>
                <TextField
                    inputRef={inputRef}
                    fullWidth
                    multiline
                    maxRows={5}
                    size="small"
                    autoFocus={autoFocus}
                    disabled={disabled}
                    placeholder={pending.length ? "Agrega un comentario (opcional)…" : "Escribe un mensaje…"}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    onPaste={(e) => {
                        // Pegar una captura de pantalla la adjunta
                        if (e.clipboardData.files.length) {
                            e.preventDefault();
                            addFiles(e.clipboardData.files);
                        }
                    }}
                    inputProps={{ "aria-label": "Mensaje" }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5, bgcolor: "background.default" } }}
                />
                {canSend || !voice.supported ? (
                    <IconButton
                        onClick={send}
                        disabled={disabled || sending || !canSend}
                        aria-label="Enviar"
                        sx={{ ...roundButton, bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "action.disabledBackground" } }}
                    >
                        {sending ? <CircularProgress size={20} color="inherit" /> : <SendRounded fontSize="small" />}
                    </IconButton>
                ) : (
                    <Tooltip title="Grabar nota de voz">
                        <span>
                            <IconButton onClick={startVoice} disabled={disabled || sending} aria-label="Grabar nota de voz" sx={{ ...roundButton, bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } }}>
                                {sending ? <CircularProgress size={20} color="inherit" /> : <MicRounded fontSize="small" />}
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
            </Stack>
        </Box>
    );
});

ChatComposer.displayName = "ChatComposer";
