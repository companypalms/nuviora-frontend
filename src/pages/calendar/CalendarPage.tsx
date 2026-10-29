// src/pages/calendar/CalendarPage.tsx
// El calendario del dueño (Etapa 3): el mes con lo que toca cada día y, al lado, el día elegido para tildar y anotar.
// Arriba, lo atrasado. En el celular, la semana en lista. Solo el Admin (la ruta y el backend). Trae las notas del dueño y
// los recordatorios del sistema (la rutina de todos los días, las revisiones de la semana y del mes, las metas), que se
// encienden y apagan en "Recordatorios fijos", y los pagos: los gastos fijos de Finanzas (con "Registrar pago", la misma
// ventana de Finanzas), las vendedoras los lunes y las agencias los miércoles.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, IconButton, Stack, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Panel } from "../../components/ui/surface/Panel";
import { MonthGrid } from "../../components/calendar/MonthGrid";
import { DayList } from "../../components/calendar/DayList";
import { OverdueBox } from "../../components/calendar/OverdueBox";
import { NoteDialog } from "../../components/calendar/NoteDialog";
import { RemindersDialog } from "../../components/calendar/RemindersDialog";
import { RecurringPayDialog } from "../../components/finance/RecurringPayDialog";
import { FinanceOptions, RecurringExpense, api } from "../../components/finance/finance";
import {
    CalendarItem, NoteFields, RangeResponse, TodayResponse, addDays, cap, emptyNote, fetchRange, fetchToday, markItem, monthLabel,
    monthStart, monthWeeks, mondayOf, shiftMonth, todayCaracas, unmarkItem,
} from "../../components/calendar/calendar";

const keyOf = (i: CalendarItem) => `${i.item_key}-${i.due_date}`;
const dm = (ymd: string) => `${Number(ymd.slice(8, 10))}/${Number(ymd.slice(5, 7))}`;

export const CalendarPage: React.FC = () => {
    const theme = useTheme();
    const phone = useMediaQuery(theme.breakpoints.down("sm"));
    const today = todayCaracas();
    const [month, setMonth] = useState(monthStart(today));
    const [selected, setSelected] = useState(today);
    const [data, setData] = useState<RangeResponse | null>(null);
    const [todayData, setTodayData] = useState<TodayResponse | null>(null);
    const [tick, setTick] = useState(0);
    const [busy, setBusy] = useState<string | null>(null);
    const [dialog, setDialog] = useState<{ id: number | null; fields: NoteFields } | null>(null);
    const [remindersOpen, setRemindersOpen] = useState(false);
    const [paying, setPaying] = useState<{ recurring: RecurringExpense; options: FinanceOptions; due: string } | null>(null);

    // En la computadora se pide el mes entero (con las semanas de los bordes); en el celular, la semana elegida
    const weeks = monthWeeks(month);
    const from = phone ? mondayOf(selected) : weeks[0][0];
    const to = phone ? addDays(mondayOf(selected), 6) : weeks[weeks.length - 1][6];

    useEffect(() => {
        let alive = true;
        fetchRange(from, to).then((r) => { if (alive) setData(r); }).catch((e) => toast.error(e.message));
        return () => { alive = false; };
    }, [from, to, tick]);

    useEffect(() => {
        let alive = true;
        fetchToday().then((r) => { if (alive) setTodayData(r); }).catch((e) => toast.error(e.message));
        return () => { alive = false; };
    }, [tick]);

    const run = useCallback(async (item: CalendarItem, action: () => Promise<{ message: string }>) => {
        setBusy(keyOf(item));
        try {
            toast.success((await action()).message, { autoClose: 1500 });
            setTick((t) => t + 1);
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
    }, []);

    const actions = {
        onToggle: (i: CalendarItem) => run(i, () => (i.status === "done" ? unmarkItem(i) : markItem(i, "done"))),
        onDismiss: (i: CalendarItem) => run(i, () => markItem(i, "dismissed")),
        onUndo: (i: CalendarItem) => run(i, () => unmarkItem(i)),
        onEdit: (i: CalendarItem) => { if (i.note_id && i.note_fields) setDialog({ id: i.note_id, fields: i.note_fields }); },
        // "Registrar pago" de un gasto fijo: la misma ventana de Finanzas, con el vencimiento de ese día ya elegido
        onPay: async (i: CalendarItem, recurringId: number) => {
            setBusy(keyOf(i));
            try {
                const [options, list] = await Promise.all([
                    api<FinanceOptions>("/finance/options"),
                    api<{ recurring: RecurringExpense[] }>("/finance/recurring-expenses"),
                ]);
                const recurring = list.recurring.find((r) => r.id === recurringId);
                if (!recurring) throw new Error("Ese gasto ya no está en Finanzas. Actualiza la página.");
                setPaying({ recurring, options, due: i.due_date });
            } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
        },
    };
    const add = (date: string) => setDialog({ id: null, fields: emptyNote(date) });

    const goMonth = (n: number) => {
        const m = shiftMonth(month, n);
        setMonth(m);
        setSelected(m === monthStart(today) ? today : m);
    };
    const goWeek = (n: number) => {
        const d = addDays(selected, 7 * n);
        setSelected(d);
        setMonth(monthStart(d));
    };
    const goToday = () => { setMonth(monthStart(today)); setSelected(today); };
    const pick = (d: string) => { setSelected(d); if (monthStart(d) !== month) setMonth(monthStart(d)); };

    const days = data?.days ?? {};
    const navLabel = phone ? `${dm(from)} al ${dm(to)}` : monthLabel(month);

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1280, mx: "auto" }}>
                <DescripcionDeVista
                    title="Calendario"
                    description="Lo que tienes que hacer cada día: tu rutina, las revisiones de números, tus pagos y tus notas. Toca un día para ver qué hay, tildar lo que ya hiciste o anotar algo nuevo."
                />
                <Stack spacing={2}>
                    {todayData && <OverdueBox items={todayData.overdue} busy={busy} {...actions} />}

                    <Panel sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                            <Stack direction="row" alignItems="center" gap={0.5}>
                                <Tooltip title={phone ? "Semana anterior" : "Mes anterior"}>
                                    <IconButton size="small" onClick={() => (phone ? goWeek(-1) : goMonth(-1))}><ChevronLeftRoundedIcon /></IconButton>
                                </Tooltip>
                                <Typography variant="h6" fontWeight={800} sx={{ minWidth: { sm: 170 }, textAlign: "center", fontSize: { xs: 16, sm: 20 } }}>
                                    {cap(navLabel)}
                                </Typography>
                                <Tooltip title={phone ? "Semana siguiente" : "Mes siguiente"}>
                                    <IconButton size="small" onClick={() => (phone ? goWeek(1) : goMonth(1))}><ChevronRightRoundedIcon /></IconButton>
                                </Tooltip>
                                <Button size="small" variant="outlined" onClick={goToday} sx={{ ml: 0.5 }}>Hoy</Button>
                            </Stack>
                            <Stack direction="row" alignItems="center" gap={1.5}>
                                {todayData && <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>{todayData.text}</Typography>}
                                <Tooltip title="Recordatorios fijos: apagar los que no quieras y elegir el día de la revisión semanal">
                                    <Button size="small" variant="outlined" startIcon={<TuneRoundedIcon />} onClick={() => setRemindersOpen(true)}>
                                        {phone ? "Fijos" : "Recordatorios fijos"}
                                    </Button>
                                </Tooltip>
                                <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => add(selected)}>Anotar</Button>
                            </Stack>
                        </Stack>

                        {phone ? (
                            <Stack spacing={2}>
                                {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => (
                                    <Box key={d} sx={{ pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
                                        <DayList date={d} today={today} items={days[d] ?? []} busy={busy} compact onAdd={add} {...actions} />
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(300px, 1fr)" }, gap: 2, alignItems: "start" }}>
                                <MonthGrid month={month} days={days} today={today} selected={selected} onSelect={pick} />
                                <Box sx={{ position: { md: "sticky" }, top: { md: 16 } }}>
                                    <DayList date={selected} today={today} items={days[selected] ?? []} busy={busy} onAdd={add} {...actions} />
                                </Box>
                            </Box>
                        )}
                    </Panel>
                </Stack>
            </Box>
            <NoteDialog open={dialog} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); setTick((t) => t + 1); }} />
            <RemindersDialog open={remindersOpen} onClose={() => setRemindersOpen(false)} onSaved={() => { setRemindersOpen(false); setTick((t) => t + 1); }} />
            {paying && (
                <RecurringPayDialog
                    recurring={paying.recurring}
                    options={paying.options}
                    due={paying.due}
                    onClose={() => setPaying(null)}
                    onSaved={() => { setPaying(null); setTick((t) => t + 1); }}
                />
            )}
        </Layout>
    );
};
