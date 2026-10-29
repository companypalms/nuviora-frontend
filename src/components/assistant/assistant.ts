// src/components/assistant/assistant.ts
// El asistente del dueño (Etapa 4): los tipos y las llamadas al backend (/api/assistant, solo el Admin). La respuesta se
// arma en el servidor después de guardar la pregunta: el chat la pide cada poco (fetchMessage) hasta que llega.
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
    };

export type ChatMessage = {
    id: number;
    role: "user" | "assistant";
    text: string | null;
    status: "thinking" | "done" | "failed";
    progress: string | null;
    display: DisplayBlock[];
    error: string | null;
    client_id: string | null;
    time: string | null;
};

export type ChatState = { mode: AssistantMode; messages: ChatMessage[]; today: number; limit: number };

export const fetchChat = () => api<ChatState>("/assistant");

export const sendQuestion = (text: string, clientId: string) =>
    api<{ question: ChatMessage; reply: ChatMessage; today: number }>("/assistant/messages", "POST", { text, client_id: clientId });

export const fetchMessage = (id: number) => api<ChatMessage>(`/assistant/messages/${id}`);

export const clearChat = () => api<{ cleared: number }>("/assistant", "DELETE");

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
