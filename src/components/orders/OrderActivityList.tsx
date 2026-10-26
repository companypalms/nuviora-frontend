import React, { useState, useEffect, useMemo } from "react";
import { Box, Avatar, Chip, Tooltip, Divider, useTheme, Paper, Fade, CircularProgress, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from "@mui/material";
import { TypographyCustom } from "../custom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { grey } from "@mui/material/colors";
import { darken, lighten } from "@mui/material/styles";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import { request } from "../../common/request";

interface OrderActivityListProps {
    orderId: number;
}

export const OrderActivityList: React.FC<OrderActivityListProps> = ({ orderId }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterUser, setFilterUser] = useState<string>("all");

    useEffect(() => {
        const fetchActivities = async () => {
            setLoading(true);
            try {
                const result = await request(`/orders/${orderId}/activities`, 'GET');
                if (result.status === 200) {
                    const data = await result.response.json();
                    setActivities(data.data);
                }
            } catch (error) {
                console.error("Error fetching activities:", error);
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            fetchActivities();
        }
    }, [orderId]);

    const usersInvolved = useMemo(() => {
        const usersMap = new Map();
        activities.forEach(a => {
            if (a.user && a.user.id !== undefined && a.user.id !== null) {
                usersMap.set(a.user.id, `${a.user.names} ${a.user.surnames || ''}`.trim());
            } else if (a.user) {
                // For system users or users without ID
                usersMap.set('system', a.user.names || 'Sistema');
            }
        });
        return Array.from(usersMap.entries()).map(([id, name]) => ({ id, name }));
    }, [activities]);

    const filteredActivities = useMemo(() => {
        if (filterUser === "all") return activities;
        return activities.filter(a => (a.user_id?.toString() || (a.user?.id?.toString()) || 'system') === filterUser);
    }, [activities, filterUser]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (activities.length === 0) {
        return (
            <Box sx={{ py: 10, textAlign: 'center', opacity: 0.5 }}>
                <HistoryRoundedIcon sx={{ fontSize: 60, mb: 2 }} />
                <TypographyCustom variant="body1">No hay historial de acciones todavía.</TypographyCustom>
                <TypographyCustom variant="caption">Los cambios automáticos y manuales aparecerán aquí.</TypographyCustom>
            </Box>
        );
    }

    return (
        <Box sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            pb: 20, // Space for the fixed floating comment input
            width: '100%',
            maxWidth: '1000px',
            margin: 'auto'
        }}>
            {/* Filter Section */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel id="user-filter-label" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilterListRoundedIcon fontSize="small" /> Filtrar por usuario
                    </InputLabel>
                    <Select
                        labelId="user-filter-label"
                        value={filterUser}
                        label="Filtrar por usuario"
                        onChange={(e: SelectChangeEvent) => setFilterUser(e.target.value)}
                        sx={{ borderRadius: 2 }}
                    >
                        <MenuItem value="all">Todos los usuarios</MenuItem>
                        {usersInvolved.map(u => (
                            <MenuItem key={u.id} value={u.id?.toString()}>{u.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Box sx={{ position: 'relative' }}>
                <Box sx={{
                    position: 'absolute',
                    left: { xs: 20, sm: 28 },
                    top: 20,
                    bottom: 0,
                    width: 2,
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    zIndex: 0
                }} />

                {filteredActivities.map((a: any, index: number) => {
                    const userColor = a.user?.color || theme.palette.primary.main;
                    const formattedDate = format(new Date(a.created_at), "d 'de' MMM, h:mm a", { locale: es });

                    return (
                        <Fade in key={a.id} style={{ transitionDelay: `${index * 30}ms` }}>
                            <Box sx={{
                                display: "flex",
                                flexDirection: "row",
                                gap: { xs: 1.5, sm: 2 },
                                alignItems: 'flex-start',
                                position: 'relative',
                                mb: 3,
                                zIndex: 1
                            }}>
                                <Tooltip title={`${a.user?.names || 'Sistema'} (${a.user?.email || 'System'})`} arrow>
                                    <Avatar
                                        sx={{
                                            width: { xs: 32, sm: 40 },
                                            height: { xs: 32, sm: 40 },
                                            bgcolor: a.user ? userColor : grey[500],
                                            color: theme.palette.getContrastText(a.user ? userColor : grey[500]),
                                            boxShadow: `0 0 0 4px ${isDark ? theme.palette.background.default : 'white'}`,
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold',
                                            flexShrink: 0
                                        }}
                                    >
                                        {a.user?.names?.charAt(0) ?? "S"}
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
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <TypographyCustom variant="subtitle2" fontWeight="bold">
                                            {a.user ? `${a.user.names} ${a.user.surnames || ''}` : 'Sistema'}
                                            {/* H10: a 10 px la tilde de "Líder" se veía como un punto; por eso la letra es algo mayor */}
                                            {a.actor_role && a.actor_role !== 'Sistema' && (
                                                <Chip size="small" label={a.actor_role} color={a.actor_role === 'Líder' ? 'warning' : 'default'} variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.75rem', fontWeight: 600 }} />
                                            )}
                                            {a.user?.email && (
                                                <TypographyCustom component="span" variant="caption" sx={{ ml: 1, opacity: 0.6, fontWeight: 'normal' }}>
                                                    • {a.user.email}
                                                </TypographyCustom>
                                            )}
                                        </TypographyCustom>
                                        <TypographyCustom variant="caption" sx={{ opacity: 0.5 }}>
                                            {formattedDate}
                                        </TypographyCustom>
                                    </Box>

                                    <TypographyCustom variant="body2" sx={{
                                        lineHeight: 1.6,
                                        color: isDark ? grey[300] : grey[800],
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {a.description.split(' | ').map((part: string, i: number) => (
                                            <Box key={i} sx={{ display: 'block', mb: 0.5 }}>
                                                • {part}
                                            </Box>
                                        ))}
                                    </TypographyCustom>
                                </Paper>
                            </Box>
                        </Fade>
                    );
                })}
            </Box>
        </Box>
    );
};
