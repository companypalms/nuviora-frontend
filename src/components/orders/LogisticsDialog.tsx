import React, { FC, useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Box,
    Typography,
    CircularProgress,
    Divider
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import LocalShippingRounded from "@mui/icons-material/LocalShippingRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import LocationOnRounded from "@mui/icons-material/LocationOnRounded";

interface LogisticsDialogProps {
    open: boolean;
    onClose: () => void;
    order: any;
}

export const LogisticsDialog: FC<LogisticsDialogProps> = ({ open, onClose, order }) => {
    const [cities, setCities] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        city_id: order.city_id || order.client?.city_id || "",
        agency_id: order.agency_id || "",
    });

    const { updateOrderInColumns } = useOrdersStore();

    useEffect(() => {
        if (open) {
            fetchData();
            setForm({
                city_id: order.city_id || order.client?.city_id || "",
                agency_id: order.agency_id || "",
            });
        }
    }, [open, order]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [citiesRes, agenciesRes] = await Promise.all([
                request("/cities", "GET"),
                request("/users/role/Agencia", "GET")
            ]);

            if (citiesRes.status) {
                const data = await citiesRes.response.json();
                setCities(data);
            }
            if (agenciesRes.status) {
                const data = await agenciesRes.response.json();
                setAgencies(data.data || []);
            }
        } catch (e) {
            console.error("Error fetching logistics data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = new URLSearchParams();
            if (form.city_id) body.append("city_id", String(form.city_id));
            if (form.agency_id) body.append("agency_id", String(form.agency_id));

            const { status, response }: IResponse = await request(`/orders/${order.id}/logistics`, "PUT", body);
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Logística actualizada ✅");
                onClose();
            } else {
                toast.error((await response.json().catch(() => ({})))?.message || "Error al actualizar logística ❌");
            }
        } catch (e) {
            toast.error("Error en el servidor 🚨");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShippingRounded color="primary" />
                    <Typography variant="h6" fontWeight="bold">Gestión Logística</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ mt: 1 }}>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <Stack spacing={3}>
                        <FormControl fullWidth>
                            <InputLabel id="city-select-label">Ciudad / Provincia</InputLabel>
                            <Select
                                labelId="city-select-label"
                                value={form.city_id}
                                label="Ciudad / Provincia"
                                onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                                startAdornment={<LocationOnRounded sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />}
                            >
                                <MenuItem value="">Sin seleccionar</MenuItem>
                                {cities.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="agency-select-label">Agencia Responsable</InputLabel>
                            <Select
                                labelId="agency-select-label"
                                value={form.agency_id}
                                label="Agencia Responsable"
                                onChange={(e) => setForm({ ...form, agency_id: e.target.value })}
                                startAdornment={<ApartmentRounded sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />}
                            >
                                <MenuItem value="">Sin seleccionar</MenuItem>
                                {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.names}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={saving}>Cancelar</ButtonCustom>
                <ButtonCustom variant="contained" onClick={handleSave} loading={saving}>Guardar Cambios</ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
