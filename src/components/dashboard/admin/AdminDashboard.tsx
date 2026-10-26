// src/components/dashboard/admin/AdminDashboard.tsx
// El dashboard del Admin, el Gerente y el Master. Arriba, los números del día. En el medio, los pendientes (con su propio
// alto) y, al lado, las conciliaciones y el inventario, que el Admin tiene que ver apenas entra, y el equipo. Abajo, los
// pagos por método. Nada crece hacia abajo sin límite: las listas largas bajan dentro de su panel.
import React, { FC } from "react";
import { Grid, Stack } from "@mui/material";
import { ConciliationWidget } from "../../reconciliation/ConciliationWidget";
import { StockAlertWidget } from "../../inventory/StockAlertWidget";
import { PaymentMethodsReport } from "../../reports/PaymentMethodsReport";
import { KpiStrip } from "./KpiStrip";
import { ActionCenter } from "./ActionCenter";
import { TeamPanel } from "./TeamPanel";
import { DashboardStats, PendingVuelto } from "./types";

export const AdminDashboard: FC<{
    role: string;
    stats: DashboardStats;
    vueltos: PendingVuelto[];
    onOpenOrder: (id: number) => void;
    onAutoAssignAgency: () => void;
    assigningAgency: boolean;
    onAutoAssignCities: () => void;
    assigningCities: boolean;
}> = ({ role, stats, vueltos, ...actions }) => {
    const isAdmin = role === "Admin";
    return (
        <Stack spacing={2}>
            <KpiStrip stats={stats} />
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <ActionCenter stats={stats} vueltos={vueltos} {...actions} />
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Stack spacing={2}>
                        {/* Conciliaciones (documento de Fran del 2026-10-06, §15 y §29) e inventario: solo el Admin */}
                        {isAdmin && <ConciliationWidget />}
                        {isAdmin && <StockAlertWidget />}
                        <TeamPanel stats={stats} />
                    </Stack>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <PaymentMethodsReport />
                </Grid>
            </Grid>
        </Stack>
    );
};
