// src/pages/logistics/ControlTower.tsx
// Logística propia (documento de Fran del 2026-10-21; piloto en Carabobo): la torre de control del operador (§21), los
// riders del centro (§21.2) y, para el Admin, la configuración (§23). El operador entra directo aquí al iniciar sesión.
import React, { useCallback, useEffect, useState } from "react";
import { Box, MenuItem, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { useUserStore } from "../../store/user/UserStore";
import { api, CenterBoard, errorMessage } from "../../components/logistics/logistics";
import { TowerPanel } from "../../components/logistics/TowerPanel";
import { RidersPanel } from "../../components/logistics/RidersPanel";
import { PayoutsPanel } from "../../components/logistics/PayoutsPanel";
import { CalendarPanel } from "../../components/logistics/CalendarPanel";
import { AdminConfig } from "../../components/logistics/AdminConfig";
import { MetricsPanel } from "../../components/logistics/MetricsPanel";
import { AdjustmentsPanel } from "../../components/logistics/AdjustmentsPanel";

export const ControlTower: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const role = useUserStore((s) => s.user.role?.description);
    const isAdmin = role === "Admin" || role === "Master";
    const [params, setParams] = useSearchParams();
    const [centers, setCenters] = useState<CenterBoard[] | null>(null);

    const tabs = [{ key: "torre", label: "Torre de control" }, { key: "riders", label: "Riders" }, { key: "pagos", label: "Pagos" },
        { key: "calendario", label: "Calendario" }, { key: "ajustes", label: "Ajustes de stock" },
        ...(isAdmin ? [{ key: "metricas", label: "Métricas" }, { key: "config", label: "Configuración" }] : [])];
    const tab = tabs.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "torre";
    const centerId = Number(params.get("centro")) || centers?.[0]?.id || null;
    const set = (patch: Record<string, string>) => setParams({ tab, ...(centerId ? { centro: String(centerId) } : {}), ...patch });

    const loadCenters = useCallback((selectId?: number) => {
        api<{ centers: CenterBoard[] }>("/logistics/my-centers")
            .then((r) => {
                setCenters(r.centers);
                if (selectId) setParams((p) => { p.set("centro", String(selectId)); return p; });
            })
            .catch((e) => toast.error(errorMessage(e)));
    }, [setParams]);
    useEffect(() => { loadCenters(); }, [loadCenters]);

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1400, mx: "auto" }}>
                <DescripcionDeVista title="Logística propia"
                    description="El centro de despacho: las órdenes que buscan rider, lo que hay que preparar y despachar, las novedades y los riders. Lo más urgente va arriba." />
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", my: 2, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                    <Tabs value={tab} onChange={(_, v) => set({ tab: v })} variant="scrollable" allowScrollButtonsMobile sx={{ flex: 1 }}>
                        {tabs.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
                    </Tabs>
                    {centers && centers.length > 1 && (
                        <TextField select size="small" label="Centro" value={String(centerId)} onChange={(e) => set({ centro: e.target.value })} sx={{ m: 1, minWidth: 200 }}>
                            {centers.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}{c.city ? ` · ${c.city}` : ""}</MenuItem>)}
                        </TextField>
                    )}
                </Paper>
                {!centers ? <Typography color="text.secondary" sx={{ p: 2 }}>Cargando…</Typography>
                    : tab === "config" && isAdmin ? <AdminConfig centerId={centerId} onCentersChanged={loadCenters} />
                    : !centerId ? (
                        <Typography color="text.secondary" sx={{ p: 2 }}>
                            {isAdmin ? "Todavía no hay centros: créalo en la pestaña Configuración." : "No eres operador de ningún centro. Pídele al Admin que te agregue."}
                        </Typography>
                    )
                    : tab === "riders" ? <RidersPanel key={centerId} centerId={centerId} />
                    : tab === "pagos" ? <PayoutsPanel key={centerId} centerId={centerId} />
                    : tab === "calendario" ? <CalendarPanel key={centerId} centerId={centerId} isAdmin={isAdmin} />
                    : tab === "metricas" && isAdmin ? <MetricsPanel key={centerId} centerId={centerId} />
                    : tab === "ajustes" ? <AdjustmentsPanel key={centerId} centerId={centerId} isAdmin={isAdmin} />
                    : <TowerPanel key={centerId} centerId={centerId} isAdmin={isAdmin} />}
            </Box>
        </Layout>
    );
};
