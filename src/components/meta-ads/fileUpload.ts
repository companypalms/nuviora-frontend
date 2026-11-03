// src/components/meta-ads/fileUpload.ts
// .90 (dueño, 2026-11-03: "que se suban todos los archivos en el sistema en vez de utilizar Google Drive"): subir un
// archivo al almacén (Cloudflare R2; en la PC de pruebas, la carpeta privada) en 3 pasos: el sistema da un enlace firmado,
// el navegador sube el archivo directo con su barra de avance (no pasa por el servidor ni por su límite de 50 MB) y se
// confirma. Para verlo ahí mismo, fileView.tsx.
import { api } from "./metaAds";
import { fmtSize } from "../internal-chat/chat/chatFiles";

export type StoredFile = {
    id: number; name: string; mime: string; size: number; type: "video" | "image" | "document" | "other"; version: number | null;
    url: string | null; download_url: string | null;
};
type UploadStart = { file: { id: number; name: string }; upload: { url: string; method: string; headers: Record<string, string> } };

export type FileKind = "piece" | "photo" | "strategy";

/** Lo mismo que StoredFileRules del servidor. */
export const ACCEPT: Record<FileKind, string> = {
    piece: "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,image/jpeg,image/png,image/webp",
    photo: "image/jpeg,image/png,image/webp",
    strategy: "application/pdf,.pdf,.doc,.docx,.txt,.md",
};
const GB = 1024 ** 3;
const MB = 1024 ** 2;

/** Por qué no se puede subir (antes de empezar), o null. El servidor lo vuelve a revisar. */
export const fileProblem = (kind: FileKind, file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const video = file.type.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext);
    const image = /^image\/(jpeg|png|webp)$/.test(file.type) || ["jpg", "jpeg", "png", "webp"].includes(ext);
    if (file.size === 0) return `"${file.name}" está vacío.`;
    if (kind === "piece" && !video && !image) return "Sube el video (mp4, mov o webm) o la imagen (jpg, png o webp) de la pieza.";
    if (kind === "photo" && !image) return "Las fotos van en jpg, png o webp.";
    if (video && file.size > GB) return `"${file.name}" pesa ${fmtSize(file.size)}: un video puede pesar hasta 1 GB.`;
    if (image && file.size > 30 * MB) return `"${file.name}" pesa ${fmtSize(file.size)}: una imagen puede pesar hasta 30 MB.`;
    if (kind === "strategy" && file.size > 50 * MB) return `"${file.name}" pesa ${fmtSize(file.size)}: un documento puede pesar hasta 50 MB.`;
    return null;
};

/** El navegador sube el archivo directo al almacén, con su avance (sin la sesión: el enlace firmado basta). */
const put = (target: UploadStart["upload"], file: File, onProgress?: (percent: number) => void) => new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    Object.entries(target.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`No se pudo subir "${file.name}" (${xhr.status}). Intenta de nuevo.`)));
    xhr.onerror = () => reject(new Error("Se cortó la conexión mientras subía. Revisa tu internet e intenta de nuevo."));
    xhr.send(file);
});

/** Pide el enlace, sube y confirma; devuelve lo que responde la confirmación. */
export const sendFile = async <T,>(startUrl: string, extra: Record<string, unknown>, file: File, confirmUrl: (id: number) => string,
    onProgress?: (percent: number) => void): Promise<T> => {
    const start = await api<UploadStart>(startUrl, "POST", { ...extra, name: file.name, mime: file.type, size: file.size });
    await put(start.upload, file, onProgress);
    return api<T>(confirmUrl(start.file.id), "POST");
};
