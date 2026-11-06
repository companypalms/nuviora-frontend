// src/pages/calendar/CalendarPage.tsx
// El calendario del dueño (Etapa 3). .107 "Tu día" (dueño, 2026-11-06: "que mis tareas diarias sean mucho más fáciles de
// organizar, de leer y de hacer, por orden de prioridad, urgencia y tiempo que toman"; "rediseña toda la pantalla… utilizando
// conceptos de gamificación"): la pantalla responde una sola pregunta, "¿qué hago ahora?". De arriba hacia abajo: qué día es
// y qué tan fresco está; la semana (cada día con su anillo de avance; tocar uno lo abre); el marcador (por hacer, el tiempo
// de trabajo que falta y las hechas) con su barra; las etapas del día como un mapa (urgente → alta → normal → baja); la misión
// de ahora en grande, con "Hecho" (la siguiente entra sola); "Lo que sigue" por etapas, que se acomoda arrastrando (se guarda
// para todos los días); lo que tiene hora más tarde; lo hecho hoy, plegado; y mañana, plegado. El orden lo arma el backend
// (Calendar\Rules\DayPlan). Todo se puede deshacer. El mes completo, en "Ver el mes". Solo el Admin (la ruta y el backend).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Collapse, IconButton, LinearProgress, ListItemIcon, Menu, MenuItem, Skeleton, Stack, Typography } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import ReportProblemRounded from "@mui/icons-material/ReportProblemRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { appear, cardSx, geist, inkSx, plural, useTokens } from "../../components/ui/design";
import { Scoreboard, Section, TextAction } from "../../components/ui/designParts";
import { MissionNow } from "../../components/calendar/MissionNow";
import { MonthSheet } from "../../components/calendar/MonthSheet";
import { NoteDialog, NoteOpen } from "../../components/calendar/NoteDialog";
import { PlanPatch } from "../../components/calendar/PlanMenu";
import { RemindersDialog } from "../../components/calendar/RemindersDialog";
import { StageMap, StageStat } from "../../components/calendar/StageMap";
import { TaskBoard } from "../../components/calendar/TaskBoard";
import { TaskRow } from "../../components/calendar/TaskRow";
import { useCalendarActions } from "../../components/calendar/useCalendarActions";
import { DayStat, WeekStrip } from "../../components/calendar/WeekStrip";
import {
    CalendarItem, PRIORITIES, PlanStage, Priority, RangeResponse, StageKey, TodayResponse, addDays, cap, emptyNote, fetchRange, fetchToday, isClosed,
    longDate, markItem, minutesText, mondayOf, notifyCalendarChanged, planKey, resetOrder, saveItemPlan, saveOrder, todayCaracas, unmarkItem, weekdayOf,
} from "../../components/calendar/calendar";

const STAGE_ORDER: StageKey[] = ["urgent", "alta", "normal", "baja", "later"];
const LABELS: Record<StageKey, string> = { urgent: "Urgente", alta: "Alta", normal: "Normal", baja: "Baja", later: "A su hora" };
/** El día que sigue para trabajar (el domingo no se trabaja). */
const nextWorkday = (d: string) => addDays(d, weekdayOf(d) === 6 ? 2 : 1);
const isYmd = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const hourVe = (d: Date) => d.toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit", hour12: false });
const dm = (ymd: string) => `${Number(ymd.slice(8, 10))}/${Number(ymd.slice(5, 7))}`;

/** "Hacerla ahora" se recuerda en este navegador solo por hoy (es una comodidad: si se pierde, manda el orden). */
const PICK = (day: string) => `tudia.ahora.${day}`;
const readPick = (day: string) => { try { return localStorage.getItem(PICK(day)); } catch { return null; } };
const writePick = (day: string, key: string | null) => {
    try { if (key) localStorage.setItem(PICK(day), key); else localStorage.removeItem(PICK(day)); } catch { /* sin almacenamiento: solo por esta vez */ }
};

/** Lo que se ve al marcar algo, antes de que el servidor conteste: cambia su estado y sale del orden del día. */
const applyMark = (d: TodayResponse, item: CalendarItem, status: "done" | "dismissed"): TodayResponse => {
    const pk = planKey(item);
    const set = (i: CalendarItem) => (planKey(i) === pk ? { ...i, status } : i);
    return {
        ...d,
        items: d.items.map(set),
        overdue: d.overdue.map(set),
        plan: d.plan.map((s) => ({ ...s, items: s.items.filter((x) => planKey(x) !== pk), minutes: s.items.some((x) => planKey(x) === pk) ? s.minutes - item.minutes : s.minutes }))
            .filter((s) => s.items.length > 0),
        minutes_left: Math.max(0, d.minutes_left - item.minutes),
    };
};

/** Lo que se ve al arrastrar: el grupo de esa prioridad en el orden nuevo (la que llegó de otro grupo sale del suyo). */
const applyOrder = (d: TodayResponse, p: Priority, keys: string[]): TodayResponse => {
    const entries = d.plan.flatMap((s) => s.items);
    const items = d.items.map((i) => (keys.includes(i.item_key) && !isClosed(i) ? { ...i, priority: p } : i));
    const stages: PlanStage[] = STAGE_ORDER.map((key) => {
        const current = d.plan.find((s) => s.key === key);
        const list = key === p
            ? keys.map((k) => entries.find((e) => e.item_key === k)).filter((e): e is PlanStage["items"][number] => !!e)
            : (current?.items ?? []).filter((e) => !(PRIORITIES.some((x) => x.key === key) && keys.includes(e.item_key)));
        return { key, label: LABELS[key], minutes: 0, items: list };
    }).filter((s) => s.items.length > 0);
    const byKey = Object.fromEntries(items.map((i) => [planKey(i), i]));
    return { ...d, items, plan: stages.map((s) => ({ ...s, minutes: s.items.reduce((n, x) => n + (byKey[planKey(x)]?.minutes ?? 0), 0) })) };
};

const PageSkeleton: React.FC = () => (
    <Box>
        <Skeleton width={160} height={34} />
        <Skeleton variant="rounded" height={64} sx={{ mt: 2, borderRadius: "10px" }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 2 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={58} />)}</Box>
        <Skeleton variant="rounded" height={170} sx={{ mt: 2, borderRadius: "10px" }} />
        {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={58} sx={{ mt: 1, borderRadius: "10px" }} />)}
    </Box>
);

/** El aviso de abajo con "Deshacer" (todo se puede deshacer). */
const UndoLine: React.FC<{ text: string; onUndo: () => void }> = ({ text, onUndo }) => (
    <span>{text} · <TextAction onClick={onUndo} sx={{ color: "inherit", fontWeight: 600 }}>Deshacer</TextAction></span>
);

export const CalendarPage: React.FC = () => {
    const t = useTokens();
    const today = todayCaracas();
    const [params, setParams] = useSearchParams();
    const asked = params.get("dia");
    const selected = isYmd(asked) ? asked : today;
    const select = (d: string) => setParams(d === today ? {} : { dia: d }, { replace: true });

    const [data, setData] = useState<TodayResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
    const [week, setWeek] = useState<RangeResponse | null>(null);
    const [tick, setTick] = useState(0);
    const [slow, setSlow] = useState(false);
    const [cheer, setCheer] = useState<string | null>(null);
    const [picked, setPicked] = useState<string | null>(() => readPick(today));
    const [busy, setBusy] = useState<string | null>(null);
    const [dialog, setDialog] = useState<NoteOpen | null>(null);
    const [remindersOpen, setRemindersOpen] = useState(false);
    const [monthOpen, setMonthOpen] = useState(false);
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const [doneOpen, setDoneOpen] = useState(false);
    const [nextOpen, setNextOpen] = useState(false);

    const refresh = useCallback(() => setTick((x) => x + 1), []);
    const changed = useCallback(() => { refresh(); notifyCalendarChanged(); }, [refresh]);
    const { actions: payActions, payDialog } = useCalendarActions(refresh);

    // Lo de hoy (recién calculado después de un cambio) y, cada minuto mientras está abierta, lo que diga el servidor (lo que
    // tiene hora sube a urgente cuando llega su hora)
    // Dos pedidos seguidos pueden contestar al revés: solo cuenta el último
    const seq = useRef(0);
    const loadToday = useCallback((fresh: boolean) => {
        const n = ++seq.current;
        return fetchToday(fresh)
            .then((r) => { if (n === seq.current) { setData(r); setError(null); setFetchedAt(new Date()); } })
            .catch((e: Error) => { if (n === seq.current) setError(e.message); });
    }, []);
    useEffect(() => { loadToday(tick > 0); }, [tick, loadToday]);
    useEffect(() => {
        const id = window.setInterval(() => { if (!document.hidden) loadToday(false); }, 60_000);
        return () => window.clearInterval(id);
    }, [loadToday]);
    useEffect(() => {
        if (data || error) return;
        const id = window.setTimeout(() => setSlow(true), 8000);
        return () => window.clearTimeout(id);
    }, [data, error]);

    // La semana del día elegido (de lunes a sábado), y el día que sigue a hoy para "Mañana"
    const monday = mondayOf(selected);
    const weekDays = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(monday, i)), [monday]);
    const saturday = weekDays[5];
    const tomorrow = nextWorkday(today);
    const tomorrowInWeek = weekDays.includes(tomorrow);
    const [nextDay, setNextDay] = useState<RangeResponse | null>(null);
    useEffect(() => {
        let alive = true;
        fetchRange(monday, saturday).then((r) => { if (alive) setWeek(r); }).catch(() => undefined);
        return () => { alive = false; };
    }, [monday, saturday, tick]);
    useEffect(() => {
        if (tomorrowInWeek) return;
        let alive = true;
        fetchRange(tomorrow, tomorrow).then((r) => { if (alive) setNextDay(r); }).catch(() => undefined);
        return () => { alive = false; };
    }, [tomorrow, tomorrowInWeek, tick]);
    useEffect(() => {
        if (!cheer) return;
        const id = window.setTimeout(() => setCheer(null), 6000);
        return () => window.clearTimeout(id);
    }, [cheer]);

    const byKey = useMemo(() => Object.fromEntries([...(data?.overdue ?? []), ...(data?.items ?? [])].map((i) => [planKey(i), i])), [data]);
    const order = useMemo(() => (data?.plan ?? []).flatMap((s) => s.items.map((i) => ({ ...i, stage: s }))).filter((o) => byKey[planKey(o)]), [data, byKey]);
    const pickedEntry = picked ? order.find((o) => planKey(o) === picked) : undefined;
    const current = pickedEntry ?? order[0] ?? null;
    const closedToday = (data?.items ?? []).filter(isClosed);
    const dayTotal = (data?.items.length ?? 0) + (data?.overdue.filter((i) => !isClosed(i)).length ?? 0);
    const allDone = !!data && order.length === 0;

    // El mapa: cuántas de cada etapa hay hoy y cuántas se hicieron (lo hecho cuenta en su prioridad)
    const stageStats: StageStat[] = useMemo(() => {
        if (!data) return [];
        const stats = (["urgent", "alta", "normal", "baja"] as StageKey[]).map((key) => {
            const pending = data.plan.find((s) => s.key === key)?.items.length ?? 0;
            const d = key === "urgent" ? 0 : closedToday.filter((i) => i.priority === key).length;
            return { key, label: LABELS[key], n: pending + d, d };
        });
        return stats.filter((s) => s.n > 0);
    }, [data, closedToday]);

    const stats: Record<string, DayStat> = useMemo(() => {
        const out: Record<string, DayStat> = {};
        for (const d of weekDays) {
            const items = d === today && data ? data.items : week?.days[d];
            if (!items) continue;
            out[d] = { total: items.length, closed: items.filter(isClosed).length, overdue: d === today ? (data?.overdue.length ?? 0) : items.filter((i) => i.status === "overdue").length };
        }
        return out;
    }, [weekDays, week, data, today]);

    /* ── Lo que se hace con una cosa ── */

    const pick = (key: string | null) => { setPicked(key); writePick(today, key); };
    const celebrate = (before: TodayResponse, item: CalendarItem) => {
        const stage = before.plan.find((s) => s.items.some((x) => planKey(x) === planKey(item)));
        if (!stage) return;
        const left = before.plan.filter((s) => s.items.some((x) => planKey(x) !== planKey(item)));
        if (left.length === 0) setCheer("¡Día completo! Terminaste todo lo de hoy.");
        else if (stage.items.length === 1) setCheer(`¡${stage.label} lista! ${left[0] ? `Sigue: ${left[0].label}.` : ""}`);
    };
    const mark = async (item: CalendarItem, status: "done" | "dismissed") => {
        const pk = planKey(item);
        const before = data;
        setBusy(pk);
        if (before && byKey[pk]) setData(applyMark(before, item, status));
        if (picked === pk) pick(null);
        try {
            await markItem(item, status);
            if (before) celebrate(before, item);
            toast.success(<UndoLine text={`${status === "done" ? "Hecho" : "Descartado hoy"}: ${item.title}`} onUndo={() => undo(item)} />, { autoClose: 5000 });
            changed();
        } catch (e) {
            if (before) setData(before);
            toast.error((e as Error).message);
        } finally { setBusy(null); }
    };
    const undo = async (item: CalendarItem) => {
        try { toast.success((await unmarkItem(item)).message, { autoClose: 1500 }); changed(); } catch (e) { toast.error((e as Error).message); }
    };
    const savePlan = async (item: CalendarItem, patch: PlanPatch) => {
        const before = data;
        if (before) setData({ ...before, items: before.items.map((i) => (i.item_key === item.item_key ? { ...i, ...patch } : i)), overdue: before.overdue.map((i) => (i.item_key === item.item_key ? { ...i, ...patch } : i)) });
        try { toast.success((await saveItemPlan([{ item_key: item.item_key, ...patch }])).message, { autoClose: 2000 }); changed(); } catch (e) { if (before) setData(before); toast.error((e as Error).message); }
    };
    const reorder = async (p: Priority, keys: string[], stages: PlanStage[]) => {
        const groupKeys = (q: Priority) => (stages.find((s) => s.key === q)?.items ?? []).map((i) => i.item_key);
        const prev = Object.fromEntries(PRIORITIES.map((x) => [x.key, groupKeys(x.key)])) as Record<Priority, string[]>;
        const moved = keys.find((k) => !prev[p].includes(k));
        const from = moved ? PRIORITIES.find((x) => prev[x.key].includes(moved))?.key : undefined;
        const before = data;
        if (before && selected === today) setData(applyOrder(before, p, keys));
        try {
            await saveOrder(p, keys);
            const restore = async () => {
                try {
                    if (prev[p].length) await saveOrder(p, prev[p]);
                    if (from && prev[from].length) await saveOrder(from, prev[from]);
                    toast.success("Volvió como estaba.", { autoClose: 1500 });
                    changed();
                } catch (e) { toast.error((e as Error).message); }
            };
            toast.success(<UndoLine text={moved ? `Pasó a ${LABELS[p].toLowerCase()} (para todos los días)` : "Orden guardado para todos los días"} onUndo={restore} />, { autoClose: 5000 });
            changed();
        } catch (e) { if (before) setData(before); toast.error((e as Error).message); }
    };
    const backToAuto = async () => {
        setMenu(null);
        try { toast.success((await resetOrder()).message); changed(); } catch (e) { toast.error((e as Error).message); }
    };
    const handlers = {
        onDone: (i: CalendarItem) => mark(i, "done"),
        onDismiss: (i: CalendarItem) => mark(i, "dismissed"),
        onUndo: undo,
        onEdit: (i: CalendarItem) => { if (i.note_id && i.note_fields) setDialog({ id: i.note_id, fields: i.note_fields, plan: { priority: i.priority, minutes: i.minutes } }); },
        onPay: payActions.onPay,
        onPlan: savePlan,
    };
    const onNow = (i: CalendarItem) => { pick(planKey(i)); window.scrollTo({ top: 0, behavior: "smooth" }); };

    /* ── Lo que se ve ── */

    const otherDay = selected !== today;
    const dayItems = otherDay ? week?.days[selected] : undefined;
    const dayPlan = otherDay ? week?.plans?.[selected] ?? [] : [];
    const dayByKey = Object.fromEntries((dayItems ?? []).map((i) => [planKey(i), i]));
    const nextSource = tomorrowInWeek ? week : nextDay;
    const nextItems = nextSource?.days[tomorrow] ?? [];
    const nextPlan = nextSource?.plans?.[tomorrow] ?? [];
    const nextMinutes = nextPlan.reduce((n, s) => n + s.minutes, 0);

    return (
        <Layout>
            <Box sx={{ ...geist, color: t.ink, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 1 }, pb: 6 }}>
                {/* 1. Qué día es y qué tan fresco está */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Tu día</Typography>
                        <Typography sx={{ fontSize: 13, color: t.muted }}>
                            {cap(longDate(today))}{fetchedAt ? ` · al día a las ${hourVe(fetchedAt)}` : ""}
                            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{fetchedAt ? " (hora de Venezuela)" : ""}</Box>
                        </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flex: "none" }}>
                        <Button variant="contained" disableElevation startIcon={<AddRounded />} onClick={() => setDialog({ id: null, fields: emptyNote(selected < today ? today : selected) })}
                            sx={{ ...inkSx(t), minHeight: { xs: 44, sm: 40 } }}>Anotar</Button>
                        <IconButton aria-label="Más opciones del calendario" onClick={(e) => setMenu(e.currentTarget)} sx={{ width: 44, height: 44 }}><MoreVertRounded /></IconButton>
                    </Stack>
                </Stack>
                <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
                    <MenuItem onClick={() => { setMenu(null); setMonthOpen(true); }}><ListItemIcon><CalendarMonthRounded fontSize="small" /></ListItemIcon>Ver el mes</MenuItem>
                    <MenuItem onClick={() => { setMenu(null); setRemindersOpen(true); }}><ListItemIcon><TuneRounded fontSize="small" /></ListItemIcon>Recordatorios fijos</MenuItem>
                    <MenuItem onClick={backToAuto}><ListItemIcon><ReplayRounded fontSize="small" /></ListItemIcon>Volver al orden automático</MenuItem>
                </Menu>

                {/* 2. La semana */}
                <WeekStrip days={weekDays} stats={stats} today={today} selected={selected} onSelect={select} />
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
                    {otherDay ? <TextAction onClick={() => select(today)} sx={{ fontSize: 13, color: t.muted }}>Volver a hoy</TextAction> : <span />}
                    <TextAction onClick={() => setMonthOpen(true)} sx={{ fontSize: 13, color: t.muted }}>Ver el mes</TextAction>
                </Stack>

                {!data && !error ? (
                    <Box sx={{ mt: 2 }}>
                        <PageSkeleton />
                        {slow && <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>Sigue cargando…</Typography>}
                    </Box>
                ) : !data ? (
                    <Box role="alert" sx={{ ...cardSx(t), p: 3, mt: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudo abrir tu día</Typography></Stack>
                        <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                        <Button variant="contained" disableElevation sx={{ ...inkSx(t), mt: 2 }} onClick={() => loadToday(true)}>Reintentar</Button>
                        <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
                    </Box>
                ) : otherDay ? (
                    /* Otro día: lo que viene (para planearlo) o lo que pasó */
                    <Box sx={{ mt: 2, ...appear }} key={selected}>
                        <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600 }}>{cap(longDate(selected))}</Typography>
                        {!dayItems ? <Skeleton variant="rounded" height={120} sx={{ mt: 1.5, borderRadius: "10px" }} />
                            : weekdayOf(selected) === 7 ? <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Domingo: no se trabaja.</Typography>
                            : dayItems.length === 0 ? <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>No hay nada anotado para este día.</Typography>
                            : selected > today ? (
                                <>
                                    <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                                        {plural(dayItems.length, "cosa", "cosas")} · ~{minutesText(dayPlan.reduce((n, s) => n + s.minutes, 0))} de trabajo. Acomódalas arrastrando: el orden vale para todos los días.
                                    </Typography>
                                    <TaskBoard stages={dayPlan} byKey={dayByKey} busy={busy} {...handlers} onReorder={(p, keys) => reorder(p, keys, dayPlan)} />
                                </>
                            ) : (
                                <>
                                    <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                                        Hiciste {dayItems.filter((i) => i.status === "done").length} de {dayItems.length}. Lo que quedó atrasado también sale en Urgente, hoy.
                                    </Typography>
                                    <Box sx={{ mt: 1.5 }}>{dayItems.map((i) => <TaskRow key={planKey(i)} item={i} busy={busy === planKey(i)} {...handlers} />)}</Box>
                                </>
                            )}
                    </Box>
                ) : (
                    <>
                        {/* 3. El marcador y su barra */}
                        {dayTotal > 0 && (
                            <>
                                <Scoreboard tiles={[
                                    { label: "Por hacer", value: order.length, help: "Lo que te falta hoy, con lo atrasado." },
                                    { label: "Tiempo de trabajo", value: data.minutes_left > 0 ? `~${minutesText(data.minutes_left)}` : "0 min",
                                        help: "La suma de los minutos de lo que te falta. Cambia los minutos de cada tarea con un toque en su botón de tiempo." },
                                    { label: "Hechas", value: `${closedToday.length} de ${dayTotal}`, help: "Lo de hoy que ya hiciste o descartaste.", color: allDone ? t.green : undefined },
                                ]} />
                                <LinearProgress variant="determinate" value={dayTotal ? (closedToday.length / dayTotal) * 100 : 0} aria-label={`${closedToday.length} de ${dayTotal} hechas`}
                                    sx={{ mt: 1.25, height: 6, borderRadius: 3, bgcolor: t.soft, "& .MuiLinearProgress-bar": { bgcolor: allDone ? t.green : t.ink, borderRadius: 3, transition: "transform 200ms" } }} />
                            </>
                        )}

                        {/* 4. Las etapas y la misión de ahora */}
                        {stageStats.length > 1 && <StageMap stages={stageStats} current={current && current.stage.key !== "later" ? current.stage.key : null} />}
                        {cheer && (
                            <Box role="status" sx={{ mt: 2, p: "10px 14px", borderRadius: "8px", display: "flex", gap: 1, alignItems: "center", bgcolor: t.greenSoft, color: t.greenInk, ...appear }}>
                                <CheckCircleRounded sx={{ fontSize: 20 }} /><Typography sx={{ fontSize: 14, color: "inherit" }}>{cheer}</Typography>
                            </Box>
                        )}
                        {dayTotal === 0 ? (
                            <Box sx={{ ...cardSx(t), p: 3, mt: 2, textAlign: "center" }}>
                                <EventAvailableRounded sx={{ fontSize: 36, color: t.faint }} />
                                <Typography sx={{ fontSize: 16, fontWeight: 600, mt: 1 }}>Nada para hoy</Typography>
                                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                                    {weekdayOf(today) === 7 ? "Es domingo: no se trabaja." : "No hay recordatorios ni notas para hoy. Si tienes algo que hacer, anótalo."}
                                </Typography>
                            </Box>
                        ) : allDone ? (
                            <Box role="status" sx={{ ...cardSx(t), p: 3, mt: 2, textAlign: "center", ...appear }}>
                                <EmojiEventsRounded sx={{ fontSize: 48, color: t.green }} />
                                <Typography sx={{ fontSize: 20, fontWeight: 600, mt: 0.5 }}>Día completo</Typography>
                                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.75 }}>Hiciste {plural(closedToday.filter((i) => i.status === "done").length, "cosa", "cosas")} hoy.</Typography>
                                {nextItems.length > 0 && (
                                    <Typography sx={{ fontSize: 14, color: t.muted }}>El {longDate(tomorrow)} tienes {plural(nextItems.length, "cosa", "cosas")} · ~{minutesText(nextMinutes)}.</Typography>
                                )}
                            </Box>
                        ) : current && byKey[planKey(current)] && (
                            <MissionNow key={planKey(current)} item={byKey[planKey(current)]} reason={current.reason} stage={current.stage}
                                n={closedToday.length + 1} total={closedToday.length + order.length} busy={busy === planKey(current)}
                                picked={!!pickedEntry && pickedEntry !== order[0]} onBackToOrder={() => pick(null)} {...handlers} />
                        )}

                        {/* 5. Lo que sigue, por etapas: se acomoda arrastrando */}
                        {order.length > 1 && (
                            <Typography sx={{ fontSize: 13, color: t.muted, mt: 3 }}>
                                Lo que sigue: hazlo en el orden que quieras. Para cambiarlo, arrastra una tarea por ⋮⋮ (o usa su menú).
                            </Typography>
                        )}
                        {order.length > 0 && (
                            <TaskBoard stages={data.plan} byKey={byKey} hidden={current ? planKey(current) : null} busy={busy} {...handlers} onNow={onNow}
                                onReorder={(p, keys) => reorder(p, keys, data.plan)} />
                        )}

                        {/* 6. Lo hecho hoy y mañana, plegados */}
                        {closedToday.length > 0 && (
                            <Section icon={<CheckCircleRounded />} name={`Hechas hoy (${closedToday.length})`} mt={3}>
                                <TextAction onClick={() => setDoneOpen((o) => !o)} aria-expanded={doneOpen} sx={{ fontSize: 13, color: t.muted }}>
                                    {doneOpen ? "Ocultar" : "Ver lo que hiciste"}<ExpandMoreRounded sx={{ fontSize: 16, verticalAlign: "-3px", transform: doneOpen ? "rotate(180deg)" : "none" }} />
                                </TextAction>
                                <Collapse in={doneOpen} unmountOnExit><Box sx={{ mt: 1 }}>{closedToday.map((i) => <TaskRow key={planKey(i)} item={i} busy={busy === planKey(i)} {...handlers} />)}</Box></Collapse>
                            </Section>
                        )}
                        {nextItems.length > 0 && (
                            <Section icon={<CalendarMonthRounded />} name={`${cap(weekdayOf(tomorrow) === 1 && weekdayOf(today) === 6 ? "el lunes" : "mañana")} ${dm(tomorrow)}`}
                                hint={`${plural(nextItems.length, "cosa", "cosas")} · ~${minutesText(nextMinutes)}`} mt={3}>
                                <TextAction onClick={() => setNextOpen((o) => !o)} aria-expanded={nextOpen} sx={{ fontSize: 13, color: t.muted }}>
                                    {nextOpen ? "Ocultar" : "Ver lo que viene"}<ExpandMoreRounded sx={{ fontSize: 16, verticalAlign: "-3px", transform: nextOpen ? "rotate(180deg)" : "none" }} />
                                </TextAction>
                                <Collapse in={nextOpen} unmountOnExit>
                                    <Box sx={{ mt: 1 }}>
                                        {nextPlan.flatMap((s) => s.items).map((e) => nextItems.find((i) => planKey(i) === planKey(e)))
                                            .filter((i): i is CalendarItem => !!i).map((i) => <TaskRow key={planKey(i)} item={i} compact busy={busy === planKey(i)} {...handlers} />)}
                                        <TextAction onClick={() => select(tomorrow)} sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>Planear ese día</TextAction>
                                    </Box>
                                </Collapse>
                            </Section>
                        )}
                    </>
                )}
            </Box>
            <MonthSheet open={monthOpen} today={today} selected={selected} onClose={() => setMonthOpen(false)} onSelect={select} />
            <NoteDialog open={dialog} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); changed(); }} />
            <RemindersDialog open={remindersOpen} onClose={() => setRemindersOpen(false)} onSaved={() => { setRemindersOpen(false); changed(); }} />
            {payDialog}
        </Layout>
    );
};
