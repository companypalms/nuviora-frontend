// src/components/meta-ads/editorShared.ts
// Etapa 5, paso 5a: lo que comparten las pantallas de los editores, la Cola y banca del dueño y el número del menú (los
// tipos, los roles, el enlace de Drive y el aviso de que algo cambió). Los componentes están en editorWork.tsx.
import type { StoredFile } from "./fileUpload";
import type { AngleInfo, PersonaInfo, ProductInfo } from "./productProfile";

export type Delivery = {
    id: number; version: string; editor: string | null; delivered_at: string | null; concept: string | null; angle: string | null; notes: string | null;
    // .90: el archivo en el sistema (las entregas viejas, el enlace de Drive)
    pieces: { piece_id: number; code: string | null; link: string | null; file_id?: number | null; file?: StoredFile | null; hook: string }[];
    review: "pending" | "approved" | "returned"; review_label: string; reviewed_by: string | null; reviewed_at: string | null; comment: string | null;
};
export type EditorFields = {
    editor_id: number | null; editor: string | null; assigned_at: string | null; started_at: string | null; delivered_at: string | null; overdue: boolean;
    returned: { version: string; comment: string | null; by: string | null } | null; deliveries: Delivery[];
    can: { assign: boolean; start: boolean; deliver: boolean; review: boolean }; review_by_owner: boolean;
};
export type EditorOption = { id: number; name: string; leader: boolean };

/** .91: los encargos como los ve el editor (EditorWork::present), para "Mis encargos" y "El equipo". */
export type EditorStatus = "approved" | "production" | "review" | "bank" | "testing" | "tested" | "discarded";
/** .81: test_label y hypothesis = qué prueba la pieza y su hipótesis. .90: file = su archivo en el sistema. */
export type EditorPiece = { id: number; code: string | null; change: string | null; format: string | null; link: string | null; hook: string | null;
    test_label?: string | null; style_label?: string | null; hypothesis?: string | null; file?: StoredFile | null };
export type EditorBatch = EditorFields & {
    id: number; code: string | null; product: string; status: EditorStatus; status_label: string; status_at: string | null; position: number | null;
    kind: string; kind_label: string; angle_code: string | null; angle_name: string | null; concept: string | null; audience: string | null;
    goal?: string | null; improve?: string | null; test_idea?: string | null;
    product_info?: ProductInfo | null; persona?: PersonaInfo | null; personas?: PersonaInfo[]; angles?: AngleInfo[]; photos?: StoredFile[];
    style_label?: string | null;
    reference: string | null; reference_thumbnail: string | null; reference_texts: string[];
    reference_script?: { hook: string | null; text: string | null } | null; format: string | null; keep: string | null;
    offer: string | null; deliverables: string | null; due_date: string | null; pieces: EditorPiece[];
    meta_names: { adset: string | null; ads: string[] }; brief: string;
    /** .88: por qué hace falta y para cuándo. .90: se entrega subiendo el archivo. */
    need?: string | null; uploads?: boolean;
};

export const EDITOR_ROLES = ["Editor líder", "Editor de video"];

const EVENT = "editor-queue-changed";

/** Avisa al número del menú que algo cambió (después de empezar, entregar, asignar o revisar). */
export const notifyEditorChanged = () => window.dispatchEvent(new Event(EVENT));

/** Escuchar ese aviso; devuelve cómo dejar de escuchar. */
export const onEditorChanged = (fn: () => void) => {
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
};

/** Lo mismo que EditorRules::driveFileId del servidor: el id del archivo en un enlace de Drive, o null (`.90`: solo sin almacén). */
export const driveFileId = (url: string): string | null => {
    try {
        const u = new URL(url.trim());
        if (u.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(u.hostname.toLowerCase())) return null;
        const m = u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/);
        const id = m ? m[1] : ["/open", "/uc"].includes(u.pathname) ? u.searchParams.get("id") : null;
        return id && /^[A-Za-z0-9_-]{20,}$/.test(id) ? id : null;
    } catch {
        return null;
    }
};

/** "vie 31/10". */
export const dueLabel = (date: string | null) => {
    if (!date) return null;
    return new Date(`${date}T12:00:00`).toLocaleDateString("es-VE", { weekday: "short", day: "2-digit", month: "2-digit" });
};

/** Hoy en Venezuela (las fechas de los encargos son de allá), "2026-11-03". */
export const todayVe = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });

/** Días de hoy a una fecha (negativo: ya pasó). */
export const daysUntil = (date: string, today: string) =>
    Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);

/**
 * .91: para cuándo, en palabras y con su señal: "Atrasado: era para el lun 02/11" (rojo), "Para hoy" (ámbar), "Para
 * mañana, mié 04/11" (gris). Con "ready" (lo entregado), la fecha que cuenta es "lista" (entrega + correcciones).
 */
export const whenLabel = (date: string | null, today: string): { text: string; level: "late" | "today" | "soon" | "none" } => {
    if (!date) return { text: "Sin plazo", level: "none" };
    const d = daysUntil(date, today);
    if (d < 0) return { text: `Atrasado: era para el ${dueLabel(date)}`, level: "late" };
    if (d === 0) return { text: "Para hoy", level: "today" };
    return { text: d === 1 ? `Para mañana, ${dueLabel(date)}` : `Para el ${dueLabel(date)}`, level: "soon" };
};
