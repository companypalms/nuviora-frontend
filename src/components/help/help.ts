// src/components/help/help.ts
// .96: la ayuda "¿Dudas?" de los editores. La IA solo sabe el libro de ayuda de su rol (servidor: Services\Help\EditorHelp);
// aquí, los tipos, las preguntas de ejemplo y las llamadas.
import { api } from "../meta-ads/metaAds";

export type HelpMessage = { id: number; question: string; answer: string | null; failed: boolean; at: string | null };
/** .99: left y limit en null = sin tope (el líder). */
export type HelpState = { mode: "openai" | "example" | "off" | "unavailable"; book: "lider" | "editor" | null; messages: HelpMessage[]; left: number | null; limit: number | null };

/** Para empezar sin escribir: lo que más se pregunta en cada rol. */
export const HELP_SUGGESTIONS: Record<"lider" | "editor", string[]> = {
    lider: ["¿Cómo reviso una entrega?", "¿Cómo cargo un batch ya hecho?", "¿Cómo asigno un encargo?", "¿Qué es la racha al día?"],
    editor: ["¿Cómo entrego un encargo?", "¿Qué hago si me lo devolvieron?", "¿Cómo subo una referencia?", "¿Qué es la racha a tiempo?"],
};

export const HELP_MAX = 500;

export const fetchHelp = () => api<HelpState>("/editor/help");
export const askHelp = (question: string) => api<{ message: HelpMessage; left: number | null }>("/editor/help", "POST", { question });

/** Si la ventana quedó abierta al cambiar de pantalla (solo en la computadora). */
const OPEN_KEY = "nuviora.help.open";
export const rememberOpen = (open: boolean) => {
    try { sessionStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* sin almacenamiento: se cierra al cambiar de pantalla */ }
};
export const wasOpen = () => {
    try { return sessionStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
};
