// src/components/orders/AssignDelivererDialog.tsx
import {
    Box, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, List, ListItem, ListItemAvatar, Avatar,
    ListItemText, CircularProgress, ListItemButton
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useEffect, useState } from "react";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../store/orders/OrdersStore";

interface Props {
    open: boolean;
    onClose: () => void;
    orderId: number;
}

export const AssignDelivererDialog: FC<Props> = ({ open, onClose, orderId }) => {
    const [deliverers, setDeliverers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const { updateOrderInColumns } = useOrdersStore();

    useEffect(() => {
        if (open) loadDeliverers();
    }, [open]);

    const loadDeliverers = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/users/deliverers", "GET");
            if (status === 200) {
                const data = await response.json();
                setDeliverers(data.data ?? []);
                // toast.success("Repartidores cargados ✅"); // Remove noisy toast
            } else {
                toast.error("No se pudieron cargar los repartidores ❌");
            }
        } catch {
            toast.error("Error en el servidor al cargar repartidores 🚨");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (delivererId: number) => {
        setAssigning(true);
        try {
            const body = new URLSearchParams();
            body.append("deliverer_id", String(delivererId));

            const { status, response }: IResponse = await request(
                `/orders/${orderId}/assign-deliverer`,
                "PUT",
                body
            );

            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order); // incluye deliverer + status
                toast.success(`Repartidor asignado correctamente 🚚`);
                onClose();
            } else {
                toast.error((await response.json().catch(() => ({})))?.message || "No se pudo asignar el repartidor ❌");
            }
        } catch {
            toast.error("Error en el servidor al asignar 🚨");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                Asignar repartidor
                <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
            </DialogTitle>

            <DialogContent>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List>
                        {deliverers.length > 0 ? (
                            deliverers.map((d) => (
                                <ListItem key={d.id} disablePadding>
                                    <ListItemButton onClick={() => handleAssign(d.id)} disabled={assigning}>
                                        <ListItemAvatar>
                                            <Avatar>{d.names?.charAt(0) ?? "R"}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText primary={`${d.names} ${d.surnames ?? ""}`} secondary={d.email} />
                                    </ListItemButton>
                                </ListItem>
                            ))
                        ) : (
                            <Box sx={{ p: 2, textAlign: "center" }}>
                                No hay repartidores disponibles
                            </Box>
                        )}
                    </List>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={assigning}>
                    Cerrar
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
