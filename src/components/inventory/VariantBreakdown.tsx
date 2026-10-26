import React from 'react';
import { Alert, Box, Grid, TextField, Typography } from '@mui/material';
import { IProductVariant } from '../../interfaces/inventory.types';
import { variantSum } from '../../common/variants';

interface VariantBreakdownProps {
    variants: IProductVariant[];
    /** Cantidad por variante: {variant_id: cantidad} */
    value: Record<number, number>;
    onChange: (value: Record<number, number>) => void;
    /**
     * split: reparte una cantidad (entrada, salida, traslado); lo que no se reparte va "sin variante".
     * absolute: fija la cantidad de cada variante (ajuste).
     */
    mode?: 'split' | 'absolute';
    /** La cantidad total de la operación (split) o el nuevo total (absolute) */
    total: number;
    /** Stock actual de cada variante en el almacén, para mostrarlo */
    available?: Record<number, number>;
}

/**
 * Tarea 4: cantidades por talla o variante de un movimiento de stock. En una entrada o salida, lo que no
 * se reparte queda como stock "sin variante"; en un ajuste, lo repartido no puede superar el total.
 */
export const VariantBreakdown: React.FC<VariantBreakdownProps> = ({ variants, value, onChange, mode = 'split', total, available }) => {
    const shown = variants.filter(v => v.is_active || (value[v.id] ?? 0) !== 0 || (available?.[v.id] ?? 0) !== 0);
    if (shown.length === 0) return null;
    const current = (id: number) => value[id] ?? (mode === 'absolute' ? (available?.[id] ?? 0) : 0);
    const sum = mode === 'absolute' ? shown.reduce((a, v) => a + current(v.id), 0) : variantSum(value);
    const rest = total - sum;

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Typography variant="body2" fontWeight={700} mb={0.5}>📦 Por talla o variante</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                {mode === 'absolute'
                    ? 'Cuántas hay de cada una. Las que no toques no cambian.'
                    : 'Cuántas son de cada una. Lo que no repartas queda "sin variante" y no se vende por talla.'}
            </Typography>
            <Grid container spacing={1}>
                {shown.map(v => (
                    <Grid size={{ xs: 6, sm: 4 }} key={v.id}>
                        <TextField
                            label={v.title}
                            size="small"
                            type="number"
                            value={current(v.id)}
                            onChange={(e) => onChange({ ...value, [v.id]: Math.max(0, Number(e.target.value)) })}
                            inputProps={{ min: 0 }}
                            helperText={available ? `Hay ${available[v.id] ?? 0}` : undefined}
                            fullWidth
                        />
                    </Grid>
                ))}
            </Grid>
            {sum > total && (
                <Alert severity="error" sx={{ mt: 1.5, py: 0 }}>
                    {mode === 'absolute' ? `Las tallas suman ${sum} y el total es ${total}.` : `Repartiste ${sum} y la cantidad es ${total}.`}
                </Alert>
            )}
            {sum <= total && rest > 0 && (mode === 'absolute' || sum > 0) && (
                <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>{rest} quedan sin variante.</Alert>
            )}
        </Box>
    );
};
