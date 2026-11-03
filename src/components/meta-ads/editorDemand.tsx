// src/components/meta-ads/editorDemand.tsx
// .88 (dueño, 2026-11-03): lo que ve el editor líder (y el dueño en Cola y banca): todo lo que hace falta para mantener
// cada producto y seguir escalando, para cuándo y por qué, sin contar cuántos editores hay; y si alcanza el equipo en las
// próximas 2 semanas (un flotante o un editor fijo). Sin montos: el editor no ve plata.
// .91: con el diseño nuevo; "¿Alcanza el equipo?" puede ir plegado en una línea y cada encargo de la lista se puede tocar.
import React, { useState } from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { dueLabel } from "./editorShared";
import { cardSx, useTokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";

export type Forecast = {
    verdict: "ok" | "floater" | "fixed"; text: string; need: number; can: number; extra: number; short_days: string[];
    inputs: {
        ordered: number; replace: number; new: number; products: number; life: number; life_source: "meta" | "settings";
        new_products_month: number; start_batches: number; editors: number; per_day: number; per_editor: number; capacity_source: "real" | "settings";
    };
};
/** Lo que hace falta y no se pudo pedir (sin la ficha del producto o sin una ciudad donde probarlo). */
export type Unfilled = { product_id: number; product: string; due: string; why: string; blocked: string };
export type NeedBatch = {
    id: number; code: string | null; product: string; status: string; due_date: string | null; editor: string | null; need?: string | null;
    /** .89: si ya se entregó, lo que falta son las correcciones (la fecha "lista"). */
    delivered_at?: string | null;
};

const num = (n: number) => n.toLocaleString("es-VE", { maximumFractionDigits: 1 });

/** ¿Alcanza el equipo? El veredicto en una frase y de dónde sale, en chico. `.91`: "compact" = una línea; el detalle, al tocar. */
export const ForecastCard: React.FC<{ f: Forecast | null | undefined; compact?: boolean }> = ({ f, compact = false }) => {
    const t = useTokens();
    const [open, setOpen] = useState(!compact);
    if (!f) return null;
    const i = f.inputs;
    const color = { ok: t.green, floater: t.amber, fixed: t.red }[f.verdict];
    return (
        <Box sx={{ ...cardSx(t), p: "12px 14px", mb: 2 }}>
            <Typography sx={{ fontSize: 13, color: t.muted }}>¿Alcanza el equipo? Las próximas 2 semanas</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                <Dot color={color} />
                <Typography sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{f.text}</Typography>
            </Stack>
            {compact && (
                <TextAction onClick={() => setOpen((o) => !o)} aria-expanded={open} sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>{open ? "Ocultar" : "De dónde sale"}</TextAction>
            )}
            {open && <>
                <Typography sx={{ fontSize: 14, mt: 0.5 }}>Se necesitan ~{f.need} batches; tu equipo hace ~{f.can}.</Typography>
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>
                    De dónde sale: {i.ordered} ya {i.ordered === 1 ? "pedido" : "pedidos"} · ~{num(i.replace)} para reponer los que se cansan (un batch bueno
                    dura ~{num(i.life)} días{i.life_source === "settings" ? ", de tus ajustes" : " en Meta"} y cada campaña necesita 2 vivos) · ~{num(i.new)} de
                    productos nuevos ({i.new_products_month} al mes × {i.start_batches} de inicio).
                </Typography>
                <Typography sx={{ fontSize: 13, color: t.muted }}>
                    Tu equipo: {i.editors} {i.editors === 1 ? "editor" : "editores"}, ~{num(i.per_editor)} por día cada uno
                    {i.capacity_source === "real" ? " (lo que entregaron de verdad en las últimas 4 semanas)." : " (de tus ajustes: todavía no hay 2 semanas de entregas)."}
                </Typography>
            </>}
        </Box>
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

/** "jue 05/11". */
const short = (date: string) => dueLabel(date) ?? date;

/**
 * Lo que necesitamos: todo lo pedido y lo que falta pedir, por fecha (atrasado, hoy, mañana, en 2 días) y con su porqué.
 * .89: dos fechas: la entrega del editor y "lista" (con las correcciones del líder); atrasado = no entregó a tiempo, o ya
 * entregó y las correcciones pasaron de "lista".
 */
export const NeedsList: React.FC<{ batches: NeedBatch[]; unfilled: Unfilled[]; today: string; correctionsDays?: number; onOpen?: (id: number) => void }> = ({
    batches, unfilled, today, correctionsDays = 1, onOpen,
}) => {
    const t = useTokens();
    const rows = [
        ...batches.filter((b) => ["approved", "production", "review"].includes(b.status)).map((b) => {
            const ready = b.due_date ? plus(b.due_date, correctionsDays) : null;
            const late = !!b.due_date && (b.delivered_at ? (ready ?? "") < today : b.due_date < today);
            return {
                key: `b${b.id}`, id: b.id as number | null, due: b.due_date, title: `${b.code ?? "Encargo"} · ${b.product}`, why: b.need ?? null, warn: false,
                state: stateOf(b) + (b.due_date ? ` · Entrega: ${short(b.due_date)} · Lista: ${short(ready!)}` : ""),
                bucket: bucketOf(b.due_date, today, late),
            };
        }),
        ...unfilled.map((u, i) => ({
            key: `u${u.product_id}-${i}`, id: null as number | null, due: u.due, title: `Sin encargo todavía · ${u.product}`, why: u.why, state: u.blocked, warn: true,
            bucket: bucketOf(u.due, today, false),
        })),
    ];
    const tone = (key: Bucket) => (key === "late" ? t.red : key === "today" ? t.amber : t.gray);
    return (
        <Box sx={{ ...cardSx(t), p: "12px 14px", mb: 2 }}>
            <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>Lo que necesitamos</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>
                Todo lo que hay que hacer para mantener cada producto y seguir escalando, del más urgente al menos.{onOpen ? " Toca uno para verlo." : ""}
            </Typography>
            {rows.length === 0 ? <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Nada pendiente.</Typography>
                : BUCKETS.map(([key, label]) => {
                    const list = rows.filter((r) => r.bucket === key);
                    return list.length === 0 ? null : (
                        <Box key={key} sx={{ mt: 1.5 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Dot color={tone(key)} size={8} />
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{label} · {list.length}</Typography>
                            </Stack>
                            {list.map((r) => {
                                const body = (
                                    <Box sx={{ minWidth: 0, textAlign: "left", width: "100%" }}>
                                        <Typography sx={{ fontSize: 14, fontWeight: 500, overflowWrap: "anywhere" }}>{r.title}</Typography>
                                        <Typography sx={{ fontSize: 13, color: r.warn ? t.amber : t.muted, overflowWrap: "anywhere" }}>{r.state}</Typography>
                                        {r.why && <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>{r.why}</Typography>}
                                    </Box>
                                );
                                const row = { py: 1, borderBottom: `1px solid ${t.line}`, "&:last-child": { borderBottom: 0 } } as const;
                                return onOpen && r.id ? (
                                    <ButtonBase key={r.key} onClick={() => onOpen(r.id as number)} sx={{ ...row, display: "flex", width: "100%", justifyContent: "flex-start", borderRadius: "6px",
                                        "&:hover": { bgcolor: t.soft }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}` } }}>{body}</ButtonBase>
                                ) : <Box key={r.key} sx={row}>{body}</Box>;
                            })}
                        </Box>
                    );
                })}
        </Box>
    );
};
