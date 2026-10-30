// src/pages/admin/MetaQueuePage.tsx
// Etapa 5, paso 4a (2026-10-30): la cola de producción y la banca de creativos. Cada encargo es un batch con sus piezas:
// se crea (o lo proponen las reglas, en el paso 4b), el dueño lo aprueba y el sistema le da su número único B#### y a cada
// pieza su C####. "En test" y "Testeado" se ponen solos con lo que trae Meta. Nada de esto toca Meta: los nombres los
// pone el dueño, y "Copiar encargo" solo copia el texto para el editor.
// Paso 5a: los editores tienen sus pantallas (Mis encargos y Encargos del equipo); aquí el dueño ve quién tiene cada
// encargo y sus entregas, y también asigna y revisa (las entregas del editor líder, solo aquí).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Paper,
    Stack, TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import {
    AddRounded, ArrowDownwardRounded, ArrowUpwardRounded, CheckRounded, ContentCopyRounded, DeleteOutlineRounded, EditRounded, ExpandLessRounded,
    ExpandMoreRounded, InsightsRounded, SwapHorizRounded, AutoAwesomeRounded, OpenInNewRounded, RateReviewRounded,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime, fmt } from "../../components/meta-ads/metaAds";
import { AssignButton, DeliveriesList, ReviewDialog } from "../../components/meta-ads/editorWork";
import { EditorFields, EditorOption, dueLabel } from "../../components/meta-ads/editorShared";

type Status = "proposed" | "approved" | "production" | "review" | "bank" | "testing" | "tested" | "discarded";
type Piece = { id?: number; code?: string | null; change: string | null; format: string | null; link?: string | null; hook?: string | null };
type Verdict = { city: string | null; key: string; label: string };
type Batch = {
    id: number; code: string | null; product_id: number; product: string; status: Status; status_label: string; status_at: string | null; status_by: string | null;
    position: number | null; source: string; kind: string; angle_code: string | null; angle_name: string | null; concept: string | null; hypothesis: string | null;
    audience: string | null; reference_id: number | null; reference: string | null; city_id: number | null; city: string | null; format: string | null;
    keep: string | null; offer: string | null; deliverables: string | null; urgency: number | null; due_date: string | null; approved_at: string | null;
    approved_by: string | null; discard_reason: string | null; testing_at: string | null; tested_at: string | null;
    result: { verdicts: Verdict[]; spend: number; purchases: number; cpa: number | null } | null; learning: string | null; pieces: Piece[];
    meta_names: { adset: string | null; ads: string[] }; brief: string;
} & EditorFields;
type ProductRow = {
    id: number; name: string; active_campaigns: number; bank: number; ready: number;
    urgency: { level: number; label: string; to_order: string; needed: string } | null;
};
type Data = {
    batches: Batch[]; products: ProductRow[];
    settings: { batch_pieces: number; due_days: number; bank_min: number; bank_max: number; video_editors: number; capacity: number };
    statuses: Record<Status, string>; kinds: Record<string, string>; formats: Record<string, string>;
    last_run: { at: string; created: number; replaced: number; learnings: number; status: "ok" | "example" | "no_ai" | "error" | "nothing"; model: string | null; error: string | null } | null;
    editors: EditorOption[];
    landing_tests?: { product_id: number; code: string | null; landing: string | null; published_at: string | null; max_days: number }[];
};
const RUN_STATUS: Record<string, string> = { ok: "redactados por la IA", example: "con una plantilla (en esta PC no hay IA)", no_ai: "con una plantilla (la IA no está configurada)",
    error: "con una plantilla (la IA falló)" };
type Options = {
    angles: { code: string; name: string | null; hypothesis: string | null }[];
    creatives: { id: number; label: string; status: string | null; angle_code: string | null; batch_code: string | null }[];
    cities: { id: number; name: string }[]; price: number | null;
};
type Form = {
    product_id: number | ""; kind: string; angle_code: string; concept: string; hypothesis: string; audience: string; reference_creative_id: number | "";
    learning_city_id: number | ""; format: string; keep: string; offer: string; deliverables: string; due_date: string; learning: string; pieces: Piece[];
};

const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const STATUS_COLOR: Record<Status, "default" | "info" | "primary" | "secondary" | "success" | "warning" | "error"> = {
    proposed: "default", approved: "info", production: "primary", review: "secondary", bank: "success", testing: "warning", tested: "success", discarded: "default",
};
const VERDICT_COLOR: Record<string, "success" | "warning" | "error" | "default"> = { proven: "success", promising: "success", intermediate: "warning", failing: "warning", loser: "error" };
const URGENCY_COLOR: Record<number, "error" | "warning" | "success" | "default"> = { 1: "error", 2: "warning", 3: "success", 4: "default", 5: "default" };
const QUEUE: Status[] = ["approved", "production", "review"];
const MANUAL: Status[] = ["approved", "production", "review", "bank", "testing", "tested", "discarded"];

/** Lo mismo que QueueRules::canMove del servidor. */
const canMove = (from: Status, to: Status, numbered: boolean) => {
    if (from === to || (to === "proposed" && numbered)) return false;
    if (from === "proposed") return to === "discarded";
    if (from === "discarded") return to === (numbered ? "approved" : "proposed");
    return to !== "proposed";
};

const emptyForm = (pieces: number, productId: number | "" = ""): Form => ({
    product_id: productId, kind: "iteration", angle_code: "", concept: "", hypothesis: "", audience: "", reference_creative_id: "", learning_city_id: "",
    format: "video", keep: "", offer: "", deliverables: "", due_date: "", learning: "", pieces: Array.from({ length: pieces }, () => ({ change: "", format: null })),
});

const fromBatch = (b: Batch): Form => ({
    product_id: b.product_id, kind: b.kind, angle_code: b.angle_code ?? "", concept: b.concept ?? "", hypothesis: b.hypothesis ?? "", audience: b.audience ?? "",
    reference_creative_id: b.reference_id ?? "", learning_city_id: b.city_id ?? "", format: b.format ?? "", keep: b.keep ?? "", offer: b.offer ?? "",
    deliverables: b.deliverables ?? "", due_date: b.due_date ?? "", learning: b.learning ?? "", pieces: b.pieces.map((p) => ({ ...p })),
});

const BatchDialog: React.FC<{ data: Data; batch: Batch | null; open: boolean; onClose: () => void; onSaved: (b: Batch) => void }> = ({ data, batch, open, onClose, onSaved }) => {
    const theme = useTheme();
    const phone = useMediaQuery(theme.breakpoints.down("sm"));
    const [form, setForm] = useState<Form>(emptyForm(data.settings.batch_pieces));
    const [options, setOptions] = useState<Options | null>(null);
    const [saving, setSaving] = useState(false);
    const closed = batch?.status === "tested" || batch?.status === "discarded";

    const [custom, setCustom] = useState(false); // un código de ángulo que todavía no está en el diccionario
    useEffect(() => { if (open) { setForm(batch ? fromBatch(batch) : emptyForm(data.settings.batch_pieces)); setCustom(false); } }, [open, batch, data.settings.batch_pieces]);
    useEffect(() => {
        if (!open || form.product_id === "") { setOptions(null); return; }
        api<Options>(`/meta/queue/options?product_id=${form.product_id}`).then((o) => {
            setOptions(o);
            setForm((f) => { setCustom(!!f.angle_code && !o.angles.some((a) => a.code === f.angle_code)); return f; });
            if (!batch && o.price !== null) setForm((f) => (f.offer ? f : { ...f, offer: `Precio ${fmt.money(o.price)}` }));
        }).catch((e) => toast.error(e.message));
    }, [open, form.product_id, batch]);

    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
    const setPiece = (i: number, p: Partial<Piece>) => setForm((f) => ({ ...f, pieces: f.pieces.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
    const save = async () => {
        setSaving(true);
        const body = closed ? { learning: form.learning || null } : {
            ...(batch ? {} : { product_id: form.product_id }), kind: form.kind, angle_code: form.angle_code || null, concept: form.concept || null,
            hypothesis: form.hypothesis || null, audience: form.audience || null, reference_creative_id: form.reference_creative_id || null,
            learning_city_id: form.learning_city_id || null, format: form.format || null, keep: form.keep || null, offer: form.offer || null,
            deliverables: form.deliverables || null, due_date: form.due_date || null, ...(batch ? { learning: form.learning || null } : {}),
            pieces: form.pieces.map((p) => ({ id: p.id ?? null, change: p.change || null, format: p.format || null })),
        };
        try {
            const r = await api<{ batch: Batch }>(batch ? `/meta/queue/${batch.id}` : "/meta/queue", batch ? "PUT" : "POST", body);
            onSaved(r.batch);
            onClose();
            toast.success(batch ? "Encargo guardado" : "Encargo creado: queda para aprobar");
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    const field = (label: string, k: keyof Form, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
        <TextField size="small" label={label} value={form[k] as string} onChange={(e) => set(k, e.target.value as never)} fullWidth {...extra} />
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={phone}>
            <DialogTitle>{batch ? `Encargo ${batch.code ?? "(sin aprobar)"} · ${batch.product}` : "Nuevo encargo"}</DialogTitle>
            <DialogContent>
                {closed ? (
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">De un encargo {batch?.status_label.toLowerCase()} solo se cambia el aprendizaje.</Typography>
                        {field("Aprendizaje", "learning", { multiline: true, minRows: 3, inputProps: { maxLength: 2000 } })}
                    </Stack>
                ) : (
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField select size="small" label="Producto" value={form.product_id} disabled={!!batch} fullWidth
                                onChange={(e) => setForm({ ...emptyForm(data.settings.batch_pieces, Number(e.target.value)), kind: form.kind, format: form.format })}>
                                {data.products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                            </TextField>
                            <TextField select size="small" label="Tipo" value={form.kind} onChange={(e) => set("kind", e.target.value)} fullWidth>
                                {Object.entries(data.kinds).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                            </TextField>
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField select size="small" label="Ángulo" value={custom ? "__new" : form.angle_code}
                                onChange={(e) => { setCustom(e.target.value === "__new"); set("angle_code", e.target.value === "__new" ? "" : e.target.value); }} fullWidth disabled={!options}>
                                <MenuItem value="">Sin ángulo</MenuItem>
                                {options?.angles.map((a) => <MenuItem key={a.code} value={a.code}>{a.code}{a.name ? ` · ${a.name}` : ""}</MenuItem>)}
                                <MenuItem value="__new">Otro (código nuevo)…</MenuItem>
                            </TextField>
                            {custom && field("Código del ángulo nuevo", "angle_code", {
                                inputProps: { maxLength: 20 }, helperText: "Solo letras y números; va en el nombre de Meta.",
                                onChange: (e) => set("angle_code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")),
                            })}
                        </Stack>
                        {field("Hipótesis", "hypothesis", { multiline: true, minRows: 2, inputProps: { maxLength: 2000 },
                            placeholder: options?.angles.find((a) => a.code === form.angle_code)?.hypothesis ?? "Qué crees que va a pasar y por qué" })}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            {field("Concepto", "concept", { inputProps: { maxLength: 120 } })}
                            {field("Dolor o público", "audience", { inputProps: { maxLength: 255 } })}
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField select size="small" label="Creativo de referencia" value={form.reference_creative_id} fullWidth disabled={!options}
                                onChange={(e) => set("reference_creative_id", e.target.value === "" ? "" : Number(e.target.value))}>
                                <MenuItem value="">Ninguno</MenuItem>
                                {options?.creatives.map((c) => <MenuItem key={c.id} value={c.id}>{c.label}{c.status ? ` · ${c.status}` : ""}</MenuItem>)}
                            </TextField>
                            <TextField select size="small" label="Ciudad de aprendizaje" value={form.learning_city_id} fullWidth disabled={!options}
                                onChange={(e) => set("learning_city_id", e.target.value === "" ? "" : Number(e.target.value))}>
                                <MenuItem value="">Sin elegir</MenuItem>
                                {options?.cities.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </TextField>
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField select size="small" label="Formato" value={form.format} onChange={(e) => set("format", e.target.value)} fullWidth>
                                <MenuItem value="">Sin elegir</MenuItem>
                                {Object.entries(data.formats).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                            </TextField>
                            {field("Oferta", "offer", { inputProps: { maxLength: 255 } })}
                            {field("Plazo", "due_date", { type: "date", InputLabelProps: { shrink: true },
                                helperText: batch?.code ? undefined : `Si lo dejas vacío: ${data.settings.due_days} día(s) después de aprobar` })}
                        </Stack>
                        {field("Qué se conserva", "keep", { multiline: true, minRows: 2, inputProps: { maxLength: 2000 }, placeholder: "Por ejemplo: el cuerpo del video, la promesa y el cierre" })}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Piezas: qué cambia en cada una</Typography>
                            <Stack spacing={1}>
                                {form.pieces.map((p, i) => (
                                    <Stack key={p.id ?? `n${i}`} direction="row" spacing={1} alignItems="flex-start">
                                        <Chip size="small" label={p.code ?? `${i + 1}`} sx={{ mt: 1, minWidth: 56 }} />
                                        <TextField size="small" value={p.change ?? ""} onChange={(e) => setPiece(i, { change: e.target.value })} fullWidth multiline
                                            placeholder={i === 0 ? "Por ejemplo: hook 1, con la pregunta del dolor" : ""} inputProps={{ maxLength: 1000, "aria-label": `Pieza ${i + 1}` }} />
                                        <Tooltip title={p.code ? "Ya tiene su número: no se quita" : "Quitar la pieza"}>
                                            <span>
                                                <IconButton size="small" disabled={!!p.code || form.pieces.length <= 1} aria-label="Quitar la pieza"
                                                    onClick={() => setForm((f) => ({ ...f, pieces: f.pieces.filter((_, j) => j !== i) }))}>
                                                    <DeleteOutlineRounded fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                ))}
                            </Stack>
                            <Button size="small" startIcon={<AddRounded />} disabled={form.pieces.length >= 10} sx={{ mt: 1 }}
                                onClick={() => setForm((f) => ({ ...f, pieces: [...f.pieces, { change: "", format: null }] }))}>Agregar pieza</Button>
                        </Box>
                        {field("Entregables", "deliverables", { multiline: true, minRows: 2, inputProps: { maxLength: 2000 }, placeholder: "Por ejemplo: 3 videos 9:16 de 20–30 s" })}
                        {batch && field("Aprendizaje", "learning", { multiline: true, minRows: 2, inputProps: { maxLength: 2000 } })}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || form.product_id === ""}>{saving ? "Guardando…" : "Guardar"}</Button>
            </DialogActions>
        </Dialog>
    );
};

const BatchCard: React.FC<{
    b: Batch; data: Data; onEdit: () => void; onChanged: (b: Batch) => void; move?: { up?: () => void; down?: () => void };
}> = ({ b, data, onEdit, onChanged, move }) => {
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const [discard, setDiscard] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [manualCopy, setManualCopy] = useState(false);
    const [review, setReview] = useState(false);
    const numbered = b.code !== null;
    const pending = b.deliveries.find((d) => d.review === "pending") ?? null;
    const targets = (numbered ? MANUAL : (["discarded", "proposed"] as Status[])).filter((s) => canMove(b.status, s, numbered))
        .filter((s) => !(b.status === "review" && pending) || s === "bank" || s === "discarded");

    const setStatus = async (status: Status, why?: string) => {
        setBusy(true);
        try {
            const r = await api<{ batch: Batch }>(`/meta/queue/${b.id}/status`, "PUT", { status, reason: why ?? null });
            onChanged(r.batch);
            toast.success(`${b.code ?? "Encargo"}: ${r.batch.status_label}`);
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    const approve = async () => {
        setBusy(true);
        try {
            const r = await api<{ batch: Batch }>(`/meta/queue/${b.id}/approve`, "POST");
            onChanged(r.batch);
            toast.success(`Aprobado: ${r.batch.code}`);
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    // Si el navegador no deja copiar solo (algunos teléfonos), se muestra el texto seleccionado para copiarlo a mano
    const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(b.brief) : Promise.reject(new Error("sin portapapeles")))
        .then(() => toast.success("Encargo copiado")).catch(() => setManualCopy(true));

    return (
        <Box sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color={numbered ? "primary" : "default"} variant={numbered ? "filled" : "outlined"} label={b.code ?? "Sin número"} sx={{ fontWeight: 700 }} />
                <Typography variant="body2" fontWeight={700}>{b.product}</Typography>
                <Chip size="small" variant="outlined" label={data.kinds[b.kind] ?? b.kind} />
                {b.angle_code && <Chip size="small" variant="outlined" label={b.angle_name ? `${b.angle_code} · ${b.angle_name}` : b.angle_code} />}
                <Chip size="small" color={STATUS_COLOR[b.status]} label={b.status_label} />
                {b.source === "rules" && <Chip size="small" variant="outlined" color="secondary" label="Propuesto por tus reglas" />}
                {b.urgency && <Chip size="small" color={URGENCY_COLOR[b.urgency]} variant="outlined" label={`U${b.urgency}`} />}
                {numbered && QUEUE.includes(b.status) && (
                    <Chip size="small" variant="outlined" color={b.editor ? "default" : "warning"} label={b.editor ? `Editor: ${b.editor}` : "Sin editor"} />
                )}
                {b.overdue && <Chip size="small" color="error" label={`Atrasado (era para el ${dueLabel(b.due_date)})`} />}
                {b.returned && <Chip size="small" color="warning" variant="outlined" label={`Devuelto (${b.returned.version})`} />}
                {pending && <Chip size="small" color="secondary" label={`${pending.version} por revisar`} />}
            </Stack>
            {b.hypothesis && <Typography variant="body2" sx={{ mt: 0.75, overflowWrap: "anywhere" }}><b>Hipótesis:</b> {b.hypothesis}</Typography>}
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
                {[b.reference && `Referencia: ${b.reference}`, b.city && `Ciudad: ${b.city}`, b.format && data.formats[b.format], b.due_date && `Plazo: ${b.due_date}`,
                    b.status_at && `${b.status_label} ${dateTime(b.status_at)}${b.status_by ? ` por ${b.status_by}` : b.status === "testing" || b.status === "tested" ? " (solo)" : ""}`]
                    .filter(Boolean).join(" · ")}
            </Typography>
            {b.pieces.length > 0 && (
                <Box component="ol" sx={{ m: 0, mt: 0.75, pl: 2.5 }}>
                    {b.pieces.map((p, i) => (
                        <Typography key={p.id ?? i} component="li" variant="body2" sx={{ overflowWrap: "anywhere" }}>
                            {p.code && <b>{p.code} </b>}{p.change || <span style={{ opacity: 0.6 }}>sin detalle</span>}
                            {p.link && <> · <a href={p.link} target="_blank" rel="noopener noreferrer">video <OpenInNewRounded sx={{ fontSize: 12, verticalAlign: "middle" }} /></a></>}
                        </Typography>
                    ))}
                </Box>
            )}
            {b.meta_names.adset && (
                <Typography variant="caption" component="div" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
                    Nombres en Meta: <b>{b.meta_names.adset}</b>{b.meta_names.ads.length > 0 && <> · {b.meta_names.ads.join(", ")}</>}
                </Typography>
            )}
            {b.result && (
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                    {b.result.verdicts.map((v, i) => <Chip key={i} size="small" color={VERDICT_COLOR[v.key] ?? "default"} label={`${v.city ?? "Meta"}: ${v.label}`} />)}
                    <Typography variant="caption" color="text.secondary">
                        Gasto {fmt.money(b.result.spend)} · {fmt.num(b.result.purchases)} compras · CPA {fmt.money(b.result.cpa)}
                    </Typography>
                </Stack>
            )}
            {b.learning && <Typography variant="body2" sx={{ mt: 0.5 }}><b>Aprendizaje:</b> {b.learning}</Typography>}
            {b.discard_reason && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}><b>Descartado:</b> {b.discard_reason}</Typography>}
            <DeliveriesList deliveries={b.deliveries} />
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {b.status === "proposed" && (
                    <Button size="small" variant="contained" startIcon={busy ? <CircularProgress size={14} /> : <CheckRounded />} disabled={busy} onClick={approve}>Aprobar</Button>
                )}
                {b.can.review && (
                    <Button size="small" variant="contained" color="secondary" startIcon={<RateReviewRounded />} onClick={() => setReview(true)}>Revisar entrega</Button>
                )}
                {b.can.assign && (
                    <AssignButton<Batch> editors={data.editors} current={b.editor_id} url={`/meta/queue/${b.id}/editor`} allowNone={b.status === "approved"} onDone={onChanged} />
                )}
                <Button size="small" startIcon={<EditRounded />} onClick={onEdit}>{b.status === "tested" || b.status === "discarded" ? "Aprendizaje" : "Editar"}</Button>
                <Button size="small" startIcon={<ContentCopyRounded />} onClick={copy}>Copiar encargo</Button>
                {targets.length > 0 && (
                    <Button size="small" startIcon={<SwapHorizRounded />} disabled={busy} onClick={(e) => setMenu(e.currentTarget)}>Cambiar estado</Button>
                )}
                {move && (
                    <>
                        <IconButton size="small" aria-label="Subir en la cola" disabled={!move.up} onClick={move.up}><ArrowUpwardRounded fontSize="small" /></IconButton>
                        <IconButton size="small" aria-label="Bajar en la cola" disabled={!move.down} onClick={move.down}><ArrowDownwardRounded fontSize="small" /></IconButton>
                    </>
                )}
            </Stack>
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                {targets.map((s) => (
                    <MenuItem key={s} onClick={() => { setMenu(null); if (s === "discarded") { setReason(""); setDiscard(true); } else setStatus(s); }}>
                        {data.statuses[s]}
                    </MenuItem>
                ))}
            </Menu>
            <ReviewDialog<Batch> open={review} title={b.code ?? "el encargo"} delivery={pending} url={`/meta/queue/${b.id}/review`} onClose={() => setReview(false)} onDone={onChanged} />
            <Dialog open={manualCopy} onClose={() => setManualCopy(false)} fullWidth maxWidth="sm">
                <DialogTitle>Copia el encargo</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>El navegador no dejó copiarlo solo: el texto ya está seleccionado, cópialo (Ctrl+C o mantener apretado).</Typography>
                    <TextField value={b.brief} fullWidth multiline minRows={6} InputProps={{ readOnly: true }} autoFocus onFocus={(e) => e.target.select()} />
                </DialogContent>
                <DialogActions><Button onClick={() => setManualCopy(false)}>Listo</Button></DialogActions>
            </Dialog>
            <Dialog open={discard} onClose={() => setDiscard(false)} fullWidth maxWidth="sm">
                <DialogTitle>Descartar {b.code ?? "el encargo"}</DialogTitle>
                <DialogContent>
                    <TextField label="¿Por qué se descarta?" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1 }} inputProps={{ maxLength: 255 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDiscard(false)}>Cancelar</Button>
                    <Button color="error" variant="contained" disabled={!reason.trim()} onClick={() => { setDiscard(false); setStatus("discarded", reason.trim()); }}>Descartar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export const MetaQueuePage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [editing, setEditing] = useState<{ batch: Batch | null } | null>(null);
    const [history, setHistory] = useState(false);
    const [proposing, setProposing] = useState(false);

    const load = useCallback(() => { api<Data>("/meta/queue").then(setData).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const byStatus = useMemo(() => {
        const list = data?.batches ?? [];
        return {
            proposed: list.filter((b) => b.status === "proposed"),
            queue: list.filter((b) => QUEUE.includes(b.status)).sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9) || a.id - b.id),
            bank: list.filter((b) => b.status === "bank"),
            testing: list.filter((b) => b.status === "testing"),
            closed: list.filter((b) => b.status === "tested" || b.status === "discarded").sort((a, b) => (b.status_at ?? "").localeCompare(a.status_at ?? "")),
        };
    }, [data]);

    const propose = async () => {
        setProposing(true);
        try {
            const r = await api<{ run: { created: number } }>("/meta/queue/propose", "POST");
            toast.success(r.run.created ? `${r.run.created} encargos nuevos para aprobar` : "No falta ningún encargo hoy");
            load();
        } catch (e) { toast.error((e as Error).message); } finally { setProposing(false); }
    };
    // Después de guardar o mover uno, se vuelve a leer todo (la banca de cada producto cambia)
    const changed = () => load();
    const reorder = async (i: number, dir: -1 | 1) => {
        const ids = byStatus.queue.map((b) => b.id);
        [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
        try { await api("/meta/queue/order", "PUT", { ids }); load(); } catch (e) { toast.error((e as Error).message); }
    };

    if (loadingSession || !isValid || !data) return <Loading />;
    const section = (title: string, help: string, list: Batch[], empty: string, withMove = false) => (
        <Paper elevation={0} sx={card}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                <Typography variant="caption" color="text.secondary">{list.length}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">{help}</Typography>
            {list.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{empty}</Typography>
                : list.map((b, i) => (
                    <BatchCard key={b.id} b={b} data={data} onEdit={() => setEditing({ batch: b })} onChanged={changed}
                        move={withMove ? { up: i > 0 ? () => reorder(i, -1) : undefined, down: i < list.length - 1 ? () => reorder(i, 1) : undefined } : undefined} />
                ))}
        </Paper>
    );
    const s = data.settings;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: "auto" }}>
                <DescripcionDeVista title="Cola y banca" backPath="/meta-ads"
                    description="Los encargos de creativos de cada producto: tus reglas los proponen cada mañana y la IA los redacta; los apruebas, el sistema les da su número único (B#### y C####), el editor líder los reparte y revisa, y pasan solos a En test y Testeado cuando aparecen en Meta. Nada de esto cambia Meta." />
                {(data.landing_tests ?? []).length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <b>Tests de landing en curso</b> (nunca creativo y landing a la vez):{" "}
                        {data.landing_tests!.map((t) => `${t.code} en ${data.products.find((p) => p.id === t.product_id)?.name ?? "el producto"} (${t.landing ?? "landing"}) desde el ${dateTime(t.published_at)}`).join("; ")}.
                        {" "}No cambies los anuncios que llevan a esa landing; los batches nuevos van en su propio ad set.
                    </Alert>
                )}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        {s.video_editors} {s.video_editors === 1 ? "editor" : "editores"} de video: ≈{Math.max(1, Math.round(s.capacity))} batches nuevos por día. Banca por producto: {s.bank_min}–{s.bank_max}.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<InsightsRounded />} component={RouterLink} to="/meta-ads/analisis">Análisis del día</Button>
                        <Button size="small" variant="outlined" startIcon={proposing ? <CircularProgress size={14} /> : <AutoAwesomeRounded />} disabled={proposing} onClick={propose}>
                            {proposing ? "Proponiendo…" : "Proponer ahora"}
                        </Button>
                        <Button size="small" variant="contained" startIcon={<AddRounded />} onClick={() => setEditing({ batch: null })}>Nuevo encargo</Button>
                    </Stack>
                </Stack>
                {data.last_run && (
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
                        Última propuesta de tus reglas: {dateTime(data.last_run.at)} · {data.last_run.status === "nothing" ? "no faltaba ningún encargo"
                            : `${data.last_run.created} ${data.last_run.created === 1 ? "encargo" : "encargos"} ${RUN_STATUS[data.last_run.status] ?? ""}`}
                        {data.last_run.replaced > 0 ? ` · ${data.last_run.replaced} de días anteriores reemplazados` : ""}
                        {data.last_run.learnings > 0 ? ` · ${data.last_run.learnings} aprendizajes escritos` : ""}. Se propone sola cada mañana a las 7:00.
                    </Typography>
                )}
                {data.last_run?.status === "error" && data.last_run.error && <Alert severity="warning" sx={{ mb: 1.5 }}>{data.last_run.error}</Alert>}
                <Stack spacing={2}>
                    <Paper elevation={0} sx={card}>
                        <Typography variant="subtitle1" fontWeight="bold">La banca de cada producto</Typography>
                        <Typography variant="caption" color="text.secondary">Banca = aprobados sin testear. "Pedir" ya resta lo que hay en la banca.</Typography>
                        {data.products.filter((p) => p.active_campaigns > 0 || p.bank > 0).length === 0
                            ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No hay productos con campañas activas.</Typography>
                            : data.products.filter((p) => p.active_campaigns > 0 || p.bank > 0).map((p) => (
                                <Stack key={p.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ py: 0.75, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                                    <Typography variant="body2" fontWeight={700} sx={{ minWidth: 140 }}>{p.name}</Typography>
                                    {p.urgency && <Chip size="small" color={URGENCY_COLOR[p.urgency.level]} variant="outlined" label={p.urgency.label} />}
                                    <Chip size="small" color={p.bank >= s.bank_min ? "success" : "default"} label={`En banca: ${p.bank}${p.ready ? ` (${p.ready} listos)` : ""}`} />
                                    {p.urgency && <Typography variant="caption" color="text.secondary">Pedir: <b>{p.urgency.to_order}</b>{p.urgency.needed !== p.urgency.to_order ? ` (pedía ${p.urgency.needed})` : ""}</Typography>}
                                </Stack>
                            ))}
                    </Paper>
                    {byStatus.proposed.length > 0 || byStatus.queue.length + byStatus.bank.length + byStatus.testing.length + byStatus.closed.length > 0 ? null
                        : <Alert severity="info">Todavía no hay encargos. Tus reglas los proponen cada mañana a las 7:00 ("Proponer ahora" para no esperar), o crea uno con "Nuevo encargo".</Alert>}
                    {section("Para aprobar", "Al aprobar, el sistema le da su número y entra al final de la cola.", byStatus.proposed, "Nada para aprobar.")}
                    {section("En la cola", "Aprobados, en producción o en revisión, en el orden en que se hacen. Las entregas del editor líder las revisas tú.", byStatus.queue, "La cola está vacía.", true)}
                    {section("En banca", "Listos para lanzar: \"Copiar encargo\" trae el enlace de cada video. Cuando aparece en Meta un ad set con su número, pasa solo a En test.", byStatus.bank, "Nada en banca.")}
                    {section("En test", "Ya están en Meta. Cuando tus reglas les dan un veredicto en cada ciudad, pasan solos a Testeado.", byStatus.testing, "Nada en test.")}
                    <Paper elevation={0} sx={card}>
                        <Button size="small" onClick={() => setHistory(!history)} endIcon={history ? <ExpandLessRounded /> : <ExpandMoreRounded />} sx={{ textTransform: "none", fontWeight: 700 }}>
                            Testeados y descartados ({byStatus.closed.length})
                        </Button>
                        <Collapse in={history}>
                            {byStatus.closed.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Todavía ninguno.</Typography>
                                : byStatus.closed.map((b) => <BatchCard key={b.id} b={b} data={data} onEdit={() => setEditing({ batch: b })} onChanged={changed} />)}
                        </Collapse>
                    </Paper>
                </Stack>
                <BatchDialog data={data} batch={editing?.batch ?? null} open={!!editing} onClose={() => setEditing(null)} onSaved={changed} />
            </Box>
        </Layout>
    );
};
