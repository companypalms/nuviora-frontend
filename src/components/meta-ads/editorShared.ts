// src/components/meta-ads/editorShared.ts
// Etapa 5, paso 5a: lo que comparten las pantallas de los editores, la Cola y banca del dueño y el número del menú (los
// tipos, los roles, el enlace de Drive y el aviso de que algo cambió). Los componentes están en editorWork.tsx.

export type Delivery = {
    id: number; version: string; editor: string | null; delivered_at: string | null; concept: string | null; angle: string | null; notes: string | null;
    pieces: { piece_id: number; code: string | null; link: string; hook: string }[];
    review: "pending" | "approved" | "returned"; review_label: string; reviewed_by: string | null; reviewed_at: string | null; comment: string | null;
};
export type EditorFields = {
    editor_id: number | null; editor: string | null; assigned_at: string | null; started_at: string | null; delivered_at: string | null; overdue: boolean;
    returned: { version: string; comment: string | null; by: string | null } | null; deliveries: Delivery[];
    can: { assign: boolean; start: boolean; deliver: boolean; review: boolean }; review_by_owner: boolean;
};
export type EditorOption = { id: number; name: string; leader: boolean };

export const EDITOR_ROLES = ["Editor líder", "Editor de video"];

const EVENT = "editor-queue-changed";

/** Avisa al número del menú que algo cambió (después de empezar, entregar, asignar o revisar). */
export const notifyEditorChanged = () => window.dispatchEvent(new Event(EVENT));

/** Escuchar ese aviso; devuelve cómo dejar de escuchar. */
export const onEditorChanged = (fn: () => void) => {
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
};

/** Lo mismo que EditorRules::driveFileId del servidor: el id del archivo en un enlace de Drive, o null. */
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
