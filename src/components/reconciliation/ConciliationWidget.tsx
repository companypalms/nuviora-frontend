// src/components/reconciliation/ConciliationWidget.tsx
// Conciliaciones en el dashboard del Administrador (documento de Fran del 2026-10-06):
// §15: "Debe aparecer directamente en mi dashboard… 4 OCT · Pendiente · 3 extractos necesarios… El usuario hace clic y
// entra directamente a completar esa conciliación. Si todo está al día: Conciliaciones al día".
// §32: "Tienes una conciliación pendiente de ayer."
import React, { useEffect, useState } from "react";
import { Box, Button, ButtonBase, Skeleton, Stack, Typography } from "@mui/material";
import { ChevronRightRounded, HistoryRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { request } from "../../common/request";
import { DAY_META, DayCard, dayNeeds, plural, shortDate } from "./reconciliation";
import { Panel } from "../ui/surface/Panel";

const yesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const ConciliationWidget: React.FC = () => {
    const navigate = useNavigate();
    const [pending, setPending] = useState<DayCard[] | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { status, response } = await request("/reconciliations", "GET");
                if (status === 200) setPending((await response.json()).pending ?? []);
            } catch {
                /* el resto del dashboard sigue */
            }
        })();
    }, []);

    if (pending === null) {
        return (
            <Panel>
                <Skeleton width={180} height={24} />
                <Skeleton width="60%" height={20} />
            </Panel>
        );
    }

    const fromYesterday = pending.some((d) => d.date === yesterday());

    return (
        <Panel sx={(t) => ({ boxShadow: pending.length ? `inset 3px 0 0 ${t.palette.warning.main}` : "none" })}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: pending.length ? 1.5 : 0 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                        Conciliaciones
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {pending.length === 0
                            ? "🟢 Conciliaciones al día"
                            : fromYesterday
                                ? "Tienes una conciliación pendiente de ayer."
                                : `Tienes ${plural(pending.length, "conciliación pendiente", "conciliaciones pendientes")}.`}
                    </Typography>
                </Box>
                <Button size="small" startIcon={<HistoryRounded />} onClick={() => navigate("/conciliacion")} sx={{ textTransform: "none", flexShrink: 0 }}>
                    Historial
                </Button>
            </Box>

            {pending.length > 0 && (
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                    {pending.map((d) => {
                        const meta = DAY_META[d.status];
                        return (
                            <ButtonBase
                                key={d.date}
                                onClick={() => navigate(`/conciliacion/${d.date}`)}
                                aria-label={`Conciliación del ${shortDate(d.date)}: ${meta.label}, ${dayNeeds(d)}`}
                                sx={{
                                    display: "flex", alignItems: "center", gap: 1.5, textAlign: "left", px: 1.5, py: 1, borderRadius: 2,
                                    border: "1px solid", borderColor: "divider", flex: "1 1 200px",
                                    "&:hover, &:focus-visible": { borderColor: "warning.main", bgcolor: "action.hover" },
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight="bold">{shortDate(d.date)}</Typography>
                                    <Typography variant="caption" display="block">{meta.dot} {meta.label}</Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">{dayNeeds(d)}</Typography>
                                </Box>
                                <ChevronRightRounded color="action" />
                            </ButtonBase>
                        );
                    })}
                </Stack>
            )}
        </Panel>
    );
};
