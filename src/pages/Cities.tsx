import React, { useCallback, useEffect, useState } from "react";
import { Layout } from "../components/ui/Layout";
import { DescripcionDeVista } from "../components/ui/content/DescripcionDeVista";
import { Loading } from "../components/ui/content/Loading";
import { useValidateSession } from "../hooks/useValidateSession";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import {
    Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    Grid, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import {
    Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, PersonAdd as PersonAddIcon,
    Tune as TuneIcon, SwapHoriz as SwapHorizIcon, PowerSettingsNew as PowerIcon
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { AddUserDialog } from "../components/users/AddUserDialog";
import { fmtMoney } from "../lib/money";
import { AgencyRouting, RoutingAgency, RoutingCity, WorkingFields, WorkingHoursFields } from "../interfaces/agencyRouting.types";
import { routingApi } from "../components/agencies/agencyApi";
import { CityAgenciesDialog } from "../components/agencies/CityAgenciesDialog";
import { AgencySettingsDialog } from "../components/agencies/AgencySettingsDialog";
import { AgencyReassignDialog } from "../components/agencies/AgencyReassignDialog";
import { WorkingHoursDialog } from "../components/agencies/WorkingHoursDialog";

/** "de 08:00 a 17:00", "hasta las 17:00"…; null si trabaja todo el día. */
const hoursLabel = (h: Pick<WorkingHoursFields, 'works_from' | 'works_until'>) => {
    if (h.works_from && h.works_until) return `de ${h.works_from} a ${h.works_until}`;
    if (h.works_until) return `hasta las ${h.works_until}`;
    if (h.works_from) return `desde las ${h.works_from}`;
    return null;
};

/**
 * Si trabaja ahora, apagada o fuera de horario (Fran, 2026-10-17). El horario es solo de la agencia. Con onClick, se
 * puede cambiar.
 */
const WorkingChip = ({ h, onClick }: { h: WorkingFields & Partial<Pick<WorkingHoursFields, 'works_from' | 'works_until'>>; onClick?: () => void }) => {
    const hasHours = 'works_from' in h;
    const hours = hasHours ? hoursLabel({ works_from: h.works_from ?? null, works_until: h.works_until ?? null }) : null;
    const [label, color] = !h.is_working ? ['Apagada', 'error'] as const
        : h.stop_reason ? ['No trabaja ahora', 'warning'] as const
        : ['Trabajando', 'success'] as const;
    const tip = [h.stop_reason ? `${h.stop_reason.charAt(0).toUpperCase()}${h.stop_reason.slice(1)}.` : null,
        hasHours ? `Horario: ${hours ?? 'todo el día'}.` : null, onClick ? 'Toca para cambiar.' : null].filter(Boolean).join(' ');

    return (
        <Tooltip title={tip}>
            <Chip size="small" color={color} variant={h.is_working && !h.stop_reason ? 'outlined' : 'filled'}
                icon={<PowerIcon fontSize="small" />} label={hours ? `${label} · ${hours}` : label}
                onClick={onClick} sx={{ fontWeight: 600 }} />
        </Tooltip>
    );
};

/**
 * Ciudades y agencias (tareas 3c, 6 y 8): qué agencias entregan en cada ciudad y con qué %, la tarifa
 * y el máximo de cada agencia, y pasar las órdenes de una agencia a las demás.
 */
export const Cities = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [routing, setRouting] = useState<AgencyRouting | null>(null);
    const [loading, setLoading] = useState(true);
    const [openAdd, setOpenAdd] = useState(false);
    const [openAddAgency, setOpenAddAgency] = useState(false);
    const [editingCity, setEditingCity] = useState<RoutingCity | null>(null);
    const [cityAgencies, setCityAgencies] = useState<RoutingCity | null>(null);
    const [agencySettings, setAgencySettings] = useState<RoutingAgency | null>(null);
    const [reassign, setReassign] = useState<RoutingAgency | null>(null);
    const [hoursTarget, setHoursTarget] = useState<React.ComponentProps<typeof WorkingHoursDialog>['target']>(null);

    const role = user.role?.description || '';
    const canEdit = ['Admin', 'Master'].includes(role);
    const canReassign = ['Admin', 'Gerente', 'Master'].includes(role);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await routingApi('');
        if (res.ok) setRouting(res.data);
        else toast.error("Error al cargar ciudades y agencias");
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid, fetchData]);

    const handleSaveCity = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target as HTMLFormElement).entries());
        const url = editingCity ? `/cities/${editingCity.id}` : "/cities";
        const { status, response }: IResponse = await request(url, editingCity ? "PUT" : "POST", data);
        if (status && response.ok) {
            toast.success(editingCity ? "Ciudad actualizada" : "Ciudad creada");
            setOpenAdd(false);
            setEditingCity(null);
            fetchData();
        } else {
            const err = await response.json().catch(() => ({}));
            toast.error(err.message || "Error al guardar");
        }
    };

    const handleDeleteCity = async (id: number) => {
        if (!confirm("¿Eliminar esta ciudad?")) return;
        const { status, response }: IResponse = await request(`/cities/${id}`, "DELETE");
        if (status && response.ok) {
            toast.success("Ciudad eliminada");
            fetchData();
        } else {
            toast.error("Error al eliminar");
        }
    };

    if (loadingSession || (loading && !routing)) return <Loading />;

    const agencies = routing?.agencies ?? [];
    const cities = routing?.cities ?? [];

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} gap={2} flexWrap="wrap">
                <DescripcionDeVista title="Ciudades y Agencias" description="Qué agencias entregan en cada ciudad, con qué % y hasta cuántas órdenes a la vez, y cuándo trabaja cada una" />
                <Box display="flex" gap={2}>
                    <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setOpenAddAgency(true)} color="secondary">
                        Nueva Agencia
                    </Button>
                    {role === 'Admin' && (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingCity(null); setOpenAdd(true); }}>
                            Nueva Ciudad
                        </Button>
                    )}
                </Box>
            </Box>

            {/* AGENCIAS */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, mb: 4, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight="bold">Agencias</Typography>
                <Typography variant="caption" color="text.secondary">
                    Activas = órdenes en Asignar a agencia, con repartidor o en ruta. Al llegar a su máximo, los pedidos van primero a las otras agencias de la ciudad; si todas están en su máximo, no esperan y se reparten en partes iguales.
                    Una agencia apagada o fuera de horario no recibe órdenes; si es la única de su ciudad, las órdenes nuevas de esa ciudad no pasan a vendedora hasta que vuelva a trabajar.
                </Typography>
                <Box sx={{ overflowX: 'auto', mt: 2 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Agencia</TableCell>
                                <TableCell>Ciudades</TableCell>
                                <TableCell>Trabaja</TableCell>
                                <TableCell align="right">Tarifa</TableCell>
                                <TableCell align="center">Activas / máximo</TableCell>
                                <TableCell align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {agencies.map((a) => (
                                <TableRow key={a.id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: a.color || 'primary.main' }}>{a.names.charAt(0)}</Avatar>
                                            <Typography fontWeight={600}>{a.names}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{a.cities.length ? a.cities.join(', ') : <Typography variant="caption" color="text.secondary">Sin ciudad</Typography>}</TableCell>
                                    <TableCell>
                                        <WorkingChip h={a} onClick={canEdit ? () => setHoursTarget({ ...a, kind: 'agency', name: a.names }) : undefined} />
                                    </TableCell>
                                    <TableCell align="right">{fmtMoney(a.delivery_cost, 'USD')}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            size="small"
                                            color={a.full ? 'error' : 'default'}
                                            variant={a.full ? 'filled' : 'outlined'}
                                            label={`${a.active} / ${a.max_active_orders ?? 'sin tope'}`}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {canEdit && (
                                            <Tooltip title="Tarifa y máximo">
                                                <IconButton size="small" onClick={() => setAgencySettings(a)}><EditIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                        {canReassign && (
                                            <Tooltip title="Pasar sus órdenes a otras agencias">
                                                <IconButton size="small" onClick={() => setReassign(a)}><SwapHorizIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {agencies.length === 0 && (
                                <TableRow><TableCell colSpan={6} align="center">No hay agencias</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>

            {/* CIUDADES */}
            <Grid container spacing={3}>
                {cities.map((city) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={city.id}>
                        <Card elevation={3} sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">{city.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Costo Delivery: <b>{fmtMoney(city.delivery_cost_usd, 'USD')}</b>
                                        </Typography>
                                    </Box>
                                    <Box sx={{ whiteSpace: 'nowrap' }}>
                                        {canEdit && (
                                            <Tooltip title="Encender o apagar la ciudad">
                                                <IconButton color={!city.is_working ? 'error' : city.stop_reason ? 'warning' : 'default'}
                                                    onClick={() => setHoursTarget({ ...city, kind: 'city' })}><PowerIcon /></IconButton>
                                            </Tooltip>
                                        )}
                                        {canEdit && (
                                            <Tooltip title="Agencias y %">
                                                <IconButton onClick={() => setCityAgencies(city)}><TuneIcon /></IconButton>
                                            </Tooltip>
                                        )}
                                        {canEdit && <IconButton onClick={() => { setEditingCity(city); setOpenAdd(true); }}><EditIcon /></IconButton>}
                                        {role === 'Admin' && <IconButton color="error" onClick={() => handleDeleteCity(city.id)}><DeleteIcon /></IconButton>}
                                    </Box>
                                </Box>

                                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                                    <WorkingChip h={city} onClick={canEdit ? () => setHoursTarget({ ...city, kind: 'city' }) : undefined} />
                                    {city.waiting > 0 && (
                                        <Tooltip title="No pasaron a vendedora porque la ciudad no trabajaba. Se reparten solas cuando vuelva a trabajar.">
                                            <Chip color="warning" size="small" sx={{ fontWeight: 'bold' }}
                                                label={`${city.waiting} ${city.waiting === 1 ? 'orden espera' : 'órdenes esperan'} vendedora`} />
                                        </Tooltip>
                                    )}
                                </Stack>
                                {city.stop_reason && city.is_working && (
                                    <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
                                        {city.stop_reason.charAt(0).toUpperCase() + city.stop_reason.slice(1)}: sus órdenes nuevas no pasan a vendedora.
                                    </Typography>
                                )}
                                {!city.is_working && (
                                    <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                                        Apagada: sus órdenes nuevas no pasan a vendedora.
                                    </Typography>
                                )}

                                {city.pending > 0 && (
                                    <Chip color="warning" size="small" sx={{ mt: 1, fontWeight: 'bold' }}
                                        label={`${city.pending} ${city.pending === 1 ? 'orden espera' : 'órdenes esperan'} agencia`} />
                                )}

                                <Stack spacing={0.75} sx={{ mt: 2 }}>
                                    {city.agencies.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">Sin agencias: las órdenes de esta ciudad se asignan a mano.</Typography>
                                    )}
                                    {city.agencies.map((a) => {
                                        // El horario y el encendido son de la agencia (Fran, 2026-10-17, 10:54)
                                        const ag = agencies.find((x) => x.id === a.id);
                                        const agHours = ag ? hoursLabel(ag) : null;
                                        return (
                                        <Stack key={a.id} direction="row" spacing={1} alignItems="center" sx={{ opacity: a.is_active ? 1 : 0.5 }}>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={600} noWrap>{a.names}</Typography>
                                                {ag && (!ag.is_working || agHours) && (
                                                    <Typography variant="caption" color={!ag.is_working ? 'error' : ag.stop_reason ? 'warning.main' : 'text.secondary'} display="block" noWrap>
                                                        {!ag.is_working ? 'Agencia apagada' : `Trabaja ${agHours}`}
                                                    </Typography>
                                                )}
                                            </Box>
                                            {a.is_active ? (
                                                <Tooltip title={a.weight === null ? 'Sin %: reparto parejo' : `${a.weight} % configurado`}>
                                                    <Typography variant="body2" color="text.secondary">{Math.round(a.share * 100)} %</Typography>
                                                </Tooltip>
                                            ) : (
                                                <Chip size="small" label="Inactiva" variant="outlined" />
                                            )}
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                color={a.max_active_orders !== null && a.active >= a.max_active_orders ? 'error' : 'default'}
                                                label={`${a.active}/${a.max_active_orders ?? '∞'}`}
                                            />
                                        </Stack>
                                        );
                                    })}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Ciudad: nombre y costo */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="xs">
                <form onSubmit={handleSaveCity}>
                    <DialogTitle>{editingCity ? 'Editar Ciudad' : 'Nueva Ciudad'}</DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={2} mt={1}>
                            <TextField name="name" label="Nombre de la Ciudad" fullWidth required defaultValue={editingCity?.name} />
                            <TextField
                                name="delivery_cost_usd"
                                label="Costo de Delivery (USD)"
                                type="number"
                                fullWidth
                                required
                                defaultValue={editingCity?.delivery_cost_usd}
                                inputProps={{ step: "0.01" }}
                                helperText="Se usa solo si la agencia no tiene tarifa propia."
                            />
                            <Typography variant="caption" color="text.secondary">
                                Las agencias de la ciudad y sus % se configuran con el botón de ajustes de cada ciudad.
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAdd(false)}>Cancelar</Button>
                        <Button variant="contained" type="submit">Guardar</Button>
                    </DialogActions>
                </form>
            </Dialog>

            <CityAgenciesDialog open={!!cityAgencies} city={cityAgencies} agencies={agencies} onClose={() => setCityAgencies(null)} onSaved={setRouting} />
            <WorkingHoursDialog open={!!hoursTarget} target={hoursTarget} onClose={() => setHoursTarget(null)} onSaved={setRouting} />
            <AgencySettingsDialog open={!!agencySettings} agency={agencySettings} onClose={() => setAgencySettings(null)} onSaved={setRouting} />
            <AgencyReassignDialog
                open={!!reassign}
                agency={reassign}
                canForce={canEdit}
                onClose={() => setReassign(null)}
                onSaved={setRouting}
            />
            <AddUserDialog open={openAddAgency} onClose={() => setOpenAddAgency(false)} defaultRole="Agencia" onUserAdded={fetchData} />
        </Layout>
    );
};
