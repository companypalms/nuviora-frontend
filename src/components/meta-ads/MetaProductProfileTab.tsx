// src/components/meta-ads/MetaProductProfileTab.tsx
// .64 (dueño, 2026-11-01): "la IA siempre debe tener un excelente contexto del producto que se está trabajando". La
// ficha de cada producto: qué es, para qué sirve, cómo funciona, lo que NO es, la información clave, las fotos y sus
// buyer personas. La lee la IA que escribe los encargos de los editores y las landings; sin ficha completa, no les
// escribe nada. Se llena aquí o se la pasa al asistente (texto, PDF o fotos), que deja una tarjeta para aprobar.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { AddRounded, AutoAwesomeRounded, DeleteOutlineRounded, SaveRounded } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { api, dateTime } from "./metaAds";

type FieldKey = "what_it_is" | "benefits" | "mechanism" | "not_this" | "key_info" | "photos_url";
type PersonaKey = "name" | "who" | "pain" | "wants" | "objections";
type Persona = { id?: number | null; key: string } & Record<PersonaKey, string>;
type ApiPersona = { id: number } & Record<PersonaKey, string | null>;
type ProductRow = { id: number; name: string; active_campaigns: number; complete: boolean };
type Data = {
    products: ProductRow[]; product_id: number | null; profile?: Record<FieldKey, string | null>; personas?: ApiPersona[]; missing?: string[];
    updated?: { at: string | null; by: string | null; source: string } | null;
};

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

let seq = 0;
const newKey = () => `p${++seq}`;
const toPersona = (p: ApiPersona): Persona => ({ id: p.id, key: `id${p.id}`, name: p.name ?? "", who: p.who ?? "", pain: p.pain ?? "", wants: p.wants ?? "", objections: p.objections ?? "" });
const emptyPersona = (): Persona => ({ id: null, key: newKey(), name: "", who: "", pain: "", wants: "", objections: "" });
const emptyProfile = (): Record<FieldKey, string> => ({ what_it_is: "", benefits: "", mechanism: "", not_this: "", key_info: "", photos_url: "" });

export const MetaProductProfileTab: React.FC = () => {
    const [params] = useSearchParams();
    const [productId, setProductId] = useState<number | null>(() => Number(params.get("producto")) || null);
    const [data, setData] = useState<Data | null>(null);
    const [profile, setProfile] = useState(emptyProfile());
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const apply = useCallback((d: Data) => {
        setData(d);
        if (d.product_id) setProductId(d.product_id);
        const p = emptyProfile();
        (Object.keys(p) as FieldKey[]).forEach((k) => { p[k] = d.profile?.[k] ?? ""; });
        setProfile(p);
        setPersonas((d.personas ?? []).map(toPersona));
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

    const save = async () => {
        if (!productId) return;
        setSaving(true);
        try {
            const d = await api<Data>(`/meta/product-profiles/${productId}`, "PUT", {
                profile: Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v.trim() || null])),
                personas: personas.map((p) => ({ id: p.id ?? null, name: p.name.trim() || null, who: p.who.trim() || null, pain: p.pain.trim() || null,
                    wants: p.wants.trim() || null, objections: p.objections.trim() || null })),
            });
            apply(d);
            toast.success(d.missing?.length ? "Ficha guardada (todavía incompleta)" : "Ficha guardada: la IA ya la usa");
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const product = data.products.find((p) => p.id === productId);

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Lo que la IA tiene que saber de cada producto para escribir bien los encargos de los editores y las landings. <b>Sin la ficha completa, la IA no le
                propone encargos a ese producto.</b> El editor ve lo básico del producto y solo el buyer persona de su encargo, nunca la lista completa.
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
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>El producto</Typography>
                        <Stack spacing={1.5}>
                            {FIELDS.map((f) => (
                                <TextField key={f.key} size="small" label={f.label} value={profile[f.key]} onChange={(e) => setField(f.key, e.target.value)} fullWidth
                                    multiline={f.rows > 1} minRows={f.rows > 1 ? f.rows : undefined} placeholder={f.placeholder} inputProps={{ maxLength: f.max }}
                                    required={["what_it_is", "benefits", "mechanism"].includes(f.key)} />
                            ))}
                        </Stack>
                    </Paper>
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Buyer personas</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Un tipo de cliente por tarjeta. La IA elige a cuál le habla cada encargo y el editor solo ve ese. Hace falta al menos uno con quién es y qué le duele.
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
