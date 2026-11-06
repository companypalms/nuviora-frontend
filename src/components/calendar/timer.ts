// src/components/calendar/timer.ts
// .108 "Tu día": las cuentas del reloj en la pantalla. El servidor guarda cuándo empezó y lo que ya corrió; aquí se cuenta
// segundo a segundo, corrigiendo la hora del teléfono o la computadora con la del servidor (clock_offset).
import { useEffect, useState } from "react";
import { ItemTimer, TodayResponse, planKey } from "./calendar";

export type Clock = { elapsed: number; limit: number; left: number; running: boolean; over: boolean };

/** La hora "del servidor" ahora mismo, en ms. */
export const serverNow = (offset = 0) => Date.now() + offset;

export const clockOf = (t: ItemTimer, now: number): Clock => {
    const run = t.started_at ? Math.max(0, Math.floor((now - Date.parse(t.started_at)) / 1000)) : 0;
    const elapsed = t.spent_seconds + run;
    const limit = (t.minutes + t.extra_minutes) * 60;
    return { elapsed, limit, left: limit - elapsed, running: !!t.started_at, over: elapsed > limit };
};

/** "4:59", "12:05", "1:02:03". */
export const clockText = (seconds: number) => {
    const a = Math.abs(Math.trunc(seconds));
    const h = Math.floor(a / 3600);
    const m = Math.floor((a % 3600) / 60);
    const sec = String(a % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/** El reloj que corre ahora (uno a la vez), con la clave de su tarea. */
export const runningOf = (d: TodayResponse | null): { key: string; timer: ItemTimer } | null => {
    const hit = Object.entries(d?.timers ?? {}).find(([, t]) => t.started_at && !t.finished);
    return hit ? { key: hit[0], timer: hit[1] } : null;
};

export const timerOf = (d: TodayResponse | null, item: { item_key: string; due_date: string }) => d?.timers?.[planKey(item)];

/** La hora de ahora que cambia cada segundo mientras haga falta (si no, se queda quieta y no gasta). */
export const useTick = (active: boolean) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) return;
        setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [active]);
    return now;
};
