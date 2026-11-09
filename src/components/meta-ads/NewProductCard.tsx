// src/components/meta-ads/NewProductCard.tsx
// .118 (dueño: "quiero que sea una misión, no un aviso, porque escalar debe ser una obligación, no una opción"): la misión de
// lanzar un producto nuevo, arriba del análisis: sus 5 etapas con su fecha, y "Hecho" en las que marca el dueño. Mientras no se
// abre, una línea dice qué falta.
import React, { FC, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import { toast } from "react-toastify";
import { api } from "../finance/finance";
import { appear, cardSx, inkSx, useTokens } from "../ui/design";

export type NewProductStage = { key: string; label: string; who: string; how: string; manual: boolean; own: boolean; done: boolean; due: string; late: boolean };
export type NewProductView =
    | { state: "open"; id: number; product: string | null; day: number; days: number; stages: NewProductStage[]; current: string | null }
    | { state: "done"; product: string | null; next: string }
    | { state: "waiting"; missing: string[] };

const shortDay = (d: string) => { const [, m, x] = d.split("-"); return `${Number(x)}/${Number(m)}`; };

export const NewProductCard: FC<{ view: NewProductView; onChanged: (v: NewProductView) => void }> = ({ view, onChanged }) => {
    const t = useTokens();
    const [busy, setBusy] = useState<string | null>(null);

    if (view.state === "waiting") {
        if (view.missing.length === 0) return null;
        return (
            <Typography sx={{ fontSize: 13, color: t.muted, mt: 2, overflowWrap: "anywhere" }}>
                <Box component="span" sx={{ fontWeight: 600 }}>Producto nuevo, todavía no.</Box> {view.missing.join(" ")}
            </Typography>
        );
    }
    if (view.state === "done") {
        return (
            <Box role="status" sx={{ mt: 2, p: "10px 14px", borderRadius: "8px", display: "flex", gap: 1, alignItems: "center", bgcolor: t.greenSoft, color: t.greenInk, ...appear }}>
                <EmojiEventsRounded sx={{ fontSize: 20 }} />
                <Typography sx={{ fontSize: 14, color: "inherit", overflowWrap: "anywhere" }}>Publicaste {view.product ?? "el producto nuevo"}. El siguiente, a partir del {shortDay(view.next)}.</Typography>
            </Box>
        );
    }

    const done = view.stages.filter((s) => s.done).length;
    const complete = async (stage: string) => {
        setBusy(stage);
        try {
            onChanged((await api<{ view: NewProductView }>(`/meta/new-product-mission/${view.id}/done`, "POST", { stage })).view);
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
    };

    return (
        <Box component="section" aria-label="Misión de producto nuevo" sx={{ ...cardSx(t), p: { xs: "14px", sm: "16px 18px" }, mt: 2, borderColor: t.ink }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" flexWrap="wrap" useFlexGap columnGap={1.5}>
                <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>Misión: lanzar {view.product ?? "un producto nuevo"}</Typography>
                <Typography sx={{ fontSize: 13, color: t.muted }}>Etapa {Math.min(done + 1, view.stages.length)} de {view.stages.length} · día {view.day} de {view.days}</Typography>
            </Stack>
            <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, mt: 1.25 }}>
                {view.stages.map((s, i) => {
                    const now = s.key === view.current;
                    const color = s.done ? t.green : s.late ? t.red : now ? t.ink : t.gray;
                    return (
                        <Box component="li" key={s.key} sx={{ display: "flex", gap: 1.25, py: 1, borderTop: i ? `1px solid ${t.line}` : "none" }}>
                            <Box aria-hidden sx={{ flex: "none", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", mt: "1px",
                                fontSize: 12, fontWeight: 600, bgcolor: s.done ? color : "transparent", border: `1.5px solid ${color}`, color: s.done ? t.card : color }}>
                                {s.done ? <CheckRounded sx={{ fontSize: 15 }} /> : i + 1}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 15, fontWeight: now ? 600 : 500, color: s.done ? t.faint : t.ink, textDecoration: s.done ? "line-through" : "none", overflowWrap: "anywhere" }}>{s.label}</Typography>
                                <Typography sx={{ fontSize: 13, color: s.late ? t.red : t.muted, overflowWrap: "anywhere" }}>
                                    {s.who}{!s.done && ` · ${s.late ? "era para el" : "hasta el"} ${shortDay(s.due)}`}
                                </Typography>
                                {(now || s.late) && !s.done && <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.5, overflowWrap: "anywhere" }}>{s.how}</Typography>}
                            </Box>
                            {s.manual && !s.done && (
                                <Button variant="contained" disableElevation size="small" disabled={busy !== null} onClick={() => complete(s.key)} sx={{ ...inkSx(t), flex: "none", alignSelf: "flex-start", minHeight: { xs: 44, sm: 36 } }}>Hecho</Button>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};
