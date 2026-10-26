import React, { FC } from "react";
import {
    Dialog,
    DialogContent,
    Typography,
    Box,
    Button,
    Avatar,
    Zoom,
    Backdrop,
    IconButton,
    useTheme,
} from "@mui/material";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { red, yellow } from "@mui/material/colors";
import { TypographyCustom } from "../custom";
import { orderNo } from "../../lib/functions";

interface OrderAlertPopupProps {
    open: boolean;
    order: any;
    onClose: () => void;
    onView: (id: number) => void;
}

export const OrderAlertPopup: FC<OrderAlertPopupProps> = ({ open, order, onClose, onView }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    if (!order) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            TransitionComponent={Zoom}
            slots={{
                backdrop: (props) => (
                    <Backdrop
                        {...props}
                        sx={{
                            backdropFilter: 'blur(12px)',
                            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
                        }}
                    />
                )
            }}
            PaperProps={{
                sx: {
                    borderRadius: 6,
                    overflow: 'visible',
                    maxWidth: 400,
                    width: '100%',
                    background: isDark
                        ? 'rgba(30, 30, 30, 0.8)'
                        : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: isDark
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'}`,
                    textAlign: 'center',
                    p: 1
                }
            }}
        >
            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: 'grey.500',
                    transition: 'all 0.2s',
                    '&:hover': {
                        transform: 'rotate(90deg)',
                        color: red[500]
                    }
                }}
            >
                <CloseRoundedIcon />
            </IconButton>

            <DialogContent sx={{ pt: 4, pb: 2 }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    <Box
                        sx={{
                            position: 'relative',
                            display: 'inline-flex',
                            mb: 2
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                bgcolor: red[100],
                                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                                '@keyframes ping': {
                                    '75%, 100%': {
                                        transform: 'scale(2)',
                                        opacity: 0,
                                    },
                                },
                            }}
                        />
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: red[500],
                                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)',
                                position: 'relative'
                            }}
                        >
                            <NotificationsActiveRoundedIcon
                                sx={{
                                    fontSize: 45,
                                    color: 'white',
                                    animation: 'shake 0.8s infinite',
                                    '@keyframes shake': {
                                        '0%, 100%': { transform: 'rotate(0)' },
                                        '25%': { transform: 'rotate(15deg)' },
                                        '75%': { transform: 'rotate(-15deg)' },
                                    }
                                }}
                            />
                        </Avatar>
                    </Box>

                    <TypographyCustom
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            background: `linear-gradient(45deg, ${red[700]}, ${red[400]})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: -1,
                            mt: 1
                        }}
                    >
                        ¡Vencimiento!
                    </TypographyCustom>

                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500, px: 2 }}>
                        La orden <Box component="span" sx={{ color: red[600], fontWeight: 700 }}>{orderNo(order.name)}</Box> requiere tu atención inmediata.
                    </Typography>

                    <Box
                        sx={{
                            width: '100%',
                            mt: 2,
                            p: 2.5,
                            bgcolor: isDark ? 'rgba(255, 193, 7, 0.05)' : 'rgba(255, 193, 7, 0.1)',
                            borderRadius: 4,
                            border: `1px solid ${isDark ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.2)'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5
                        }}
                    >
                        <TypographyCustom variant="subtitle1" fontWeight="800" color={isDark ? yellow[200] : yellow[900]}>
                            {order.client?.first_name} {order.client?.last_name}
                        </TypographyCustom>
                        <Typography variant="body2" sx={{ color: isDark ? yellow[100] : yellow[900], opacity: 0.8, fontWeight: 600 }}>
                            📞 {order.client?.phone}
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>

            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => {
                        onView(order.id);
                        onClose();
                    }}
                    sx={{
                        borderRadius: 3,
                        py: 1.5,
                        fontWeight: 800,
                        fontSize: '1rem',
                        bgcolor: red[500],
                        textTransform: 'none',
                        boxShadow: `0 10px 15px -3px rgba(239, 68, 68, 0.3)`,
                        '&:hover': {
                            bgcolor: red[600],
                            transform: 'translateY(-2px)',
                            boxShadow: `0 15px 20px -5px rgba(239, 68, 68, 0.4)`,
                        },
                        transition: 'all 0.2s'
                    }}
                >
                    Gestionar Ahora
                </Button>
                <Button
                    fullWidth
                    variant="text"
                    color="inherit"
                    onClick={onClose}
                    sx={{
                        borderRadius: 3,
                        fontWeight: 700,
                        textTransform: 'none',
                        color: 'text.secondary',
                        '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                        }
                    }}
                >
                    Ignorar por un momento
                </Button>
            </Box>
        </Dialog>
    );
};
