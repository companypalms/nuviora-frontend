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
import { useNotificationStore } from "../../store/notifications/NotificationStore";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { LiteOrderDialog } from "./LiteOrderDialog";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AssignmentIndRoundedIcon from "@mui/icons-material/AssignmentIndRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export const LiteNotificationBell = () => {
    const { notifications, dismissNotification, clearAll, openDialogOrderId, setOpenDialogOrderId } = useNotificationStore();
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [openDialog, setOpenDialog] = useState(false);

    // 🔔 Listen for global dialog triggers (e.g. from Toasts)
    React.useEffect(() => {
        if (openDialogOrderId) {
            setSelectedOrderId(openDialogOrderId);
            setOpenDialog(true);
            setOpenDialogOrderId(null); // Consume the event
        }
    }, [openDialogOrderId, setOpenDialogOrderId]);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (orderId: number) => {
        setSelectedOrderId(orderId);
        setOpenDialog(true);
        dismissNotification(orderId);
        handleCloseMenu();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'reminder': return <NotificationsActiveRoundedIcon sx={{ color: 'warning.main' }} />;
            case 'scheduled': return <ScheduleRoundedIcon sx={{ color: 'info.main' }} />;
            case 'novedad': return <WarningRoundedIcon sx={{ color: 'error.main' }} />;
            case 'novelty_resolved': return <CheckCircleRoundedIcon sx={{ color: 'success.main' }} />;
            case 'assigned': return <AssignmentIndRoundedIcon sx={{ color: 'primary.main' }} />;
            case 'waiting_location': return <TimerRoundedIcon sx={{ color: 'warning.dark' }} />;
            default: return <NotificationsRoundedIcon />;
        }
    };

    return (
        <>
            <Tooltip title="Notificaciones">
                <IconButton
                    onClick={handleOpenMenu}
                    size="small"
                    sx={{
                        color: 'inherit',
                        bgcolor: anchorEl ? 'rgba(0,0,0,0.05)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }
                    }}
                >
                    <Badge badgeContent={notifications.length} color="error">
                        <NotificationsRoundedIcon color="action" />
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
                    <Typography variant="subtitle2" fontWeight="bold">Notificaciones</Typography>
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
                            <NotificationsRoundedIcon sx={{ fontSize: 30, mb: 1, color: 'text.disabled' }} />
                            <Typography variant="caption" display="block">Sin notificaciones nuevas</Typography>
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
                                    gap: 1.5,
                                    whiteSpace: 'normal',
                                    '&:hover': { bgcolor: 'action.hover' }
                                }}
                            >
                                <Avatar sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1), width: 32, height: 32 }}>
                                    {React.cloneElement(getIcon(notif.type) as React.ReactElement<any>, { sx: { fontSize: 18 } })}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight="medium" sx={{ lineHeight: 1.2, fontSize: '0.85rem' }}>
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
                                        dismissNotification(notif.orderId);
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
