import React, { useEffect, useState } from "react";
import {
    Box, Paper, Typography, TextField, Table, TableHead, TableRow, TableCell,
    TableBody, CircularProgress, Divider, Card, CardContent, Stack, Chip,
    Avatar, Tooltip, MenuItem, FormControl, InputLabel, Select,
    Collapse, IconButton
} from "@mui/material";
import * as XLSX from 'xlsx';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import Grid from "@mui/material/Grid";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { request } from "../../common/request";
import { RequireRole } from "../../components/auth/RequireRole";
import { IResponse } from "../../interfaces/response-type";
import { fmtMoney } from "../../lib/money";
import { Layout } from "../../components/ui/Layout";
import { ButtonCustom } from "../../components/custom";
import { useValidateSession } from "../../hooks/useValidateSession";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import { OrderDialog } from "../../components/orders/OrderDialog";
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { SettlementTrip, TRIP_TYPES, tripResultColor, tripResultLabel, tripSheetRows } from "../../common/agencyTrips";
import { orderNo } from "../../lib/functions";

type LeaderRow = {
    user_id: number;
    names: string;
    surnames: string;
    color?: string;
    groups: string[];
    sellers_count: number;
    base_usd: number;
    amount_usd: number;
};

type SummaryData = {
    vendors: any[];
    deliverers: any[];
    managers: any[];
    agencies: any[];
    upsells: any[];
    /** Comisión de liderazgo por Líder (ver LeaderCommissions en el backend). */
    leaders?: LeaderRow[];
    global_users: any[];
    orders_with_change: any[];
    agency_settlement: any[];
    /** Devoluciones = reembolsos del período (tarea 3b). */
    refunds?: { total_usd: number; count: number; items: any[] };
    totals: {
        all_usd: number;
        vendors_usd: number;
        deliverers_usd: number;
        managers_usd: number;
        agencies_usd: number;
        upsells_usd: number;
        leaders_usd?: number;
    };
    rates: {
        bcv: number;
        binance: number;
        bcv_eur: number;
    };
};

export const EarningsAdmin: React.FC = () => {
    const [from, setFrom] = useState(dayjs().startOf('month').format("YYYY-MM-DD"));
    const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(false);
    const { loadingSession, isValid, user } = useValidateSession();


    // Order Dialog
    const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);
    const [openDialog, setOpenDialog] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("from", from);
            params.append("to", to);
            const { status, response }: IResponse = await request(`/earnings/summary?${params.toString()}`, "GET");
            if (status) {
                const json = await response.json();
                setData(json.data);
            } else {
                toast.error("No se pudieron cargar las ganancias");
            }
        } catch {
            toast.error("Error al cargar ganancias");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (isValid) load(); }, [isValid]);

    const openOrder = (id: number) => {
        setSelectedOrderId(id);
        setOpenDialog(true);
    };

    const exportUserToExcel = (userRow: any) => {
        if (!userRow.order_details || userRow.order_details.length === 0) {
            toast.warning("No hay detalles para exportar");
            return;
        }
        const worksheetData = userRow.order_details.map((d: any) => ({
            "Orden": d.order_name,
            "Fecha": dayjs(d.earning_date).format('DD/MM/YYYY HH:mm'),
            "Tipo": d.role_type === 'upsell' ? 'Upsell' : (d.role_type === 'vendedor' ? 'Venta' : d.role_type),
            "Monto USD": d.amount_usd,
            "Monto VES": d.amount_local,
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
        XLSX.writeFile(wb, `Comisiones_${userRow.names.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;


    return (
        <RequireRole allowedRoles={["Admin", "Gerente"]}>
            <Layout>
                <DescripcionDeVista title="Panel de Ganancias Globales" description="Monitoreo centralizado de comisiones, métricas de conversión y gestión de vueltos." />

                <Box sx={{ p: { xs: 1, md: 3 }, display: "grid", gap: 3 }}>
                    <Paper sx={{
                        p: 3,
                        borderRadius: 4,
                        bgcolor: 'background.paper',
                        boxShadow: 2,
                        border: '1px solid',
                        borderColor: 'divider'
                    }} elevation={0}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
                            <TextField
                                label="Desde"
                                type="date"
                                size="small"
                                value={from}
                                onChange={e => setFrom(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                            />
                            <TextField
                                label="Hasta"
                                type="date"
                                size="small"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                            />
                            <ButtonCustom variant="contained" onClick={load} disabled={loading} sx={{ minWidth: 200 }}>Consultar Periodo</ButtonCustom>
                        </Stack>
                    </Paper>

                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}><CircularProgress size={60} /></Box>
                    ) : (data && (
                        <>
                            {/* Tasas del Día */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <RateCard title="Tasa BCV (USD/VES)" rate={data.rates.bcv} icon={<CurrencyExchangeRoundedIcon />} color="#2196f3" />
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <RateCard title="Tasa Binance (P2P)" rate={data.rates.binance} icon={<CurrencyExchangeRoundedIcon />} color="#fbc02d" />
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <RateCard title="Tasa BCV (EUR/VES)" rate={data.rates.bcv_eur} icon={<CurrencyExchangeRoundedIcon />} color="#9c27b0" />
                                </Grid>
                            </Grid>

                            {/* Totales Globales Proyectados */}
                            <Paper sx={{ p: 4, borderRadius: 5, background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', overflow: 'hidden', position: 'relative' }}>
                                <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
                                    <TrendingUpRoundedIcon sx={{ fontSize: 200, color: 'white' }} />
                                </Box>
                                <Grid container spacing={4} alignItems="center">
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 2, color: 'white' }}>TOTAL GENERAL COMISIONES</Typography>
                                        <Typography variant="h2" fontWeight="900" sx={{ mb: 1, color: 'white' }}>{fmtMoney(data.totals.all_usd, 'USD')}</Typography>
                                        <Chip label="Periodo Seleccionado" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} variant="outlined" />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 8 }}>
                                        <Grid container spacing={3}>
                                            <TotalProjection title="Proyección BCV" amountUsd={data.totals.all_usd} rate={data.rates.bcv} />
                                            <TotalProjection title="Proyección Binance" amountUsd={data.totals.all_usd} rate={data.rates.binance} />
                                            <TotalProjection title="Proyección BCV EUR" amountUsd={data.totals.all_usd} rate={data.rates.bcv_eur} />
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* SECCIÓN: DESGLOSE CONSOLIDADO POR USUARIO */}
                            <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 3 }}>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                    <AccountBalanceWalletRoundedIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="900">Desglose Consolidado</Typography>
                                        <Typography variant="caption" color="text.secondary">Total acumulado por cada usuario (todos sus roles combinados)</Typography>
                                    </Box>
                                </Stack>
                                <Divider sx={{ mb: 3 }} />
                                <Table size="medium">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Rol Principal</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Órdenes</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Comisión Local (Estimada)</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total a Pagar (USD)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.global_users.map(u => (
                                            <TableRow key={u.user_id} hover>
                                                <TableCell>
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Avatar sx={{ bgcolor: u.color || 'primary.main', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                            {u.names.charAt(0)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body1" fontWeight="bold">{u.names} {u.surnames}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                                                        </Box>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip label={u.role_name} size="small" variant="filled" color="primary" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" fontWeight="bold">{u.orders_count}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Calculado a tasa BCV USD">
                                                        <Typography variant="body2" color="text.secondary">{fmtMoney(u.amount_local, 'VES')}</Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="h6" fontWeight="900" color="primary.main">{fmtMoney(u.amount_usd, 'USD')}</Typography>
                                                    {u.leadership_usd > 0 && (
                                                        <Typography variant="caption" color="warning.main" display="block">incluye {fmtMoney(u.leadership_usd, 'USD')} de liderazgo</Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {data.global_users.length === 0 && (
                                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>Sin actividad registrada</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>

                            {/* SECCIÓN: LIQUIDACIÓN DE AGENCIAS */}
                            <AgencySettlementTable
                                settlement={data.agency_settlement}
                                openOrder={openOrder}
                                canVoid={['Admin', 'Master'].includes(user.role?.description || '')}
                                onChanged={load}
                            />

                            {/* SECCIÓN: DEVOLUCIONES (REEMBOLSOS) */}
                            {data.refunds && <RefundsTable refunds={data.refunds} openOrder={openOrder} />}


                            <Typography variant="h6" fontWeight="bold" sx={{ mt: 2, mb: -1 }}>Detalle por Categoría</Typography>

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, lg: 6 }}>
                                    <EarningsTable title="Vendedoras ($1.00 venta · $1.00 upsell)" rows={data.vendors} icon={<GroupsRoundedIcon color="primary" />} onDownload={exportUserToExcel} showUpsells />
                                </Grid>
                                <Grid size={{ xs: 12, lg: 6 }}>
                                    <EarningsTable title="Repartidores ($2.50 / orden)" rows={data.deliverers} icon={<GroupsRoundedIcon color="secondary" />} onDownload={exportUserToExcel} />
                                </Grid>

                                <Grid size={{ xs: 12, lg: 6 }}>
                                    <EarningsTable title="Upsells ($1.00 / producto adicional)" rows={data.upsells} icon={<TrendingUpRoundedIcon sx={{ color: '#ff9800' }} />} mainCountIsUpsells />
                                </Grid>
                                {/* El rol Gerente se quitó (Fran, 2026-10-02): solo sale si el período tiene lo que cobró antes */}
                                {(data.managers ?? []).length > 0 && (
                                    <Grid size={{ xs: 12 }}>
                                        <EarningsTable title="Gerentes (ya no se usa: lo cobrado antes)" rows={data.managers} icon={<GroupsRoundedIcon sx={{ color: '#e91e63' }} />} />
                                    </Grid>
                                )}
                                <Grid size={{ xs: 12 }}>
                                    <LeadersTable rows={data.leaders ?? []} total={data.totals.leaders_usd ?? 0} />
                                </Grid>
                            </Grid>
                        </>
                    ))}
                </Box>
                <OrderDialog id={selectedOrderId} open={openDialog} setOpen={setOpenDialog} />
            </Layout>
        </RequireRole>
    );
};

const RateCard = ({ title, rate, icon, color }: any) => (
    <Card sx={{
        borderRadius: 4,
        borderLeft: `6px solid ${color}`,
        boxShadow: 2,
        bgcolor: 'background.paper'
    }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${color}15`, color: color }}>{icon}</Box>
            <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">{title}</Typography>
                <Typography variant="h5" fontWeight="bold" color="text.primary">{rate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Typography>
            </Box>
        </CardContent>
    </Card>
);

/** Comisión de liderazgo: un % de lo que ganan las vendedoras de cada grupo, guardado al generarse. */
const LeadersTable = ({ rows, total }: { rows: LeaderRow[]; total: number }) => (
    <Paper sx={{ p: 4, borderRadius: 5, boxShadow: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <GroupsRoundedIcon sx={{ color: '#ff9800' }} />
            <Typography variant="h6" fontWeight="bold" color="text.primary">Líderes (comisión de liderazgo)</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
            Cada Líder cobra su % sobre las comisiones de las vendedoras de su grupo. Ya está sumado en el total a pagar de cada una.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Líder</TableCell>
                    <TableCell>Grupo</TableCell>
                    <TableCell align="center">Vendedoras</TableCell>
                    <TableCell align="right">Comisiones de su grupo</TableCell>
                    <TableCell align="right">Liderazgo (USD)</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map((r) => (
                    <TableRow key={r.user_id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{r.names} {r.surnames}</TableCell>
                        <TableCell>{r.groups.join(', ')}</TableCell>
                        <TableCell align="center">{r.sellers_count}</TableCell>
                        <TableCell align="right">{fmtMoney(r.base_usd, 'USD')}</TableCell>
                        <TableCell align="right"><Typography fontWeight="900" color="primary.main">{fmtMoney(r.amount_usd, 'USD')}</Typography></TableCell>
                    </TableRow>
                ))}
                {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Sin comisión de liderazgo en estas fechas</TableCell></TableRow>
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} sx={{ fontWeight: 'bold' }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmtMoney(total, 'USD')}</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </Paper>
);

const TotalProjection = ({ title, amountUsd, rate }: any) => (
    <Grid size={{ xs: 4 }}>
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5, color: 'white' }}>{title}</Typography>
        <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>{fmtMoney(amountUsd * rate, 'VES')}</Typography>
    </Grid>
);

const EarningsTable = ({ title, rows, icon, onDownload, showUpsells, mainCountIsUpsells }: {
    title: string;
    rows: any[];
    icon: React.ReactNode;
    onDownload?: (user: any) => void;
    /** Vendedoras: muestra chip de ventas + badge de upsells */
    showUpsells?: boolean;
    /** Tabla de Upsells: el chip principal muestra upsells_count directamente */
    mainCountIsUpsells?: boolean;
}) => (
    <Paper sx={{
        p: 4,
        borderRadius: 5,
        boxShadow: 1,
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
    }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            {icon}
            <Typography variant="h6" fontWeight="bold" color="text.primary">{title}</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        {showUpsells ? (
                            <Tooltip title="Ventas directas + Upsells (hover sobre los chips para ver el desglose)" arrow>
                                <span style={{ cursor: 'help', borderBottom: '1px dashed' }}>Ventas / Ups.</span>
                            </Tooltip>
                        ) : 'Cant.'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total (USD)</TableCell>
                    {onDownload && <TableCell align="center" sx={{ fontWeight: 'bold', width: 50 }}>Acciones</TableCell>}
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map(r => (
                    <TableRow key={r.user_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: r.color || 'action.disabled', width: 28, height: 28, fontSize: '0.7rem' }}>
                                    {r.names.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" fontWeight="medium" color="text.primary">{r.names}</Typography>
                                    <Typography variant="caption" color="text.secondary">{r.email}</Typography>
                                </Box>
                            </Stack>
                        </TableCell>
                        <TableCell align="center">
                            {showUpsells && r.upsells_count > 0 ? (
                                <Tooltip
                                    title={`${r.orders_count} venta${r.orders_count !== 1 ? 's' : ''} ($${r.orders_count.toFixed(2)}) + ${r.upsells_count} upsell${r.upsells_count !== 1 ? 's' : ''} ($${r.upsells_count.toFixed(2)}) = $${r.amount_usd.toFixed(2)}`}
                                    arrow
                                >
                                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                        <Chip label={r.orders_count} size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                        <Chip label={`+${r.upsells_count} up`} size="small" color="warning" variant="filled" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }} />
                                    </Stack>
                                </Tooltip>
                            ) : (
                                <Chip
                                    label={mainCountIsUpsells ? r.upsells_count : r.orders_count}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontWeight: 'bold' }}
                                />
                            )}
                        </TableCell>
                        <TableCell align="right">
                            <Typography variant="body1" fontWeight="bold" color="primary.main">{fmtMoney(r.amount_usd, "USD")}</Typography>
                        </TableCell>
                        {onDownload && (
                            <TableCell align="center">
                                <Tooltip title="Descargar Detalle Excel">
                                    <span>
                                        <IconButton size="small" color="primary" onClick={() => onDownload(r)} disabled={!r.order_details || r.order_details.length === 0}>
                                            <FileDownloadRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={onDownload ? 4 : 3} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>Sin datos en este periodo</Typography></TableCell></TableRow>}
            </TableBody>
        </Table>
    </Paper>
);

type SettlementProps = { settlement: any[]; openOrder: (id: number) => void; canVoid: boolean; onChanged: () => void };

const AgencySettlementTable = ({ settlement, openOrder, canVoid, onChanged }: SettlementProps) => {
    const [expanded, setExpanded] = useState<number | null>(null);

    const voidTrip = async (t: SettlementTrip) => {
        if (!t.trip_id) return;
        const reason = window.prompt(`¿Por qué se anula la carrera de ${orderNo(t.order_name)} (${t.trip_date})? Ya no se le pagará a la agencia.`);
        if (reason === null) return;
        if (reason.trim().length < 3) {
            toast.error("Escribe el motivo");
            return;
        }
        const { ok, response } = await request(`/agency-trips/${t.trip_id}/void`, "POST", { reason: reason.trim() });
        const json = await response.json().catch(() => ({}));
        if (ok && json.status) {
            toast.success("Carrera anulada");
            onChanged();
        } else {
            toast.error(json.message || "No se pudo anular");
        }
    };

    const exportToExcel = (agency: any) => {
        const worksheetData = agency.order_details.map((d: any) => ({
            "Orden": `${orderNo(d.order_name)}`,
            "Fecha": dayjs(d.updated_at).format('DD/MM/YYYY HH:mm'),
            "Total Orden": d.total_price,
            "Cobrado USD (Efec)": d.collected_usd,
            "Cobrado VES (Efec)": d.collected_ves,
            "Vuelto Agencia USD": d.change_usd,
            "Vuelto Agencia VES": d.change_ves,
            "Tasa Usada (Bs)": d.rate_ves ?? 0,
            "Vuelto Empresa (Monto)": d.change_company,
            "Vuelto Empresa (Método)": d.method_company,
            "Saldo Final USD": d.net_usd,
            "Saldo Final VES": d.net_ves,
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Liquidación");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tripSheetRows(agency.trip_details ?? [])), "Carreras");
        XLSX.writeFile(wb, `Liquidacion_${agency.agency_name.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    return (
        <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <BusinessRoundedIcon sx={{ color: 'success.main', fontSize: 32 }} />
                <Box>
                    <Typography variant="h5" fontWeight="900">Liquidación de Agencias</Typography>
                    <Typography variant="caption" color="text.secondary">Se paga cada carrera (también las fallidas y las re-entregas), en la semana en que se hizo. El saldo es el efectivo cobrado menos los vueltos entregados.</Typography>
                </Box>
            </Stack>
            <Divider sx={{ mb: 3 }} />

            {settlement.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No hay liquidaciones pendientes para este periodo.</Typography>
                </Box>
            ) : (
                <Table size="medium">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Agencia</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Entregados</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Carreras</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>A Pagar (Carreras)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Saldo Final (USD)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Saldo Final (BS)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {settlement.map(a => (
                            <React.Fragment key={a.agency_id}>
                                <TableRow hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ bgcolor: a.agency_color || 'success.main', width: 32, height: 32 }}>
                                                {a.agency_name.charAt(0)}
                                            </Avatar>
                                            <Typography variant="body1" fontWeight="bold">{a.agency_name}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={a.count_delivered || 0} size="small" color="success" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={a.count_trips ?? 0} size="small" color="info" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="error.main" fontWeight="bold">{fmtMoney(a.total_shipping_cost, 'USD')}</Typography>
                                        {a.delivery_rate > 0 && <Typography variant="caption" color="text.secondary" display="block">tarifa {fmtMoney(a.delivery_rate, 'USD')}</Typography>}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="h6" fontWeight="900" color="success.main">{fmtMoney(a.balance_usd, 'USD')}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="h6" fontWeight="900" color="primary.main">{fmtMoney(a.balance_ves, 'VES')}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Tooltip title="Descargar Detalle Excel">
                                                <IconButton color="primary" onClick={() => exportToExcel(a)}>
                                                    <FileDownloadRoundedIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Ver carreras">
                                                <IconButton onClick={() => setExpanded(expanded === a.agency_id ? null : a.agency_id)} disabled={!(a.trip_details?.length)}>
                                                    {expanded === a.agency_id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ py: 0, borderBottom: expanded === a.agency_id ? undefined : 'none' }}>
                                        <Collapse in={expanded === a.agency_id} unmountOnExit>
                                            <Table size="small" sx={{ my: 2 }}>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Fecha</TableCell>
                                                        <TableCell>Orden</TableCell>
                                                        <TableCell>Tipo</TableCell>
                                                        <TableCell>Resultado</TableCell>
                                                        <TableCell align="right">Monto</TableCell>
                                                        {canVoid && <TableCell />}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {(a.trip_details ?? []).map((t: SettlementTrip, i: number) => (
                                                        <TableRow key={t.trip_id ?? `e${i}`} hover>
                                                            <TableCell>{dayjs(t.trip_date).format('DD/MM/YYYY')}</TableCell>
                                                            <TableCell>
                                                                <Chip size="small" variant="outlined" label={`${orderNo(t.order_name)}`} onClick={() => openOrder(t.order_id)} icon={<LaunchRoundedIcon />} />
                                                            </TableCell>
                                                            <TableCell>{TRIP_TYPES[t.type] ?? t.type}</TableCell>
                                                            <TableCell><Chip size="small" color={tripResultColor(t.result)} label={tripResultLabel(t.result)} /></TableCell>
                                                            <TableCell align="right">{fmtMoney(t.amount_usd, 'USD')}</TableCell>
                                                            {canVoid && (
                                                                <TableCell align="right">
                                                                    {t.trip_id && <ButtonCustom size="small" variant="text" color="error" onClick={() => voidTrip(t)}>Anular</ButtonCustom>}
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Paper>
    );
};

/** Devoluciones del período: reembolsos al cliente (el producto se queda con él). */
const RefundsTable = ({ refunds, openOrder }: { refunds: { total_usd: number; count: number; items: any[] }; openOrder: (id: number) => void }) => (
    <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <ReplayRoundedIcon sx={{ color: 'warning.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight="900">Devoluciones (reembolsos)</Typography>
                <Typography variant="caption" color="text.secondary">Dinero devuelto a clientes en el período. No quitan la comisión de la vendedora.</Typography>
            </Box>
            <Chip color="warning" label={`${refunds.count} · ${fmtMoney(refunds.total_usd, 'USD')}`} sx={{ fontWeight: 'bold' }} />
        </Stack>
        <Divider sx={{ mb: 2 }} />
        {refunds.items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sin devoluciones en este periodo.</Typography>
        ) : (
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Orden</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Vendedora</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Método</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Registró</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Nota</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {refunds.items.map((r) => (
                        <TableRow key={r.id} hover>
                            <TableCell>{dayjs(r.refunded_at).format('DD/MM/YYYY')}</TableCell>
                            <TableCell>
                                <Chip size="small" variant="outlined" label={`${orderNo(r.order_name)}`} onClick={() => openOrder(r.order_id)} icon={<LaunchRoundedIcon />} />
                            </TableCell>
                            <TableCell>{r.seller_name ?? '—'}</TableCell>
                            <TableCell>{r.method ?? '—'}</TableCell>
                            <TableCell>{r.user_name ?? '—'}</TableCell>
                            <TableCell sx={{ maxWidth: 240 }}><Typography variant="body2" noWrap title={r.notes ?? ''}>{r.notes ?? '—'}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" fontWeight="bold">{fmtMoney(r.amount_usd, 'USD')}</Typography></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )}
    </Paper>
);
