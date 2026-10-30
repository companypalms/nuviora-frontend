// src/components/assistant/assistant.ts
// El asistente del dueño (Etapa 4): los tipos y las llamadas al backend (/api/assistant, solo el Admin). La respuesta se
// arma en el servidor después de guardar la pregunta: el chat la pide cada poco (fetchMessage) hasta que llega.
import { getCookieValue } from "../../lib/functions";
import { useUserStore } from "../../store/user/UserStore";
import { ChatAttachment } from "../internal-chat/chat/types";
import { fmtSize } from "../internal-chat/chat/chatFiles";
import { api } from "../meta-ads/metaAds";
import { MetricCardData, MetricFormat } from "../owner-panel/ownerPanel";

/** openai: la IA de verdad; example: el modo ejemplo de la PC de pruebas; unavailable/off: sin IA. */
export type AssistantMode = "openai" | "example" | "unavailable" | "off";

export type ChartSeries = { key: string; label: string };

/** Lo que se ve debajo de una respuesta. Lo arma el servidor con los datos del sistema, nunca la IA. */
export type DisplayBlock =
    | { type: "cards"; title: string; compare_label: string; cards: MetricCardData[] }
    | { type: "chart"; kind: "bar" | "hbar" | "line"; title: string; format: MetricFormat; series: ChartSeries[]; points: Array<Record<string, string | number | null>> }
    | {
        type: "table"; title: string; columns: Array<{ key: string; label: string; format: MetricFormat }>;
        rows: Array<{ name: string; group: string | null; values: Record<string, number | null>; low_data: boolean }>;
    }
    | { type: "list"; title: string; items: Array<{ text: string; level?: string | null }> }
    | { type: "link"; label: string; to: string }
    | {
        type: "orders"; title: string;
        orders: Array<{ id: number; name: string; status: string | null; client: string | null; city: string | null; total: number; created: string | null }>;
    }
    | { type: "action"; action: ActionCard };

/** Un cambio que propuso el asistente (paso 5): solo se hace cuando el dueño toca Confirmar. */
export type ActionStatus = "proposed" | "done" | "failed" | "cancelled" | "expired";

export type ActionCard = {
    id: number;
    title: string;
    lines: Array<{ label: string; value: string; before?: string }>;
    warnings: string[];
    /** Lo que cambia a cada rato (cuántas órdenes tiene, cuántas esperan): se muestra, pero no hace vencer la tarjeta (paso 7). */
    notes?: string[];
    /** Solo en la respuesta de Confirmar, una vez: la contraseña de una cuenta nueva (paso 7). Nunca se guarda. */
    secret?: { label: string; value: string; note: string };
    status: ActionStatus;
    status_label: string;
    error: string | null;
    result: { text: string; link: { label: string; to: string } | null } | null;
    created: string | null;
    decided: string | null;
};

export type ChatMessage = {
    id: number;
    role: "user" | "assistant";
    text: string | null;
    status: "thinking" | "done" | "failed";
    progress: string | null;
    display: DisplayBlock[];
    /** Los archivos de la pregunta (foto, PDF o Excel), con su enlace firmado (12 h), como el chat interno. */
    attachments: ChatAttachment[];
    error: string | null;
    client_id: string | null;
    time: string | null;
};

export type ChatState = { mode: AssistantMode; messages: ChatMessage[]; today: number; limit: number };

export const fetchChat = () => api<ChatState>("/assistant");

type Sent = { question: ChatMessage; reply: ChatMessage; today: number };

/** El mensaje de error de una respuesta del servidor (Laravel: message o el primer error de una casilla). */
const errorMessage = (status: number, body: string) => {
    if (status === 413) return "Los archivos pesan demasiado para el servidor (máximo 30 MB entre todos).";
    if (status === 0) return "Sin conexión. Revisa tu internet e intenta de nuevo.";
    try {
        const data = JSON.parse(body);
        const first = data.errors ? Object.values<string[]>(data.errors)[0]?.[0] : null;
        return first || data.message || `No se pudo enviar (${status}).`;
    } catch {
        return `No se pudo enviar (${status}).`;
    }
};

/**
 * Una pregunta, con archivos o sin ellos. Con archivos va como multipart por XMLHttpRequest, para mostrar el avance de
 * la subida (fetch no lo da), igual que el chat interno.
 */
export const sendQuestion = (text: string, clientId: string, files: File[] = [], onProgress?: (percent: number) => void): Promise<Sent> => {
    if (files.length === 0) return api<Sent>("/assistant/messages", "POST", { text, client_id: clientId });

    const form = new FormData();
    if (text) form.append("text", text);
    form.append("client_id", clientId);
    files.forEach((f) => form.append("files[]", f, f.name));
    const token = useUserStore.getState().user.token ?? getCookieValue("token");

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${import.meta.env.VITE_BACKEND_API_URL}/assistant/messages`);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch {
                    reject(new Error("Respuesta inesperada del servidor."));
                }
            } else {
                reject(new Error(errorMessage(xhr.status, xhr.responseText)));
            }
        };
        xhr.onerror = () => reject(new Error(errorMessage(0, "")));
        xhr.send(form);
    });
};

/** Lo que se dijo al micrófono, en texto. example: en la PC de pruebas es una pregunta de muestra. */
export const transcribe = (audio: File) => {
    const form = new FormData();
    form.append("audio", audio, audio.name);
    return api<{ text: string; example: boolean }>("/assistant/transcribe", "POST", form);
};

export const fetchMessage = (id: number) => api<ChatMessage>(`/assistant/messages/${id}`);

export const clearChat = () => api<{ cleared: number }>("/assistant", "DELETE");

/** Confirmar o cancelar una tarjeta: solo va su número; el servidor revisa todo de nuevo. */
export const confirmAction = (id: number) => api<ActionCard>(`/assistant/actions/${id}/confirm`, "POST");
export const cancelAction = (id: number) => api<ActionCard>(`/assistant/actions/${id}/cancel`, "POST");

/** "Lo que hizo el asistente". */
export const fetchActions = () => api<{ actions: ActionCard[] }>("/assistant/actions");

// --- Archivos: las mismas reglas del servidor (Services/Assistant/Files/FileRules.php) ---

const MB = 1024 * 1024;
export const FILES_MAX = 5;
const IMAGE_MAX = 10 * MB;
const DOC_MAX = 20 * MB;
const TOTAL_MAX = 30 * MB;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const SHEET_EXTENSIONS = ["xlsx", "xls", "ods", "csv"];

export const FILE_ACCEPT = [...IMAGE_TYPES, "application/pdf", ".pdf", ...SHEET_EXTENSIONS.map((e) => `.${e}`)].join(",");

const extension = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

export const fileKind = (file: File): "image" | "pdf" | "sheet" | null => {
    if (IMAGE_TYPES.includes(file.type)) return "image";
    if (file.type === "application/pdf" || extension(file.name) === "pdf") return "pdf";
    if (SHEET_EXTENSIONS.includes(extension(file.name))) return "sheet";
    return null;
};

/** Por qué no se puede mandar un archivo, o null si está bien. */
export const fileProblem = (file: File): string | null => {
    const kind = fileKind(file);
    if (!kind) {
        return /heic|heif/i.test(file.type) || ["heic", "heif"].includes(extension(file.name))
            ? `"${file.name}" es una foto HEIC del iPhone, que la IA no puede ver. Mándala como JPG o haz una captura de pantalla.`
            : `"${file.name}" no se puede mandar: se aceptan fotos (JPG, PNG, WEBP o GIF), PDF y Excel o CSV.`;
    }
    if (file.size === 0) return `"${file.name}" está vacío.`;
    if (kind === "image" && file.size > IMAGE_MAX) return `"${file.name}" pesa ${fmtSize(file.size)}. Las fotos pueden pesar hasta 10 MB.`;
    if (file.size > DOC_MAX) return `"${file.name}" pesa ${fmtSize(file.size)}. Los PDF y Excel pueden pesar hasta 20 MB.`;
    return null;
};

/** Si entre todos se pasan del máximo por mensaje. */
export const totalProblem = (files: File[]): string | null => {
    const total = files.reduce((s, f) => s + f.size, 0);
    return total > TOTAL_MAX ? `Entre todos los archivos pesan ${fmtSize(total)}. El máximo por mensaje es 30 MB.` : null;
};

/** Un id para que, si el navegador reintenta, el servidor no pregunte dos veces. */
export const newClientId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Lo que se le sugiere al dueño cuando el chat está vacío. */
export const SUGGESTIONS = [
    "¿Cuánto vendimos esta semana?",
    "Ranking de vendedoras de este mes",
    "¿Cómo voy con mis metas?",
    "¿Qué productos se están acabando?",
    "¿Qué tengo pendiente hoy?",
];
