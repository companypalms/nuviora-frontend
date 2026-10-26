// src/pages/my-group/MyGroup.tsx
// Fase de la Líder: lo que ve y hace con su grupo, además de todo lo de vendedora.
// Métricas (Fran, 2026-09-26), % de sus vendedoras, roster de hoy y reasignación dentro del grupo.
// Cada acción la valida el servidor (MyGroupController): aquí solo se muestra y se pide.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem,
    Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
    ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from "@mui/material";
import {
    ArrowBackRounded, BalanceRounded, DescriptionRounded, RefreshRounded, SaveRounded, StarRounded, StickyNote2Outlined, SwapHorizRounded,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { useUserStore } from "../../store/user/UserStore";
import { assignmentApi } from "../round-robin/assignmentApi";
import { BulkReassignDialog } from "../round-robin/BulkReassignDialog";
import { NotesDialog } from "./NotesDialog";
import { MeetingsCard } from "./MeetingsCard";
import { AgencyChart, LoadChart, PeriodCharts } from "./GroupCharts";
import { fmtPct, groupShares, weightsError, weightsSummary } from "../sales-groups/weights";
import { GroupAgency, GroupMetrics, GroupMetricsRow, LeaderEarnings, MyGroupData, MyGroupMember, SellerRef } from "../../interfaces/assignment.types";

/* ─────────────────────────── utilidades ─────────────────────────── */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const money = (n: number) => `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const firstName = (name: string) => name.split(" ")[0];

// Períodos de la spec §7.1 (semanas de lunes a domingo)
type Preset = "hoy" | "ayer" | "semana" | "semana_pasada" | "mes" | "mes_pasado" | "otro";
type CompareMode = "anterior" | "otro" | "no";

const parseIso = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number) => {
    const d = parseIso(s);
    d.setDate(d.getDate() + n);
    return iso(d);
};
const fmtDate = (s: string) => parseIso(s).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });

function presetRange(p: Exclude<Preset, "otro">): [string, string] {
    const now = new Date();
    const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const monday = day(-((now.getDay() + 6) % 7));
    switch (p) {
        case "hoy": return [iso(now), iso(now)];
        case "ayer": return [iso(day(-1)), iso(day(-1))];
        case "semana": return [iso(monday), iso(now)];
        case "semana_pasada": return [addDays(iso(monday), -7), addDays(iso(monday), -1)];
        case "mes": return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
        case "mes_pasado": return [iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))];
    }
}

/**
 * El período con el que se compara por defecto (spec §7.2): esta semana contra los mismos días de la
 * semana pasada, este mes contra los mismos días del mes anterior, y cualquier otro rango contra los
 * mismos días justo antes.
 */
function previousRange(p: Preset, [a, b]: [string, string]): [string, string] {
    if (p === "semana" || p === "semana_pasada") return [addDays(a, -7), addDays(b, -7)];
    if (p === "mes" || p === "mes_pasado") {
        const start = parseIso(a);
        const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
        const prevLast = new Date(start.getFullYear(), start.getMonth(), 0);
        if (p === "mes_pasado") return [iso(prevStart), iso(prevLast)];
        const end = new Date(prevStart.getFullYear(), prevStart.getMonth(), Math.min(parseIso(b).getDate(), prevLast.getDate()));
        return [iso(prevStart), iso(end)];
    }
    const days = Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000) + 1;
    return [addDays(a, -days), addDays(a, -1)];
}

/** Cuánto subió o bajó un número frente al período comparado. Verde si mejoró, rojo si empeoró. */
const Delta: React.FC<{ cur?: number | null; prev?: number | null; kind?: "count" | "pts" | "money"; good?: "up" | "down" }> = ({ cur, prev, kind = "count", good }) => {
    if (cur === undefined || prev === undefined || cur === null || prev === null) return null;
    const diff = Math.round((cur - prev) * 100) / 100;
    const abs = Math.abs(diff);
    const text = diff === 0 ? "igual" : `${diff > 0 ? "▲" : "▼"} ${kind === "pts" ? `${abs.toLocaleString("es-VE")} pts` : kind === "money" ? money(abs) : abs}`;
    const better = good && diff !== 0 ? (good === "up" ? diff > 0 : diff < 0) : null;
    return (
        <Typography variant="caption" display="block" sx={{ whiteSpace: "nowrap" }}
            color={better === null ? "text.secondary" : better ? "success.main" : "error.main"}>
            {text}
        </Typography>
    );
};

/** Semáforo de efectividad de la spec §8.5: rojo < 45 %, amarillo 45–49,99 %, verde ≥ 50 %. */
const effectivenessColor = (v: number | null): "error" | "warning" | "success" | "default" =>
    v === null ? "default" : v < 45 ? "error" : v < 50 ? "warning" : "success";

const PctCell: React.FC<{ pct: number | null; count: number; title: string; delta?: React.ReactNode }> = ({ pct, count, title, delta }) => (
    <TableCell align="right">
        <Tooltip title={title}>
            <Box component="span">
                <Typography variant="body2" component="span">{pct === null ? "—" : fmtPct(pct)}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{count}</Typography>
            </Box>
        </Tooltip>
        {delta}
    </TableCell>
);

const NameCell: React.FC<{ member?: MyGroupMember; label?: string }> = ({ member, label }) => (
    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: label ? 700 : member?.is_leader ? 600 : 400 }}>
        {member?.is_leader && <StarRounded sx={{ fontSize: 14, color: "warning.main", verticalAlign: -2, mr: 0.5 }} />}
        {label ?? member?.name}
    </TableCell>
);

/* ─────────────────────────── Ahora mismo ─────────────────────────── */

/** Botones en una sola fila que se desliza en el teléfono, en vez de partirse en filas desparejas (2026-10-03). */
const scrollRow = {
    maxWidth: "100%", overflowX: "auto", flexWrap: "nowrap",
    "& .MuiToggleButton-root": { whiteSpace: "nowrap", textTransform: "none", flexShrink: 0 },
} as const;

const MAIN_STATUSES = ["Asignado a vendedor", "Llamado 1", "Llamado 2", "Llamado 3", "Reprogramado para hoy"];
const SHORT: Record<string, string> = { "Asignado a vendedor": "Asignadas", "Reprogramado para hoy": "Reprog. hoy" };

const NowCard: React.FC<{ data: MyGroupData }> = ({ data }) => {
    const main = MAIN_STATUSES.map((d) => data.statuses.find((s) => s.description === d)).filter(Boolean) as MyGroupData["statuses"];
    const rest = data.statuses.filter((s) => !MAIN_STATUSES.includes(s.description));
    const count = (m: MyGroupMember, id: number) => m.pipeline?.[id] ?? 0;
    const restOf = (m: MyGroupMember) => rest.reduce((a, s) => a + count(m, s.id), 0);
    const totalOf = (m: MyGroupMember) => data.statuses.reduce((a, s) => a + count(m, s.id), 0);
    const restDetail = (m: MyGroupMember) => rest.filter((s) => count(m, s.id) > 0).map((s) => `${s.description}: ${count(m, s.id)}`).join(" · ") || "Ninguna";
    const sum = (f: (m: MyGroupMember) => number) => data.members.reduce((a, m) => a + f(m), 0);
    const [notesOf, setNotesOf] = useState<{ id: number; name: string } | null>(null);

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <NotesDialog seller={notesOf} mode={data.read_only ? "admin" : "leader"} onClose={() => setNotesOf(null)} />
            <Typography variant="subtitle1" fontWeight={700}>Ahora mismo</Typography>
            <Typography variant="caption" color="text.secondary">Órdenes que cada una tiene en curso en este momento.</Typography>
            {data.members.filter((m) => m.saturated).map((m) => (
                <Alert key={m.id} severity="warning" sx={{ mt: 1 }}>
                    <strong>{m.name}</strong> está saturada: tiene {m.load} pedidos en carga,
                    {m.over_pct !== null ? ` ${Math.round(m.over_pct)} % más que` : " por encima de"} el promedio del grupo
                    {data.saturation.average !== null ? ` (${fmtPct(data.saturation.average).replace(" %", "")})` : ""}. Puedes pasarle parte a otra vendedora con "Reasignar".
                </Alert>
            ))}
            <TableContainer sx={{ mt: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ "& th": { whiteSpace: "nowrap" } }}>
                            <TableCell>Vendedora</TableCell>
                            <TableCell align="right">Activas</TableCell>
                            <TableCell align="right">Carga</TableCell>
                            {main.map((s) => <TableCell key={s.id} align="right">{SHORT[s.description] ?? s.description}</TableCell>)}
                            <TableCell align="right">Otras</TableCell>
                            <TableCell align="right">Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.members.map((m) => {
                            const full = m.max_active_orders !== null && m.active_orders >= m.max_active_orders;
                            return (
                                <TableRow key={m.id} hover>
                                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: m.is_leader ? 600 : 400 }}>
                                        {m.is_leader && <StarRounded sx={{ fontSize: 14, color: "warning.main", verticalAlign: -2, mr: 0.5 }} />}
                                        {m.name}
                                        {!m.is_leader && (
                                            <Tooltip title="Notas privadas sobre ella">
                                                <IconButton size="small" onClick={() => setNotesOf({ id: m.id, name: m.name })} sx={{ ml: 0.5, p: 0.25 }}>
                                                    <StickyNote2Outlined sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Asignado a vendedor y Llamado 1-3, sumando todas las tiendas. Al llegar a su máximo deja de recibir, salvo que todas estén en su máximo: entonces se reparte en partes iguales, sin mirar el %.">
                                            <Typography variant="body2" component="span" color={full ? "error.main" : undefined} fontWeight={full ? 700 : 400}>
                                                {m.active_orders}{m.max_active_orders !== null ? ` / ${m.max_active_orders}` : ""}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={`Asignado a vendedor + Reprogramado para hoy. Promedio del grupo: ${data.saturation.average ?? "—"}. Se avisa desde un ${Math.round((data.saturation.threshold - 1) * 100)} % por encima.`}>
                                            {m.saturated ? (
                                                <Chip size="small" color="warning" label={`${m.load} · saturada`} />
                                            ) : (
                                                <span>{m.load}</span>
                                            )}
                                        </Tooltip>
                                    </TableCell>
                                    {main.map((s) => <TableCell key={s.id} align="right">{count(m, s.id)}</TableCell>)}
                                    <TableCell align="right"><Tooltip title={restDetail(m)}><span>{restOf(m)}</span></Tooltip></TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>{totalOf(m)}</TableCell>
                                </TableRow>
                            );
                        })}
                        <TableRow sx={{ "& td": { fontWeight: 700, borderTop: 2, borderColor: "divider" } }}>
                            <NameCell label="Grupo" />
                            <TableCell align="right">{sum((m) => m.active_orders)}</TableCell>
                            <TableCell align="right">{sum((m) => m.load)}</TableCell>
                            {main.map((s) => <TableCell key={s.id} align="right">{sum((m) => count(m, s.id))}</TableCell>)}
                            <TableCell align="right">{sum(restOf)}</TableCell>
                            <TableCell align="right">{sum(totalOf)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <Box mt={1.5}>
                <LoadChart data={data} />
            </Box>
        </Paper>
    );
};

/* ─────────────────────────── Rendimiento ─────────────────────────── */

const MetricsCard: React.FC<{ data: MyGroupData; reloadKey: number }> = ({ data, reloadKey }) => {
    const [preset, setPreset] = useState<Preset>("semana");
    const [range, setRange] = useState<[string, string]>(presetRange("semana"));
    const [compareMode, setCompareMode] = useState<CompareMode>("anterior");
    const [otherRange, setOtherRange] = useState<[string, string]>(previousRange("semana", presetRange("semana")));
    const [metrics, setMetrics] = useState<GroupMetrics | null>(null);
    const [loading, setLoading] = useState(false);

    const gq = groupQuery(data);
    const compareRange = useMemo<[string, string] | null>(
        () => (compareMode === "anterior" ? previousRange(preset, range) : compareMode === "otro" ? otherRange : null),
        [compareMode, preset, range, otherRange]
    );

    useEffect(() => {
        if (!range[0] || !range[1] || range[0] > range[1]) return;
        if (compareRange && (!compareRange[0] || !compareRange[1] || compareRange[0] > compareRange[1])) return;
        let cancelled = false;
        setLoading(true);
        const compare = compareRange ? `&compare_start=${compareRange[0]}&compare_end=${compareRange[1]}` : "";
        assignmentApi<GroupMetrics>(`/my-group/metrics?start_date=${range[0]}&end_date=${range[1]}${compare}${gq}`).then((res) => {
            if (cancelled) return;
            setLoading(false);
            if (res.ok && res.data) setMetrics(res.data);
            else toast.error(res.message);
        });
        return () => {
            cancelled = true;
        };
    }, [range, compareRange, reloadKey, gq]);

    const choose = (p: Preset | null) => {
        if (!p) return;
        setPreset(p);
        if (p !== "otro") setRange(presetRange(p));
    };

    const rowOf = (id: number) => metrics?.rows.find((r) => r.user_id === id);
    const prevOf = (id: number) => metrics?.compare?.rows.find((r) => r.user_id === id);

    const cells = (r: GroupMetricsRow | undefined, p: GroupMetricsRow | undefined) => (
        <>
            <TableCell align="right">{r?.assigned ?? 0}<Delta cur={r?.assigned} prev={p?.assigned} /></TableCell>
            <TableCell align="right">{r?.delivered ?? 0}<Delta cur={r?.delivered} prev={p?.delivered} good="up" /></TableCell>
            <TableCell align="right">
                <Chip size="small" color={effectivenessColor(r?.effectiveness ?? null)} label={r?.effectiveness == null ? "—" : fmtPct(r.effectiveness)} />
                <Delta cur={r?.effectiveness} prev={p?.effectiveness} kind="pts" good="up" />
            </TableCell>
            <PctCell pct={r?.cancelled_pct ?? null} count={r?.cancelled ?? 0} title="Canceladas ÷ asignadas"
                delta={<Delta cur={r?.cancelled_pct} prev={p?.cancelled_pct} kind="pts" good="down" />} />
            <PctCell pct={r?.to_agency_pct ?? null} count={r?.to_agency ?? 0} title="Pasadas a agencia ÷ asignadas"
                delta={<Delta cur={r?.to_agency_pct} prev={p?.to_agency_pct} kind="pts" good="up" />} />
            <PctCell pct={r?.upsell_pct ?? null} count={r?.delivered_with_upsell ?? 0} title="Entregadas con upsell ÷ entregadas"
                delta={<Delta cur={r?.upsell_pct} prev={p?.upsell_pct} kind="pts" good="up" />} />
            <TableCell align="right">{money(r?.commission_sales ?? 0)}</TableCell>
            <TableCell align="right">{money(r?.commission_upsells ?? 0)}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>{money(r?.commission_total ?? 0)}<Delta cur={r?.commission_total} prev={p?.commission_total} kind="money" good="up" /></TableCell>
        </>
    );

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Rendimiento</Typography>
                    <Typography variant="caption" color="text.secondary">Órdenes que entraron en el período, contadas para la vendedora que las recibió primero.</Typography>
                </Box>
                {loading && <CircularProgress size={18} />}
            </Box>

            <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                <ToggleButtonGroup size="small" exclusive value={preset} onChange={(_, v) => choose(v)} sx={scrollRow}>
                    <ToggleButton value="hoy">Hoy</ToggleButton>
                    <ToggleButton value="ayer">Ayer</ToggleButton>
                    <ToggleButton value="semana">Esta semana</ToggleButton>
                    <ToggleButton value="semana_pasada">Semana pasada</ToggleButton>
                    <ToggleButton value="mes">Este mes</ToggleButton>
                    <ToggleButton value="mes_pasado">Mes pasado</ToggleButton>
                    <ToggleButton value="otro">Otro</ToggleButton>
                </ToggleButtonGroup>
                {preset === "otro" && (
                    <>
                        <TextField size="small" type="date" label="Desde" value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField size="small" type="date" label="Hasta" value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} slotProps={{ inputLabel: { shrink: true } }} error={range[0] > range[1]} />
                    </>
                )}
            </Stack>

            <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Typography variant="body2" color="text.secondary">Comparar con</Typography>
                <ToggleButtonGroup size="small" exclusive value={compareMode} onChange={(_, v) => v && setCompareMode(v)} sx={scrollRow}>
                    <ToggleButton value="anterior">El período anterior</ToggleButton>
                    <ToggleButton value="otro">Otras fechas</ToggleButton>
                    <ToggleButton value="no">No comparar</ToggleButton>
                </ToggleButtonGroup>
                {compareMode === "otro" && (
                    <>
                        <TextField size="small" type="date" label="Desde" value={otherRange[0]} onChange={(e) => setOtherRange([e.target.value, otherRange[1]])} slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField size="small" type="date" label="Hasta" value={otherRange[1]} onChange={(e) => setOtherRange([otherRange[0], e.target.value])} slotProps={{ inputLabel: { shrink: true } }} error={otherRange[0] > otherRange[1]} />
                    </>
                )}
                {metrics?.compare && (
                    <Typography variant="caption" color="text.secondary">
                        {fmtDate(metrics.start_date)}{metrics.start_date !== metrics.end_date ? ` – ${fmtDate(metrics.end_date)}` : ""} frente a{" "}
                        {fmtDate(metrics.compare.start_date)}{metrics.compare.start_date !== metrics.compare.end_date ? ` – ${fmtDate(metrics.compare.end_date)}` : ""}
                    </Typography>
                )}
            </Stack>

            <TableContainer sx={{ mt: 1.5 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ "& th": { whiteSpace: "nowrap" } }}>
                            <TableCell>Vendedora</TableCell>
                            <TableCell align="right">Asignadas</TableCell>
                            <TableCell align="right">Entregadas</TableCell>
                            <TableCell align="right">Efectividad</TableCell>
                            <TableCell align="right">Canceladas</TableCell>
                            <TableCell align="right">A agencia</TableCell>
                            <TableCell align="right">Upsells</TableCell>
                            <TableCell align="right">Comisión ventas</TableCell>
                            <TableCell align="right">Comisión upsells</TableCell>
                            <TableCell align="right">Comisión total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.members.map((m) => (
                            <TableRow key={m.id} hover>
                                <NameCell member={m} />
                                {cells(rowOf(m.id), prevOf(m.id))}
                            </TableRow>
                        ))}
                        <TableRow sx={{ "& td": { fontWeight: 700, borderTop: 2, borderColor: "divider" } }}>
                            <NameCell label="Grupo" />
                            {cells(metrics?.totals, metrics?.compare?.totals)}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                Efectividad = entregadas ÷ asignadas (rojo por debajo de 45 %, amarillo hasta 50 %, verde desde 50 %). Canceladas y A agencia también sobre las asignadas.
                Upsells = entregadas con upsell ÷ entregadas. Las comisiones son lo que ganó cada una en esas fechas; solo se consultan.
            </Typography>

            {metrics && <PeriodCharts metrics={metrics} data={data} />}

            <AgenciesSection range={range} reloadKey={reloadKey} groupQuery={groupQuery(data)} />

            {metrics?.earnings && <EarningsSection earnings={metrics.earnings} commissionPct={data.group.leader_commission_pct} />}
        </Paper>
    );
};

/* ─────────────────────────── Agencias, solo con los pedidos del grupo (spec §10) ─────────────────────────── */

const AgenciesSection: React.FC<{ range: [string, string]; reloadKey: number; groupQuery: string }> = ({ range, reloadKey, groupQuery }) => {
    const [agencies, setAgencies] = useState<GroupAgency[]>([]);
    const [selected, setSelected] = useState<number | "">("");

    useEffect(() => {
        if (!range[0] || !range[1] || range[0] > range[1]) return;
        let cancelled = false;
        assignmentApi<GroupAgency[]>(`/my-group/agencies?start_date=${range[0]}&end_date=${range[1]}${groupQuery}`).then((res) => {
            if (cancelled || !res.ok || !res.data) return;
            setAgencies(res.data);
            setSelected((cur) => (cur !== "" && res.data!.some((a) => a.agency_id === cur) ? cur : res.data![0]?.agency_id ?? ""));
        });
        return () => {
            cancelled = true;
        };
    }, [range, reloadKey, groupQuery]);

    const a = agencies.find((x) => x.agency_id === selected);
    const tiles = a
        ? [
            { label: "Recibió", value: String(a.received) },
            { label: "Entregó", value: String(a.delivered) },
            { label: "Efectividad", value: a.effectiveness === null ? "—" : fmtPct(a.effectiveness), color: effectivenessColor(a.effectiveness) },
            { label: "Pendientes", value: String(a.pending) },
            { label: "Novedades", value: String(a.novelties) },
            { label: "Resueltas", value: a.resolved_pct === null ? String(a.novelties_resolved) : `${a.novelties_resolved} (${fmtPct(a.resolved_pct)})` },
        ]
        : [];

    return (
        <Box mt={3}>
            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                <Typography variant="subtitle1" fontWeight={700}>Agencias</Typography>
                {agencies.length > 0 && (
                    <TextField select size="small" label="Agencia" value={selected} onChange={(e) => setSelected(Number(e.target.value))} sx={{ minWidth: 200 }}>
                        {agencies.map((x) => <MenuItem key={x.agency_id} value={x.agency_id}>{x.name} ({x.received})</MenuItem>)}
                    </TextField>
                )}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block">
                Solo con los pedidos de tu grupo que entraron en el período. Muchas pasadas a agencia con pocas entregas pueden indicar pedidos mal confirmados.
            </Typography>
            {agencies.length === 0 ? (
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>Ningún pedido de tu grupo llegó a una agencia en estas fechas.</Typography>
            ) : a && (
                <>
                    <Box display="grid" gridTemplateColumns={{ xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" }} gap={1} mt={1}>
                        {tiles.map((t) => (
                            <Paper key={t.label} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                                <Typography variant="caption" color="text.secondary">{t.label}</Typography>
                                {t.color && t.color !== "default" ? (
                                    <Box><Chip size="small" color={t.color} label={t.value} /></Box>
                                ) : (
                                    <Typography variant="h6" fontWeight={700}>{t.value}</Typography>
                                )}
                            </Paper>
                        ))}
                    </Box>
                    <AgencyChart agency={a} />
                </>
            )}
        </Box>
    );
};

/* ─────────────────────────── Tus ganancias (spec §12.2 y §12.4) ─────────────────────────── */

const EarningsSection: React.FC<{ earnings: LeaderEarnings; commissionPct: number }> = ({ earnings, commissionPct }) => {
    const tiles = [
        { label: "Como vendedora", value: earnings.personal.total, hint: `Ventas ${money(earnings.personal.sales)} · upsells ${money(earnings.personal.upsells)}` },
        { label: "Por liderazgo", value: earnings.leadership.total, hint: `Tu ${fmtPct(Number(commissionPct))} sobre lo que ganan tus vendedoras` },
        { label: "Total", value: earnings.total, hint: "Lo que ganas en el período" },
    ];

    return (
        <Box mt={3}>
            <Typography variant="subtitle1" fontWeight={700}>Tus ganancias en el período</Typography>
            <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(3, 1fr)" }} gap={1.5} mt={1}>
                {tiles.map((t, i) => (
                    <Paper key={t.label} variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: i === 2 ? "success.main" : "divider" }}>
                        <Typography variant="caption" color="text.secondary">{t.label}</Typography>
                        <Typography variant="h6" fontWeight={700} color={i === 2 ? "success.main" : undefined}>{money(t.value)}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.hint}</Typography>
                    </Paper>
                ))}
            </Box>

            {earnings.leadership.by_seller.length > 0 ? (
                <TableContainer sx={{ mt: 1.5 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ "& th": { whiteSpace: "nowrap" } }}>
                                <TableCell>Vendedora</TableCell>
                                <TableCell align="right">Comisión que generó</TableCell>
                                <TableCell align="right">Tu %</TableCell>
                                <TableCell align="right">Para ti</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {earnings.leadership.by_seller.map((s) => (
                                <TableRow key={s.seller_id} hover>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell align="right">{money(s.base_usd)}</TableCell>
                                    <TableCell align="right">{s.pcts.map((p) => fmtPct(p)).join(" y ")}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>{money(s.amount_usd)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ "& td": { fontWeight: 700, borderTop: 2, borderColor: "divider" } }}>
                                <TableCell>Total</TableCell>
                                <TableCell align="right">{money(earnings.leadership.base_total)}</TableCell>
                                <TableCell />
                                <TableCell align="right">{money(earnings.leadership.total)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Todavía no hay comisión de liderazgo en estas fechas. Nace cada vez que una vendedora de tu grupo genera su comisión (venta o upsell).
                </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Tus propias ventas no cuentan para el liderazgo. El % lo fija el administrador y, si cambia, vale desde ese momento: lo ya ganado no se recalcula.
            </Typography>
        </Box>
    );
};

/* ─────────────────────────── Reparto de órdenes (%) ─────────────────────────── */

const WeightsCard: React.FC<{ data: MyGroupData; onSaved: (d: MyGroupData) => void }> = ({ data, onSaved }) => {
    const leader = data.members.find((m) => m.is_leader) ?? null;
    const sellers = useMemo(() => data.members.filter((m) => !m.is_leader), [data.members]);
    const initial = useMemo(
        () => Object.fromEntries(sellers.map((m) => [m.id, m.weight != null ? String(Number(m.weight)) : ""])),
        [sellers]
    );
    const [weights, setWeights] = useState<Record<number, string>>(initial);
    const [saving, setSaving] = useState(false);

    useEffect(() => setWeights(initial), [initial]);

    const value = (id: number): number | null => ((weights[id] ?? "") === "" ? null : Number(weights[id]));
    const dirty = sellers.some((m) => (weights[m.id] ?? "") !== initial[m.id]);
    const leaderEntry = leader ? { id: leader.id, name: leader.name, pct: leader.weight != null ? Number(leader.weight) : null } : null;
    const sellerValues = sellers.map((m) => ({ id: m.id, name: m.name, pct: value(m.id) }));
    const error = weightsError(leaderEntry, sellerValues, "Para repartir con % primero el administrador tiene que fijar el tuyo. Mientras tanto puedes dejarlas parejo.");
    const shares = error ? null : groupShares(leaderEntry, sellerValues);
    const summary = error ? null : weightsSummary(leaderEntry, sellerValues);
    const shareText = (id: number) => (
        <Tooltip title="Lo que recibe del total que llega al grupo, si hoy trabajan todas">
            <Typography variant="caption" color="text.secondary" sx={{ width: 120 }}>≈ {shares ? fmtPct((shares[id] ?? 0) * 100) : "—"} del grupo</Typography>
        </Tooltip>
    );

    const save = async () => {
        setSaving(true);
        const res = await assignmentApi<MyGroupData>("/my-group/weights", "PUT", {
            weights: sellers.map((m) => ({ user_id: m.id, weight: value(m.id) })),
        });
        setSaving(false);
        if (res.ok && res.data) {
            toast.success("Porcentajes guardados");
            onSaved(res.data);
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Reparto de órdenes</Typography>
            <Typography variant="caption" color="text.secondary">Cuánto de lo que llega al grupo recibe cada una. Con %, tiene que sumar 100 contando el tuyo.</Typography>

            <Stack spacing={1.25} mt={1.5}>
                {leader && (
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="body2" fontWeight={600} sx={{ flex: "1 1 140px", minWidth: 0 }} noWrap title={leader.name}>
                            <StarRounded sx={{ fontSize: 14, color: "warning.main", verticalAlign: -2 }} /> {leader.name}{data.read_only ? "" : " (tú)"}
                        </Typography>
                        <Tooltip title="Tu % lo fija el administrador">
                            <Chip size="small" variant="outlined" label={leader.weight != null ? fmtPct(Number(leader.weight)) : "como una vendedora"} sx={{ width: 90 }} />
                        </Tooltip>
                        {shareText(leader.id)}
                    </Box>
                )}
                {sellers.map((m) => (
                    <Box key={m.id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="body2" sx={{ flex: "1 1 140px", minWidth: 0 }} noWrap title={m.name}>{m.name}</Typography>
                        <TextField
                            size="small"
                            type="number"
                            label="%"
                            placeholder="parejo"
                            value={weights[m.id] ?? ""}
                            onChange={(e) => setWeights({ ...weights, [m.id]: e.target.value })}
                            slotProps={{ htmlInput: { min: 0, max: 100 }, inputLabel: { shrink: true } }}
                            sx={{ width: 90 }}
                            disabled={data.read_only}
                        />
                        {shareText(m.id)}
                    </Box>
                ))}
            </Stack>

            {sellers.length === 0 && (
                <Typography variant="body2" color="text.secondary" fontStyle="italic" mt={1}>Tu grupo todavía no tiene vendedoras. Las asigna el administrador.</Typography>
            )}
            {error && <Typography variant="caption" color="error" display="block" mt={1.5}>{error}</Typography>}
            {summary && (
                <Typography variant="caption" color={summary.ok ? "success.main" : "text.secondary"} fontWeight={summary.ok ? 700 : 400} display="block" mt={1.5}>
                    {summary.text}
                </Typography>
            )}

            {sellers.length > 0 && !data.read_only && (
                <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
                    <Button size="small" startIcon={<BalanceRounded />} onClick={() => setWeights(Object.fromEntries(sellers.map((m) => [m.id, ""])))}>
                        Repartir parejo
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={14} /> : <SaveRounded />}
                        disabled={!dirty || !!error || saving}
                        onClick={save}
                    >
                        Guardar %
                    </Button>
                </Stack>
            )}
        </Paper>
    );
};

/* ─────────────────────────── Roster de hoy ─────────────────────────── */

const QUICK_REASONS = ["No vino hoy", "Saturada", "Tiene un inconveniente", "Por rendimiento"];

const RosterCard: React.FC<{ data: MyGroupData; onSaved: (d: MyGroupData) => void }> = ({ data, onSaved }) => {
    const [pending, setPending] = useState<{ shopId: number; userId: number } | null>(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const name = (id: number) => data.members.find((m) => m.id === id)?.name ?? "";
    const shopName = (id: number) => data.shops.find((s) => s.id === id)?.name ?? "";

    const send = async (shopId: number, userId: number, active: boolean, why?: string) => {
        setBusy(`${shopId}:${userId}`);
        const res = await assignmentApi<MyGroupData>("/my-group/roster", "PUT", { shop_id: shopId, user_id: userId, active, reason: why ?? null });
        setBusy(null);
        if (res.ok && res.data) {
            toast.success(res.message ?? "Roster actualizado");
            onSaved(res.data);
            setPending(null);
            setReason("");
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Roster de hoy</Typography>
            <Typography variant="caption" color="text.secondary">
                Quién recibe órdenes nuevas hoy en cada tienda. Sacar a alguien no la cambia de grupo ni le quita las órdenes que ya tiene.
            </Typography>

            <Stack spacing={2} mt={1.5}>
                {data.shops.map((shop) => {
                    const members = shop.members.filter((m) => m.linked || m.in_roster);
                    return (
                        <Box key={shop.id}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                <Typography variant="body2" fontWeight={700}>{shop.name}</Typography>
                                <Chip size="small" color={shop.is_open ? "success" : "default"} variant={shop.is_open ? "filled" : "outlined"} label={shop.is_open ? "Jornada abierta" : "Cerrada"} />
                            </Box>
                            {members.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">Nadie de tu grupo trabaja en esta tienda.</Typography>
                            ) : (
                                <Stack spacing={0.25}>
                                    {members.map((m) => {
                                        const key = `${shop.id}:${m.user_id}`;
                                        const canTurnOn = shop.is_open && m.linked;
                                        const last = m.last_change;
                                        return (
                                            <Box key={m.user_id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                <Switch
                                                    size="small"
                                                    checked={m.in_roster}
                                                    disabled={data.read_only || busy === key || (!m.in_roster && !canTurnOn)}
                                                    onChange={(e) => (e.target.checked ? send(shop.id, m.user_id, true) : setPending({ shopId: shop.id, userId: m.user_id }))}
                                                />
                                                <Typography variant="body2" sx={{ minWidth: 120 }}>{name(m.user_id)}</Typography>
                                                {last && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {last.active ? "Entró" : "Salió"} a las {last.at} ({last.by}){last.reason ? `: ${last.reason}` : ""}
                                                    </Typography>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Box>
                    );
                })}
            </Stack>

            <Dialog open={!!pending} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Sacar a {pending ? firstName(name(pending.userId)) : ""} del roster de hoy</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={1.5}>
                        {pending ? shopName(pending.shopId) : ""}. Deja de recibir órdenes nuevas ahí hasta que la vuelvas a meter. ¿Por qué?
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mb={1.5}>
                        {QUICK_REASONS.map((r) => (
                            <Chip key={r} label={r} size="small" color={reason === r ? "primary" : "default"} onClick={() => setReason(r)} />
                        ))}
                    </Stack>
                    <TextField fullWidth size="small" label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} autoFocus />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPending(null)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        disabled={reason.trim() === "" || !!busy}
                        onClick={() => pending && send(pending.shopId, pending.userId, false, reason.trim())}
                    >
                        Sacar del roster
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

/* ─────────────────────────── Página ─────────────────────────── */

/** Cuando el administrador mira el grupo de una Líder (?grupo=), las consultas llevan group_id. */
const groupQuery = (data: MyGroupData) => (data.read_only ? `&group_id=${data.group.id}` : "");

/** Las vendedoras con vista simple no tienen menú lateral: se les da una barra con "volver". */
const Shell: React.FC<{ lite: boolean; children: React.ReactNode }> = ({ lite, children }) => {
    const navigate = useNavigate();
    const theme = useUserStore((s) => s.user.theme);
    if (!lite) return <Layout>{children}</Layout>;
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 2 }}>
            <Button startIcon={<ArrowBackRounded />} onClick={() => navigate("/ordenes")} sx={{ mb: 1, textTransform: "none" }}>
                Mis órdenes
            </Button>
            {children}
            <ToastContainer stacked position="top-right" autoClose={5000} theme={theme} transition={Bounce} />
        </Box>
    );
};

export const MyGroup: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [searchParams] = useSearchParams();
    const viewGroup = searchParams.get("grupo");
    const navigate = useNavigate();
    const user = useUserStore((s) => s.user);
    const [data, setData] = useState<MyGroupData | null>(null);
    const [forbidden, setForbidden] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [reassignOpen, setReassignOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await assignmentApi<MyGroupData>(viewGroup ? `/my-group?group_id=${viewGroup}` : "/my-group");
        setLoading(false);
        if (res.ok && res.data) {
            setData(res.data);
            setForbidden(false);
        } else {
            setForbidden(true);
            toast.error(res.message);
        }
    }, [viewGroup]);

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid, fetchData]);

    const refresh = () => {
        fetchData();
        setReloadKey((k) => k + 1);
    };

    const sellerRefs: SellerRef[] = useMemo(
        () => (data?.members ?? []).map((m) => ({ id: m.id, name: m.name, group: data ? { id: data.group.id, name: data.group.name } : null, active_orders: m.active_orders })),
        [data]
    );

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Shell lite={!!user.is_lite_view}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap" mb={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Mi grupo{data ? ` · ${data.group.name}` : ""}</Typography>
                    <Typography variant="body2" color="text.secondary">Cómo van tus vendedoras, cómo se reparten las órdenes y quién trabaja hoy.</Typography>
                </Box>
                {/* En el teléfono, una fila que ocupa todo el ancho y sin textos partidos (2026-10-03) */}
                <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" }, "& .MuiButton-root": { textTransform: "none", whiteSpace: "nowrap" } }}>
                    <Button size="small" variant="outlined" aria-label="Actualizar" onClick={refresh} disabled={loading} sx={{ minWidth: 40, px: 1 }}>
                        {loading ? <CircularProgress size={18} /> : <RefreshRounded fontSize="small" />}
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<DescriptionRounded />} onClick={() => navigate(viewGroup ? `/mi-grupo/reporte?grupo=${viewGroup}` : "/mi-grupo/reporte")} disabled={!data} sx={{ flex: { xs: 1, sm: "none" } }}>Reporte semanal</Button>
                    {!data?.read_only && (
                        <Button size="small" variant="contained" startIcon={<SwapHorizRounded />} onClick={() => setReassignOpen(true)} disabled={!data} sx={{ flex: { xs: 1, sm: "none" } }}>Reasignar</Button>
                    )}
                </Box>
            </Box>

            {forbidden && !data && (
                <Alert severity="info">Esta sección es solo para la Líder de un grupo de venta. Los grupos los arma el administrador.</Alert>
            )}

            {data && (
                <Stack spacing={2}>
                    {data.read_only && (
                        <Alert severity="info">
                            Estás viendo "Mi grupo" de {data.members.find((m) => m.is_leader)?.name ?? "la Líder"} como administrador. Es solo para mirar: los cambios los hace ella.
                        </Alert>
                    )}
                    <NowCard data={data} />
                    <MetricsCard data={data} reloadKey={reloadKey} />
                    <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }} gap={2} alignItems="start">
                        <WeightsCard data={data} onSaved={setData} />
                        <RosterCard data={data} onSaved={setData} />
                    </Box>
                    <MeetingsCard data={data} />
                </Stack>
            )}

            {data && (
                <BulkReassignDialog
                    open={reassignOpen}
                    sellers={sellerRefs}
                    apiBase="/my-group"
                    excludeTargetIds={[data.me]}
                    onClose={() => setReassignOpen(false)}
                    onDone={() => {
                        setReassignOpen(false);
                        refresh();
                    }}
                />
            )}
        </Shell>
    );
};

export default MyGroup;
