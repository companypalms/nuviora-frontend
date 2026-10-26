import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Stepper, Step, StepLabel, StepContent,
    Button, Alert, CircularProgress, LinearProgress, TextField, MenuItem, Chip,
} from '@mui/material';
import { PlayArrow, CheckCircle, Error as ErrorIcon, Refresh, WarningAmber } from '@mui/icons-material';
import { request } from '../../../common/request';

interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }
interface OrderOption { id: number; label: string; status_description: string; }

const ts = () => new Date().toLocaleTimeString('es-VE', { hour12: false });
const apiCall = async (url: string, method: string, body?: any) => {
    const { status, response } = await request(url, method as any, body);
    const json = await response.json().catch(() => ({}));
    return { status, json };
};

const STEP_LABELS = [
    'Cargar orden seleccionada',
    'Enviar solicitud de cancelación',
    'Verificar en cola de cancelaciones',
    'Rechazar cancelación (revertir)',
    'Verificar orden restaurada',
];

const TEST_CANCEL_REASON = '[QA-TEST] Cancelación automática de prueba — se rechazará de inmediato';

export const CancellationFlowTest: React.FC = () => {
    const [orders, setOrders] = useState<OrderOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
    const [activeStep, setActiveStep] = useState(-1);
    const [busy, setBusy] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);
    const [cancellationId, setCancellationId] = useState<number | null>(null);

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        const res = await request('/orders', 'GET');
        if (res.status === 200) {
            const j = await res.response.json();
            const list = Array.isArray(j) ? j : (j.data?.data ?? j.data ?? j.orders ?? []);
            setOrders(
                list.slice(0, 80)
                    .filter((o: any) => {
                        const desc = (o.status?.description ?? '').toLowerCase();
                        return !desc.includes('cancel') && !desc.includes('devuel');
                    })
                    .map((o: any) => ({
                        id: o.id,
                        label: `#${o.id} — ${o.client_name ?? o.customer?.name ?? '?'} (${o.status?.description ?? '?'})`,
                        status_description: o.status?.description ?? '?',
                    }))
            );
        }
    };

    const log = (msg: string, st: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: ts(), status: st, msg }, ...prev]);

    const runTest = async () => {
        if (!selectedOrderId) return;
        setBusy(true); setLogs([]); setDone(false); setFailed(false); setCancellationId(null);
        let foundCancellationId: number | null = null;
        let testPassed = false;

        try {
            setActiveStep(0);
            log(`── PASO 1: Cargando orden #${selectedOrderId} ──`, 'info');
            const { status: gs, json: gj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            if (gs !== 200) { log(`❌ No se pudo cargar la orden (${gs})`, 'error'); setFailed(true); return; }
            log(`✅ Orden cargada. Estado: "${(gj.data ?? gj)?.status?.description ?? '?'}"`, 'ok');

            setActiveStep(1);
            log('── PASO 2: Enviando solicitud de cancelación ──', 'info');
            const { status: cs, json: cj } = await apiCall(`/orders/${selectedOrderId}/cancel`, 'POST', {
                reason: TEST_CANCEL_REASON,
            });
            if (cs !== 200 && cs !== 201) {
                log(`❌ No se pudo solicitar cancelación (${cs}): ${cj.message ?? JSON.stringify(cj.errors ?? {})}`, 'error');
                setFailed(true); return;
            }
            foundCancellationId = cj.data?.id ?? cj.id ?? null;
            setCancellationId(foundCancellationId);
            log(`✅ Cancelación solicitada. ID: ${foundCancellationId ?? '(buscar en lista)'}`, 'ok');

            setActiveStep(2);
            log('── PASO 3: Verificando en cola de cancelaciones ──', 'info');
            const { status: ls, json: lj } = await apiCall('/cancellations', 'GET');
            if (ls === 200) {
                const list: any[] = lj.data ?? lj ?? [];
                const found = list.find((c: any) =>
                    c.order_id === selectedOrderId || (foundCancellationId && c.id === foundCancellationId)
                );
                if (found) {
                    foundCancellationId = foundCancellationId ?? found.id;
                    setCancellationId(foundCancellationId);
                    log(`✅ Solicitud #${foundCancellationId} encontrada en la cola`, 'ok');
                } else {
                    log(`⚠️ No encontrada en lista paginada. Usando ID obtenido: ${foundCancellationId}`, 'info');
                }
            } else {
                log(`⚠️ No se pudo leer /cancellations (${ls}). Continuando.`, 'info');
            }

            setActiveStep(3);
            if (!foundCancellationId) {
                const { json: lj2 } = await apiCall('/cancellations', 'GET');
                const found2 = (lj2.data ?? lj2 ?? []).find((c: any) => c.order_id === selectedOrderId);
                if (found2) { foundCancellationId = found2.id; setCancellationId(foundCancellationId); }
            }

            log(`── PASO 4: Rechazando cancelación #${foundCancellationId} ──`, 'info');
            if (!foundCancellationId) {
                log('❌ Sin ID de cancelación para revertir. Revertir manualmente en /orders/cancelled.', 'error');
                setFailed(true); return;
            }
            const { status: rs, json: rj } = await apiCall(
                `/cancellations/${foundCancellationId}/review`, 'PUT',
                { action: 'reject', notes: '[QA-TEST] Rechazo automático de prueba' }
            );
            if (rs !== 200 && rs !== 201) {
                log(`❌ Error al rechazar (${rs}): ${rj.message ?? JSON.stringify(rj.errors ?? {})}`, 'error');
                setFailed(true); return;
            }
            log(`✅ Cancelación rechazada exitosamente`, 'ok');

            setActiveStep(4);
            log('── PASO 5: Verificando que la orden no está cancelada ──', 'info');
            const { status: vs, json: vj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const finalStatus = ((vj.data ?? vj)?.status?.description ?? '').toLowerCase();
            if (vs === 200 && !finalStatus.includes('cancel')) {
                log(`✅ VERIFICACIÓN OK: orden en estado "${(vj.data ?? vj)?.status?.description}"`, 'ok');
                testPassed = true;
            } else {
                log(`❌ VERIFICACIÓN FALLIDA: estado="${finalStatus}"`, 'error');
                setFailed(true);
            }

        } finally {
            log('🧹 Limpieza completada', 'ok');
            if (testPassed) setDone(true);
            setActiveStep(-1);
            setBusy(false);
        }
    };

    const reset = () => { setLogs([]); setDone(false); setFailed(false); setActiveStep(-1); setCancellationId(null); };
    const selectedOrder = orders.find(o => o.id === selectedOrderId);

    return (
        <Box>
            <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3, borderRadius: 3 }}>
                <strong>Operación real:</strong> Solicita la cancelación de una orden y la <strong>rechaza de inmediato</strong>.
                La orden quedará en su estado anterior. Evita usar en órdenes activas en producción.
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
                {selectedOrder && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        Orden <strong>#{selectedOrder.id}</strong> — Estado:
                        <Chip label={selectedOrder.status_description} size="small" sx={{ mx: 0.5 }} />
                        {cancellationId && <>· ID cancelación: <Chip label={`#${cancellationId}`} size="small" color="warning" sx={{ mx: 0.5 }} /></>}
                    </Alert>
                )}
            </Paper>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
                <Box sx={{ flex: '0 0 300px' }}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
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
                                {done && !failed ? '✅ TEST EXITOSO — Flujo de cancelación verificado' : '❌ TEST FALLIDO — Revisa el log'}
                            </Alert>
                        )}
                    </Paper>
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
