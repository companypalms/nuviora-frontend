import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Switch,
    FormControlLabel,
    Stack,
    Tooltip,
    Divider,
    Paper,
    LinearProgress
} from '@mui/material';
import {
    AddRounded,
    EditRounded,
    DeleteRounded,
    AccountBalanceRounded,
    CheckCircleRounded,
    CancelRounded
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IBank } from '../../interfaces/bank.types';
import { toast } from 'react-toastify';
import { useValidateSession } from '../../hooks/useValidateSession';

export const Banks: React.FC = () => {
    const { isValid } = useValidateSession();
    const [banks, setBanks] = useState<IBank[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedBank, setSelectedBank] = useState<IBank | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        active: true
    });

    useEffect(() => {
        if (isValid) {
            loadBanks();
        }
    }, [isValid]);

    const loadBanks = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/banks?all=1', 'GET');
            if (status) {
                const data = await response.json();
                setBanks(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar los bancos');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (bank: IBank | null = null) => {
        if (bank) {
            setSelectedBank(bank);
            setFormData({
                name: bank.name,
                code: bank.code || '',
                active: bank.active
            });
        } else {
            setSelectedBank(null);
            setFormData({
                name: '',
                code: '',
                active: true
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedBank(null);
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            toast.warning('El nombre es obligatorio');
            return;
        }

        setLoading(true);
        try {
            const endpoint = selectedBank ? `/banks/${selectedBank.id}` : '/banks';
            const method = selectedBank ? 'PUT' : 'POST';
            const { status } = await request(endpoint, method, formData);

            if (status) {
                toast.success(selectedBank ? 'Banco actualizado' : 'Banco creado');
                handleCloseDialog();
                loadBanks();
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar el banco');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar este banco?')) return;

        setLoading(true);
        try {
            const { status } = await request(`/banks/${id}`, 'DELETE');
            if (status) {
                toast.success('Banco eliminado');
                loadBanks();
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar el banco');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, md: 4 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="800" gutterBottom>
                            Gestión de Bancos
                        </Typography>
                        <DescripcionDeVista
                            title="Gestión de Bancos"
                            description="Configura los bancos disponibles para los vueltos por Pago Móvil y Transferencia."
                        />
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                        }}
                    >
                        Nuevo Banco
                    </Button>
                </Stack>

                {loading && <LinearProgress sx={{ mb: 4, borderRadius: 2 }} />}

                <Grid container spacing={3}>
                    {banks.map((bank) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={bank.id}>
                            <Card
                                sx={{
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                    }
                                }}
                            >
                                <CardContent>
                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                        <Box sx={{
                                            p: 1.5,
                                            borderRadius: 3,
                                            bgcolor: 'primary.main',
                                            color: 'white'
                                        }}>
                                            <AccountBalanceRounded />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" fontWeight="bold">
                                                {bank.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Código: {bank.code || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Tooltip title={bank.active ? "Activo" : "Inactivo"}>
                                            {bank.active ? (
                                                <CheckCircleRounded color="success" />
                                            ) : (
                                                <CancelRounded color="error" />
                                            )}
                                        </Tooltip>
                                    </Stack>

                                    <Divider sx={{ my: 2 }} />

                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenDialog(bank)}
                                            sx={{ bgcolor: 'action.hover' }}
                                        >
                                            <EditRounded fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDelete(bank.id)}
                                            sx={{ bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}
                                        >
                                            <DeleteRounded fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {banks.length === 0 && !loading && (
                        <Grid size={{ xs: 12 }}>
                            <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 4, bgcolor: 'background.default' }}>
                                <AccountBalanceRounded sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography color="text.secondary">No hay bancos registrados</Typography>
                            </Paper>
                        </Grid>
                    )}
                </Grid>

                <Dialog
                    open={dialogOpen}
                    onClose={handleCloseDialog}
                    PaperProps={{
                        sx: { borderRadius: 4, width: '100%', maxWidth: 450 }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 'bold' }}>
                        {selectedBank ? 'Editar Banco' : 'Nuevo Banco'}
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                label="Nombre del Banco"
                                fullWidth
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Banesco, Banco de Venezuela..."
                            />
                            <TextField
                                label="Código (Opcional)"
                                fullWidth
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="Ej: 0102"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    />
                                }
                                label="Banco disponible"
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={handleCloseDialog} color="inherit">Cancelar</Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={loading || !formData.name}
                        >
                            Guardar Banco
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};
