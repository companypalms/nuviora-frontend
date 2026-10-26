import React, { useState } from "react";
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Typography,
    Box,
    Divider,
    Avatar,
    Tooltip,
    alpha,
    useTheme
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useNotificationStore } from "../../store/notifications/NotificationStore";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { LiteOrderDialog } from "./LiteOrderDialog";

export const LiteWhatsAppBell = () => {
    const { whatsappNotifications, dismissWhatsAppNotification, clearAllWhatsApp } = useNotificationStore();
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [openDialog, setOpenDialog] = useState(false);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (orderId: number) => {
        dismissWhatsAppNotification(orderId);
        handleCloseMenu();
        // Notify parent to open order dialog with whatsapp tab
        useOrdersStore.getState().setInitialTabId('whatsapp');
        setSelectedOrderId(orderId);
        setOpenDialog(true);
    };

    return (
        <>
            <Tooltip title="Mensajes de WhatsApp">
                <IconButton
                    onClick={handleOpenMenu}
                    size="small"
                    sx={{
                        color: 'inherit',
                        bgcolor: anchorEl ? 'rgba(0,0,0,0.05)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }
                    }}
                >
                    <Badge badgeContent={whatsappNotifications.length} sx={{ '& .MuiBadge-badge': { bgcolor: '#25D366', color: 'white' } }}>
                        <WhatsAppIcon color="action" />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        width: 320,
                        maxHeight: 500,
                        borderRadius: 4,
                        mt: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: theme.shadows[4],
                        overflow: 'hidden',
                        bgcolor: 'background.paper'
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" fontWeight="bold">WhatsApp</Typography>
                    {whatsappNotifications.length > 0 && (
                        <Typography
                            variant="caption"
                            onClick={clearAllWhatsApp}
                            sx={{ cursor: 'pointer', color: '#25D366', fontWeight: 'bold' }}
                        >
                            Limpiar todo
                        </Typography>
                    )}
                </Box>
                <Divider />

                <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
                    {whatsappNotifications.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                            <WhatsAppIcon sx={{ fontSize: 30, mb: 1, color: 'text.disabled' }} />
                            <Typography variant="caption" display="block">No hay mensajes nuevos</Typography>
                        </Box>
                    ) : (
                        whatsappNotifications.map((notif) => (
                            <MenuItem
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.orderId)}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    gap: 1.5,
                                    whiteSpace: 'white-space',
                                    '&:hover': { bgcolor: 'action.hover' }
                                }}
                            >
                                <Avatar sx={{ bgcolor: '#25D366', width: 32, height: 32, color: 'white' }}>
                                    <WhatsAppIcon sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        #{notif.orderName}
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium" sx={{ lineHeight: 1.2, fontSize: '0.85rem', mt: 0.3, mb: 0.5, whiteSpace: 'normal' }}>
                                        {notif.message}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                        {formatDistanceToNow(new Date(notif.createdAt), { locale: es, addSuffix: true })}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dismissWhatsAppNotification(notif.orderId);
                                    }}
                                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                >
                                    <CloseRoundedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </MenuItem>
                        ))
                    )}
                </Box>
            </Menu>

            {openDialog && selectedOrderId && (
                <LiteOrderDialog
                    open={openDialog}
                    setOpen={setOpenDialog}
                    id={selectedOrderId}
                />
            )}
        </>
    );
};
