// src/components/meta-ads/importBatch.tsx
// .95 (dueño, 2026-11-03: "hay batchs que ya están hechos y deberían estar en la banca… todos están en carpetas en drive por
// cada batch… no nos acordamos de ninguna de las hipótesis"): el editor líder carga cada batch ya hecho en 4 pasos
// (producto, ángulo o "no sé", los videos de la carpeta y quién lo hizo). Al cargar, el sistema le da sus números, sube cada
// video con su nombre en Meta y lo deja en la banca, sin hipótesis ("de antes del sistema"). Si se cierra a mitad, se descarta.
import React, { useState } from "react";
import {
    Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem, Stack, TextField,
    Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { CheckCircleRounded, CloseRounded, DeleteOutlineRounded, UploadFileRounded } from "@mui/icons-material";
import { api } from "./metaAds";
import { ACCEPT, StoredFile, fileProblem, sendFile } from "./fileUpload";
import { EditorOption, ReferenceProduct } from "./editorShared";
import { fmtSize } from "../internal-chat/chat/chatFiles";
import { geist, inkSx, tapSx, useTokens } from "../ui/design";

type Options = { products: ReferenceProduct[]; editors: EditorOption[]; me: number; uploads: boolean };
type Loaded = { id: number; code: string; status: string; meta_names: { adset: string | null; ads: string[] }; pieces: { id: number; code: string }[] };
type Item = { key: string; file: File; hook: string; progress: number | null; stored: StoredFile | null; error: string | null };

const MAX = 10;
/** Por nombre, con los números en orden (2 antes que 10), como se ven en la carpeta. */
const byName = (a: Item, b: Item) => a.file.name.localeCompare(b.file.name, "es", { numeric: true });

export const ImportBatchDialog: React.FC<{ open: boolean; onClose: () => void; onDone: (code: string) => void }> = ({ open, onClose, onDone }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const [opts, setOpts] = useState<Options | null>(null);
    const [product, setProduct] = useState("");
    const [angle, setAngle] = useState("");
    const [editor, setEditor] = useState("");
    const [concept, setConcept] = useState("");
    const [items, setItems] = useState<Item[]>([]);
    const [batch, setBatch] = useState<Loaded | null>(null);
    const [done, setDone] = useState<Loaded | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    const reset = () => { setProduct(""); setAngle(""); setConcept(""); setItems([]); setBatch(null); setDone(null); setError(null); setBusy(false); };
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            reset();
            api<Options>("/editor/imports/options").then((o) => { setOpts(o); setEditor(String(o.me)); }).catch((e) => setError((e as Error).message));
        }
    }
    const angles = opts?.products.find((p) => String(p.id) === product)?.angles ?? [];
    const setItem = (key: string, patch: Partial<Item>) => setItems((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));

    const add = (files: FileList | null) => {
        if (!files) return;
        const fresh: Item[] = [];
        const bad: string[] = [];
        Array.from(files).forEach((f, i) => {
            const problem = fileProblem("piece", f);
            if (problem) bad.push(`${f.name}: ${problem}`);
            else fresh.push({ key: `${f.name}-${f.size}-${Date.now()}-${i}`, file: f, hook: "", progress: null, stored: null, error: null });
        });
        setItems((list) => [...list, ...fresh].sort(byName).slice(0, MAX));
        setError(bad.length ? bad[0] : items.length + fresh.length > MAX ? `Un batch lleva hasta ${MAX} videos: quedaron los primeros ${MAX}.` : null);
    };

    /** Sube lo que falta (también sirve para reintentar) y, con todo arriba, lo pasa a la banca. */
    const upload = async (b: Loaded, list: Item[]) => {
        const ids = list.map((it) => it.stored?.id ?? null);
        for (const [i, it] of list.entries()) {
            if (it.stored) continue;
            setItem(it.key, { progress: 0, error: null });
            try {
                const r = await sendFile<{ file: StoredFile }>(`/editor/imports/${b.id}/pieces/${b.pieces[i].id}/upload`, {}, it.file,
                    (id) => `/editor/files/${id}/confirm`, (percent) => setItem(it.key, { progress: percent }));
                ids[i] = r.file.id;
                setItem(it.key, { stored: r.file, progress: null });
            } catch (e) {
                setItem(it.key, { progress: null, error: (e as Error).message });
                throw new Error(`No se pudo subir ${it.file.name}. Revisa tu internet y toca «Reintentar».`);
            }
        }
        const r = await api<{ batch: Loaded }>(`/editor/imports/${b.id}/finish`, "POST", {
            pieces: list.map((it, i) => ({ id: b.pieces[i].id, file_id: ids[i], hook: it.hook.trim() || null })),
        });
        setDone(r.batch);
        onDone(r.batch.code);
    };

    const send = async () => {
        if (!product) { setError("Elige el producto (paso 1)."); return; }
        if (items.length === 0) { setError("Agrega los videos del batch (paso 3)."); return; }
        setBusy(true);
        setError(null);
        try {
            let b = batch;
            if (!b) {
                const r = await api<{ batch: Loaded }>("/editor/imports", "POST", {
                    product_id: Number(product), angle_code: angle || null, editor_id: Number(editor), concept: concept.trim() || null, pieces: items.length,
                });
                b = r.batch;
                setBatch(b);
            }
            await upload(b, items);
        } catch (e) {
            const errs = (e as { errors?: Record<string, string[]> }).errors;
            setError(errs ? Object.values(errs)[0][0] : (e as Error).message);
        } finally { setBusy(false); }
    };

    /** Cerrar: si quedó a medias, se descarta (sus números no se vuelven a usar). */
    const close = async () => {
        if (busy && !window.confirm("Se están subiendo los videos. Si cierras ahora, este batch no se carga. ¿Cerrar igual?")) return;
        if (batch && !done) {
            if (!busy && !window.confirm(`${batch.code} quedó a medias. Si cierras, no se carga (puedes volver a empezar). ¿Cerrar?`)) return;
            api(`/editor/imports/${batch.id}`, "DELETE").catch(() => undefined);
        }
        onClose();
    };

    const uploaded = items.filter((x) => x.stored).length;
    const uploading = items.find((x) => x.progress !== null);
    const locked = busy || !!batch;
    const step = (n: number, text: string) => <Typography sx={{ fontSize: 13, color: t.muted, mb: 0.5 }}>{n}. {text}</Typography>;

    if (done) {
        return (
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { ...geist, borderRadius: "12px" } }}>
                <DialogContent sx={{ textAlign: "center", pt: 3 }}>
                    <CheckCircleRounded sx={{ fontSize: 40, color: t.green }} />
                    <Typography role="status" sx={{ fontSize: 17, fontWeight: 600, mt: 1 }}>{done.code} está en la banca</Typography>
                    <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                        {done.pieces.length === 1 ? "Su creativo" : "Sus creativos"}: {done.pieces.map((p) => p.code).join(", ")}
                    </Typography>
                    <Box sx={{ mt: 1.5, p: "10px 12px", borderRadius: "10px", bgcolor: t.soft, textAlign: "left" }}>
                        <Typography sx={{ fontSize: 13, color: t.muted }}>Cuando se lance, en Meta se llama</Typography>
                        <Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>Ad set «{done.meta_names.adset}»</Typography>
                        <Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>Anuncios {done.meta_names.ads.map((a) => `«${a}»`).join(", ")}</Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={onClose} sx={{ color: t.muted, ...tapSx }}>Listo</Button>
                    <Button variant="contained" disableElevation onClick={reset} sx={{ ...inkSx(t), ...tapSx, flex: 1 }}>Cargar otro batch</Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={close} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pr: 7, position: "relative" }}>
                <IconButton aria-label="Cerrar" onClick={close} sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44, color: t.muted }}><CloseRounded /></IconButton>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Cargar un batch ya hecho</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted }}>
                    Uno de antes del sistema (de una carpeta de Drive). Entra directo a la banca, con sus números y sin hipótesis.
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line }}>
                {opts && !opts.uploads ? (
                    <Typography sx={{ fontSize: 14 }}>Para cargar batches hace falta el almacén de archivos conectado. Avísale al dueño.</Typography>
                ) : (
                    <Stack spacing={2}>
                        <Box>
                            {step(1, "El producto")}
                            <TextField select value={product} onChange={(e) => { setProduct(e.target.value); setAngle(""); }} fullWidth disabled={locked}
                                SelectProps={{ displayEmpty: true }} inputProps={{ "aria-label": "Producto" }}>
                                <MenuItem value="" disabled>Elige el producto</MenuItem>
                                {(opts?.products ?? []).map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                            </TextField>
                        </Box>
                        <Box>
                            {step(2, "El ángulo (de la ficha del producto)")}
                            <TextField select value={angle} onChange={(e) => setAngle(e.target.value)} fullWidth disabled={locked || !product}
                                SelectProps={{ displayEmpty: true }} inputProps={{ "aria-label": "Ángulo" }}
                                helperText={product && angles.length === 0 ? "Este producto no tiene ángulos en su ficha: queda sin ángulo." : "Si no te acuerdas, deja «No sé»."}>
                                <MenuItem value="">No sé</MenuItem>
                                {angles.map((a) => <MenuItem key={a.code} value={a.code}>{a.code}{a.name ? ` · ${a.name}` : ""}</MenuItem>)}
                            </TextField>
                        </Box>
                        <Box>
                            {step(3, `Los videos de la carpeta (cada video es un creativo; hasta ${MAX})`)}
                            {items.length > 0 && (
                                <Stack spacing={0.75} sx={{ mb: 1 }}>
                                    {items.map((it, i) => (
                                        <Box key={it.key} sx={{ border: `1px solid ${it.error ? t.red : t.line}`, borderRadius: "10px", p: "8px 10px" }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, flex: "none", minWidth: 52 }}>{batch?.pieces[i]?.code ?? `Video ${i + 1}`}</Typography>
                                                <Typography noWrap title={it.file.name} sx={{ fontSize: 13, flex: 1, minWidth: 0 }}>{it.file.name} · {fmtSize(it.file.size)}</Typography>
                                                {it.stored ? <CheckCircleRounded sx={{ fontSize: 18, color: t.green }} aria-label="Subido" />
                                                    : it.progress !== null ? <Typography sx={{ fontSize: 12, color: t.muted, flex: "none" }}>{it.progress} %</Typography>
                                                    : !locked && (
                                                        <IconButton aria-label={`Quitar ${it.file.name}`} onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))} sx={{ width: 40, height: 40 }}>
                                                            <DeleteOutlineRounded sx={{ fontSize: 20 }} />
                                                        </IconButton>
                                                    )}
                                            </Stack>
                                            {it.progress !== null && <LinearProgress variant="determinate" value={it.progress} sx={{ mt: 0.5, height: 4, borderRadius: 2, "& .MuiLinearProgress-bar": { bgcolor: t.ink } }} />}
                                            <TextField size="small" placeholder="Hook (opcional): lo primero que se dice o se lee" value={it.hook} disabled={busy}
                                                onChange={(e) => setItem(it.key, { hook: e.target.value })} fullWidth sx={{ mt: 0.75 }} inputProps={{ maxLength: 300, "aria-label": `Hook de ${it.file.name}` }} />
                                            {it.error && <Typography role="alert" sx={{ fontSize: 12, color: t.red, mt: 0.5 }}>{it.error}</Typography>}
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                            {!locked && items.length < MAX && (
                                <ButtonBase component="label"
                                    onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                                    onDrop={(e: React.DragEvent) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
                                    sx={{ width: "100%", minHeight: items.length ? 64 : 110, p: 2, borderRadius: "10px", border: `1.5px dashed ${dragging ? t.ink : t.faint}`,
                                        bgcolor: dragging ? t.soft : "transparent", display: "flex", flexDirection: "column", gap: 0.5, textAlign: "center",
                                        "&:hover": { bgcolor: t.soft }, "&:focus-within": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                    <UploadFileRounded sx={{ color: t.muted }} />
                                    <Typography sx={{ fontSize: 15, fontWeight: 500 }}>
                                        {items.length ? "Agregar más videos" : phone ? "Toca para elegir los videos" : "Toca para elegir los videos o suéltalos aquí"}
                                    </Typography>
                                    {!items.length && <Typography sx={{ fontSize: 12, color: t.muted }}>Todos los de la carpeta a la vez · mp4, mov o webm (hasta 1 GB cada uno), o imágenes</Typography>}
                                    <input hidden type="file" multiple accept={ACCEPT.piece} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
                                </ButtonBase>
                            )}
                        </Box>
                        <Box>
                            {step(4, "Quién lo hizo")}
                            <TextField select value={editor} onChange={(e) => setEditor(e.target.value)} fullWidth disabled={locked} inputProps={{ "aria-label": "Quién lo hizo" }}>
                                {(opts?.editors ?? []).map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.name}{e.id === opts?.me ? " (tú)" : ""}</MenuItem>)}
                            </TextField>
                            <TextField label="¿De qué trata? (opcional)" placeholder="Por ejemplo: rutina en el gimnasio" value={concept} onChange={(e) => setConcept(e.target.value)}
                                fullWidth disabled={locked} sx={{ mt: 1.5 }} inputProps={{ maxLength: 120 }} />
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, p: 2 }}>
                {error ? <Typography role="alert" sx={{ fontSize: 13, color: t.red }}>{error}</Typography>
                    : busy ? <Typography role="status" sx={{ fontSize: 13, color: t.muted }}>{uploading ? `Subiendo ${uploaded + 1} de ${items.length}… no cierres esta ventana` : "Guardando…"}</Typography>
                    : <Typography sx={{ fontSize: 13, color: t.muted }}>Al cargar: el sistema le da su número y sus códigos, y entra directo a la banca.</Typography>}
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button onClick={close} sx={{ color: t.muted, ...tapSx }}>Cancelar</Button>
                    <Button variant="contained" disableElevation onClick={send} disabled={busy || !opts || (opts && !opts.uploads)}
                        startIcon={busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}
                        sx={{ ...inkSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}>
                        {busy ? "Cargando…" : batch ? "Reintentar" : `Cargar a la banca${items.length ? ` (${items.length} ${items.length === 1 ? "video" : "videos"})` : ""}`}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};
