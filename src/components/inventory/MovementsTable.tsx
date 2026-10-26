import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box
} from '@mui/material';
import dayjs from 'dayjs';
import { MovementTypeChip } from './MovementTypeChip';
import { IInventoryMovement } from '../../interfaces/inventory.types';

interface MovementsTableProps {
    movements: IInventoryMovement[];
    loading?: boolean;
}

export const MovementsTable: React.FC<MovementsTableProps> = ({ movements, loading = false }) => {
    if (loading) {
        return <Typography sx={{ p: 2, textAlign: 'center' }}>Cargando movimientos...</Typography>;
    }

    if (movements.length === 0) {
        return <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>No hay movimientos registrados</Typography>;
    }
    console.log({ movements })
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Producto</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Origen</TableCell>
                        <TableCell>Destino</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell>Usuario</TableCell>
                        <TableCell>Notas</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {movements.map((row) => (
                        <TableRow key={row.id} hover>
                            <TableCell>{dayjs(row.created_at).format('DD/MM/YYYY HH:mm')}</TableCell>
                            <TableCell>
                                <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                        {row.product?.title}{row.size ? ` · ${row.size}` : ''}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">{row.product?.sku}</Typography>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <MovementTypeChip type={row.movement_type} />
                            </TableCell>
                            <TableCell>{row.from_warehouse?.name || '—'}</TableCell>
                            <TableCell>{row.to_warehouse?.name || '—'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                {row.quantity}
                            </TableCell>
                            <TableCell>{row.user?.names || 'Sistema'}</TableCell>
                            <TableCell sx={{ maxWidth: 200 }} title={row.notes || ''}>
                                <Typography variant="body2" noWrap>{row.notes || '—'}</Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
