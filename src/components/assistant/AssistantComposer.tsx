// src/components/assistant/AssistantComposer.tsx
// Donde el dueño le escribe al asistente (Etapa 4, paso 4): texto, archivos (el clip, pegar una captura o arrastrarlos
// sobre el chat) y el micrófono. Lo que dice al micrófono se escribe en la caja: lo revisa y lo envía él.
// Reutiliza del chat interno la vista de los archivos por enviar y la grabadora.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, Button, CircularProgress, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { toast } from "react-toastify";
import { PendingFile, PendingFiles } from "../internal-chat/chat/PendingFiles";
import { useVoiceRecorder } from "../internal-chat/chat/useVoiceRecorder";
import { FILE_ACCEPT, FILES_MAX, fileKind, fileProblem, totalProblem, transcribe } from "./assistant";

export interface AssistantComposerHandle {
    addFiles: (files: FileList | File[]) => void;
}

interface Props {
    /** Envía la pregunta; true si salió bien (se vacía la caja). */
    onSend: (text: string, files: File[], onProgress: (percent: number) => void) => Promise<boolean>;
    /** Mientras el asistente contesta no se puede mandar otra pregunta (sí escribirla). */
    busy: boolean;
}

let nextId = 0;

export const AssistantComposer = forwardRef<AssistantComposerHandle, Props>(({ onSend, busy }, ref) => {
    const [text, setText] = useState("");
    const [pending, setPending] = useState<PendingFile[]>([]);
    const [sending, setSending] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const pendingRef = useRef(pending);
    pendingRef.current = pending;

    const addFiles = (list: FileList | File[]) => {
        const files = Array.from(list);
        const room = FILES_MAX - pendingRef.current.length;
        if (files.length > room) toast.warning(`Puedes mandar hasta ${FILES_MAX} archivos por mensaje.`);
        const accepted: PendingFile[] = [];
        for (const file of files.slice(0, Math.max(0, room))) {
            const problem = fileProblem(file) ?? totalProblem([...pendingRef.current.map((p) => p.file), ...accepted.map((p) => p.file), file]);
            if (problem) {
                toast.error(problem);
                continue;
            }
            accepted.push({ id: `a${++nextId}`, file, preview: fileKind(file) === "image" ? URL.createObjectURL(file) : undefined });
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
    // Al salir del Dashboard se sueltan las miniaturas
    useEffect(() => () => pendingRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), []);

    const send = async () => {
        const body = text.trim();
        const items = pendingRef.current;
        if (sending || busy || transcribing || (!body && items.length === 0)) return;
        setSending(true);
        const setProgress = (progress: number) => setPending((prev) => prev.map((p) => ({ ...p, progress })));
        if (items.length) setProgress(0);
        const ok = await onSend(body, items.map((p) => p.file), setProgress);
        if (ok) {
            setText("");
            items.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
            setPending([]);
        } else {
            setPending((prev) => prev.map((p) => ({ ...p, progress: undefined })));
        }
        setSending(false);
        inputRef.current?.focus();
    };

    // El micrófono: al terminar, lo que dijo se agrega a la caja
    const voice = useVoiceRecorder(async (audio) => {
        setTranscribing(true);
        try {
            const r = await transcribe(audio);
            setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${r.text}` : r.text));
            if (r.example) toast.info("Modo ejemplo: en esta PC no se convierte la voz. Te puse una pregunta de ejemplo.");
            requestAnimationFrame(() => {
                const el = inputRef.current;
                el?.focus();
                el?.setSelectionRange(el.value.length, el.value.length);
            });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo convertir la voz en texto.");
        } finally {
            setTranscribing(false);
        }
    });

    const startVoice = async () => {
        try {
            await voice.start();
        } catch {
            toast.error("No se pudo usar el micrófono. Revisa el permiso del navegador.");
        }
    };

    const canSend = (!!text.trim() || pending.length > 0) && !sending && !busy && !transcribing;
    // En el celular, botones un poco más chicos para que la caja tenga lugar
    const round = { width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 }, flexShrink: 0 };

    if (voice.recording) {
        const mm = Math.floor(voice.seconds / 60);
        const ss = String(voice.seconds % 60).padStart(2, "0");
        return (
            <Stack direction="row" alignItems="center" gap={1.5} role="status" sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>
                <Box sx={{ width: 10, height: 10, flexShrink: 0, borderRadius: "50%", bgcolor: "error.main", animation: "blink 1s infinite", "@keyframes blink": { "50%": { opacity: 0.2 } } }} />
                <Typography fontWeight={700} color="error.main" sx={{ fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap>Te escucho… al terminar lo escribo en la caja</Typography>
                <Button color="inherit" onClick={() => voice.stop(false)} sx={{ textTransform: "none", flexShrink: 0 }}>Cancelar</Button>
                <Button variant="contained" onClick={() => voice.stop(true)} endIcon={<CheckRoundedIcon />} sx={{ textTransform: "none", flexShrink: 0 }}>Listo</Button>
            </Stack>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 1.5 }, borderTop: 1, borderColor: "divider" }}>
            {pending.length > 0 && (
                <PendingFiles items={pending} sending={sending} onRemove={removePending} hint={pending.length > 1 ? "Van todos juntos con tu pregunta." : null} />
            )}
            <Stack direction="row" gap={{ xs: 0.25, sm: 0.5 }} alignItems="flex-end">
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    hidden
                    accept={FILE_ACCEPT}
                    onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = "";
                    }}
                />
                <Tooltip title="Adjuntar fotos, PDF o Excel">
                    <span>
                        <IconButton aria-label="Adjuntar archivo" onClick={() => fileRef.current?.click()} disabled={sending || pending.length >= FILES_MAX} sx={round}>
                            <AttachFileRoundedIcon />
                        </IconButton>
                    </span>
                </Tooltip>
                <TextField
                    inputRef={inputRef}
                    fullWidth
                    multiline
                    maxRows={6}
                    size="small"
                    placeholder={transcribing ? "Escribiendo lo que dijiste…" : pending.length ? "¿Qué quieres saber de estos archivos? (opcional)" : "Pregúntale lo que quieras de tu negocio…"}
                    value={text}
                    disabled={transcribing}
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
                    slotProps={{ htmlInput: { "aria-label": "Mensaje para el asistente", maxLength: 4000 } }}
                />
                {voice.supported && (
                    <Tooltip title="Hablar: lo que digas se escribe en la caja">
                        <span>
                            <IconButton aria-label="Hablar con el micrófono" onClick={startVoice} disabled={sending || transcribing} sx={round}>
                                {transcribing ? <CircularProgress size={20} /> : <MicRoundedIcon />}
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
                <IconButton color="primary" aria-label="Enviar" onClick={send} disabled={!canSend} sx={round}>
                    {sending ? <CircularProgress size={20} /> : <SendRoundedIcon />}
                </IconButton>
            </Stack>
            <Typography variant="caption" color="text.disabled" sx={{ display: { xs: "none", sm: "block" }, mt: 0.5 }}>
                Enter envía · Shift + Enter baja de línea · Puedes pegar o arrastrar fotos, PDF y Excel
            </Typography>
        </Box>
    );
});

AssistantComposer.displayName = "AssistantComposer";
