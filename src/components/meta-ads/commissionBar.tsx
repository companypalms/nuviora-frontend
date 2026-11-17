// src/components/meta-ads/commissionBar.tsx
// .153 (dueño, 2026-11-17: "una barra de su ganancia por comisión… solo su comisión, pero tampoco se le explica de ninguna
// manera de dónde se obtiene ese número ni nada. Solo la barra y su comisión ganada, todo como si fuera un juego"): arriba de
// "Encargos del equipo", lo que lleva el líder en la quincena, una barra contra lo que cobró la anterior y el día que cobra.
// Sin "¿Por qué?" (lo pidió el dueño). Solo la ve el líder.
import React, { useEffect, useState } from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { EmojiEventsRounded } from "@mui/icons-material";
import { api } from "./metaAds";
import { money } from "../delivery-tariffs/deliveryTariffs";
import { appear, cardSx, useTokens } from "../ui/design";

type Commission = {
    amount: number;
    start: string;
    end: string;
    payday: string;
    payday_label: string;
    previous: number | null;
    fill: number;
    beat: boolean;
    target: "previous" | "days";
    days_left: number;
    notice: { tone: "green"; text: string } | null;
};

export const CommissionBar: React.FC = () => {
    const t = useTokens();
    const [data, setData] = useState<Commission | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let alive = true;
        api<Commission>("/editor/commission")
            .then((r) => { if (alive) setData(r); })
            .catch(() => { if (alive) setFailed(true); });
        return () => { alive = false; };
    }, []);

    // Si no carga, no estorba: el resto de la pantalla sigue
    if (failed) return null;
    if (!data) return <Skeleton variant="rounded" height={92} sx={{ mt: 2 }} aria-label="Cargando tu comisión" />;

    const color = data.beat ? t.green : t.ink;
    const when = data.days_left === 0 ? "Cobras hoy" : `Cobras el ${data.payday_label}`;
    const pct = Math.round(Math.max(0, Math.min(1, data.fill)) * 100);

    return (
        <Box sx={{ ...cardSx(t), ...appear, p: { xs: 1.5, sm: 2 }, mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                <Box>
                    <Typography sx={{ fontSize: 12, color: t.muted }}>Tu comisión</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 600, color, lineHeight: 1.2, fontFeatureSettings: '"tnum"' }}>{money(data.amount)}</Typography>
                </Box>
                <Typography sx={{ fontSize: 13, color: t.muted, textAlign: "right" }}>{when}</Typography>
            </Stack>
            <Box role="progressbar" aria-label={data.target === "previous" ? "Tu comisión contra la quincena anterior" : "Días de la quincena"}
                aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                sx={{ height: 8, borderRadius: 4, bgcolor: t.soft, overflow: "hidden", mt: 1.25 }}>
                <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: color, borderRadius: 4, transition: "width 200ms ease-out, background-color 200ms",
                    "@media (prefers-reduced-motion: reduce)": { transition: "none" } }} />
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.5} sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 13, color: t.muted }}>
                    {data.target === "previous" && data.previous !== null ? `Quincena anterior: ${money(data.previous)}` : `Faltan ${data.days_left} ${data.days_left === 1 ? "día" : "días"} para cobrar`}
                </Typography>
                {data.notice && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <EmojiEventsRounded sx={{ fontSize: 16, color: t.green }} />
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.green }}>{data.notice.text}</Typography>
                    </Stack>
                )}
            </Stack>
        </Box>
    );
};
