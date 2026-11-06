// src/components/ui/notifications/CalendarBell.tsx
// El ícono del calendario arriba, junto a la campanita (Etapa 3, paso 4): cuántas cosas faltan hoy más las atrasadas. Solo
// el Admin. Se pide al abrir cada pantalla (el servidor lo guarda un minuto), cada 5 minutos y cuando se tilda algo.
// .108: si corre el reloj de una tarea de Tu día, debajo se ve lo que le queda (4:59), en rojo con lo de más (+1:20).
import { useCallback, useEffect, useState } from "react";
import { Badge, Box, IconButton, Tooltip } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../../../store/user/UserStore";
import { TodayResponse, fetchToday, onCalendarChanged, onToday } from "../../calendar/calendar";
import { clockOf, clockText, runningOf, useTick } from "../../calendar/timer";

const REFRESH_MS = 5 * 60_000;

/** "Calendario: 3 por hacer hoy y 1 atrasada". */
const tooltip = (d: TodayResponse | null) => {
    if (!d) return "Calendario";
    const { pending, overdue } = d.counts;
    if (pending === 0 && overdue === 0) return "Calendario: todo al día";
    const parts = [];
    if (pending > 0) parts.push(`${pending} por hacer hoy`);
    if (overdue > 0) parts.push(overdue === 1 ? "1 atrasada" : `${overdue} atrasadas`);
    return `Calendario: ${parts.join(" y ")}`;
};

export const CalendarBell = () => {
    const user = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isAdmin = user.role?.description === "Admin";
    const [data, setData] = useState<TodayResponse | null>(null);

    const load = useCallback((fresh = false) => {
        fetchToday(fresh).then(setData).catch(() => undefined);
    }, []);

    // .108: también lo que piden otras pantallas (Tu día al empezar un reloj)
    useEffect(() => (isAdmin ? onToday(setData) : undefined), [isAdmin]);
    const running = runningOf(data);
    const now = useTick(!!running);
    const clock = running ? clockOf(running.timer, now + (data?.clock_offset ?? 0)) : null;

    useEffect(() => {
        if (!isAdmin) return;
        load();
        const id = window.setInterval(() => load(), REFRESH_MS);
        const off = onCalendarChanged(() => load(true));
        return () => { window.clearInterval(id); off(); };
    }, [isAdmin, load]);

    if (!isAdmin) return null;
    const count = data ? data.counts.pending + data.counts.overdue : 0;

    return (
        <Tooltip title={clock ? `${tooltip(data)}. Reloj: ${clock.over ? `se acabó el tiempo (+${clockText(-clock.left)})` : `quedan ${clockText(clock.left)}`}` : tooltip(data)}>
            <IconButton
                aria-label={tooltip(data)}
                onClick={() => navigate("/calendario")}
                sx={{ color: "inherit", bgcolor: pathname === "/calendario" ? "rgba(100,100,100,0.12)" : "transparent", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}
            >
                <Badge badgeContent={count} color={data && data.counts.overdue > 0 ? "error" : "primary"} max={99}>
                    <CalendarMonthRoundedIcon />
                </Badge>
                {clock && (
                    <Box component="span" aria-hidden sx={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", px: 0.5, borderRadius: "6px",
                        fontSize: 10, fontWeight: 700, lineHeight: "14px", fontFeatureSettings: '"tnum"', whiteSpace: "nowrap", color: "#fff", bgcolor: clock.over ? "#C62E34" : "#1C2230" }}>
                        {clock.over ? `+${clockText(-clock.left)}` : clockText(clock.left)}
                    </Box>
                )}
            </IconButton>
        </Tooltip>
    );
};
