// Tipos del chat interno (vendedora ↔ agencia, por orden). Desde 2026-10-06 un mensaje puede llevar un archivo.

export interface ChatParty {
    id: number;
    name: string;
}

/** Cómo se muestra el archivo: foto, video, audio, nota de voz y PDF se abren en el chat; file se descarga. */
export type AttachmentKind = "image" | "video" | "audio" | "voice" | "pdf" | "file";

export interface ChatAttachment {
    /** Enlace firmado (vence en 12 h): se renueva cada vez que se abre el hilo. */
    url: string;
    download_url: string;
    name: string;
    mime: string;
    size: number;
    kind: AttachmentKind;
}

export interface ChatMessage {
    id: number;
    sender_id: number;
    sender: ChatParty | null;
    body: string;
    attachment?: ChatAttachment | null;
    read_at?: string | null;
    created_at: string;
    mine?: boolean;
}

/** Lo que se envía: texto, un archivo con su pie, o una nota de voz. */
export interface OutgoingMessage {
    body: string;
    file?: File;
    voice?: boolean;
}
