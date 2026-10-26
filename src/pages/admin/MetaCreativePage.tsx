// src/pages/admin/MetaCreativePage.tsx
// §60: "Después quiero entrar en C004 y poder ver: rendimiento agregado del creativo; anuncios donde se está
// utilizando; CPA; CTR; CPM; Frequency; Hook Rate; Hold Rate; reproducciones; retención; evolución histórica; gráfica
// por métrica; comparación entre períodos", sumando todas las cuentas (§33). El estado (§41) se pone a mano.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { COLUMNS, CREATIVE_STATUS, DEFAULT_FILTERS, Filters, RangeInfo, ReportRow, api, filtersQuery, fmt, shortDay } from "../../components/meta-ads/metaAds";
import { MetaFilters } from "../../components/meta-ads/MetaFilters";
import { MetricCell, RuleChips } from "../../components/meta-ads/MetaWidgets";
import { MetaReportTable } from "../../components/meta-ads/MetaReportTable";
import { MetaChart } from "../../components/meta-ads/MetaChart";

type Detail = {
    creative: { id: number; tracking_id: string; type: string | null; status: string | null; status_changed_at: string | null };
    summary: ReportRow | null;
    ads: ReportRow[];
    range: RangeInfo;
    can_see_financials: boolean;
};

export const MetaCreativePage: React.FC = () => {
    const { id } = useParams();
    const { loadingSession, isValid } = useValidateSession();
    const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, creative: Number(id) });
    const [data, setData] = useState<Detail | null>(null);
    const query = useMemo(() => filtersQuery({ ...filters, creative: Number(id), include_inactive: true }), [filters, id]);

    const load = useCallback(() => {
        api<Detail>(`/meta/report/creatives/${id}?${query}`).then(setData).catch((e) => toast.error(e.message));
    }, [id, query]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    if (loadingSession || !isValid || !data) return <Loading />;
    const s = data.summary;
    const isVideo = data.creative.type !== "image";
    const canSeeSpend = data.can_see_financials;

    const setStatus = async (status: string) => {
        try {
            await api(`/meta/creatives/${id}/status`, "PUT", { status: status || null });
            toast.success("Estado guardado");
            load();
        } catch (e) { toast.error((e as Error).message); }
    };

    const kpis = COLUMNS.filter((c) => (canSeeSpend || !c.financial) && (isVideo || !c.video));

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1300, mx: "auto" }}>
                <DescripcionDeVista title={`Creativo ${data.creative.tracking_id}`} backPath="/meta-ads"
                    description="Rendimiento del creativo sumando todos los anuncios, campañas y cuentas donde se usa." />
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        {isVideo ? (data.creative.type === "mixed" ? "Video e imagen" : "Video") : "Imagen"} · {data.ads.length} anuncios ·
                        {" "}{data.range.label}: {shortDay(data.range.from)} – {shortDay(data.range.to)}
                    </Typography>
                    <TextField select size="small" label="Estado del creativo" value={data.creative.status ?? ""} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 200 }}>
                        <MenuItem value="">Sin estado</MenuItem>
                        {Object.entries(CREATIVE_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </TextField>
                </Stack>
                <MetaFilters value={filters} onChange={setFilters} compact />

                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2, mt: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Rendimiento agregado</Typography>
                    {s === null ? <Typography color="text.secondary">Sin datos en este rango.</Typography> : (
                        <>
                            <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap">
                                {kpis.map((c) => (
                                    <Box key={c.key} sx={{ minWidth: 90 }}>
                                        <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                                        <MetricCell node={s} col={c} />
                                    </Box>
                                ))}
                                {isVideo && (
                                    <>
                                        <Box><Typography variant="caption" color="text.secondary">Reproducciones</Typography><Typography variant="body2">{fmt.num(s.totals.video_plays)}</Typography></Box>
                                        <Box><Typography variant="caption" color="text.secondary">De 3 segundos</Typography><Typography variant="body2">{fmt.num(s.totals.video_3s_plays)}</Typography></Box>
                                        <Box><Typography variant="caption" color="text.secondary">ThruPlays</Typography><Typography variant="body2">{fmt.num(s.totals.thruplays)}</Typography></Box>
                                        <Box><Typography variant="caption" color="text.secondary">Tiempo medio</Typography><Typography variant="body2">{fmt.secs(s.metrics.avg_watch_time)}</Typography></Box>
                                    </>
                                )}
                            </Stack>
                            <RuleChips rules={s.signals.rules} />
                            {isVideo && s.metrics.retention && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary">Retención (vistas sobre las reproducciones)</Typography>
                                    <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ height: 90, mt: 0.5 }}>
                                        {(["p25", "p50", "p75", "p95", "p100"] as const).map((k) => {
                                            const v = s.metrics.retention?.[k] ?? null;
                                            return (
                                                <Box key={k} sx={{ flex: 1, maxWidth: 80, textAlign: "center" }}>
                                                    <Typography variant="caption">{fmt.pct(v)}</Typography>
                                                    <Box sx={{ height: `${Math.max(2, Math.min(100, v ?? 0)) * 0.6}px`, bgcolor: "primary.main", borderRadius: 1 }} />
                                                    <Typography variant="caption" color="text.secondary">{k.slice(1)} %</Typography>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            )}
                        </>
                    )}
                </Paper>

                <Box sx={{ mt: 2 }}>
                    <MetaChart query={query} compare={filters.compare} isVideo={isVideo} canSeeSpend={canSeeSpend} title={data.creative.tracking_id} />
                </Box>

                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mt: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ p: 2, pb: 0 }}>Anuncios donde se usa</Typography>
                    <MetaReportTable rows={data.ads} level="ad" canSeeSpend={canSeeSpend} onChanged={load} />
                </Paper>
            </Box>
        </Layout>
    );
};
