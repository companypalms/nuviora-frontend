import { Box, Button, Fab, IconButton, Stack, Tooltip } from "@mui/material";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { DescripcionDeVista } from "../components/ui/content/DescripcionDeVista";
import { Loading } from "../components/ui/content/Loading";
import { Layout } from "../components/ui/Layout";
import { useUserStore } from "../store/user/UserStore";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import { useOrdersStore } from "../store/orders/OrdersStore";
import { OrderList } from "../components/orders/OrderList";
import { toast } from "react-toastify";
import { ProductSearchDialog } from "../components/products/ProductsSearchDialog";
import { SearchRounded } from "@mui/icons-material";
import { KanbanFilters } from "../components/orders/KanbanFilters";
import { OrderDialog } from "../components/orders/OrderDialog";
import { CreateOrderDialog } from "../components/orders/CreateOrderDialog";
import { BankAccountsDialog } from "../components/orders/BankAccountsDialog";
import { DailyRatesDialog } from "../components/orders/DailyRatesDialog";
import { AssignAgentDialog } from "../components/orders/AssignAgentDialog";
import { AssignDelivererDialog } from "../components/orders/AssignDelivererDialog";
import { PostponeOrderDialog } from "../components/orders/PostponeOrderDialog";
import { AssignAgencyDialog } from "../components/orders/AssignAgencyDialog";
import { NoveltyDialog } from "../components/orders/NoveltyDialog";
import { ResolveNovedadDialog } from "../components/orders/ResolveNovedadDialog";
import { MarkDeliveredDialog } from "../components/orders/MarkDeliveredDialog";
import { AccountBalanceRounded, AddCircleOutline, CurrencyExchange } from "@mui/icons-material";
import { usePermissions } from "../hooks/usePermissions";
import { ORDER_STATUS } from "../constants/OrderStatus";

import { useLocation } from "react-router-dom";

/** Los botones redondos del encabezado (cuentas bancarias, tasas). */
const actionButtonSx = { bgcolor: "background.paper", border: "1px solid", borderColor: "divider" } as const;

export const Orders = () => {
    const { isAdmin, isSupervisor, canCreateOrders, userRole, isAgency, isDeliverer } = usePermissions();
    const userStore = useUserStore();
    const location = useLocation();
    const { searchTerm, selectedOrder, setSelectedOrder, filters, activeModal, setActiveModal, setBulkColumns, changeStatus, registerNovelty } = useOrdersStore();
    const validateToken = useUserStore((state) => state.validateToken);

    const [openSearch, setOpenSearch] = useState(false);
    const [cities, setCities] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);

    const [visibleColumns, setVisibleColumns] = useState<string[] | null>(null);
    const [openBankDialog, setOpenBankDialog] = useState(false);
    const [openRatesDialog, setOpenRatesDialog] = useState(false);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [prefillData, setPrefillData] = useState<any>(null);

    useEffect(() => {
        if (location.state?.createNewOrder) {
            setPrefillData({
                name: location.state.prefillName,
                phone: location.state.prefillPhone
            });
            setOpenCreateDialog(true);
            // Clear location state to avoid re-opening on manual refresh
            window.history.replaceState({}, document.title);
        } else if (location.state?.openOrderId) {
            setSelectedOrder({ id: location.state.openOrderId });
            // Clear location state
            window.history.replaceState({}, document.title);
        }
    }, [location.state, setSelectedOrder]);



    const handlePickProduct = (product: any) => {
        toast.info(`Seleccionaste: ${product.name ?? product.title}`);
        setOpenSearch(false);
    };

    const fetchFiltersData = async () => {
        try {
            const [citiesRes, agenciesRes, sellersRes] = await Promise.all([
                request("/cities", "GET"),
                request("/users/role/Agencia", "GET"),
                request("/users/role/Vendedor", "GET")
            ]);
            if (citiesRes.status) setCities(await citiesRes.response.json());
            if (agenciesRes.status) {
                const data = await agenciesRes.response.json();
                setAgencies(data.data);
            }
            if (sellersRes.status) {
                const data = await sellersRes.response.json();
                setSellers(data.data);
            }
        } catch (e) {
            console.error("Error fetching filters data", e);
        }
    };

    // NOTA: La carga de órdenes ahora es responsabilidad de cada columna (OrderList)
    // Orders.tsx solo gestiona los filtros globales.

    useEffect(() => {
        const validate = async () => {
            const result = await validateToken();
            if (!result.status) {
                toast.error("Sesión expirada, inicia sesión nuevamente.");
                return (window.location.href = "/");
            }
            if (isSupervisor) {
                fetchFiltersData();
            } else {
                request('/config/flow', 'GET').then(async ({ status, response }) => {
                    if (status === 200) {
                        try {
                            const data = await response.json();
                            if (data && data.visible_columns) {
                                setVisibleColumns(data.visible_columns);
                            }
                        } catch (e) {
                            console.error("Error parsing flow config", e);
                        }
                    }
                });
            }
        };

        validate();
    }, []);

    useEffect(() => {
        const fetchKanbanData = async () => {
            const params = new URLSearchParams();
            if (filters.city_id) params.append('city_id', filters.city_id);
            if (filters.agency_id) params.append('agency_id', filters.agency_id);
            if (filters.seller_id) params.append('seller_id', filters.seller_id);
            if (filters.scope) params.append('scope', filters.scope);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (searchTerm) params.append('search', searchTerm);

            const queryString = params.toString();
            const { ok, response } = await request(`/kanban-data${queryString ? `?${queryString}` : ""}`, 'GET');
            if (ok) {
                const result = await response.json();
                setBulkColumns(result.data);
            }
        };
        const timer = setTimeout(() => {
            fetchKanbanData();
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [filters, searchTerm, setBulkColumns]);

    if (!userStore.user.token) return <Loading />;

    return (
        <Layout>
            {/* El Kanban ocupa el alto de la ventana: encabezado, filtros y un tablero donde cada columna baja por su cuenta */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: "calc(100dvh - 32px)", minHeight: 560 }}>
                <Stack direction="row" alignItems="flex-end" justifyContent="space-between" gap={2} flexWrap="wrap">
                    <DescripcionDeVista title="Kanban de órdenes" description="Gestiona el flujo de entregas y novedades" />
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                        <Tooltip title="Cuentas bancarias">
                            <IconButton aria-label="Cuentas bancarias" onClick={() => setOpenBankDialog(true)} sx={actionButtonSx}>
                                <AccountBalanceRounded color="primary" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Tasas del día">
                            <IconButton aria-label="Tasas del día" onClick={() => setOpenRatesDialog(true)} sx={actionButtonSx}>
                                <CurrencyExchange color="success" />
                            </IconButton>
                        </Tooltip>
                        {canCreateOrders && (
                            <Button variant="contained" disableElevation startIcon={<AddCircleOutline />} onClick={() => setOpenCreateDialog(true)}>
                                Crear orden
                            </Button>
                        )}
                    </Stack>
                </Stack>

                <KanbanFilters
                    isSupervisor={isSupervisor}
                    cities={cities.map((c) => ({ id: c.id, name: c.name }))}
                    agencies={agencies.map((a) => ({ id: a.id, name: a.names }))}
                    sellers={sellers.map((v) => ({ id: v.id, name: v.names }))}
                />

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        gap: 2,
                        overflowX: "auto",
                        overflowY: "hidden",
                        pb: 1.5,
                        "&::-webkit-scrollbar": { height: 10 },
                        "&::-webkit-scrollbar-track": { borderRadius: 5, bgcolor: "action.hover" },
                        "&::-webkit-scrollbar-thumb": { borderRadius: 5, bgcolor: "primary.main" },
                    }}
                >
                    {visibleColumns && visibleColumns.length > 0 ? (
                        // 🌟 Renderizado Dinámico basado en Configuración
                        visibleColumns.map((col) => (
                            <OrderList key={col} title={col} />
                        ))
                    ) : (
                        // 🔒 Renderizado Fallback / Admin (Vista Completa Legacy)
                        <>
                            <OrderList title="Novedades" />
                            <OrderList title="Novedad Solucionada" />

                            {isSupervisor && (
                                <>
                                    <OrderList title="Nuevo" />
                                    <OrderList title="Sin Stock" />
                                </>
                            )}

                            {!isAgency && (
                                <>
                                    <OrderList title="Reprogramado para hoy" />
                                    <OrderList title="Asignado a vendedor" />
                                    <OrderList title="Llamado 1" />
                                    <OrderList title="Llamado 2" />
                                    <OrderList title="Llamado 3" />
                                    <OrderList title="Esperando Ubicacion" />
                                    <OrderList title="Confirmado" />
                                </>
                            )}

                            {/* Todas las agencias de la ciudad llenas: se asigna sola al liberarse cupo */}
                            {!isAgency && <OrderList title="Pendiente de asignación a agencia" />}
                            <OrderList title="Asignar a agencia" />

                            {(isSupervisor || isAgency) && (
                                <>
                                    <OrderList title="Asignado a repartidor" />
                                    <OrderList title="En ruta" />
                                </>
                            )}

                            {!isAgency && (
                                <>
                                    <OrderList title="Programado para mas tarde" />
                                    <OrderList title="Programado para otro dia" />
                                </>
                            )}

                            <OrderList title="Entregado" />
                            {!(isAgency || isDeliverer) && (
                                <OrderList title="Cancelado" />
                            )}
                        </>
                    )}
                </Box>
            </Box>

            <ProductSearchDialog open={openSearch} onClose={() => setOpenSearch(false)} onPick={handlePickProduct} />
            <Tooltip title="Buscar productos" placement="left">
                <Fab color="primary" aria-label="Buscar productos" sx={{ position: "fixed", right: 24, bottom: 24 }} onClick={() => setOpenSearch(true)}>
                    <SearchRounded />
                </Fab>
            </Tooltip>
            <BankAccountsDialog open={openBankDialog} onClose={() => setOpenBankDialog(false)} />
            <DailyRatesDialog open={openRatesDialog} onClose={() => setOpenRatesDialog(false)} />
            <CreateOrderDialog
                open={openCreateDialog}
                onClose={() => {
                    setOpenCreateDialog(false);
                    setPrefillData(null);
                }}
                prefillName={prefillData?.name}
                prefillPhone={prefillData?.phone}
            />
            {selectedOrder && (
                <OrderDialog
                    open={!!selectedOrder}
                    setOpen={(val) => {
                        if (!val) setSelectedOrder(null);
                    }}
                    id={selectedOrder.id}
                />
            )}

            {/* Centralized Modals */}
            {activeModal.type === 'assign_agent' && activeModal.data && (
                <AssignAgentDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    orderId={activeModal.data.id}
                />
            )}
            {activeModal.type === 'assign_deliverer' && activeModal.data && (
                <AssignDelivererDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    orderId={activeModal.data.id}
                />
            )}
            {activeModal.type === 'postpone' && activeModal.data && (
                <PostponeOrderDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    orderId={activeModal.data.id}
                    targetStatus={activeModal.data.targetStatus}
                />
            )}
            {activeModal.type === 'assign_agency' && activeModal.data && (
                <AssignAgencyDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    orderId={activeModal.data.id}
                    stockElsewhere={activeModal.data.stock_elsewhere}
                />
            )}
            {activeModal.type === 'novelty' && activeModal.data && (
                <NoveltyDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    onSubmit={(type, desc) => {
                        registerNovelty(activeModal.data.id, type, desc);
                        setActiveModal(null);
                    }}
                />
            )}
            {activeModal.type === 'resolve_novelty' && activeModal.data && (
                <ResolveNovedadDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    onConfirm={(resolution) => {
                        changeStatus(activeModal.data.id, activeModal.data.pendingStatus?.description, { novedad_resolution: resolution });
                        setActiveModal(null);
                    }}
                />
            )}
            {activeModal.type === 'mark_delivered' && activeModal.data && (
                <MarkDeliveredDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    order={activeModal.data}
                    binanceRate={activeModal.data.binance_rate ?? 0}
                    onConfirm={(extraData) => {
                        changeStatus(activeModal.data.id, activeModal.data.pendingStatus?.description, extraData);
                        setActiveModal(null);
                    }}
                />
            )}
        </Layout>
    );
};
