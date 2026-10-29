// src/components/dashboard/admin/AdminDashboard.tsx
// El Dashboard del Admin (Etapa 4, el dueño el 2026-10-29: "que sea muy simple"): arriba sus metas del mes, debajo lo que
// toca hoy (su calendario) y abajo su asistente. Sin saludo ni nada más: los números del día, los pendientes, las
// conciliaciones, el inventario, el equipo y los pagos por método están en "Resumen del día" (/resumen-del-dia). El
// Gerente y el Master siguen con su Dashboard de siempre (DaySummary).
import React, { FC, Suspense, lazy } from "react";
import { Box, CircularProgress, Stack } from "@mui/material";
import { GoalsStrip } from "../../owner-panel/GoalsStrip";
import { TodayBox } from "../../calendar/TodayBox";

// El chat (con sus gráficas y el texto con formato) se carga aparte: el Dashboard abre sin esperarlo
const AssistantChat = lazy(() => import("../../assistant/AssistantChat"));

export const AdminDashboard: FC = () => (
    <Stack spacing={2}>
        <GoalsStrip />
        <TodayBox />
        <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} /></Box>}>
            <AssistantChat />
        </Suspense>
    </Stack>
);
