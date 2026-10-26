import {
    Avatar,
    Box,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { FC, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { orderNo } from "../../lib/functions";

interface Member {
    id: number;
    name: string;
    is_leader: boolean;
    max_active_orders: number | null;
    active_orders: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    order: { id: number; name: string; agent_id?: number | null };
}

/**
 * La Líder pasa un pedido suelto a otra vendedora de su grupo (hallazgo H4, spec §5.1).
 * El estado del pedido no cambia; el servidor comprueba que el pedido y la vendedora sean del grupo.
 */
export const LeaderMoveOrderDialog: FC<Props> = ({ open, onClose, order }) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { updateOrderInColumns, setSelectedOrder } = useOrdersStore();

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        request("/my-group", "GET")
            .then(async ({ status, response }) => {
                const data = await response.json().catch(() => ({}));
                if (status >= 200 && status < 300) setMembers(data.data?.members ?? []);
                else toast.error(data.message || "No se pudo cargar tu grupo");
            })
            .finally(() => setLoading(false));
    }, [open]);

    const targets = members.filter((m) => !m.is_leader && m.id !== order.agent_id);

    const move = async (m: Member) => {
        setSaving(true);
        try {
            const { status, response } = await request(`/my-group/orders/${order.id}/agent`, "PUT", { to_agent_id: m.id });
            const data = await response.json().catch(() => ({}));
            if (status >= 200 && status < 300) {
                // La respuesta trae el pedido sin sus productos: se vuelve a pedir entero para que la ficha no pierda nada
                const full = await request(`/orders/${order.id}`, "GET");
                const fresh = full.status === 200 ? (await full.response.json()).order : null;
                updateOrderInColumns(fresh ?? data.order);
                if (fresh) setSelectedOrder(fresh);
                toast.success(data.message || `Pedido pasado a ${m.name}`);
                onClose();
            } else {
                toast.error(data.message || "No se pudo pasar el pedido");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Pasar {orderNo(order.name)} a otra vendedora
                <IconButton onClick={onClose}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary">
                    Solo vendedoras de tu grupo. El pedido conserva su estado y el cambio queda en su historial.
                </Typography>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : targets.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: "center" }}>No hay otras vendedoras en tu grupo</Box>
                ) : (
                    <List>
                        {targets.map((m) => {
                            const full = m.max_active_orders !== null && m.active_orders >= m.max_active_orders;
                            return (
                                <ListItem key={m.id} disablePadding>
                                    <ListItemButton onClick={() => move(m)} disabled={saving}>
                                        <ListItemAvatar>
                                            <Avatar>{m.name.charAt(0)}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={m.name}
                                            secondary={
                                                m.max_active_orders !== null
                                                    ? `${m.active_orders} activos de ${m.max_active_orders}${full ? " · en su máximo" : ""}`
                                                    : `${m.active_orders} activos`
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={saving}>
                    Cerrar
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
