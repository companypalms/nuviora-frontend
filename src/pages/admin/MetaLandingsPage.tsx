// src/pages/admin/MetaLandingsPage.tsx
// Etapa 5, paso 6a (2026-10-30): Meta Ads › Landings. Cada página de destino de los anuncios de un producto, medida con
// los anuncios que llevaban a ella cada día: % de visita (visitas ÷ clics), % de compra (compras ÷ visitas) y CPA contra
// C, por ángulo y por ciudad, y lo que dicen los números (lenta, no habla del ángulo, cuál compra mejor). El dueño les pone
// nombre y ángulo. Solo lectura: no cambia nada en Meta ni en Shopify.
// Paso 6b: la pestaña "Encargos" (los encargos de landing) y "Pedir cambio" en cada landing, con lo que dicen sus números.
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack, Tab, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import { BuildRounded, EditRounded, ExpandLessRounded, ExpandMoreRounded, InsightsRounded, OpenInNewRounded, SettingsRounded } from "@mui/icons-material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime, fmt, shortDay } from "../../components/meta-ads/metaAds";
import { TaskFormDialog } from "../../components/meta-ads/landingTasks";
import { TaskDraft } from "../../components/meta-ads/landingTasksShared";
import { LandingTasksPanel } from "./MetaLandingTasks";

type Totals = { spend: number; impressions: number; link_clicks: number; visits: number; purchases: number };
type LMetrics = { visit: number | null; conversion: number | null; ctr: number | null; cpa: number | null; cpa_vs_c: number | null };
type Block = { totals: Totals; metrics: LMetrics };
type Finding = { key: string; level: "red" | "orange" | "yellow" | "info" | "green"; text: string };
type LandingRow = Block & {
    id: number; url: string; label: string; name: string | null; angle_code: string | null; angle_name: string | null; notes: string | null;
    first_seen_at: string | null; ads: number; ads_active: number; findings: Finding[]; level: Finding["level"] | null;
    angles: (Block & { code: string | null; name: string })[]; cities: (Block & { city: string })[];
    task: { id: number; code: string | null; status: string; status_label: string; result: string | null } | null; suggested_kind: string;
};
type Data = {
    products: { id: number; name: string }[]; product_id: number | null;
    range?: string; from?: string; to?: string; product?: Block; unknown?: Block & { ads: number };
    landings?: LandingRow[]; angles?: { code: string; name: string }[]; cities?: { id: number; name: string }[];
    settings?: { min_clicks: number; min_visits: number; visit_leak: number; visit_ok: number; gap: number };
};

const RANGES = [{ key: "last_7d", label: "7 días" }, { key: "last_14d", label: "14 días" }, { key: "last_30d", label: "30 días" },
    { key: "this_month", label: "Este mes" }, { key: "last_month", label: "Mes pasado" }];
const LEVEL: Record<Finding["level"], { severity: "error" | "warning" | "info" | "success"; dot: string }> = {
    red: { severity: "error", dot: "#c62828" }, orange: { severity: "warning", dot: "#ef6c00" }, yellow: { severity: "warning", dot: "#f9a825" },
    info: { severity: "info", dot: "#0288d1" }, green: { severity: "success", dot: "#2e7d32" },
};
const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const EMPTY_ASK: TaskDraft = { product_id: "", landing_id: "", kind: "angle", angle_code: "", observed: "", hypothesis: "", change: "", keep: "", notes: "" };
const nf1 = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });
const pct = (v: number | null, two = false) => (v === null ? "—" : `${(two ? nf2 : nf1).format(v)} %`);
const vsC = (v: number | null) => (v === null ? "—" : `${nf1.format(v)} % de C`);

const Stat: React.FC<{ label: string; value: string; help: string; color?: string }> = ({ label, value, help, color }) => (
    <Tooltip title={help}>
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" component="div" noWrap>{label}</Typography>
            <Typography variant="body1" fontWeight={700} color={color ?? "text.primary"} noWrap>{value}</Typography>
        </Box>
    </Tooltip>
);

/** Los números de una landing (o de todo el producto) en una fila que en el celular pasa a dos columnas. */
const Stats: React.FC<{ b: Block; ads?: string; s?: Data["settings"] }> = ({ b, ads, s }) => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))", md: "repeat(8, minmax(0, 1fr))" }, gap: 1.5 }}>
        {ads !== undefined && <Stat label="Anuncios" value={ads} help="Activos de los que hoy llevan a esta landing." />}
        <Stat label="Clics" value={int.format(b.totals.link_clicks)} help="Clics en el enlace de los anuncios." />
        <Stat label="Visitas" value={int.format(b.totals.visits)} help="Visitas a la página que vio Meta (Landing Page Views)." />
        <Stat label="% de visita" value={pct(b.metrics.visit)} help={`Visitas ÷ clics. ${s ? `Debajo de ${s.visit_leak} % la landing es lenta; normal desde ${s.visit_ok} %.` : ""}`}
            color={s && b.metrics.visit !== null && b.totals.link_clicks >= s.min_clicks ? (b.metrics.visit < s.visit_leak ? "error.main" : b.metrics.visit < s.visit_ok ? "warning.main" : "success.main") : undefined} />
        <Stat label="% de compra" value={pct(b.metrics.conversion, true)} help="Compras ÷ visitas." />
        <Stat label="Compras" value={int.format(b.totals.purchases)} help="Compras de Meta de los anuncios que llevaban a esta landing." />
        <Stat label="CPA" value={fmt.money(b.metrics.cpa)} help={`Gasto ${fmt.money(b.totals.spend)} ÷ compras.`} />
        <Stat label="CPA contra C" value={vsC(b.metrics.cpa_vs_c)} help="El gasto contra lo que se podía gastar a C (el CPA objetivo de cada ciudad) por esas compras. 100 % = justo C; menos es mejor."
            color={b.metrics.cpa_vs_c === null ? undefined : b.metrics.cpa_vs_c <= 100 ? "success.main" : "warning.main"} />
    </Box>
);

const BreakdownTable: React.FC<{ title: string; rows: (Block & { name: string })[] }> = ({ title, rows }) => (
    <Box sx={{ mt: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
        <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell />
                        {["Clics", "Visitas", "% visita", "% compra", "Compras", "CPA", "Contra C"].map((h) => <TableCell key={h} align="right">{h}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r) => (
                        <TableRow key={r.name}>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{r.name}</TableCell>
                            <TableCell align="right">{int.format(r.totals.link_clicks)}</TableCell>
                            <TableCell align="right">{int.format(r.totals.visits)}</TableCell>
                            <TableCell align="right">{pct(r.metrics.visit)}</TableCell>
                            <TableCell align="right">{pct(r.metrics.conversion, true)}</TableCell>
                            <TableCell align="right">{int.format(r.totals.purchases)}</TableCell>
                            <TableCell align="right">{fmt.money(r.metrics.cpa)}</TableCell>
                            <TableCell align="right">{vsC(r.metrics.cpa_vs_c)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </Box>
);

const LandingCard: React.FC<{ l: LandingRow; s?: Data["settings"]; onEdit: (l: LandingRow) => void; onAsk: (l: LandingRow) => void; onTasks: () => void }> = ({ l, s, onEdit, onAsk, onTasks }) => {
    const [open, setOpen] = useState(false);
    const hasData = l.totals.link_clicks > 0 || l.totals.spend > 0;
    return (
        <Paper elevation={0} sx={card}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {l.level && <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: LEVEL[l.level].dot, flexShrink: 0 }} />}
                <Typography variant="subtitle1" fontWeight={700} sx={{ wordBreak: "break-word" }}>{l.label}</Typography>
                <Chip size="small" variant="outlined" label={l.angle_code ? `Ángulo ${l.angle_code}${l.angle_name && l.angle_name !== l.angle_code ? ` · ${l.angle_name}` : ""}` : "Base"} />
                {!l.name && <Chip size="small" color="warning" variant="outlined" label="Sin nombre" />}
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Nombre, ángulo y notas"><IconButton size="small" aria-label={`Editar ${l.label}`} onClick={() => onEdit(l)}><EditRounded fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Abrir la landing"><IconButton size="small" aria-label={`Abrir ${l.label}`} component="a" href={l.url} target="_blank" rel="noopener noreferrer"><OpenInNewRounded fontSize="small" /></IconButton></Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5, wordBreak: "break-all" }}>
                {l.url}{l.first_seen_at ? ` · vista por primera vez el ${dateTime(l.first_seen_at)}` : ""}
            </Typography>
            {l.notes && <Typography variant="body2" sx={{ mb: 1.5, whiteSpace: "pre-wrap" }}>{l.notes}</Typography>}
            {l.task && (
                <Alert severity="info" sx={{ mb: 1.5 }} action={<Button color="inherit" size="small" onClick={onTasks}>Ver</Button>}>
                    <b>{l.task.code ? `${l.task.code} · ${l.task.status_label}` : "Encargo propuesto, sin aprobar"}</b>{l.task.result ? `: ${l.task.result}` : ". Mientras tanto no se pide otro cambio de esta landing."}
                </Alert>
            )}
            <Stats b={l} ads={`${l.ads_active} de ${l.ads}`} s={s} />
            {l.findings.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                    {l.findings.map((f, i) => <Alert key={i} severity={LEVEL[f.level].severity} sx={{ py: 0 }}>{f.text}</Alert>)}
                </Stack>
            )}
            {!hasData && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Sin datos en este rango.</Typography>}
            {!l.task && <Button size="small" variant={l.findings.some((f) => f.level !== "green" && f.level !== "info") ? "contained" : "outlined"} startIcon={<BuildRounded />}
                sx={{ mt: 1.5, mr: 1 }} onClick={() => onAsk(l)}>Pedir cambio</Button>}
            {hasData && (
                <>
                    <Button size="small" sx={{ mt: 1 }} onClick={() => setOpen((o) => !o)} endIcon={open ? <ExpandLessRounded /> : <ExpandMoreRounded />}>
                        {open ? "Ocultar" : "Por ángulo y por ciudad"}
                    </Button>
                    <Collapse in={open} unmountOnExit>
                        <BreakdownTable title="Por ángulo" rows={l.angles.map((a) => ({ ...a, name: a.code ? (a.name !== a.code ? `${a.code} · ${a.name}` : a.code) : a.name }))} />
                        <BreakdownTable title="Por ciudad" rows={l.cities.map((c) => ({ ...c, name: c.city }))} />
                    </Collapse>
                </>
            )}
        </Paper>
    );
};

const EditDialog: React.FC<{ l: LandingRow | null; angles: { code: string; name: string }[]; onClose: () => void; onSaved: () => void }> = ({ l, angles, onClose, onSaved }) => {
    const [form, setForm] = useState({ name: "", angle_code: "", notes: "" });
    const [saving, setSaving] = useState(false);
    useEffect(() => { if (l) setForm({ name: l.name ?? "", angle_code: l.angle_code ?? "", notes: l.notes ?? "" }); }, [l]);
    const save = async () => {
        if (!l) return;
        setSaving(true);
        try {
            await api(`/meta/landings/${l.id}`, "PUT", { name: form.name, angle_code: form.angle_code || null, notes: form.notes });
            toast.success("Guardado");
            onSaved();
            onClose();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    return (
        <Dialog open={!!l} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Landing</DialogTitle>
            <DialogContent>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2, wordBreak: "break-all" }}>{l?.url}</Typography>
                <Stack spacing={2}>
                    <TextField label="Nombre" placeholder="Base, BASU…" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} inputProps={{ maxLength: 120 }} fullWidth />
                    <TextField select label="Ángulo del que habla" value={form.angle_code} onChange={(e) => setForm({ ...form, angle_code: e.target.value })} fullWidth
                        helperText="La base habla del producto en general; una landing de ángulo, de un dolor o público.">
                        <MenuItem value="">Base (sin ángulo)</MenuItem>
                        {angles.map((a) => <MenuItem key={a.code} value={a.code}>{a.code}{a.name !== a.code ? ` · ${a.name}` : ""}</MenuItem>)}
                    </TextField>
                    <TextField label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} inputProps={{ maxLength: 2000 }} fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};

export const MetaLandingsPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [productId, setProductId] = useState<number | null>(null);
    const [cityId, setCityId] = useState<number | "">("");
    const [range, setRange] = useState("last_30d");
    const [data, setData] = useState<Data | null>(null);
    const [editing, setEditing] = useState<LandingRow | null>(null);
    const [ask, setAsk] = useState<TaskDraft | null>(null);
    const [params, setParams] = useSearchParams();
    const tab = params.get("tab") === "encargos" ? "encargos" : "landings";
    const setTab = (v: string) => setParams((p) => { if (v === "encargos") p.set("tab", v); else p.delete("tab"); return p; });

    const load = useCallback(() => {
        const q = new URLSearchParams({ range });
        if (productId) q.set("product_id", String(productId));
        if (cityId) q.set("city_id", String(cityId));
        api<Data>(`/meta/landings?${q}`).then(setData).catch((e) => toast.error(e.message));
    }, [range, productId, cityId]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    if (loadingSession || !isValid || !data) return <Loading />;
    const s = data.settings;
    const askFor = (l: LandingRow) => setAsk({
        product_id: data.product_id ?? "", landing_id: l.id, kind: l.suggested_kind, angle_code: l.angle_code ?? "",
        observed: l.findings.filter((f) => f.level !== "green").map((f) => f.text).join("\n"), hypothesis: "", change: "", keep: "", notes: "",
    });

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1200, mx: "auto" }}>
                <DescripcionDeVista title="Landings" description="Cada página a la que llevan tus anuncios, medida con los anuncios que llevaban a ella cada día: cuántos clics llegan a la página (% de visita), cuántas visitas compran (% de compra) y el CPA contra C. Solo lectura: no cambia nada en Meta ni en Shopify." />
                <Stack direction="row" justifyContent="flex-end" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    <Button size="small" startIcon={<InsightsRounded />} component={RouterLink} to="/meta-ads">Meta Ads</Button>
                    <Button size="small" component={RouterLink} to="/meta-ads/analisis">Análisis del día</Button>
                    <Button size="small" startIcon={<SettingsRounded />} component={RouterLink} to="/admin/meta-ads?tab=rules">Reglas</Button>
                </Stack>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mb: 2 }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
                        <Tab value="landings" label="Landings" />
                        <Tab value="encargos" label="Encargos" />
                    </Tabs>
                </Paper>

                {tab === "encargos" ? <LandingTasksPanel productId={data.product_id} /> : data.products.length === 0 ? (
                    <Alert severity="info">Todavía no hay landings. Aparecen solas cuando la sincronización con Meta lee a dónde lleva cada anuncio.</Alert>
                ) : (
                    <>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
                            <TextField select size="small" label="Producto" value={productId ?? data.product_id ?? ""} sx={{ minWidth: 220 }}
                                onChange={(e) => { setProductId(Number(e.target.value)); setCityId(""); }}>
                                {data.products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                            </TextField>
                            <TextField select size="small" label="Ciudad" value={cityId} sx={{ minWidth: 180 }} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} onChange={(e) => setCityId(e.target.value === "" ? "" : Number(e.target.value))}>
                                <MenuItem value="">Todas las ciudades</MenuItem>
                                {(data.cities ?? []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </TextField>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
                            {RANGES.map((r) => <Chip key={r.key} label={r.label} color={range === r.key ? "primary" : "default"} variant={range === r.key ? "filled" : "outlined"} onClick={() => setRange(r.key)} />)}
                            {data.from && <Typography variant="caption" color="text.secondary">{shortDay(data.from)} – {shortDay(data.to)}</Typography>}
                        </Stack>

                        {data.product && (
                            <Paper elevation={0} sx={{ ...card, mb: 2, bgcolor: "action.hover" }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Todas sus landings</Typography>
                                <Stats b={data.product} s={s} />
                            </Paper>
                        )}
                        {(data.unknown?.ads ?? 0) > 0 && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {data.unknown!.ads} {data.unknown!.ads === 1 ? "anuncio todavía no tiene" : "anuncios todavía no tienen"} landing conocida
                                {data.unknown!.totals.spend > 0 ? ` (${fmt.money(data.unknown!.totals.spend)} de gasto y ${int.format(data.unknown!.totals.purchases)} compras en este rango, que no entran arriba)` : ""}: se ve después de la próxima sincronización con Meta.
                            </Alert>
                        )}
                        <Stack spacing={2}>
                            {(data.landings ?? []).length === 0 && <Alert severity="info">Este producto todavía no tiene landings.</Alert>}
                            {(data.landings ?? []).map((l) => <LandingCard key={l.id} l={l} s={s} onEdit={setEditing} onAsk={askFor} onTasks={() => setTab("encargos")} />)}
                        </Stack>
                        {s && (
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 2 }}>
                                Con menos de {int.format(s.min_clicks)} clics no se opina de la visita, ni con menos de {int.format(s.min_visits)} visitas de la compra. Un ángulo o una
                                landing "compra menos" si está {s.gap} % o más debajo. Se cambian en Meta Ads › Reglas.
                            </Typography>
                        )}
                    </>
                )}
            </Box>
            <EditDialog l={editing} angles={data.angles ?? []} onClose={() => setEditing(null)} onSaved={load} />
            <TaskFormDialog open={!!ask} initial={ask ?? EMPTY_ASK} products={data.products}
                landings={(data.landings ?? []).map((l) => ({ id: l.id, product_id: data.product_id ?? 0, label: l.label, url: l.url, angle_code: l.angle_code }))}
                onClose={() => setAsk(null)} onSaved={load} />
        </Layout>
    );
};
