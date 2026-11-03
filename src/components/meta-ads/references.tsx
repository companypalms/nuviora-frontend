// src/components/meta-ads/references.tsx
// .92 (dueño, 2026-11-03: "la mayoría de los creativos que nosotros lanzamos vienen de una referencia ya probada"): la
// biblioteca de referencias. Las suben los editores (el video, el link de donde salió, el producto y el ángulo o
// "cualquier producto", el tipo de video y por qué la eligieron); cada una dice cuántas veces se usó y, con un botón,
// en qué creativos (dueño: "que abra un popup"). Si ganaron o perdieron, solo el líder y el dueño.
import React, { useEffect, useState } from "react";
import {
    Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem, Stack, TextField,
    Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { CloseRounded, OpenInNewRounded, UploadFileRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api, dateTime } from "./metaAds";
import { ReferenceItem, ReferenceProduct, ReferenceUse } from "./editorShared";
import { ACCEPT, StoredFile, fileProblem, sendFile } from "./fileUpload";
import { BigMedia, FileView } from "./fileView";
import { cardSx, geist, inkSx, lineSx, plural, tapSx, Tokens, useTokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";

const RESULT_TONE: Record<string, (t: Tokens) => string> = { "Ganó": (t) => t.green, "Perdió": (t) => t.red, "Empate": (t) => t.amber };

/** Ganó, perdió y empató, con su punto de color y su palabra (solo el líder y el dueño). */
export const ReferenceResults: React.FC<{ r: NonNullable<ReferenceItem["results"]> }> = ({ r }) => {
    const t = useTokens();
    const part = (n: number, word: string, color: string) => (
        <Stack direction="row" spacing={0.5} alignItems="center" component="span"><Dot color={color} size={8} /><span>{word} {n}</span></Stack>
    );
    return (
        <Stack direction="row" columnGap={1.5} rowGap={0.25} flexWrap="wrap" sx={{ fontSize: 13 }}>
            {part(r.won, "Ganó", t.green)}{part(r.lost, "Perdió", t.red)}{part(r.tie, "Empate", t.amber)}
        </Stack>
    );
};

/** La ventana con los creativos que salieron de una referencia: cada uno con su video, y si ganó (líder y dueño). */
export const UsesDialog: React.FC<{ reference: ReferenceItem | null; base: string; onClose: () => void }> = ({ reference, base, onClose }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const [data, setData] = useState<{ uses: ReferenceUse[]; results: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openVideo, setOpenVideo] = useState<number | null>(null);
    const [loadedFor, setLoadedFor] = useState<number | null>(null);
    if (reference && loadedFor !== reference.id) {
        setLoadedFor(reference.id);
        setData(null);
        setError(null);
        setOpenVideo(null);
    }
    useEffect(() => {
        if (!reference) return;
        api<{ uses: ReferenceUse[]; results: boolean }>(`${base}/references/${reference.id}/uses`).then(setData).catch((e) => setError((e as Error).message));
    }, [reference, base]);
    const won = data?.uses.filter((u) => u.result === "Ganó").length ?? 0;
    return (
        <Dialog open={!!reference} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pr: 7, position: "relative" }}>
                <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44, color: t.muted }}><CloseRounded /></IconButton>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Dónde se usó {reference?.code}</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted }}>
                    {data ? `Usada en ${plural(data.uses.length, "creativo", "creativos")}${data.results ? ` · ganó ${won} de ${data.uses.length}` : ""}` : "Cargando…"}
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line }}>
                {error && <Typography role="alert" sx={{ color: t.red, fontSize: 14 }}>No se pudo abrir: {error}</Typography>}
                {!data && !error && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} sx={{ color: t.muted }} /></Stack>}
                {data && data.uses.length === 0 && <Typography sx={{ fontSize: 14, color: t.muted }}>Todavía no se ha usado.</Typography>}
                <Stack spacing={1}>
                    {data?.uses.map((u) => (
                        <Box key={u.piece_id} sx={{ ...cardSx(t), p: "10px 12px" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                                <Typography sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{u.ad_name ?? u.code ?? "Pieza"}</Typography>
                                {u.result && (
                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: "none" }}>
                                        <Dot color={(RESULT_TONE[u.result] ?? (() => t.gray))(t)} size={8} /><Typography sx={{ fontSize: 13 }}>{u.result}</Typography>
                                    </Stack>
                                )}
                            </Stack>
                            <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>
                                {[u.batch, u.product, u.editor && `lo hizo ${u.editor}`, u.status_label].filter(Boolean).join(" · ")}
                            </Typography>
                            {u.file ? (
                                <>
                                    <TextAction onClick={() => setOpenVideo((o) => (o === u.piece_id ? null : u.piece_id))} aria-expanded={openVideo === u.piece_id} sx={{ fontSize: 13, mt: 0.5 }}>
                                        {openVideo === u.piece_id ? "Ocultar el video" : "Ver el video"}
                                    </TextAction>
                                    {openVideo === u.piece_id && <Box sx={{ mt: 1 }}><FileView file={u.file} height={320} /></Box>}
                                </>
                            ) : <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.5 }}>Sin video en el sistema (entrega de antes)</Typography>}
                        </Box>
                    ))}
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

/** Una referencia de la biblioteca: su video, qué es, por qué, cuántas veces se usó y "Ver dónde se usó". */
export const ReferenceCard: React.FC<{ r: ReferenceItem; onUses: () => void; onArchive?: () => void; onView: () => void }> = ({ r, onUses, onArchive, onView }) => {
    const t = useTokens();
    return (
        <Box sx={{ ...cardSx(t), p: "12px 14px", display: "flex", gap: 1.5 }}>
            <ButtonBase onClick={onView} aria-label={`Ver el video de ${r.code}`}
                sx={{ flex: "none", width: 84, height: 150, borderRadius: "8px", overflow: "hidden", bgcolor: "common.black", "&.Mui-focusVisible": { outline: `2px solid ${t.ink}` } }}>
                {r.file?.url && r.file.type === "video" && <Box component="video" src={`${r.file.url}#t=0.5`} preload="metadata" muted playsInline sx={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />}
                {r.file?.url && r.file.type === "image" && <Box component="img" src={r.file.url} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </ButtonBase>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" columnGap={1} alignItems="baseline" flexWrap="wrap">
                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{r.code}</Typography>
                    <Typography sx={{ fontSize: 13, color: t.muted }}>{r.type_label}</Typography>
                </Stack>
                <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>
                    {r.product ? `${r.product}${r.angle_code ? ` · ${r.angle_name ?? r.angle_code}` : ""}` : "Cualquier producto"}
                </Typography>
                <Typography sx={{ fontSize: 14, mt: 0.5, lineHeight: 1.45, overflowWrap: "anywhere" }}>{r.why}</Typography>
                {/* El aviso de cuántas veces se usó, siempre a la vista (dueño: "debe haber un aviso de cuántas veces se ha usado") */}
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
                    <Dot color={r.uses ? t.ink : t.gray} size={8} />
                    <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{r.uses ? `Usada en ${plural(r.uses, "creativo", "creativos")}` : "Todavía no se ha usado"}</Typography>
                </Stack>
                {r.results && r.uses > 0 && <Box sx={{ mt: 0.5 }}><ReferenceResults r={r.results} /></Box>}
                <Stack direction="row" columnGap={2} rowGap={0.5} flexWrap="wrap" alignItems="center" sx={{ mt: 1, fontSize: 13 }}>
                    {r.uses > 0 && <Button variant="outlined" size="small" onClick={onUses} sx={{ ...lineSx(t), minHeight: 40 }}>Ver dónde se usó</Button>}
                    <Box component="a" href={r.link} target="_blank" rel="noopener noreferrer" sx={{ color: t.ink, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                        De dónde salió <OpenInNewRounded sx={{ fontSize: 14 }} />
                    </Box>
                    {onArchive && <TextAction onClick={onArchive} sx={{ color: t.muted }}>Quitar</TextAction>}
                </Stack>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.5 }}>{[r.uploaded_by && `Subida por ${r.uploaded_by}`, r.created_at && dateTime(r.created_at)].filter(Boolean).join(" · ")}</Typography>
            </Box>
        </Box>
    );
};

/** Ver el video de una referencia en grande. */
export const ReferenceViewer: React.FC<{ r: ReferenceItem | null; onClose: () => void }> = ({ r, onClose }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    return (
        <Dialog open={!!r} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pr: 7, position: "relative" }}>
                <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44, color: t.muted }}><CloseRounded /></IconButton>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>{r?.code} · {r?.type_label}</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted }}>{r?.why}</Typography>
            </DialogTitle>
            <DialogContent>{r?.file ? <BigMedia file={r.file} /> : <Typography sx={{ color: t.muted }}>Sin video.</Typography>}</DialogContent>
        </Dialog>
    );
};

/**
 * Subir una referencia a la biblioteca: el video (directo al almacén), el link de donde salió, el producto y el ángulo
 * (o "cualquier producto"), el tipo de video y por qué la eligió. Si el link ya está, el sistema dice cuál es.
 */
export const UploadReferenceDialog: React.FC<{
    open: boolean; products: ReferenceProduct[]; types: Record<string, string>; productId?: number | null; angleCode?: string | null;
    onClose: () => void; onCreated: (r: ReferenceItem) => void;
}> = ({ open, products, types, productId, angleCode, onClose, onCreated }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const fresh = () => ({ link: "", type: "", why: "", product: productId ? String(productId) : "", angle: angleCode ?? "" });
    const [form, setForm] = useState(fresh);
    const [file, setFile] = useState<StoredFile | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) { setForm(fresh()); setFile(null); setProgress(null); setErrors({}); }
    }
    const angles = products.find((p) => String(p.id) === form.product)?.angles ?? [];

    const upload = async (f: File | undefined) => {
        if (!f) return;
        const problem = fileProblem("piece", f);
        if (problem) { setErrors((e) => ({ ...e, file: problem })); return; }
        setErrors((e) => ({ ...e, file: "" }));
        setProgress(0);
        try {
            const r = await sendFile<{ file: StoredFile }>("/editor/references/upload", {}, f, (id) => `/editor/files/${id}/confirm`, setProgress);
            setFile(r.file);
        } catch (e) { setErrors((x) => ({ ...x, file: (e as Error).message })); } finally { setProgress(null); }
    };
    const close = () => {
        if (busy) return;
        if (progress !== null && !window.confirm("Se está subiendo el video. Si cierras ahora, se pierde. ¿Cerrar igual?")) return;
        onClose();
    };
    const send = async () => {
        const local: Record<string, string> = {};
        if (!file) local.file = "Sube el video (o la imagen) de la referencia.";
        if (!/^https?:\/\/\S+/i.test(form.link.trim())) local.link = "Pega el link de donde salió (empieza con https://).";
        if (!form.type) local.type = "Elige el tipo de video.";
        if (!form.why.trim()) local.why = "Escribe en una frase por qué la elegiste.";
        setErrors(local);
        if (Object.keys(local).length) return;
        setBusy(true);
        try {
            const r = await api<{ reference: ReferenceItem }>("/editor/references", "POST", {
                file_id: file!.id, link: form.link.trim(), type: form.type, why: form.why.trim(),
                product_id: form.product ? Number(form.product) : null, angle_code: form.product && form.angle ? form.angle : null,
            });
            toast.success(`${r.reference.code} está en la biblioteca`);
            onCreated(r.reference);
            onClose();
        } catch (e) {
            const errs = (e as { errors?: Record<string, string[]> }).errors;
            if (errs) setErrors(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])));
            else toast.error((e as Error).message);
        } finally { setBusy(false); }
    };
    const missing = Object.values(errors).filter(Boolean);

    return (
        <Dialog open={open} onClose={close} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pr: 7, position: "relative" }}>
                <IconButton aria-label="Cerrar" onClick={close} sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44, color: t.muted }}><CloseRounded /></IconButton>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Subir una referencia</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted }}>Un video que ya funciona, de otro anunciante: el video y de dónde salió.</Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography sx={{ fontSize: 13, color: t.muted, mb: 0.5 }}>1. El video (descárgalo y súbelo aquí)</Typography>
                        {progress !== null ? (
                            <Box sx={{ p: 2, borderRadius: "10px", bgcolor: t.soft }}>
                                <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, "& .MuiLinearProgress-bar": { bgcolor: t.ink } }} />
                                <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.75 }}>Subiendo… {progress} %</Typography>
                            </Box>
                        ) : file ? (
                            <>
                                <FileView file={file} height={220} />
                                <ButtonBase component="label" sx={{ fontSize: 14, color: t.ink, textDecoration: "underline", textUnderlineOffset: 3, mt: 0.5, minHeight: 32 }}>
                                    Cambiar el video<input hidden type="file" accept={ACCEPT.piece} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
                                </ButtonBase>
                            </>
                        ) : (
                            <ButtonBase component="label" onDragOver={(e: React.DragEvent) => e.preventDefault()}
                                onDrop={(e: React.DragEvent) => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }}
                                sx={{ width: "100%", minHeight: 96, p: 2, borderRadius: "10px", border: `1.5px dashed ${errors.file ? t.red : t.faint}`, display: "flex",
                                    flexDirection: "column", gap: 0.5, "&:hover": { bgcolor: t.soft }, "&:focus-within": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                <UploadFileRounded sx={{ color: t.muted }} />
                                <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{phone ? "Toca para elegir el video" : "Toca para elegir el video o suéltalo aquí"}</Typography>
                                <Typography sx={{ fontSize: 12, color: t.muted }}>mp4, mov o webm (hasta 1 GB), o una imagen</Typography>
                                <input hidden type="file" accept={ACCEPT.piece} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
                            </ButtonBase>
                        )}
                        {errors.file && <Typography role="alert" sx={{ fontSize: 13, color: t.red, mt: 0.5 }}>{errors.file}</Typography>}
                    </Box>
                    <TextField label="2. Link de donde salió" placeholder="https://www.facebook.com/ads/library/?id=…" value={form.link} fullWidth
                        onChange={(e) => setForm({ ...form, link: e.target.value })} error={!!errors.link} helperText={errors.link || "Biblioteca de anuncios, TikTok, Instagram… de cualquier lado."}
                        inputProps={{ maxLength: 1000, inputMode: "url" }} />
                    <TextField select label="3. ¿Para qué producto?" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value, angle: "" })} fullWidth
                        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                        helperText="O «Sirve para cualquier producto», si es un formato que se puede adaptar.">
                        <MenuItem value="">Sirve para cualquier producto</MenuItem>
                        {products.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                    </TextField>
                    {form.product && angles.length > 0 && (
                        <TextField select label="Ángulo (opcional)" value={form.angle} onChange={(e) => setForm({ ...form, angle: e.target.value })} fullWidth
                            SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                            <MenuItem value="">Sin un ángulo en particular</MenuItem>
                            {angles.map((a) => <MenuItem key={a.code} value={a.code}>{a.code}{a.name ? ` · ${a.name}` : ""}</MenuItem>)}
                        </TextField>
                    )}
                    <Box>
                        <Typography sx={{ fontSize: 13, color: errors.type ? t.red : t.muted, mb: 0.75 }}>4. Tipo de video</Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap">
                            {Object.entries(types).map(([k, label]) => (
                                <Button key={k} variant="outlined" size="small" onClick={() => setForm({ ...form, type: k })} aria-pressed={form.type === k}
                                    sx={{ ...lineSx(t), minHeight: 40, ...(form.type === k ? { borderColor: t.ink, borderWidth: 2, "&:hover": { borderColor: t.ink, borderWidth: 2 } } : {}) }}>
                                    {label}
                                </Button>
                            ))}
                        </Stack>
                        {errors.type && <Typography role="alert" sx={{ fontSize: 13, color: t.red, mt: 0.5 }}>{errors.type}</Typography>}
                    </Box>
                    <TextField label="5. Por qué la elegiste" placeholder="Qué te gustó o qué quieres copiar (el hook, el ritmo, la prueba…)" value={form.why}
                        onChange={(e) => setForm({ ...form, why: e.target.value })} fullWidth multiline minRows={2} error={!!errors.why} helperText={errors.why || " "} inputProps={{ maxLength: 500 }} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, p: 2 }}>
                {missing.length > 0 && <Typography role="alert" sx={{ fontSize: 13, color: t.red }}>{missing[0]}</Typography>}
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button onClick={close} disabled={busy} sx={{ color: t.muted, ...tapSx }}>Cancelar</Button>
                    <Button variant="contained" disableElevation onClick={send} disabled={busy || progress !== null} sx={{ ...inkSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}
                        startIcon={busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}>
                        {busy ? "Guardando…" : "Subir a la biblioteca"}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};
