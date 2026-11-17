// src/components/meta-ads/autoUploadState.ts
// .155: lo que comparten la página del Análisis del día y "Aprobar y subir" (AutoUpload): las subidas a Meta del análisis.
import { createContext, useContext } from "react";

export type UploadTarget = { code: string; campaign: string; min: number | null };
export type UploadRow = {
    id: number; key: string | null; batch: string | null; campaign: string | null; adset: string | null;
    status: "queued" | "running" | "waiting" | "done" | "failed"; paused: boolean; text: string; can_retry: boolean; finished_at: string | null;
};

/** Las que todavía trabajan. */
export const OPEN = ["queued", "running", "waiting"];
export const uploadsOpen = (rows: UploadRow[]) => rows.some((u) => OPEN.includes(u.status));

/** Las subidas del análisis que se ve, para todas las misiones de la página (las pide y refresca MetaAnalysisPage). */
export const UploadsContext = createContext<{ on: boolean; analysisId: number | null; uploads: UploadRow[]; refresh: () => void }>(
    { on: false, analysisId: null, uploads: [], refresh: () => undefined });

/** ¿El sistema ya subió (o está subiendo) lo de esta misión? Entonces sus pasos a mano sobran. */
export const useAutoUploaded = (key: string) => useContext(UploadsContext).uploads.some((u) => u.key === key && u.status !== "failed");
