// src/components/meta-ads/editorShared.ts
// Etapa 5, paso 5a: lo que comparten las pantallas de los editores, la Cola y banca del dueño y el número del menú (los
// tipos, los roles, el enlace de Drive y el aviso de que algo cambió). Los componentes están en editorWork.tsx.
import type { StoredFile } from "./fileUpload";
import type { AngleInfo, PersonaInfo, ProductInfo } from "./productProfile";

export type Delivery = {
    id: number; version: string; editor: string | null; delivered_at: string | null; concept: string | null; angle: string | null; notes: string | null;
    // .90: el archivo en el sistema (las entregas viejas, el enlace de Drive)
    pieces: {
        piece_id: number; code: string | null; link: string | null; file_id?: number | null; file?: StoredFile | null; hook?: string | null;
        /** .133: el formato que eligió el editor al entregar (ya no escribe el hook). */
        style?: string | null; style_label?: string | null;
        /** .92: de dónde salió (una referencia, idea propia o la iteración de un ganador). */
        source?: ReferenceSource | null; reference?: ReferenceBrief | null; source_label?: string | null;
    }[];
    review: "pending" | "approved" | "returned"; review_label: string; reviewed_by: string | null; reviewed_at: string | null; comment: string | null;
};
export type EditorFields = {
    editor_id: number | null; editor: string | null; assigned_at: string | null; started_at: string | null; delivered_at: string | null; overdue: boolean;
    returned: { version: string; comment: string | null; by: string | null } | null; deliveries: Delivery[];
    can: { assign: boolean; start: boolean; deliver: boolean; review: boolean }; review_by_owner: boolean;
    /** .93: el ganador que se itera (para compararlo al revisar y al entregar). */
    iteration?: Iteration | null;
    /** .94: la referencia que sugirió el líder al asignar. */
    suggested_reference?: ReferenceBrief | null;
};
/** .94: con lo que tiene cada uno (encargos abiertos y atrasados) y el sugerido para el próximo. */
export type EditorOption = { id: number; name: string; leader: boolean; open?: number; late?: number; suggested?: boolean };

/** .94: los números del juego (EditorGame del servidor): de quien mira y, para el líder, los del equipo. */
export type EditorGameData = {
    me: { streak: number; first: { ok: number; total: number }; winners: number; recent_wins: { code: string; at: string }[] };
    team: { streak: number; on_time: { ok: number; total: number }; winners: number } | null;
};

/**
 * .133 (dueño, 2026-11-10: "debe elegir el concepto o formato… si es un testimonio, venta directa, UGC, animación con IA"):
 * los formatos para elegir al entregar cada pieza (el servidor manda los suyos; estos son por si no llegan).
 */
export const DELIVERY_STYLES: Record<string, string> = {
    imagen: "Imagen", ugc: "UGC", testimonio: "Testimonio", entrevista: "Entrevista", animado: "Animación con IA", demostracion: "Demostración",
    antes_despues: "Antes y después", problema_solucion: "Problema–solución", venta_directa: "Venta directa", otro: "Otro",
};

/** .99: qué hay que hacer en el encargo, en una frase (BatchTask del servidor): "3 iteraciones del hook de C0146". */
/** .128: en una variación, hypothesis y detail (cómo hacerlo) son textos fijos: ni la IA ni el sistema dictan qué decir. */
export type BatchTask = { title: string; detail: string | null; hypothesis?: string | null };

/** .91: los encargos como los ve el editor (EditorWork::present), para "Mis encargos" y "El equipo". */
export type EditorStatus = "approved" | "production" | "review" | "bank" | "testing" | "tested" | "discarded";
/** .81: test_label y hypothesis = qué prueba la pieza y su hipótesis. .90: file = su archivo en el sistema. */
export type EditorPiece = { id: number; code: string | null; change: string | null; format: string | null; link: string | null; hook: string | null; style?: string | null;
    test_label?: string | null; style_label?: string | null; hypothesis?: string | null; file?: StoredFile | null;
    source?: ReferenceSource | null; reference_id?: number | null };
export type EditorBatch = EditorFields & {
    id: number; code: string | null; product_id?: number; product: string; status: EditorStatus; status_label: string; status_at: string | null; position: number | null;
    kind: string; kind_label: string; angle_code: string | null; angle_name: string | null; concept: string | null; audience: string | null;
    goal?: string | null; improve?: string | null; test_idea?: string | null;
    /** .139: a igual fecha, lo de los productos Buenos antes que lo de los Regulares; el líder ve por qué (sin números). */
    product_rank?: number; product_note?: string | null;
    /** .93: de qué trata el ángulo; la hipótesis del encargo (solo le llega al líder). */
    angle_about?: string | null; hypothesis?: string | null;
    product_info?: ProductInfo | null; persona?: PersonaInfo | null; personas?: PersonaInfo[]; angles?: AngleInfo[]; photos?: StoredFile[];
    style_label?: string | null;
    reference: string | null; reference_thumbnail: string | null; reference_texts: string[];
    reference_script?: { hook: string | null; text: string | null } | null; format: string | null; keep: string | null;
    offer: string | null; deliverables: string | null; due_date: string | null; pieces: EditorPiece[];
    meta_names: { adset: string | null; ads: string[] }; brief: string;
    /** .88: por qué hace falta y para cuándo. .90: se entrega subiendo el archivo. */
    need?: string | null; uploads?: boolean;
    /** .92: si es la iteración de un ganador, cuál. .98: al entregar, "Iteración (variación) de …" queda fija en cada pieza. */
    iteration_of?: string | null;
    /** .95: un batch ya hecho que cargó el líder (de antes del sistema, sin hipótesis). */
    imported?: boolean;
    /** .99: qué hay que hacer (null: un batch ya hecho que se cargó). */
    task?: BatchTask | null;
};

/** .92: la biblioteca de referencias (ReferenceLibrary del servidor). */
export type ReferenceSource = "reference" | "own" | "iteration";
export type ReferenceBrief = { id: number; code: string; type_label: string | null; link: string | null; file: StoredFile | null; why?: string | null };

/**
 * .93: el ganador que se itera (EditorWork::iteration): su video si está en el sistema; si no, su miniatura y sus textos.
 * .104: si su video no está en el sistema (es de antes), video_note dice su nombre completo y su ángulo para buscarlo en
 * el Drive antiguo.
 */
export type Iteration = {
    code: string | null; angle?: string | null; file: StoredFile | null; video_note?: string | null; thumbnail: string | null; texts: string[];
    script: { hook: string | null; text: string | null } | null;
};

/** .93: un lado de la comparación (la referencia a la izquierda, lo entregado a la derecha). */
export type CompareSide = { label: string; file?: StoredFile | null; thumbnail?: string | null; lines: string[]; empty?: string | null; link?: { href: string; label: string } | null };

/** .93: lo que se busca y lo que se pidió en cada pieza, para revisar con todo a la vista (la hipótesis: solo el líder y el dueño). */
export type ReviewContext = {
    /** .99: qué había que hacer, en una frase. */
    task?: string | null;
    hypothesis?: string | null; testIdea?: string | null; angle?: string | null; angleAbout?: string | null;
    goal?: string | null; keep?: string | null; improve?: string | null; iteration?: Iteration | null;
    asked: Record<number, { change: string | null; hypothesis?: string | null; test_label?: string | null }>;
};

type ContextSource = {
    task?: BatchTask | null;
    hypothesis?: string | null; test_idea?: string | null; angle_code: string | null; angle_name: string | null; angle_about?: string | null;
    goal?: string | null; keep: string | null; improve?: string | null; iteration?: Iteration | null;
    pieces: { id?: number; change: string | null; hypothesis?: string | null; test_label?: string | null }[];
};

/** .93: el contexto de "Revisar" a partir de un encargo (el del líder o el de Cola y banca del dueño). */
export const reviewContext = (b: ContextSource): ReviewContext => ({
    task: b.task ? [b.task.title, b.task.detail].filter(Boolean).join(". ") : null,
    hypothesis: b.hypothesis, testIdea: b.test_idea, angle: [b.angle_code, b.angle_name].filter(Boolean).join(" ") || null, angleAbout: b.angle_about,
    goal: b.goal, keep: b.keep, improve: b.improve, iteration: b.iteration ?? null,
    asked: Object.fromEntries(b.pieces.filter((p) => p.id).map((p) => [p.id as number, { change: p.change, hypothesis: p.hypothesis, test_label: p.test_label }])),
});

/**
 * .93: lo que va a la izquierda al comparar: la referencia de la biblioteca (su video, su tipo y por qué la eligieron), el
 * ganador que se itera (su video o, si es de antes del sistema, su miniatura y lo que dice) o por qué no hay referencia.
 */
export const referenceSide = (
    source: ReferenceSource | null | undefined,
    ref: { code: string; type_label: string | null; link: string | null; file: StoredFile | null; why?: string | null } | null | undefined,
    iteration: Iteration | null | undefined,
): CompareSide => {
    if (ref) {
        return { label: `La referencia · ${ref.code}`, file: ref.file, lines: [ref.type_label ?? "", ref.why ? `Por qué la eligieron: ${ref.why}` : ""].filter(Boolean),
            link: ref.link ? { href: ref.link, label: "ver el original" } : null };
    }
    if (iteration && source !== "own" && source !== "reference") {
        return { label: `El ganador · ${iteration.code ?? ""}`.replace(/ · $/, ""), file: iteration.file, thumbnail: iteration.thumbnail,
            lines: [iteration.file ? "" : iteration.video_note ?? "", iteration.script?.hook ? `Su hook: «${iteration.script.hook}»` : "",
                ...iteration.texts.map((x) => `“${x}”`)].filter(Boolean) };
    }
    return {
        label: "La referencia", lines: [],
        empty: source === "own" ? "Idea propia: no partió de una referencia." : source === "iteration" ? "Es la iteración de un ganador que no está en el sistema."
            : "Esta entrega no dice de qué referencia salió (es de antes de la biblioteca).",
    };
};

/** .93: los motivos rápidos para pedir un cambio (los eligió el dueño). */
export const REVIEW_REASONS = ["No es lo que se pidió", "No cumple con el propósito", "No sigue la referencia", "Hook flojo", "Texto mal puesto", "Audio o música", "Muy largo o lento"];

/** .93: un segundo del video como "0:03". */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export type ReferenceItem = {
    // .97: con "Subir varias", el link, el tipo y el "por qué" pueden venir vacíos
    id: number; code: string; link: string | null; type: string | null; type_label: string | null; why: string | null; product_id: number | null; product: string | null;
    angle_code: string | null; angle_name: string | null; file: StoredFile | null; uploaded_by: string | null; created_at: string | null; uses: number;
    can_archive: boolean;
    /** .97: "Otro ángulo" (no va con ninguno de la ficha) y lo que es: video o imagen. */
    angle_other: string | null; format: "video" | "image" | null;
    /** Solo el líder y el dueño. */
    results?: { won: number; lost: number; tie: number };
};
/** .97: lo que es una referencia. */
export const FORMAT_LABEL: Record<string, string> = { video: "Video", image: "Imagen" };
/** .97: el valor de "Otro ángulo" (no va con ninguno de la ficha). */
export const OTHER_ANGLE = "other";

/** El ángulo de una referencia en palabras: "POSP · Posparto" u "Otro: dolor de espalda". */
export const referenceAngle = (r: Pick<ReferenceItem, "angle_code" | "angle_name" | "angle_other">) =>
    r.angle_other ? `Otro: ${r.angle_other}` : r.angle_code ? `${r.angle_code}${r.angle_name ? ` · ${r.angle_name}` : ""}` : null;

/** Una referencia en una línea, para elegirla: "REF0012 · Video · UGC · Termafit POSP — el hook…". */
export const referenceOption = (r: ReferenceItem) => {
    const where = r.product ? [r.product, r.angle_other ? "otro ángulo" : r.angle_code].filter(Boolean).join(" ") : "cualquier producto";
    const why = r.why ? ` — ${r.why.length > 60 ? `${r.why.slice(0, 60)}…` : r.why}` : "";
    return [r.code, r.format ? FORMAT_LABEL[r.format] : null, r.type_label, where].filter(Boolean).join(" · ") + why;
};

export type ReferenceProduct = { id: number; name: string; angles: { code: string; name: string | null }[] };
export type ReferenceLibraryData = {
    references: ReferenceItem[]; top: ReferenceItem[]; results: boolean; products: ReferenceProduct[]; types: Record<string, string>; uploads: boolean;
};
export type ReferenceUse = {
    piece_id: number; code: string | null; ad_name: string | null; batch: string | null; product: string | null; editor: string | null;
    status: string | null; status_label: string | null; file: StoredFile | null; result?: string | null;
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

/** Lo que el servidor dijo que falta, por casilla (la primera razón de cada una), o null si no fue eso. */
export const fieldErrors = (e: unknown): Record<string, string> | null => {
    const errs = (e as { errors?: Record<string, string[]> }).errors;
    return errs ? Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])) : null;
};

export const piecesDiffer = (b: EditorBatch) => new Set(b.pieces.map((p) => `${p.test_label ?? ""}|${p.style_label ?? ""}`)).size > 1;

/** `.128`: la lista de piezas solo sale si alguien escribió qué lleva cada una o si son de tipos distintos (1 de hook y 2 de formato). */
export const saysPerPiece = (b: EditorBatch) => piecesDiffer(b) || b.pieces.some((p) => p.change);
