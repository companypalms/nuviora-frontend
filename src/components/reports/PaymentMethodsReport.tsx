import React, { useState, useEffect } from 'react';
import {
    Typography,
    Box,
    Stack,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { AccountBalanceWalletRounded, DateRangeRounded } from '@mui/icons-material';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { fmtMoney } from '../../lib/money';
import { Panel, PanelHeader } from '../ui/surface/Panel';

interface PaymentMethodData {
    method: string;
    transaction_count: number;
    total_amount: number;
}

interface PaymentReportData {
    date_from: string;
    date_to: string;
    methods: Record<string, PaymentMethodData>;
    totals: {
        grand_total: number;
        total_transactions: number;
    };
}

export const PaymentMethodsReport: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PaymentReportData | null>(null);

    // Default to today
    const today = new Date().toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(today);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const { status, response }: IResponse = await request(
                `/reports/payments-by-method?${params.toString()}`,
                'GET'
            );

            if (status) {
                const result = await response.json();
                setData(result.data);
            } else {
                setError('Error al cargar el reporte');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const paymentMethods = data ? Object.values(data.methods) : [];

    // Payment method colors
    const getMethodColor = (method: string) => {
        const colors: Record<string, string> = {
            'Zelle': '#6B46C1',
            'PayPal': '#003087',
            'Binance': '#F3BA2F',
            'Transferencia': '#10B981',
            'Efectivo': '#16A34A',
            'Tarjeta': '#3B82F6',
        };
        return colors[method] || '#6B7280';
    };

    return (
        <Panel sx={{ height: '100%' }}>
            <PanelHeader
                icon={<AccountBalanceWalletRounded />}
                title="Pagos por método"
                subtitle="Pagos recibidos en el rango, según el método"
            />

            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
                <TextField
                    label="Desde"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                    sx={{ width: 160 }}
                />
                <TextField
                    label="Hasta"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                    sx={{ width: 160 }}
                />
                <Button
                    variant="contained"
                    disableElevation
                    onClick={fetchReport}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <DateRangeRounded />}
                >
                    {loading ? 'Cargando…' : 'Consultar'}
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && !data ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : data && paymentMethods.length > 0 ? (
                <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Método</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Transacciones</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Total (USD)</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: '32%' }}>Del total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paymentMethods.map((method) => {
                                const pct = data.totals.grand_total ? (method.total_amount / data.totals.grand_total) * 100 : 0;
                                const color = getMethodColor(method.method);
                                return (
                                    <TableRow key={method.method} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" gap={1}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                                <Typography variant="body2" fontWeight={600}>{method.method}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">{method.transaction_count}</TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={600}>{fmtMoney(method.total_amount, 'USD')}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" gap={1}>
                                                <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover' }}>
                                                    <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 3, bgcolor: color }} />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ width: 44, textAlign: 'right' }}>{pct.toFixed(1)} %</Typography>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow sx={{ bgcolor: 'action.hover', '& td': { borderBottom: 0 } }}>
                                <TableCell><Typography variant="body2" fontWeight={700}>Total</Typography></TableCell>
                                <TableCell align="right"><Typography variant="body2" fontWeight={700}>{data.totals.total_transactions}</Typography></TableCell>
                                <TableCell align="right">
                                    <Typography variant="body1" fontWeight={700} color="primary">{fmtMoney(data.totals.grand_total, 'USD')}</Typography>
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No hay pagos en el rango elegido.
                </Typography>
            )}
        </Panel>
    );
};
