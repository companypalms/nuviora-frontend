// src/components/calendar/TodayBox.tsx
// "Hoy" arriba del Dashboard del Admin (Etapa 3, paso 4): lo atrasado y lo que falta de hoy, para tildarlo o resolverlo
// sin entrar al calendario (cada cosa con su botón principal: "Abrir panel", "Registrar pago"…). Hasta 6 cosas; el resto,
// en el calendario. Si ya está todo hecho, una sola línea. Si algo falla, no muestra nada: el Dashboard sigue igual.
import React, { FC, useCallback, useEffect, useState } from "react";
import { Box, Button, Stack, Typography, useMediaQuery } from "@mui/material";
import { Theme, alpha } from "@mui/material/styles";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router-dom";
import { Panel } from "../ui/surface/Panel";
import { CalendarItemRow } from "./CalendarItemRow";
import { itemKey, useCalendarActions } from "./useCalendarActions";
import { TodayResponse, fetchToday, isClosed, isRoutine, onCalendarChanged } from "./calendar";

/** Cuántas cosas se ven en el Dashboard (en el celular, menos, para que no tape todo); el resto, en el calendario. */
const VISIBLE = 6;
const VISIBLE_PHONE = 3;

export const TodayBox: FC = () => {
    const navigate = useNavigate();
    const phone = useMediaQuery((t: Theme) => t.breakpoints.down("sm"));
    const visible = phone ? VISIBLE_PHONE : VISIBLE;
    const [data, setData] = useState<TodayResponse | null>(null);
    const [tick, setTick] = useState(0);
    const refresh = useCallback(() => setTick((t) => t + 1), []);
    const { busy, actions, payDialog } = useCalendarActions(refresh);

    useEffect(() => {
        let alive = true;
        fetchToday(tick > 0).then((r) => { if (alive) setData(r); }).catch(() => undefined);
        return () => { alive = false; };
    }, [tick]);
    // Si se tilda algo en otra parte (el calendario abierto en otra pestaña no; esta misma página sí), se vuelve a pedir
    useEffect(() => onCalendarChanged(refresh), [refresh]);

    if (!data) return null;

    // Primero lo atrasado; después lo de hoy que falta: lo propio del día antes que la rutina
    const pendingToday = data.items.filter((i) => !isClosed(i));
    const list = [...data.overdue, ...pendingToday.filter((i) => !isRoutine(i)), ...pendingToday.filter(isRoutine)];
    const shown = list.slice(0, visible);
    const doneToday = data.items.length - pendingToday.length;
    const goCalendar = () => navigate("/calendario");

    if (list.length === 0) {
        return (
            <Panel sx={(t) => ({ py: 1.25, px: 2, borderLeft: `4px solid ${t.palette.success.main}` })}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <CheckCircleRoundedIcon sx={{ color: "success.main", fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={700}>Todo al día</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {data.label}{doneToday > 0 ? ` · ${doneToday} ${doneToday === 1 ? "cosa hecha" : "cosas hechas"} hoy` : ""}
                    </Typography>
                    <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={goCalendar}>Ver calendario</Button>
                </Stack>
            </Panel>
        );
    }

    const hasOverdue = data.overdue.length > 0;
    return (
        <Panel sx={(t) => ({ p: { xs: 1.5, sm: 2 }, borderLeft: `4px solid ${hasOverdue ? t.palette.error.main : t.palette.primary.main}` })}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
                <EventAvailableRoundedIcon sx={{ color: hasOverdue ? "error.main" : "primary.main", fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={800}>Hoy · {data.label}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 160 }}>{data.text}</Typography>
                <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={goCalendar}>Ver calendario</Button>
            </Stack>
            <Box
                sx={{
                    display: "grid",
                    // minmax(0, …): el detalle en una línea no estira la columna (en el celular se salía por la derecha)
                    gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
                    columnGap: 2,
                    rowGap: 0.5,
                }}
            >
                {shown.map((item) => (
                    <Box key={itemKey(item)} sx={(t) => ({ borderRadius: 2, bgcolor: item.status === "overdue" ? "transparent" : alpha(t.palette.text.primary, 0.02) })}>
                        <CalendarItemRow
                            item={item}
                            compact
                            showDate={item.status === "overdue"}
                            busy={busy === itemKey(item)}
                            {...actions}
                            onEdit={goCalendar}
                        />
                    </Box>
                ))}
            </Box>
            {list.length > visible && (
                <Button size="small" onClick={goCalendar} sx={{ mt: 1 }}>
                    Ver {list.length - visible} más en el calendario
                </Button>
            )}
            {payDialog}
        </Panel>
    );
};
