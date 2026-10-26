// src/pages/admin/MetaAdsSettings.tsx
// Configuración → Meta Ads (documento de Fran del 2026-10-08, Módulo 2, §3): conexiones y cuentas (§3 a §6, §55,
// §56), clasificación de campañas (§11 a §13), objetivos por producto (§34) y reglas (§37 a §40). Solo el Admin (§44).
import React from "react";
import { Box, Button, Paper, Tab, Tabs } from "@mui/material";
import { InsightsRounded } from "@mui/icons-material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { MetaConnections } from "../../components/meta-ads/MetaConnections";
import { MetaCampaignsTab, MetaRulesTab, MetaTargetsTab } from "../../components/meta-ads/MetaSetupTabs";

const TABS = [
    { key: "connections", label: "Conexiones" },
    { key: "campaigns", label: "Campañas" },
    { key: "targets", label: "Objetivos por producto" },
    { key: "rules", label: "Reglas" },
];

export const MetaAdsSettings: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "connections";

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: "auto" }}>
                <DescripcionDeVista title="Meta Ads" description="Conexiones con Meta, cuentas que se sincronizan, campañas por clasificar, objetivos y reglas. Solo lectura: nada de esto modifica Meta Ads." />
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                    <Button size="small" startIcon={<InsightsRounded />} component={RouterLink} to="/meta-ads">Ver métricas</Button>
                </Box>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mb: 2 }}>
                    <Tabs value={tab} onChange={(_, v) => setParams({ tab: v })} variant="scrollable" allowScrollButtonsMobile>
                        {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
                    </Tabs>
                </Paper>
                {tab === "connections" && <MetaConnections />}
                {tab === "campaigns" && <MetaCampaignsTab />}
                {tab === "targets" && <MetaTargetsTab />}
                {tab === "rules" && <MetaRulesTab />}
            </Box>
        </Layout>
    );
};
