import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    CircularProgress,
    ListItemButton,
    Chip,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useEffect, useState } from "react";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import { orderNo } from "../../lib/functions";

interface AssignAgencyDialogProps {
    open: boolean;
    onClose: () => void;
    orderId: number;
    onAssigned?: (agency: any) => void;
    /**
     * Lista de almacenes (de la orden) donde sí hay stock útil.
     * Se usa para resaltar y priorizar las agencias que pueden cumplir la orden.
     */
    stockElsewhere?: Array<{ warehouse_id: number; agency_user_id?: number | null; city_name?: string | null }>;
}

export const AssignAgencyDialog: FC<AssignAgencyDialogProps> = ({
    open,
    onClose,
    orderId,
    onAssigned,
    stockElsewhere = [],
}) => {
    const [agencies, setAgencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const { updateOrderInColumns } = useOrdersStore();

    useEffect(() => {
        if (open) {
            fetchAgencies();
        }
    }, [open]);

    const fetchAgencies = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/users/role/Agencia", "GET");
            if (status === 200) {
                const data = await response.json();
                setAgencies(data.data ?? []);
            } else {
                toast.error("No se pudieron obtener las agencias ❌");
            }
        } catch (e) {
            console.error("Error al obtener agencias", e);
            toast.error("Error en el servidor al cargar agencias 🚨");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (agencyId: number) => {
        setAssigning(true);
        try {
            const body = new URLSearchParams();
            body.append("agency_id", String(agencyId));

            const { status, response }: IResponse = await request(
                `/orders/${orderId}/assign-agency`,
                "PUT",
                body
            );

            if (status === 200) {
                const data = await response.json();
                updateOrderInColumns(data.order);

                if (onAssigned) onAssigned(data.order.agency);

                // Usamos el mensaje del backend: distingue entre "avanzó de status"
                // y "se reasignó pero el nuevo almacén tampoco tiene stock".
                toast.success(data.message || `Orden ${orderNo(data.order.name)} reasignada 🏢`);
                onClose();
            } else {
                toast.error("No se pudo asignar la agencia ❌");
            }
        } catch (e) {
            console.error("Error al asignar agencia", e);
            toast.error("Error en el servidor al asignar 🚨");
        } finally {
            setAssigning(false);
        }
    };

    // Agencias (por user id) que tienen stock útil para esta orden.
    const stockAgencyIds = new Set(
        (stockElsewhere ?? [])
            .map((w) => w.agency_user_id)
            .filter((id): id is number => typeof id === "number")
    );

    // Priorizar las agencias con stock al inicio de la lista.
    const sortedAgencies = [...agencies].sort((a, b) => {
        const aHas = stockAgencyIds.has(a.id) ? 1 : 0;
        const bHas = stockAgencyIds.has(b.id) ? 1 : 0;
        return bHas - aHas;
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                Asignar a Agencia
                <IconButton onClick={onClose}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List>
                        {agencies.length > 0 ? (
                            sortedAgencies.map((agency) => {
                                const hasStock = stockAgencyIds.has(agency.id);
                                const label = agency.primary_city
                                    ? `Agencia: ${agency.primary_city}`
                                    : agency.names;
                                return (
                                    <ListItem key={agency.id} disablePadding>
                                        <ListItemButton
                                            onClick={() => handleAssign(agency.id)}
                                            disabled={assigning}
                                        >
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: hasStock ? 'success.main' : 'primary.main' }}>
                                                    <BusinessRoundedIcon />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                        {label}
                                                        {hasStock && (
                                                            <Chip size="small" color="success" variant="outlined" label="✅ Con stock" />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={agency.email}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })
                        ) : (
                            <Box sx={{ p: 2, textAlign: "center" }}>
                                No hay agencias disponibles
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
