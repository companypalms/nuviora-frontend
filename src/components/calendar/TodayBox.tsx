// src/components/calendar/TodayBox.tsx
// "Hoy" arriba del Dashboard del Admin (Etapa 3, paso 4). .107: una mini misión, en el mismo orden de "Tu día" (DayPlan):
// cuánto falta y la barra, lo de ahora con su botón ("Hecho", "Registrar pago" o el de ir a la página) y lo que sigue (hasta
// 4; 2 en el celular). Si ya está todo hecho, una sola línea. Si algo falla, no muestra nada: el Dashboard sigue igual.
import React, { FC, useCallback, useEffect, useState } from "react";
import { Box, Button, LinearProgress, Stack, Typography, useMediaQuery } from "@mui/material";
import { Theme } from "@mui/material/styles";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { cardSx, geist, lineSx, plural, useTokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";
import { TaskRow, DoneButton } from "./TaskRow";
import { itemKey, useCalendarActions } from "./useCalendarActions";
import { CalendarItem, TodayResponse, fetchToday, isClosed, minutesText, notifyCalendarChanged, onCalendarChanged, planKey, saveItemPlan, stageColor, whereOf } from "./calendar";
import { PlanPatch } from "./PlanMenu";

/** Cuántas cosas siguen debajo de la de ahora (en el celular, menos, para que no tape todo); el resto, en Tu día. */
const NEXT = 4;
const NEXT_PHONE = 2;

export const TodayBox: FC = () => {
    const t = useTokens();
    const navigate = useNavigate();
    const phone = useMediaQuery((th: Theme) => th.breakpoints.down("sm"));
    const [data, setData] = useState<TodayResponse | null>(null);
    const [tick, setTick] = useState(0);
    const refresh = useCallback(() => setTick((x) => x + 1), []);
    const { busy, actions, payDialog } = useCalendarActions(refresh);

    useEffect(() => {
        let alive = true;
        fetchToday(tick > 0).then((r) => { if (alive) setData(r); }).catch(() => undefined);
        return () => { alive = false; };
    }, [tick]);
    // Si se tilda algo en otra parte de esta misma página, se vuelve a pedir
    useEffect(() => onCalendarChanged(refresh), [refresh]);

    if (!data) return null;

    const byKey: Record<string, CalendarItem> = Object.fromEntries([...data.overdue, ...data.items].map((i) => [planKey(i), i]));
    const order = data.plan.flatMap((s) => s.items.map((i) => ({ ...i, stage: s }))).filter((o) => byKey[planKey(o)]);
    const closed = data.items.filter(isClosed).length;
    const total = data.items.length + data.overdue.length;
    const goDay = () => navigate("/calendario");
    const onPlan = async (item: CalendarItem, patch: PlanPatch) => {
        try { toast.success((await saveItemPlan([{ item_key: item.item_key, ...patch }])).message, { autoClose: 2000 }); refresh(); notifyCalendarChanged(); } catch (e) { toast.error((e as Error).message); }
    };
    const handlers = { onDone: actions.onToggle, onUndo: actions.onUndo, onDismiss: actions.onDismiss, onEdit: goDay, onPay: actions.onPay, onPlan };

    if (order.length === 0) {
        return (
            <Box sx={{ ...geist, ...cardSx(t), color: t.ink, p: "12px 16px", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <CheckCircleRounded sx={{ color: t.green, fontSize: 20 }} />
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Todo al día</Typography>
                <Typography sx={{ fontSize: 14, color: t.muted, flex: 1 }}>{data.label}{closed > 0 ? ` · ${plural(closed, "cosa hecha", "cosas hechas")} hoy` : ""}</Typography>
                <TextAction onClick={goDay} sx={{ fontSize: 14 }}>Abrir Tu día</TextAction>
            </Box>
        );
    }

    const [now, ...rest] = order;
    const item = byKey[planKey(now)];
    const link = item.actions.find((a) => a.link);
    const next = rest.slice(0, phone ? NEXT_PHONE : NEXT);
    return (
        <Box sx={{ ...geist, ...cardSx(t), color: t.ink, p: { xs: "12px 12px", sm: "14px 16px" } }}>
            <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Hoy · {data.label}</Typography>
                <Typography sx={{ fontSize: 13, color: data.overdue.length ? t.red : t.muted, flex: 1, minWidth: 140 }}>
                    {plural(order.length, "por hacer", "por hacer")} · ~{minutesText(data.minutes_left)}{data.overdue.length ? ` · ${plural(data.overdue.length, "atrasada", "atrasadas")}` : ""}
                </Typography>
                <TextAction onClick={goDay} sx={{ fontSize: 14 }}>Abrir Tu día</TextAction>
            </Stack>
            <LinearProgress variant="determinate" value={total ? (closed / total) * 100 : 0} aria-label={`${closed} de ${total} hechas`}
                sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: t.soft, "& .MuiLinearProgress-bar": { bgcolor: t.ink, borderRadius: 3 } }} />
            <Box sx={{ mt: 1.5, p: "12px 14px", borderRadius: "10px", border: `1px solid ${t.ink}` }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Dot color={stageColor(now.stage.key, t)} size={8} />
                    <Typography sx={{ fontSize: 12, color: t.muted }}>Ahora · {now.stage.label} · {whereOf(item)} · {minutesText(item.minutes)}</Typography>
                </Stack>
                <Typography sx={{ fontSize: 17, fontWeight: 600, mt: 0.5, overflowWrap: "anywhere" }}>{item.title}</Typography>
                <Typography sx={{ fontSize: 13, color: item.status === "overdue" ? t.red : t.muted, mt: 0.25 }}>{now.reason}</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                    <DoneButton item={item} busy={busy === itemKey(item)} onDone={actions.onToggle} onPay={actions.onPay} />
                    {link && <Button variant="outlined" sx={{ ...lineSx(t), minHeight: { xs: 48, sm: 40 } }} onClick={() => link.link && navigate(link.link)}>{link.label}</Button>}
                </Stack>
            </Box>
            {next.length > 0 && (
                <Box sx={{ mt: 1.25 }}>
                    {next.map((o) => <TaskRow key={planKey(o)} item={byKey[planKey(o)]} reason={o.reason} compact busy={busy === itemKey(byKey[planKey(o)])} {...handlers} />)}
                </Box>
            )}
            {rest.length > next.length && <TextAction onClick={goDay} sx={{ fontSize: 13, color: t.muted }}>Ver {rest.length - next.length} más en Tu día</TextAction>}
            {payDialog}
        </Box>
    );
};
