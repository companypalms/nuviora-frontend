// src/pages/admin/Replenishment.tsx
// Reabastecimiento (Módulo 5 de Fran: inventario inteligente, forecasting, compras y transferencias). Solo Admin/propietario
// (§3); el backend tampoco le entrega nada de esto a otro rol. Entrega 2: la configuración del plan (§128), los
// proveedores por producto (§17–20), las rutas (§60–65) y la auditoría (§95). Entrega 3: el plan ("Generar plan").
// Entrega 4: aprobarlo, el PDF del chofer y la precisión de los planes que ya terminaron (§97–§105).
import React, { useCallback, useEffect, useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, errorMessage } from "../../components/finance/finance";
import { ReplConfig } from "../../components/replenishment/replenishment";
import { ProductsPanel, SettingsPanel } from "../../components/replenishment/ConfigPanels";
import { AuditPanel, RoutesPanel, SupplierProductsPanel } from "../../components/replenishment/SupplyPanels";
import { PlanPanel } from "../../components/replenishment/PlanPanel";
import { AccuracyPanel } from "../../components/replenishment/AccuracyPanel";

const TABS = [
    { key: "plan", label: "Plan" },
    { key: "accuracy", label: "Precisión" },
    { key: "settings", label: "Configuración" },
    { key: "products", label: "Productos" },
    { key: "suppliers", label: "Proveedores" },
    { key: "routes", label: "Rutas" },
    { key: "audit", label: "Auditoría" },
];

export const Replenishment: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "plan";
    const [data, setData] = useState<ReplConfig | null>(null);
    const load = useCallback(() => { api<ReplConfig>("/finance/replenishment/config").then(setData).catch((e) => toast.error(errorMessage(e))); }, []);
    useEffect(() => { load(); }, [load]);

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1200, mx: "auto" }}>
                <DescripcionDeVista title="Reabastecimiento"
                    description="El plan de inventario: qué comprar, qué trasladar y cuánto capital hace falta. Aquí se configura lo que usa para calcular. Solo administración." />
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", my: 2 }}>
                    <Tabs value={tab} onChange={(_, v) => setParams({ tab: v })} variant="scrollable" allowScrollButtonsMobile>
                        {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
                    </Tabs>
                </Paper>
                {tab === "audit" ? <AuditPanel /> : tab === "accuracy" ? <AccuracyPanel /> : !data ? <Typography color="text.secondary" sx={{ p: 2 }}>Cargando…</Typography> : (
                    <>
                        {tab === "plan" && <PlanPanel config={data} />}
                        {tab === "settings" && <SettingsPanel data={data} onSaved={load} />}
                        {tab === "products" && <ProductsPanel data={data} onSaved={load} />}
                        {tab === "suppliers" && <SupplierProductsPanel data={data} onSaved={load} />}
                        {tab === "routes" && <RoutesPanel data={data} onSaved={load} />}
                    </>
                )}
            </Box>
        </Layout>
    );
};
