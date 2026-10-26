import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Toolbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Stack,
    Chip,
    useTheme,
    IconButton,
    TextField,
    InputAdornment
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import * as XLSX from 'xlsx';

import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { useUserStore } from '../../store/user/UserStore';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/ui/Layout';

interface StockRow {
    product_id: number;
    product_name: string;
    sku: string;
    warehouse_id: number;
    warehouse_name: string;
    warehouse_location: string;
    quantity: number;
    useful_stock: number;
    reserved_stock: number;
    defective_stock: number;
    blocked_stock: number;
    lead_time_days: number;
    lead_time_source: string;
}

export const StockExportPage: React.FC = () => {
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [items, setItems] = useState<StockRow[]>([]);
    const [search, setSearch] = useState('');

    // To handle inline editing of lead time
    const [editedLeadTimes, setEditedLeadTimes] = useState<Record<string, number>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/reports/stock-export', 'GET');
            if (status) {
                const json = await response.json();
                setItems(json.data ?? []);
                setEditedLeadTimes({}); // reset edits on refresh
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (!user || !['Admin', 'Gerente'].includes(user.role?.description || '')) {
        return <Navigate to="/dashboard" />;
    }

    const filtered = items.filter((i) => {
        const q = search.toLowerCase();
        return (
            i.product_name.toLowerCase().includes(q) ||
            i.warehouse_name.toLowerCase().includes(q) ||
            i.sku?.toLowerCase().includes(q)
        );
    });

    const handleDownload = () => {
        const rows = filtered.map((i) => ({
            'Producto': i.product_name,
            'SKU': i.sku,
            'Almacén': i.warehouse_name,
            'Ciudad/Ubicación': i.warehouse_location,
            'Stock Físico': i.quantity,
            'Stock Útil': i.useful_stock,
            'Reservado': i.reserved_stock,
            'Defectuoso': i.defective_stock,
            'Bloqueado': i.blocked_stock,
            'Lead Time (Días)': editedLeadTimes[`${i.product_id}-${i.warehouse_id}`] ?? i.lead_time_days
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock con Lead Time');

        const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
            wch: Math.max(key.length, ...rows.map((r: any) => String(r[key] ?? '').length)) + 2,
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `reporte_stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleLeadTimeChange = (productId: number, warehouseId: number, val: string) => {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 1) {
            setEditedLeadTimes(prev => ({ ...prev, [`${productId}-${warehouseId}`]: num }));
        }
    };

    const saveLeadTime = async (productId: number, warehouseId: number) => {
        const key = `${productId}-${warehouseId}`;
        const newLt = editedLeadTimes[key];
        
        if (!newLt) return; // Nothing changed

        setSaving(key);
        try {
            const { status }: IResponse = await request('/product-warehouse-lead-times', 'PUT', {
                product_id: productId,
                warehouse_id: warehouseId,
                lead_time_days: newLt
            });
            if (status) {
                // Update local state
                setItems(prev => prev.map(item => 
                    (item.product_id === productId && item.warehouse_id === warehouseId)
                        ? { ...item, lead_time_days: newLt, lead_time_source: 'custom' }
                        : item
                ));
                // Clear from edited so save button hides
                setEditedLeadTimes(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            } else {
                alert('No se pudo guardar el lead time.');
            }
        } catch (e) {
            console.error(e);
            alert('Error inesperado al guardar.');
        } finally {
            setSaving(null);
        }
    };

    return (
        <Layout>
            <Toolbar />
            <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
                <Paper
                    sx={{
                        p: 3,
                        borderRadius: 4,
                        mb: 3,
                        background: isDark
                            ? 'linear-gradient(135deg, #1a237e22, #0d47a122)'
                            : 'linear-gradient(135deg, #e3f2fd, #f8f9fa)',
                        border: '1px solid',
                        borderColor: isDark ? 'primary.dark' : 'primary.light',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
                        <IconButton onClick={() => navigate(-1)} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" fontWeight="black" gutterBottom sx={{ mb: 0 }}>
                                📦 Reporte de Stock y Lead Time
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Revisa el stock actual y configura el Lead Time por cada combinación de Producto y Almacén.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1.5}>
                            <IconButton onClick={fetchData} color="primary" disabled={loading}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownload}
                                disabled={loading || filtered.length === 0}
                                sx={{ borderRadius: 2, fontWeight: 'bold' }}
                            >
                                Descargar Excel
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Buscar producto o almacén..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: search ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                </Paper>

                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" p={8}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? '#1e1e1e' : '#f5f5f5' }}>Producto</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? '#1e1e1e' : '#f5f5f5' }}>SKU</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? '#1e1e1e' : '#f5f5f5' }}>Almacén</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? '#1e1e1e' : '#f5f5f5' }} align="center">Físico</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? '#1e1e1e' : '#f5f5f5' }} align="center">Útil</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? '#1e1e1e' : '#f5f5f5' }} align="center">Lead Time (días)</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? '#1e1e1e' : '#f5f5f5' }}></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.map((item) => {
                                        const key = `${item.product_id}-${item.warehouse_id}`;
                                        const hasChanges = editedLeadTimes[key] !== undefined && editedLeadTimes[key] !== item.lead_time_days;
                                        const displayValue = editedLeadTimes[key] ?? item.lead_time_days;
                                        const isSaving = saving === key;

                                        return (
                                            <TableRow key={key} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{item.product_name}</Typography>
                                                </TableCell>
                                                <TableCell>{item.sku}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{item.warehouse_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{item.warehouse_location}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip label={item.quantity} size="small" />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip 
                                                        label={item.useful_stock} 
                                                        size="small" 
                                                        color={item.useful_stock > 0 ? "success" : "error"}
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={displayValue}
                                                        onChange={(e) => handleLeadTimeChange(item.product_id, item.warehouse_id, e.target.value)}
                                                        inputProps={{ min: 1, style: { textAlign: 'center', width: '60px' } }}
                                                        color={item.lead_time_source === 'custom' ? 'primary' : 'secondary'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {hasChanges && (
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={() => saveLeadTime(item.product_id, item.warehouse_id)}
                                                            disabled={isSaving}
                                                            startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                                                        >
                                                            Guardar
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">No hay resultados.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            </Box>
        </Layout>
    );
};
