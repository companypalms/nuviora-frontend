import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Button, Alert, CircularProgress, 
    Divider, TextField, MenuItem, Table, TableHead, TableRow, 
    TableCell, TableBody, Chip, Stepper, Step, StepLabel, StepContent,
    LinearProgress, Paper, Grid
} from '@mui/material';
import {
    PlayArrow, Refresh, CheckCircle, Error as ErrorIcon,
} from '@mui/icons-material';
import { request } from '../../../common/request';
import { IResponse } from '../../../interfaces/response-type';

interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }

export const InventorySizesTest: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [productId, setProductId] = useState<number>(0);
    const [size, setSize] = useState<string>('');
    const [busy, setBusy] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeStep, setActiveStep] = useState(-1);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        loadSetup();
    }, []);

    const loadSetup = async () => {
        const { status, response }: IResponse = await request('/inventory', 'GET');
        if (status) {
            const data = await response.json();
            const rawList = data.data ?? [];
            
            // 1. Eliminar duplicados (un registro por producto, sin importar el almacén)
            const uniqueMap = new Map();
            rawList.forEach((item: any) => {
                if (!uniqueMap.has(item.product_id)) {
                    uniqueMap.set(item.product_id, item);
                }
            });

            // 2. Convertir a array y ordenar alfabéticamente
            const cleanList = Array.from(uniqueMap.values())
                .sort((a, b) => a.name.localeCompare(b.name));

            setProducts(cleanList);
        }
    };

    const log = (msg: string, status: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: new Date().toLocaleTimeString(), status, msg }, ...prev]);

    const getStockForSize = async (pId: number, targetSize: string): Promise<number> => {
        const { status, response }: IResponse = await request('/inventory', 'GET');
        if (!status) return 0;
        const data = await response.json();
        // Buscar el registro específico de la Bodega Central (ID 1) o el primero que tenga stock
        const list = data.data ?? [];
        const p = list.find((x: any) => x.product_id === pId && (x.id > 0 || list.filter((i:any)=>i.product_id===pId).length === 1));
        
        const byVariant = (p?.variants_stock ?? []) as Array<{ title: string; quantity: number }>;
        if (byVariant.length) {
            log(`DEBUG: Tallas en BD: ${byVariant.map(v => `${v.title}: ${v.quantity}`).join(', ')}`, 'info');
        }

        return byVariant.find(v => v.title.toLowerCase() === targetSize.toLowerCase())?.quantity ?? 0;
    };

    const runTest = async () => {
        if (!productId || !size) return;
        setBusy(true); setLogs([]); setDone(false); setFailed(false);

        let initialQty = 0;
        const testQty = 2;
        const TEST_WAREHOUSE_ID = 1;

        try {
            setActiveStep(0);
            log(`Capturando stock inicial para ${size}...`);
            initialQty = await getStockForSize(productId, size);
            log(`Stock inicial detectado: ${initialQty}`, 'ok');

            setActiveStep(1);
            log(`Ejecutando entrada manual (IN) de +${testQty} unidades en talla ${size}...`);
            
            const payload = {
                product_id: productId,
                warehouse_id: TEST_WAREHOUSE_ID,
                type: 'IN',
                quantity: testQty,
                note: `[QA TEST] Simulación talla ${size}`,
                sizes: { [size]: testQty }
            };

            const { status: s1, response: r1 }: IResponse = await request("/stock/movements", "POST", payload);
            if (!s1) { 
                const err = await r1.json().catch(()=>({}));
                log(`Error en movimiento: ${err.message ?? 'Error desconocido'}`, 'error'); 
                setFailed(true); return; 
            }
            log('Movimiento IN registrado correctamente', 'ok');

            setActiveStep(2);
            log('Verificando actualización del inventario matricial...');
            // Pequeña espera para asegurar que la BD procesó
            await new Promise(r => setTimeout(r, 800));
            const afterInQty = await getStockForSize(productId, size);
            
            if (afterInQty === initialQty + testQty) {
                log(`Verificación exitosa: ${afterInQty} unidades (esperado ${initialQty + testQty})`, 'ok');
            } else {
                log(`Fallo en verificación: hay ${afterInQty}, se esperaba ${initialQty + testQty}`, 'error');
                setFailed(true); return;
            }

            setActiveStep(3);
            log(`Revirtiendo cambios (OUT -${testQty})...`);
            const revertPayload = {
                product_id: productId,
                warehouse_id: TEST_WAREHOUSE_ID,
                type: 'OUT',
                quantity: testQty,
                note: `[QA TEST] Reversión talla ${size}`,
                sizes: { [size]: testQty }
            };

            const { status: s2 } = await request("/stock/movements", "POST", revertPayload);
            if (!s2) { log('Error revirtiendo el movimiento', 'error'); setFailed(true); return; }
            log('Movimiento OUT (reversión) registrado', 'ok');

            setActiveStep(4);
            log('Verificación final de estado limpio...');
            await new Promise(r => setTimeout(r, 500));
            const finalQty = await getStockForSize(productId, size);
            if (finalQty === initialQty) {
                log(`Estado restaurado correctamente: ${finalQty} unidades`, 'ok');
                setDone(true);
            } else {
                log(`ADVERTENCIA: El stock quedó en ${finalQty} (esperado ${initialQty})`, 'error');
                setFailed(true);
            }

        } catch (e) {
            log(`Error inesperado: ${e}`, 'error');
            setFailed(true);
        } finally {
            setBusy(false);
            setActiveStep(-1);
        }
    };

    const selectedProduct = products.find(p => p.product_id === productId);

    return (
        <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
                Simulación de Inventario por Talla
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Este test verifica que el flujo de entrada y salida manual actualice correctamente la matriz JSON de tallas y luego revierte los cambios para dejar el inventario limpio.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <TextField
                        select
                        label="Producto con Tallas"
                        value={productId || ''}
                        onChange={e => {
                            const val = Number(e.target.value);
                            setProductId(val);
                            const p = products.find(x => x.product_id === val);
                            const sizes = (p?.variants_stock ?? []).map((v: { title: string }) => v.title);
                            if (sizes.length === 1) {
                                setSize(sizes[0]);
                            } else if (sizes.length === 0 && p?.product?.name?.includes('-')) {
                                // Intento de inferir talla del nombre original de Shopify si no hay tallas definidas
                                const inferred = p.product.name.split('-').pop().trim();
                                if (inferred.length <= 5) setSize(inferred);
                            } else {
                                setSize('');
                            }
                        }}
                        sx={{ flex: 1 }}
                        size="small"
                        disabled={busy}
                    >
                        {products.map(p => (
                            <MenuItem key={p.product_id} value={p.product_id}>{p.name}</MenuItem>
                        ))}
                    </TextField>

                    { ((selectedProduct?.variants_stock ?? []).length > 0) ? (
                        <TextField
                            select
                            label="Talla a Testear"
                            value={size}
                            onChange={e => setSize(e.target.value)}
                            sx={{ flex: 1 }}
                            size="small"
                            disabled={busy || !productId}
                        >
                            {selectedProduct.variants_stock.map((v: { title: string }) => (
                                <MenuItem key={v.title} value={v.title}>{v.title}</MenuItem>
                            ))}
                        </TextField>
                    ) : (
                        <TextField
                            label="Talla (Escribe una)"
                            value={size}
                            onChange={e => setSize(e.target.value.toUpperCase())}
                            sx={{ flex: 1 }}
                            size="small"
                            placeholder="Ej: S, M, L, XL..."
                            disabled={busy || !productId}
                            helperText="Producto sin tallas configuradas. Escribe una para probar."
                        />
                    )}

                    <Button
                        variant="contained"
                        startIcon={busy ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                        onClick={runTest}
                        disabled={busy || !productId || !size}
                        sx={{ borderRadius: 2, px: 4, height: 40 }}
                    >
                        Iniciar Test
                    </Button>
                </Stack>
            </Paper>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Pasos del Proceso</Typography>
                    <Stepper activeStep={activeStep} orientation="vertical">
                        <Step><StepLabel>Capturar stock inicial</StepLabel></Step>
                        <Step><StepLabel>Simular Entrada (+2)</StepLabel></Step>
                        <Step><StepLabel>Verificar matriz JSON</StepLabel></Step>
                        <Step><StepLabel>Revertir cambios (Salida -2)</StepLabel></Step>
                        <Step><StepLabel>Verificar limpieza</StepLabel></Step>
                    </Stepper>

                    {done && <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>✅ Simulación completada con éxito</Alert>}
                    {failed && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>❌ La simulación falló. Revisar logs.</Alert>}
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>🖥️ Log de Ejecución</Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300, overflowY: 'auto', bgcolor: 'background.default', borderRadius: 2 }}>
                        {logs.length === 0 && <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>Esperando inicio...</Typography>}
                        {logs.map((l, i) => (
                            <Box key={i} sx={{ mb: 0.5, display: 'flex', gap: 1 }}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>[{l.ts}]</Typography>
                                <Typography variant="body2" color={l.status === 'error' ? 'error.main' : l.status === 'ok' ? 'success.main' : 'text.primary'}>
                                    {l.msg}
                                </Typography>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};
