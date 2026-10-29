// src/components/calendar/calendar.ts
// El calendario del dueño (Etapa 3): tipos, llamadas y fechas. Qué toca cada día (y la regla del domingo) lo calcula el
// backend (Services\Calendar\Rules\Schedule): aquí solo se muestra. Solo el Admin.
import { api } from "../finance/finance";
export { todayCaracas } from "../finance/finance";

export type ItemType = "payment" | "task" | "review";
/** missed: su día pasó sin hacerse, pero no se acumula (las tareas de todos los días). */
export type ItemStatus = "pending" | "done" | "dismissed" | "overdue" | "missed";
export type Repeat = "none" | "weekly" | "monthly" | "twice_monthly";
export type NoteKind = "task" | "payment";

export type NoteFields = {
    title: string; details: string | null; date: string; time: string | null; kind: NoteKind; repeat: Repeat; repeat_until: string | null;
};

/** source "auto": se tildó sola (el sistema vio que ya está hecho; "note" dice por qué). */
export type ItemMark = { status: "done" | "dismissed"; note: string | null; source: string; by: string | null; at: string | null };

/** Un botón de un recordatorio: va a una página ("link") o lo marca como hecho ("mark", como "Están bien" de la tasa). */
export type ItemAction = { label: string; link?: string; mark?: "done" };

/** Una cosa del calendario en un día: una nota del dueño o un recordatorio del sistema. */
export type CalendarItem = {
    item_key: string;
    /** El día en que se muestra; due_date es el que le tocaba (distinto si se corrió por un domingo). */
    date: string; due_date: string;
    type: ItemType;
    /** "daily": la rutina de todos los días (tasa, conciliación, por aprobar, inventario, últimos 3 días). */
    group: "daily" | null;
    source: "owner" | "assistant" | "system";
    title: string; details: string | null; time: string | null; repeat_label: string;
    /** Por qué importa (los recordatorios del sistema). */
    help: string | null;
    /** Todo en una frase ("Pago: Editores. El 15/11 cae domingo: se adelantó al sábado."). */
    text: string;
    status: ItemStatus; accumulates: boolean; auto: boolean; link: string | null; actions: ItemAction[];
    note_id: number | null; note_fields: NoteFields | null; mark: ItemMark | null;
};

/** Un recordatorio del sistema en la ventana "Recordatorios fijos". */
export type ReminderSetting = {
    key: string; title: string; help: string; type: ItemType; schedule: string; auto: boolean; on: boolean; weekday: number | null;
};
export type CalendarSettings = { rules: ReminderSetting[]; weekdays: Record<string, string> };

export type RangeResponse = { from: string; to: string; today: string; started_on: string; days: Record<string, CalendarItem[]> };
export type TodayResponse = {
    date: string; label: string; items: CalendarItem[]; overdue: CalendarItem[];
    counts: { pending: number; overdue: number; done: number }; text: string;
};
export type CalendarOptions = { kinds: Record<NoteKind, string>; repeats: Record<Repeat, string> };

export const fetchRange = (from: string, to: string) => api<RangeResponse>(`/calendar?from=${from}&to=${to}`);
export const fetchToday = () => api<TodayResponse>("/calendar/today");
export const fetchCalendarOptions = () => api<CalendarOptions>("/calendar/options");
export const saveNote = (id: number | null, body: NoteFields) =>
    api<{ message: string }>(id ? `/calendar/notes/${id}` : "/calendar/notes", id ? "PUT" : "POST", body);
export const archiveNote = (id: number) => api<{ message: string }>(`/calendar/notes/${id}/archive`, "POST");
export const markItem = (item: CalendarItem, status: "done" | "dismissed", note?: string) =>
    api<{ message: string }>("/calendar/marks", "POST", { item_key: item.item_key, due_date: item.due_date, status, note: note || null });
export const unmarkItem = (item: CalendarItem) =>
    api<{ message: string }>("/calendar/marks", "DELETE", { item_key: item.item_key, due_date: item.due_date });
export const fetchCalendarSettings = () => api<CalendarSettings>("/calendar/settings");
export const saveCalendarSettings = (rules: Record<string, { on: boolean; weekday?: number }>) =>
    api<CalendarSettings & { message: string }>("/calendar/settings", "PUT", { rules });

/** La rutina de todos los días va aparte, debajo de lo propio del día. */
export const isRoutine = (i: CalendarItem) => i.group === "daily";
/** Se tildó sola: no se puede deshacer (el sistema la vuelve a mirar). */
export const isAutoDone = (i: CalendarItem) => i.mark?.source === "auto";

/* ── Fechas "AAAA-MM-DD" (al mediodía, para no pelear con las zonas horarias) ── */

export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const at = (ymd: string) => new Date(`${ymd}T12:00:00`);
const ymdOf = (d: Date) => d.toLocaleDateString("en-CA");

export const addDays = (ymd: string, n: number) => {
    const d = at(ymd);
    d.setDate(d.getDate() + n);
    return ymdOf(d);
};
/** 1 = lunes … 7 = domingo. */
export const weekdayOf = (ymd: string) => at(ymd).getDay() || 7;
export const mondayOf = (ymd: string) => addDays(ymd, 1 - weekdayOf(ymd));
export const monthStart = (ymd: string) => `${ymd.slice(0, 7)}-01`;
export const shiftMonth = (ymd: string, n: number) => {
    const d = at(monthStart(ymd));
    d.setMonth(d.getMonth() + n);
    return ymdOf(d);
};
export const daysInMonth = (ymd: string) => new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)), 0).getDate();

/** Las semanas (de lunes a domingo) que cubren el mes, para la vista de mes. */
export const monthWeeks = (ymd: string): string[][] => {
    const first = monthStart(ymd);
    const last = `${ymd.slice(0, 7)}-${String(daysInMonth(ymd)).padStart(2, "0")}`;
    const weeks: string[][] = [];
    for (let d = mondayOf(first); d <= last; d = addDays(d, 7)) {
        weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    }
    return weeks;
};

export const monthLabel = (ymd: string) => `${MONTHS[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)}`;
/** La primera letra en mayúscula ("Jueves 29 de octubre"; el "capitalize" del CSS pondría "De Octubre"). */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "jueves 29 de octubre". */
export const longDate = (ymd: string) => `${WEEKDAYS[weekdayOf(ymd) - 1]} ${Number(ymd.slice(8, 10))} de ${MONTHS[Number(ymd.slice(5, 7)) - 1]}`;
/** "jue 22/10". */
export const shortDate = (ymd: string) => `${WEEKDAYS_SHORT[weekdayOf(ymd) - 1].toLowerCase()} ${Number(ymd.slice(8, 10))}/${Number(ymd.slice(5, 7))}`;

/** Cómo se ve cada tipo: pago en verde, tarea en azul, revisión de números en morado. */
export const TYPE_META: Record<ItemType, { label: string; color: "success" | "info" | "secondary" }> = {
    payment: { label: "Pago", color: "success" },
    task: { label: "Tarea", color: "info" },
    review: { label: "Revisión", color: "secondary" },
};

/** Las opciones de "Se repite", con el día de la fecha elegida: "Cada semana (los jueves)", "Cada mes (el día 5)". */
export const repeatChoices = (date: string): { value: Repeat; label: string }[] => {
    const wd = date ? WEEKDAYS[weekdayOf(date) - 1] : "";
    const plural = wd === "sábado" || wd === "domingo" ? `${wd}s` : wd;
    const dayNum = date ? Number(date.slice(8, 10)) : 0;
    return [
        { value: "none", label: "Solo ese día" },
        { value: "weekly", label: date ? `Cada semana (los ${plural})` : "Cada semana" },
        { value: "monthly", label: date ? (dayNum >= 31 ? "Cada mes (el último día)" : `Cada mes (el día ${dayNum})`) : "Cada mes" },
        { value: "twice_monthly", label: "El 15 y el último de cada mes" },
    ];
};

export const isClosed = (i: CalendarItem) => i.status === "done" || i.status === "dismissed";

/** Una nota nueva en esa fecha: una tarea de ese día. */
export const emptyNote = (date: string): NoteFields => ({ title: "", details: null, date, time: null, kind: "task", repeat: "none", repeat_until: null });
