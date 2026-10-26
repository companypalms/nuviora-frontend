import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    InputAdornment,
    IconButton
} from '@mui/material';
import {
    Search as SearchIcon,
    ArrowBack as BackIcon,
    Refresh as RefreshIcon,
    SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IWarehouse, IInventory } from '../../interfaces/inventory.types';
import { TransferStockDialog } from '../../components/inventory/TransferStockDialog';
import { ButtonCustom } from '../../components/custom';
import { Loading } from '../../components/ui/content/Loading';
import { useValidateSession } from '../../hooks/useValidateSession';

export const WarehouseInventory: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [warehouse, setWarehouse] = useState<IWarehouse | null>(null);
    const [inventory, setInventory] = useState<IInventory[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const { loadingSession, isValid, user } = useValidateSession();

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load warehouse details
            const whReq: IResponse = await request(`/warehouses/${id}`, 'GET');
            if (whReq.status) {
                const whData = await whReq.response.json();
                setWarehouse(whData.data);
            }

            // Load inventory
            const invReq: IResponse = await request(`/warehouses/${id}/inventory`, 'GET');
            if (invReq.status) {
                const invData = await invReq.response.json();
                setInventory(invData.inventory || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.product?.title.toLowerCase().includes(search.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(search.toLowerCase())
    );

    if (loadingSession || !isValid || !user.token) return <Loading />;
    if (loading) return <Loading />;
    if (!warehouse) return <Typography>Almacén no encontrado</Typography>;

    return (
        <Layout>
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={() => navigate('/inventory/warehouses')} sx={{ mr: 1 }}>
                        <BackIcon />
                    </IconButton>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" fontWeight="bold">{warehouse.name}</Typography>
                        <Typography variant="body2" color="text.secondary">Inventario detallado</Typography>
                    </Box>
                    <ButtonCustom
                        variant='contained'
                        color='secondary'
                        startIcon={<SwapHorizIcon />}
                        onClick={() => setTransferDialogOpen(true)}
                        sx={{ display: user.role?.description === 'Agencia' ? 'none' : 'inline-flex' }}
                    >
                        Transferir Stock
                    </ButtonCustom>
                </Box>

                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Buscar producto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ width: 300 }}
                        />
                        <IconButton onClick={loadData}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Producto</TableCell>
                                    <TableCell>SKU</TableCell>
                                    <TableCell align="right">Cantidad</TableCell>
                                    <TableCell align="right">Valor Unit.</TableCell>
                                    <TableCell align="right">Valor Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredInventory.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            {item.product?.title}
                                            {/* Tarea 4: stock por talla o variante */}
                                            {(item.variants_stock ?? []).length > 0 && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {(item.variants_stock ?? []).map(v => `${v.title}: ${v.quantity}`).join(' · ')}
                                                    {(item.unassigned ?? 0) !== 0 && (
                                                        <Typography component="span" variant="caption" color={(item.unassigned ?? 0) > 0 ? 'warning.main' : 'error.main'} fontWeight="bold">
                                                            {` · Sin variante: ${item.unassigned}`}
                                                        </Typography>
                                                    )}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{item.product?.sku || '—'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                            {item.quantity}
                                            {(item.defective_stock ?? 0) > 0 && (
                                                <Typography variant="caption" color="warning.main" display="block">
                                                    incluye {item.defective_stock} defectuosa{item.defective_stock === 1 ? '' : 's'}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            ${Number(item.product?.price || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right">
                                            ${(Number(item.product?.price || 0) * item.quantity).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredInventory.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            No hay productos en este almacén
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {transferDialogOpen && (
                <TransferStockDialog
                    open={transferDialogOpen}
                    onClose={() => setTransferDialogOpen(false)}
                    onSuccess={loadData}
                    initialFromWarehouseId={parseInt(id || '0')}
                />
            )}
        </Layout>
    );
};
