// src/pages/admin/DeliveryTariffs.tsx
// Configuración → Tarifas de delivery (documento de Fran del 2026-10-09, Módulo 3): almacenes de las agencias con sus
// coordenadas (§5, §6), tarifarios con versiones (§10 a §13) y el costo esperado de cada carrera (§15, §42).
// Solo el Admin: el backend no le entrega nada de esto a una agencia (§14).
import React from "react";
import { Box, Paper, Tab, Tabs } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { WarehousesTab } from "../../components/delivery-tariffs/WarehousesTab";
import { TariffsTab } from "../../components/delivery-tariffs/TariffsTab";
import { RoutesTab } from "../../components/delivery-tariffs/RoutesTab";

const TABS = [
    { key: "routes", label: "Carreras" },
    { key: "tariffs", label: "Tarifarios" },
    { key: "warehouses", label: "Almacenes" },
];

export const DeliveryTariffs: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "routes";

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1200, mx: "auto" }}>
                <DescripcionDeVista title="Tarifas de delivery" description="Cuánto debería costar cada carrera según la distancia por carretera y el tarifario de la agencia. Solo administración: las agencias no ven nada de esto." />
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", my: 2 }}>
                    <Tabs value={tab} onChange={(_, v) => setParams({ tab: v })} variant="scrollable" allowScrollButtonsMobile>
                        {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
                    </Tabs>
                </Paper>
                {tab === "routes" && <RoutesTab />}
                {tab === "tariffs" && <TariffsTab />}
                {tab === "warehouses" && <WarehousesTab />}
            </Box>
        </Layout>
    );
};
