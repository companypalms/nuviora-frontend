// src/components/dashboard/admin/AdminDashboard.tsx
// El Dashboard del Admin (Etapa 4, el dueño el 2026-10-29: "que sea muy simple"): arriba sus metas del mes, debajo lo que
// toca hoy (su calendario) y abajo su asistente. Sin saludo ni nada más: los números del día, los pendientes, las
// conciliaciones, el inventario, el equipo y los pagos por método están en "Resumen del día" (/resumen-del-dia). El
// Gerente y el Master siguen con su Dashboard de siempre (DaySummary).
import React, { FC } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router-dom";
import { GoalsStrip } from "../../owner-panel/GoalsStrip";
import { TodayBox } from "../../calendar/TodayBox";
import { Panel } from "../../ui/surface/Panel";

/** El lugar del asistente, hasta que llegue el chat (Etapa 4, paso 2). */
const AssistantSoon: FC = () => {
    const navigate = useNavigate();
    return (
        <Panel sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={1.5}>
                <AutoAwesomeRoundedIcon sx={{ color: "primary.main", display: { xs: "none", sm: "block" } }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" component="h2" fontWeight={800}>Tu asistente</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Muy pronto aquí vas a poder escribirle o hablarle para preguntar cualquier dato del negocio o pedirle cambios.
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    endIcon={<ArrowForwardRoundedIcon />}
                    onClick={() => navigate("/resumen-del-dia")}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", alignSelf: { xs: "flex-start", sm: "center" } }}
                >
                    Resumen del día
                </Button>
            </Stack>
        </Panel>
    );
};

export const AdminDashboard: FC = () => (
    <Stack spacing={2}>
        <GoalsStrip />
        <TodayBox />
        <AssistantSoon />
    </Stack>
);
