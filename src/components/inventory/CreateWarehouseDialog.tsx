import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControlLabel,
    Switch,
    MenuItem,
    Box
} from '@mui/material';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { toast } from 'react-toastify';

interface CreateWarehouseDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    warehouse?: any;
}

interface IWarehouseType {
    id: number;
    name: string;
    code: string;
}

export const CreateWarehouseDialog: React.FC<CreateWarehouseDialogProps> = ({ open, onClose, onSuccess, warehouse }) => {
    const [loading, setLoading] = useState(false);
    const [types, setTypes] = useState<IWarehouseType[]>([]);

    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [typeId, setTypeId] = useState<number | ''>('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [isMain, setIsMain] = useState(false);
    const [userId, setUserId] = useState<number | ''>('');
    const [deliverers, setDeliverers] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            loadTypes();
            loadDeliverers();
            loadAgencies();
            if (warehouse) {
                setName(warehouse.name);
                setCode(warehouse.code);
                setTypeId(warehouse.warehouse_type_id || '');
                setLocation(warehouse.location || '');
                setDescription(warehouse.description || '');
                setIsMain(warehouse.is_main || false);
                setUserId(warehouse.user_id || '');
            } else {
                resetForm();
            }
        }
    }, [open, warehouse]);

    const loadDeliverers = async () => {
        try {
            const { status, response }: IResponse = await request('/users/deliverers', 'GET');
            if (status) {
                const data = await response.json();
                setDeliverers(data.data || []);
            }
        } catch (error) {
            console.error('Error loading deliverers:', error);
        }
    };

    const loadAgencies = async () => {
        try {
            const { status, response }: IResponse = await request('/users/role/Agencia', 'GET');
            if (status) {
                const data = await response.json();
                setAgencies(data.data || []);
            }
        } catch (error) {
            console.error('Error loading agencies:', error);
        }
    };

    const loadTypes = async () => {
        try {
            const { status, response }: IResponse = await request('/warehouse-types', 'GET');
            if (status) {
                const data = await response.json();
                setTypes(data.data || []);
                // Default to first type if available
                if (data.data && data.data.length > 0 && !typeId) {
                    setTypeId(data.data[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading warehouse types:', error);
        }
    };

    const resetForm = () => {
        setName('');
        setCode('');
        setTypeId('');
        setLocation('');
        setDescription('');
        setIsMain(false);
        setUserId('');
    };

    const handleSubmit = async () => {
        if (!name || !code || !typeId) {
            toast.error('Por favor complete los campos requeridos');
            return;
        }

        setLoading(true);
        try {
            const body = {
                name,
                code,
                warehouse_type_id: typeId,
                location,
                description,
                is_main: isMain,
                is_active: true,
                user_id: userId || null
            };

            let status, response;
            if (warehouse) {
                const res = await request(`/warehouses/${warehouse.id}`, 'PUT', JSON.stringify(body));
                status = res.status;
                response = res.response;
            } else {
                const res = await request('/warehouses', 'POST', JSON.stringify(body));
                status = res.status;
                response = res.response;
            }

            if (status === 201 || status === 200) {
                toast.success(warehouse ? 'Almacén actualizado exitosamente' : 'Almacén creado exitosamente');
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al guardar almacén');
                if (data.errors) {
                    Object.values(data.errors).forEach((err: any) => {
                        toast.error(err[0]);
                    });
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine active selection list and label
    const selectedTypeCode = typeId ? types.find(t => t.id === typeId)?.code : '';
    const isDelivererType = selectedTypeCode === 'DELIVERER';
    const isAgencyType = selectedTypeCode === 'AGENCY';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{warehouse ? 'Editar Almacén' : 'Nuevo Almacén'}</DialogTitle>
            <DialogContent>
                <Box display="flex" flexDirection="column" gap={2} mt={1}>
                    <Box display="flex" gap={2}>
                        <TextField
                            fullWidth
                            label="Nombre"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Código"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            helperText="Debe ser único"
                        />
                    </Box>
                    <TextField
                        select
                        fullWidth
                        label="Tipo de Almacén"
                        value={typeId}
                        onChange={(e) => setTypeId(Number(e.target.value))}
                        required
                    >
                        {types.map((type) => (
                            <MenuItem key={type.id} value={type.id}>
                                {type.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    {(isDelivererType || isAgencyType) && (
                        <TextField
                            select
                            fullWidth
                            label={isAgencyType ? "Asignar a Agencia" : "Asignar a Repartidor"}
                            value={userId}
                            onChange={(e) => setUserId(Number(e.target.value))}
                            required
                            helperText={isAgencyType ? "Este almacén registrará el stock de esta agencia" : "Este almacén representará el stock de este repartidor"}
                        >
                            {(isAgencyType ? agencies : deliverers).map((user) => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.names} {user.surnames} {user.email ? `(${user.email})` : ''}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}

                    <TextField
                        fullWidth
                        label="Ubicación / Dirección"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Descripción"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={isMain}
                                onChange={(e) => setIsMain(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Es Almacén Principal"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Guardando...' : (warehouse ? 'Actualizar' : 'Crear Almacén')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
