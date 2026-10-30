// src/pages/admin/MetaLandingTasks.tsx
// Etapa 5, paso 6b (2026-10-30): Meta Ads › Landings › Encargos. Todos los encargos de landing por estado: para aprobar,
// por hacer, para revisar, para publicar, en test y terminados. Por ahora las landings las hace el dueño: aquí también
// empieza, entrega y publica. Nada de esto toca Meta ni Shopify.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api } from "../../components/meta-ads/metaAds";
import { LandingTaskCard, TaskFormDialog } from "../../components/meta-ads/landingTasks";
import { EMPTY_DRAFT, LandingOption, LandingTask, PersonOption, TaskDraft, onLandingChanged } from "../../components/meta-ads/landingTasksShared";

type Data = {
    me: PersonOption; tasks: LandingTask[]; editors: PersonOption[]; products: { id: number; name: string }[]; landings: LandingOption[];
    test: Record<string, number>;
};

const SECTIONS: { title: string; help: string; statuses: LandingTask["status"][] }[] = [
    { title: "Para aprobar", help: "Al aprobarlo recibe su número L#### y su plazo.", statuses: ["proposed"] },
    { title: "Por hacer", help: "Aprobados y en producción.", statuses: ["approved", "production"] },
    { title: "Para revisar", help: "Abre la vista previa y apruébala o devuélvela con un comentario.", statuses: ["review"] },
    { title: "Para publicar", help: "Aprobados: se publican en Shopify y se toca \"Publicada\".", statuses: ["ready"] },
    { title: "En test", help: "Los mismos anuncios antes y después de publicar. Termina solo.", statuses: ["testing"] },
    { title: "Terminados", help: "Testeados y descartados de los últimos 30 días.", statuses: ["tested", "discarded"] },
];

export const LandingTasksPanel: React.FC<{ productId?: number | null }> = ({ productId }) => {
    const [data, setData] = useState<Data | null>(null);
    const [form, setForm] = useState<{ draft: TaskDraft; editing: LandingTask | null } | null>(null);

    const load = useCallback(() => {
        api<Data>("/meta/landing-tasks").then(setData).catch((e) => toast.error(e.message));
    }, []);
    useEffect(() => { load(); return onLandingChanged(load); }, [load]);

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const people = [{ id: data.me.id, name: `Yo (${data.me.name})` }, ...data.editors.filter((e) => e.id !== data.me.id)];
    const replace = (t: LandingTask) => setData((d) => d ? { ...d, tasks: d.tasks.some((x) => x.id === t.id) ? d.tasks.map((x) => (x.id === t.id ? t : x)) : [t, ...d.tasks] } : d);
    const edit = (t: LandingTask) => setForm({
        editing: t, draft: { product_id: t.product_id, landing_id: t.landing_id ?? "", kind: t.kind, angle_code: t.angle_code ?? "", observed: t.observed ?? "",
            hypothesis: t.hypothesis ?? "", change: t.change ?? "", keep: t.keep ?? "", notes: t.notes ?? "" },
    });

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    {data.editors.length === 0 ? "Todavía no hay editores de landings: los encargos quedan para ti." : `Editores de landings: ${data.editors.map((e) => e.name).join(", ")}.`}
                    {" "}Test: {data.test.landing_test_before_days} días antes contra {data.test.landing_test_min_days} a {data.test.landing_test_max_days} días después, con
                    {" "}{data.test.landing_test_min_purchases} compras y {data.test.landing_test_min_visits} visitas de cada lado; gana o pierde con {data.test.landing_test_win_pct} %.
                </Typography>
                <Button variant="contained" size="small" startIcon={<AddRounded />}
                    onClick={() => setForm({ editing: null, draft: { ...EMPTY_DRAFT, product_id: productId ?? data.products[0]?.id ?? "" } })}>Nuevo encargo</Button>
            </Stack>
            {data.tasks.length === 0 && <Alert severity="info">Todavía no hay encargos de landing. Pídelos desde cada landing con "Pedir cambio" o con "Nuevo encargo".</Alert>}
            <Stack spacing={3}>
                {SECTIONS.map((s) => {
                    const list = data.tasks.filter((t) => s.statuses.includes(t.status));
                    if (list.length === 0) return null;
                    return (
                        <Box key={s.title}>
                            <Typography variant="subtitle1" fontWeight={700}>{s.title} ({list.length})</Typography>
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>{s.help}</Typography>
                            <Stack spacing={1.5}>
                                {list.map((t) => <LandingTaskCard key={t.id} t={t} base="/meta/landing-tasks" admin people={people} onChanged={replace} onEdit={edit} />)}
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
            <TaskFormDialog open={!!form} initial={form?.draft ?? EMPTY_DRAFT} editing={form?.editing} products={data.products} landings={data.landings}
                onClose={() => setForm(null)} onSaved={replace} />
        </Box>
    );
};
