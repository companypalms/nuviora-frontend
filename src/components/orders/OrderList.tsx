import { Box, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { darken } from "@mui/material/styles";
import { RefreshRounded } from "@mui/icons-material";
import React, { FC, useCallback, useEffect, useRef } from "react";
import { OrderItem, statusColors } from "./OrderItem";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { useUserStore } from "../../store/user/UserStore";
import { grey } from "@mui/material/colors";
import { request } from "../../common/request";
import { glowBorder } from "../ui/surface/glow";

interface OrderListProps {
    title: string;
}

export const OrderList: FC<OrderListProps> = ({ title }) => {
    const user = useUserStore((state) => state.user);

    // Selectores Atómicos para evitar re-renders masivos
    const column = useOrdersStore(useCallback((state) => state.columns[title], [title]));
    const filters = useOrdersStore((state) => state.filters);
    const searchTerm = useOrdersStore((state) => state.searchTerm);
    const refreshSignal = useOrdersStore((state) => state.refreshSignal);


    // Acciones (son estables, no causan re-render)
    const setColumnsOrder = useOrdersStore((state) => state.setColumnsOrder);
    const setColumnLoading = useOrdersStore((state) => state.setColumnLoading);

    // Derivar estado local de los props obtenidos
    const items = column?.items || [];
    const currentPage = column?.page || 0;
    const hasMore = column?.hasMore ?? true;
    const isLoading = column?.isLoading || false;

    // Ref para evitar doble fetch en strict mode o race conditions
    const loadingRef = useRef(false);
    // Ref para el AbortController
    const abortControllerRef = useRef<AbortController | null>(null);

    // Función de carga
    const fetchColumnData = useCallback(async (pageToLoad = 1) => {
        if (loadingRef.current && pageToLoad === 1) return; // Permitir scroll pero no doble refresh 1

        // Cancelar petición anterior si existe
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        loadingRef.current = true;
        setColumnLoading(title, true);

        try {
            const params = new URLSearchParams();
            params.append('per_page', '25');
            params.append('page', pageToLoad.toString());

            // Filtros Globales (Leer directamente del store para mantener estable el callback)
            const { filters, searchTerm } = useOrdersStore.getState();

            if (filters.city_id) params.append('city_id', filters.city_id);
            if (filters.agency_id) params.append('agency_id', filters.agency_id);
            if (filters.seller_id) params.append('seller_id', filters.seller_id);
            if (filters.scope) params.append('scope', filters.scope);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);

            // Búsqueda Global
            if (searchTerm) params.append('search', searchTerm);

            // Filtro STATUS (Clave para Kanban por columnas)
            params.append('status', title);

            const { ok, response } = await request(`/orders?${params.toString()}`, 'GET', undefined, abortControllerRef.current.signal);
            if (ok && typeof response.json === 'function') {
                const data = await response.json();
                const isAppend = pageToLoad > 1;
                setColumnsOrder(title, data.data, isAppend, data.meta.last_page > pageToLoad, data.meta.total);
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                console.error(e);
            }
        } finally {
            setColumnLoading(title, false);
            loadingRef.current = false;
        }
    }, [title, setColumnLoading, setColumnsOrder]);

    // Disparador Inicial (Carga Página 1)
    // OPTIMIZED: Skip initial fetch if store already has item (populated by bulk fetch)
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only fetch if:
            // 1. Column is empty AND (Filters/Search are active OR it's first load)
            // 2. Refresh signal was explicitly triggered
            const isFresh = items.length === 0;
            if (isFresh || refreshSignal > 0) {
                fetchColumnData(1);
            }
        }, 0);

        return () => {
            clearTimeout(timer);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [refreshSignal, fetchColumnData]); // Removed filters/searchTerm from here to avoid storm, parent handles bulk refresh

    // --- Polling Logic --- 🔇 DISABLED: Using WebSocket Instead
    /*
    const POLLING_COLS = [
        'Nuevo',
        'Novedades',
        'Novedad Solucionada',
        'Asignado a vendedor',
        'Asignar a agencia',
        'Reprogramado para hoy'
    ];
    const enablePolling = currentPage <= 1 && POLLING_COLS.includes(title);

    // Timer state - Random offset to prevent all columns fetching at exact same time
    const [countdown, setCountdown] = React.useState(30 + Math.floor(Math.random() * 10));

    useEffect(() => {
        if (!enablePolling) return; // Si no es polling col, no timer

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    // Check conditions to Run Refresh:
                    // 1. Not already loading
                    // 2. Tab is visible (save resources)
                    // 3. No Dialog is open (prevent blocking user interaction/network)
                    const isDialogBookingNetwork = document.querySelector('.MuiDialog-root');
                    const isTabVisible = !document.hidden;

                    if (!loadingRef.current && isTabVisible && !isDialogBookingNetwork) {
                        fetchColumnData(1); // Auto-refresh
                    }
                    return 30; // Reset
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [enablePolling, fetchColumnData]);
    */
    const enablePolling = false; // Forced to false - using WebSocket

    const handleManualRefresh = () => {
        fetchColumnData(1);
    };

    // Scroll Infinito Handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100; // 100px buffer

        if (bottom && hasMore && !isLoading && !loadingRef.current && currentPage > 0) {
            fetchColumnData(currentPage + 1);
        }
    };

    const color = statusColors[title] || grey[500];

    // La columna ocupa el alto del tablero: el encabezado queda fijo y solo baja la lista, así siempre se ve en qué
    // columna estás
    return (
        <Box
            id={`order-list-${title}`}
            component="section"
            aria-label={title}
            sx={(theme) => ({
                ...glowBorder(theme),
                display: "flex",
                flexDirection: "column",
                width: 300,
                flexShrink: 0,
                height: "100%",
                borderRadius: 4,
                overflow: "hidden",
                bgcolor: theme.palette.mode === "dark" ? darken(user.color, 0.82) : "background.paper",
            })}
        >
            <Box
                sx={{
                    display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, flexShrink: 0,
                    borderBottom: "1px solid", borderColor: "divider",
                    // Una franja del color del estado, para reconocer la columna de lejos
                    boxShadow: `inset 0 3px 0 ${color}`,
                }}
            >
                <Tooltip title={title} placement="top" enterDelay={600}>
                    <Typography variant="subtitle1" component="h2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                        {title}
                    </Typography>
                </Tooltip>
                <Box
                    component="span"
                    aria-label={`${column?.total || 0} órdenes`}
                    sx={{
                        flexShrink: 0, px: 1, minWidth: 28, height: 22, borderRadius: 11, display: "inline-flex",
                        alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", bgcolor: color,
                    }}
                >
                    {(column?.total || 0) > 999 ? "999+" : column?.total || 0}
                </Box>
                <Tooltip title="Actualizar la lista">
                    <IconButton size="small" onClick={handleManualRefresh} aria-label={`Actualizar ${title}`} sx={{ flexShrink: 0 }}>
                        <RefreshRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
            <Box
                onScroll={handleScroll}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    p: 1.5,
                    gap: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-thumb": { borderRadius: 3, bgcolor: "action.disabled" },
                }}
            >
                {items.map((order: any) => (
                    <OrderItem key={order.id} order={order} />
                ))}

                {isLoading && (
                    <Box py={2} display="flex" justifyContent="center" width="100%">
                        <CircularProgress size={24} />
                    </Box>
                )}

                {!hasMore && items.length > 0 && (
                    <Box py={2} display="flex" justifyContent="center" width="100%">
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Fin de la lista
                        </Typography>
                    </Box>
                )}

                {!isLoading && items.length === 0 && (
                    <Box py={4} display="flex" justifyContent="center" width="100%">
                        <Typography variant="body2" color="text.secondary">
                            Sin órdenes
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
