// src/components/meta-ads/MetaAnglesTab.tsx
// Etapa 5, paso 1b (2026-10-30):
// - Ángulos: el diccionario de cada producto. El sistema junta los códigos de los nombres (FASP, NERV…), la IA propone el
//   nombre y la hipótesis leyendo el texto de los anuncios, y el dueño corrige, confirma, une dos códigos que son lo
//   mismo (FAS y FASP) o deshace la unión.
// - Modo de cada producto (normal, liquidación, pausado, abandonado): lo usan las reglas del análisis.
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { AutoAwesomeRounded, CheckRounded, EditRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api, dateTime, fmt } from "./metaAds";

type AngleProduct = { id: number; name: string; campaigns: number; active_campaigns: number };
type Angle = {
    id: number; code: string; name: string | null; hypothesis: string | null; status: "detected" | "proposed" | "confirmed";
    proposed_by: "ai" | "owner" | null; suggested_alias: string | null; confirmed_by: string | null; confirmed_at: string | null;
    aliases: { id: number; code: string }[]; ads: number; active_ads: number; creatives: number; last_ad: string | null;
    spend?: number; purchases: number; cpa: number | null; sample: string | null;
};
type AnglesData = { products: AngleProduct[]; product_id: number | null; angles: Angle[] };
type ProposeResult = { status: string; message?: string; updated?: number; example?: boolean; angles: Angle[] };

const STATUS: Record<Angle["status"], { label: string; color: "default" | "info" | "success" }> = {
    detected: { label: "Sin nombre", color: "default" },
    proposed: { label: "Por confirmar", color: "info" },
    confirmed: { label: "Confirmado", color: "success" },
};

const EditAngleDialog: React.FC<{ angle: Angle | null; others: Angle[]; onClose: () => void; onSave: (a: Angle, patch: Record<string, unknown>) => void }> = ({ angle, others, onClose, onSave }) => {
    const [name, setName] = useState("");
    const [hypothesis, setHypothesis] = useState("");
    const [aliasOf, setAliasOf] = useState<number | "">("");
    useEffect(() => { setName(angle?.name ?? ""); setHypothesis(angle?.hypothesis ?? ""); setAliasOf(""); }, [angle]);
    if (!angle) return null;
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Ángulo {angle.code}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 120 }} placeholder="Dolor de tobillo al caminar" fullWidth />
                    <TextField label="Hipótesis" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} inputProps={{ maxLength: 1000 }} multiline minRows={3} fullWidth
                        helperText="A quién le habla, qué dolor o deseo toca y por qué compraría." />
                    {others.length > 0 && (
                        <TextField select label="Es lo mismo que…" value={aliasOf} onChange={(e) => setAliasOf(e.target.value === "" ? "" : Number(e.target.value))} fullWidth
                            helperText={`Si eliges uno, ${angle.code} se une a ese ángulo y sus anuncios se cuentan juntos.`}>
                            <MenuItem value="">No, es un ángulo propio</MenuItem>
                            {others.map((o) => <MenuItem key={o.id} value={o.id}>{o.code}{o.name ? ` · ${o.name}` : ""}</MenuItem>)}
                        </TextField>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={() => onSave(angle, { name: name.trim() || null, hypothesis: hypothesis.trim() || null, ...(aliasOf !== "" ? { alias_of: aliasOf } : {}) })}>Guardar</Button>
                <Button variant="contained" onClick={() => onSave(angle, { name: name.trim() || null, hypothesis: hypothesis.trim() || null, confirm: true, ...(aliasOf !== "" ? { alias_of: aliasOf } : {}) })}
                    disabled={aliasOf === "" && !name.trim()}>Guardar y confirmar</Button>
            </DialogActions>
        </Dialog>
    );
};

const AngleCard: React.FC<{ a: Angle; byCode: Record<string, Angle>; onEdit: () => void; onPatch: (a: Angle, patch: Record<string, unknown>) => void; onSeparate: (id: number) => void }> = ({ a, byCode, onEdit, onPatch, onSeparate }) => {
    const suggested = a.suggested_alias ? byCode[a.suggested_alias] : undefined;
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="subtitle1" fontWeight={800}>{a.code}</Typography>
                {a.aliases.map((x) => (
                    <Chip key={x.id} size="small" variant="outlined" label={`también ${x.code}`} onDelete={() => onSeparate(x.id)} title={`Separar ${x.code}: pasa a ser un ángulo propio`} />
                ))}
                <Chip size="small" color={STATUS[a.status].color} label={a.status === "proposed" && a.proposed_by === "ai" ? "Propuesto por la IA" : STATUS[a.status].label} />
                <Box sx={{ flex: 1 }} />
                <Button size="small" startIcon={<EditRounded />} onClick={onEdit}>Editar</Button>
                {a.status !== "confirmed" && a.name && <Button size="small" variant="contained" startIcon={<CheckRounded />} onClick={() => onPatch(a, { confirm: true })}>Confirmar</Button>}
            </Stack>
            <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>{a.name ?? <Typography component="span" color="text.secondary">Todavía sin nombre</Typography>}</Typography>
            {a.hypothesis && <Typography variant="body2" sx={{ mt: 0.5 }}>{a.hypothesis}</Typography>}
            {suggested && (
                <Alert severity="info" sx={{ mt: 1 }} action={<Button size="small" onClick={() => onPatch(a, { alias_of: suggested.id })}>Unir</Button>}>
                    La IA cree que es lo mismo que <b>{suggested.code}</b>{suggested.name ? ` (${suggested.name})` : ""}.
                </Alert>
            )}
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                {a.active_ads} anuncios activos de {a.ads} · {a.creatives} creativos
                {" · 30 días: "}{a.spend !== undefined ? `gasto ${fmt.money(a.spend)} · ` : ""}{fmt.num(a.purchases)} compras{a.cpa !== null ? ` · CPA ${fmt.money(a.cpa)}` : ""}
                {a.status === "confirmed" && a.confirmed_by ? ` · confirmado por ${a.confirmed_by} ${dateTime(a.confirmed_at)}` : ""}
            </Typography>
            {a.sample && <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5, fontStyle: "italic", overflowWrap: "anywhere" }}>«{a.sample}»</Typography>}
        </Paper>
    );
};

export const MetaAnglesTab: React.FC = () => {
    const [productId, setProductId] = useState<number | null>(null);
    const [data, setData] = useState<AnglesData | null>(null);
    const [editing, setEditing] = useState<Angle | null>(null);
    const [proposing, setProposing] = useState(false);
    const [example, setExample] = useState(false);

    const load = useCallback(() => {
        api<AnglesData>(`/meta/angles${productId ? `?product_id=${productId}` : ""}`).then((d) => { setData(d); if (!productId && d.product_id) setProductId(d.product_id); })
            .catch((e) => toast.error(e.message));
    }, [productId]);
    useEffect(() => { load(); }, [load]);

    const patch = async (a: Angle, body: Record<string, unknown>) => {
        try {
            const r = await api<{ angles: Angle[] }>(`/meta/angles/${a.id}`, "PUT", body);
            setData((d) => d ? { ...d, angles: r.angles } : d);
            setEditing(null);
            toast.success(body.alias_of ? `${a.code} quedó unido` : body.confirm ? `${a.code} confirmado` : "Guardado");
        } catch (e) { toast.error((e as Error).message); }
    };
    const separate = async (id: number) => {
        try {
            const r = await api<{ angles: Angle[] }>(`/meta/angles/${id}`, "PUT", { alias_of: null });
            setData((d) => d ? { ...d, angles: r.angles } : d);
            toast.success("Separado: ahora es un ángulo propio");
        } catch (e) { toast.error((e as Error).message); }
    };
    const propose = async () => {
        if (!productId) return;
        setProposing(true);
        try {
            const r = await api<ProposeResult>("/meta/angles/propose", "POST", { product_id: productId });
            setData((d) => d ? { ...d, angles: r.angles } : d);
            setExample(!!r.example);
            if (r.status === "ok") toast.success(`La IA propuso ${r.updated} ${r.updated === 1 ? "ángulo" : "ángulos"}. Revísalos y confirma.`);
            else toast.info(r.message ?? "No hubo nada que proponer");
        } catch (e) { toast.error((e as Error).message); } finally { setProposing(false); }
    };

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const byCode = Object.fromEntries(data.angles.map((a) => [a.code, a]));
    // Los que la IA puede proponer: sin confirmar y que no escribió el dueño
    const pending = data.angles.filter((a) => a.status !== "confirmed" && a.proposed_by !== "owner").length;

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Cada ángulo es el código corto de los nombres de tus anuncios y ad sets (FASP, NERV, GINE…). El sistema los junta solo; la IA propone un
                nombre y la hipótesis leyendo el texto de los anuncios, y tú corriges y confirmas. Si dos códigos son lo mismo (FAS y FASP), únelos con «Editar».
            </Typography>
            {data.products.length === 0 ? <Alert severity="info">Todavía no hay campañas clasificadas por producto.</Alert> : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                    <TextField select size="small" label="Producto" value={productId ?? ""} onChange={(e) => { setProductId(Number(e.target.value)); setExample(false); }} sx={{ minWidth: 260 }}>
                        {data.products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}{p.active_campaigns ? ` · ${p.active_campaigns} campañas activas` : ""}</MenuItem>)}
                    </TextField>
                    <Button variant="outlined" startIcon={proposing ? <CircularProgress size={16} /> : <AutoAwesomeRounded />} disabled={proposing || pending === 0} onClick={propose}>
                        {proposing ? "Pensando…" : `Proponer con IA${pending ? ` (${pending})` : ""}`}
                    </Button>
                </Stack>
            )}
            {example && <Alert severity="warning">Esto es un ejemplo: en esta PC no hay IA. En el sistema real la IA lee el texto de tus anuncios.</Alert>}
            {data.products.length > 0 && data.angles.length === 0 && (
                <Alert severity="info">Este producto todavía no tiene códigos de ángulo en los nombres de sus anuncios o ad sets.</Alert>
            )}
            {data.angles.map((a) => (
                <AngleCard key={a.id} a={a} byCode={byCode} onEdit={() => setEditing(a)} onPatch={patch} onSeparate={separate} />
            ))}
            <EditAngleDialog angle={editing} others={data.angles.filter((o) => o.id !== editing?.id)} onClose={() => setEditing(null)} onSave={patch} />
        </Stack>
    );
};

type ModeProduct = AngleProduct & { mode: string; note: string | null; updated_by: string | null; updated_at: string | null };

const MODE_LABEL: Record<string, { label: string; help: string }> = {
    normal: { label: "Normal", help: "Se analiza, se escala y se le piden creativos." },
    liquidation: { label: "Liquidación", help: "Sin creativos nuevos ni escalar: solo los anuncios cerca o debajo del break-even, y apagar al agotarse." },
    paused: { label: "Pausado", help: "No se le piden creativos ni se escala." },
    abandoned: { label: "Abandonado", help: "Se dejó: no recibe trabajo." },
};

const ModeRow: React.FC<{ p: ModeProduct; modes: string[]; onSaved: () => void }> = ({ p, modes, onSaved }) => {
    const [note, setNote] = useState(p.note ?? "");
    const save = async (mode: string, n: string) => {
        try {
            await api(`/meta/product-modes/${p.id}`, "PUT", { mode, note: n.trim() || null });
            toast.success(`${p.name}: ${MODE_LABEL[mode]?.label ?? mode}`);
            onSaved();
        } catch (e) { toast.error((e as Error).message); }
    };
    return (
        <TableRow>
            <TableCell sx={{ minWidth: 180 }}>
                <Typography variant="body2" fontWeight="bold">{p.name}</Typography>
                <Typography variant="caption" color="text.secondary">{p.active_campaigns} campañas activas{p.updated_by ? ` · cambiado por ${p.updated_by} ${dateTime(p.updated_at)}` : ""}</Typography>
            </TableCell>
            <TableCell sx={{ minWidth: 170 }}>
                <TextField select size="small" value={p.mode} onChange={(e) => save(e.target.value, note)} fullWidth>
                    {modes.map((m) => <MenuItem key={m} value={m}>{MODE_LABEL[m]?.label ?? m}</MenuItem>)}
                </TextField>
            </TableCell>
            <TableCell sx={{ minWidth: 220 }}>
                <TextField size="small" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 255 }}
                    onBlur={() => { if (note.trim() !== (p.note ?? "")) save(p.mode, note); }} fullWidth />
            </TableCell>
        </TableRow>
    );
};

export const MetaProductModes: React.FC = () => {
    const [data, setData] = useState<{ modes: string[]; products: ModeProduct[] } | null>(null);
    const load = useCallback(() => { api<{ modes: string[]; products: ModeProduct[] }>("/meta/product-modes").then(setData).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { load(); }, [load]);
    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflowX: "auto" }}>
            <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Modo de cada producto</Typography>
                <Typography variant="body2" color="text.secondary">
                    Lo usa el análisis de campañas. {Object.values(MODE_LABEL).map((m) => `${m.label}: ${m.help.charAt(0).toLowerCase()}${m.help.slice(1)}`).join(" ")}
                </Typography>
            </Box>
            {data.products.length === 0 ? <Typography sx={{ p: 2 }}>Todavía no hay campañas clasificadas por producto.</Typography> : (
                <Table size="small">
                    <TableHead><TableRow><TableCell>Producto</TableCell><TableCell>Modo</TableCell><TableCell>Nota</TableCell></TableRow></TableHead>
                    <TableBody>{data.products.map((p) => <ModeRow key={`${p.id}-${p.mode}`} p={p} modes={data.modes} onSaved={load} />)}</TableBody>
                </Table>
            )}
        </Paper>
    );
};
