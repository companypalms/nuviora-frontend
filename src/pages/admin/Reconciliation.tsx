// src/pages/admin/Reconciliation.tsx
// Historial de conciliaciones (documento de Fran del 2026-10-06, §27): "Octubre 2026 · 4 OCT — Completada · 6 OCT —
// 1 incidencia · 7 OCT — Pendiente". Arriba, las pendientes (§14: no desaparecen hasta completarse). Solo el
// Administrador (§29).
import React, { useCallback, useEffect, useState } from "react";
import { Box, ButtonBase, Chip, IconButton, Paper, Stack, Typography } from "@mui/material";
import { ChevronLeftRounded, ChevronRightRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { request } from "../../common/request";
import { useValidateSession } from "../../hooks/useValidateSession";

import { DAY_META, DayCard, dayNeeds, monthTitle, shortDate } from "../../components/reconciliation/reconciliation";

const shiftMonth = (ym: string, delta: number) => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const DayRow: React.FC<{ day: DayCard }> = ({ day }) => {
    const navigate = useNavigate();
    const meta = DAY_META[day.status];
    return (
        <ButtonBase
            onClick={() => navigate(`/conciliacion/${day.date}`)}
            sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap", columnGap: 2, rowGap: 0.5, width: "100%", textAlign: "left", px: 2, py: 1.25, borderRadius: 2, "&:hover, &:focus-visible": { bgcolor: "action.hover" } }}
        >
            <Typography fontWeight="bold" sx={{ width: 64, flexShrink: 0 }}>{shortDate(day.date)}</Typography>
            <Chip size="small" color={meta.color} label={`${meta.dot} ${day.status === "completed" ? meta.label : dayNeeds(day)}`} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: { xs: 0, sm: "auto" }, width: { xs: "100%", sm: "auto" } }}>{day.resolved}/{day.payments} pagos resueltos</Typography>
        </ButtonBase>
    );
};

export const Reconciliation: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [data, setData] = useState<{ pending: DayCard[]; days: DayCard[] } | null>(null);

    const load = useCallback(async () => {
        try {
            const { status, response } = await request(`/reconciliations?month=${month}`, "GET");
            if (status === 200) setData(await response.json());
            else toast.error("No se pudieron cargar las conciliaciones");
        } catch {
            toast.error("Error de conexión");
        }
    }, [month]);

    useEffect(() => {
        if (isValid) load();
    }, [isValid, load]);

    if (loadingSession || !isValid || !data) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: 2, maxWidth: 900, mx: "auto" }}>
                <DescripcionDeVista
                    title="Conciliaciones"
                    description="Cada día se comprueba que los pagos digitales registrados llegaron a las cuentas, con el extracto de cada banco o plataforma."
                />

                <Typography variant="h6" component="h2" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Pendientes</Typography>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 0.5 }}>
                    {data.pending.length === 0 ? (
                        <Typography sx={{ p: 1.5 }}>🟢 Conciliaciones al día</Typography>
                    ) : (
                        data.pending.map((d) => <DayRow key={d.date} day={d} />)
                    )}
                </Paper>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 3, mb: 1 }}>
                    <IconButton aria-label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeftRounded /></IconButton>
                    <Typography variant="h6" component="h2" fontWeight="bold">{monthTitle(month)}</Typography>
                    <IconButton aria-label="Mes siguiente" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRightRounded /></IconButton>
                </Stack>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 0.5 }}>
                    {data.days.length === 0 ? (
                        <Typography color="text.secondary" sx={{ p: 1.5 }}>No hay conciliaciones en este mes.</Typography>
                    ) : (
                        data.days.map((d) => <DayRow key={d.date} day={d} />)
                    )}
                </Paper>
            </Box>
        </Layout>
    );
};
