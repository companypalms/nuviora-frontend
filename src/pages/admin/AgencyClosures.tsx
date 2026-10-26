// src/pages/admin/AgencyClosures.tsx
// Dinero → Cierres de agencias (documento de Fran del 2026-10-09, Módulo 3, §20 a §37): los cierres semanales con lo
// que el sistema calculó y lo que cobra cada agencia, y su configuración (aviso, tolerancia y columnas del archivo).
// Solo el Admin: el backend no le entrega nada de esto a una agencia (§38).
import React from "react";
import { Box, Paper, Tab, Tabs } from "@mui/material";
import { useParams, useSearchParams } from "react-router-dom";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { ClosuresListTab } from "../../components/agency-closures/ClosuresListTab";
import { ClosureSettingsTab } from "../../components/agency-closures/ClosureSettingsTab";
import { ClosureDetailView } from "../../components/agency-closures/ClosureDetailView";

const TABS = [
    { key: "closures", label: "Cierres" },
    { key: "settings", label: "Configuración" },
];

export const AgencyClosures: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const { id } = useParams();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "closures";

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1200, mx: "auto" }}>
                {id ? <ClosureDetailView id={Number(id)} /> : (
                    <>
                        <DescripcionDeVista title="Cierres de agencias" description="Lo que cobra cada agencia por semana contra lo que calculó el sistema. Solo ves lo que no cuadra; la agencia no ve nada de esto." />
                        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", my: 2 }}>
                            <Tabs value={tab} onChange={(_, v) => setParams({ tab: v })} variant="scrollable" allowScrollButtonsMobile>
                                {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
                            </Tabs>
                        </Paper>
                        {tab === "closures" && <ClosuresListTab />}
                        {tab === "settings" && <ClosureSettingsTab />}
                    </>
                )}
            </Box>
        </Layout>
    );
};
