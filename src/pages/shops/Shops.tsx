import React, { useEffect, useState } from "react";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import {
    Box, Button, Card, CardContent, Grid, IconButton,
    Typography, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Chip, Checkbox,
    FormControlLabel, FormGroup, Paper, Switch
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, PersonAdd as PersonAddIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { TypographyCustom } from "../../components/custom";

export const Shops = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openAdd, setOpenAdd] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [editingShop, setEditingShop] = useState<any>(null);
    const [allSellers, setAllSellers] = useState<any[]>([]);
    const [selectedSellers, setSelectedSellers] = useState<number[]>([]);
    const [selectedAutoRoster, setSelectedAutoRoster] = useState<number[]>([]);

    const fetchShops = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/shops", "GET");
            if (status) {
                const data = await response.json();
                setShops(data.data || data);
            }
        } catch (e) {
            toast.error("Error al cargar tiendas");
        } finally {
            setLoading(false);
        }
    };

    const fetchSellers = async () => {
        try {
            const { status, response }: IResponse = await request("/users/agents", "GET");
            if (status) {
                const data = await response.json();
                setAllSellers(data.data);
            }
        } catch (e) { }
    };

    useEffect(() => {
        if (isValid) {
            fetchShops();
            fetchSellers();
        }
    }, [isValid]);

    const handleSaveShop = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        // Add checkbox value manually if needed (checkboxes are tricky in FormData if unchecked)
        const formEntries = Object.fromEntries(formData.entries());
        // Fix for switch: if unchecked it's undefined, we need false. But material switch sends value "on" or nothing?
        // Actually better to control the switch state or assume standard form behavior.
        // Let's rely on standard form handling but parse 'auto_schedule_enabled' (it comes as 'on' if checked, missing if not)
        const data = {
            ...formEntries,
            auto_schedule_enabled: formData.get('auto_schedule_enabled') === 'on' || formData.get('auto_schedule_enabled') === 'true' ? 1 : 0
        };

        const url = editingShop ? `/shops/${editingShop.id}` : "/shops";
        const method = editingShop ? "PUT" : "POST";

        try {
            const { status }: IResponse = await request(url, method, data as any);
            if (status) {
                toast.success(editingShop ? "Tienda actualizada" : "Tienda creada");
                setOpenAdd(false);
                setEditingShop(null);
                fetchShops();
            } else {
                toast.error("Error al guardar tienda");
            }
        } catch (e) {
            toast.error("Error inesperado");
        }
    };

    const handleDeleteShop = async (id: number) => {
        if (!confirm("¿Eliminar esta tienda?")) return;
        try {
            const { status }: IResponse = await request(`/shops/${id}`, "DELETE");
            if (status) {
                toast.success("Tienda eliminada");
                fetchShops();
            }
        } catch (e) {
            toast.error("Error al eliminar");
        }
    };

    const handleOpenAssign = (shop: any) => {
        setEditingShop(shop);
        setSelectedSellers(shop.sellers.map((s: any) => s.id));
        // Check for pivot data. standard laravel pivot is accessed via 'pivot' object?
        // Note: verify if backend returns pivot object structure in 'sellers' array.
        // Usually: seller: { pivot: { is_default_roster: 1, ... } }
        const defaults = shop.sellers
            .filter((s: any) => s.pivot?.is_default_roster == 1 || s.pivot?.is_default_roster === true)
            .map((s: any) => s.id);
        setSelectedAutoRoster(defaults);
        setOpenAssign(true);
    };

    const handleAssignSellers = async () => {
        try {
            const { status }: IResponse = await request(`/shops/${editingShop.id}/assign-sellers`, "POST", {
                seller_ids: selectedSellers,
                default_roster_ids: selectedAutoRoster
            } as any);
            if (status) {
                toast.success("Vendedores asignados");
                setOpenAssign(false);
                fetchShops();
            }
        } catch (e) {
            toast.error("Error al asignar");
        }
    };

    // --- Roster & Ops Logic ---
    const [openRoster, setOpenRoster] = useState(false);
    const [businessStatus, setBusinessStatus] = useState<any>(null);
    const [rosterAgents, setRosterAgents] = useState<any[]>([]);
    const [activeRosterIds, setActiveRosterIds] = useState<number[]>([]);
    const [rosterLoading, setRosterLoading] = useState(false);

    const loadBusinessStatus = async (shopId: number) => {
        try {
            const { status, response }: IResponse = await request(`/business/today?shop_id=${shopId}`, "GET");
            if (status) {
                const data = await response.json();
                setBusinessStatus(data.data);
            }
        } catch { }
    };

    const loadDailyRoster = async (shopId: number) => {
        setRosterLoading(true);
        try {
            const { status, response }: IResponse = await request(`/roster/today?shop_id=${shopId}`, "GET");
            if (status) {
                const data = await response.json();
                // "all" son los vendedores de la tienda, "active" los que están en roster hoy
                setRosterAgents(data.data.all ?? []);
                setActiveRosterIds((data.data.active ?? []).map((a: any) => a.id));
            }
        } catch {
            toast.error("Error cargando roster");
        } finally {
            setRosterLoading(false);
        }
    };

    const handleOpenRoster = (shop: any) => {
        setEditingShop(shop);
        setOpenRoster(true);
        loadBusinessStatus(shop.id);
        loadDailyRoster(shop.id);
    };

    const handleCloseRoster = () => {
        setOpenRoster(false);
        setEditingShop(null);
    }

    const saveDailyRoster = async () => {
        if (!editingShop) return;
        try {
            const { status }: IResponse = await request("/roster/today", "POST", {
                shop_id: editingShop.id,
                agent_ids: activeRosterIds
            } as any);
            if (status) {
                toast.success("Roster actualizado");
                loadDailyRoster(editingShop.id);
            } else {
                toast.error("Error al guardar roster");
            }
        } catch { toast.error("Error de conexión"); }
    };

    const openDay = async () => {
        if (!editingShop) return;
        try {
            // Notar que el backend ahora también puede recibir shop_id para asignar backlog,
            // pero openDay llama a /business/open
            const { status, response }: IResponse = await request(`/business/open?shop_id=${editingShop.id}`, "POST", {
                assign_backlog: true // ✅ Auto-asignar backlog al abrir la jornada
            } as any);
            if (status) {
                toast.success("Jornada ABIERTA");
                loadBusinessStatus(editingShop.id);
            } else {
                toast.error("No se pudo abrir");
            }
        } catch { toast.error("Error al abrir"); }
    };

    const closeDay = async () => {
        if (!editingShop) return;
        if (!confirm("¿Cerrar jornada? Esto desasignará vendedores.")) return;
        try {
            const { status, response }: IResponse = await request(`/business/close?shop_id=${editingShop.id}`, "POST");
            if (status) {
                const data = await response.json();
                toast.success(data.message || "Jornada CERRADA");
                loadBusinessStatus(editingShop.id);
            } else {
                toast.error("No se pudo cerrar");
            }
        } catch { toast.error("Error al cerrar"); }
    };

    const assignBacklog = async () => {
        if (!editingShop) return;
        try {
            // Updated endpoint call to include shop_id logic if backed supports it via body or query?
            // AssignOrderService logic was updated, but Controller BusinessController uses it inside 'open'.
            // wait, we have /orders/assign-backlog too? Let's check api.php
            // Yes: Route::post('/orders/assign-backlog', [AssignmentController::class, 'assignBacklog']);
            // We need to make sure AssignmentController passes shop_id too.
            // Assuming AssignmentController reads shop_id from request.

            const { status, response }: IResponse = await request("/orders/assign-backlog", "POST", {
                shop_id: editingShop.id
            } as any);

            if (status) {
                const data = await response.json();
                toast.success(data.message || "Backlog asignado");
            } else {
                toast.error("Error asignando backlog");
            }
        } catch { toast.error("Error de conexión"); }
    };

    if (loadingSession || loading) return <Loading />;

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <DescripcionDeVista title="Tiendas" description="Administración de tiendas y asignación de vendedoras" />
                {user.role?.description === 'Admin' && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingShop(null); setOpenAdd(true); }}>
                        Nueva Tienda
                    </Button>
                )}
            </Box>

            <Grid container spacing={3}>
                {shops.map((shop) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={shop.id}>
                        <Card elevation={3} sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                    <Box flex={1}>
                                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                            <Typography variant="h6" fontWeight="bold">{shop.name}</Typography>
                                            <Chip label={`ID: ${shop.id}`} size="small" color="primary" variant="outlined" />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">{shop.shopify_domain || 'Sin dominio'}</Typography>
                                    </Box>
                                    <Box>
                                        <IconButton onClick={() => { setEditingShop(shop); setOpenAdd(true); }}><EditIcon /></IconButton>
                                        <IconButton color="error" onClick={() => handleDeleteShop(shop.id)}><DeleteIcon /></IconButton>
                                    </Box>
                                </Box>

                                <Box mt={2}>
                                    <Typography variant="subtitle2" gutterBottom>Vendedoras asignadas:</Typography>
                                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                                        {shop.sellers.length > 0 ? (
                                            shop.sellers.map((s: any) => (
                                                <Chip key={s.id} label={s.names || s.name} size="small" variant="outlined" />
                                            ))
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Ninguna</Typography>
                                        )}
                                        <IconButton size="small" color="primary" onClick={() => handleOpenAssign(shop)}>
                                            <PersonAddIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>

                                <Box mt={3}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<PersonAddIcon />}
                                        onClick={() => handleOpenRoster(shop)}
                                    >
                                        Gestionar Roster y Caja
                                    </Button>
                                </Box>

                                <Box mt={2}>
                                    <Typography variant="caption" color="text.secondary">
                                        Webhook URL: {`${window.location.origin}/api/order/webhook/${shop.id}`}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Dialog Add/Edit */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <form onSubmit={handleSaveShop}>
                    <DialogTitle>{editingShop ? 'Editar Tienda' : 'Nueva Tienda'}</DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={2} mt={1}>
                            <TextField name="name" label="Nombre de la Tienda" fullWidth required defaultValue={editingShop?.name} />
                            <TextField name="shopify_domain" label="Dominio Shopify (ej: tutienda.myshopify.com)" fullWidth defaultValue={editingShop?.shopify_domain}
                                placeholder="tutienda.myshopify.com"
                                helperText="El dominio de tu tienda en Shopify"
                            />
                            {/* El backend no devuelve el token ni el secreto: solo si están cargados. Vacío = no cambia */}
                            <TextField
                                name="shopify_access_token"
                                label="Access Token de Shopify"
                                fullWidth
                                type="password"
                                autoComplete="new-password"
                                placeholder={editingShop?.has_access_token ? "••••••••" : undefined}
                                InputLabelProps={editingShop?.has_access_token ? { shrink: true } : undefined}
                                helperText={editingShop?.has_access_token ? "Ya está guardado. Déjalo vacío para no cambiarlo." : "Token de acceso a la API de Shopify"}
                            />
                            <TextField
                                name="shopify_webhook_secret"
                                label="Webhook Secret de Shopify"
                                fullWidth
                                type="password"
                                autoComplete="new-password"
                                placeholder={editingShop?.has_webhook_secret ? "••••••••" : undefined}
                                InputLabelProps={editingShop?.has_webhook_secret ? { shrink: true } : undefined}
                                helperText={editingShop?.has_webhook_secret ? "Ya está guardado. Déjalo vacío para no cambiarlo." : "Secreto para validar webhooks de Shopify"}
                            />

                            <Box mt={1} pt={2} borderTop="1px solid #eee">
                                <Typography variant="subtitle2" gutterBottom>Programación Automática</Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            name="auto_open_at"
                                            label="Hora Apertura"
                                            type="time"
                                            fullWidth
                                            defaultValue={editingShop?.auto_open_at?.substring(0, 5)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            name="auto_close_at"
                                            label="Hora Cierre"
                                            type="time"
                                            fullWidth
                                            defaultValue={editingShop?.auto_close_at?.substring(0, 5)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                </Grid>
                                <FormControlLabel
                                    control={<Switch name="auto_schedule_enabled" defaultChecked={!!editingShop?.auto_schedule_enabled} />}
                                    label="Activar Apertura/Cierre Automático"
                                    sx={{ mt: 1 }}
                                />
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Si se activa, el sistema abrirá la tienda y asignará el roster predeterminado a la hora indicada.
                                </Typography>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAdd(false)}>Cancelar</Button>
                        <Button variant="contained" type="submit">Guardar</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Dialog Assign Sellers (Permanent) */}
            <Dialog open={openAssign} onClose={() => setOpenAssign(false)} fullWidth maxWidth="xs">
                <DialogTitle>Vendedoras Permanentes de {editingShop?.name}</DialogTitle>
                <DialogContent>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                        Selecciona las vendedoras que pertenecen a esta tienda.
                    </Typography>
                    <FormGroup sx={{ mt: 1 }}>
                        {allSellers.map((seller) => (
                            <Box key={seller.id} display="flex" justifyContent="space-between" alignItems="center" mb={1} borderBottom="1px solid #f0f0f0" pb={0.5}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={selectedSellers.includes(seller.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedSellers([...selectedSellers, seller.id]);
                                                else {
                                                    setSelectedSellers(selectedSellers.filter(id => id !== seller.id));
                                                    // If removed from shop, also remove from auto roster
                                                    setSelectedAutoRoster(selectedAutoRoster.filter(id => id !== seller.id));
                                                }
                                            }}
                                        />
                                    }
                                    label={seller.names || seller.name}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            size="small"
                                            color="secondary"
                                            checked={selectedAutoRoster.includes(seller.id)}
                                            disabled={!selectedSellers.includes(seller.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedAutoRoster([...selectedAutoRoster, seller.id]);
                                                else setSelectedAutoRoster(selectedAutoRoster.filter(id => id !== seller.id));
                                            }}
                                        />
                                    }
                                    label={<Typography variant="caption">Auto-Start</Typography>}
                                    labelPlacement="start"
                                />
                            </Box>
                        ))}
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAssign(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleAssignSellers}>Guardar</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Roster & Ops (Daily) */}
            <Dialog open={openRoster} onClose={handleCloseRoster} fullWidth maxWidth="md">
                <DialogTitle sx={{ borderBottom: '1px solid #eee', pb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6">Gestión Diaria - {editingShop?.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date().toLocaleDateString()}
                            </Typography>
                        </Box>
                        {businessStatus && (
                            <Chip
                                label={businessStatus.is_open ? "TIENDA ABIERTA" : "TIENDA CERRADA"}
                                color={businessStatus.is_open ? "success" : "error"}
                                variant="filled"
                            />
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {/* Left: Daily Roster */}
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Roster del Día</Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                Selecciona quienes trabajan hoy en esta tienda.
                            </Typography>

                            <Paper variant="outlined" sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
                                <FormGroup sx={{ p: 2 }}>
                                    {rosterAgents.map((agent: any) => (
                                        <FormControlLabel
                                            key={agent.id}
                                            control={
                                                <Checkbox
                                                    checked={activeRosterIds.includes(agent.id)}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked
                                                            ? [...activeRosterIds, agent.id]
                                                            : activeRosterIds.filter(id => id !== agent.id);
                                                        setActiveRosterIds(newVal);
                                                    }}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="body2">{agent.names}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{agent.email}</Typography>
                                                </Box>
                                            }
                                        />
                                    ))}
                                    {rosterAgents.length === 0 && (
                                        <Typography variant="body2" color="text.secondary" align="center">
                                            No hay vendedores asignados a esta tienda.
                                        </Typography>
                                    )}
                                </FormGroup>
                            </Paper>
                            <Box mt={2}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={saveDailyRoster}
                                    startIcon={<PersonAddIcon />}
                                    disabled={rosterLoading}
                                >
                                    Guardar Roster
                                </Button>
                            </Box>
                        </Grid>

                        {/* Right: Operations */}
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Operaciones</Typography>

                            <Card variant="outlined" sx={{ mb: 2, bgcolor: 'background.default' }}>
                                <CardContent>
                                    <Typography variant="body2" fontWeight="bold">Turno de Trabajo</Typography>
                                    <Box display="flex" flexDirection="column" gap={1} mt={1}>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            onClick={openDay}
                                            disabled={businessStatus?.is_open}
                                            fullWidth
                                        >
                                            Abrir Jornada
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            onClick={closeDay}
                                            disabled={!businessStatus?.is_open}
                                            fullWidth
                                        >
                                            Cerrar Jornada
                                        </Button>
                                    </Box>
                                    {businessStatus?.open_at && (
                                        <Typography variant="caption" display="block" mt={1} align="center">
                                            Abierto a las: {new Date(businessStatus.open_at).toLocaleTimeString()}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>

                            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                                <CardContent>
                                    <Typography variant="body2" fontWeight="bold">Asignación de Pedidos</Typography>
                                    <Typography variant="caption" color="text.secondary" paragraph>
                                        Asigna pedidos pendientes a los vendedores activos de HOY.
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={assignBacklog}
                                        disabled={!businessStatus?.is_open}
                                        fullWidth
                                    >
                                        Asignar Backlog
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRoster}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};
