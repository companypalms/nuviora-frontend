// src/pages/admin/MetaAdsSettings.tsx
// Configuración → Meta Ads (documento de Fran del 2026-10-08, Módulo 2, §3): conexiones y cuentas (§3 a §6, §55,
// §56), clasificación de campañas (§11 a §13), objetivos por producto (§34) y reglas (§37 a §40). Solo el Admin (§44).
// Etapa 5, paso 1b: los ángulos de cada producto y el modo del producto (normal, liquidación, pausado, abandonado).
import React from "react";
import { Box, Button, Paper, Stack, Tab, Tabs } from "@mui/material";
import { InsightsRounded } from "@mui/icons-material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { PageLayout } from "../../components/ui/SectionTabsPage";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { MetaConnections } from "../../components/meta-ads/MetaConnections";
import { MetaCampaignsTab, MetaRulesTab, MetaTargetsTab } from "../../components/meta-ads/MetaSetupTabs";
import { MetaAnglesTab, MetaProductModes } from "../../components/meta-ads/MetaAnglesTab";
import { MetaDecisionSettings } from "../../components/meta-ads/MetaDecisionWidgets";

const TABS = [
    { key: "connections", label: "Conexiones" },
    { key: "campaigns", label: "Campañas" },
    { key: "angles", label: "Ángulos" },
    { key: "targets", label: "Productos y objetivos" },
    { key: "rules", label: "Reglas" },
];

export const MetaAdsSettings: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { loadingSession, isValid } = useValidateSession();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "connections";

    if (loadingSession || !isValid) return <Loading />;

    return (
        <PageLayout isEmbedded={isEmbedded}>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: "auto" }}>
                <DescripcionDeVista title="Meta Ads" description="Conexiones con Meta, cuentas que se sincronizan, campañas por clasificar, objetivos y reglas. Solo lectura: nada de esto modifica Meta Ads." />
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                    <Button size="small" startIcon={<InsightsRounded />} component={RouterLink} to="/meta-ads">Ver métricas</Button>
                </Box>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mb: 2 }}>
                    {/* Cambia solo ?tab=: dentro de Integraciones, ?seccion= dice en qué pestaña de arriba está */}
                    <Tabs value={tab} onChange={(_, v) => setParams((p) => { p.set("tab", v); return p; })} variant="scrollable" allowScrollButtonsMobile>
                        {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
                    </Tabs>
                </Paper>
                {tab === "connections" && <MetaConnections />}
                {tab === "campaigns" && <MetaCampaignsTab />}
                {tab === "angles" && <MetaAnglesTab />}
                {tab === "targets" && <Stack spacing={3}><MetaProductModes /><MetaTargetsTab /></Stack>}
                {tab === "rules" && <Stack spacing={3}><MetaDecisionSettings /><MetaRulesTab /></Stack>}
            </Box>
        </PageLayout>
    );
};
