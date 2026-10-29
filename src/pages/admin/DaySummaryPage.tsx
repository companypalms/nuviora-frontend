// src/pages/admin/DaySummaryPage.tsx
// "Resumen del día" (Etapa 4): lo que estaba en el Dashboard del Admin antes de que quedara con sus metas, lo de hoy y su
// asistente. Los números de hoy, los pendientes (con asignar agencias y ciudades), las conciliaciones, el inventario, el
// equipo y los pagos por método, igual que antes (DaySummary, el mismo que ven el Gerente y el Master). Solo el Admin.
import React, { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { DaySummary } from "../../components/dashboard/admin/DaySummary";
import { DashboardStats } from "../../components/dashboard/admin/types";
import { OrderDialog } from "../../components/orders/OrderDialog";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";

export const DaySummaryPage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [orderId, setOrderId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const { status, response }: IResponse = await request("/dashboard", "GET");
            const json = status ? await response.json() : null;
            if (json?.status) setStats(json.data.stats);
            else toast.error("No se pudo cargar el resumen del día");
        } catch {
            toast.error("No se pudo cargar el resumen del día");
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1400, mx: "auto" }}>
                <DescripcionDeVista
                    title="Resumen del día"
                    description="Los números de hoy, lo que espera una acción tuya (vueltos, inventario, órdenes sin agencia o sin ciudad, validaciones), las conciliaciones, el equipo y los pagos por método."
                />
                {stats ? (
                    <DaySummary role="Admin" stats={stats} onOpenOrder={setOrderId} onChanged={load} />
                ) : (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
                )}
            </Box>
            {orderId !== null && (
                <OrderDialog
                    open
                    setOpen={(isOpen) => {
                        if (!isOpen) {
                            setOrderId(null);
                            load();
                        }
                    }}
                    id={orderId}
                />
            )}
        </Layout>
    );
};
