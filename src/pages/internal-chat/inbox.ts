// La bandeja del chat interno: tipos y textos de cada hilo.
import dayjs from "dayjs";
import "dayjs/locale/es";
import { ChatParty } from "../../components/internal-chat/chat/types";

export interface Conversation {
    id: number;
    order: { id: number; name: string } | null;
    client: string | null;
    counterpart: ChatParty | null;
    vendedor: ChatParty | null;
    agency: ChatParty | null;
    /** body ya viene como "📷 Foto · …" cuando el último mensaje es un archivo. */
    last_message: { body: string; sender_id: number; created_at: string } | null;
    last_message_at: string | null;
    unread: number;
    is_participant?: boolean; // false: la Líder mirando el hilo de una vendedora de su grupo
}

export const orderLabel = (c: Conversation) => (c.order?.name ? `Orden ${c.order.name}` : "Orden");

/** Con quién es el hilo: la otra parte, o "vendedora ↔ agencia" para el Admin y la Líder que mira. */
export const partyLabel = (c: Conversation, isAdmin: boolean) => {
    if (isAdmin || c.is_participant === false) return `${c.vendedor?.name ?? "?"} ↔ ${c.agency?.name ?? "?"}`;
    return c.counterpart?.name ?? "(sin agencia)";
};

/** Hoy: la hora; ayer: "Ayer"; esta semana: el día; antes: la fecha. */
export const inboxTime = (date: string | null) => {
    if (!date) return "";
    const d = dayjs(date).locale("es");
    const now = dayjs();
    if (d.isSame(now, "day")) return d.format("h:mm a");
    if (d.isSame(now.subtract(1, "day"), "day")) return "Ayer";
    if (now.diff(d, "day") < 7) return d.format("ddd");
    return d.format(d.year() === now.year() ? "D MMM" : "DD/MM/YY");
};

export const initials = (name: string) =>
    name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

const COLORS = ["#2563eb", "#0d9488", "#db2777", "#ea580c", "#7c3aed", "#059669", "#ca8a04", "#dc2626"];
export const colorFor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
};
