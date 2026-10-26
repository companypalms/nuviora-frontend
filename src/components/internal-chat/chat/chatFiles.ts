// Archivos del chat interno: qué se acepta, el tamaño máximo y el envío con barra de progreso.
import { request } from "../../../common/request";
import { getCookieValue } from "../../../lib/functions";
import { useUserStore } from "../../../store/user/UserStore";
import { ChatMessage, OutgoingMessage } from "./types";

/** El servidor acepta hasta 50 MB por archivo (PHP y nginx). */
export const CHAT_MAX_BYTES = 50 * 1024 * 1024;
export const CHAT_MAX_FILES = 10;

export const CHAT_ACCEPT = [
    "image/*", "video/*", "audio/*", "application/pdf",
    ".pdf", ".heic", ".heif", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".csv", ".txt", ".rtf", ".zip", ".rar",
].join(",");

export const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
};

/** Por qué no se puede enviar un archivo, o null si está bien. */
export const chatFileProblem = (file: File): string | null => {
    if (file.size === 0) return `"${file.name}" está vacío.`;
    if (file.size > CHAT_MAX_BYTES) return `"${file.name}" pesa ${fmtSize(file.size)}. El máximo es 50 MB.`;
    return null;
};

export const isPreviewableImage = (file: File) => /^image\/(jpeg|png|gif|webp|bmp)$/.test(file.type);

const errorMessage = (status: number, text: string) => {
    if (status === 413) return "El archivo es demasiado grande para el servidor (máximo 50 MB).";
    if (status === 0) return "Sin conexión. Revisa tu internet e intenta de nuevo.";
    try {
        const data = JSON.parse(text);
        const firstError = data.errors ? Object.values<string[]>(data.errors)[0]?.[0] : null;
        return firstError || data.message || `No se pudo enviar (${status}).`;
    } catch {
        return `No se pudo enviar (${status}).`;
    }
};

/**
 * Envía un mensaje al hilo. Con archivo va como multipart por XMLHttpRequest, para mostrar el avance de la
 * subida (fetch no lo da). Devuelve el mensaje guardado o lanza un Error con el motivo.
 */
export const sendChatMessage = async (
    conversationId: number,
    msg: OutgoingMessage,
    onProgress?: (percent: number) => void,
): Promise<ChatMessage> => {
    const url = `/internal-chat/conversations/${conversationId}/messages`;
    if (!msg.file) {
        const { status, response, err } = await request(url, "POST", { body: msg.body });
        // Sin conexión, request() devuelve una respuesta vacía
        const text = typeof response?.text === "function" ? await response.text().catch(() => "") : "";
        if (status >= 200 && status < 300) return JSON.parse(text);
        throw new Error(errorMessage(Array.isArray(err) ? status : 0, text));
    }

    const form = new FormData();
    form.append("file", msg.file, msg.file.name);
    if (msg.body) form.append("body", msg.body);
    if (msg.voice) form.append("voice", "1");
    const token = useUserStore.getState().user.token ?? getCookieValue("token");

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${import.meta.env.VITE_BACKEND_API_URL}${url}`);
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
