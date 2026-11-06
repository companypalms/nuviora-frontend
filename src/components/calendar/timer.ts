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

/**
 * .108 "Tu hora": cuándo es (en ms) "AAAA-MM-DD HH:MM" en una zona ("Europe/Lisbon"), con su horario de verano. No usa la
 * hora de este equipo (la computadora del dueño está en hora de Venezuela).
 */
export const zonedMs = (date: string, hm: string, zone: string) => {
    const guess = Date.parse(`${date}T${hm}:00Z`);
    const offset = (ms: number) => {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
            .formatToParts(new Date(ms));
        const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
        return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")) - ms;
    };
    const first = guess - offset(guess);
    return guess - offset(first);
};

/** "13:05" en una zona. */
export const hourIn = (ms: number, zone: string) => new Date(ms).toLocaleTimeString("es-VE", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false });

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
