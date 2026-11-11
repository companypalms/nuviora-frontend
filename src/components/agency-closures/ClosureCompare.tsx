// src/components/agency-closures/ClosureCompare.tsx
// .136 (dueño, 2026-11-11: "que a mí me diga de una manera notable cuánto es lo que el sistema determina que le debo
// pagar a la agencia y cuánto dicen ellos, para yo saber qué tanta diferencia hay"): los dos montos grandes, lado a lado,
// y la diferencia en palabras. Lo usan la lista de cierres (cada tarjeta) y el detalle de un cierre (arriba).
import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Dot } from "../ui/designParts";
import { Tokens, useTokens } from "../ui/design";
import { GapVerdict, money } from "./closures";

/** "Cobra $12,50 de más" / "Cobra $3,00 de menos" / "Cuadra": lo que cobra la agencia contra lo que calcula el sistema. */
const gapWords = (difference: number | null, verdict: GapVerdict): string | null => {
    if (difference === null || verdict === null) return null;
    if (verdict === "over") return `Cobra ${money(difference)} de más`;
    if (verdict === "under") return `Cobra ${money(-difference)} de menos`;
    return Math.abs(difference) < 0.005 ? "Cuadra" : `Cuadra (${difference > 0 ? "+" : "−"}${money(Math.abs(difference))}, dentro de la tolerancia)`;
};

/** El color de la señal: de más en ámbar, cuadra en verde, de menos en gris. Siempre con palabra al lado. */
const gapColor = (t: Tokens, verdict: GapVerdict) => (verdict === "over" ? t.amber : verdict === "ok" ? t.green : t.gray);

const Amount: React.FC<{ label: string; value: number | null; hint?: string; big?: boolean }> = ({ label, value, hint, big }) => {
    const t = useTokens();
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, color: t.muted }}>{label}</Typography>
            <Typography component="div" sx={{ fontSize: big ? { xs: 26, sm: 32 } : { xs: 20, sm: 24 }, fontWeight: 600, lineHeight: 1.2, mt: 0.25, color: value === null ? t.faint : t.ink }}>
                {value === null ? "—" : money(value)}
            </Typography>
            {hint && <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.25 }}>{hint}</Typography>}
        </Box>
    );
};

export const ClosureCompare: React.FC<{
    system: number | null; systemHint?: string; reported: number | null; reportedHint?: string;
    difference: number | null; verdict: GapVerdict; waiting?: string; big?: boolean;
}> = ({ system, systemHint, reported, reportedHint, difference, verdict, waiting, big }) => {
    const t = useTokens();
    const words = gapWords(difference, verdict);
    return (
        <Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: { xs: 1.5, sm: 3 } }}>
                <Amount label="Calcula el sistema" value={system} hint={systemHint} big={big} />
                <Amount label="Cobra la agencia" value={reported} hint={reportedHint} big={big} />
            </Box>
            {(words || waiting) && (
                <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1.25 }}>
                    <Dot color={words ? gapColor(t, verdict) : t.gray} />
                    <Typography sx={{ fontSize: big ? 17 : 15, fontWeight: words ? 600 : 400, color: words ? t.ink : t.muted }}>{words ?? waiting}</Typography>
                </Stack>
            )}
        </Box>
    );
};
