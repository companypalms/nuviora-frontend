// src/components/dashboard/admin/DaySummary.tsx
// El resumen del día: los números de hoy, los pendientes (con asignar agencias y ciudades), las conciliaciones, el
// inventario, el equipo y los pagos por método. Lo ven el Gerente y el Master en su Dashboard, y el Admin en "Resumen
// del día" (Etapa 4: su Dashboard quedó con sus metas, lo de hoy y su asistente). Recibe los números de GET /dashboard;
// los vueltos y los botones de asignar los maneja aquí. Nada crece hacia abajo sin límite: las listas largas bajan dentro
// de su panel.
import React, { FC, useEffect, useState } from "react";
import { Grid, Stack } from "@mui/material";
import { toast } from "react-toastify";
import { request } from "../../../common/request";
import { IResponse } from "../../../interfaces/response-type";
import { ConciliationWidget } from "../../reconciliation/ConciliationWidget";
import { StockAlertWidget } from "../../inventory/StockAlertWidget";
import { PaymentMethodsReport } from "../../reports/PaymentMethodsReport";
import { KpiStrip } from "./KpiStrip";
import { ActionCenter } from "./ActionCenter";
import { TeamPanel } from "./TeamPanel";
import { DashboardStats, PendingVuelto } from "./types";

/** Un botón de asignar: llama al servidor, avisa el resultado y pide los números de nuevo. */
const useAssign = (url: string, failure: string, onDone: () => void) => {
    const [busy, setBusy] = useState(false);
    const run = async () => {
        setBusy(true);
        try {
            const { status, response }: IResponse = await request(url, "POST");
            if (status) {
                const result = await response.json();
                toast.success(result.message);
                onDone();
            } else {
                toast.error(failure);
            }
        } catch {
            toast.error("Error en el servidor");
        } finally {
            setBusy(false);
        }
    };
    return { busy, run };
};

export const DaySummary: FC<{
    role: string;
    stats: DashboardStats;
    onOpenOrder: (id: number) => void;
    /** Vuelve a pedir los números (después de asignar). */
    onChanged: () => void;
}> = ({ role, stats, onOpenOrder, onChanged }) => {
    const isAdmin = role === "Admin";
    const withVueltos = ["Admin", "Gerente"].includes(role);
    const [vueltos, setVueltos] = useState<PendingVuelto[]>([]);
    const [vueltosLoaded, setVueltosLoaded] = useState(!withVueltos);
    const agency = useAssign("/orders/auto-assign-logistics", "Error al auto-asignar logística", onChanged);
    const cities = useAssign("/orders/auto-assign-cities", "Error al asignar ciudades", onChanged);

    // Los vueltos por pagar (Admin y Gerente), de nuevo cada vez que llegan los números
    useEffect(() => {
        if (!withVueltos) return;
        let alive = true;
        request("/orders/pending-vueltos", "GET")
            .then(async ({ status, response }: IResponse) => {
                const json = status ? await response.json() : null;
                if (alive && json?.status) setVueltos(json.orders);
            })
            .catch((e) => console.error(e))
            .finally(() => { if (alive) setVueltosLoaded(true); });
        return () => { alive = false; };
    }, [withVueltos, stats]);

    return (
        <Stack spacing={2}>
            <KpiStrip stats={stats} />
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    {/* Se arma de nuevo cuando llegan los vueltos, para abrir en la primera pestaña con algo, como antes */}
                    <ActionCenter
                        key={vueltosLoaded ? "ready" : "loading"}
                        stats={stats}
                        vueltos={vueltos}
                        onOpenOrder={onOpenOrder}
                        onAutoAssignAgency={agency.run}
                        assigningAgency={agency.busy}
                        onAutoAssignCities={cities.run}
                        assigningCities={cities.busy}
                    />
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
