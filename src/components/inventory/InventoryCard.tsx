import React from 'react';
import {
    Card,
    CardContent,
    Box,
    Divider,
    IconButton,
    Tooltip,
    Chip
} from '@mui/material';
import {
    History as HistoryIcon,
    SwapHoriz as TransferIcon,
    Edit as EditIcon,
    Tune as AdjustIcon,
    Straighten as VariantsIcon,
    ReportProblemOutlined as DefectiveIcon,
    HeartBrokenOutlined as DamagedIcon
} from '@mui/icons-material';
import { IProductStock } from '../../interfaces/inventory.types';
import { TypographyCustom } from '../custom';

interface InventoryCardProps {
    productStock: IProductStock;
    onTransfer?: (product: IProductStock) => void;
    onAdjust?: (product: IProductStock) => void;
    onEdit?: (product: IProductStock) => void;
    onVariants?: (product: IProductStock) => void;
    onViewHistory: (product: IProductStock) => void;
    onReviewDefective?: (product: IProductStock) => void; // solo el Admin
    onSendToReview?: (product: IProductStock) => void;    // dañada o perdida: pasa a revisión (Módulo 4, R8); solo el Admin
    // Módulo 5 (§14, R1): lo apartado por órdenes sin entregar (sigue en la agencia) y lo que viene del proveedor
    flow?: { reserved: number; incoming: number; incomingNextAt: string | null };
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
    productStock,
    onTransfer,
    onAdjust,
    onEdit,
    onVariants,
    onViewHistory,
    onReviewDefective,
    onSendToReview,
    flow
}) => {
    const { product, warehouses, total_quantity } = productStock;
    // En revisión (Fran, 2026-10-02; Módulo 4, R3 y R8): las que vuelven de un cambio y las dañadas o perdidas. Se
    // muestran aparte y no cuentan como disponibles
    const defective = warehouses.filter((w) => (w.defective_stock ?? 0) > 0);
    // "Sin variante" sin contar las defectuosas que no tienen talla (esas van en su apartado)
    const unassignedUseful = (w: IProductStock['warehouses'][number]) =>
        (w.unassigned ?? 0) - Math.max(0, (w.defective_stock ?? 0) - (w.variants_stock ?? []).reduce((sum, v) => sum + v.defective_stock, 0));

    // Calculate stock status color
    const getStockColor = (qty: number) => {
        if (qty <= 0) return 'error.main';
        if (qty < 10) return 'warning.main'; // Threshold could be configurable
        return 'success.main';
    };
    return (
        <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <TypographyCustom variant="h6" component="div" noWrap title={product?.title}>
                            {product?.title}
                        </TypographyCustom>
                        <TypographyCustom variant="body2" color="text.secondary">
                            SKU: {product?.sku || 'N/A'}
                        </TypographyCustom>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <TypographyCustom variant="h5" color={getStockColor(total_quantity)} fontWeight="bold">
                            {total_quantity}
                        </TypographyCustom>
                        <TypographyCustom variant="caption" color="text.secondary">
                            Total
                        </TypographyCustom>
                    </Box>
                </Box>

                {flow && (flow.reserved > 0 || flow.incoming > 0) && (
                    <TypographyCustom variant="caption" color="text.secondary" display="block" sx={{ mt: -1 }}>
                        {flow.reserved > 0 && <>Apartado en órdenes: <b>{flow.reserved}</b> (sigue en la agencia)</>}
                        {flow.reserved > 0 && flow.incoming > 0 && ' · '}
                        {flow.incoming > 0 && <>Por recibir: <b>{flow.incoming}</b>{flow.incomingNextAt ? ` (llega el ${flow.incomingNextAt.slice(8, 10)}/${flow.incomingNextAt.slice(5, 7)})` : ''}</>}
                    </TypographyCustom>
                )}

                <Divider sx={{ my: 1.5 }} />

                <TypographyCustom variant="subtitle2" gutterBottom>
                    Stock por Almacén
                </TypographyCustom>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {warehouses.map((w) => (
                        <Box key={w.warehouse_id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, borderBottom: '1px solid', borderColor: 'divider', pb: 1, '&:last-child': { borderBottom: 0 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <TypographyCustom variant="body2" sx={{ flex: 1, fontWeight: 'bold' }} noWrap>
                                    {w.warehouse_name}
                                </TypographyCustom>
                                <TypographyCustom
                                    variant="body2"
                                    fontWeight="bold"
                                    color={w.quantity - (w.defective_stock ?? 0) > 0 ? 'primary.main' : 'text.disabled'}
                                >
                                    {w.quantity - (w.defective_stock ?? 0)}
                                </TypographyCustom>
                            </Box>
                            
                            {/* Tarea 4: stock por talla o variante, y lo cargado sin variante */}
                            {(w.variants_stock ?? []).length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {(w.variants_stock ?? []).map((v) => (
                                        <Chip
                                            key={v.variant_id}
                                            label={`${v.title}: ${v.quantity - v.defective_stock}`}
                                            size="small"
                                            variant="outlined"
                                            color={v.quantity < 0 ? 'error' : 'default'}
                                            sx={{ height: 18, fontSize: '0.65rem', borderRadius: 1, opacity: v.is_active ? 1 : 0.6 }}
                                        />
                                    ))}
                                    {unassignedUseful(w) !== 0 && (
                                        <Tooltip title={unassignedUseful(w) > 0
                                            ? 'Cargadas sin decir la talla: no se venden por talla. Repártelas con "Ajustar".'
                                            : 'Las tallas suman más que el total: revisar en el conteo.'}>
                                            <Chip
                                                label={`Sin variante: ${unassignedUseful(w)}`}
                                                size="small"
                                                color={unassignedUseful(w) > 0 ? 'warning' : 'error'}
                                                sx={{ height: 18, fontSize: '0.65rem', borderRadius: 1 }}
                                            />
                                        </Tooltip>
                                    )}
                                </Box>
                            )}
                        </Box>
                    ))}
                    {warehouses.length === 0 && (
                        <TypographyCustom variant="body2" color="text.secondary" fontStyle="italic">
                            Sin stock en almacenes
                        </TypographyCustom>
                    )}
                </Box>

                {defective.length > 0 && (
                    <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, border: '1px dashed', borderColor: 'warning.main', bgcolor: 'rgba(237,108,2,0.06)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Tooltip title="Volvieron de un cambio, o se pasaron a revisión por dañadas o perdidas. Están en el almacén, pero no se venden hasta revisarlas.">
                                <TypographyCustom variant="subtitle2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <DefectiveIcon fontSize="small" /> En revisión
                                </TypographyCustom>
                            </Tooltip>
                            {onReviewDefective && (
                                <Chip label="Revisar" size="small" color="warning" onClick={() => onReviewDefective(productStock)} sx={{ height: 22 }} />
                            )}
                        </Box>
                        {defective.map((w) => (
                            <Box key={w.warehouse_id} sx={{ mt: 0.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <TypographyCustom variant="caption" noWrap>{w.warehouse_name}</TypographyCustom>
                                    <TypographyCustom variant="caption" fontWeight="bold" color="warning.main">{w.defective_stock}</TypographyCustom>
                                </Box>
                                {(w.variants_stock ?? []).some((v) => v.defective_stock > 0) && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {(w.variants_stock ?? []).filter((v) => v.defective_stock > 0).map((v) => (
                                            <Chip key={v.variant_id} label={`${v.title}: ${v.defective_stock}`} size="small" variant="outlined" color="warning" sx={{ height: 18, fontSize: '0.65rem', borderRadius: 1 }} />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
            </CardContent>

            <Divider />

            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-around' }}>
                {onTransfer && (
                    <Tooltip title="Transferir Stock">
                        <IconButton size="small" color="primary" onClick={() => onTransfer(productStock)}>
                            <TransferIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {onAdjust && (
                    <Tooltip title="Ajustar Stock (Cantidades)">
                        <IconButton size="small" color="warning" onClick={() => onAdjust(productStock)}>
                            <AdjustIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {onSendToReview && (
                    <Tooltip title="Pasar a revisión (dañada o perdida)">
                        <IconButton size="small" color="error" onClick={() => onSendToReview(productStock)}>
                            <DamagedIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {onVariants && (
                    <Tooltip title="Tallas y variantes">
                        <IconButton size="small" color="secondary" onClick={() => onVariants(productStock)}>
                            <VariantsIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {onEdit && (
                    <Tooltip title="Editar Producto (nombre, precio...)">
                        <IconButton size="small" color="info" onClick={() => onEdit(productStock)}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                )}
                <Tooltip title="Ver Historial">
                    <IconButton size="small" onClick={() => onViewHistory(productStock)}>
                        <HistoryIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        </Card>
    );
};
