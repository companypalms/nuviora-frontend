import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, InputLabel, FormControl, Box } from '@mui/material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';

interface AddUserDialogProps {
    open: boolean;
    onClose: () => void;
    onUserAdded: () => void;
    defaultRole?: string;
}

export const AddUserDialog = ({ open, onClose, onUserAdded, defaultRole }: AddUserDialogProps) => {
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        names: '',
        surnames: '',
        email: '',
        phone: '',
        password: '',
        address: '',
        role_id: '',
        delivery_cost: ''
    });

    useEffect(() => {
        if (open) {
            fetchRoles();
        }
    }, [open]);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const { response, status } = await request('/roles', 'GET');
            if (status === 200) {
                const data = await response.json();
                const rolesList = Array.isArray(data.data) ? data.data : [];
                setRoles(rolesList);

                if (defaultRole) {
                    const role = rolesList.find((r: any) => r.description === defaultRole);
                    if (role) {
                        setFormData(prev => ({ ...prev, role_id: role.id }));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            toast.error('Error al cargar roles');
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    const handleSubmit = async () => {
        if (!formData.names || !formData.email || !formData.password || !formData.role_id) {
            toast.warning('Por favor complete los campos obligatorios');
            return;
        }

        setSaving(true);
        try {
            const { response, status } = await request('/users', 'POST', JSON.stringify(formData));
            if (status === 201 || status === 200) {
                toast.success('Usuario creado correctamente');
                onUserAdded();
                handleClose();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Error al crear usuario');
                if (errorData.errors) {
                    Object.values(errorData.errors).forEach((err: any) => {
                        toast.error(Array.isArray(err) ? err[0] : err);
                    });
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setSaving(false);
        }
    }

    const handleClose = () => {
        setFormData({
            names: '',
            surnames: '',
            email: '',
            phone: '',
            password: '',
            address: '',
            role_id: '',
            delivery_cost: ''
        });
        onClose();
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                style: {
                    borderRadius: 16,
                    padding: 8
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 'bold' }}>Agregar Nuevo Usuario</DialogTitle>
            <DialogContent>
                <Box display="flex" flexDirection="column" gap={2} mt={1}>
                    <Box display="flex" gap={2}>
                        <Box flex={1}>
                            <TextField
                                label="Nombres"
                                name="names"
                                value={formData.names}
                                onChange={handleChange}
                                fullWidth
                                required
                                variant="outlined"
                            />
                        </Box>
                        <Box flex={1}>
                            <TextField
                                label="Apellidos"
                                name="surnames"
                                value={formData.surnames}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                            />
                        </Box>
                    </Box>

                    <TextField
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        fullWidth
                        required
                        variant="outlined"
                    />

                    <Box display="flex" gap={2}>
                        <Box flex={1}>
                            <TextField
                                label="Teléfono"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                            />
                        </Box>
                        <Box flex={1}>
                            <FormControl fullWidth required>
                                <InputLabel>Rol</InputLabel>
                                <Select
                                    name="role_id"
                                    value={formData.role_id}
                                    label="Rol"
                                    onChange={handleChange}
                                >
                                    {roles.map((role) => (
                                        <MenuItem key={role.id} value={role.id}>{role.description}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    <TextField
                        label="Dirección"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={2}
                    />

                    {roles.find(r => r.id === formData.role_id)?.description === 'Agencia' && (
                        <TextField
                            label="Costo de Delivery (Comisión)"
                            name="delivery_cost"
                            type="number"
                            value={formData.delivery_cost}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            helperText="Se generará esta comisión cada vez que una orden pase a 'En ruta'"
                        />
                    )}

                    <TextField
                        label="Contraseña"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        fullWidth
                        required
                        variant="outlined"
                        helperText="Mínimo 6 caracteres"
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ padding: 2 }}>
                <Button onClick={handleClose} color="inherit" sx={{ borderRadius: 2 }}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={saving}
                    sx={{ borderRadius: 2, px: 4 }}
                >
                    {saving ? 'Guardando...' : 'Guardar Usuario'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
