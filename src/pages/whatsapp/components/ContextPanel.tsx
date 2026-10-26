import { FC, useState } from "react";
import { Box, Typography, Button, Paper, Divider, Stack, Chip, Avatar, IconButton } from "@mui/material";
import { ShoppingCartCheckoutRounded, OpenInNewRounded, ShoppingBagRounded, EditRounded } from "@mui/icons-material";
import { ContactData } from "../WhatsAppPage";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useUserStore } from "../../../store/user/UserStore";
import { AssignAgentDialog } from "../../../components/orders/AssignAgentDialog";
import { request } from "../../../common/request";
import { toast } from "react-toastify";
import { orderNo } from "../../../lib/functions";

interface ContextPanelProps {
    selectedContact: ContactData | null;
    isMobileDrawer?: boolean;
    onRefresh?: () => void;
    onOpenOrder?: (id: number) => void;
}

export const ContextPanel: FC<ContextPanelProps> = ({ selectedContact, isMobileDrawer = false, onRefresh, onOpenOrder }) => {
    const navigate = useNavigate();
    const user = useUserStore(state => state.user);
    const [openAssign, setOpenAssign] = useState(false);

    if (!selectedContact) {
        return <Box sx={{ width: 320, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: { xs: 'none', lg: 'block' } }} />;
    }

    const { type, context, name, phone, id: clientId } = selectedContact;
    const isLead = type === 'lead' || !context.order;
    const isAdmin = ['Admin', 'Manager', 'Gerente', 'Master'].includes(user.role?.description || '');

    const handleConvertToOrder = () => {
        navigate('/orders', { state: { createNewOrder: true, prefillPhone: phone, prefillName: name } });
    };

    const handleAssignAgent = async (agentId: number) => {
        try {
            const { status } = await request(`/crm/clients/${clientId}/assign`, 'POST', JSON.stringify({ agent_id: agentId }));
            if (status) {
                toast.success("Asignación actualizada");
                if (onRefresh) onRefresh();
                setOpenAssign(false);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al asignar");
        }
    };

    const agentName = context.order?.agent?.names || context.agent?.names || '...';

    return (
        <Box 
            sx={{ 
                width: isMobileDrawer ? '100%' : 320, 
                borderLeft: isMobileDrawer ? 'none' : '1px solid', 
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: isMobileDrawer ? 'flex' : { xs: 'none', lg: 'flex' },
                flexDirection: 'column',
                height: '100%'
            }}
        >
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Avatar 
                    sx={{ width: 80, height: 80, fontSize: '2rem', mx: 'auto', mb: 2, bgcolor: isLead ? 'secondary.main' : 'primary.main' }}
                >
                    {name.charAt(0)}
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                    {name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {phone}
                </Typography>
                
                <Chip 
                    label={isLead ? "Lead Huérfano" : "Cliente Activo"} 
                    color={isLead ? "secondary" : "success"}
                    variant="outlined"
                    size="small" 
                    sx={{ fontWeight: 'bold' }} 
                />
            </Box>

            <Divider />

            <Box sx={{ p: 3, flexGrow: 1 }}>
                
                {/* Information Card (Lead or Order) */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold" sx={{ mb: 1.5, display: 'block' }}>
                        Estado de Asignación
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Asignado a:</Typography>
                                <Typography variant="body2" fontWeight="bold">{agentName}</Typography>
                            </Box>
                            {isAdmin && (
                                <IconButton size="small" color="primary" onClick={() => setOpenAssign(true)}>
                                    <EditRounded fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    </Paper>
                </Box>

                <Typography variant="overline" color="text.secondary" fontWeight="bold" sx={{ mb: 2, display: 'block' }}>
                    Acciones Comerciales
                </Typography>

                {isLead ? (
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 2, 
                            bgcolor: 'secondary.light', 
                            color: 'secondary.contrastText', 
                            textAlign: 'center',
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #f50057 0%, #ff4081 100%)'
                        }}
                    >
                        <ShoppingCartCheckoutRounded sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                            Potencial Venta
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, fontSize: '0.75rem' }}>
                            Este cliente está esperando atención y no tiene una orden.
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="inherit" 
                            fullWidth 
                            onClick={handleConvertToOrder}
                            endIcon={<OpenInNewRounded />}
                            sx={{ color: 'secondary.main', fontWeight: 'bold', bgcolor: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                        >
                            Crear Nueva Orden
                        </Button>
                    </Paper>
                ) : (
                    <Box>
                        {context.order && (
                            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Orden {orderNo(context.order.name)}
                                    </Typography>
                                    <Chip 
                                        label={context.order.status?.description || 'Desconocido'} 
                                        size="small" 
                                        color="primary" 
                                    />
                                </Box>
                                <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ mb: 0.5 }}>
                                    ${context.order.current_total_price}
                                </Typography>
                                {(selectedContact.total_ves ?? 0) > 0 && (
                                    <Typography variant="subtitle1" fontWeight="bold" color="success.main" sx={{ mb: 2 }}>
                                        Bs. {new Intl.NumberFormat('es-VE').format(selectedContact.total_ves ?? 0)}
                                    </Typography>
                                )}

                                {context.order.products && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                                            Productos:
                                        </Typography>
                                        <Stack spacing={0.5}>
                                            {context.order.products.map((p: any) => (
                                                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.02)', p: 0.5, borderRadius: 1 }}>
                                                    <Typography variant="caption" noWrap sx={{ maxWidth: 180 }}>
                                                        {p.product?.name || 'Producto'}
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight="bold">
                                                        x{p.quantity}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Fecha:</Typography>
                                    <Typography variant="caption" fontWeight="bold">{dayjs(context.order.created_at).format('DD/MM/YYYY')}</Typography>
                                </Box>
                            </Paper>
                        )}
                        <Button 
                            variant="outlined" 
                            fullWidth 
                            onClick={() => {
                                if (onOpenOrder && context.order?.id) {
                                    onOpenOrder(context.order.id);
                                } else {
                                    navigate('/orders', { state: { openOrderId: context.order?.id } });
                                }
                            }} 
                            startIcon={<ShoppingBagRounded />}
                            sx={{ borderRadius: 3 }}
                        >
                            Ver en Tablero
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Custom Assignment Dialog for Leads */}
            <AssignAgentDialog 
                open={openAssign} 
                onClose={() => setOpenAssign(false)} 
                onPick={(agent) => handleAssignAgent(agent.id)}
            />
        </Box>
    );
};
