// src/pages/round-robin/RoundRobinControl.tsx
// Fase 4: el reparto de hoy por tienda. Quién está en el roster, cuánto debería recibir según su grupo,
// sus % y su máximo, y cuánto lleva recibido.
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, IconButton, LinearProgress, Paper, Table,
    TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import {
    RefreshRounded, RestartAltRounded, CheckCircleRounded, LockClockRounded,
    StoreRounded, StarRounded, SwapHorizRounded, GroupsRounded,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { useUserStore } from "../../store/user/UserStore";
import { AssignmentOverview, OverviewShop } from "../../interfaces/assignment.types";
import { assignmentApi, pct } from "./assignmentApi";
import { BulkReassignDialog } from "./BulkReassignDialog";

const ShopCard: React.FC<{ shop: OverviewShop; onReset: (id: number) => void; resetting: boolean }> = ({ shop, onReset, resetting }) => (
    <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <StoreRounded color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>{shop.name}</Typography>
                <Chip
                    size="small"
                    label={shop.is_open ? "Abierta" : "Cerrada"}
                    color={shop.is_open ? "success" : "default"}
                    icon={shop.is_open ? <CheckCircleRounded /> : <LockClockRounded />}
                    sx={{ height: 20, fontSize: "0.65rem" }}
                />
                <Typography variant="caption" color="text.secondary">{shop.received_today} asignadas hoy</Typography>
            </Box>
            <Tooltip title="Reiniciar los turnos de esta tienda (empiezan desde cero)">
                <span>
                    <IconButton size="small" color="error" onClick={() => onReset(shop.id)} disabled={resetting}>
                        {resetting ? <CircularProgress size={14} color="error" /> : <RestartAltRounded fontSize="small" />}
                    </IconButton>
                </span>
            </Tooltip>
        </Box>

        {shop.sellers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ p: 2 }}>
                Sin vendedoras en el roster de hoy.
            </Typography>
        ) : (
            <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Vendedora</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>Debería recibir</TableCell>
                            <TableCell align="right">Recibió hoy</TableCell>
                            <TableCell align="right">Activas</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {shop.sellers.map((s) => {
                            const realShare = shop.received_today > 0 ? s.received_today / shop.received_today : 0;
                            // Si todas están en su máximo, las órdenes no esperan: se siguen repartiendo por % (Fran, 30-sep)
                            const allFull = shop.sellers.every((x) => x.at_capacity);
                            return (
                                <TableRow key={s.id} sx={{ opacity: s.at_capacity && !allFull ? 0.6 : 1 }}>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                                            {s.is_leader && <StarRounded sx={{ fontSize: 14, color: "warning.main" }} titleAccess="Líder" />}
                                            <Typography variant="body2">{s.name}</Typography>
                                            {s.group && <Chip size="small" variant="outlined" label={s.group.name} sx={{ height: 18, fontSize: "0.6rem" }} />}
                                            {s.weight != null && <Typography variant="caption" color="text.secondary">({s.weight} %)</Typography>}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {s.at_capacity && !allFull ? (
                                            <Typography variant="caption" color="error.main">En su máximo: no recibe</Typography>
                                        ) : (
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <LinearProgress variant="determinate" value={Math.min(100, s.target_share * 100)} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                                                <Typography variant="caption" sx={{ minWidth: 44, textAlign: "right" }}>{pct(s.target_share)}</Typography>
                                            </Box>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2">{s.received_today}</Typography>
                                        {shop.received_today > 0 && <Typography variant="caption" color="text.secondary">{pct(realShare)}</Typography>}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip
                                            size="small"
                                            color={s.at_capacity ? "error" : "default"}
                                            variant={s.at_capacity ? "filled" : "outlined"}
                                            label={s.max_active_orders != null ? `${s.active_orders} / ${s.max_active_orders}` : s.active_orders}
                                            sx={{ height: 20, fontSize: "0.7rem" }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Box>
        )}
    </Paper>
);

export const RoundRobinControl: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const navigate = useNavigate();
    const role = useUserStore((s) => s.user.role?.description);
    const [data, setData] = useState<AssignmentOverview | null>(null);
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState<number | "all" | null>(null);
    const [reassignOpen, setReassignOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await assignmentApi<AssignmentOverview>("/assignment/overview");
        setLoading(false);
        if (res.ok && res.data) setData(res.data);
        else toast.error(res.message);
    }, []);

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid, fetchData]);

    const reset = async (shopId: number | null) => {
        if (!shopId && !confirm("¿Reiniciar los turnos de TODAS las tiendas? El reparto sigue con los mismos %, pero empieza desde cero.")) return;
        setResetting(shopId ?? "all");
        const res = await assignmentApi("/assignment/reset", "POST", shopId ? { shop_id: shopId } : {});
        setResetting(null);
        if (res.ok) {
            toast.success(res.message ?? "Turnos reiniciados");
            fetchData();
        } else {
            toast.error(res.message);
        }
    };

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
                <DescripcionDeVista
                    title="Reparto de órdenes"
                    description="Cómo se están repartiendo hoy las órdenes nuevas en cada tienda"
                />
                <Box display="flex" gap={1} flexWrap="wrap">
                    {(role === "Admin" || role === "Master") && (
                        <Button variant="outlined" size="small" startIcon={<GroupsRounded />} onClick={() => navigate("/grupos-de-venta")}>
                            Grupos y %
                        </Button>
                    )}
                    <Button variant="contained" size="small" startIcon={<SwapHorizRounded />} onClick={() => setReassignOpen(true)} disabled={!data}>
                        Reasignar en bloque
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<RefreshRounded />} onClick={fetchData} disabled={loading}>
                        Actualizar
                    </Button>
                    <Button variant="outlined" color="error" size="small" startIcon={<RestartAltRounded />} onClick={() => reset(null)} disabled={loading || resetting !== null}>
                        Reiniciar todo
                    </Button>
                </Box>
            </Box>

            {data?.load_balanced && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    Está activa la estrategia antigua "Load Balanced": los grupos, los % y los máximos no se aplican.
                </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body2">
                    Cada tienda reparte sus órdenes entre las vendedoras de su roster de hoy. Lo que <strong>debería recibir</strong> cada una sale de su grupo y sus % (en Grupos de venta), contando solo a las disponibles. Quien llega a su máximo de órdenes activas deja de recibir hasta liberar cupo, y al volver no recibe órdenes de más para compensar. Si todas llegan a su máximo, las órdenes no esperan: se reparten en partes iguales, sin mirar el %. Sin grupos ni %, el reparto es parejo.
                </Typography>
            </Alert>

            {loading && !data ? (
                <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                    {data?.shops.map((shop) => (
                        <ShopCard key={shop.id} shop={shop} onReset={(id) => reset(id)} resetting={resetting === shop.id || resetting === "all"} />
                    ))}
                    {data?.shops.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1/-1", textAlign: "center", py: 8 }}>
                            No hay tiendas configuradas
                        </Typography>
                    )}
                </Box>
            )}

            <BulkReassignDialog
                open={reassignOpen}
                sellers={data?.sellers ?? []}
                onClose={() => setReassignOpen(false)}
                onDone={() => { setReassignOpen(false); fetchData(); }}
            />
        </Layout>
    );
};
