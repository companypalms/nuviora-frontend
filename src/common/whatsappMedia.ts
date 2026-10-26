// 🔥 Tarea 11: WhatsApp acepta archivos de hasta 16 MB. Los videos que no son MP4 (ej. .mov del
// iPhone) los convierte el servidor, así que se aceptan todos los formatos de video.
export const WHATSAPP_MAX_BYTES = 16 * 1024 * 1024;
export const WHATSAPP_ACCEPT = "image/*,video/*,audio/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx";

export const whatsappFileTooBig = (file: File): string | null =>
    file.size > WHATSAPP_MAX_BYTES
        ? `El archivo pesa ${(file.size / 1048576).toFixed(1)} MB. WhatsApp acepta hasta 16 MB.`
        : null;

// Lee el mensaje de error aunque el servidor no responda JSON (ej. 413 de nginx con HTML)
export const readUploadError = async (response: Response, status: number): Promise<string> => {
    if (status === 413) return "El archivo es demasiado grande para el servidor (máximo 16 MB).";
    try {
        const data = await response.clone().json();
        return data.message || data.error || "Error subiendo archivo";
    } catch {
        return `Error subiendo archivo (${status})`;
    }
};
