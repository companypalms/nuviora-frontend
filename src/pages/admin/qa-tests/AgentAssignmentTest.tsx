import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Stepper, Step, StepLabel, StepContent,
    Button, Alert, CircularProgress, LinearProgress, TextField, MenuItem, Chip,
} from '@mui/material';
import { PlayArrow, CheckCircle, Error as ErrorIcon, Refresh, WarningAmber } from '@mui/icons-material';
import { request } from '../../../common/request';

interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }
interface OrderOption { id: number; label: string; agent_id: number | null; agent_name: string; }
interface AgentOption { id: number; name: string; }

const ts = () => new Date().toLocaleTimeString('es-VE', { hour12: false });
const apiCall = async (url: string, method: string, body?: any) => {
    const { status, response } = await request(url, method as any, body);
    const json = await response.json().catch(() => ({}));
    return { status, json };
};

const STEP_LABELS = [
    'Cargar orden y capturar agente actual',
    'Asignar agente de prueba',
    'Verificar asignación en BD',
    'Revertir al agente original',
    'Verificar reversión',
];

export const AgentAssignmentTest: React.FC = () => {
    const [orders, setOrders] = useState<OrderOption[]>([]);
    const [agents, setAgents] = useState<AgentOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
    const [selectedAgentId, setSelectedAgentId] = useState<number>(0);
    const [activeStep, setActiveStep] = useState(-1);
    const [busy, setBusy] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => { loadSetup(); }, []);

    const loadSetup = async () => {
        const [oRes, aRes] = await Promise.all([
            request('/orders', 'GET'),
            request('/users/agents', 'GET'),
        ]);
        if (oRes.status === 200) {
            const j = await oRes.response.json();
            const list = Array.isArray(j) ? j : (j.data?.data ?? j.data ?? j.orders ?? []);
            setOrders(list.slice(0, 60).map((o: any) => ({
                id: o.id,
                label: `#${o.id} — ${o.client_name ?? o.customer?.name ?? '?'} | Agente: ${o.agent?.name ?? o.user?.name ?? 'Sin asignar'}`,
                agent_id: o.agent_id ?? o.user_id ?? null,
                agent_name: o.agent?.name ?? o.user?.name ?? 'Sin asignar',
            })));
        }
        if (aRes.status === 200) {
            const j = await aRes.response.json();
            const list = Array.isArray(j) ? j : (j.data ?? []);
            setAgents(list.map((u: any) => ({ id: u.id, name: u.name })));
        }
    };

    const log = (msg: string, st: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: ts(), status: st, msg }, ...prev]);

    const runTest = async () => {
        if (!selectedOrderId || !selectedAgentId) return;
        setBusy(true); setLogs([]); setDone(false); setFailed(false);
        const originalOrder = orders.find(o => o.id === selectedOrderId);
        let originalAgentId = originalOrder?.agent_id ?? null;
        let testPassed = false;

        try {
            setActiveStep(0);
            log(`── PASO 1: Cargando orden #${selectedOrderId} ──`, 'info');
            const { status: gs, json: gj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            if (gs !== 200) { log(`❌ No se pudo cargar la orden (${gs})`, 'error'); setFailed(true); return; }
            const orderData = gj.data ?? gj;
            originalAgentId = orderData.agent_id ?? orderData.user_id ?? null;
            const originalAgentName = orderData.agent?.name ?? orderData.user?.name ?? 'Sin asignar';
            log(`✅ Agente actual: "${originalAgentName}" (ID: ${originalAgentId ?? 'ninguno'})`, 'ok');

            setActiveStep(1);
            const testAgent = agents.find(a => a.id === selectedAgentId);
            log(`── PASO 2: Asignando agente "${testAgent?.name}" (ID ${selectedAgentId}) ──`, 'info');
            const { status: as, json: aj } = await apiCall(`/orders/${selectedOrderId}/assign-agent`, 'PUT', {
                agent_id: selectedAgentId,
                user_id: selectedAgentId,
            });
            if (as !== 200 && as !== 201) {
                log(`❌ Error al asignar agente (${as}): ${aj.message ?? JSON.stringify(aj.errors ?? {})}`, 'error');
                setFailed(true); return;
            }
            log(`✅ Agente asignado exitosamente: ${aj.data?.agent?.name ?? aj.message ?? 'OK'}`, 'ok');

            setActiveStep(2);
            log('── PASO 3: Verificando asignación en BD ──', 'info');
            const { status: vs, json: vj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const verifyData = vj.data ?? vj;
            const newAgentId = verifyData.agent_id ?? verifyData.user_id;
            if (vs === 200 && newAgentId === selectedAgentId) {
                log(`✅ VERIFICACIÓN OK: agent_id=${newAgentId} coincide con el asignado`, 'ok');
                testPassed = true;
            } else {
                log(`❌ VERIFICACIÓN FALLIDA: esperado ${selectedAgentId}, obtenido ${newAgentId}`, 'error');
                setFailed(true);
            }

        } finally {
            setActiveStep(3);
            log(`── PASO 4: Revirtiendo al agente original (ID ${originalAgentId ?? 'ninguno'}) ──`, 'info');
            if (originalAgentId) {
                const { status: rs } = await apiCall(`/orders/${selectedOrderId}/assign-agent`, 'PUT', {
                    agent_id: originalAgentId,
                    user_id: originalAgentId,
                });
                if (rs === 200 || rs === 201) {
                    log(`✅ Agente original restaurado (ID ${originalAgentId})`, 'ok');
                } else {
                    log(`⚠️ No se pudo revertir automáticamente (${rs}). Revisar manualmente.`, 'error');
                }
            } else {
                log('ℹ️ La orden no tenía agente asignado — se deja el agente de prueba asignado', 'info');
            }

            setActiveStep(4);
            log('── PASO 5: Verificación final ──', 'info');
            const { status: fvs, json: fvj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const finalAgentId = (fvj.data ?? fvj)?.agent_id ?? (fvj.data ?? fvj)?.user_id;
            const expectedId = originalAgentId ?? selectedAgentId;
            if (fvs === 200 && finalAgentId === expectedId) {
                log(`✅ Estado final correcto: agent_id=${finalAgentId}`, 'ok');
            } else {
                log(`⚠️ Estado final: agent_id=${finalAgentId} (esperado ${expectedId})`, 'info');
            }

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
                <strong>Operación real:</strong> Asigna un agente a la orden seleccionada y luego restaura el agente original.
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
                        select label="Agente a asignar" value={selectedAgentId || ''} size="small"
                        onChange={e => setSelectedAgentId(Number(e.target.value))}
                        sx={{ flex: 1, minWidth: 200 }} disabled={busy}
                    >
                        {agents.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    </TextField>
                    <Button
                        variant="contained" color={done ? 'success' : failed ? 'error' : 'primary'}
                        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                        onClick={runTest} disabled={busy || !selectedOrderId || !selectedAgentId}
                        sx={{ borderRadius: 2, fontWeight: 'bold', minWidth: 160 }}
                    >
                        {busy ? 'Ejecutando…' : done ? '✅ Pasó' : failed ? '❌ Falló' : '▶ Iniciar Test'}
                    </Button>
                    <Button variant="outlined" color="inherit" startIcon={<Refresh />}
                        onClick={reset} disabled={busy} sx={{ borderRadius: 2 }}>Reset</Button>
                </Stack>
                {selectedOrder && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        Orden <strong>#{selectedOrder.id}</strong> — Agente actual:
                        <Chip label={selectedOrder.agent_name} size="small" sx={{ mx: 0.5 }} />
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
                                {done && !failed ? '✅ TEST EXITOSO — Asignación verificada' : '❌ TEST FALLIDO — Revisa el log'}
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
