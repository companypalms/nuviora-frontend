import React, { useState } from "react";
import { Box, Avatar, Tooltip, Divider, useTheme, Paper, Fade, Dialog, IconButton } from "@mui/material";
import { TypographyCustom } from "../custom";
import { useUserStore } from "../../store/user/UserStore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { grey } from "@mui/material/colors";
import { darken, lighten } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

interface OrderUpdatesListProps {
    updates: any[];
}

export const OrderUpdatesList: React.FC<OrderUpdatesListProps> = ({ updates }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const currentUser = useUserStore(state => state.user);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const manualUpdates = React.useMemo(() => {
        if (!updates) return [];
        return updates.filter((u: any) => {
            // Filter out system patterns and automated messages
            const systemEmojis = ["➕", "🗑️", "🛠️", "🚨", "✅", "⚠️", "🚛", "📦", "🔔", "📅", "🕒", "⏳"];
            const isAutomated = u.message?.toUpperCase().includes("AUTOMÁTICO");
            const startsWithEmoji = systemEmojis.some(emoji => u.message?.trim().startsWith(emoji));

            // If it doesn't have a user, it's definitely from the system
            if (!u.user) return false;

            // If it's automated or starts with a system emoji, it's considered an action log, not a manual update
            return !isAutomated && !startsWithEmoji;
        });
    }, [updates]);

    if (!manualUpdates || manualUpdates.length === 0) {
        return (
            <Box sx={{ py: 10, textAlign: 'center', opacity: 0.5 }}>
                <TypographyCustom variant="body1">No hay notas todavía.</TypographyCustom>
                <TypographyCustom variant="caption">Las notas escritas por el equipo aparecerán aquí.</TypographyCustom>
            </Box>
        );
    }

    return (
        <Box sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            pb: 25, // Extra space for the fixed floating comment input
            width: { xs: '100%', md: '85%', lg: '70%' },
            margin: 'auto',
            position: 'relative'
        }}>
            <Box sx={{
                position: 'absolute',
                left: { xs: 15, sm: 19 }, // (Avatar Width / 2) - (Line Width / 2)
                top: 20,
                bottom: 80,
                width: 2,
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                zIndex: 0
            }} />

            {manualUpdates.map((u: any, index: number) => {
                const userColor = u.user?.color || theme.palette.primary.main;
                const formattedDate = format(new Date(u.created_at), "d 'de' MMMM, h:mm a", { locale: es });

                return (
                    <Fade in key={u.id} style={{ transitionDelay: `${index * 50}ms` }}>
                        <Box sx={{
                            display: "flex",
                            flexDirection: "row",
                            gap: { xs: 1.5, sm: 2 },
                            alignItems: 'flex-start',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <Tooltip title={`${u.user?.role?.description}`} arrow>
                                <Avatar
                                    sx={{
                                        width: { xs: 32, sm: 40 },
                                        height: { xs: 32, sm: 40 },
                                        bgcolor: userColor,
                                        color: theme.palette.getContrastText(userColor),
                                        boxShadow: `0 0 0 4px ${isDark ? theme.palette.background.default : 'white'}`,
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold',
                                        flexShrink: 0
                                    }}
                                >
                                    {u.user?.role?.description.charAt(0) ?? "U"}
                                </Avatar>
                            </Tooltip>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    flex: 1,
                                    border: '1px solid',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                    bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'white',
                                    position: 'relative',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.01)',
                                        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.03)'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 1 }}>
                                    <TypographyCustom variant="subtitle2" fontWeight="bold" sx={{ color: isDark ? lighten(userColor, 0.3) : darken(userColor, 0.2) }}>
                                        {u.user?.role?.description ?? 'Sistema'}
                                    </TypographyCustom>
                                    <TypographyCustom variant="caption" sx={{ opacity: 0.5, mt: { xs: 0.5, sm: 0 } }}>
                                        {formattedDate}
                                    </TypographyCustom>
                                </Box>

                                <TypographyCustom variant="body2" sx={{ lineHeight: 1.6, color: isDark ? grey[300] : grey[800] }}>
                                    {u.message}
                                </TypographyCustom>

                                {u.image_url && (
                                    <Box sx={{
                                        mt: 2,
                                        position: 'relative',
                                        width: 'fit-content',
                                        maxWidth: '100%',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        '&:hover .zoom-overlay': { opacity: 1 }
                                    }} onClick={() => setSelectedImage(u.image_url)}>
                                        <img
                                            src={u.image_url}
                                            alt="update"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: 300,
                                                display: 'block',
                                                borderRadius: 8
                                            }}
                                        />
                                        <Box className="zoom-overlay" sx={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            bgcolor: 'rgba(0,0,0,0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0,
                                            transition: 'opacity 0.2s'
                                        }}>
                                            <ZoomInIcon sx={{ color: 'white', fontSize: 32 }} />
                                        </Box>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    </Fade>
                );
            })}

            <Dialog
                open={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                maxWidth="lg"
                PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } }}
            >
                <IconButton
                    onClick={() => setSelectedImage(null)}
                    sx={{ position: 'absolute', top: -48, right: 0, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                >
                    <CloseRoundedIcon />
                </IconButton>
                {selectedImage && (
                    <img
                        src={selectedImage}
                        alt="full view"
                        style={{ width: '100%', height: 'auto', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
                    />
                )}
            </Dialog>
        </Box>
    );
};
