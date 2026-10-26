import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Stack, Typography, Box, Switch, FormControlLabel,
    CircularProgress
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { ButtonCustom } from '../custom';
import { request } from '../../common/request';
import { ISupplier } from '../../interfaces/inventory.types';
import { toast } from 'react-toastify';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    supplier?: ISupplier | null; // If provided → edit mode
}

const EMPTY_FORM = {
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    currency: 'USD' as 'USD' | 'VES',
    default_lead_time_days: 7,
    notes: '',
    is_active: true,
};

export const SupplierFormDialog: React.FC<Props> = ({ open, onClose, onSuccess, supplier }) => {
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [loading, setLoading] = useState(false);
    const isEdit = !!supplier;

    useEffect(() => {
        if (open) {
            if (supplier) {
                setForm({
                    name:                   supplier.name,
                    contact_name:           supplier.contact_name ?? '',
                    phone:                  supplier.phone ?? '',
                    email:                  supplier.email ?? '',
                    address:                supplier.address ?? '',
                    currency:               supplier.currency,
                    default_lead_time_days: supplier.default_lead_time_days,
                    notes:                  supplier.notes ?? '',
                    is_active:              supplier.is_active,
                });
            } else {
                setForm({ ...EMPTY_FORM });
            }
        }
    }, [open, supplier]);

    const handleChange = (field: keyof typeof form, value: any) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('El nombre del proveedor es obligatorio');

        setLoading(true);
        try {
            const payload = {
                ...form,
                default_lead_time_days: Number(form.default_lead_time_days),
            };

            const { status, response } = await request(
                isEdit ? `/suppliers/${supplier!.id}` : '/suppliers',
                isEdit ? 'PUT' : 'POST',
                payload
            );

            if (status === 200 || status === 201) {
                toast.success(isEdit ? 'Proveedor actualizado ✅' : 'Proveedor creado ✅');
                onSuccess();
                onClose();
            } else {
                const err = await response.json().catch(() => ({ message: 'Error desconocido' }));
                toast.error(err.message || `Error ${status}`);
            }
        } catch {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                <PersonIcon color="primary" />
                {isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <TextField
                            label="Nombre del Proveedor *"
                            value={form.name}
                            onChange={e => handleChange('name', e.target.value)}
                            fullWidth required
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Persona de Contacto"
                                value={form.contact_name}
                                onChange={e => handleChange('contact_name', e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Teléfono / WhatsApp"
                                value={form.phone}
                                onChange={e => handleChange('phone', e.target.value)}
                                fullWidth
                            />
                        </Box>

                        <TextField
                            label="Correo Electrónico"
                            type="email"
                            value={form.email}
                            onChange={e => handleChange('email', e.target.value)}
                            fullWidth
                        />

                        <TextField
                            label="Dirección / Ubicación"
                            value={form.address}
                            onChange={e => handleChange('address', e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                select
                                label="Moneda de Negociación"
                                value={form.currency}
                                onChange={e => handleChange('currency', e.target.value)}
                                sx={{ minWidth: 160 }}
                            >
                                <MenuItem value="USD">🇺🇸 USD (Dólar)</MenuItem>
                                <MenuItem value="VES">🇻🇪 VES (Bolívar)</MenuItem>
                            </TextField>

                            <TextField
                                label="Lead Time por defecto (días)"
                                type="number"
                                value={form.default_lead_time_days}
                                onChange={e => handleChange('default_lead_time_days', e.target.value)}
                                inputProps={{ min: 1, max: 365 }}
                                fullWidth
                                helperText="¿Cuántos días tarda en entregar?"
                            />
                        </Box>

                        <TextField
                            label="Notas internas"
                            value={form.notes}
                            onChange={e => handleChange('notes', e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Condiciones de pago, descuentos, observaciones..."
                        />

                        {isEdit && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={form.is_active}
                                        onChange={e => handleChange('is_active', e.target.checked)}
                                        color="success"
                                    />
                                }
                                label={
                                    <Typography variant="body2">
                                        Proveedor {form.is_active ? 'Activo' : 'Inactivo'}
                                    </Typography>
                                }
                            />
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <ButtonCustom variant="outlined" onClick={onClose} disabled={loading}>
                        Cancelar
                    </ButtonCustom>
                    <ButtonCustom
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Proveedor'}
                    </ButtonCustom>
                </DialogActions>
            </form>
        </Dialog>
    );
};
