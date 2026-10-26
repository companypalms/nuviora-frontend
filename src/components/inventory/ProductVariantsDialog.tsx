import React, { useEffect, useState } from 'react';
import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { DeleteOutline as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { ButtonCustom } from '../custom';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IProduct } from '../../interfaces/inventory.types';

interface VariantRow {
    id: number;
    title: string;
    sku?: string | null;
    shopify_variant_id?: string | null;
    is_active: boolean;
    stock: number;
    order_lines: number;
}

interface Props {
    open: boolean;
    product?: IProduct;
    onClose: () => void;
    onChanged?: () => void;
}

/**
 * Tarea 4: las tallas y variantes de un producto. Las de Shopify se agregan solas al llegar un pedido;
 * aquí se ven, se crean, se renombran y se desactivan. Con stock o pedidos no se borran: se desactivan.
 */
export const ProductVariantsDialog: React.FC<Props> = ({ open, product, onClose, onChanged }) => {
    const [rows, setRows] = useState<VariantRow[]>([]);
    const [edits, setEdits] = useState<Record<number, { title: string; sku: string }>>({});
    const [newTitle, setNewTitle] = useState('');
    const [newSku, setNewSku] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        if (!product) return;
        const { status, response }: IResponse = await request(`/products/${product.id}/variants`, 'GET');
        if (status) {
            const data = await response.json();
            setRows(data.data ?? []);
            setEdits({});
        }
    };

    useEffect(() => {
        if (open) {
            setNewTitle('');
            setNewSku('');
            load();
        }
    }, [open, product?.id]);

    const send = async (url: string, method: 'POST' | 'PUT' | 'DELETE', body?: object) => {
        setBusy(true);
        try {
            const { status, response }: IResponse = await request(url, method, body ? JSON.stringify(body) : undefined);
            const data = await response.json().catch(() => ({}));
            if (status >= 200 && status < 300) {
                setRows(data.data ?? rows);
                setEdits({});
                toast.success(data.message ?? 'Listo');
                onChanged?.();
                return true;
            }
            toast.error(data.message ?? 'No se pudo guardar');
        } catch {
            toast.error('Error de conexión');
        } finally {
            setBusy(false);
        }
        return false;
    };

    const add = async () => {
        if (!product || !newTitle.trim()) return;
        if (await send(`/products/${product.id}/variants`, 'POST', { title: newTitle.trim(), sku: newSku.trim() || null })) {
            setNewTitle('');
            setNewSku('');
        }
    };

    const edited = (r: VariantRow) => edits[r.id] ?? { title: r.title, sku: r.sku ?? '' };
    const isDirty = (r: VariantRow) => !!edits[r.id] && (edits[r.id].title !== r.title || edits[r.id].sku !== (r.sku ?? ''));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Tallas y variantes · {product?.title}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Las de Shopify se agregan solas cuando llega un pedido. Para cargar el stock de cada una, usa Entrada o Ajustar.
                    Una variante con stock o pedidos no se borra: se desactiva y deja de ofrecerse.
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Variante</TableCell>
                                <TableCell>SKU</TableCell>
                                <TableCell>Shopify</TableCell>
                                <TableCell align="right">Stock</TableCell>
                                <TableCell align="right">Pedidos</TableCell>
                                <TableCell align="center">Activa</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map(r => (
                                <TableRow key={r.id} sx={{ opacity: r.is_active ? 1 : 0.6 }}>
                                    <TableCell sx={{ minWidth: 140 }}>
                                        <TextField size="small" variant="standard" value={edited(r).title}
                                            onChange={(e) => setEdits({ ...edits, [r.id]: { ...edited(r), title: e.target.value } })} />
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 110 }}>
                                        <TextField size="small" variant="standard" value={edited(r).sku}
                                            onChange={(e) => setEdits({ ...edits, [r.id]: { ...edited(r), sku: e.target.value } })} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary">{r.shopify_variant_id ?? '—'}</Typography>
                                    </TableCell>
                                    <TableCell align="right">{r.stock}</TableCell>
                                    <TableCell align="right">{r.order_lines}</TableCell>
                                    <TableCell align="center">
                                        <Switch size="small" checked={r.is_active} disabled={busy}
                                            onChange={(e) => send(`/product-variants/${r.id}`, 'PUT', { is_active: e.target.checked })} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                        {isDirty(r) && (
                                            <Tooltip title="Guardar">
                                                <IconButton size="small" color="primary" disabled={busy}
                                                    onClick={() => send(`/product-variants/${r.id}`, 'PUT', { title: edited(r).title, sku: edited(r).sku || null })}>
                                                    <SaveIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title={r.stock !== 0 || r.order_lines > 0 ? 'Tiene stock o pedidos: desactívala' : 'Borrar'}>
                                            <span>
                                                <IconButton size="small" color="error" disabled={busy || r.stock !== 0 || r.order_lines > 0}
                                                    onClick={() => { if (confirm(`¿Borrar la variante ${r.title}?`)) send(`/product-variants/${r.id}`, 'DELETE'); }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Typography variant="body2" color="text.secondary">Sin variantes: el stock se lleva solo por total.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField size="small" label="Nueva variante (ej. M, Negro / M)" value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)} sx={{ flex: '1 1 200px' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
                    <TextField size="small" label="SKU (opcional)" value={newSku}
                        onChange={(e) => setNewSku(e.target.value)} sx={{ flex: '0 1 160px' }} />
                    <ButtonCustom onClick={add} disabled={busy || !newTitle.trim()}>Agregar</ButtonCustom>
                </Box>
            </DialogContent>
            <DialogActions>
                <ButtonCustom variant="outlined" onClick={onClose}>Cerrar</ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
