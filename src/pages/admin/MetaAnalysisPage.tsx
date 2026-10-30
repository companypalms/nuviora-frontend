// src/pages/admin/MetaAnalysisPage.tsx
// Etapa 5, paso 3a (2026-10-30): el análisis de campañas de cada mañana. Lo arma el sistema a las 7:00 con las reglas del
// dueño (Paso 2) y lo redacta la IA: arriba, la lista de lo más urgente a lo menos (los montos son de las reglas) con
// "hecho" y "no estoy de acuerdo"; abajo, cada producto como sus documentos. Nada de esto toca Meta: el mensaje al editor
// es un borrador.
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Paper,
    Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { ContentCopyRounded, InsightsRounded, RefreshRounded, ThumbDownAltOutlined } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime, fmt } from "../../components/meta-ads/metaAds";

type Tone = "default" | "info" | "success" | "warning" | "error";
type UrgentItem = { key: string; product_id: number; product: string; city: string | null; kind: string; label: string; text: string; tone: Tone; urgency: string | null };
type Mark = { status: "done" | "disagree"; note: string | null; by: string | null; at: string };
type CityFact = {
    campaign_meta_id: string; campaign: string | null; city: string | null; notes: string[]; budget_notes: string[]; price_option: string | null;
    action: { key: string; label: string; tone: Tone; data: string; reading: string; proposal: string | null };
};
type CreativeFact = {
    id: number; label: string; verdict: string; verdict_key: string; tone: Tone; reading: string; proposal: string | null; cross: string | null;
    funnel: string | null; week: { spend: number; purchases: number; cpa: number | null } | null;
    video: { window: string; diagnosis: string[]; iterate: string | null } | null;
};
type ProductFact = {
    product_id: number; product: string; mode: string; money_at_risk: number;
    urgency: { level: number; label: string; batches: string; reasons: string[] } | null;
    next_work: string[]; price: string[]; price_watch: string | null; alarms: string[];
    cities: CityFact[]; creatives: CreativeFact[]; batches: { name: string; verdict: string; reading: string; proposal: string | null }[];
};
type AiProduct = { producto: string; diagnostico: string; ciudades: { ciudad: string; lectura: string }[]; decisiones_creativas: string[]; mensaje_editor: string; aprendizaje: string };
type Analysis = {
    id: number; date: string; version: number; status: "ok" | "example" | "no_ai" | "error"; created_at: string; requested_by: string | null;
    model: string | null; error: string | null; warnings: string[]; urgent: UrgentItem[]; marks: Record<string, Mark>;
    facts: ProductFact[]; text: { resumen: string; productos: AiProduct[] } | null;
    versions: { version: number; created_at: string; auto: boolean }[];
};
type Data = { analysis: Analysis | null; dates: { date: string; versions: number }[]; runs_left: number };

const URGENCY_COLOR: Record<number, "error" | "warning" | "success" | "default"> = { 1: "error", 2: "warning", 3: "success", 4: "default", 5: "default" };
const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const UrgentRow: React.FC<{ item: UrgentItem; mark?: Mark; onMark: (status: Mark["status"] | null, note?: string) => void }> = ({ item, mark, onMark }) => {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState(mark?.note ?? "");
    const done = mark?.status === "done";
    return (
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", py: 1, borderBottom: "1px solid", borderColor: "divider", opacity: done ? 0.55 : 1 }}>
            <Checkbox size="small" checked={done} onChange={(e) => onMark(e.target.checked ? "done" : null)} inputProps={{ "aria-label": "Hecho" }} sx={{ mt: -0.5 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={700}>{item.product}{item.city ? ` · ${item.city}` : ""}</Typography>
                    <Chip size="small" color={item.tone} label={item.label} />
                    {mark?.status === "disagree" && <Chip size="small" color="secondary" variant="outlined" label="No estoy de acuerdo" />}
                </Stack>
                <Typography variant="body2" sx={{ textDecoration: done ? "line-through" : "none", overflowWrap: "anywhere" }}>{item.text}</Typography>
                {mark?.status === "disagree" && mark.note && <Typography variant="caption" color="text.secondary">Tu nota: {mark.note}</Typography>}
            </Box>
            <Tooltip title="No estoy de acuerdo (con una nota, para ajustar los números)">
                <Button size="small" color="secondary" onClick={() => { setNote(mark?.note ?? ""); setOpen(true); }} sx={{ minWidth: 0 }} aria-label="No estoy de acuerdo">
                    <ThumbDownAltOutlined fontSize="small" />
                </Button>
            </Tooltip>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>No estoy de acuerdo</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>{item.product}{item.city ? ` · ${item.city}` : ""}: {item.label}</Typography>
                    <TextField label="¿Qué harías tú y por qué?" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={3} fullWidth inputProps={{ maxLength: 500 }} />
                </DialogContent>
                <DialogActions>
                    {mark?.status === "disagree" && <Button onClick={() => { onMark(null); setOpen(false); }}>Quitar</Button>}
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={() => { onMark("disagree", note); setOpen(false); }}>Guardar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const ProductSection: React.FC<{ p: ProductFact; ai?: AiProduct }> = ({ p, ai }) => {
    const copy = async () => {
        try { await navigator.clipboard.writeText(ai?.mensaje_editor ?? ""); toast.success("Mensaje copiado"); } catch { toast.error("No se pudo copiar"); }
    };
    const cityText = (city: string | null) => ai?.ciudades.find((c) => city && norm(c.ciudad) === norm(city))?.lectura;
    return (
        <Paper elevation={0} sx={card}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h6" component="h3" fontWeight="bold">{p.product}</Typography>
                {p.urgency && <Chip size="small" color={URGENCY_COLOR[p.urgency.level]} label={p.urgency.label} />}
                {p.urgency && <Typography variant="caption" color="text.secondary">Batches a pedir: <b>{p.urgency.batches}</b></Typography>}
                {p.mode !== "normal" && <Chip size="small" variant="outlined" label={`Modo: ${p.mode}`} />}
            </Stack>
            {ai?.diagnostico && <Typography variant="body2" sx={{ mt: 1 }}>{ai.diagnostico}</Typography>}
            {p.alarms.map((t, i) => <Alert key={i} severity="warning" sx={{ mt: 1, py: 0 }}>{t}</Alert>)}

            {p.cities.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="subtitle2">Ciudades</Typography>
                    {p.cities.map((c) => (
                        <Box key={c.campaign_meta_id} sx={{ mt: 0.75 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Typography variant="body2" fontWeight={700}>{c.city ?? "—"}</Typography>
                                <Tooltip title={<Box>{c.action.data}<br />{c.action.reading}{c.action.proposal ? <><br />→ {c.action.proposal}</> : null}</Box>}>
                                    <Chip size="small" color={c.action.tone} label={c.action.label} />
                                </Tooltip>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">{cityText(c.city) ?? `${c.action.reading} ${c.action.proposal ?? ""}`}</Typography>
                            {[...c.notes, ...c.budget_notes].map((n, i) => <Typography key={i} variant="caption" color="text.secondary" component="div">• {n}</Typography>)}
                        </Box>
                    ))}
                </Box>
            )}

            {p.creatives.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="subtitle2">Creativos (de más a menos gasto en 7 días)</Typography>
                    {p.creatives.map((cr, i) => (
                        <Box key={cr.id} sx={{ mt: 0.5, display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}>
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 22 }}>#{i + 1}</Typography>
                            <Link component={RouterLink} to={`/meta-ads/creativos/${cr.id}`} variant="body2" fontWeight={700}>{cr.label}</Link>
                            <Tooltip title={<Box>{cr.reading}{cr.proposal ? <><br />→ {cr.proposal}</> : null}</Box>}>
                                <Chip size="small" color={cr.tone} variant="outlined" label={cr.verdict} />
                            </Tooltip>
                            {cr.cross && <Chip size="small" variant="outlined" label={cr.cross} />}
                            {cr.funnel && <Typography variant="caption" color="text.secondary">{cr.funnel}</Typography>}
                            {cr.week && <Typography variant="caption" color="text.secondary">
                                7 días: {fmt.money(cr.week.spend)} · {fmt.num(cr.week.purchases)} compras{cr.week.cpa !== null ? ` · CPA ${fmt.money(cr.week.cpa)}` : ""}
                            </Typography>}
                        </Box>
                    ))}
                </Box>
            )}

            {ai && ai.decisiones_creativas.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="subtitle2">Decisiones creativas</Typography>
                    {ai.decisiones_creativas.map((t, i) => <Typography key={i} variant="body2">• {t}</Typography>)}
                </Box>
            )}
            {(p.next_work.length > 0 || p.price.length > 0 || p.price_watch) && (
                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="subtitle2">Trabajo y precio (de tus reglas)</Typography>
                    {p.next_work.map((t, i) => <Typography key={i} variant="body2">• {t}</Typography>)}
                    {[...p.price, ...(p.price_watch ? [p.price_watch] : [])].map((t, i) => <Typography key={`p${i}`} variant="caption" color="text.secondary" component="div">💲 {t}</Typography>)}
                </Box>
            )}
            {ai?.mensaje_editor && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">Mensaje al editor líder (borrador, no se envía)</Typography>
                        <Button size="small" startIcon={<ContentCopyRounded />} onClick={copy}>Copiar</Button>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>{ai.mensaje_editor}</Typography>
                </Box>
            )}
            {ai?.aprendizaje && <Typography variant="body2" sx={{ mt: 1.5 }}><b>Aprendizaje:</b> {ai.aprendizaje}</Typography>}
        </Paper>
    );
};

export const MetaAnalysisPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [date, setDate] = useState<string>("");
    const [version, setVersion] = useState<number | "">("");
    const [running, setRunning] = useState(false);

    const load = useCallback(() => {
        const q = new URLSearchParams();
        if (date) q.set("date", date);
        if (date && version !== "") q.set("version", String(version));
        api<Data>(`/meta/analysis${q.toString() ? `?${q}` : ""}`).then(setData).catch((e) => toast.error(e.message));
    }, [date, version]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const run = async () => {
        setRunning(true);
        try {
            const r = await api<{ analysis: Analysis; runs_left: number }>("/meta/analysis/run", "POST");
            setData((d) => d ? { ...d, analysis: r.analysis, runs_left: r.runs_left } : d);
            setDate(r.analysis.date);
            setVersion(r.analysis.version);
            toast.success("Análisis actualizado");
        } catch (e) { toast.error((e as Error).message); } finally { setRunning(false); }
    };
    const mark = async (key: string, status: Mark["status"] | null, note?: string) => {
        if (!data?.analysis) return;
        try {
            const r = await api<{ marks: Record<string, Mark> }>(`/meta/analysis/${data.analysis.id}/marks`, "PUT", { key, status, note: note ?? null });
            setData((d) => d && d.analysis ? { ...d, analysis: { ...d.analysis, marks: r.marks } } : d);
        } catch (e) { toast.error((e as Error).message); }
    };

    if (loadingSession || !isValid || !data) return <Loading />;
    const a = data.analysis;
    const aiFor = (p: ProductFact, i: number) => a?.text?.productos.find((x) => norm(x.producto) === norm(p.product)) ?? a?.text?.productos[i];
    const pending = a ? a.urgent.filter((i) => a.marks[i.key]?.status !== "done").length : 0;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: "auto" }}>
                <DescripcionDeVista title="Análisis del día" backPath="/meta-ads"
                    description="Tus campañas con tus reglas, de lo más urgente a lo menos. Los montos y las acciones son de tus reglas; la IA explica y redacta. Nada de esto cambia Meta: lo haces tú." />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <TextField select size="small" label="Día" value={a?.date ?? ""} onChange={(e) => { setDate(e.target.value); setVersion(""); }} sx={{ minWidth: 160 }}>
                            {data.dates.map((d) => <MenuItem key={d.date} value={d.date}>{d.date}</MenuItem>)}
                        </TextField>
                        {a && a.versions.length > 1 && (
                            <TextField select size="small" label="Versión" value={a.version} onChange={(e) => { setDate(a.date); setVersion(Number(e.target.value)); }} sx={{ minWidth: 200 }}>
                                {a.versions.map((v) => <MenuItem key={v.version} value={v.version}>{v.version} · {dateTime(v.created_at)}{v.auto ? " (automático)" : ""}</MenuItem>)}
                            </TextField>
                        )}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<InsightsRounded />} component={RouterLink} to="/meta-ads">Ver métricas</Button>
                        <Button size="small" variant="outlined" startIcon={running ? <CircularProgress size={14} /> : <RefreshRounded />} disabled={running || data.runs_left <= 0} onClick={run}>
                            {running ? "Analizando…" : `Volver a analizar (${data.runs_left})`}
                        </Button>
                    </Stack>
                </Stack>

                {!a ? (
                    <Alert severity="info">Todavía no hay análisis. Sale solo cada mañana a las 7:00, o tócalo ahora con "Volver a analizar".</Alert>
                ) : (
                    <Stack spacing={2}>
                        <Typography variant="caption" color="text.secondary">
                            Hecho {dateTime(a.created_at)}{a.requested_by ? ` por ${a.requested_by}` : " (automático)"}{a.model ? ` · ${a.model}` : ""} · con los 3 días cerrados.
                        </Typography>
                        {a.status === "example" && <Alert severity="warning">Ejemplo: en esta PC no hay IA. La lista y los datos son los de tus reglas; el texto es una plantilla.</Alert>}
                        {(a.status === "no_ai" || a.status === "error") && a.error && <Alert severity="warning">{a.error}</Alert>}
                        {a.warnings.length > 0 && (
                            <Alert severity="error">La IA escribió montos que no están en los datos: <b>{a.warnings.join(", ")}</b>. Fíate de la lista de arriba y de tus reglas, no de esos montos.</Alert>
                        )}
                        {a.text?.resumen && (
                            <Paper elevation={0} sx={card}>
                                <Typography variant="subtitle1" fontWeight="bold">Resumen</Typography>
                                <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>{a.text.resumen}</Typography>
                            </Paper>
                        )}
                        <Paper elevation={0} sx={card}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1" fontWeight="bold">Lo urgente, de más a menos</Typography>
                                <Typography variant="caption" color="text.secondary">{pending} de {a.urgent.length} por hacer</Typography>
                            </Stack>
                            {a.urgent.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Nada urgente hoy: tus campañas están en "mantener".</Typography>
                                : a.urgent.map((i) => <UrgentRow key={i.key} item={i} mark={a.marks[i.key]} onMark={(s, n) => mark(i.key, s, n)} />)}
                        </Paper>
                        {a.facts.map((p, i) => <ProductSection key={p.product_id} p={p} ai={aiFor(p, i)} />)}
                    </Stack>
                )}
            </Box>
        </Layout>
    );
};
