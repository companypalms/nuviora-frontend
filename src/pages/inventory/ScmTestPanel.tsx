import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Stepper, Step, StepLabel, StepContent,
    Button, Alert, CircularProgress, Divider, TextField, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, LinearProgress, Chip,
} from '@mui/material';
import {
    PlayArrow, CheckCircle, Error as ErrorIcon, Refresh, BugReport as BugIcon, WarningAmber,
} from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';

// ─── Constants ────────────────────────────────────────────────────────────────
const TEST_QTY = 5;
const TEST_SUPPLIER_NAME = '__TEST_PROVEEDOR_SCM__';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }
interface StockRecord { label: string; qty: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('es-VE', { hour12: false });
const apiCall = async (url: string, method: string, body?: any) => {
    const { status, response } = await request(url, method as any, body);
    const json = await response.json().catch(() => ({}));
    return { status, json };
};

// ─── Component ────────────────────────────────────────────────────────────────
export const ScmTestPanel: React.FC = () => {
    const [products, setProducts]     = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [productId, setProductId]   = useState<number>(0);
    const [warehouseId, setWarehouseId] = useState<number>(0);

    const [activeStep, setActiveStep] = useState(-1);
    const [busy, setBusy]             = useState(false);
    const [logs, setLogs]             = useState<LogEntry[]>([]);
    const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
    const [testPoRef, setTestPoRef]   = useState<string>('');
    const [done, setDone]             = useState(false);
    const [failed, setFailed]         = useState(false);

    useEffect(() => { loadSetup(); }, []);

    const loadSetup = async () => {
        const [pRes, wRes] = await Promise.all([
            request('/products', 'GET'),
            request('/warehouses', 'GET'),
        ]);
        if (pRes.status === 200) {
            const j = await pRes.response.json();
            setProducts(Array.isArray(j) ? j : (j.data?.data ?? j.data ?? []));
        }
        if (wRes.status === 200) {
            const j = await wRes.response.json();
            setWarehouses(j.data?.data ?? j.data ?? []);
        }
    };

    const log = (msg: string, status: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: ts(), status, msg }, ...prev]);

    // ── Get stock for product+warehouse via /inventory?overview=true ──────────
    const getStock = async (): Promise<number> => {
        const { status, json } = await apiCall('/inventory?overview=true', 'GET');
        if (status !== 200) {
            log(`⚠️ No se pudo leer inventario (${status})`, 'error');
            return 0;
        }
        const items: any[] = json.data ?? [];
        const match = items.find((i: any) =>
            Number(i.product_id) === productId && Number(i.warehouse_id) === warehouseId
        );
        return match ? Number(match.quantity) : 0;
    };

    // ── STEP 0: Create/reuse test supplier ────────────────────────────────────
    const step0_supplier = async (): Promise<number | null> => {
        log('Buscando proveedor de prueba existente…');
        const { status: ls, json: lj } = await apiCall('/suppliers', 'GET');
        if (ls === 200) {
            const existing = (lj.data ?? []).find((s: any) => s.name === TEST_SUPPLIER_NAME);
            if (existing) {
                log(`✅ Proveedor TEST reutilizado (ID ${existing.id})`, 'ok');
                return existing.id;
            }
        }
        const { status, json } = await apiCall('/suppliers', 'POST', {
            name: TEST_SUPPLIER_NAME,
            currency: 'USD',
            default_lead_time_days: 1,
            notes: 'Proveedor temporal de pruebas SCM — eliminar después',
            is_active: true,
        });
        if (status === 200 || status === 201) {
            log(`✅ Proveedor TEST creado (ID ${json.data?.id})`, 'ok');
            return json.data?.id ?? null;
        }
        log(`❌ Error creando proveedor: ${json.message ?? status}`, 'error');
        return null;
    };

    // ── STEP 1: Snapshot stock before ─────────────────────────────────────────
    const step1_stockBefore = async (): Promise<number> => {
        const qty = await getStock();
        setStockRecords(prev => [...prev, { label: 'ANTES', qty }]);
        log(`📦 Stock inicial: ${qty} unidades`, 'ok');
        return qty;
    };

    // ── STEP 2: Create PO ─────────────────────────────────────────────────────
    const step2_createPO = async (supplierId: number): Promise<number | null> => {
        const payload = {
            supplier_id:  supplierId,
            warehouse_id: warehouseId,
            notes: 'OC de prueba automática — SCM Test Panel',
            items: [{
                product_id:       productId,
                quantity_ordered: TEST_QTY,
                unit_cost_usd:    1.00,
            }],
        };
        const { status, json } = await apiCall('/purchase-orders', 'POST', payload);
        if (status === 200 || status === 201) {
            const ref = json.data?.reference_number ?? `ID-${json.data?.id}`;
            setTestPoRef(ref);
            log(`✅ Orden ${ref} creada (borrador)`, 'ok');
            return json.data?.id ?? null;
        }
        log(`❌ Error creando OC (${status}): ${json.message ?? JSON.stringify(json.errors ?? {})}`, 'error');
        return null;
    };

    // ── STEP 3: Walk through statuses ─────────────────────────────────────────
    const step3_statusFlow = async (poId: number): Promise<boolean> => {
        for (const nextStatus of ['sent', 'confirmed'] as const) {
            const { status, json } = await apiCall(`/purchase-orders/${poId}/status`, 'POST', { status: nextStatus });
            if (status === 200 || status === 201) {
                log(`✅ Estado → ${json.data?.status_label ?? nextStatus}`, 'ok');
            } else {
                log(`❌ Error en status '${nextStatus}' (${status}): ${json.message ?? ''}`, 'error');
                return false;
            }
        }
        return true;
    };

    // ── STEP 4: Receive stock ─────────────────────────────────────────────────
    const step4_receive = async (poId: number): Promise<boolean> => {
        const { status: gs, json: gj } = await apiCall(`/purchase-orders/${poId}`, 'GET');
        if (gs !== 200) { log('❌ No se pudo cargar la OC', 'error'); return false; }
        const items: any[] = gj.data?.items ?? [];
        if (!items.length) { log('❌ La OC no tiene items', 'error'); return false; }

        const { status, json } = await apiCall(`/purchase-orders/${poId}/receive`, 'POST', {
            items: items.map((i: any) => ({
                purchase_order_item_id: i.id,
                quantity_received:      i.quantity_ordered,
            })),
        });
        if (status === 200 || status === 201) {
            log(`✅ ${json.message ?? 'Recepción registrada'}`, 'ok');
            return true;
        }
        log(`❌ Error en recepción (${status}): ${json.message ?? ''}`, 'error');
        return false;
    };

    // ── STEP 5: Verify stock increased ───────────────────────────────────────
    const step5_verify = async (qtyBefore: number): Promise<boolean> => {
        const qtyAfter = await getStock();
        setStockRecords(prev => [...prev, { label: 'DESPUÉS', qty: qtyAfter }]);
        const diff = qtyAfter - qtyBefore;
        if (diff === TEST_QTY) {
            log(`✅ VERIFICACIÓN OK: stock +${diff} (esperado +${TEST_QTY})`, 'ok');
            return true;
        }
        log(`❌ VERIFICACIÓN FALLIDA: diff=${diff}, esperado +${TEST_QTY}`, 'error');
        return false;
    };

    // ── STEP 6: Cleanup ───────────────────────────────────────────────────────
    const step6_cleanup = async (qtyBefore: number, supplierId: number | null, poId: number | null) => {
        // 1. Cancel the test PO so the supplier guard allows deletion
        if (poId) {
            const { status: cs } = await apiCall(`/purchase-orders/${poId}/cancel`, 'POST');
            if (cs === 200 || cs === 201) {
                log('✅ OC de prueba cancelada', 'ok');
            } else {
                // PO might already be received — that's fine, received OCs don't block supplier delete
                log('ℹ️ OC ya no es cancelable (estado final)', 'info');
            }
        }

        // 2. Revert stock to original quantity
        const { status: as } = await apiCall('/inventory-movements/adjust', 'POST', {
            product_id:   productId,
            warehouse_id: warehouseId,
            new_quantity: qtyBefore,
            notes:        '[TEST SCM] Reverting stock after automated test',
        });
        if (as === 200 || as === 201) {
            log(`✅ Stock revertido a ${qtyBefore} unidades`, 'ok');
        } else {
            log(`⚠️ No se pudo revertir stock (${as})`, 'error');
        }

        // 3. Delete test supplier (now safe since received OCs don't block deletion)
        if (supplierId) {
            const { status: ds } = await apiCall(`/suppliers/${supplierId}`, 'DELETE');
            if (ds === 200 || ds === 204) {
                log('✅ Proveedor TEST eliminado', 'ok');
            } else {
                log('⚠️ Proveedor TEST no eliminado — tiene OCs de tests anteriores. Ve a la pestaña "Órdenes de Compra", cancélalas y luego borra el proveedor desde "Proveedores".', 'info');
            }
        }
        log('🧹 Limpieza completada', 'ok');
    };

    // ── Main orchestrator ─────────────────────────────────────────────────────
    const runTest = async () => {
        if (!productId || !warehouseId) {
            toast.error('Selecciona un producto y un almacén');
            return;
        }
        setBusy(true);
        setLogs([]);
        setStockRecords([]);
        setTestPoRef('');
        setDone(false);
        setFailed(false);

        let supplierId: number | null = null;
        let poId: number | null = null;
        let qtyBefore = 0;
        let testPassed = false;

        try {
            setActiveStep(0);
            log('── PASO 1: Proveedor TEST ──', 'info');
            supplierId = await step0_supplier();
            if (!supplierId) { setFailed(true); return; }

            setActiveStep(1);
            log('── PASO 2: Stock inicial ──', 'info');
            qtyBefore = await step1_stockBefore();

            setActiveStep(2);
            log(`── PASO 3: Crear OC (${TEST_QTY} u.) ──`, 'info');
            poId = await step2_createPO(supplierId);
            if (!poId) { setFailed(true); return; }

            setActiveStep(3);
            log('── PASO 4: Ciclo draft→sent→confirmed ──', 'info');
            const ok3 = await step3_statusFlow(poId);
            if (!ok3) { setFailed(true); return; }

            setActiveStep(4);
            log('── PASO 5: Recepcionar mercancía ──', 'info');
            const ok4 = await step4_receive(poId);
            if (!ok4) { setFailed(true); return; }

            setActiveStep(5);
            log('── PASO 6: Verificar stock ──', 'info');
            testPassed = await step5_verify(qtyBefore);
            if (!testPassed) setFailed(true);
            else setDone(true);

        } finally {
            setActiveStep(6);
            log('── PASO 7: Limpiar datos ──', 'info');
            await step6_cleanup(qtyBefore, supplierId, poId);
            setActiveStep(-1);
            setBusy(false);
        }
    };

    const reset = () => {
        setLogs([]);
        setStockRecords([]);
        setTestPoRef('');
        setDone(false);
        setFailed(false);
        setActiveStep(-1);
    };

    const STEP_LABELS = [
        'Crear proveedor TEST',
        'Capturar stock inicial',
        `Crear OC (${TEST_QTY} unidades)`,
        'Ciclo de estados (draft → sent → confirmed)',
        'Recepcionar mercancía',
        'Verificar variación de stock',
        'Limpiar datos de prueba',
    ];

    const before = stockRecords.find(s => s.label === 'ANTES');
    const after  = stockRecords.find(s => s.label === 'DESPUÉS');
    const diff   = before !== undefined && after !== undefined ? after.qty - before.qty : null;
    const selectedProduct   = products.find(p => p.id === productId);
    const selectedWarehouse = warehouses.find(w => w.id === warehouseId);

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <BugIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                <Box>
                    <Typography variant="h5" fontWeight="800">Panel de Pruebas — SCM Sandbox</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Simula el flujo completo de una Orden de Compra usando datos reales y limpia todo al finalizar.
                    </Typography>
                </Box>
            </Stack>

            <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3, borderRadius: 3 }}>
                Este panel <strong>ejecuta operaciones reales</strong> contra la base de datos, pero
                revierte todos los cambios al final. Úsalo solo en horarios de baja actividad.
            </Alert>

            {/* Config */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🔧 Configuración</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                    <TextField
                        select label="Producto" value={productId || ''} size="small"
                        onChange={e => setProductId(Number(e.target.value))}
                        sx={{ flex: 1 }} disabled={busy}
                    >
                        {products.map(p => (
                            <MenuItem key={p.id} value={p.id}>
                                {p.title || p.showable_name || p.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select label="Almacén de recepción" value={warehouseId || ''} size="small"
                        onChange={e => setWarehouseId(Number(e.target.value))}
                        sx={{ flex: 1 }} disabled={busy}
                    >
                        {warehouses.filter(w => w.is_active).map(w => (
                            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="contained"
                        color={done ? 'success' : failed ? 'error' : 'primary'}
                        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                        onClick={runTest}
                        disabled={busy || !productId || !warehouseId}
                        sx={{ borderRadius: 2, fontWeight: 'bold', minWidth: 160 }}
                    >
                        {busy ? 'Ejecutando…' : done ? '✅ Pasó' : failed ? '❌ Falló' : '▶ Iniciar Test'}
                    </Button>

                    <Button variant="outlined" color="inherit" startIcon={<Refresh />}
                        onClick={reset} disabled={busy} sx={{ borderRadius: 2 }}
                    >
                        Reset
                    </Button>
                </Stack>

                {productId > 0 && warehouseId > 0 && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        Se creará 1 OC de <strong>{TEST_QTY} unidades</strong> de{' '}
                        <strong>{selectedProduct?.title ?? '—'}</strong> →{' '}
                        <strong>{selectedWarehouse?.name ?? '—'}</strong>
                    </Alert>
                )}
            </Paper>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
                {/* Stepper + results */}
                <Box sx={{ flex: '0 0 320px' }}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📋 Pasos</Typography>
                        <Stepper activeStep={activeStep} orientation="vertical" sx={{ '& .MuiStepContent-root': { pb: 1 } }}>
                            {STEP_LABELS.map((label, i) => (
                                <Step key={i} completed={!busy && (done || failed) && activeStep === -1 && i < 7}>
                                    <StepLabel
                                        StepIconProps={{
                                            sx: activeStep === i ? { color: 'primary.main' } : {}
                                        }}
                                    >
                                        <Typography variant="body2">{label}</Typography>
                                    </StepLabel>
                                    {activeStep === i && (
                                        <StepContent>
                                            <LinearProgress sx={{ mt: 0.5, borderRadius: 2 }} />
                                        </StepContent>
                                    )}
                                </Step>
                            ))}
                        </Stepper>

                        {(done || failed) && (
                            <Alert
                                severity={done && !failed ? 'success' : 'error'}
                                icon={done && !failed ? <CheckCircle /> : <ErrorIcon />}
                                sx={{ mt: 2, borderRadius: 2 }}
                            >
                                {done && !failed
                                    ? '✅ TEST EXITOSO — Flujo OC verificado'
                                    : '❌ TEST FALLIDO — Revisa el log'}
                            </Alert>
                        )}
                    </Paper>

                    {/* Stock comparison */}
                    {(before || after) && (
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📊 Stock</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Momento</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Qty</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {before && (
                                        <TableRow>
                                            <TableCell>Antes</TableCell>
                                            <TableCell align="right"><strong>{before.qty}</strong></TableCell>
                                        </TableRow>
                                    )}
                                    {after && (
                                        <TableRow>
                                            <TableCell>Después</TableCell>
                                            <TableCell align="right"><strong>{after.qty}</strong></TableCell>
                                        </TableRow>
                                    )}
                                    {diff !== null && (
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Variación</TableCell>
                                            <TableCell align="right">
                                                <Chip
                                                    size="small"
                                                    label={diff >= 0 ? `+${diff}` : diff}
                                                    color={diff === TEST_QTY ? 'success' : 'error'}
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            {diff !== null && (
                                <Alert
                                    severity={diff === TEST_QTY ? 'success' : 'error'}
                                    sx={{ mt: 1.5, borderRadius: 2, py: 0.5 }}
                                >
                                    {diff === TEST_QTY
                                        ? `✅ +${TEST_QTY} correctos`
                                        : `❌ Esperado +${TEST_QTY}, obtenido ${diff >= 0 ? '+' : ''}${diff}`}
                                </Alert>
                            )}
                        </Paper>
                    )}
                </Box>

                {/* Event log */}
                <Paper elevation={0} sx={{ flex: 1, minWidth: 0, p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">🖥️ Log de Eventos</Typography>
                        {testPoRef && <Chip label={testPoRef} size="small" color="primary" variant="outlined" />}
                    </Stack>

                    {logs.length === 0 ? (
                        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                            El log aparecerá aquí cuando inicies el test…
                        </Typography>
                    ) : (
                        <Box sx={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {logs.map((l, i) => (
                                <Box key={i} sx={{
                                    py: 0.75, px: 1.5, borderRadius: 1.5,
                                    bgcolor: l.status === 'ok' ? 'rgba(34,197,94,0.08)'
                                        : l.status === 'error' ? 'rgba(239,68,68,0.08)'
                                        : 'action.hover',
                                    borderLeft: '3px solid',
                                    borderColor: l.status === 'ok' ? 'success.main'
                                        : l.status === 'error' ? 'error.main' : 'info.main',
                                }}>
                                    <Stack direction="row" spacing={1} alignItems="baseline">
                                        <Typography variant="caption" color="text.disabled"
                                            sx={{ fontFamily: 'monospace', flexShrink: 0 }}>
                                            {l.ts}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                            {l.msg}
                                        </Typography>
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
