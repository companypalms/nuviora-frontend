// src/components/calendar/StageMap.tsx
// .107 "Tu día": las etapas del día como un mapa (Urgente → Alta → Normal → Baja → A su hora): las terminadas con su marca,
// la de ahora resaltada, "2 de 4" en cada una. Solo salen las que tienen algo hoy. Todas abiertas: se puede hacer en
// cualquier orden (como en "Tu día en Meta Ads").
import React, { FC } from "react";
import { Box, Stack, Typography } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import { useTokens } from "../ui/design";
import { StageKey, stageColor } from "./calendar";

export type StageStat = { key: StageKey; label: string; n: number; d: number };

export const StageMap: FC<{ stages: StageStat[]; current: StageKey | null }> = ({ stages, current }) => {
    const t = useTokens();
    const at = stages.findIndex((s) => s.key === current);
    return (
        <Box sx={{ mt: 2.5 }}>
            {at >= 0 && <Typography sx={{ fontSize: 13, color: t.muted, mb: 1 }}>Etapa {at + 1} de {stages.length}: {stages[at].label}</Typography>}
            <Stack direction="row" alignItems="flex-start" role="list" aria-label="Etapas del día">
                {stages.map((s, k) => {
                    const done = s.n > 0 && s.d === s.n;
                    const on = current === s.key;
                    const c = stageColor(s.key, t);
                    const prev = k > 0 ? stages[k - 1] : null;
                    return (
                        <React.Fragment key={s.key}>
                            {prev && <Box aria-hidden sx={{ flex: 1, minWidth: 6, height: 2, mt: "15px", bgcolor: prev.d === prev.n ? t.green : t.line, transition: "background-color 200ms" }} />}
                            <Stack role="listitem" alignItems="center" sx={{ width: { xs: 56, sm: 84 }, flex: "none", textAlign: "center" }}
                                aria-label={`${s.label}: ${s.d} de ${s.n} hechas${on ? " (la de ahora)" : ""}`}>
                                <Box sx={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600,
                                    transition: "all 200ms",
                                    ...(done ? { bgcolor: t.green, color: t.onInk } : on ? { border: `2px solid ${c}`, color: c } : { border: `1.5px solid ${t.line}`, color: t.muted }) }}>
                                    {done ? <CheckRounded sx={{ fontSize: 18 }} /> : k + 1}
                                </Box>
                                <Typography sx={{ fontSize: { xs: 12, sm: 13 }, mt: 0.5, lineHeight: 1.25, color: on ? t.ink : t.muted, fontWeight: on ? 600 : 400 }}>{s.label}</Typography>
                                <Typography sx={{ fontSize: 12, color: t.faint }}>{s.d} de {s.n}</Typography>
                            </Stack>
                        </React.Fragment>
                    );
                })}
            </Stack>
        </Box>
    );
};
