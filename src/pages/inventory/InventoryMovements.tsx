import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Grid,
    TextField,
    MenuItem,
    IconButton,
    Pagination
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { MovementsTable } from '../../components/inventory/MovementsTable';
import { WarehouseSelector } from '../../components/inventory/WarehouseSelector';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IInventoryMovement } from '../../interfaces/inventory.types';
import { useValidateSession } from '../../hooks/useValidateSession';
import { Loading } from '../../components/ui/content/Loading';

interface Props {
    isEmbedded?: boolean;
}

export const InventoryMovements: React.FC<Props> = ({ isEmbedded }) => {
    const [movements, setMovements] = useState<IInventoryMovement[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [warehouseId, setWarehouseId] = useState<number | null>(null);
    const [type, setType] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const { loadingSession, isValid, user } = useValidateSession();

    useEffect(() => {
        loadMovements();
    }, [page, warehouseId, type, dateFrom, dateTo]);

    const loadMovements = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            if (warehouseId) params.append('warehouse_id', String(warehouseId));
            if (type !== 'all') params.append('movement_type', type);
            if (dateFrom) params.append('from_date', dateFrom);
            if (dateTo) params.append('to_date', dateTo);

            const { status, response }: IResponse = await request(`/inventory-movements?${params.toString()}`, 'GET');
            if (status) {
                const data = await response.json();
                setMovements(data.data.data || []);
                setTotalPages(data.data.last_page || 1);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    if (loadingSession || !isValid || !user.token) return <Loading />;

    const content = (
        <Box sx={{ p: isEmbedded ? 0 : 2 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <WarehouseSelector
                            value={warehouseId}
                            onChange={setWarehouseId}
                            showAll
                            label="Filtrar por Almacén"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Tipo"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <MenuItem value="all">Todos</MenuItem>
                            <MenuItem value="in">Entrada</MenuItem>
                            <MenuItem value="out">Salida</MenuItem>
                            <MenuItem value="transfer">Transferencia</MenuItem>
                            <MenuItem value="adjustment">Ajuste</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <TextField
                            type="date"
                            fullWidth
                            size="small"
                            label="Desde"
                            InputLabelProps={{ shrink: true }}
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <TextField
                            type="date"
                            fullWidth
                            size="small"
                            label="Hasta"
                            InputLabelProps={{ shrink: true }}
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton onClick={loadMovements}>
                            <RefreshIcon />
                        </IconButton>
                    </Grid>
                </Grid>
            </Paper>

            <MovementsTable movements={movements} loading={loading} />

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                />
            </Box>
        </Box>
    );

    if (isEmbedded) return content;

    return (
        <Layout>
            <DescripcionDeVista
                title="Movimientos de Inventario"
                description="Historial detallado de operaciones de stock"
            />
            {content}
        </Layout>
    );
};

