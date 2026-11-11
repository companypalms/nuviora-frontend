// src/components/agency-closures/ClosuresListTab.tsx
// Los cierres semanales de las agencias (Módulo 3, §31, §36): una tarjeta por agencia y semana con lo que el sistema
// calculó, lo que cobra la agencia y lo que falta revisar. Al entrar, se ve solo lo que no cuadra (§32).
// .136: arriba, el marcador de la semana; en cada cierre, los dos montos grandes y la diferencia en palabras.
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { AddRounded, ChevronRightRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { cardSx, geist, plural, useTokens } from "../ui/design";
import { Dot, Scoreboard, Section } from "../ui/designParts";
import { Closure, STATUS_COLOR, WeekGap, api, money, systemOf, waitingText } from "./closures";
import { ClosureCompare } from "./ClosureCompare";

type ListResponse = { closures: Closure[]; week: WeekGap | null; agencies: { id: number; name: string }[]; statuses: Record<string, string> };

const NewClosureDialog: React.FC<{ agencies: { id: number; name: string }[]; onClose: () => void; onCreated: (id: number) => void }> = ({ agencies, onClose, onCreated }) => {
    const [form, setForm] = useState({ agency_id: "", week: "" });
    const [saving, setSaving] = useState(false);
    const save = async () => {
        setSaving(true);
        try {
            const r = await api<{ id: number; created: boolean }>("/delivery/closures", "POST", { agency_id: Number(form.agency_id), week: form.week });
            toast.success(r.created ? "Cierre abierto." : "Ese cierre ya existía.");
            onCreated(r.id);
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Abrir un cierre</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cada lunes se abre solo el cierre de la semana anterior de cada agencia con carreras. Úsalo para una semana que no se abrió.
                </Typography>
                <Stack spacing={2}>
                    <TextField select label="Agencia" value={form.agency_id} onChange={(e) => setForm({ ...form, agency_id: e.target.value })}>
                        {agencies.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}
                    </TextField>
                    <TextField type="date" label="Un día de la semana" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })}
                        InputLabelProps={{ shrink: true }} helperText="La semana va de lunes a domingo." />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !form.agency_id || !form.week}>Abrir</Button>
            </DialogActions>
        </Dialog>
    );
};

/** §31: "93 coinciden · 7 con diferencia · 2 sin emparejar", en palabras. */
const countsText = (c: Closure) => {
    const s = c.summary;
    if (!s || s.rows === undefined) return null;
    return [`${s.ok} coinciden`, s.discrepancies ? `${s.discrepancies} con diferencia` : "", s.unmatched ? `${s.unmatched} sin emparejar` : ""].filter(Boolean).join(" · ");
};

/** .136: el marcador de la semana más reciente, encima de sus tarjetas: lo mismo con lo mismo (las que subieron su archivo). */
const WeekBoard: React.FC<{ week: WeekGap }> = ({ week }) => {
    const t = useTokens();
    const d = week.difference;
    const diff = d === null ? "—" : Math.abs(d) < 0.005 ? "Cuadra" : `${money(Math.abs(d))} de ${d > 0 ? "más" : "menos"}`;
    return (
        <Box sx={{ mb: 1.5 }}>
            <Scoreboard tiles={[
                {
                    label: week.provisional ? "Calcula el sistema (provisional)" : "Calcula el sistema", value: money(week.system),
                    help: week.provisional ? "Ninguna agencia subió su archivo: lo que ganaron por sus carreras esa semana." : "Lo que el sistema calcula de las agencias que ya subieron su archivo.",
                },
                { label: "Cobran las agencias", value: week.reported === null ? "—" : money(week.reported), help: "Lo que cobran en sus archivos las agencias que ya los subieron." },
                {
                    label: "Diferencia", help: "Lo que cobran las agencias menos lo que calcula el sistema, de las que ya subieron su archivo.",
                    value: <Stack direction="row" gap={0.75} alignItems="center"><Dot color={d === null ? t.gray : d > 0.005 ? t.amber : d < -0.005 ? t.gray : t.green} size={9} />{diff}</Stack>,
                },
            ]} />
        </Box>
    );
};

const ClosureCard: React.FC<{ c: Closure; onOpen: () => void }> = ({ c, onOpen }) => {
    const t = useTokens();
    const system = systemOf(c);
    const counts = countsText(c);
    return (
        <ButtonBase onClick={onOpen} sx={{ ...cardSx(t), display: "block", width: "100%", textAlign: "left", p: { xs: 1.75, sm: 2 }, font: "inherit",
            "&:hover": { borderColor: t.faint }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
            <Stack direction="row" gap={1} alignItems="flex-start" sx={{ mb: 1.25 }}>
                {/* En el teléfono el estado baja de línea antes que cortar el nombre */}
                <Stack direction="row" columnGap={1} rowGap={0.5} alignItems="center" flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, overflowWrap: "anywhere" }}>{c.agency}</Typography>
                    <Chip size="small" color={STATUS_COLOR[c.status]} label={c.status_label} />
                </Stack>
                <ChevronRightRounded sx={{ color: t.faint }} />
            </Stack>
            <ClosureCompare system={system.value} systemHint={system.hint} reported={c.reported_total}
                reportedHint={c.summary?.rows !== undefined ? plural(c.summary.rows, "fila en su archivo", "filas en su archivo") : undefined}
                difference={c.difference} verdict={c.gap_verdict} waiting={waitingText(c)} />
            {(counts || c.final_approved_total !== null || c.reminder_due) && (
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>
                    {[counts, c.final_approved_total !== null ? `Monto final ${money(c.final_approved_total)}` : "", c.reminder_due ? "Aviso activo para la agencia" : ""].filter(Boolean).join(" · ")}
                </Typography>
            )}
        </ButtonBase>
    );
};

export const ClosuresListTab: React.FC = () => {
    const navigate = useNavigate();
    const t = useTokens();
    const [data, setData] = useState<ListResponse | null>(null);
    const [filters, setFilters] = useState({ agency_id: "", status: "" });
    const [creating, setCreating] = useState(false);

    const load = useCallback(() => {
        const q = new URLSearchParams();
        if (filters.agency_id) q.set("agency_id", filters.agency_id);
        if (filters.status) q.set("status", filters.status);
        api<ListResponse>(`/delivery/closures?${q}`).then(setData).catch((e) => toast.error(e.message));
    }, [filters]);
    useEffect(() => { load(); }, [load]);

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const toReview = data.closures.filter((c) => c.status === "pendiente_revision").length;
    const toPay = data.closures.filter((c) => c.status === "listo_pago").length;
    // Una sección por semana, la más reciente arriba (la lista ya viene así)
    const weeks = data.closures.reduce<{ start: string; week: string; closures: Closure[] }[]>((acc, c) => {
        const last = acc[acc.length - 1];
        if (last && last.start === c.period_start) last.closures.push(c);
        else acc.push({ start: c.period_start, week: c.week, closures: [c] });
        return acc;
    }, []);

    return (
        <Stack spacing={2} sx={geist}>
            <Typography sx={{ fontSize: 14, color: t.muted }}>
                Cada semana (lunes a domingo) la agencia sube su archivo de cierre. El sistema empareja cada carrera, compara lo que cobra con lo que calculó
                y solo te muestra lo que no cuadra. Cuando resuelves todo, queda el monto final aprobado y el cierre pasa a "Listo para pago".
            </Typography>
            {(toReview > 0 || toPay > 0) && (
                <Alert severity="info">
                    {[toReview && `${toReview} ${toReview === 1 ? "cierre por revisar" : "cierres por revisar"}`, toPay && `${toPay} ${toPay === 1 ? "listo" : "listos"} para pago`].filter(Boolean).join(" · ")}
                </Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
                <TextField select size="small" label="Agencia" value={filters.agency_id} onChange={(e) => setFilters({ ...filters, agency_id: e.target.value })} sx={{ minWidth: 170 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {data.agencies.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Estado" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} sx={{ minWidth: 190 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {Object.entries(data.statuses).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
                <Box sx={{ flex: 1 }} />
                <Button startIcon={<AddRounded />} onClick={() => setCreating(true)}>Abrir un cierre</Button>
            </Stack>

            {data.closures.length === 0 ? (
                <Box sx={{ ...cardSx(t), p: 2 }}>
                    <Typography sx={{ color: t.muted }}>Todavía no hay cierres. El primero se abre el lunes, con la semana anterior de cada agencia que tuvo carreras.</Typography>
                </Box>
            ) : weeks.map((w) => (
                <Section key={w.start} name={`Semana ${w.week}`} mt={1}
                    hint={data.week?.period_start === w.start ? `${data.week.with_file} de ${plural(data.week.agencies, "agencia subió", "agencias subieron")} su archivo` : plural(w.closures.length, "agencia", "agencias")}>
                    {data.week?.period_start === w.start && <WeekBoard week={data.week} />}
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                        {w.closures.map((c) => <ClosureCard key={c.id} c={c} onOpen={() => navigate(`/admin/cierres-agencias/${c.id}`)} />)}
                    </Box>
                </Section>
            ))}
            {creating && <NewClosureDialog agencies={data.agencies} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/admin/cierres-agencias/${id}`)} />}
        </Stack>
    );
};
