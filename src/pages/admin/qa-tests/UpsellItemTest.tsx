import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Stepper, Step, StepLabel, StepContent,
    Button, Alert, CircularProgress, LinearProgress, TextField, MenuItem,
    Chip, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { PlayArrow, CheckCircle, Error as ErrorIcon, Refresh, WarningAmber } from '@mui/icons-material';
import { request } from '../../../common/request';

interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }
interface OrderOption { id: number; label: string; itemCount: number; }
interface ProductOption { id: number; name: string; price: number; }
interface ItemRecord { label: string; count: number; }

const ts = () => new Date().toLocaleTimeString('es-VE', { hour12: false });
const apiCall = async (url: string, method: string, body?: any) => {
    const { status, response } = await request(url, method as any, body);
    const json = await response.json().catch(() => ({}));
    return { status, json };
};

const STEP_LABELS = [
    'Cargar orden y contar ítems actuales',
    'Añadir ítem de upsell (producto de prueba)',
    'Verificar que el ítem fue añadido',
    'Eliminar ítem de upsell',
    'Verificar que el ítem fue removido',
];

export const UpsellItemTest: React.FC = () => {
    const [orders, setOrders] = useState<OrderOption[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
    const [selectedProductId, setSelectedProductId] = useState<number>(0);
    const [activeStep, setActiveStep] = useState(-1);
    const [busy, setBusy] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);
    const [itemRecords, setItemRecords] = useState<ItemRecord[]>([]);
    const [addedItemId, setAddedItemId] = useState<number | null>(null);

    useEffect(() => { loadSetup(); }, []);

    const loadSetup = async () => {
        const [oRes, pRes] = await Promise.all([
            request('/orders', 'GET'),
            request('/products', 'GET'),
        ]);
        if (oRes.status === 200) {
            const j = await oRes.response.json();
            const list = Array.isArray(j) ? j : (j.data?.data ?? j.data ?? j.orders ?? []);
            setOrders(list.slice(0, 60).map((o: any) => ({
                id: o.id,
                label: `#${o.id} ${o.name ? '('+o.name+')' : ''} — ${o.client_name ?? o.customer?.name ?? o.client?.name ?? 'S/N'} (${o.status?.description ?? '?'})`,
                itemCount: o.products?.length ?? o.items?.length ?? 0,
            })));
        }
        if (pRes.status === 200) {
            const j = await pRes.response.json();
            const list = Array.isArray(j) ? j : (j.data?.data ?? j.data ?? []);
            setProducts(list.slice(0, 80).map((p: any) => ({
                id: p.id,
                name: p.title ?? p.showable_name ?? p.name ?? `Producto #${p.id}`,
                price: p.price ?? p.sale_price ?? 0,
            })));
        }
    };

    const log = (msg: string, st: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: ts(), status: st, msg }, ...prev]);

    const runTest = async () => {
        if (!selectedOrderId || !selectedProductId) return;
        setBusy(true); setLogs([]); setItemRecords([]); setDone(false); setFailed(false); setAddedItemId(null);
        let createdItemId: number | null = null;
        let testPassed = false;
        let itemsCountBefore = 0;

        try {
            setActiveStep(0);
            log(`── PASO 1: Cargando ítems de la orden #${selectedOrderId} ──`, 'info');
            const { status: gs, json: gj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            if (gs !== 200) { log(`❌ No se pudo cargar la orden (${gs})`, 'error'); setFailed(true); return; }
            const orderData = gj.data ?? gj;
            const currentItems: any[] = orderData.products ?? orderData.items ?? orderData.order_items ?? [];
            itemsCountBefore = currentItems.length;
            log(`✅ Orden cargada. Ítems actuales: ${itemsCountBefore}`, 'ok');
            setItemRecords([{ label: 'ANTES', count: itemsCountBefore }]);

            setActiveStep(1);
            const product = products.find(p => p.id === selectedProductId);
            log(`── PASO 2: Añadiendo upsell — "${product?.name}" (qty=1) ──`, 'info');
            const { status: us, json: uj } = await apiCall(`/orders/${selectedOrderId}/upsell`, 'POST', {
                product_id: selectedProductId,
                quantity: 1,
                price: product?.price ?? 0,
            });
            if (us !== 200 && us !== 201) {
                log(`❌ Error al añadir upsell (${us}): ${uj.message ?? JSON.stringify(uj.errors ?? {})}`, 'error');
                setFailed(true); return;
            }
            createdItemId = uj.data?.id ?? uj.item?.id ?? uj.id ?? null;
            setAddedItemId(createdItemId);
            log(`✅ Ítem añadido. ID del item: ${createdItemId ?? '(buscar en lista)'}`, 'ok');

            setActiveStep(2);
            log('── PASO 3: Verificando que el ítem existe ──', 'info');
            const { status: vs, json: vj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const verifyData = vj.data ?? vj;
            const newItems: any[] = verifyData.products ?? verifyData.items ?? verifyData.order_items ?? [];
            setItemRecords(prev => [...prev, { label: 'DESPUÉS', count: newItems.length }]);

            if (vs === 200 && newItems.length > itemsCountBefore) {
                log(`✅ VERIFICACIÓN OK: items ${itemsCountBefore} → ${newItems.length} (+1)`, 'ok');
                // Try to find the item ID if we didn't get it from the upsell response
                if (!createdItemId) {
                    const addedItem = newItems.find((i: any) => i.product_id === selectedProductId);
                    createdItemId = addedItem?.id ?? null;
                    setAddedItemId(createdItemId);
                    log(`ℹ️ ID del ítem añadido: ${createdItemId}`, 'info');
                }
                testPassed = true;
            } else {
                log(`❌ VERIFICACIÓN FALLIDA: esperado > ${itemsCountBefore} ítems, obtenido ${newItems.length}`, 'error');
                setFailed(true);
            }

        } finally {
            setActiveStep(3);
            log(`── PASO 4: Eliminando ítem de upsell (ID ${createdItemId}) ──`, 'info');
            if (createdItemId) {
                const { status: ds, json: dj } = await apiCall(
                    `/orders/${selectedOrderId}/upsell/${createdItemId}`, 'DELETE'
                );
                if (ds === 200 || ds === 204) {
                    log(`✅ Ítem eliminado correctamente`, 'ok');
                } else {
                    log(`⚠️ No se pudo eliminar el ítem (${ds}): ${dj.message ?? ''}. Eliminar manualmente.`, 'error');
                }
            } else {
                log('⚠️ Sin ID de ítem para eliminar. Verificar manualmente.', 'error');
            }

            setActiveStep(4);
            log('── PASO 5: Verificando que el ítem fue removido ──', 'info');
            const { status: fvs, json: fvj } = await apiCall(`/orders/${selectedOrderId}`, 'GET');
            const finalItems: any[] = (fvj.data ?? fvj)?.products ?? (fvj.data ?? fvj)?.items ?? [];
            if (fvs === 200 && finalItems.length <= itemsCountBefore) {
                log(`✅ Limpieza verificada: ${finalItems.length} ítems (igual o menos que antes)`, 'ok');
            } else {
                log(`⚠️ Estado final: ${finalItems.length} ítems (esperado ≤ ${itemsCountBefore}). Revisar manualmente.`, 'info');
            }

            log('🧹 Limpieza completada', 'ok');
            if (testPassed) setDone(true);
            setActiveStep(-1);
            setBusy(false);
        }
    };

    const reset = () => { setLogs([]); setItemRecords([]); setDone(false); setFailed(false); setActiveStep(-1); setAddedItemId(null); };
    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const before = itemRecords.find(r => r.label === 'ANTES');
    const after = itemRecords.find(r => r.label === 'DESPUÉS');

    return (
        <Box>
            <Alert severity="info" icon={<CheckCircle />} sx={{ mb: 3, borderRadius: 3 }}>
                <strong>Test más seguro:</strong> Añade un producto a la orden via upsell y lo elimina de inmediato.
                Es completamente reversible vía <code>DELETE /orders/{'{id}'}/upsell/{'{itemId}'}</code>.
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
                        select label="Producto a añadir" value={selectedProductId || ''} size="small"
                        onChange={e => setSelectedProductId(Number(e.target.value))}
                        sx={{ flex: 1, minWidth: 200 }} disabled={busy}
                    >
                        {products.map(p => (
                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                    </TextField>
                    <Button
                        variant="contained" color={done ? 'success' : failed ? 'error' : 'primary'}
                        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                        onClick={runTest} disabled={busy || !selectedOrderId || !selectedProductId}
                        sx={{ borderRadius: 2, fontWeight: 'bold', minWidth: 160 }}
                    >
                        {busy ? 'Ejecutando…' : done ? '✅ Pasó' : failed ? '❌ Falló' : '▶ Iniciar Test'}
                    </Button>
                    <Button variant="outlined" color="inherit" startIcon={<Refresh />}
                        onClick={reset} disabled={busy} sx={{ borderRadius: 2 }}>Reset</Button>
                </Stack>
                {selectedOrder && selectedProduct && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        Se añadirá <Chip label={selectedProduct.name} size="small" color="primary" sx={{ mx: 0.5 }} />
                        (x1) a la orden <strong>#{selectedOrder.id}</strong> y luego se eliminará.
                        {addedItemId && <> · Item ID creado: <Chip label={`#${addedItemId}`} size="small" color="warning" sx={{ mx: 0.5 }} /></>}
                    </Alert>
                )}
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
                                {done && !failed ? '✅ TEST EXITOSO — Upsell verificado y revertido' : '❌ TEST FALLIDO — Revisa el log'}
                            </Alert>
                        )}
                    </Paper>

                    {(before || after) && (
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📦 Ítems</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Momento</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }} align="right"># Ítems</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {before && <TableRow><TableCell>Antes</TableCell><TableCell align="right"><strong>{before.count}</strong></TableCell></TableRow>}
                                    {after && (
                                        <TableRow>
                                            <TableCell>Después</TableCell>
                                            <TableCell align="right">
                                                <Chip size="small" label={after.count}
                                                    color={after.count > (before?.count ?? 0) ? 'success' : 'error'}
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
