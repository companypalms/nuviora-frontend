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
    Button,
    alpha,
    useTheme
} from "@mui/material";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useNotificationStore } from "../../../store/notifications/NotificationStore";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { OrderDialog } from "../../orders/OrderDialog";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import { useOrdersStore } from "../../../store/orders/OrdersStore";

export const NotificationBell = () => {
    const theme = useTheme();
    const { notifications, dismissNotification, clearAll, openDialogOrderId, setOpenDialogOrderId } = useNotificationStore();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const setSelectedOrder = useOrdersStore(s => s.setSelectedOrder);

    // 🔔 Listen for global dialog triggers (e.g. from Toasts)
    React.useEffect(() => {
        if (openDialogOrderId) {
            setSelectedOrder({ id: openDialogOrderId });
            setOpenDialogOrderId(null); // Consume the event
        }
    }, [openDialogOrderId, setOpenDialogOrderId, setSelectedOrder]);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (orderId: number) => {
        setSelectedOrder({ id: orderId });
        dismissNotification(orderId);
        handleCloseMenu();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'reminder': return <NotificationsActiveRoundedIcon sx={{ color: 'warning.main' }} />;
            case 'scheduled': return <ScheduleRoundedIcon sx={{ color: 'info.main' }} />;
            case 'novedad': return <WarningRoundedIcon sx={{ color: 'error.main' }} />;
            default: return <NotificationsRoundedIcon />;
        }
    };

    return (
        <>
            <Tooltip title="Notificaciones">
                <IconButton
                    onClick={handleOpenMenu}
                    sx={{
                        color: 'inherit',
                        bgcolor: anchorEl ? 'rgba(255,255,255,0.1)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
                    }}
                >
                    <Badge badgeContent={notifications.length} color="error">
                        <NotificationsRoundedIcon />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                    sx: {
                        width: 360,
                        maxHeight: 500,
                        borderRadius: 4,
                        mt: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        bgcolor: 'background.paper'
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Notificaciones</Typography>
                    {notifications.length > 0 && (
                        <Typography
                            variant="caption"
                            onClick={clearAll}
                            sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 'bold' }}
                        >
                            Limpiar todo
                        </Typography>
                    )}
                </Box>
                <Divider />

                <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
                    {notifications.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                            <NotificationsRoundedIcon sx={{ fontSize: 40, mb: 1, color: 'text.disabled' }} />
                            <Typography variant="body2" color="text.secondary">Sin notificaciones nuevas</Typography>
                        </Box>
                    ) : (
                        notifications.map((notif) => (
                            <MenuItem
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.orderId)}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    gap: 2,
                                    whiteSpace: 'normal',
                                    '&:hover': { bgcolor: 'action.hover' }
                                }}
                            >
                                <Avatar sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1), width: 40, height: 40 }}>
                                    {getIcon(notif.type)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                                        {notif.message}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDistanceToNow(new Date(notif.createdAt), { locale: es, addSuffix: true })}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dismissNotification(notif.orderId);
                                    }}
                                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                >
                                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </MenuItem>
                        ))
                    )}
                </Box>
            </Menu>
        </>
    );
};
