// src/components/delivery-tariffs/RoutesTab.tsx
// Las carreras calculadas (Módulo 3, §15, §42): orden, almacén, distancia por carretera, rango, versión del tarifario y
// costo esperado. Las que no se pudieron calcular dicen por qué y se pueden reintentar. Las que pasan el límite de km de
// su agencia (Fran, 2026-10-12: 25 km) quedan por revisar hasta que el Admin las aprueba. Solo administración (§14).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, FormControlLabel, Link, MenuItem, Pagination, Stack, Switch, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { RefreshRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Panel } from "../ui/surface/Panel";
import { AgencyWithWarehouses, RoutesResponse, api, day, km, money, routeStatusColor } from "./deliveryTariffs";

const REASON_LABEL: Record<string, string> = {
    asignacion: "Asignación", cambio_agencia: "Cambio de agencia", cambio_almacen: "Cambio de almacén", cambio_ubicacion: "Cambio de ubicación",
    almacen_coordenadas: "Coordenadas del almacén", recalculo: "Recálculo", carga_inicial: "Carga inicial", carrera: "Al salir a reparto",
};

export const RoutesTab: React.FC = () => {
    const [data, setData] = useState<RoutesResponse | null>(null);
    const [agencies, setAgencies] = useState<AgencyWithWarehouses[]>([]);
    const [filters, setFilters] = useState({ status: "", agency_id: "", search: "", all: false, page: 1 });
    const [busy, setBusy] = useState<number | null>(null);

    const load = useCallback(() => {
        const q = new URLSearchParams();
        if (filters.status) q.set("status", filters.status);
        if (filters.agency_id) q.set("agency_id", filters.agency_id);
        if (filters.search.trim()) q.set("search", filters.search.trim());
        if (filters.all) q.set("all", "1");
        q.set("page", String(filters.page));
        api<RoutesResponse>(`/delivery/routes?${q}`).then(setData).catch((e) => toast.error(e.message));
    }, [filters]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { api<{ agencies: AgencyWithWarehouses[] }>("/delivery/warehouses").then((r) => setAgencies(r.agencies)).catch(() => undefined); }, []);

    const retry = async (id: number) => {
        setBusy(id);
        try {
            const r = await api<{ message: string }>(`/delivery/routes/${id}/retry`, "POST");
            toast.success(r.message);
            load();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
    };

    // Fran (2026-10-12): una carrera de más km que el límite de su agencia se revisa antes de pagarla
    const approveDistance = async (id: number) => {
        setBusy(id);
        try {
            const r = await api<{ message: string }>(`/delivery/routes/${id}/approve-distance`, "POST");
            toast.success(r.message);
            load();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
    };

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const set = (patch: Partial<typeof filters>) => setFilters({ ...filters, page: 1, ...patch });

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Al pasar una orden a la agencia se calcula la distancia por carretera desde su almacén (Google Routes) y el costo esperado con su tarifario.
                Si cambian la agencia, el almacén o la ubicación del cliente, se vuelve a calcular. Un cambio de tarifario no cambia lo ya calculado.
            </Typography>
            {!data.google_configured && <Alert severity="warning">Falta la clave de Google Routes en el servidor: las carreras quedan en "Error de ruta" hasta cargarla, y entonces se reintentan solas.</Alert>}

            <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip label={`Todas (${Object.values(data.counts).reduce((a, b) => a + b, 0)})`} color={filters.status === "" ? "primary" : "default"} onClick={() => set({ status: "" })} />
                {Object.entries(data.labels).filter(([k]) => data.counts[k]).map(([k, label]) => (
                    <Chip key={k} label={`${label} (${data.counts[k]})`} color={filters.status === k ? "primary" : "default"} onClick={() => set({ status: k })} />
                ))}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
                <TextField size="small" label="Orden" value={filters.search} onChange={(e) => set({ search: e.target.value })} sx={{ width: { sm: 160 } }} />
                <TextField select size="small" label="Agencia" value={filters.agency_id} onChange={(e) => set({ agency_id: e.target.value })} sx={{ minWidth: 170 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {agencies.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}
                </TextField>
                <FormControlLabel control={<Switch checked={filters.all} onChange={(e) => set({ all: e.target.checked })} />} label="Incluir las reemplazadas" />
            </Stack>

            <Panel sx={{ p: 0, overflow: "hidden" }}>
                {data.routes.length === 0 ? <Typography sx={{ p: 2 }}>No hay carreras con estos filtros.</Typography> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Orden</TableCell><TableCell>Agencia / almacén</TableCell><TableCell align="right">Distancia</TableCell>
                                    <TableCell>Rango</TableCell><TableCell align="right">Costo esperado</TableCell><TableCell>Estado</TableCell><TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.routes.map((r) => (
                                    <TableRow key={r.id} sx={{ opacity: r.is_active ? 1 : 0.6 }}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{r.order ?? `#${r.order_id}`}</Typography>
                                            <Typography variant="caption" color="text.secondary">{r.order_status} · {REASON_LABEL[r.reason] ?? r.reason}{r.trips ? ` · ${r.trips} ${r.trips === 1 ? "carrera" : "carreras"}` : ""}</Typography>
                                            {r.review_note && <Typography variant="caption" color="info.main" sx={{ display: "block" }}>{r.review_note}</Typography>}
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 150 }}>
                                            <Typography variant="body2">{r.agency ?? "—"}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{r.warehouse ?? "sin almacén"}</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                            {km(r.distance_km)}
                                            {r.maps_url && <Link href={r.maps_url} target="_blank" rel="noreferrer" variant="caption" sx={{ display: "block" }}>ubicación</Link>}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{r.range ?? "—"}</Typography>
                                            {r.tariff_version && <Typography variant="caption" color="text.secondary">Versión {r.tariff_version} · {day(r.tariff_date)}</Typography>}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}><Typography variant="body2" fontWeight={600}>{money(r.expected_cost)}</Typography></TableCell>
                                        <TableCell>
                                            <Tooltip title={r.error ?? ""} disableHoverListener={!r.error}>
                                                <Chip size="small" color={routeStatusColor(r.status)} label={r.status_label + (r.status === "error" && r.attempts ? ` (${r.attempts})` : "")} />
                                            </Tooltip>
                                            {!r.is_active && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>reemplazada</Typography>}
                                            {r.status === "distance_review" && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 220 }}>
                                                    Pasa el límite de km de la agencia. No cuenta en el cierre hasta aprobarla o corregir la ubicación.
                                                </Typography>
                                            )}
                                            {r.distance_approved_at && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>distancia aprobada</Typography>}
                                        </TableCell>
                                        <TableCell align="right">
                                            {r.status === "distance_review" && (
                                                <Button size="small" disabled={busy === r.id} onClick={() => approveDistance(r.id)}>Aprobar distancia</Button>
                                            )}
                                            {(r.status === "error" || (r.is_active && r.status === "pending")) && (
                                                <Button size="small" startIcon={<RefreshRounded />} disabled={busy === r.id} onClick={() => retry(r.id)}>Reintentar</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Panel>
            {data.last_page > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Pagination count={data.last_page} page={data.page} onChange={(_, p) => setFilters({ ...filters, page: p })} />
                </Box>
            )}
        </Stack>
    );
};
