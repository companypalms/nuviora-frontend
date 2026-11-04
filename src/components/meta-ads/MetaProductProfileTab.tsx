// src/components/meta-ads/MetaProductProfileTab.tsx
// .64 (dueño, 2026-11-01): "la IA siempre debe tener un excelente contexto del producto que se está trabajando". La
// ficha de cada producto: qué es, para qué sirve, cómo funciona, lo que NO es, la información clave, las fotos y sus
// buyer personas. La lee la IA que escribe los encargos de los editores y las landings; sin ficha completa, no les
// escribe nada. Se llena aquí o se la pasa al asistente (texto, PDF o fotos), que deja una tarjeta para aprobar.
// .65: los ángulos de venta (del más fuerte al más débil) y la fase: "En testeo" pide 3 batches (1 por cada uno de los 3
// primeros ángulos; con 2 ángulos, 2 del más fuerte y 1 del otro; con 1, 2 batches) y "Iterar lo que funciona".
// .90: las fotos del producto (las ven los editores) y su documento de estrategia (solo el dueño), subidos al sistema.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, LinearProgress, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import {
    AddRounded, ArrowDownwardRounded, ArrowUpwardRounded, AutoAwesomeRounded, DeleteOutlineRounded, SaveRounded, UploadFileRounded,
} from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { api, dateTime } from "./metaAds";
import { TestingBox, TestingSummary } from "./productProfile";
import { ACCEPT, StoredFile, fileProblem, sendFile } from "./fileUpload";
import { FileView } from "./fileView";

type FieldKey = "what_it_is" | "benefits" | "mechanism" | "not_this" | "key_info" | "photos_url";
type PersonaKey = "name" | "who" | "pain" | "wants" | "objections";
type Persona = { id?: number | null; key: string } & Record<PersonaKey, string>;
type ApiPersona = { id: number } & Record<PersonaKey, string | null>;
type ProductRow = { id: number; name: string; active_campaigns: number; complete: boolean };
type Data = {
    products: ProductRow[]; product_id: number | null; profile?: Record<FieldKey, string | null>; personas?: ApiPersona[]; missing?: string[];
    updated?: { at: string | null; by: string | null; source: string } | null;
    /** .65 */
    phase?: Phase; phases?: Record<Phase, string>; angles?: { code: string; name: string | null; hypothesis: string | null; persona: string | null }[];
    testing?: TestingSummary | null; tested_angles?: string[];
    /** .100: el aviso si ya vende (el testeo pide hasta 3 batches juntos) */
    selling_warning?: string | null;
    /** .90 */
    files?: ProductFilesData;
};
type ProductFilesData = { on: boolean; photos: StoredFile[]; strategy: StoredFile[] };
type Phase = "testing" | "iterate";
type Angle = { key: string; code: string; name: string; hypothesis: string; persona: string };

const FIELDS: { key: FieldKey; label: string; placeholder: string; rows: number; max: number }[] = [
    { key: "what_it_is", label: "Qué es", placeholder: "En 1 o 2 frases. Por ejemplo: chaleco térmico reductor para hombre", rows: 2, max: 3000 },
    { key: "benefits", label: "Para qué sirve", placeholder: "Los resultados que promete, con las palabras del cliente", rows: 3, max: 3000 },
    { key: "mechanism", label: "Cómo funciona", placeholder: "Por qué funciona, en palabras sencillas", rows: 3, max: 3000 },
    { key: "not_this", label: "Lo que NO es y nunca se dice", placeholder: "Por ejemplo: no es para el frío; no cura enfermedades", rows: 2, max: 3000 },
    { key: "key_info", label: "Información clave", placeholder: "Tallas, colores, cómo se usa, cuánto tiempo, garantía, lo que trae…", rows: 3, max: 3000 },
    { key: "photos_url", label: "Fotos (link de la carpeta de Drive)", placeholder: "https://drive.google.com/…", rows: 1, max: 500 },
];
const PERSONA_FIELDS: { key: Exclude<PersonaKey, "name">; label: string; placeholder: string }[] = [
    { key: "who", label: "Quién es", placeholder: "Edad, sexo, a qué se dedica, cómo vive" },
    { key: "pain", label: "Qué le duele", placeholder: "Lo que le molesta, con sus palabras" },
    { key: "wants", label: "Qué quiere", placeholder: "Lo que quiere lograr" },
    { key: "objections", label: "Qué lo frena", placeholder: "Sus dudas o miedos para comprar" },
];
const MAX_PERSONAS = 8;
const MAX_ANGLES = 10;

/** Lo mismo que TestingRules::slots del servidor: los 3 batches del testeo, en palabras. */
const testingText = (codes: string[]): string => {
    const c = codes.filter(Boolean);
    const slots = c.length === 0 ? [] : c.length === 1 ? [c[0], c[0]] : c.length === 2 ? [c[0], c[0], c[1]] : c.slice(0, 3);
    if (!slots.length) return "sin ángulos todavía: el testeo no puede empezar";
    const count = new Map<string, number>();
    slots.forEach((s) => count.set(s, (count.get(s) ?? 0) + 1));
    const parts = [...count].map(([code, n]) => `${n} ${n === 1 ? "batch" : "batches"} de ${code}${n > 1 ? " (con conceptos o formatos distintos)" : ""}`);
    return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0];
};

let seq = 0;
const newKey = () => `p${++seq}`;
const toPersona = (p: ApiPersona): Persona => ({ id: p.id, key: `id${p.id}`, name: p.name ?? "", who: p.who ?? "", pain: p.pain ?? "", wants: p.wants ?? "", objections: p.objections ?? "" });
const emptyPersona = (): Persona => ({ id: null, key: newKey(), name: "", who: "", pain: "", wants: "", objections: "" });
const emptyProfile = (): Record<FieldKey, string> => ({ what_it_is: "", benefits: "", mechanism: "", not_this: "", key_info: "", photos_url: "" });
const emptyAngle = (): Angle => ({ key: newKey(), code: "", name: "", hypothesis: "", persona: "" });

/** .90: las fotos y el documento de estrategia del producto, en el sistema. Se guardan solos (no esperan "Guardar la ficha"). */
const ProductFiles: React.FC<{ productId: number; files?: ProductFilesData; onChange: (f: ProductFilesData) => void }> = ({ productId, files, onChange }) => {
    const [progress, setProgress] = useState<{ kind: "photo" | "strategy"; name: string; percent: number } | null>(null);
    if (!files) return null;
    const upload = async (kind: "photo" | "strategy", list: FileList | null) => {
        for (const file of Array.from(list ?? [])) {
            const problem = fileProblem(kind, file);
            if (problem) { toast.error(problem); continue; }
            setProgress({ kind, name: file.name, percent: 0 });
            try {
                const r = await sendFile<{ files: ProductFilesData }>(`/meta/product-profiles/${productId}/files`, { kind }, file, (id) => `/meta/files/${id}/confirm`,
                    (percent) => setProgress({ kind, name: file.name, percent }));
                onChange(r.files);
            } catch (e) { toast.error((e as Error).message); }
        }
        setProgress(null);
    };
    const remove = async (f: StoredFile) => {
        if (!window.confirm(`¿Quitar "${f.name}" del producto? Se borra del sistema.`)) return;
        try { onChange((await api<{ files: ProductFilesData }>(`/meta/files/${f.id}`, "DELETE")).files); } catch (e) { toast.error((e as Error).message); }
    };
    const picker = (kind: "photo" | "strategy", label: string) => (
        <Button component="label" variant="outlined" startIcon={<UploadFileRounded />} disabled={!!progress} sx={{ mt: 1, minHeight: 40, textTransform: "none" }}>
            {label}
            <input hidden type="file" multiple={kind === "photo"} accept={ACCEPT[kind]} onChange={(e) => { upload(kind, e.target.files); e.target.value = ""; }} />
        </Button>
    );
    const bar = (kind: "photo" | "strategy") => (progress?.kind === kind ? (
        <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={progress.percent} />
            <Typography variant="caption" color="text.secondary">Subiendo {progress.name}… {progress.percent} %</Typography>
        </Box>
    ) : null);
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">Fotos y documento de estrategia</Typography>
            {!files.on ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                    Para subir las fotos y la estrategia aquí falta conectar el almacén de archivos (Cloudflare R2) en el servidor. Mientras tanto, pon arriba el link de la carpeta de Drive.
                </Alert>
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary">
                        Se guardan solos al subirlos (no hace falta "Guardar la ficha"). Las fotos las ven los editores en cada encargo de este producto; el documento de estrategia, solo tú. Si se los pasas a tu asistente con la ficha, también se guardan solos.
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ mt: 1.5 }}>Fotos ({files.photos.length})</Typography>
                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {files.photos.map((f) => (
                            <Box key={f.id} sx={{ width: 112 }}>
                                {f.url && <Box component="img" src={f.url} alt={f.name} loading="lazy" sx={{ width: 112, height: 112, objectFit: "cover", borderRadius: 1.5, display: "block" }} />}
                                <Button size="small" startIcon={<DeleteOutlineRounded fontSize="small" />} onClick={() => remove(f)} aria-label={`Quitar ${f.name}`}
                                    sx={{ minHeight: 40, width: "100%", textTransform: "none", color: "text.secondary" }}>Quitar</Button>
                            </Box>
                        ))}
                    </Stack>
                    {bar("photo")}
                    {picker("photo", "Subir fotos")}
                    <Typography variant="body2" fontWeight={700} sx={{ mt: 1.5 }}>Documento de estrategia (solo tú)</Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {files.strategy.map((f) => (
                            <Stack key={f.id} direction="row" spacing={1} alignItems="center">
                                <FileView file={f} />
                                <Button size="small" startIcon={<DeleteOutlineRounded fontSize="small" />} onClick={() => remove(f)} aria-label={`Quitar ${f.name}`}
                                    sx={{ minHeight: 40, textTransform: "none", color: "text.secondary" }}>Quitar</Button>
                            </Stack>
                        ))}
                        {files.strategy.length === 0 && <Typography variant="caption" color="text.secondary">Todavía no hay ninguno.</Typography>}
                    </Stack>
                    {bar("strategy")}
                    {picker("strategy", "Subir documento")}
                </>
            )}
        </Paper>
    );
};

export const MetaProductProfileTab: React.FC = () => {
    const [params] = useSearchParams();
    const [productId, setProductId] = useState<number | null>(() => Number(params.get("producto")) || null);
    const [data, setData] = useState<Data | null>(null);
    const [profile, setProfile] = useState(emptyProfile());
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [phase, setPhaseState] = useState<Phase>("iterate");
    const [angles, setAngles] = useState<Angle[]>([]);
    const [nexting, setNexting] = useState(false);

    const apply = useCallback((d: Data) => {
        setData(d);
        if (d.product_id) setProductId(d.product_id);
        const p = emptyProfile();
        (Object.keys(p) as FieldKey[]).forEach((k) => { p[k] = d.profile?.[k] ?? ""; });
        setProfile(p);
        setPersonas((d.personas ?? []).map(toPersona));
        setPhaseState(d.phase ?? "iterate");
        setAngles((d.angles ?? []).map((a) => ({ key: `a${a.code}`, code: a.code, name: a.name ?? "", hypothesis: a.hypothesis ?? "", persona: a.persona ?? "" })));
        setDirty(false);
    }, []);

    const load = useCallback((pid: number | null) => {
        api<Data>(`/meta/product-profiles${pid ? `?product_id=${pid}` : ""}`).then(apply).catch((e) => toast.error(e.message));
    }, [apply]);
    useEffect(() => { load(productId); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const choose = (pid: number) => {
        if (dirty && !window.confirm("Tienes cambios sin guardar en esta ficha. ¿Cambiar de producto igual?")) return;
        setProductId(pid);
        load(pid);
    };
    const setField = (k: FieldKey, v: string) => { setProfile((p) => ({ ...p, [k]: v })); setDirty(true); };
    const setPersona = (i: number, k: PersonaKey, v: string) => { setPersonas((list) => list.map((p, j) => (j === i ? { ...p, [k]: v } : p))); setDirty(true); };
    const setAngle = (i: number, k: Exclude<keyof Angle, "key">, v: string) => { setAngles((list) => list.map((a, j) => (j === i ? { ...a, [k]: v } : a))); setDirty(true); };
    const moveAngle = (i: number, dir: -1 | 1) => {
        setAngles((list) => { const next = [...list]; [next[i], next[i + dir]] = [next[i + dir], next[i]]; return next; });
        setDirty(true);
    };
    const nextRound = async () => {
        if (!productId) return;
        setNexting(true);
        try {
            apply(await api<Data>(`/meta/product-profiles/${productId}/next-round`, "POST"));
            toast.success("Empieza otra ronda de testeo: las reglas piden sus batches en la próxima propuesta");
        } catch (e) { toast.error((e as Error).message); } finally { setNexting(false); }
    };

    const save = async () => {
        if (!productId) return;
        setSaving(true);
        try {
            const d = await api<Data>(`/meta/product-profiles/${productId}`, "PUT", {
                profile: Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v.trim() || null])),
                personas: personas.map((p) => ({ id: p.id ?? null, name: p.name.trim() || null, who: p.who.trim() || null, pain: p.pain.trim() || null,
                    wants: p.wants.trim() || null, objections: p.objections.trim() || null })),
                phase,
                angles: angles.map((a) => ({ code: a.code.trim(), name: a.name.trim() || null, hypothesis: a.hypothesis.trim() || null, persona: a.persona || null })),
            });
            apply(d);
            toast.success(d.missing?.length ? "Ficha guardada (todavía incompleta)" : "Ficha guardada: la IA ya la usa");
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const product = data.products.find((p) => p.id === productId);
    // los ángulos de la ficha que el testeo todavía puede probar
    const untested = angles.map((a) => a.code.trim().toUpperCase()).filter((c) => c && !(data.tested_angles ?? []).includes(c));

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Lo que la IA tiene que saber de cada producto para escribir bien los encargos de los editores y las landings. <b>Sin la ficha completa, la IA no le
                propone encargos a ese producto.</b> El editor ve toda la ficha (sin precios): el producto, todos los buyer personas y todos los ángulos con de qué trata cada uno.
                No ve el orden de fuerza de los ángulos, lo que sabemos ni el documento de estrategia.
            </Typography>
            <Alert severity="info" icon={<AutoAwesomeRounded />}>
                También la puede llenar tu asistente: pásale toda la información del producto (escrita, en un PDF o en fotos) y te deja una tarjeta con la ficha completa para que la confirmes.
            </Alert>
            {data.products.length === 0 ? <Alert severity="info">Todavía no hay productos.</Alert> : (
                <TextField select size="small" label="Producto" value={productId ?? ""} onChange={(e) => choose(Number(e.target.value))} sx={{ maxWidth: 420 }}>
                    {data.products.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                            {p.name}{p.active_campaigns ? ` · ${p.active_campaigns} campañas activas` : ""}{p.complete ? " · ✓ ficha completa" : " · falta la ficha"}
                        </MenuItem>
                    ))}
                </TextField>
            )}
            {product && (
                <>
                    {data.missing && data.missing.length > 0
                        ? <Alert severity="warning">Le falta: <b>{data.missing.join(", ")}</b>. Mientras falte, la IA no escribe encargos ni landings de {product.name}.</Alert>
                        : <Alert severity="success">La ficha de {product.name} está completa: la IA la lee antes de escribir cada encargo.</Alert>}
                    {data.updated?.at && (
                        <Typography variant="caption" color="text.secondary">
                            Guardada {dateTime(data.updated.at)}{data.updated.by ? ` por ${data.updated.by}` : ""}{data.updated.source === "assistant" ? " (con tu asistente)" : ""}.
                        </Typography>
                    )}
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Fase</Typography>
                        <TextField select size="small" value={phase} onChange={(e) => { setPhaseState(e.target.value as Phase); setDirty(true); }} sx={{ mt: 1, minWidth: { sm: 260 }, width: { xs: "100%", sm: "auto" } }}
                            helperText={phase !== "testing"
                                ? "Las reglas piden iteraciones de lo que gana y no piden más de los ángulos que perdieron en un testeo."
                                : data.phase === "testing" ? "Abajo, en qué va el testeo."
                                    : "Al guardar empieza el testeo: " + testingText(untested)
                                        + ((data.tested_angles ?? []).length ? " (los ángulos que ya se probaron no se repiten)" : "")
                                        + (untested.length ? ". Los que ya están en la banca cuentan." : ".")}>
                            <MenuItem value="testing">En testeo (producto nuevo)</MenuItem>
                            <MenuItem value="iterate">Iterar lo que funciona</MenuItem>
                        </TextField>
                        {/* .100: un producto que ya vende normalmente va en "Iterar lo que funciona" */}
                        {phase === "testing" && data.phase !== "testing" && data.selling_warning && <Alert severity="warning" sx={{ mt: 1.5 }}>{data.selling_warning}</Alert>}
                        <TestingBox testing={data.testing} onNext={nextRound} busy={nexting} />
                    </Paper>
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>El producto</Typography>
                        <Stack spacing={1.5}>
                            {/* .91: con el almacén conectado, las fotos se suben abajo; el link de Drive solo si ya había uno */}
                            {FIELDS.filter((f) => f.key !== "photos_url" || !data.files?.on || profile.photos_url.trim() !== "").map((f) => (
                                <TextField key={f.key} size="small" label={f.label} value={profile[f.key]} onChange={(e) => setField(f.key, e.target.value)} fullWidth
                                    multiline={f.rows > 1} minRows={f.rows > 1 ? f.rows : undefined} placeholder={f.placeholder} inputProps={{ maxLength: f.max }}
                                    required={["what_it_is", "benefits", "mechanism"].includes(f.key)} />
                            ))}
                        </Stack>
                    </Paper>
                    {/* .91: las fotos y la estrategia, junto al producto (se guardan solas, sin "Guardar la ficha") */}
                    {productId && <ProductFiles productId={productId} files={data.files} onChange={(files) => setData((d) => (d ? { ...d, files } : d))} />}
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Buyer personas</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Un tipo de cliente por tarjeta. La IA elige a cuál le habla cada encargo; el editor los ve todos, con el de su encargo marcado. Hace falta al menos uno con quién es y qué le duele.
                        </Typography>
                        <Stack spacing={1.5}>
                            {personas.map((p, i) => (
                                <Box key={p.key} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                        <Chip size="small" label={i + 1} />
                                        <TextField size="small" label="Nombre" value={p.name} onChange={(e) => setPersona(i, "name", e.target.value)} fullWidth
                                            placeholder="Un nombre corto que lo describe" inputProps={{ maxLength: 80 }} required />
                                        <Tooltip title="Quitar este buyer persona (los encargos que ya le hablaban lo siguen mostrando)">
                                            <IconButton size="small" aria-label={`Quitar el buyer persona ${i + 1}`} onClick={() => { setPersonas((list) => list.filter((_, j) => j !== i)); setDirty(true); }}>
                                                <DeleteOutlineRounded fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    <Stack spacing={1}>
                                        {PERSONA_FIELDS.map((f) => (
                                            <TextField key={f.key} size="small" label={f.label} value={p[f.key]} onChange={(e) => setPersona(i, f.key, e.target.value)} fullWidth multiline
                                                placeholder={f.placeholder} inputProps={{ maxLength: 3000 }} required={f.key === "who" || f.key === "pain"} />
                                        ))}
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                        <Button size="small" startIcon={<AddRounded />} sx={{ mt: 1.5 }} disabled={personas.length >= MAX_PERSONAS}
                            onClick={() => { setPersonas((list) => [...list, emptyPersona()]); setDirty(true); }}>
                            Agregar buyer persona
                        </Button>
                    </Paper>
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Ángulos de venta</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Del más fuerte al más débil (ordénalos con las flechas). En el testeo se prueban los 3 primeros. El código es el que va en los nombres
                            de Meta (por ejemplo "B0123 GINE"). El editor ve la hipótesis como "de qué trata" el ángulo (sin precios); el orden, solo tú.
                        </Typography>
                        <Stack spacing={1.5}>
                            {angles.map((a, i) => (
                                <Box key={a.key} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                                        <Chip size="small" label={i + 1} />
                                        <Chip size="small" variant="outlined" color={i < 3 ? "primary" : "default"} label={i < 3 ? "Principal" : "De reserva"} />
                                        <Box sx={{ flex: 1 }} />
                                        <IconButton size="small" aria-label={`Subir el ángulo ${i + 1}`} disabled={i === 0} onClick={() => moveAngle(i, -1)}><ArrowUpwardRounded fontSize="small" /></IconButton>
                                        <IconButton size="small" aria-label={`Bajar el ángulo ${i + 1}`} disabled={i === angles.length - 1} onClick={() => moveAngle(i, 1)}><ArrowDownwardRounded fontSize="small" /></IconButton>
                                        <Tooltip title="Quitarlo de la ficha (sus anuncios en Meta no cambian)">
                                            <IconButton size="small" aria-label={`Quitar el ángulo ${i + 1}`} onClick={() => { setAngles((list) => list.filter((_, j) => j !== i)); setDirty(true); }}>
                                                <DeleteOutlineRounded fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    <Stack spacing={1}>
                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                            <TextField size="small" label="Código" value={a.code} required sx={{ maxWidth: { sm: 160 } }} fullWidth
                                                onChange={(e) => setAngle(i, "code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} inputProps={{ maxLength: 12 }} placeholder="GINE" />
                                            <TextField size="small" label="Nombre" value={a.name} required fullWidth onChange={(e) => setAngle(i, "name", e.target.value)} inputProps={{ maxLength: 120 }} />
                                        </Stack>
                                        <TextField select size="small" label="A qué buyer persona apunta" value={a.persona} fullWidth onChange={(e) => setAngle(i, "persona", e.target.value)}>
                                            <MenuItem value="">Ninguno en particular</MenuItem>
                                            {personas.filter((p) => p.name.trim()).map((p) => <MenuItem key={p.key} value={p.name.trim()}>{p.name.trim()}</MenuItem>)}
                                        </TextField>
                                        <TextField size="small" label='Hipótesis (el editor la ve como "de qué trata")' value={a.hypothesis} fullWidth multiline onChange={(e) => setAngle(i, "hypothesis", e.target.value)}
                                            inputProps={{ maxLength: 1000 }} placeholder="Por qué puede vender: qué dolor o deseo toca y por qué compraría" />
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                        <Button size="small" startIcon={<AddRounded />} sx={{ mt: 1.5 }} disabled={angles.length >= MAX_ANGLES}
                            onClick={() => { setAngles((list) => [...list, emptyAngle()]); setDirty(true); }}>
                            Agregar ángulo
                        </Button>
                    </Paper>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", position: "sticky", bottom: 8 }}>
                        <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRounded />} disabled={saving || !dirty} onClick={save}>
                            Guardar la ficha
                        </Button>
                    </Box>
                </>
            )}
        </Stack>
    );
};
