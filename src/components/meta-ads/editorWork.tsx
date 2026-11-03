// src/components/meta-ads/editorWork.tsx
// Etapa 5, paso 5a (2026-10-30): lo de los editores en la cola de producción, compartido entre sus pantallas (Mis encargos y
// Encargos del equipo) y la Cola y banca del dueño: entregar (un enlace de Drive por pieza y la ficha), revisar (aprobar a
// la banca o devolver con un comentario), asignar y el historial de versiones (V01, V02…).
// .90: con el almacén encendido, cada pieza se sube al sistema (no más enlaces de Drive) y se ve ahí mismo.
import React, { useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Link, Menu, MenuItem, Stack,
    TextField, Typography,
} from "@mui/material";
import { ContentCopyRounded, ExpandLessRounded, ExpandMoreRounded, OpenInNewRounded, PersonAddAlt1Rounded, UploadFileRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api, dateTime } from "./metaAds";
import { Delivery, EditorOption, driveFileId } from "./editorShared";
import { ACCEPT, StoredFile, fileProblem, sendFile } from "./fileUpload";
import { FileView } from "./fileView";

type DeliverPiece = { id?: number; code?: string | null; change: string | null; format: string | null; link?: string | null; file?: StoredFile | null; hook?: string | null };

const REVIEW_COLOR: Record<Delivery["review"], "secondary" | "success" | "error"> = { pending: "secondary", approved: "success", returned: "error" };

const linkProblem = (url: string) => (url.includes("/folders/")
    ? "Es una carpeta: pega el enlace de este video."
    : "Pega el enlace de Drive del archivo (clic derecho › Compartir › Copiar enlace).");

/** Copiar el encargo; si el navegador no deja (algunos teléfonos), el texto seleccionado para copiarlo a mano. */
export const CopyBrief: React.FC<{ text: string; label?: string }> = ({ text, label = "Copiar encargo" }) => {
    const [manual, setManual] = useState(false);
    const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error("sin portapapeles")))
        .then(() => toast.success("Encargo copiado")).catch(() => setManual(true));
    return (
        <>
            <Button size="small" startIcon={<ContentCopyRounded />} onClick={copy}>{label}</Button>
            <Dialog open={manual} onClose={() => setManual(false)} fullWidth maxWidth="sm">
                <DialogTitle>Copia el encargo</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>El navegador no dejó copiarlo solo: el texto ya está seleccionado, cópialo (Ctrl+C o mantener apretado).</Typography>
                    <TextField value={text} fullWidth multiline minRows={6} InputProps={{ readOnly: true }} autoFocus onFocus={(e) => e.target.select()} />
                </DialogContent>
                <DialogActions><Button onClick={() => setManual(false)}>Listo</Button></DialogActions>
            </Dialog>
        </>
    );
};

/** Asignar o cambiar el editor. Sin asignar solo se puede dejar lo que todavía no se empezó. */
export const AssignButton = <B,>({ editors, current, url, allowNone, onDone }: {
    editors: EditorOption[]; current: number | null; url: string; allowNone: boolean; onDone: (b: B) => void;
}) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [busy, setBusy] = useState(false);
    const assign = async (editorId: number | null) => {
        setAnchor(null);
        setBusy(true);
        try {
            const r = await api<{ batch: B }>(url, "PUT", { editor_id: editorId });
            onDone(r.batch);
            toast.success(editorId ? `Asignado a ${editors.find((e) => e.id === editorId)?.name ?? "el editor"}` : "Quedó sin asignar");
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    return (
        <>
            <Button size="small" startIcon={busy ? <CircularProgress size={14} /> : <PersonAddAlt1Rounded />} disabled={busy} onClick={(e) => setAnchor(e.currentTarget)}>
                {current ? "Cambiar editor" : "Asignar editor"}
            </Button>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                {editors.length === 0 && <MenuItem disabled>No hay editores: créalos en Usuarios con el rol "Editor de video" o "Editor líder".</MenuItem>}
                {editors.map((e) => (
                    <MenuItem key={e.id} selected={e.id === current} onClick={() => assign(e.id)}>{e.name}{e.leader ? " (líder)" : ""}</MenuItem>
                ))}
                {allowNone && current && <MenuItem onClick={() => assign(null)}>Sin asignar</MenuItem>}
            </Menu>
        </>
    );
};

/** Las versiones entregadas, la más nueva arriba, con el archivo (o el enlace) y el hook de cada pieza y lo que dijo la revisión. */
export const DeliveriesList: React.FC<{ deliveries: Delivery[]; defaultOpen?: boolean }> = ({ deliveries, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    if (deliveries.length === 0) return null;
    return (
        <Box sx={{ mt: 0.75 }}>
            <Button size="small" onClick={() => setOpen(!open)} endIcon={open ? <ExpandLessRounded /> : <ExpandMoreRounded />} sx={{ textTransform: "none", px: 0.5 }}>
                Entregas ({deliveries.map((d) => d.version).join(", ")})
            </Button>
            <Collapse in={open}>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                    {deliveries.map((d) => (
                        <Box key={d.id} sx={{ borderLeft: "3px solid", borderColor: `${REVIEW_COLOR[d.review]}.main`, pl: 1.25 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Typography variant="body2" fontWeight={700}>{d.version}</Typography>
                                <Chip size="small" color={REVIEW_COLOR[d.review]} label={d.review_label} />
                                <Typography variant="caption" color="text.secondary">
                                    {[d.editor, d.delivered_at && dateTime(d.delivered_at), d.reviewed_by && `revisó ${d.reviewed_by}`].filter(Boolean).join(" · ")}
                                </Typography>
                            </Stack>
                            {(d.concept || d.angle) && (
                                <Typography variant="caption" component="div" sx={{ overflowWrap: "anywhere" }}>
                                    {[d.concept && `Concepto: ${d.concept}`, d.angle && `Ángulo: ${d.angle}`].filter(Boolean).join(" · ")}
                                </Typography>
                            )}
                            {d.pieces.map((p) => (
                                <Box key={p.piece_id} sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" component="div" sx={{ overflowWrap: "anywhere" }}>
                                        <b>{p.code ?? "Pieza"}</b>
                                        {!p.file && p.link && (
                                            <>{" "}<Link href={p.link} target="_blank" rel="noopener noreferrer" underline="hover">abrir en Drive <OpenInNewRounded sx={{ fontSize: 12, verticalAlign: "middle" }} /></Link></>
                                        )}
                                        {p.hook && <> · hook: {p.hook}</>}
                                    </Typography>
                                    {p.file && <FileView file={p.file} />}
                                </Box>
                            ))}
                            {d.notes && <Typography variant="caption" component="div" color="text.secondary">Notas: {d.notes}</Typography>}
                            {d.comment && <Typography variant="body2" sx={{ mt: 0.25, overflowWrap: "anywhere" }}><b>{d.review === "returned" ? "Para cambiar" : "Comentario"}:</b> {d.comment}</Typography>}
                        </Box>
                    ))}
                </Stack>
            </Collapse>
        </Box>
    );
};

/** Revisar la entrega pendiente: aprobarla (pasa a la banca) o devolverla con algo que se vea. */
export const ReviewDialog = <B,>({ open, title, delivery, url, onClose, onDone }: {
    open: boolean; title: string; delivery: Delivery | null; url: string; onClose: () => void; onDone: (b: B) => void;
}) => {
    const [comment, setComment] = useState("");
    const [busy, setBusy] = useState(false);
    const send = async (approve: boolean) => {
        setBusy(true);
        try {
            const r = await api<{ batch: B }>(url, "POST", { approve, comment: comment.trim() || null });
            toast.success(approve ? "Aprobado: pasa a la banca" : "Devuelto al editor");
            setComment("");
            onDone(r.batch);
            onClose();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Revisar {title}{delivery ? ` · ${delivery.version}` : ""}</DialogTitle>
            <DialogContent>
                {delivery && <DeliveriesList deliveries={[delivery]} defaultOpen />}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Mira cada video. Si hay que cambiar algo, escríbelo con algo que se vea: la pieza, el segundo, el texto o la imagen.
                </Typography>
                <TextField label="Comentario" placeholder='Por ejemplo: "C0457, seg. 0–3: el texto tapa la cara"' value={comment} onChange={(e) => setComment(e.target.value)}
                    fullWidth multiline minRows={3} sx={{ mt: 1 }} inputProps={{ maxLength: 2000 }} />
            </DialogContent>
            <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
                <Button onClick={onClose} disabled={busy}>Cancelar</Button>
                <Button color="error" variant="outlined" disabled={busy || comment.trim().length < 10} onClick={() => send(false)}>Devolver</Button>
                <Button color="success" variant="contained" disabled={busy} onClick={() => send(true)}>Aprobar: a la banca</Button>
            </DialogActions>
        </Dialog>
    );
};

type FormPiece = { id: number; code: string | null; link: string; hook: string; file: StoredFile | null; progress: number | null; error: string | null };

/**
 * Entregar: el archivo (`.90`, subido al sistema; sin almacén, el enlace de Drive) y el hook de cada pieza, y la ficha
 * (concepto y ángulo). En una corrección cada pieza parte con su archivo de antes: se vuelve a subir solo la que cambió.
 */
export const DeliverDialog = <B,>({ open, code, pieces, angle, concept, url, uploads, batchId, onClose, onDone }: {
    open: boolean; code: string; pieces: DeliverPiece[]; angle: string; concept: string; url: string; uploads: boolean; batchId: number;
    onClose: () => void; onDone: (b: B) => void;
}) => {
    const fresh = () => ({
        concept, angle, notes: "",
        pieces: pieces.map((p): FormPiece => ({ id: p.id as number, code: p.code ?? null, link: p.link ?? "", hook: p.hook ?? "", file: p.file ?? null, progress: null, error: null })),
    });
    const [form, setForm] = useState(fresh);
    const [busy, setBusy] = useState(false);
    const [tried, setTried] = useState(false);
    // Al abrir de nuevo se parte de lo último entregado (si se lo devolvieron, cambia solo lo que hace falta)
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) { setForm(fresh()); setTried(false); }
    }

    const linkError = (link: string) => (link.trim() === "" ? "Falta el enlace." : driveFileId(link) ? null : linkProblem(link));
    const fileError = (p: FormPiece) => (p.file ? null : "Falta el video o la imagen.");
    const uploading = form.pieces.some((p) => p.progress !== null);
    const ok = form.concept.trim() !== "" && form.angle.trim() !== "" && !uploading
        && form.pieces.every((p) => !(uploads ? fileError(p) : linkError(p.link)) && p.hook.trim() !== "");
    const setPiece = (i: number, patch: Partial<FormPiece>) =>
        setForm((f) => ({ ...f, pieces: f.pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

    /** Sube el archivo de una pieza (queda con el nombre de su anuncio). */
    const upload = async (i: number, file: File | undefined) => {
        if (!file) return;
        const problem = fileProblem("piece", file);
        if (problem) { setPiece(i, { error: problem }); return; }
        setPiece(i, { progress: 0, error: null });
        try {
            const r = await sendFile<{ file: StoredFile }>(`/editor/queue/${batchId}/pieces/${form.pieces[i].id}/upload`, {}, file,
                (id) => `/editor/files/${id}/confirm`, (percent) => setPiece(i, { progress: percent }));
            setPiece(i, { file: r.file, progress: null });
        } catch (e) { setPiece(i, { progress: null, error: (e as Error).message }); }
    };

    const send = async () => {
        setTried(true);
        if (!ok) return;
        setBusy(true);
        try {
            const r = await api<{ batch: B }>(url, "POST", {
                concept: form.concept, angle: form.angle, notes: form.notes,
                pieces: form.pieces.map((p) => (uploads ? { id: p.id, file_id: p.file?.id ?? null, hook: p.hook } : { id: p.id, link: p.link, hook: p.hook })),
            });
            // .89: lo que entrega el editor líder pasa directo a la banca
            toast.success((r.batch as { status?: string } | null)?.status === "bank" ? `${code} entregado: pasa directo a la banca` : `${code} entregado: queda en revisión`);
            onDone(r.batch);
            onClose();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Entregar {code}</DialogTitle>
            <DialogContent>
                <Alert severity="info" sx={{ mb: 1.5 }}>
                    {uploads
                        ? <>Sube el video o la imagen de cada pieza. Queda guardado con el nombre de su anuncio (por ejemplo, C0457 POSP): no hace falta renombrarlo.</>
                        : <>Sube cada video a Drive y pega el enlace <b>de cada archivo</b> (no de la carpeta). Dale acceso al dueño. Ponle a cada archivo su número (por ejemplo, C0457).</>}
                </Alert>
                <Stack spacing={1.5}>
                    {form.pieces.map((p, i) => {
                        const err = uploads ? p.error ?? (tried ? fileError(p) : null) : tried || p.link ? linkError(p.link) : null;
                        return (
                            <Box key={p.id}>
                                <Typography variant="subtitle2">{p.code ?? `Pieza ${i + 1}`}</Typography>
                                {pieces[i]?.change && <Typography variant="caption" color="text.secondary" component="div">{pieces[i].change}</Typography>}
                                {uploads ? (
                                    <Box sx={{ mt: 0.75, mb: 1 }}>
                                        {p.file && p.progress === null && <FileView file={p.file} height={160} />}
                                        {p.progress !== null && (
                                            <Stack spacing={0.5}>
                                                <LinearProgress variant="determinate" value={p.progress} />
                                                <Typography variant="caption" color="text.secondary">Subiendo… {p.progress} %</Typography>
                                            </Stack>
                                        )}
                                        <Button component="label" size="small" variant={p.file ? "text" : "outlined"} startIcon={<UploadFileRounded />} disabled={p.progress !== null || busy}
                                            sx={{ mt: 0.5 }}>
                                            {p.file ? "Cambiar archivo" : "Elegir video o imagen"}
                                            <input hidden type="file" accept={ACCEPT.piece} onChange={(e) => { upload(i, e.target.files?.[0]); e.target.value = ""; }} />
                                        </Button>
                                        {err && <Typography variant="caption" color="error" component="div">{err}</Typography>}
                                    </Box>
                                ) : (
                                    <TextField size="small" label="Enlace de Drive del video" value={p.link} onChange={(e) => setPiece(i, { link: e.target.value })} fullWidth sx={{ mt: 0.75 }}
                                        error={!!err} helperText={err ?? " "} inputProps={{ maxLength: 1000, inputMode: "url" }} />
                                )}
                                <TextField size="small" label="Hook (o el texto principal, si es imagen)" value={p.hook} onChange={(e) => setPiece(i, { hook: e.target.value })} fullWidth
                                    error={tried && p.hook.trim() === ""} helperText={tried && p.hook.trim() === "" ? "Falta el hook." : " "} inputProps={{ maxLength: 300 }} />
                            </Box>
                        );
                    })}
                    <TextField size="small" label="Concepto" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} fullWidth
                        error={tried && !form.concept.trim()} inputProps={{ maxLength: 255 }} />
                    <TextField size="small" label="Ángulo" value={form.angle} onChange={(e) => setForm({ ...form, angle: e.target.value })} fullWidth
                        error={tried && !form.angle.trim()} inputProps={{ maxLength: 120 }} />
                    <TextField size="small" label="Notas para el líder (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth multiline minRows={2}
                        inputProps={{ maxLength: 2000 }} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={busy}>Cancelar</Button>
                <Button variant="contained" disabled={busy || uploading} onClick={send}>{busy ? "Entregando…" : uploading ? "Subiendo…" : "Entregar"}</Button>
            </DialogActions>
        </Dialog>
    );
};
