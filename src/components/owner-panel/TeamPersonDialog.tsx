// src/components/owner-panel/TeamPersonDialog.tsx
// Panel del dueño › Equipo: el detalle de una persona (o de un grupo, en las líderes) al tocar su fila. Todos sus KPIs
// como tarjetas, contra el período anterior, y lo propio de su rol: el embudo y los motivos de cancelación de una
// vendedora, cada vendedora de un grupo, o cómo le va a una agencia en cada ciudad.
import React, { FC, useEffect, useState } from "react";
import { Alert, Box, Dialog, DialogContent, DialogTitle, IconButton, LinearProgress, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Panel } from "../ui/surface/Panel";
import { MetricCard } from "./MetricCard";
import { TeamTable } from "./TeamTable";
import { BoxTitle, Empty } from "./parts";
import { CountOf, Filters, TeamPerson, TeamRow, count, fetchTeamPerson, pct } from "./ownerPanel";

/** Barras de "cuántos de cuántos": el embudo de una vendedora o las ciudades de una agencia. */
const Bars: FC<{ rows: CountOf[]; empty: string }> = ({ rows, empty }) => {
    if (rows.every((r) => r.count === 0)) return <Empty text={empty} />;
    return (
        <Stack spacing={1.25}>
            {rows.map((r) => {
                const share = r.of > 0 ? Math.round((r.count / r.of) * 1000) / 10 : null;
                return (
                    <Box key={r.label}>
                        <Stack direction="row" justifyContent="space-between" gap={1}>
                            <Typography variant="body2" fontWeight={600}>{r.label}</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                                <b>{count(r.count)}</b> <Typography component="span" variant="caption" color="text.secondary">de {count(r.of)} ({pct(share)})</Typography>
                            </Typography>
                        </Stack>
                        <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden", mt: 0.5 }}>
                            <Box sx={{ height: "100%", width: `${Math.min(100, share ?? 0)}%`, bgcolor: "primary.main", borderRadius: 4 }} />
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
};

export const TeamPersonDialog: FC<{
    row: TeamRow | null;
    role: string;
    filters: Filters;
    maturing: boolean;
    onClose: () => void;
}> = ({ row, role, filters, maturing, onClose }) => {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [data, setData] = useState<TeamPerson | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!row) return;
        let alive = true;
        setData(null);
        setError(null);
        fetchTeamPerson(filters, role, row.id)
            .then((r) => { if (alive) setData(r); })
            .catch((e) => { if (alive) setError(e.message); });
        return () => { alive = false; };
    }, [row, role, filters]);

    return (
        <Dialog open={Boolean(row)} onClose={onClose} fullScreen={mobile} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ pr: 6 }}>
                <Typography variant="h6" component="span" fontWeight={800} display="block">{row?.name}</Typography>
                <Typography variant="body2" color="text.secondary" component="span">
                    {[data?.role, row?.group].filter(Boolean).join(" · ")}
                </Typography>
                <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ px: { xs: 1.5, sm: 3 } }}>
                {error && <Alert severity="warning">{error}</Alert>}
                {!data && !error && <LinearProgress />}
                {data && (
                    <Stack spacing={2}>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: { xs: 1, sm: 1.5 } }}>
                            {data.cards.map((c) => <MetricCard key={c.key} card={c} compareLabel={data.compare_label} />)}
                        </Box>
                        {data.blocks.map((b) => (
                            <Panel key={b.title} sx={{ minWidth: 0 }}>
                                {b.type === "bars" ? (
                                    <>
                                        <BoxTitle title={b.title} subtitle={b.subtitle} help={b.help} />
                                        <Bars rows={b.rows} empty={b.empty ?? "Sin datos en este período."} />
                                    </>
                                ) : (
                                    <>
                                        <BoxTitle title={b.title} subtitle="Pasa el cursor sobre cada columna para ver cómo se calcula." help={b.help} />
                                        {b.rows.length === 0 ? <Empty text="Ninguna tuvo pedidos en este período." />
                                            : <TeamTable data={b} maturing={maturing} compareLabel={data.compare_label} />}
                                    </>
                                )}
                            </Panel>
                        ))}
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
};
