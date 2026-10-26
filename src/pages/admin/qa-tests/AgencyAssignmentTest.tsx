import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Stepper, Step, StepLabel, StepContent,
    Button, Alert, CircularProgress, LinearProgress, TextField, MenuItem, Chip,
} from '@mui/material';
import { PlayArrow, CheckCircle, Error as ErrorIcon, Refresh, WarningAmber } from '@mui/icons-material';
import { request } from '../../../common/request';

interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }
interface OrderOption { id: number; label: string; agency_id: number | null; agency_name: string; }
interface AgencyOption { id: number; name: string; }

const ts = () => new Date().toLocaleTimeString('es-VE', { hour12: false });
const apiCall = async (url: string, method: string, body?: any) => {
    const { status, response } = await request(url, method as any, body);
    const json = await response.json().catch(() => ({}));
    return { status, json };
};

const STEP_LABELS = [
    'Cargar orden y agencia actual',
    'Asignar agencia de prueba',
    'Verificar asignación',
    'Revertir agencia original',
    'Verificar reversión',
];

export const AgencyAssignmentTest: React.FC = () => {
    const [orders, setOrders] = useState<OrderOption[]>([]);
    const [agencies, setAgencies] = useState<AgencyOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
    const [selectedAgencyId, setSelectedAgencyId] = useState<number>(0);
    const [activeStep, setActiveStep] = useState(-1);
    const [busy, setBusy] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => { loadSetup(); }, []);

    const loadSetup = async () => {
        const [oRes, aRes] = await Promise.all([
            request('/orders', 'GET'),
            // assign-agency espera un id de USUARIO-AGENCIA (no de warehouse).
            request('/users/role/Agencia', 'GET'),
        ]);
        if (oRes.status === 200) {
            const j = await oRes.response.json();
            const list = Array.isArray(j) ? j : (j.data?.data ?? j.data ?? j.orders ?? []);
            setOrders(list.slice(0, 60).map((o: any) => ({
                id: o.id,
                label: `#${o.id} ${o.name ? '('+o.name+')' : ''} — ${o.client_name ?? o.customer?.name ?? o.client?.name ?? 'S/N'} | Agencia: ${o.agency?.name ?? o.warehouse?.name ?? 'Sin asignar'}`,
                agency_id: o.agency_id ?? o.warehouse_id ?? null,
                agency_name: o.agency?.name ?? o.warehouse?.name ?? 'Sin asignar',
            })));
        }
        if (aRes.status === 200) {
            const j = await aRes.response.json();
            const list = j.data?.data ?? j.data ?? j ?? [];
            setAgencies(list
                .filter((w: any) => w.is_active !== false)
                .map((w: any) => ({ id: w.id, name: w.primary_city ? `Agencia: ${w.primary_city}` : (w.names ?? w.name) }))
            );
        }
    };

    const log = (msg: string, st: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: ts(), status: st, msg }, ...prev]);

    const runTest = async () => {
        if (!selectedOrderId || !selectedAgencyId) return;
        setBusy(true); setLogs([]); setDone(false); setFailed(false);
        const originalOrder = orders.find(o => o.id === selectedOrderId);
        let originalAgencyId = originalOrder?.agency_id ?? null;
        let testPassed = false;

        try {
            setActiveStep(0);
            log(`── PASO 1: Cargando orden #${selectedOrderId} ──`, 'info');
            const { status: gs, json: gj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            if (gs !== 200) { log(`❌ No se pudo cargar la orden (${gs})`, 'error'); setFailed(true); return; }
            const orderData = gj.data ?? gj;
            originalAgencyId = orderData.agency_id ?? orderData.warehouse_id ?? null;
            const originalAgencyName = orderData.agency?.name ?? orderData.warehouse?.name ?? 'Sin asignar';
            log(`✅ Agencia actual: "${originalAgencyName}" (ID: ${originalAgencyId ?? 'ninguna'})`, 'ok');

            setActiveStep(1);
            const testAgency = agencies.find(a => a.id === selectedAgencyId);
            log(`── PASO 2: Asignando agencia "${testAgency?.name}" (ID ${selectedAgencyId}) ──`, 'info');
            const { status: as, json: aj } = await apiCall(`/orders/${selectedOrderId}/assign-agency`, 'PUT', {
                agency_id: selectedAgencyId,
                warehouse_id: selectedAgencyId,
            });
            if (as !== 200 && as !== 201) {
                log(`❌ Error al asignar agencia (${as}): ${aj.message ?? JSON.stringify(aj.errors ?? {})}`, 'error');
                setFailed(true); return;
            }
            log(`✅ Agencia asignada: ${aj.data?.agency?.name ?? aj.data?.warehouse?.name ?? aj.message ?? 'OK'}`, 'ok');

            setActiveStep(2);
            log('── PASO 3: Verificando asignación en BD ──', 'info');
            const { status: vs, json: vj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const verifyData = vj.data ?? vj;
            const newAgencyId = verifyData.agency_id ?? verifyData.warehouse_id;
            if (vs === 200 && newAgencyId === selectedAgencyId) {
                log(`✅ VERIFICACIÓN OK: agency_id=${newAgencyId}`, 'ok');
                testPassed = true;
            } else {
                log(`❌ VERIFICACIÓN FALLIDA: esperado ${selectedAgencyId}, obtenido ${newAgencyId}`, 'error');
                setFailed(true);
            }

        } finally {
            setActiveStep(3);
            log(`── PASO 4: Revirtiendo a agencia original (ID ${originalAgencyId ?? 'ninguna'}) ──`, 'info');
            if (originalAgencyId) {
                const { status: rs } = await apiCall(`/orders/${selectedOrderId}/assign-agency`, 'PUT', {
                    agency_id: originalAgencyId,
                    warehouse_id: originalAgencyId,
                });
                if (rs === 200 || rs === 201) {
                    log(`✅ Agencia original restaurada (ID ${originalAgencyId})`, 'ok');
                } else {
                    log(`⚠️ No se pudo revertir automáticamente. Revisar manualmente.`, 'error');
                }
            } else {
                log('ℹ️ La orden no tenía agencia asignada previamente', 'info');
            }

            setActiveStep(4);
            const { status: fvs, json: fvj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const finalAgencyId = (fvj.data ?? fvj)?.agency_id ?? (fvj.data ?? fvj)?.warehouse_id;
            const expectedId = originalAgencyId ?? selectedAgencyId;
            log(fvs === 200 && finalAgencyId === expectedId
                ? `✅ Estado final correcto: agency_id=${finalAgencyId}`
                : `⚠️ Estado final: agency_id=${finalAgencyId} (esperado ${expectedId})`,
                fvs === 200 && finalAgencyId === expectedId ? 'ok' : 'info');

            log('🧹 Limpieza completada', 'ok');
            if (testPassed) setDone(true);
            setActiveStep(-1);
            setBusy(false);
        }
    };

    const reset = () => { setLogs([]); setDone(false); setFailed(false); setActiveStep(-1); };
    const selectedOrder = orders.find(o => o.id === selectedOrderId);

    return (
        <Box>
            <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3, borderRadius: 3 }}>
                <strong>Operación real:</strong> Asigna una agencia/almacén a la orden seleccionada y restaura la original.
                Esto puede disparar eventos de stock en algunos estados — elige una orden sin movimientos activos.
            </Alert>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🔧 Configuración</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start" flexWrap="wrap">
                    <TextField
                        select label="Orden de prueba" value={selectedOrderId || ''} size="small"
                        onChange={e => setSelectedOrderId(Number(e.target.value))}
                        sx={{ flex: 2, minWidth: 260 }} disabled={busy}
                    >
                        {orders.map(o => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
                    </TextField>
                    <TextField
                        select label="Agencia / Almacén" value={selectedAgencyId || ''} size="small"
                        onChange={e => setSelectedAgencyId(Number(e.target.value))}
                        sx={{ flex: 1, minWidth: 200 }} disabled={busy}
                    >
                        {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    </TextField>
                    <Button
                        variant="contained" color={done ? 'success' : failed ? 'error' : 'primary'}
                        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                        onClick={runTest} disabled={busy || !selectedOrderId || !selectedAgencyId}
                        sx={{ borderRadius: 2, fontWeight: 'bold', minWidth: 160 }}
                    >
                        {busy ? 'Ejecutando…' : done ? '✅ Pasó' : failed ? '❌ Falló' : '▶ Iniciar Test'}
                    </Button>
                    <Button variant="outlined" color="inherit" startIcon={<Refresh />}
                        onClick={reset} disabled={busy} sx={{ borderRadius: 2 }}>Reset</Button>
                </Stack>
                {selectedOrder && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        Orden <strong>#{selectedOrder.id}</strong> — Agencia actual:
                        <Chip label={selectedOrder.agency_name} size="small" sx={{ mx: 0.5 }} />
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
                                {done && !failed ? '✅ TEST EXITOSO — Asignación de agencia verificada' : '❌ TEST FALLIDO — Revisa el log'}
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
