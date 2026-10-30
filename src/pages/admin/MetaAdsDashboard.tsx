// src/pages/admin/MetaAdsDashboard.tsx
// Reportes → Meta Ads (documento de Fran del 2026-10-08, Módulo 2). §60: "Seleccionar Producto: Comprimax, Ciudad:
// Caracas, Rango: Últimos 7 días, y observar inmediatamente Purchases, CPA, Target CPA, Break-even, CTR, CPC, CPM,
// Frequency, LPV Rate, Conversion Rate, campañas, Ad Sets, creativos, históricos, tendencias."
// - centrada en el producto, con sus ciudades (§29) y cada ciudad sumando varias cuentas, con desglose (§31);
// - bajar a campaña → ad set → anuncio/creativo (§29), filtros (§30), rangos (§27), comparar (§28), gráfica (§26);
// - lo que falta clasificar, aparte y con su aviso (§13). Solo lee: nada de esto cambia algo en Meta (§1).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Chip, Collapse, IconButton, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Typography,
} from "@mui/material";
import { ExpandLessRounded, ExpandMoreRounded, InsightsRounded, SettingsRounded } from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import {
    COLUMNS, CityNode, DEFAULT_FILTERS, FilterOptions, Filters, Overview, ProductNode, ReportRow, api, dateTime, filtersQuery, fmt, shortDay,
} from "../../components/meta-ads/metaAds";
import { MetaFilters } from "../../components/meta-ads/MetaFilters";
import { MetricCell, RuleChips } from "../../components/meta-ads/MetaWidgets";
import { MetaReportTable } from "../../components/meta-ads/MetaReportTable";
import { MetaChart } from "../../components/meta-ads/MetaChart";
import { ActionChip, PlanBox } from "../../components/meta-ads/MetaDecisionWidgets";

const STORAGE_KEY = "meta-ads-filters";
const loadFilters = (): Filters => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
        return saved ? { ...DEFAULT_FILTERS, range: saved.range ?? "last_7d", compare: !!saved.compare } : DEFAULT_FILTERS;
    } catch { return DEFAULT_FILTERS; }
};

const SUMMARY_COLS = COLUMNS.filter((c) => !c.video);

const CityRow: React.FC<{ city: CityNode; canSeeSpend: boolean; onOpen: () => void }> = ({ city, canSeeSpend, onOpen }) => {
    const [open, setOpen] = useState(false);
    const cols = SUMMARY_COLS.filter((c) => canSeeSpend || !c.financial);
    return (
        <>
            <TableRow hover>
                <TableCell sx={{ minWidth: 170 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <IconButton size="small" aria-label={open ? "Ocultar cuentas" : "Ver cuentas"} onClick={() => setOpen(!open)}>{open ? <ExpandLessRounded /> : <ExpandMoreRounded />}</IconButton>
                        <Box>
                            <Button size="small" onClick={onOpen} sx={{ fontWeight: 700, p: 0, minWidth: 0, textTransform: "none" }}>{city.name}</Button>
                            <Typography variant="caption" color="text.secondary" component="div">{city.accounts.length} {city.accounts.length === 1 ? "cuenta" : "cuentas"}</Typography>
                            {city.target_source === "financial" && city.financial?.city_level && (
                                <Typography variant="caption" component="div" sx={{ fontWeight: 600 }}>
                                    Target {fmt.money(city.target_cpa ?? null)} · BE {fmt.money(city.break_even_cpa ?? null)}
                                </Typography>
                            )}
                            <RuleChips rules={city.signals.rules} />
                            {city.actions?.map((a, i) => <ActionChip key={i} a={a} />)}
                        </Box>
                    </Stack>
                </TableCell>
                {cols.map((c) => <TableCell key={c.key} align="right"><MetricCell node={city} col={c} /></TableCell>)}
            </TableRow>
            {open && city.accounts.map((a) => (
                <TableRow key={a.account_id} sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ pl: 7 }}><Typography variant="body2">{a.name ?? "Cuenta"}</Typography></TableCell>
                    {cols.map((c) => <TableCell key={c.key} align="right"><MetricCell node={a} col={c} /></TableCell>)}
                </TableRow>
            ))}
        </>
    );
};

const ProductCard: React.FC<{ p: ProductNode; canSeeSpend: boolean; onOpenCity: (cityId: number | null) => void }> = ({ p, canSeeSpend, onOpenCity }) => {
    const cols = SUMMARY_COLS.filter((c) => canSeeSpend || !c.financial);
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ p: 2, pb: 1 }}>
                <Box>
                    <Button onClick={() => onOpenCity(null)} sx={{ p: 0, minWidth: 0, textTransform: "none" }}>
                        <Typography variant="h6" component="h3" fontWeight="bold">{p.name}</Typography>
                    </Button>
                    {p.target_source === "financial" ? (
                        <>
                            {/* R12: el manual, arriba y discreto, solo de referencia */}
                            {(p.manual_target_cpa != null || p.manual_break_even_cpa != null) && (
                                <Typography variant="caption" color="text.disabled" component="div">
                                    Manual (referencia): Target {fmt.money(p.manual_target_cpa ?? null)} · Break-even {fmt.money(p.manual_break_even_cpa ?? null)}
                                </Typography>
                            )}
                            <Typography variant="body2" fontWeight={600}>
                                CPA financiero: Target {fmt.money(p.target_cpa)} · Break-even {fmt.money(p.break_even_cpa)}
                                {p.financial?.viable === false && <Typography component="span" variant="body2" color="error.main"> · no viable</Typography>}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div">
                                Calculado {p.financial?.computed_at} con las órdenes del {p.financial?.period_from} al {p.financial?.period_to} ·{" "}
                                <RouterLink to="/finanzas?tab=cpa">ver en Finanzas</RouterLink>
                            </Typography>
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Target CPA {fmt.money(p.target_cpa)} · Break-even {fmt.money(p.break_even_cpa)}
                            {p.target_cpa === null && p.break_even_cpa === null && <> · <RouterLink to="/admin/meta-ads?tab=targets">cargar objetivos</RouterLink></>}
                        </Typography>
                    )}
                    <RuleChips rules={p.signals.rules} />
                    <PlanBox plan={p.plan} />
                </Box>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                    {canSeeSpend && <Box><Typography variant="caption" color="text.secondary">Gasto</Typography><MetricCell node={p} col={COLUMNS[0]} /></Box>}
                    <Box><Typography variant="caption" color="text.secondary">Purchases</Typography><MetricCell node={p} col={COLUMNS[1]} /></Box>
                    <Box><Typography variant="caption" color="text.secondary">CPA</Typography><MetricCell node={p} col={COLUMNS[2]} /></Box>
                </Stack>
            </Stack>
            <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ "& td, & th": { px: 1 } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Ciudad</TableCell>
                            {cols.map((c) => <TableCell key={c.key} align="right">{c.label}</TableCell>)}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {p.cities.map((c) => <CityRow key={c.city_id} city={c} canSeeSpend={canSeeSpend} onOpen={() => onOpenCity(c.city_id)} />)}
                    </TableBody>
                </Table>
            </Box>
        </Paper>
    );
};

const LEVELS: { key: ReportRow["level"]; label: string }[] = [
    { key: "campaign", label: "Campañas" }, { key: "adset", label: "Ad sets" }, { key: "ad", label: "Anuncios" }, { key: "creative", label: "Creativos" },
];

export const MetaAdsDashboard: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const navigate = useNavigate();
    const [filters, setFilters] = useState<Filters>(loadFilters);
    const [options, setOptions] = useState<FilterOptions | null>(null);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [level, setLevel] = useState<ReportRow["level"]>("campaign");
    const [rows, setRows] = useState<ReportRow[] | null>(null);
    const [showUnclassified, setShowUnclassified] = useState(false);
    const query = useMemo(() => filtersQuery(filters), [filters]);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ range: filters.range, compare: filters.compare })); } catch { /* sin almacenamiento */ }
    }, [filters.range, filters.compare]);

    useEffect(() => {
        if (!isValid) return;
        Promise.all([api<Pick<FilterOptions, "products" | "cities">>("/meta/options"), api<Omit<FilterOptions, "products" | "cities">>("/meta/report/filters")])
            .then(([o, f]) => setOptions({ ...f, products: o.products, cities: o.cities }))
            .catch((e) => toast.error(e.message));
    }, [isValid]);

    const loadOverview = useCallback(() => {
        api<Overview>(`/meta/report/overview?${query}`).then(setOverview).catch((e) => toast.error(e.message));
    }, [query]);
    const loadRows = useCallback(() => {
        setRows(null);
        api<{ rows: ReportRow[] }>(`/meta/report/rows?level=${level}&${query}`).then((r) => setRows(r.rows)).catch((e) => { toast.error(e.message); setRows([]); });
    }, [level, query]);

    useEffect(() => { if (isValid) loadOverview(); }, [isValid, loadOverview]);
    useEffect(() => { if (isValid) loadRows(); }, [isValid, loadRows]);

    if (loadingSession || !isValid || !overview) return <Loading />;
    const canSeeSpend = overview.can_see_financials;

    const openCity = (productId: number, cityId: number | null) => {
        setFilters({ ...filters, product_id: productId, city_id: cityId, campaign: null, adset: null, creative: null });
        setLevel("campaign");
        setTimeout(() => document.getElementById("meta-detalle")?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    const openRow = (r: ReportRow) => {
        if (r.level === "campaign") { setFilters({ ...filters, campaign: r.meta_id ?? null, adset: null }); setLevel("adset"); }
        else if (r.level === "adset") { setFilters({ ...filters, campaign: r.campaign_meta_id ?? filters.campaign, adset: r.meta_id ?? null }); setLevel("ad"); }
        else if (r.level === "ad" && r.creative_id) navigate(`/meta-ads/creativos/${r.creative_id}`);
        else if (r.level === "creative") navigate(`/meta-ads/creativos/${r.id}`);
    };
    const scope = [
        filters.product_id && options?.products.find((p) => p.id === filters.product_id)?.name,
        filters.city_id && options?.cities.find((c) => c.id === filters.city_id)?.name,
        filters.campaign && (options?.campaigns.find((c) => c.meta_id === filters.campaign)?.name ?? "Campaña"),
        filters.adset && (options?.adsets.find((s) => s.meta_id === filters.adset)?.name ?? "Ad set"),
        filters.creative && options?.creatives.find((c) => c.id === filters.creative)?.label,
    ].filter(Boolean).join(" → ");

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1400, mx: "auto" }}>
                <DescripcionDeVista title="Meta Ads" description="Métricas de las campañas de Meta por producto y ciudad. Solo lectura: no cambia nada en Meta Ads." />
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        {overview.range.label}: {shortDay(overview.range.from)} – {shortDay(overview.range.to)}
                        {filters.compare && ` · contra ${shortDay(overview.range.prev_from)} – ${shortDay(overview.range.prev_to)}`}
                        {" · "}Última sincronización: {dateTime(overview.last_sync_at)}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" startIcon={<InsightsRounded />} component={RouterLink} to="/meta-ads/analisis">Análisis del día</Button>
                        <Button size="small" startIcon={<SettingsRounded />} component={RouterLink} to="/admin/meta-ads">Configuración</Button>
                    </Stack>
                </Stack>

                {!overview.has_connections && (
                    <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" component={RouterLink} to="/admin/meta-ads">Conectar</Button>}>
                        Todavía no hay ninguna conexión con Meta.
                    </Alert>
                )}
                {overview.pending_classification > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" component={RouterLink} to="/admin/meta-ads?tab=campaigns">Clasificar</Button>}>
                        <b>Nueva campaña detectada.</b> Necesitamos clasificar {overview.pending_classification} {overview.pending_classification === 1 ? "campaña nueva" : "campañas nuevas"}.
                    </Alert>
                )}

                <MetaFilters value={filters} onChange={setFilters} options={options} />

                <Stack spacing={2} sx={{ mt: 2 }}>
                    {overview.products.length === 0 && overview.has_connections && (
                        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px dashed", borderColor: "divider", p: 3, textAlign: "center" }}>
                            <Typography>No hay datos clasificados con estos filtros.</Typography>
                        </Paper>
                    )}
                    {overview.products.map((p) => <ProductCard key={p.product_id} p={p} canSeeSpend={canSeeSpend} onOpenCity={(c) => openCity(p.product_id, c)} />)}

                    {overview.unclassified.campaigns > 0 && (
                        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px dashed", borderColor: "warning.main", p: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                <Box>
                                    <Typography fontWeight="bold">Sin clasificar: {overview.unclassified.campaigns} {overview.unclassified.campaigns === 1 ? "campaña" : "campañas"} con datos</Typography>
                                    <Typography variant="body2" color="text.secondary">Se guardan, pero no suman en ningún producto ni ciudad hasta clasificarlas.</Typography>
                                </Box>
                                <Button size="small" onClick={() => setShowUnclassified(!showUnclassified)}>{showUnclassified ? "Ocultar" : "Ver números"}</Button>
                            </Stack>
                            <Collapse in={showUnclassified}>
                                <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ mt: 1 }}>
                                    {SUMMARY_COLS.filter((c) => canSeeSpend || !c.financial).map((c) => (
                                        <Box key={c.key}><Typography variant="caption" color="text.secondary">{c.label}</Typography><MetricCell node={overview.unclassified} col={c} /></Box>
                                    ))}
                                </Stack>
                            </Collapse>
                        </Paper>
                    )}
                </Stack>

                <Box id="meta-detalle" sx={{ mt: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                        <Typography variant="h6" component="h2" fontWeight="bold">Detalle</Typography>
                        {scope && <Chip label={scope} onDelete={() => setFilters({ ...filters, product_id: null, city_id: null, campaign: null, adset: null, creative: null })} />}
                    </Stack>
                    <MetaChart query={query} compare={filters.compare} canSeeSpend={canSeeSpend} title={scope || "Todo lo clasificado"} />
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mt: 2 }}>
                        <Tabs value={level} onChange={(_, v) => setLevel(v)} variant="scrollable" allowScrollButtonsMobile>
                            {LEVELS.map((l) => <Tab key={l.key} value={l.key} label={l.label} />)}
                        </Tabs>
                        {rows === null ? <Typography sx={{ p: 2 }}>Cargando…</Typography> : (
                            <MetaReportTable rows={rows} level={level} canSeeSpend={canSeeSpend} onOpen={openRow} onChanged={loadRows} />
                        )}
                    </Paper>
                </Box>
            </Box>
        </Layout>
    );
};
