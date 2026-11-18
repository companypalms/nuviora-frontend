// src/components/store-chat/storeChat.ts
// .158 "Chat de la tienda": los datos que manda el servidor (StoreChatReport, StoreChat, StoreChatExam), compartidos por la
// página y el examen.

export type ChatStatus = "answered" | "unknown" | "blocked" | "failed" | "limit" | "callback";

export type ChatMessage = {
    id: number; question: string; answer: string; status: ChatStatus; reason: string | null; raw: string | null;
    ready: boolean; note: string; button: string; at?: string;
};

/** .160: la respuesta espera al menos ms, para que "Tu asesora está escribiendo…" se vea natural aunque la IA conteste rápido. */
export const atLeast = async <T>(ms: number, promise: Promise<T>): Promise<T> => {
    const [result] = await Promise.all([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
    return result;
};

export type StoreChatSettings = { enabled: boolean; product_ids: number[]; daily_answers: number; per_visitor: number; support_phone: string; hours: string; policies: string };

/** .161 un cliente "Por contactar": lo que el chat no supo responder y el WhatsApp que dejó. */
export type Callback = { id: number; product: string; question: string; phone: string; wa: string; test: boolean; at: string | null };

/** .159 "Lo que sabe el chat" de un producto: su ficha y sus "Más detalles". */
export type ChatKnowledge = {
    product_id: number; name: string; has_profile: boolean; has_ficha: boolean; ficha: Record<string, string | null>;
    labels: Record<string, string>; details: string; max: number;
};

export type LastExam = { ok: number; total: number; at: string | null };

/** .162: por qué no hay precio en Bs (o si la tasa está vieja): no_price, no_rate, old_rate o null. */
export type PriceIssue = "no_price" | "no_rate" | "old_rate" | null;

export type StoreChatProduct = { id: number; name: string; price_bs: number | null; price_issue: PriceIssue; enabled: boolean; last_exam: LastExam | null };

export type ExamQuestion = { id: number; group: string; question: string; expect: string };

/** Una respuesta del examen, con su nota: ok true = ✓; false o null = ⚠ (null: la revisa el dueño). */
export type ExamResult = ChatMessage & { question_id: number; group: string; expect: string; ok: boolean | null; grade: string };

export type Unanswered = { id: number; product_id: number | null; product: string; question: string; status: ChatStatus; reason: string | null; test: boolean; at: string | null };

export type Conversation = { id: number; product: string; test: boolean; questions: number; unanswered: boolean; at: string | null; messages: ChatMessage[] };

export type StoreChatData = {
    settings: StoreChatSettings; mode: "openai" | "example" | "unavailable"; rate: { binance: number | null; at: string | null; fresh: boolean };
    today: { answers: number; cap: number }; products: StoreChatProduct[]; unanswered: Unanswered[]; conversations: Conversation[]; callbacks: Callback[];
    note: string; button: string;
    exam: { questions: ExamQuestion[]; groups: Record<string, string>; expects: Record<string, string> };
};
