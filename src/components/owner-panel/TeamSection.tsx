// src/components/owner-panel/TeamSection.tsx
// Panel del dueño › Equipo (diccionario de métricas, §4): los KPIs de cada rol. Arriba se elige el rol; se ven sus
// tarjetas, un ranking con barras (eligiendo por qué número ordenar) y la tabla persona por persona, y al tocar a una
// persona, su detalle. Qué roles hay y qué KPIs tiene cada uno viene del backend (Metrics\Team\TeamCatalog): un rol
// nuevo aparece solo, y uno del sistema sin KPIs se avisa.
import React, { FC, useEffect, useState } from "react";
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Panel } from "../ui/surface/Panel";
import { useGoalColor } from "./goalColor";
import { MetricCard } from "./MetricCard";
import { TeamPersonDialog } from "./TeamPersonDialog";
import { TeamTable } from "./TeamTable";
import { BoxTitle, Empty, SectionTitle } from "./parts";
import { Filters, TeamResponse, TeamRoleData, TeamRow, count, formatValue, sortTeam } from "./ownerPanel";

const list = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}` : items[0] ?? "");

/**
 * El ranking con barras por el número que se elija. Los de pocos datos van al final, en gris y sin puesto. Si el número
 * tiene meta del dueño, la rayita es la meta; quien ya no llega sale en amarillo o rojo, y quien todavía puede llegar con
 * lo que tiene en camino, en gris.
 */
const Ranking: FC<{ role: TeamRoleData }> = ({ role }) => {
    const [key, setKey] = useState(role.rank_by);
    const goalColor = useGoalColor();
    const col = role.columns.find((c) => c.key === key) ?? role.columns[0];
    const rows = sortTeam(role.rows, col.key, col.better);
    const max = Math.max(...rows.map((r) => Math.abs(r.values[col.key] ?? 0)), col.goal?.value ?? 0, 0);
    const width = (v: number | null) => (v === null ? 0 : col.format === "percent" ? Math.min(100, Math.max(0, v)) : max > 0 ? (Math.abs(v) / max) * 100 : 0);
    const tick = col.goal ? width(col.goal.value) : null;
    let place = 0;

    return (
        <Panel sx={{ minWidth: 0 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={1} sx={{ mb: 1 }}>
                <BoxTitle title="Ranking" subtitle={col.better === "lower" ? "De menor a mayor: aquí lo mejor es lo más bajo." : "De mayor a menor."} help={col.help} />
                <TextField select size="small" label="Ordenar por" value={col.key} onChange={(e) => setKey(e.target.value)} sx={{ minWidth: 230 }}>
                    {role.columns.map((c) => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
                </TextField>
            </Stack>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
                Todos juntos: <b>{formatValue(role.totals[col.key] ?? null, col.format)}</b>. Con menos de {role.base.min} {role.base.label} van al final, en gris («pocos datos»).
                {col.goal && (
                    <> La rayita es tu {col.better === "lower" ? "máximo" : "meta"} (<b>{formatValue(col.goal.value, col.format)}</b>): en amarillo o rojo,
                        quien ya no llega aunque se le entregue lo que tiene en camino; en gris, quien todavía puede llegar.</>
                )}
            </Typography>
            <Stack spacing={1.25}>
                {rows.map((r) => {
                    const v = r.values[col.key] ?? null;
                    const flagged = r.flags.includes(col.key);
                    const goal = r.goal_levels?.[col.key];
                    if (!r.low_data && v !== null) place++;
                    return (
                        <Box key={r.id} sx={{ opacity: r.low_data ? 0.55 : 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                                <Typography variant="body2" fontWeight={700} sx={{ minWidth: 0 }}>
                                    {!r.low_data && v !== null && <Box component="span" sx={{ color: "text.secondary", mr: 0.75 }}>{place}.</Box>}
                                    {r.name}
                                    {r.group && <Typography component="span" variant="caption" color="text.secondary"> · {r.group}</Typography>}
                                </Typography>
                                <Typography variant="body2" fontWeight={800} sx={{ whiteSpace: "nowrap" }}>
                                    {formatValue(v, col.format)}
                                    {r.low_data && <Typography component="span" variant="caption" color="text.secondary"> · pocos datos ({count(r.values[role.base.key] ?? 0)})</Typography>}
                                </Typography>
                            </Stack>
                            <Box sx={{ position: "relative", height: 8, borderRadius: 4, bgcolor: "action.hover", mt: 0.5 }}>
                                <Box sx={{ height: "100%", width: `${width(v)}%`, borderRadius: 4,
                                    bgcolor: r.low_data ? "grey.500" : goal === "red" || goal === "yellow" ? goalColor(goal)
                                        : goal === "pending" ? "grey.400" : flagged ? "warning.main" : "primary.main" }} />
                                {tick !== null && <Box sx={{ position: "absolute", left: `calc(${tick}% - 1px)`, top: -3, bottom: -3, width: 2, borderRadius: 1, bgcolor: "text.primary" }} />}
                            </Box>
                        </Box>
                    );
                })}
            </Stack>
        </Panel>
    );
};

export const TeamSection: FC<{
    data: TeamResponse;
    loading: boolean;
    role: string;
    onRole: (key: string) => void;
    filters: Filters;
    /** Abrir el detalle de una persona (al tocarla en una alerta), cuando ya cargó su rol. */
    focus?: { role: string; id: number; name: string } | null;
    onFocused?: () => void;
}> = ({ data, loading, role, onRole, filters, focus, onFocused }) => {
    const [open, setOpen] = useState<TeamRow | null>(null);
    const r = data.role;

    useEffect(() => {
        if (!focus || loading || r.key !== focus.role) return;
        setOpen(r.rows.find((x) => x.id === focus.id)
            ?? { id: focus.id, name: focus.name, group: null, values: {}, previous: null, low_data: false, flags: [] });
        onFocused?.();
    }, [focus, loading, r, onFocused]);
    const filtered = Boolean(filters.shop || filters.city || filters.product);
    const { missing, unmeasured } = data.coverage;

    return (
        <Stack spacing={2} sx={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
            <SectionTitle title="Equipo" />

            <Stack direction="row" flexWrap="wrap" gap={1}>
                {data.roles.map((x) => {
                    const on = (loading ? role : r.key) === x.key;
                    return <Chip key={x.key} label={`${x.label} · ${count(x.people)}`} color={on ? "primary" : "default"} variant={on ? "filled" : "outlined"} onClick={() => onRole(x.key)} />;
                })}
            </Stack>

            {missing.length > 0 && (
                <Alert severity="warning">
                    {missing.length === 1 ? <>El rol <b>{missing[0]}</b> existe en el sistema y todavía no tiene KPIs.</>
                        : <>Los roles <b>{list(missing)}</b> existen en el sistema y todavía no tienen KPIs.</>}
                    {" "}Cuando definas sus números con Claude, aparecerán aquí como los demás.
                </Alert>
            )}

            <Box>
                <BoxTitle title={r.label} subtitle="Pasa el cursor (o toca) sobre cada número para ver cómo se calcula. Toca una fila para ver el detalle." help={r.help} />
                {r.filters_note && filtered && <Alert severity="info" variant="outlined" sx={{ py: 0.25 }}>{r.filters_note}</Alert>}
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: { xs: 1, sm: 1.5 } }}>
                {data.cards.map((c) => <MetricCard key={c.key} card={c} compareLabel={data.previous.label} />)}
            </Box>

            {r.rows.length === 0 ? (
                <Panel><Empty text={`Nadie de ${r.label.toLowerCase()} tuvo actividad en este período.`} /></Panel>
            ) : (
                <>
                    <Ranking key={r.key} role={r} />
                    <Panel sx={{ minWidth: 0 }}>
                        <BoxTitle title="Uno por uno" subtitle={`Las flechas comparan con ${data.previous.label.toLowerCase()}. Toca una fila para ver su detalle.`} />
                        <TeamTable key={r.key} data={r} maturing={data.maturing} compareLabel={data.previous.label}
                            totals={r.totals} totalsPrevious={r.totals_previous} onOpen={setOpen}
                            totalsNote={r.key === "editors" ? "Todos los encargos del equipo de editores" : r.key === "landing_editors" ? "Todos los encargos de landing" : undefined} />
                    </Panel>
                </>
            )}

            {unmeasured.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                    Sin medir por decisión tuya: {list(unmeasured.map((u) => u.role))}.
                </Typography>
            )}

            <TeamPersonDialog row={open} role={r.key} filters={filters} maturing={data.maturing} onClose={() => setOpen(null)} />
        </Stack>
    );
};
