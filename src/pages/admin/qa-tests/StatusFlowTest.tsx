import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Stepper, Step, StepLabel, StepContent,
    Button, Alert, CircularProgress, LinearProgress, TextField, MenuItem, Chip,
} from '@mui/material';
import { PlayArrow, CheckCircle, Error as ErrorIcon, Refresh, WarningAmber } from '@mui/icons-material';
import { request } from '../../../common/request';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }
interface OrderOption { id: number; label: string; status_id: number; status_description: string; }
interface StatusOption { id: number; description: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('es-VE', { hour12: false });
const apiCall = async (url: string, method: string, body?: any) => {
    const { status, response } = await request(url, method as any, body);
    const json = await response.json().catch(() => ({}));
    return { status, json };
};

const STEP_LABELS = [
    'Cargar orden seleccionada',
    'Capturar estado original',
    'Aplicar nuevo estado',
    'Verificar cambio de estado',
    'Revertir estado original',
];

export const StatusFlowTest: React.FC = () => {
    const [orders, setOrders] = useState<OrderOption[]>([]);
    const [statuses, setStatuses] = useState<StatusOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
    const [targetStatusId, setTargetStatusId] = useState<number>(0);
    const [activeStep, setActiveStep] = useState(-1);
    const [busy, setBusy] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => { loadSetup(); }, []);

    const loadSetup = async () => {
        const [oRes, sRes] = await Promise.all([
            request('/orders', 'GET'),
            request('/statuses', 'GET'),
        ]);
        if (oRes.status === 200) {
            const j = await oRes.response.json();
            const list = Array.isArray(j) ? j : (j.data?.data ?? j.data ?? j.orders ?? []);
            const mapped: OrderOption[] = list.slice(0, 50).map((o: any) => ({
                id: o.id,
                label: `#${o.id} ${o.name ? '('+o.name+')' : ''} — ${o.client_name ?? o.customer?.name ?? o.client?.name ?? 'S/N'} (${o.status?.description ?? o.status_description ?? '?'})`,
                status_id: o.status_id ?? o.status?.id ?? 0,
                status_description: o.status?.description ?? o.status_description ?? '?',
            }));
            setOrders(mapped);
        }
        if (sRes.status === 200) {
            const j = await sRes.response.json();
            setStatuses(Array.isArray(j) ? j : (j.data ?? []));
        }
    };

    const log = (msg: string, st: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: ts(), status: st, msg }, ...prev]);

    const runTest = async () => {
        if (!selectedOrderId || !targetStatusId) return;
        const original = orders.find(o => o.id === selectedOrderId);
        if (!original) return;

        setBusy(true); setLogs([]); setDone(false); setFailed(false);
        let originalStatusId = original.status_id;
        let testPassed = false;

        try {
            setActiveStep(0);
            log(`── PASO 1: Cargando orden #${selectedOrderId} ──`, 'info');
            const { status: gs, json: gj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            if (gs !== 200) { log(`❌ No se pudo cargar la orden (${gs})`, 'error'); setFailed(true); return; }
            originalStatusId = gj.data?.status_id ?? gj.status_id ?? originalStatusId;
            log(`✅ Orden cargada. Estado actual: ID ${originalStatusId} — "${gj.data?.status?.description ?? gj.order?.status?.description ?? '?'}"`, 'ok');

            setActiveStep(1);
            log(`── PASO 2: Estado original registrado (ID ${originalStatusId}) ──`, 'info');
            log(`✅ Revertiremos a ID ${originalStatusId} al finalizar`, 'ok');

            setActiveStep(2);
            const targetStatus = statuses.find(s => s.id === targetStatusId);
            log(`── PASO 3: Aplicando estado → "${targetStatus?.description}" (ID ${targetStatusId}) ──`, 'info');
            const { status: us, json: uj } = await apiCall(`/orders/${selectedOrderId}/status`, 'PUT', { status_id: targetStatusId });
            if (us !== 200 && us !== 201) {
                log(`❌ Error al cambiar estado (${us}): ${uj.message ?? JSON.stringify(uj.errors ?? {})}`, 'error');
                setFailed(true); return;
            }
            log(`✅ Estado cambiado exitosamente: ${uj.data?.status?.description ?? targetStatus?.description}`, 'ok');

            setActiveStep(3);
            log('── PASO 4: Verificando cambio en BD ──', 'info');
            const { status: vs, json: vj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const orderData = vj.data ?? vj.order ?? vj;
            const currentStatusId = orderData.status_id ?? orderData.status?.id;
            if (vs === 200 && currentStatusId === targetStatusId) {
                log(`✅ VERIFICACIÓN OK: status_id=${currentStatusId} coincide con target=${targetStatusId}`, 'ok');
                testPassed = true;
            } else {
                log(`❌ VERIFICACIÓN FALLIDA: esperado status_id=${targetStatusId}, obtenido ${currentStatusId}`, 'error');
                setFailed(true);
            }

        } finally {
            setActiveStep(4);
            log(`── PASO 5: Revirtiendo a estado original (ID ${originalStatusId}) ──`, 'info');
            const { status: rs } = await apiCall(`/orders/${selectedOrderId}/status`, 'PUT', { status_id: originalStatusId });
            if (rs === 200 || rs === 201) {
                log(`✅ Orden restaurada al estado ID ${originalStatusId}`, 'ok');
            } else {
                log(`⚠️ No se pudo revertir automáticamente (${rs}). Revisar manualmente.`, 'error');
            }
            log('🧹 Limpieza completada', 'ok');
            if (testPassed) setDone(true);
            setActiveStep(-1);
            setBusy(false);
        }
    };

    const reset = () => { setLogs([]); setDone(false); setFailed(false); setActiveStep(-1); };

    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const targetStatus = statuses.find(s => s.id === targetStatusId);

    return (
        <Box>
            <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3, borderRadius: 3 }}>
                <strong>Operación real:</strong> Este test cambia el estado de una orden real y lo revierte al finalizar.
                Selecciona una orden que <strong>no esté activa</strong> para evitar interrupciones.
            </Alert>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🔧 Configuración</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start" flexWrap="wrap">
                    <TextField
                        select label="Orden de prueba" value={selectedOrderId || ''} size="small"
                        onChange={e => setSelectedOrderId(Number(e.target.value))}
                        sx={{ flex: 2, minWidth: 250 }} disabled={busy}
                    >
                        {orders.map(o => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                    </TextField>
                    <TextField
                        select label="Nuevo estado a aplicar" value={targetStatusId || ''} size="small"
                        onChange={e => setTargetStatusId(Number(e.target.value))}
                        sx={{ flex: 1, minWidth: 200 }} disabled={busy}
                    >
                        {statuses.filter(s => s.id !== selectedOrder?.status_id).map(s => (
                            <MenuItem key={s.id} value={s.id}>{s.description}</MenuItem>
                        ))}
                    </TextField>
                    <Button
                        variant="contained" color={done ? 'success' : failed ? 'error' : 'primary'}
                        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                        onClick={runTest} disabled={busy || !selectedOrderId || !targetStatusId}
                        sx={{ borderRadius: 2, fontWeight: 'bold', minWidth: 160 }}
                    >
                        {busy ? 'Ejecutando…' : done ? '✅ Pasó' : failed ? '❌ Falló' : '▶ Iniciar Test'}
                    </Button>
                    <Button variant="outlined" color="inherit" startIcon={<Refresh />}
                        onClick={reset} disabled={busy} sx={{ borderRadius: 2 }}>Reset</Button>
                </Stack>
                {selectedOrder && targetStatus && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        Orden <strong>#{selectedOrder.id}</strong> irá de <Chip label={selectedOrder.status_description} size="small" sx={{ mx: 0.5 }} />
                        → <Chip label={targetStatus.description} size="small" color="primary" sx={{ mx: 0.5 }} /> y luego regresará.
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
                                {done && !failed ? '✅ TEST EXITOSO — Status flow verificado' : '❌ TEST FALLIDO — Revisa el log'}
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
