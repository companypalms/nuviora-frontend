import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    IconButton,
    InputAdornment,
    Divider
} from '@mui/material';
import {
    Warehouse as WarehouseIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Inventory as InventoryIcon,
    Search as SearchIcon,
    SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IWarehouse } from '../../interfaces/inventory.types';
import { ButtonCustom, TextFieldCustom } from '../../components/custom';
import { CreateWarehouseDialog } from '../../components/inventory/CreateWarehouseDialog';
import { TransferStockDialog } from '../../components/inventory/TransferStockDialog';
import { useValidateSession } from '../../hooks/useValidateSession';
import { Loading } from '../../components/ui/content/Loading';

interface Props {
    isEmbedded?: boolean;
}

export const Warehouses: React.FC<Props> = ({ isEmbedded }) => {
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<IWarehouse | undefined>(undefined);
    const navigate = useNavigate();
    const { loadingSession, isValid, user } = useValidateSession();

    // Filtros y búsqueda
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'MAIN' | 'AGENCY' | 'DELIVERER' | null>(null);

    useEffect(() => {
        loadWarehouses();
    }, []);

    const loadWarehouses = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/warehouses', 'GET');
            if (status) {
                const data = await response.json();
                setWarehouses(data.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;

    const getBorderColor = (w: IWarehouse) => {
        if (w.is_main) return '#ffb300';
        if (w.warehouse_type?.code === 'AGENCY') return '#00b0ff';
        if (w.warehouse_type?.code === 'DELIVERER') return '#00c853';
        return '#bdbdbd';
    };

    const getChipColor = (w: IWarehouse): "warning" | "info" | "success" | "default" | "primary" | "secondary" | "error" | undefined => {
        if (w.is_main) return 'warning';
        if (w.warehouse_type?.code === 'AGENCY') return 'info';
        if (w.warehouse_type?.code === 'DELIVERER') return 'success';
        return 'default';
    };

    const filteredWarehouses = warehouses.filter(w => {
        const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) ||
            w.code.toLowerCase().includes(search.toLowerCase()) ||
            w.user?.names.toLowerCase().includes(search.toLowerCase()) ||
            w.user?.surnames.toLowerCase().includes(search.toLowerCase());

        const matchesType = !filterType ||
            (filterType === 'MAIN' && w.is_main) ||
            (filterType === 'AGENCY' && w.warehouse_type?.code === 'AGENCY') ||
            (filterType === 'DELIVERER' && w.warehouse_type?.code === 'DELIVERER');

        return matchesSearch && matchesType;
    });

    const content = (
        <Box sx={{ p: isEmbedded ? 0 : 2 }}>
            {!isEmbedded && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
                    <ButtonCustom variant="outlined" startIcon={<InventoryIcon />} onClick={() => navigate('/inventory')}>
                        Ver Inventario Global
                    </ButtonCustom>
                </Box>
            )}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextFieldCustom
                            fullWidth
                            size="small"
                            placeholder="Buscar almacén, código o responsable..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                            <Chip
                                label="Todos"
                                onClick={() => setFilterType(null)}
                                color={filterType === null ? 'primary' : 'default'}
                                variant={filterType === null ? 'filled' : 'outlined'}
                            />
                            <Chip
                                label="Principales"
                                onClick={() => setFilterType('MAIN')}
                                color={filterType === 'MAIN' ? 'warning' : 'default'}
                                variant={filterType === 'MAIN' ? 'filled' : 'outlined'}
                                icon={<InventoryIcon />}
                            />
                            <Chip
                                label="Agencias"
                                onClick={() => setFilterType('AGENCY')}
                                color={filterType === 'AGENCY' ? 'info' : 'default'}
                                variant={filterType === 'AGENCY' ? 'filled' : 'outlined'}
                                icon={<WarehouseIcon />}
                            />
                            <Chip
                                label="Repartidores"
                                onClick={() => setFilterType('DELIVERER')}
                                color={filterType === 'DELIVERER' ? 'success' : 'default'}
                                variant={filterType === 'DELIVERER' ? 'filled' : 'outlined'}
                                icon={<WarehouseIcon />}
                            />
                            <ButtonCustom
                                variant='contained'
                                color='secondary'
                                startIcon={<SwapHorizIcon />}
                                onClick={() => setTransferDialogOpen(true)}
                                sx={{ ml: 1, display: user.role?.description === 'Agencia' ? 'none' : 'inline-flex' }}
                            >
                                Transferir Stock
                            </ButtonCustom>
                            <ButtonCustom
                                variant='contained'
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    setSelectedWarehouse(undefined);
                                    setCreateDialogOpen(true);
                                }}
                                sx={{ ml: 1, display: user.role?.description === 'Agencia' ? 'none' : 'inline-flex' }}
                            >
                                Nuevo
                            </ButtonCustom>
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            <Grid container spacing={3}>
                {filteredWarehouses.map((warehouse) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={warehouse.id}>
                        <Card
                            elevation={2}
                            sx={{
                                transition: '0.3s',
                                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                                position: 'relative',
                                borderTop: `4px solid ${getBorderColor(warehouse)}`
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">{warehouse.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {warehouse.code}
                                        </Typography>
                                    </Box>
                                    {user.role?.description !== 'Agencia' && (
                                        <IconButton size="small" onClick={() => {
                                            setSelectedWarehouse(warehouse);
                                            setCreateDialogOpen(true);
                                        }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, mb: 2, bgcolor: 'action.hover', p: 1.5, borderRadius: 2 }}>
                                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                                        <Typography variant="h6" color="primary.main">{warehouse.total_products_unique || 0}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Productos</Typography>
                                    </Box>
                                    <Divider orientation="vertical" flexItem />
                                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                                        <Typography variant="h6" color="secondary.main">{warehouse.total_items_stock || 0}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Unidades</Typography>
                                    </Box>
                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 20 }}>
                                    {warehouse.user ? (
                                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            Responsable: <b>{warehouse.user.names}</b>
                                        </Box>
                                    ) : (
                                        warehouse.description || 'Sin descripción'
                                    )}
                                </Typography>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip
                                        label={warehouse.is_active ? 'Activo' : 'Inactivo'}
                                        color={warehouse.is_active ? 'success' : 'default'}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={warehouse.warehouse_type?.name || 'General'}
                                        size="small"
                                        color={getChipColor(warehouse)}
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </Box>
                            </CardContent>
                            <CardActions sx={{ px: 2, pb: 2 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    startIcon={<InventoryIcon />}
                                    onClick={() => navigate(`/inventory/warehouses/${warehouse.id}`)}
                                >
                                    Gestionar Inventario
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {createDialogOpen && (
                <CreateWarehouseDialog
                    open={createDialogOpen}
                    onClose={() => setCreateDialogOpen(false)}
                    onSuccess={loadWarehouses}
                    warehouse={selectedWarehouse}
                />
            )}

            {transferDialogOpen && (
                <TransferStockDialog
                    open={transferDialogOpen}
                    onClose={() => setTransferDialogOpen(false)}
                    onSuccess={loadWarehouses}
                    warehouses={warehouses}
                />
            )}
        </Box>
    );

    if (isEmbedded) return content;

    return (
        <Layout>
            <DescripcionDeVista
                title="Almacenes"
                description="Gestión de ubicaciones de inventario"
            />
            {content}
        </Layout>
    );
};

