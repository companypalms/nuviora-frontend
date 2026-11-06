// src/components/calendar/CalendarTimerMonitor.tsx
// .108 "Tu día" (dueño, 2026-11-06: "notificaciones de que se agotó el tiempo"; eligió "pantalla + notificación + sonido"):
// el que avisa, en cualquier pantalla de Nuviora (va en Layout, solo el Admin). Escucha cada "hoy" que llega (onToday) y:
// - cuando se acaba el reloj que corre: un aviso que se queda (Hecho / 5 min más / Más tarde), la notificación del
//   navegador si está permitida, un "ding" y la pestaña dice "⏰ Se acabó…". El reloj sigue en rojo en Tu día.
// - cuando llega la hora de una nota con hora: lo mismo, con "Empezar" / "Más tarde".
// Cada aviso sale una sola vez aunque haya dos pestañas abiertas (se anota en este navegador). Con Nuviora cerrado no hay
// avisos (harían falta notificaciones push).
import React, { FC, useEffect, useRef } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { playNotificationSound } from "../../lib/sound";
import { useUserStore } from "../../store/user/UserStore";
import { CalendarItem, TodayResponse, fetchToday, markItem, notifyCalendarChanged, onToday, planKey, payTarget, timerAction } from "./calendar";

/** Una vez por aviso: en este navegador (todas sus pestañas) y, si no se puede guardar, en esta pestaña. */
const seen = new Set<string>();
const once = (key: string) => {
    const k = `tudia.aviso.${key}`;
    try {
        if (localStorage.getItem(k)) return false;
        localStorage.setItem(k, String(Date.now()));
    } catch {
        if (seen.has(k)) return false;
    }
    seen.add(k);
    return true;
};

/** La hora de una nota (hora de Venezuela, siempre UTC−4) en ms de este equipo. */
const veTime = (date: string, hm: string, offset: number) => Date.parse(`${date}T${hm}:00-04:00`) - offset;

const TOAST_ID = "tudia-tiempo";

/** El título de la pestaña antes del aviso (fuera del componente: cada pantalla monta su propio Layout). */
let savedTitle: string | null = null;

const AlertCard: FC<{ title: string; text: string; buttons: { label: string; main?: boolean; run: () => void }[] }> = ({ title, text, buttons }) => (
    <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{title}</Typography>
        <Typography sx={{ fontSize: 13, mt: 0.25 }}>{text}</Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            {buttons.map((b) => (
                <Button key={b.label} size="small" variant={b.main ? "contained" : "outlined"} disableElevation onClick={(e) => { e.stopPropagation(); b.run(); }}
                    sx={{ borderRadius: "8px", minHeight: 36, ...(b.main ? { bgcolor: "#1C2230", "&:hover": { bgcolor: "#1C2230" } } : { color: "inherit", borderColor: "currentColor" }) }}>
                    {b.label}
                </Button>
            ))}
        </Stack>
    </Box>
);

export const CalendarTimerMonitor: FC = () => {
    const isAdmin = useUserStore((s) => s.user.role?.description === "Admin");
    const navigate = useNavigate();
    const timers = useRef<number[]>([]);

    useEffect(() => {
        if (!isAdmin) return;
        const clear = () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = []; };
        const restoreTitle = () => { if (savedTitle !== null) { document.title = savedTitle; savedTitle = null; } };
        const refresh = () => fetchToday(true).then(() => notifyCalendarChanged()).catch(() => undefined);
        const act = (run: () => Promise<unknown>) => () => {
            toast.dismiss(TOAST_ID);
            restoreTitle();
            run().then(refresh).catch((e: Error) => toast.error(e.message));
        };

        // sticky: si ya avisó (otra pantalla u otra pestaña), el aviso vuelve a la pantalla sin sonido hasta que se resuelva
        const alert = (key: string, head: string, text: string, buttons: { label: string; main?: boolean; run: () => void }[], sticky = false) => {
            const first = once(key);
            if (!first && !sticky) return;
            if (savedTitle === null) savedTitle = document.title;
            document.title = `⏰ ${head}`;
            if (!toast.isActive(TOAST_ID)) {
                toast.info(<AlertCard title={head} text={text} buttons={buttons} />, { toastId: TOAST_ID, autoClose: false, closeOnClick: false, icon: false });
            }
            if (!first) return;
            playNotificationSound();
            try {
                if ("Notification" in window && Notification.permission === "granted") {
                    const n = new Notification(head, { body: text, tag: "tudia-tiempo", requireInteraction: true });
                    n.onclick = () => { window.focus(); navigate("/calendario"); n.close(); };
                }
            } catch { /* algunos teléfonos no dejan crear notificaciones así: queda el aviso de la pantalla */ }
        };

        const plan = (d: TodayResponse) => {
            clear();
            const offset = d.clock_offset ?? 0;
            const byKey: Record<string, CalendarItem> = Object.fromEntries([...d.overdue, ...d.items].map((i) => [planKey(i), i]));
            const running = Object.entries(d.timers ?? {}).find(([, t]) => t.started_at && t.ends_at && !t.finished);
            if (!running) restoreTitle();

            // Se acabó el tiempo del reloj que corre
            if (running && byKey[running[0]]) {
                const [key, t] = running;
                const item = byKey[key];
                const at = Date.parse(t.ends_at!) - offset;
                const fire = () => {
                    const pay = payTarget(item);
                    alert(`fin.${key}.${t.ends_at}`, `Se acabó el tiempo: ${item.title}`, `Tenía ${t.minutes + t.extra_minutes} min. ¿Terminaste?`, [
                        pay !== null
                            ? { label: "Registrar pago", main: true, run: () => { toast.dismiss(TOAST_ID); restoreTitle(); navigate("/calendario"); } }
                            : { label: "Hecho", main: true, run: act(() => markItem(item, "done")) },
                        { label: "5 min más", run: act(() => timerAction("extend", item)) },
                        { label: "Más tarde", run: act(() => timerAction("later", item)) },
                    ], true);
                };
                if (at <= Date.now()) fire();
                else timers.current.push(window.setTimeout(fire, at - Date.now()));
            }

            // Ya es la hora de una nota con hora (de hoy, pendiente, sin reloj corriendo)
            for (const item of d.items) {
                if (item.status !== "pending" || !item.time || d.timers?.[planKey(item)]?.started_at) continue;
                const at = veTime(item.date, item.time, offset);
                const late = Date.now() - at;
                const key = planKey(item);
                const fire = () => alert(`hora.${key}`, `Ya es la hora: ${item.title}`, `Era a las ${item.time} (hora de Venezuela).`, [
                    { label: "Empezar", main: true, run: act(() => timerAction("start", item).then(() => navigate("/calendario"))) },
                    { label: "Más tarde", run: act(() => timerAction("later", item)) },
                ]);
                if (late >= 0 && late < 2 * 60_000) fire();
                else if (late < 0 && -late < 24 * 3600_000) timers.current.push(window.setTimeout(fire, -late));
            }
        };

        const off = onToday(plan);
        return () => { off(); clear(); };
    }, [isAdmin, navigate]);

    return null;
};
