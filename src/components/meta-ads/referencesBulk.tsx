// src/components/meta-ads/referencesBulk.tsx
// .97 (dueño, 2026-11-04: "quiero que se puedan añadir referencias de manera masiva… que se elija el producto, el ángulo,
// y se puedan agregar varias referencias de ese producto y ángulo, las cuales posteriormente el sistema nombra de manera
// automática… no todas las referencias son videos, también pueden ser imágenes"): "Subir varias". El producto y el ángulo
// una vez, hasta 20 videos e imágenes (cada uno con su link opcional) y, para todas, el tipo y el "por qué" opcionales.
// Sube los archivos uno por uno y al final las guarda juntas, con números seguidos (REF0012 a REF0019).
import React, { useEffect, useRef, useState } from "react";
import {
    Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, Stack, TextField,
    Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { CheckCircleRounded, CloseRounded, DeleteOutlineRounded, UploadFileRounded } from "@mui/icons-material";
import { api } from "./metaAds";
import { ACCEPT, StoredFile, fileProblem, sendFile } from "./fileUpload";
import { OTHER_ANGLE, ReferenceItem, ReferenceProduct, fieldErrors } from "./editorShared";
import { ProductAnglePicker, TypeChoices } from "./references";
import { fmtSize } from "../internal-chat/chat/chatFiles";
import { geist, inkSx, tapSx, useTokens } from "../ui/design";

const MAX = 20;

type Item = {
    key: string; file: File; preview: string; image: boolean; link: string;
    progress: number | null; stored: StoredFile | null; error: string | null; linkError: string | null;
};

/** Por nombre, con los números en orden (2 antes que 10), como se ven en la carpeta. */
const byName = (a: Item, b: Item) => a.file.name.localeCompare(b.file.name, "es", { numeric: true });
const isImage = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(f.name);
/** El link es opcional, pero si lo pegan debe ser un link. */
const linkWrong = (x: Item) => x.link.trim() !== "" && !/^https?:\/\/\S+$/i.test(x.link.trim());

export const BulkReferenceDialog: React.FC<{
    open: boolean; products: ReferenceProduct[]; types: Record<string, string>; productId?: number | null;
    onClose: () => void; onDone: (refs: ReferenceItem[]) => void;
}> = ({ open, products, types, productId, onClose, onDone }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const [product, setProduct] = useState("");
    const [angle, setAngle] = useState("");
    const [other, setOther] = useState("");
    const [type, setType] = useState("");
    const [why, setWhy] = useState("");
    const [items, setItems] = useState<Item[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<ReferenceItem[] | null>(null);
    const [dragging, setDragging] = useState(false);
    // Las miniaturas son direcciones locales del navegador: se liberan al quitar el archivo o al cerrar
    const previews = useRef<string[]>([]);
    useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

    const clearItems = () => { previews.current.forEach((u) => URL.revokeObjectURL(u)); previews.current = []; setItems([]); };
    const reset = (keepTarget: boolean) => {
        if (!keepTarget) {
            setProduct(productId && products.some((p) => p.id === productId) ? String(productId) : "");
            setAngle(""); setOther(""); setType(""); setWhy("");
        }
        clearItems(); setErrors({}); setNotice(null); setBusy(false); setDone(null);
    };
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) reset(false);
    }
    const setItem = (key: string, patch: Partial<Item>) => setItems((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    const remove = (it: Item) => {
        URL.revokeObjectURL(it.preview);
        previews.current = previews.current.filter((u) => u !== it.preview);
        setItems((list) => list.filter((x) => x.key !== it.key));
    };

    const add = (files: FileList | null) => {
        if (!files) return;
        setErrors((e) => ({ ...e, items: "" }));
        const fresh: Item[] = [];
        const bad: string[] = [];
        Array.from(files).forEach((f, i) => {
            const problem = fileProblem("piece", f);
            if (problem) { bad.push(`${f.name}: no es un video ni una imagen que se pueda subir.`); return; }
            const preview = URL.createObjectURL(f);
            previews.current.push(preview);
            fresh.push({ key: `${f.name}-${f.size}-${Date.now()}-${i}`, file: f, preview, image: isImage(f), link: "", progress: null, stored: null, error: null, linkError: null });
        });
        const all = [...items, ...fresh].sort(byName);
        all.slice(MAX).forEach((x) => { URL.revokeObjectURL(x.preview); previews.current = previews.current.filter((u) => u !== x.preview); });
        setItems(all.slice(0, MAX));
        setNotice(bad.length ? bad[0] : all.length > MAX ? `Se suben hasta ${MAX} a la vez: quedaron los primeros ${MAX}.` : null);
    };

    /** Revisa lo que falta antes de subir: el producto, el ángulo, al menos un archivo y que cada link empiece con https://. */
    const check = () => {
        const local: Record<string, string> = {};
        if (!product) local.product_id = "Elige el producto.";
        else if (!angle) local.angle_code = "Elige el ángulo (o «Otro ángulo» si no va con ninguno).";
        else if (angle === OTHER_ANGLE && !other.trim()) local.angle_other = "Escribe en pocas palabras cuál es el otro ángulo.";
        if (items.length === 0) local.items = "Agrega los videos o las imágenes (paso 3).";
        setItems((list) => list.map((x) => ({ ...x, linkError: linkWrong(x) ? "El link debe empezar con https://." : null })));
        setErrors(local);
        return Object.keys(local).length === 0 && !items.some(linkWrong);
    };

    /** Sube lo que falta (también sirve para reintentar) y, con todo arriba, las guarda juntas. */
    const send = async () => {
        if (!check()) return;
        setBusy(true);
        setNotice(null);
        const ids: (number | null)[] = items.map((x) => x.stored?.id ?? null);
        try {
            for (const [i, it] of items.entries()) {
                if (it.stored) continue;
                setItem(it.key, { progress: 0, error: null });
                try {
                    const r = await sendFile<{ file: StoredFile }>("/editor/references/upload", {}, it.file, (id) => `/editor/files/${id}/confirm`,
                        (percent) => setItem(it.key, { progress: percent }));
                    ids[i] = r.file.id;
                    setItem(it.key, { stored: r.file, progress: null });
                } catch (e) {
                    setItem(it.key, { progress: null, error: (e as Error).message });
                    throw new Error(`No se pudo subir ${it.file.name}. Revisa tu internet y toca «Reintentar».`);
                }
            }
            const r = await api<{ references: ReferenceItem[] }>("/editor/references/bulk", "POST", {
                product_id: Number(product), angle_code: angle, angle_other: angle === OTHER_ANGLE ? other.trim() : null,
                type: type || null, why: why.trim() || null, items: items.map((it, i) => ({ file_id: ids[i], link: it.link.trim() || null })),
            });
            setDone(r.references);
            onDone(r.references);
        } catch (e) {
            const errs = fieldErrors(e);
            if (errs) {
                // Los errores de cada fila ("items.3.link") van a su archivo; los demás, arriba
                const common: Record<string, string> = {};
                Object.entries(errs).forEach(([k, msg]) => {
                    const m = /^items\.(\d+)\.(link|file)$/.exec(k);
                    const it = m ? items[Number(m[1])] : undefined;
                    if (it && m![2] === "link") setItem(it.key, { linkError: msg });
                    else if (it) setItem(it.key, { error: msg });
                    else common[k] = msg;
                });
                setErrors(common);
                setNotice(Object.keys(common).length ? null : "Revisa lo marcado en rojo: puedes cambiar el link o quitar ese archivo, y vuelve a tocar el botón.");
            } else {
                setNotice((e as Error).message);
            }
        } finally { setBusy(false); }
    };

    const close = () => {
        if (busy && !window.confirm("Se están subiendo los archivos. Si cierras ahora, lo que subiste se pierde. ¿Cerrar igual?")) return;
        if (!busy && !done && items.some((x) => x.stored) && !window.confirm("Todavía no se guardaron en la biblioteca. Si cierras, lo que subiste se pierde. ¿Cerrar?")) return;
        clearItems();
        onClose();
    };

    const uploaded = items.filter((x) => x.stored).length;
    const uploading = items.some((x) => x.progress !== null);
    const step = (n: number, text: string, error?: string) => <Typography sx={{ fontSize: 13, color: error ? t.red : t.muted, mb: 0.75 }}>{n}. {text}</Typography>;
    const count = `${items.length} ${items.length === 1 ? "referencia" : "referencias"}`;

    if (done) {
        const range = done.length === 1 ? done[0].code : `${done[0].code} a ${done[done.length - 1].code}`;
        return (
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { ...geist, borderRadius: "12px" } }}>
                <DialogContent sx={{ textAlign: "center", pt: 3 }}>
                    <CheckCircleRounded sx={{ fontSize: 40, color: t.green }} />
                    <Typography role="status" sx={{ fontSize: 17, fontWeight: 600, mt: 1 }}>
                        {done.length === 1 ? "1 referencia en la biblioteca" : `${done.length} referencias en la biblioteca`}
                    </Typography>
                    <Typography sx={{ fontSize: 15, mt: 0.5 }}>{range}</Typography>
                    <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>El sistema les puso el nombre. Ya se pueden elegir al entregar.</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={onClose} sx={{ color: t.muted, ...tapSx }}>Listo</Button>
                    <Button variant="contained" disableElevation onClick={() => reset(true)} sx={{ ...inkSx(t), ...tapSx, flex: 1 }}>Subir más de este ángulo</Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={close} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pr: 7, position: "relative" }}>
                <IconButton aria-label="Cerrar" onClick={close} sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44, color: t.muted }}><CloseRounded /></IconButton>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Subir varias referencias</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted }}>
                    Elige el producto y el ángulo una vez y suelta todos los videos e imágenes. El sistema les pone el nombre (REF…).
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line }}>
                <Stack spacing={2.5}>
                    <ProductAnglePicker products={products} product={product} angle={angle} other={other} errors={errors} disabled={busy}
                        productLabel="1. ¿Para qué producto?" angleLabel="2. ¿Qué ángulo? (el mismo para todas)"
                        onChange={(v) => {
                            if (v.product !== undefined) setProduct(v.product);
                            if (v.angle !== undefined) setAngle(v.angle);
                            if (v.other !== undefined) setOther(v.other);
                            setErrors((e) => ({ ...e, product_id: "", angle_code: "", angle_other: "" }));
                        }} />
                    <Box>
                        {step(3, `Los videos y las imágenes (hasta ${MAX})`, errors.items)}
                        {items.length > 0 && (
                            <Stack spacing={0.75} sx={{ mb: 1 }}>
                                {items.map((it) => (
                                    <Box key={it.key} sx={{ border: `1px solid ${it.error || it.linkError ? t.red : t.line}`, borderRadius: "10px", p: "8px 10px" }}>
                                        <Stack direction="row" spacing={1.25} alignItems="center">
                                            <Box sx={{ flex: "none", width: 48, height: 48, borderRadius: "8px", overflow: "hidden", bgcolor: "common.black" }} aria-hidden>
                                                {it.image
                                                    ? <Box component="img" src={it.preview} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    : <Box component="video" src={`${it.preview}#t=0.5`} preload="metadata" muted playsInline sx={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography noWrap title={it.file.name} sx={{ fontSize: 14, fontWeight: 500 }}>{it.file.name}</Typography>
                                                <Typography sx={{ fontSize: 12, color: t.muted }}>{it.image ? "Imagen" : "Video"} · {fmtSize(it.file.size)}</Typography>
                                            </Box>
                                            {it.stored ? <CheckCircleRounded sx={{ fontSize: 20, color: t.green }} aria-label="Subido" />
                                                : it.progress !== null ? <Typography sx={{ fontSize: 12, color: t.muted, flex: "none" }}>{it.progress} %</Typography>
                                                : null}
                                            {!busy && (
                                                <IconButton aria-label={`Quitar ${it.file.name}`} onClick={() => remove(it)} sx={{ width: 40, height: 40, flex: "none" }}>
                                                    <DeleteOutlineRounded sx={{ fontSize: 20 }} />
                                                </IconButton>
                                            )}
                                        </Stack>
                                        {it.progress !== null && <LinearProgress variant="determinate" value={it.progress} sx={{ mt: 0.75, height: 4, borderRadius: 2, "& .MuiLinearProgress-bar": { bgcolor: t.ink } }} />}
                                        <TextField size="small" placeholder="Link de donde salió (opcional)" value={it.link} disabled={busy} fullWidth sx={{ mt: 0.75 }}
                                            onChange={(e) => setItem(it.key, { link: e.target.value, linkError: null })} error={!!it.linkError} helperText={it.linkError || undefined}
                                            inputProps={{ maxLength: 1000, inputMode: "url", "aria-label": `Link de ${it.file.name} (opcional)` }} />
                                        {it.error && <Typography role="alert" sx={{ fontSize: 12, color: t.red, mt: 0.5 }}>{it.error}</Typography>}
                                    </Box>
                                ))}
                            </Stack>
                        )}
                        {!busy && items.length < MAX && (
                            <ButtonBase component="label"
                                onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                                onDrop={(e: React.DragEvent) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
                                sx={{ width: "100%", minHeight: items.length ? 64 : 120, p: 2, borderRadius: "10px", border: `1.5px dashed ${dragging ? t.ink : errors.items ? t.red : t.faint}`,
                                    bgcolor: dragging ? t.soft : "transparent", display: "flex", flexDirection: "column", gap: 0.5, textAlign: "center",
                                    "&:hover": { bgcolor: t.soft }, "&:focus-within": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                <UploadFileRounded sx={{ color: t.muted }} />
                                <Typography sx={{ fontSize: 15, fontWeight: 500 }}>
                                    {items.length ? "Agregar más" : phone ? "Toca para elegir los videos y las imágenes" : "Toca para elegirlos o suéltalos aquí"}
                                </Typography>
                                {!items.length && <Typography sx={{ fontSize: 12, color: t.muted }}>Varios a la vez · videos mp4, mov o webm (hasta 1 GB) e imágenes jpg, png o webp</Typography>}
                                <input hidden type="file" multiple accept={ACCEPT.piece} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
                            </ButtonBase>
                        )}
                        {errors.items && <Typography role="alert" sx={{ fontSize: 13, color: t.red, mt: 0.5 }}>{errors.items}</Typography>}
                    </Box>
                    <Box>
                        {step(4, "Para todas (opcional): el tipo y por qué las elegiste")}
                        <TypeChoices types={types} value={type} onChange={setType} clearable disabled={busy} />
                        <TextField placeholder="Por qué las elegiste (opcional): el hook, el ritmo, la prueba…" value={why} onChange={(e) => setWhy(e.target.value)}
                            fullWidth multiline minRows={2} disabled={busy} sx={{ mt: 1.5 }} inputProps={{ maxLength: 500, "aria-label": "Por qué las elegiste (opcional)" }} />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, p: 2 }}>
                {notice ? <Typography role="alert" sx={{ fontSize: 13, color: t.red }}>{notice}</Typography>
                    : busy ? <Typography role="status" sx={{ fontSize: 13, color: t.muted }}>{uploading ? `Subiendo ${uploaded + 1} de ${items.length}… no cierres esta ventana` : "Guardando…"}</Typography>
                    : <Typography sx={{ fontSize: 13, color: t.muted }}>Cada archivo queda como una referencia, con su nombre (REF…).</Typography>}
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button onClick={close} sx={{ color: t.muted, ...tapSx }}>Cancelar</Button>
                    <Button variant="contained" disableElevation onClick={send} disabled={busy}
                        startIcon={busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}
                        sx={{ ...inkSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}>
                        {busy ? "Subiendo…" : items.length && uploaded === items.length ? `Guardar ${count}` : uploaded > 0 ? "Reintentar" : items.length ? `Subir ${count}` : "Subir"}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};
