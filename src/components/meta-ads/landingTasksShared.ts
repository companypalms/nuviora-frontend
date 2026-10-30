// src/components/meta-ads/landingTasksShared.ts
// Etapa 5, paso 6b: lo que comparten Meta Ads › Landings › Encargos del dueño, "Mis encargos de landing" y el número del
// menú (los tipos, el rol y el aviso de que algo cambió). Los componentes están en landingTasks.tsx.

export type LandingDelivery = {
    id: number; version: string; editor: string | null; delivered_at: string | null; preview_url: string; notes: string;
    review: "pending" | "approved" | "returned"; review_label: string; reviewed_by: string | null; reviewed_at: string | null; comment: string | null;
};
export type TestSide = {
    totals: { spend?: number; link_clicks: number; visits: number; purchases: number };
    metrics: { visit: number | null; conversion: number | null; ctr: number | null; cpa?: number | null; cpa_vs_c: number | null };
};
export type TestResult = {
    state: "waiting" | "won" | "lost" | "tie" | "no_sample"; label: string; done: boolean; change: number | null; visit_change: number | null;
    before: TestSide; after: TestSide; text: string; ads: number; before_from: string; before_to: string; after_from: string; after_to: string; after_days: number;
};
export type LandingTaskStatus = "proposed" | "approved" | "production" | "review" | "ready" | "testing" | "tested" | "discarded";
export type LandingTask = {
    id: number; code: string | null; product_id: number; product: string | null; status: LandingTaskStatus; status_label: string; status_at: string | null;
    kind: string; kind_label: string; source: string; landing_id: number | null; landing: string | null; landing_url: string | null;
    angle_code: string | null; angle_name: string | null; observed: string | null; hypothesis: string | null; change: string | null; keep: string | null;
    notes: string | null; due_date: string | null; approved_at: string | null; editor_id: number | null; editor: string | null;
    started_at: string | null; delivered_at: string | null; published_at: string | null; published_url: string | null; test_landing: string | null;
    tested_at: string | null; result: TestResult | null; discard_reason: string | null; overdue: boolean;
    returned: { version: string; comment: string | null; by: string | null } | null; deliveries: LandingDelivery[];
    can: { approve: boolean; assign: boolean; start: boolean; deliver: boolean; review: boolean; publish: boolean; discard: boolean };
};
export type LandingOption = { id: number; product_id: number; label: string; url: string; angle_code: string | null };
export type PersonOption = { id: number; name: string };

export const LANDING_EDITOR_ROLE = "Editor de landings";

/** Lo que se escribe al pedir un cambio de landing. */
export type TaskDraft = {
    product_id: number | ""; landing_id: number | ""; kind: string; angle_code: string; observed: string; hypothesis: string; change: string; keep: string; notes: string;
};
export const EMPTY_DRAFT: TaskDraft = { product_id: "", landing_id: "", kind: "angle", angle_code: "", observed: "", hypothesis: "", change: "", keep: "", notes: "" };

export const LANDING_KINDS: Record<string, string> = { speed: "Velocidad", angle: "Hablarle a un ángulo", new: "Landing nueva", offer: "Oferta o contenido" };

export const TEST_COLOR: Record<TestResult["state"], "default" | "success" | "error" | "warning" | "info"> = {
    waiting: "info", won: "success", lost: "error", tie: "default", no_sample: "warning",
};

const EVENT = "landing-tasks-changed";

/** Avisa al número del menú que algo cambió (después de empezar, entregar, revisar o publicar). */
export const notifyLandingChanged = () => window.dispatchEvent(new Event(EVENT));

export const onLandingChanged = (fn: () => void) => {
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
};

/** Lo mismo que LandingTaskRules::validUrl del servidor: un enlace https. */
export const validHttps = (url: string) => {
    try {
        const u = new URL(url.trim());
        return u.protocol === "https:" && u.hostname.includes(".");
    } catch {
        return false;
    }
};
