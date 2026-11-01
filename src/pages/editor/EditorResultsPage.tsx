// src/pages/editor/EditorResultsPage.tsx
// Etapa 5, paso 5b (2026-10-30): "Mis resultados" de los editores de video. Sus indicadores del período (entregas a
// tiempo, lo devuelto, % de ganadores) y cómo les fue a sus batches. `.63` (decisión del dueño): solo si ganó, perdió o
// empató; ni compras, ni CPA, ni ciudades (el servidor ya no los manda). El editor líder ve además los de cada editor.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { Better, MetricFormat, PeriodInfo, formatValue } from "../../components/owner-panel/ownerPanel";

type Preset = "7d" | "month" | "last_month";
type Metric = { key: string; label: string; format: MetricFormat; better: Better; help: string };
type Values = { values: Record<string, number | null>; details: Record<string, string> };
type ResultBatch = {
    id: number; code: string; product: string | null; editor: string | null; status: string; status_label: string; testing_at: string | null; tested_at: string | null;
    /** .63: "Ganó", "Perdió", "Empate", "En test" o "Por lanzar". */
    result: string; winner: boolean | null; on_time: boolean | null; versions: number; returned: number;
};
type Data = {
    period: PeriodInfo; leader: boolean; metrics: Metric[]; me: Values;
    team: { totals: Values; people: ({ id: number; name: string; group: string | null } & Values)[] } | null;
    batches: ResultBatch[];
};

const PRESETS: { key: Preset; label: string }[] = [{ key: "7d", label: "Últimos 7 días" }, { key: "month", label: "Este mes" }, { key: "last_month", label: "Mes pasado" }];
const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const RESULT_COLOR: Record<string, "success" | "error" | "warning" | "default" | "info"> = { "Ganó": "success", "Perdió": "error", "Empate": "default", "En test": "warning", "Por lanzar": "info" };

const Kpi: React.FC<{ m: Metric; v: Values }> = ({ m, v }) => (
    <Tooltip title={m.help}>
        <Paper elevation={0} sx={{ ...card, p: 1.5, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" component="div">{m.label}</Typography>
            <Typography variant="h6" fontWeight={700}>{formatValue(v.values[m.key] ?? null, m.format)}</Typography>
            <Typography variant="caption" color="text.secondary" component="div">{v.details[m.key] ?? " "}</Typography>
        </Paper>
    </Tooltip>
);

export const EditorResultsPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [preset, setPreset] = useState<Preset>("month");
    const [data, setData] = useState<Data | null>(null);

    const load = useCallback(() => {
        api<Data>(`/editor/results?periodo=${preset}`).then(setData).catch((e) => toast.error(e.message));
    }, [preset]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    if (loadingSession || !isValid || !data) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1000, mx: "auto" }}>
                <DescripcionDeVista title="Mis resultados" description="Cómo te va: tus entregas y si tus videos ganaron o perdieron. Solo cuentan los encargos de la cola." />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    {PRESETS.map((p) => <Chip key={p.key} label={p.label} color={preset === p.key ? "primary" : "default"} variant={preset === p.key ? "filled" : "outlined"} onClick={() => setPreset(p.key)} />)}
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>{data.period.from === data.period.to ? data.period.from : `${data.period.from} al ${data.period.to}`}</Typography>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5, mb: 2 }}>
                    {data.metrics.map((m) => <Kpi key={m.key} m={m} v={data.me} />)}
                </Box>

                {data.team && (
                    <Paper elevation={0} sx={{ ...card, mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Resultados del equipo</Typography>
                        <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>Cada editor y el total del equipo en el mismo período.</Typography>
                        <TableContainer sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Editor</TableCell>
                                        {data.metrics.map((m) => <TableCell key={m.key} align="right">{m.label}</TableCell>)}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.team.people.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>{p.name}{p.group ? ` (${p.group.toLowerCase()})` : ""}</TableCell>
                                            {data.metrics.map((m) => <TableCell key={m.key} align="right">{formatValue(p.values[m.key] ?? null, m.format)}</TableCell>)}
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ "& td": { fontWeight: 700 } }}>
                                        <TableCell>Equipo</TableCell>
                                        {data.metrics.map((m) => <TableCell key={m.key} align="right">{formatValue(data.team?.totals.values[m.key] ?? null, m.format)}</TableCell>)}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {data.team.people.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Todavía nadie entregó ni tiene resultados en este período.</Typography>}
                    </Paper>
                )}

                <Paper elevation={0} sx={card}>
                    <Typography variant="subtitle1" fontWeight="bold">{data.leader ? "Los batches del equipo" : "Tus batches"}</Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                        En test arriba y después lo testeado, lo más nuevo primero.
                    </Typography>
                    {data.batches.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Todavía no hay batches tuyos en Meta.</Typography>
                        : data.batches.map((b) => (
                            <Box key={b.id} sx={{ py: 1.25, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Chip size="small" color="primary" label={b.code} sx={{ fontWeight: 700 }} />
                                    <Typography variant="body2" fontWeight={700}>{b.product}</Typography>
                                    {data.leader && b.editor && <Chip size="small" variant="outlined" label={b.editor} />}
                                    <Chip size="small" label={b.result} color={RESULT_COLOR[b.result] ?? "default"} sx={{ fontWeight: 700 }} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                                    {[
                                        b.on_time === null ? null : b.on_time ? "entregado a tiempo" : "entregado tarde",
                                        b.versions > 1 ? `${b.versions} versiones (${b.returned} ${b.returned === 1 ? "devuelta" : "devueltas"})` : null,
                                        b.tested_at ? `testeado el ${dateTime(b.tested_at)}` : b.testing_at ? `en Meta desde el ${dateTime(b.testing_at)}` : null,
                                    ].filter(Boolean).join(" · ")}
                                </Typography>
                            </Box>
                        ))}
                </Paper>
            </Box>
        </Layout>
    );
};
