// src/pages/my-group/WeeklyReportPage.tsx
// Reporte semanal de la Líder (spec §16): la parte numérica sale sola y ella escribe lo cualitativo.
// Se imprime desde el navegador (los botones no salen en la hoja). El administrador lo lee con ?grupo=.
import React, { useCallback, useEffect, useState } from "react";
import {
    Box, Button, Chip, CircularProgress, Divider, Paper, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { ArrowBackRounded, ChevronLeftRounded, ChevronRightRounded, PrintRounded, SaveRounded } from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { useUserStore } from "../../store/user/UserStore";
import { assignmentApi } from "../round-robin/assignmentApi";
import { fmtPct } from "../sales-groups/weights";
import { GroupAgency, GroupMetricsRow } from "../../interfaces/assignment.types";

interface ReportRow extends GroupMetricsRow {
    user_id: number;
    name: string;
    is_leader: boolean;
    load: number;
    previous_effectiveness: number | null;
}

interface Report {
    group: { id: number; name: string };
    leader: string | null;
    week_start: string;
    week_end: string;
    previous: { start: string; end: string; totals: GroupMetricsRow };
    totals: GroupMetricsRow;
    rows: ReportRow[];
    load_average: number | null;
    agencies: GroupAgency[];
    redistributions: { from: string; to: string; by: string; orders: number }[];
    fields: { key: string; label: string; value: string | null }[];
    saved_at: string | null;
    saved_by: string | null;
}

const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (s: string, days: number) => {
    const d = parse(s);
    d.setDate(d.getDate() + days);
    return iso(d);
};
const day = (s: string) => parse(s).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
const money = (n: number) => `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number | null) => (v === null ? "—" : fmtPct(v));
const color = (v: number | null): "error" | "warning" | "success" | "default" => (v === null ? "default" : v < 45 ? "error" : v < 50 ? "warning" : "success");
const pts = (cur: number | null, prev: number | null) => {
    if (cur === null || prev === null) return "";
    const d = Math.round((cur - prev) * 10) / 10;
    return d === 0 ? "igual" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d).toLocaleString("es-VE")} pts`;
};
const diff = (cur: number, prev: number) => (cur === prev ? "igual" : `${cur > prev ? "▲" : "▼"} ${Math.abs(cur - prev)}`);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Box mt={3} sx={{ breakInside: "avoid" }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        <Divider sx={{ mb: 1.5 }} />
        {children}
    </Box>
);

export const WeeklyReportPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const navigate = useNavigate();
    const theme = useUserStore((s) => s.user.theme);
    const [params, setParams] = useSearchParams();
    const viewGroup = params.get("grupo");
    const week = params.get("semana") ?? iso(new Date());
    const [report, setReport] = useState<Report | null>(null);
    const [texts, setTexts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const readOnly = !!viewGroup;
    const groupParam = viewGroup ? `&group_id=${viewGroup}` : "";

    const load = useCallback(async () => {
        setLoading(true);
        const res = await assignmentApi<Report>(`/my-group/report?week=${week}${groupParam}`);
        setLoading(false);
        if (res.ok && res.data) {
            setReport(res.data);
            setTexts(Object.fromEntries(res.data.fields.map((f) => [f.key, f.value ?? ""])));
        } else {
            toast.error(res.message);
        }
    }, [week, groupParam]);

    useEffect(() => {
        if (isValid) load();
    }, [isValid, load]);

    const goWeek = (days: number) => {
        const next = new URLSearchParams(params);
        next.set("semana", shift(report?.week_start ?? week, days));
        setParams(next);
    };

    const save = async () => {
        if (!report) return;
        setSaving(true);
        const res = await assignmentApi<Report>("/my-group/report", "PUT", { week: report.week_start, ...texts });
        setSaving(false);
        if (res.ok && res.data) {
            setReport(res.data);
            toast.success("Reporte guardado");
        } else {
            toast.error(res.message);
        }
    };

    if (loadingSession || !isValid) return <Loading />;

    const t = report?.totals;
    const p = report?.previous.totals;
    const isCurrentWeek = report ? report.week_end >= iso(new Date()) : true;

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: { xs: 1.5, md: 3 }, "@media print": { p: 0, bgcolor: "white" } }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2} sx={{ displayPrint: "none" }}>
                <Button startIcon={<ArrowBackRounded />} onClick={() => navigate(viewGroup ? `/mi-grupo?grupo=${viewGroup}` : "/mi-grupo")}>Mi grupo</Button>
                <Button startIcon={<ChevronLeftRounded />} onClick={() => goWeek(-7)} disabled={loading}>Semana anterior</Button>
                <Button endIcon={<ChevronRightRounded />} onClick={() => goWeek(7)} disabled={loading || isCurrentWeek}>Semana siguiente</Button>
                <Box flex={1} />
                {!readOnly && (
                    <Button variant="contained" startIcon={saving ? <CircularProgress size={14} /> : <SaveRounded />} onClick={save} disabled={!report || saving}>Guardar</Button>
                )}
                <Button variant="outlined" startIcon={<PrintRounded />} onClick={() => window.print()} disabled={!report}>Imprimir</Button>
            </Stack>

            {loading && !report && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}

            {report && t && p && (
                <Paper elevation={1} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, maxWidth: 1100, mx: "auto", "@media print": { boxShadow: "none", p: 0 } }}>
                    <Typography variant="overline" color="text.secondary">Reporte semanal</Typography>
                    <Typography variant="h5" fontWeight={700}>{report.group.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Semana del {day(report.week_start)} al {day(report.week_end)}{report.leader ? ` · Líder: ${report.leader}` : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Comparado con la semana del {day(report.previous.start)} al {day(report.previous.end)}.
                        {report.saved_at ? ` Última edición: ${new Date(report.saved_at).toLocaleString("es-VE")}${report.saved_by ? ` por ${report.saved_by}` : ""}.` : ""}
                    </Typography>

                    <Section title="Resumen del grupo">
                        <Box display="grid" gridTemplateColumns={{ xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={1.25}>
                            {[
                                { label: "Pedidos asignados", value: String(t.assigned), delta: diff(t.assigned, p.assigned) },
                                { label: "Entregados", value: String(t.delivered), delta: diff(t.delivered, p.delivered) },
                                { label: "Efectividad del grupo", value: pct(t.effectiveness), delta: pts(t.effectiveness, p.effectiveness), chip: color(t.effectiveness) },
                                { label: "Cancelados", value: `${t.cancelled} (${pct(t.cancelled_pct)})`, delta: pts(t.cancelled_pct, p.cancelled_pct) },
                                { label: "Novedades", value: `${t.novelties} · resueltas ${pct(t.resolved_pct)}`, delta: diff(t.novelties, p.novelties) },
                                { label: "Tasa de upsell", value: pct(t.upsell_pct), delta: pts(t.upsell_pct, p.upsell_pct) },
                                { label: "Pasados a agencia", value: pct(t.to_agency_pct), delta: pts(t.to_agency_pct, p.to_agency_pct) },
                                { label: "Comisiones de las vendedoras", value: money(t.commission_total), delta: "" },
                            ].map((k) => (
                                <Paper key={k.label} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                                    <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                                    {k.chip && k.chip !== "default" ? (
                                        <Box><Chip size="small" color={k.chip} label={k.value} /></Box>
                                    ) : (
                                        <Typography variant="h6" fontWeight={700}>{k.value}</Typography>
                                    )}
                                    {k.delta && <Typography variant="caption" color="text.secondary">{k.delta} vs. semana anterior</Typography>}
                                </Paper>
                            ))}
                        </Box>
                    </Section>

                    <Section title="Desempeño por vendedora">
                        <TableContainer>
                            {/* H8: celdas más estrechas y el dato secundario en otra línea, para que "Carga hoy" quepa sin desplazar */}
                            <Table size="small" sx={{ "& th, & td": { px: 1 } }}>
                                <TableHead>
                                    <TableRow sx={{ "& th": { whiteSpace: "nowrap" } }}>
                                        <TableCell>Vendedora</TableCell>
                                        <TableCell align="right">Asignados</TableCell>
                                        <TableCell align="right">Entregados</TableCell>
                                        <TableCell align="right">Efectividad</TableCell>
                                        <TableCell align="right">Cancelados</TableCell>
                                        <TableCell align="right">Novedades</TableCell>
                                        <TableCell align="right">Upsells</TableCell>
                                        <TableCell align="right">Comisión</TableCell>
                                        <TableCell align="right">Carga hoy</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {report.rows.map((r) => (
                                        <TableRow key={r.user_id}>
                                            <TableCell sx={{ fontWeight: r.is_leader ? 600 : 400 }}>{r.name}{r.is_leader ? " (Líder)" : ""}</TableCell>
                                            <TableCell align="right">{r.assigned}</TableCell>
                                            <TableCell align="right">{r.delivered}</TableCell>
                                            <TableCell align="right">
                                                <Chip size="small" color={color(r.effectiveness)} label={pct(r.effectiveness)} />
                                                {pts(r.effectiveness, r.previous_effectiveness) && (
                                                    <Typography variant="caption" color="text.secondary" display="block">{pts(r.effectiveness, r.previous_effectiveness)}</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                {r.cancelled}
                                                <Typography variant="caption" color="text.secondary" display="block">{pct(r.cancelled_pct)}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {r.novelties}
                                                {r.novelties > 0 && <Typography variant="caption" color="text.secondary" display="block" sx={{ whiteSpace: "nowrap" }}>{pct(r.resolved_pct)} resueltas</Typography>}
                                            </TableCell>
                                            <TableCell align="right">{pct(r.upsell_pct)}</TableCell>
                                            <TableCell align="right">{money(r.commission_total)}</TableCell>
                                            <TableCell align="right">{r.load}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="caption" color="text.secondary">
                            Efectividad: rojo por debajo de 45 %, amarillo hasta 50 %, verde desde 50 %. "Carga hoy" es la del momento de abrir el reporte
                            {report.load_average !== null ? ` (promedio del grupo: ${report.load_average.toLocaleString("es-VE")})` : ""}.
                        </Typography>
                    </Section>

                    <Section title="Agencias (solo pedidos del grupo)">
                        {report.agencies.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">Ningún pedido del grupo llegó a una agencia esta semana.</Typography>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ "& th": { whiteSpace: "nowrap" } }}>
                                            <TableCell>Agencia</TableCell>
                                            <TableCell align="right">Recibidos</TableCell>
                                            <TableCell align="right">Entregados</TableCell>
                                            <TableCell align="right">Efectividad</TableCell>
                                            <TableCell align="right">Pendientes</TableCell>
                                            <TableCell align="right">Novedades</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {report.agencies.map((a) => (
                                            <TableRow key={a.agency_id}>
                                                <TableCell>{a.name}</TableCell>
                                                <TableCell align="right">{a.received}</TableCell>
                                                <TableCell align="right">{a.delivered}</TableCell>
                                                <TableCell align="right">{pct(a.effectiveness)}</TableCell>
                                                <TableCell align="right">{a.pending}</TableCell>
                                                <TableCell align="right">{a.novelties}{a.novelties > 0 ? ` · ${pct(a.resolved_pct)} res.` : ""}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Section>

                    <Section title="Pedidos pasados de una vendedora a otra">
                        {report.redistributions.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No hubo reasignaciones en bloque esta semana.</Typography>
                        ) : (
                            report.redistributions.map((r, i) => (
                                <Typography key={i} variant="body2">
                                    De <strong>{r.from}</strong> a <strong>{r.to}</strong>: {r.orders} {r.orders === 1 ? "pedido" : "pedidos"} (por {r.by})
                                </Typography>
                            ))
                        )}
                    </Section>

                    <Section title="Lo que completa la Líder">
                        <Stack spacing={2}>
                            {report.fields.map((f) => (
                                <Box key={f.key} sx={{ breakInside: "avoid" }}>
                                    <Typography variant="body2" fontWeight={600}>{f.label}</Typography>
                                    {readOnly ? (
                                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }} color={texts[f.key] ? undefined : "text.secondary"}>
                                            {texts[f.key] || "Sin completar."}
                                        </Typography>
                                    ) : (
                                        <>
                                            <TextField
                                                fullWidth
                                                multiline
                                                minRows={2}
                                                size="small"
                                                value={texts[f.key] ?? ""}
                                                onChange={(e) => setTexts({ ...texts, [f.key]: e.target.value })}
                                                slotProps={{ htmlInput: { maxLength: 5000 } }}
                                                sx={{ displayPrint: "none" }}
                                            />
                                            <Typography variant="body2" sx={{ display: "none", displayPrint: "block", whiteSpace: "pre-wrap" }}>
                                                {texts[f.key] || "—"}
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            ))}
                        </Stack>
                    </Section>
                </Paper>
            )}
            <ToastContainer stacked position="top-right" autoClose={4000} theme={theme} transition={Bounce} />
        </Box>
    );
};

export default WeeklyReportPage;
