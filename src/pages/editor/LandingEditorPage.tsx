// src/pages/editor/LandingEditorPage.tsx
// Etapa 5, paso 6b (2026-10-30): "Mis encargos de landing" del Editor de landings. Lo suyo por estado: por hacer, en
// revisión, para publicar, en test y terminados. Empezar, entregar la vista previa de Shopify y, cuando el dueño la
// aprueba, publicarla y tocar "Publicada". Sin dinero.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api } from "../../components/meta-ads/metaAds";
import { LandingTaskCard } from "../../components/meta-ads/landingTasks";
import { LandingTask, onLandingChanged } from "../../components/meta-ads/landingTasksShared";

type Data = { me: { id: number; name: string }; tasks: LandingTask[]; pending: { todo: number; to_publish: number; to_review: number; total: number } };

const SECTIONS: { title: string; help: string; statuses: LandingTask["status"][] }[] = [
    { title: "Por hacer", help: "Prepárala en Shopify sin publicarla y entrega el enlace de vista previa.", statuses: ["approved", "production"] },
    { title: "Para publicar", help: "El dueño la aprobó: publícala en Shopify y toca \"Publicada\".", statuses: ["ready"] },
    { title: "En revisión", help: "Esperan que el dueño las revise.", statuses: ["review"] },
    { title: "En test", help: "Se comparan los mismos anuncios antes y después de publicar.", statuses: ["testing"] },
    { title: "Terminados", help: "Los de los últimos 30 días.", statuses: ["tested", "discarded"] },
];

export const LandingEditorPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);

    const load = useCallback(() => {
        api<Data>("/landing-editor/tasks").then(setData).catch((e) => toast.error(e.message));
    }, []);
    useEffect(() => {
        if (!isValid) return;
        load();
        return onLandingChanged(load);
    }, [isValid, load]);

    if (loadingSession || !isValid || !data) return <Loading />;
    const replace = (t: LandingTask) => setData((d) => d ? { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? t : x)) } : d);

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 900, mx: "auto" }}>
                <DescripcionDeVista title="Mis encargos de landing" description={'Qué cambiar en cada landing y por qué. Entrega la vista previa de Shopify; cuando el dueño la aprueba, publícala y toca "Publicada": el sistema mide si vende más con los mismos anuncios.'} />
                {data.tasks.length === 0 && <Alert severity="info">No tienes encargos de landing por ahora.</Alert>}
                <Stack spacing={3}>
                    {SECTIONS.map((s) => {
                        const list = data.tasks.filter((t) => s.statuses.includes(t.status));
                        if (list.length === 0) return null;
                        return (
                            <Box key={s.title}>
                                <Typography variant="subtitle1" fontWeight={700}>{s.title} ({list.length})</Typography>
                                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>{s.help}</Typography>
                                <Stack spacing={1.5}>
                                    {list.map((t) => <LandingTaskCard key={t.id} t={t} base="/landing-editor/tasks" admin={false} onChanged={replace} />)}
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            </Box>
        </Layout>
    );
};
