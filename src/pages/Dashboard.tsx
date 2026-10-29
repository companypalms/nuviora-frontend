import { Box, Grid, Paper, Stack, Avatar, Divider, Tooltip, Chip, Checkbox, TextField } from "@mui/material";
import {
    AttachMoneyRounded,
    TrendingUpRounded,
    AssignmentIndRounded,
    LocalShippingRounded,
    CancelRounded,
    ApartmentRounded,
    LocationOnRounded,
    CheckCircleRounded,
    HistoryRounded,
    Inventory2Outlined as Inventory2OutlinedIcon,
    FileDownloadRounded as FileDownloadRoundedIcon
} from "@mui/icons-material";
import Masonry from "@mui/lab/Masonry";
import { useEffect, useState } from "react";
import * as XLSX from 'xlsx';
import dayjs from "dayjs";
import { darken, lighten } from "@mui/material/styles";
import { Layout } from "../components/ui/Layout";
import { useUserStore } from "../store/user/UserStore";
import { TypographyCustom, ButtonCustom } from "../components/custom";
import { Loading } from "../components/ui/content/Loading";
import { Widget } from "../components/widgets/Widget";
import { toast } from "react-toastify";
import { useValidateSession } from "../hooks/useValidateSession";
import { request } from "../common/request";
import { changeReceiptUrl } from "../common/receipts";
import { IResponse } from "../interfaces/response-type";
import { OrderDialog } from "../components/orders/OrderDialog";
import { orderNo } from "../lib/functions";
import { AdminDashboard } from "../components/dashboard/admin/AdminDashboard";
import { DaySummary } from "../components/dashboard/admin/DaySummary";
import { ClosureReminder } from "../components/agency-closures/ClosureReminder";
import { DashboardStats } from "../components/dashboard/admin/types";

interface DashboardData {
    role: string;
    today: string;
    rate: number;
    stats: DashboardStats;
}

export const Dashboard = () => {
    const user = useUserStore((state) => state.user);
    // El Admin tiene su propio Dashboard (Etapa 4): sus metas, lo de hoy y su asistente. No pide los números de aquí
    const isAdmin = user.role?.description === "Admin";
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [agencySettlement, setAgencySettlement] = useState<any[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format("YYYY-MM-DD"));
    const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [fetchingSettlement, setFetchingSettlement] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [showOrderDialog, setShowOrderDialog] = useState(false);

    const fetchSettlement = async () => {
        setFetchingSettlement(true);
        try {
            const { status, response } = await request(`/earnings/summary?from=${fromDate}&to=${toDate}`, 'GET');
            if (status) {
                const json = await response.json();
                if (json.status) {
                    setAgencySettlement(json.data.agency_settlement || []);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingSettlement(false);
        }
    };

    const fetchData = async () => {
        if (!user.token) return;
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/dashboard', 'GET');
            if (status) {
                const json = await response.json();
                if (json.status) {
                    setData(json.data);
                }
            }

            // Fetch agency settlement if agency
            if (user.role?.description === 'Agencia') {
                await fetchSettlement();
            }

        } catch (error) {
            console.error(error);
            toast.error("Error al cargar datos del dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid && !loadingSession && !isAdmin) {
            fetchData();
        }
    }, [user.token, isValid, loadingSession, isAdmin]);

    if (loadingSession || !isValid || !user.token) {
        return <Loading />;
    }

    if (isAdmin) {
        return (
            <Layout>
                <Box sx={{ mt: 1 }}>
                    <AdminDashboard />
                </Box>
            </Layout>
        );
    }

    if (loading || !data) {
        return <Loading />;
    }

    const { role, today, stats } = data;

    const handleOpenOrder = (id: number) => {
        setSelectedOrderId(id);
        setShowOrderDialog(true);
    };

    const handleToggleNotification = async (order: any) => {
        try {
            const { status } = await request(`/orders/${order.id}/toggle-notification`, 'PUT');
            if (status) {
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const exportToExcel = (agency: any) => {
        if (!agency) return;
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
        const fileName = `Liquidacion_${agency.agency_name?.replace(/\s+/g, '_') || 'Agencia'}_${fromDate}_al_${toDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const renderWidgetsByRole = () => {
        switch (role) {
            case "Gerente":
            case "Master":
                return <DaySummary role={role} stats={stats} onOpenOrder={handleOpenOrder} onChanged={fetchData} />;


            case "Vendedor":
                return (
                    <Grid container spacing={3}>
                        {/* 💰 HERO CARD: EARNINGS */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper elevation={0} sx={{
                                p: 3, borderRadius: 5,
                                background: `linear-gradient(135deg, ${user.color} 0%, ${darken(user.color, 0.4)} 100%)`,
                                color: 'white', position: 'relative', overflow: 'hidden', height: '100%'
                            }}>
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <TypographyCustom variant="overline" sx={{ opacity: 0.8, fontWeight: 'bold', letterSpacing: 1 }}>Tus Comisiones Hoy</TypographyCustom>
                                    <TypographyCustom variant="h3" fontWeight="900" sx={{ mt: 1, mb: 0 }}>
                                        ${Number(stats.earnings_usd || 0).toFixed(2)}
                                    </TypographyCustom>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                        <TypographyCustom variant="subtitle2" sx={{ opacity: 0.7 }}>
                                            {Number(stats.earnings_local || 0).toFixed(2)} Bs
                                        </TypographyCustom>
                                    </Stack>

                                    {/* Breakdown */}
                                    <Stack direction="row" spacing={2} sx={{ bgcolor: 'rgba(0,0,0,0.1)', p: 1.5, borderRadius: 2, backdropFilter: 'blur(10px)' }}>
                                        <Box>
                                            <TypographyCustom variant="caption" sx={{ opacity: 0.8, display: 'block', mb: -0.5 }}>Órdenes</TypographyCustom>
                                            <TypographyCustom variant="h6" fontWeight="bold">
                                                ${Number(stats.earnings_breakdown?.orders || 0).toFixed(2)}
                                            </TypographyCustom>
                                        </Box>
                                        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                                        <Box>
                                            <TypographyCustom variant="caption" sx={{ opacity: 0.8, display: 'block', mb: -0.5 }}>Upsell ({stats.earnings_breakdown?.upsell_count || 0})</TypographyCustom>
                                            <TypographyCustom variant="h6" fontWeight="bold">
                                                ${Number(stats.earnings_breakdown?.upsells || 0).toFixed(2)}
                                            </TypographyCustom>
                                        </Box>
                                    </Stack>

                                    <TypographyCustom variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.6 }}>
                                        Regla: {stats.rule}
                                    </TypographyCustom>
                                </Box>
                                <AttachMoneyRounded sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: 180, opacity: 0.1, transform: 'rotate(-15deg)' }} />
                            </Paper>
                        </Grid>

                        {/* 📊 ORDER STATS GRID */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AssignmentIndRounded color="primary" /> Resumen del Día
                            </TypographyCustom>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Asignadas', value: stats.orders?.assigned, color: 'info.main', icon: <AssignmentIndRounded /> },
                                    { label: 'Completadas', value: stats.orders?.completed, color: 'success.main', icon: <CheckCircleRounded /> },
                                    { label: 'Entregadas', value: stats.orders?.delivered, color: 'secondary.main', icon: <LocalShippingRounded /> },
                                    { label: 'Canceladas', value: stats.orders?.cancelled, color: 'error.main', icon: <CancelRounded /> },
                                ].map((item, idx) => (
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                                        <Paper elevation={0} sx={{
                                            p: 2, borderRadius: 4, bgcolor: 'background.paper',
                                            border: '1px solid', borderColor: 'divider',
                                            display: 'flex', flexDirection: 'column', gap: 1,
                                            alignItems: 'center', textAlign: 'center',
                                            transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' }
                                        }}>
                                            <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, borderRadius: 3, width: 48, height: 48 }}>
                                                {item.icon}
                                            </Avatar>
                                            <Box>
                                                <TypographyCustom variant="h4" fontWeight="bold" color="text.primary">{item.value ?? 0}</TypographyCustom>
                                                <TypographyCustom variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase' }}>{item.label}</TypographyCustom>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>

                        {/* 🛒 RECENT ORDERS + CHART */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <HistoryRounded /> Órdenes Recientes
                            </TypographyCustom>
                            <Paper elevation={0} sx={{ borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                                {(stats.recent_orders && stats.recent_orders.length > 0) ? (
                                    <Stack divider={<Divider />}>
                                        {stats.recent_orders.map((o: any) => (
                                            <Box key={o.id} onClick={() => handleOpenOrder(o.id)} sx={{
                                                p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, transition: '0.2s'
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: 'primary.light', color: 'white', width: 40, height: 40, fontWeight: 'bold' }}>
                                                        {o.client?.first_name?.[0]}{o.client?.last_name?.[0]}
                                                    </Avatar>
                                                    <Box>
                                                        <TypographyCustom variant="subtitle2" fontWeight="bold">
                                                            {o.client?.first_name} {o.client?.last_name}
                                                        </TypographyCustom>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <TypographyCustom variant="caption" color="text.secondary">{orderNo(o.name)}</TypographyCustom>
                                                            <TypographyCustom variant="caption" color="text.disabled">•</TypographyCustom>
                                                            <TypographyCustom variant="caption" color="text.secondary">${o.current_total_price}</TypographyCustom>
                                                        </Stack>
                                                    </Box>
                                                </Box>
                                                <Chip
                                                    label={o.status?.description}
                                                    size="small"
                                                    color={
                                                        ['Entregado', 'Confirmado'].includes(o.status?.description) ? 'success' :
                                                            (['Cancelado'].includes(o.status?.description) ? 'error' : 'default')
                                                    }
                                                    sx={{ fontWeight: 'bold', borderRadius: 2 }}
                                                />
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                                        <TypographyCustom variant="body2">No tienes órdenes recientes</TypographyCustom>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* 📨 VUELTOS PENDIENTES */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Inventory2OutlinedIcon /> Vueltos con Comprobante
                            </TypographyCustom>
                            <Paper elevation={0} sx={{ borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                                {(stats.pending_vueltos && stats.pending_vueltos.length > 0) ? (
                                    <Stack divider={<Divider />}>
                                        {stats.pending_vueltos.map((o: any) => (
                                            <Box key={o.id} sx={{
                                                p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                bgcolor: o.client_notified ? 'action.selected' : 'transparent',
                                                transition: '0.2s'
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Checkbox
                                                        checked={o.client_notified}
                                                        onChange={() => handleToggleNotification(o)}
                                                        color="success"
                                                        icon={<CheckCircleRounded sx={{ opacity: 0.3 }} />}
                                                        checkedIcon={<CheckCircleRounded />}
                                                    />
                                                    <Box onClick={() => handleOpenOrder(o.id)} sx={{ cursor: 'pointer' }}>
                                                        <TypographyCustom variant="subtitle2" fontWeight="bold" sx={{ textDecoration: o.client_notified ? 'line-through' : 'none', opacity: o.client_notified ? 0.6 : 1 }}>
                                                            {orderNo(o.name)} - {o.client?.names || o.client?.first_name}
                                                        </TypographyCustom>
                                                        <TypographyCustom variant="caption" color="text.secondary">
                                                            Vuelto: {o.change_covered_by} • {o.status?.description}
                                                        </TypographyCustom>
                                                    </Box>
                                                </Box>
                                                {o.change_extra?.change_receipt && (
                                                    <Chip
                                                        label="Ver Recibo"
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => window.open(changeReceiptUrl(o), '_blank')}
                                                        sx={{ cursor: 'pointer' }}
                                                    />
                                                )}
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                                        <TypographyCustom variant="body2">No hay vueltos pendientes de notificar</TypographyCustom>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUpRounded /> Rendimiento Semanal
                            </TypographyCustom>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: 'fit-content' }}>
                                {stats.sales_history && (
                                    <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ height: 200, pt: 2 }}>
                                        {stats.sales_history.map((day: any, i: number) => {
                                            // Normalize height
                                            const max = Math.max(...stats.sales_history!.map((d: any) => d.count), 1);
                                            const height = (day.count / max) * 150;

                                            return (
                                                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 1 }}>
                                                    <Tooltip title={`${day.count} Ventas`}>
                                                        <Box sx={{
                                                            width: '60%',
                                                            background: `linear-gradient(to top, ${user.color} 0%, ${lighten(user.color, 0.5)} 100%)`,
                                                            borderRadius: 2,
                                                            height: `${Math.max(height, 4)}px`,
                                                            transition: 'height 0.5s',
                                                            '&:hover': { filter: 'brightness(1.1)' }
                                                        }} />
                                                    </Tooltip>
                                                    <TypographyCustom variant="caption" fontWeight="bold" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                        {day.date}
                                                    </TypographyCustom>
                                                </Box>
                                            )
                                        })}
                                    </Stack>
                                )}
                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                                    <TypographyCustom variant="caption" align="center" display="block" color="text.secondary">
                                        Ventas confirmadas en los últimos 7 días
                                    </TypographyCustom>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                );

            case "Repartidor":
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Tus ganancias de hoy">
                            <TypographyCustom variant="body1">
                                Ganancia por entregas
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                ${Number(stats.earnings_usd || 0).toFixed(2)} USD
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                {Number(stats.earnings_local || 0).toFixed(2)} Bs
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                                Regla: {stats.rule}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Tus Entregas">
                            <TypographyCustom variant="body2">
                                Asignadas hoy: {stats.orders?.assigned ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Entregadas hoy: {stats.orders?.delivered ?? 0}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            case "Agencia":
                return (
                    <Grid container spacing={3}>
                        {/* Aviso del cierre semanal (Módulo 3, §22): hasta que suba el archivo de la semana anterior */}
                        <Grid size={{ xs: 12 }} sx={{ "&:empty": { display: "none" } }}>
                            <ClosureReminder />
                        </Grid>
                        {/* 📊 AGENCY PRIMARY METRICS */}
                        {/* 📊 AGENCY PRIMARY METRICS */}
                        {/* <Grid size={{ xs: 12, md: 4 }}>
                            <Paper elevation={0} sx={{
                                p: 3, borderRadius: 5,
                                background: `linear-gradient(135deg, ${user.color} 0%, ${darken(user.color, 0.3)} 100%)`,
                                color: 'white', position: 'relative', overflow: 'hidden'
                            }}>
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <TypographyCustom variant="overline" sx={{ opacity: 0.8, fontWeight: 'bold' }}>Tus Ganancias Hoy</TypographyCustom>
                                    <TypographyCustom variant="h3" fontWeight="900" sx={{ my: 1 }}>
                                        ${Number(stats.earnings_usd || 0).toFixed(2)}
                                    </TypographyCustom>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <TrendingUpRounded fontSize="small" />
                                        <TypographyCustom variant="caption">{Number(stats.earnings_local || 0).toFixed(2)} Bs</TypographyCustom>
                                    </Stack>
                                </Box>
                                <AttachMoneyRounded sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: 180, opacity: 0.1, transform: 'rotate(-15deg)' }} />
                            </Paper>
                        </Grid> */}

                        <Grid size={{ xs: 12, md: 8 }}>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Asignadas Hoy', value: stats.orders_today?.assigned, color: 'info.main', icon: <AssignmentIndRounded /> },
                                    { label: 'Entregadas Hoy', value: stats.orders_today?.delivered, color: 'success.main', icon: <LocalShippingRounded /> },
                                    { label: 'Pendientes Ruta', value: stats.orders_today?.pending, color: 'warning.main', icon: <LocationOnRounded /> },
                                ].map((item, idx) => (
                                    <Grid size={{ xs: 12, sm: 4 }} key={idx}>
                                        <Paper elevation={0} sx={{
                                            p: 2.5, borderRadius: 4, bgcolor: 'background.paper',
                                            border: '1px solid', borderColor: 'divider',
                                            display: 'flex', alignItems: 'center', gap: 2,
                                            height: '100%'
                                        }}>
                                            <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, borderRadius: 3 }}>
                                                {item.icon}
                                            </Avatar>
                                            <Box>
                                                <TypographyCustom variant="h5" fontWeight="bold">{item.value ?? 0}</TypographyCustom>
                                                <TypographyCustom variant="caption" color="text.secondary">{item.label}</TypographyCustom>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>

                        {/* 🏢 AGENCY INFO */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ApartmentRounded color="primary" /> Resumen de Agencia
                            </TypographyCustom>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                <TypographyCustom variant="body1" sx={{ mb: 2 }}>
                                    {stats.message || "Gestiona las entregas y repartidores de tu zona asignada."}
                                </TypographyCustom>
                                <Divider sx={{ my: 2 }} />
                                <Stack direction="row" spacing={2} justifyContent="space-around">
                                    <Box textAlign="center">
                                        <TypographyCustom variant="h4" fontWeight="bold" color="primary.main">
                                            {fetchingSettlement ? '...' : (agencySettlement[0]?.total_orders ?? 0)}
                                        </TypographyCustom>
                                        <TypographyCustom variant="caption" color="text.secondary">Total Entregadas (Periodo)</TypographyCustom>
                                    </Box>
                                    {/* Sin las carreras: solo las ve el Admin (Fran, 2026-10-06) */}
                                    <Box textAlign="center">
                                        <TypographyCustom variant="h4" fontWeight="bold" color="success.main">
                                            {fetchingSettlement ? '...' : `$${Number(agencySettlement[0]?.total_net_usd || 0).toFixed(0)}`}
                                        </TypographyCustom>
                                        <TypographyCustom variant="caption" color="text.secondary">Saldo Final USD</TypographyCustom>
                                    </Box>
                                    <Box textAlign="center">
                                        <TypographyCustom variant="h4" fontWeight="bold" color="secondary.main">
                                            {fetchingSettlement ? '...' : `${Number(agencySettlement[0]?.total_net_ves || 0).toLocaleString()} Bs`}
                                        </TypographyCustom>
                                        <TypographyCustom variant="caption" color="text.secondary">Saldo Final Bs</TypographyCustom>
                                    </Box>
                                </Stack>
                                <Divider sx={{ my: 2 }} />
                                <Stack spacing={2} sx={{ mb: 3 }}>
                                    <TypographyCustom variant="subtitle2" fontWeight="bold">Periodo de Liquidación</TypographyCustom>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            label="Desde"
                                            type="date"
                                            size="small"
                                            fullWidth
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        <TextField
                                            label="Hasta"
                                            type="date"
                                            size="small"
                                            fullWidth
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Stack>
                                    <ButtonCustom
                                        variant="outlined"
                                        onClick={fetchSettlement}
                                        loading={fetchingSettlement}
                                    >
                                        Actualizar Reporte
                                    </ButtonCustom>
                                </Stack>
                                <Divider sx={{ my: 2 }} />
                                <ButtonCustom
                                    variant="contained"
                                    fullWidth
                                    startIcon={<FileDownloadRoundedIcon />}
                                    disabled={agencySettlement.length === 0 || fetchingSettlement}
                                    onClick={() => exportToExcel(agencySettlement[0])}
                                    sx={{
                                        borderRadius: 3,
                                        py: 1.5,
                                        fontWeight: 'bold',
                                        textTransform: 'none',
                                        boxShadow: 2
                                    }}
                                >
                                    Descargar Liquidación (Excel)
                                </ButtonCustom>
                            </Paper>
                        </Grid>
                    </Grid>
                );

            default:
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Resumen">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {stats.message || "Bienvenido al sistema."}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );
        }
    };

    return (
        <Layout>
            <Box sx={{ mt: 1, mb: 2.5 }}>
                <TypographyCustom component="h1" variant="h4">
                    ¡Hola, {user.names}!
                </TypographyCustom>
                <TypographyCustom color={"text.secondary"} variant="body1">
                    Hoy es {dayjs(today).isValid() ? new Date(dayjs(today).valueOf()).toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" }) : today}. Aquí tienes un resumen de tu día como {role || user.role?.description || "usuario"}.
                </TypographyCustom>
            </Box>

            {renderWidgetsByRole()}

            {showOrderDialog && selectedOrderId && (
                <OrderDialog
                    open={showOrderDialog}
                    setOpen={(isOpen) => {
                        setShowOrderDialog(isOpen);
                        if (!isOpen) { // If dialog is closing
                            setSelectedOrderId(null); // Clear selected order
                            fetchData(); // Refetch data
                        }
                    }}
                    id={selectedOrderId}
                />
            )}
        </Layout>
    );
};
