import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Stepper, Step, StepLabel, StepContent,
    Button, Alert, CircularProgress, LinearProgress, TextField, MenuItem,
    Chip, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { PlayArrow, CheckCircle, Error as ErrorIcon, Refresh, WarningAmber } from '@mui/icons-material';
import { request } from '../../../common/request';

interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }
interface OrderOption { id: number; label: string; }
interface PaymentRecord { label: string; methods: any[]; total: number; }

const ts = () => new Date().toLocaleTimeString('es-VE', { hour12: false });
const apiCall = async (url: string, method: string, body?: any) => {
    const { status, response } = await request(url, method as any, body);
    const json = await response.json().catch(() => ({}));
    return { status, json };
};

const STEP_LABELS = [
    'Cargar orden y capturar pagos actuales',
    'Construir payload de prueba (pago ficticio)',
    'Aplicar nuevo método de pago',
    'Verificar que el pago se guardó',
    'Revertir pagos originales',
];

// Test payment to inject
const TEST_PAYMENT_NOTE = '__QA_TEST_PAYMENT__';

export const PaymentMethodTest: React.FC = () => {
    const [orders, setOrders] = useState<OrderOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
    const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
    const [activeStep, setActiveStep] = useState(-1);
    const [busy, setBusy] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        const res = await request('/orders', 'GET');
        if (res.status === 200) {
            const j = await res.response.json();
            const list = Array.isArray(j) ? j : (j.data?.data ?? j.data ?? j.orders ?? []);
            setOrders(list.slice(0, 50).map((o: any) => ({
                id: o.id,
                label: `#${o.id} ${o.name ? '('+o.name+')' : ''} — ${o.client_name ?? o.customer?.name ?? o.client?.name ?? 'S/N'} | Total: ${o.current_total_price ?? o.total ?? '?'}`,
            })));
        }
    };

    const log = (msg: string, st: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: ts(), status: st, msg }, ...prev]);

    const runTest = async () => {
        if (!selectedOrderId) return;
        setBusy(true); setLogs([]); setPaymentRecords([]); setDone(false); setFailed(false);
        let originalPayments: any[] = [];
        let originalTotal = 0;
        let testPassed = false;

        try {
            setActiveStep(0);
            log(`── PASO 1: Cargando orden #${selectedOrderId} ──`, 'info');
            const { status: gs, json: gj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            if (gs !== 200) { log(`❌ No se pudo cargar la orden (${gs})`, 'error'); setFailed(true); return; }

            const orderData = gj.data ?? gj.order ?? gj;
            originalTotal = Number(orderData.current_total_price ?? orderData.total ?? 0);
            originalPayments = orderData.payments ?? orderData.payment_methods ?? [];
            log(`✅ Orden cargada. Total: ${originalTotal}. Métodos de pago actuales: ${originalPayments.length}`, 'ok');
            setPaymentRecords(prev => [...prev, { label: 'ANTES', methods: originalPayments, total: originalTotal }]);

            setActiveStep(1);
            log('── PASO 2: Construyendo pago de prueba ──', 'info');
            const testPaymentAmount = 0.01;
            const testPayload = {
                payments: [
                    ...originalPayments.map(p => ({
                        method: p.method,
                        amount: p.amount,
                        rate: p.rate
                    })),
                    {
                        method: 'DOLARES_EFECTIVO',
                        amount: testPaymentAmount,
                        note: TEST_PAYMENT_NOTE,
                    }
                ]
            };
            log(`✅ Payload construido: ${originalPayments.length} originales + 1 de prueba ($${testPaymentAmount} Dólares)`, 'ok');

            setActiveStep(2);
            log('── PASO 3: Enviando PUT /orders/{id}/payment ──', 'info');
            const { status: ps, json: pj } = await apiCall(`/orders/${selectedOrderId}/payment`, 'PUT', testPayload);
            if (ps !== 200 && ps !== 201) {
                log(`❌ Error al actualizar pago (${ps}): ${pj.message ?? JSON.stringify(pj.errors ?? {})}`, 'error');
                setFailed(true); return;
            }
            log(`✅ Pago aplicado. Respuesta: OK`, 'ok');

            setActiveStep(3);
            log('── PASO 4: Verificando en BD ──', 'info');
            const { status: vs, json: vj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const verifyData = vj.data ?? vj.order ?? vj;
            const newPayments = verifyData.payments ?? verifyData.payment_methods ?? [];
            const newTotal = Number(verifyData.current_total_price ?? verifyData.total ?? 0);
            setPaymentRecords(prev => [...prev, { label: 'DESPUÉS', methods: newPayments, total: newTotal }]);

            if (vs === 200 && newPayments.length > originalPayments.length) {
                log(`✅ VERIFICACIÓN OK: pagos ${originalPayments.length} → ${newPayments.length}`, 'ok');
                testPassed = true;
            } else {
                log(`❌ VERIFICACIÓN FALLIDA — Los pagos no aumentaron (Antes: ${originalPayments.length}, Ahora: ${newPayments.length})`, 'error');
                setFailed(true);
            }

        } finally {
            setActiveStep(4);
            log('── PASO 5: Revirtiendo pagos ──', 'info');
            // SOLO revertimos si hay algo que revertir y el servidor lo permite (min:1)
            if (originalPayments.length > 0) {
                const revertPayload = { 
                    payments: originalPayments.map(p => ({
                        method: p.method,
                        amount: p.amount,
                        rate: p.rate
                    })) 
                };
                const { status: rs } = await apiCall(`/orders/${selectedOrderId}/payment`, 'PUT', revertPayload);
                if (rs === 200 || rs === 201) {
                    log(`✅ Pagos originales restaurados`, 'ok');
                } else {
                    log(`⚠️ Error al revertir (${rs}).`, 'error');
                }
            } else {
                log('ℹ️ No hay pagos originales para restaurar (se queda el de prueba para limpieza manual si es necesario)', 'info');
            }
            log('🧹 Limpieza completada', 'ok');
            if (testPassed) setDone(true);
            setActiveStep(-1);
            setBusy(false);
        }
    };

    const reset = () => { setLogs([]); setPaymentRecords([]); setDone(false); setFailed(false); setActiveStep(-1); };

    const before = paymentRecords.find(r => r.label === 'ANTES');
    const after = paymentRecords.find(r => r.label === 'DESPUÉS');

    return (
        <Box>
            <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3, borderRadius: 3 }}>
                <strong>Operación real:</strong> Añade un pago ficticio de <strong>$0.01 USD</strong> a la orden seleccionada
                y luego restaura los pagos originales automáticamente.
            </Alert>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🔧 Configuración</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                    <TextField
                        select label="Orden de prueba" value={selectedOrderId || ''} size="small"
                        onChange={e => setSelectedOrderId(Number(e.target.value))}
                        sx={{ flex: 2, minWidth: 280 }} disabled={busy}
                    >
                        {orders.map(o => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                    </TextField>
                    <Button
                        variant="contained" color={done ? 'success' : failed ? 'error' : 'primary'}
                        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                        onClick={runTest} disabled={busy || !selectedOrderId}
                        sx={{ borderRadius: 2, fontWeight: 'bold', minWidth: 160 }}
                    >
                        {busy ? 'Ejecutando…' : done ? '✅ Pasó' : failed ? '❌ Falló' : '▶ Iniciar Test'}
                    </Button>
                    <Button variant="outlined" color="inherit" startIcon={<Refresh />}
                        onClick={reset} disabled={busy} sx={{ borderRadius: 2 }}>Reset</Button>
                </Stack>
            </Paper>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
                <Box sx={{ flex: '0 0 300px' }}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📋 Pasos</Typography>
                        <Stepper activeStep={activeStep} orientation="vertical">
                            {STEP_LABELS.map((label, i) => (
                                <Step key={i} completed={!busy && (done || failed) && activeStep === -1 && i < 5}>
                                    <StepLabel><Typography variant="body2">{label}</Typography></StepLabel>
                                    {activeStep === i && <StepContent><LinearProgress sx={{ mt: 0.5, borderRadius: 2 }} /></StepContent>}
                                </Step>
                            ))}
                        </Stepper>
                        {(done || failed) && (
                            <Alert severity={done && !failed ? 'success' : 'error'}
                                icon={done && !failed ? <CheckCircle /> : <ErrorIcon />}
                                sx={{ mt: 2, borderRadius: 2 }}>
                                {done && !failed ? '✅ TEST EXITOSO — Pago verificado y revertido' : '❌ TEST FALLIDO — Revisa el log'}
                            </Alert>
                        )}
                    </Paper>

                    {(before || after) && (
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>💳 Comparación</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Momento</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }} align="right"># Métodos</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {before && (
                                        <TableRow>
                                            <TableCell>Antes</TableCell>
                                            <TableCell align="right"><strong>{before.methods.length}</strong></TableCell>
                                        </TableRow>
                                    )}
                                    {after && (
                                        <TableRow>
                                            <TableCell>Después</TableCell>
                                            <TableCell align="right">
                                                <Chip size="small" label={after.methods.length}
                                                    color={after.methods.length > (before?.methods.length ?? 0) ? 'success' : 'default'}
                                                    sx={{ fontWeight: 'bold' }} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>
                    )}
                </Box>

                <Paper elevation={0} sx={{ flex: 1, minWidth: 0, p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🖥️ Log de Eventos</Typography>
                    {logs.length === 0 ? (
                        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                            El log aparecerá aquí cuando inicies el test…
                        </Typography>
                    ) : (
                        <Box sx={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {logs.map((l, i) => (
                                <Box key={i} sx={{
                                    py: 0.75, px: 1.5, borderRadius: 1.5,
                                    bgcolor: l.status === 'ok' ? 'rgba(34,197,94,0.08)' : l.status === 'error' ? 'rgba(239,68,68,0.08)' : 'action.hover',
                                    borderLeft: '3px solid',
                                    borderColor: l.status === 'ok' ? 'success.main' : l.status === 'error' ? 'error.main' : 'info.main',
                                }}>
                                    <Stack direction="row" spacing={1} alignItems="baseline">
                                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', flexShrink: 0 }}>{l.ts}</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{l.msg}</Typography>
                                    </Stack>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Paper>
            </Stack>
        </Box>
    );
};
