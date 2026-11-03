// src/components/meta-ads/editorDemand.tsx
// .88 (dueño, 2026-11-03): lo que ve el editor líder (y el dueño en Cola y banca): todo lo que hace falta para mantener
// cada producto y seguir escalando, para cuándo y por qué, sin contar cuántos editores hay; y si alcanza el equipo en las
// próximas 2 semanas (un flotante o un editor fijo). Sin montos: el editor no ve plata.
import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { dueLabel } from "./editorShared";

export type Forecast = {
    verdict: "ok" | "floater" | "fixed"; text: string; need: number; can: number; extra: number; short_days: string[];
    inputs: {
        ordered: number; replace: number; new: number; products: number; life: number; life_source: "meta" | "settings";
        new_products_month: number; start_batches: number; editors: number; per_day: number; per_editor: number; capacity_source: "real" | "settings";
    };
};
/** Lo que hace falta y no se pudo pedir (sin la ficha del producto o sin una ciudad donde probarlo). */
export type Unfilled = { product_id: number; product: string; due: string; why: string; blocked: string };
export type NeedBatch = { id: number; code: string | null; product: string; status: string; due_date: string | null; editor: string | null; need?: string | null };

const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const SIGNAL = { ok: "success.main", floater: "warning.main", fixed: "error.main" } as const;
const num = (n: number) => n.toLocaleString("es-VE", { maximumFractionDigits: 1 });

/** ¿Alcanza el equipo? El veredicto en una frase y de dónde sale, en chico. */
export const ForecastCard: React.FC<{ f: Forecast | null | undefined }> = ({ f }) => {
    if (!f) return null;
    const i = f.inputs;
    return (
        <Paper elevation={0} sx={{ ...card, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>¿Alcanza el equipo? Las próximas 2 semanas</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SIGNAL[f.verdict], flex: "none" }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{f.text}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.5 }}>Se necesitan ~{f.need} batches; tu equipo hace ~{f.can}.</Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                De dónde sale: {i.ordered} ya {i.ordered === 1 ? "pedido" : "pedidos"} · ~{num(i.replace)} para reponer los que se cansan (un batch bueno
                dura ~{num(i.life)} días{i.life_source === "settings" ? ", de tus ajustes" : " en Meta"} y cada campaña necesita 2 vivos) · ~{num(i.new)} de
                productos nuevos ({i.new_products_month} al mes × {i.start_batches} de inicio).
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
                Tu equipo: {i.editors} {i.editors === 1 ? "editor" : "editores"}, ~{num(i.per_editor)} por día cada uno
                {i.capacity_source === "real" ? " (lo que entregaron de verdad en las últimas 4 semanas)." : " (de tus ajustes: todavía no hay 2 semanas de entregas)."}
            </Typography>
        </Paper>
    );
};

const BUCKETS = [["late", "Atrasado"], ["today", "Para hoy"], ["tomorrow", "Para mañana"], ["two", "En 2 días"], ["later", "Después"]] as const;
type Bucket = typeof BUCKETS[number][0];
const plus = (today: string, n: number) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const bucketOf = (due: string | null, today: string, late: boolean): Bucket => {
    if (late) return "late";
    if (!due || due <= today) return "today";
    if (due === plus(today, 1)) return "tomorrow";
    return due === plus(today, 2) ? "two" : "later";
};
const stateOf = (b: NeedBatch) => b.status === "review" ? "Entregado: por revisar"
    : b.status === "production" ? `En producción${b.editor ? `: ${b.editor}` : ""}` : b.editor ? `Asignado a ${b.editor}` : "Sin editor";

/** Lo que necesitamos: todo lo pedido y lo que falta pedir, por fecha (atrasado, hoy, mañana, en 2 días) y con su porqué. */
export const NeedsList: React.FC<{ batches: NeedBatch[]; unfilled: Unfilled[]; today: string }> = ({ batches, unfilled, today }) => {
    const rows = [
        ...batches.filter((b) => ["approved", "production", "review"].includes(b.status)).map((b) => ({
            key: `b${b.id}`, due: b.due_date, title: `${b.code ?? "Encargo"} · ${b.product}`, why: b.need ?? null, state: stateOf(b), warn: false,
            bucket: bucketOf(b.due_date, today, b.status !== "review" && !!b.due_date && b.due_date < today),
        })),
        ...unfilled.map((u, i) => ({
            key: `u${u.product_id}-${i}`, due: u.due, title: `Sin encargo todavía · ${u.product}`, why: u.why, state: u.blocked, warn: true,
            bucket: bucketOf(u.due, today, false),
        })),
    ];
    return (
        <Paper elevation={0} sx={{ ...card, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">Lo que necesitamos</Typography>
            <Typography variant="caption" color="text.secondary">
                Todo lo que hay que hacer para mantener cada producto y seguir escalando, del más urgente al menos, sin contar cuántos editores hay.
            </Typography>
            {rows.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Nada pendiente.</Typography>
                : BUCKETS.map(([key, label]) => {
                    const list = rows.filter((r) => r.bucket === key);
                    return list.length === 0 ? null : (
                        <Box key={key} sx={{ mt: 1.5 }}>
                            <Typography variant="caption" fontWeight={700} color={key === "late" ? "error.main" : key === "today" ? "warning.main" : "text.secondary"}>
                                {label} · {list.length}
                            </Typography>
                            {list.map((r) => (
                                <Box key={r.key} sx={{ py: 0.75, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                                    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
                                        <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{r.title}</Typography>
                                        <Typography variant="caption" color={r.warn ? "warning.main" : "text.secondary"}>
                                            {r.state}{r.due && key === "late" ? ` · era para el ${dueLabel(r.due)}` : r.due && key === "later" ? ` · para el ${dueLabel(r.due)}` : ""}
                                        </Typography>
                                    </Stack>
                                    {r.why && <Typography variant="caption" color="text.secondary" component="div" sx={{ overflowWrap: "anywhere" }}>{r.why}</Typography>}
                                </Box>
                            ))}
                        </Box>
                    );
                })}
        </Paper>
    );
};
