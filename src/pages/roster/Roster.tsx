// src/pages/RosterPage.tsx
import React, { useEffect, useState } from "react";
import {
    Box, Paper, Typography, List, ListItem, ListItemIcon, Checkbox, ListItemText,
    IconButton, Divider, MenuItem, TextField
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { RequireRole } from "../../components/auth/RequireRole";
import { ButtonCustom } from "../../components/custom";
import { IResponse } from "../../interfaces/response-type";
import { useValidateSession } from "../../hooks/useValidateSession";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";

export const Roster: React.FC = () => {
    const [allAgents, setAllAgents] = useState<any[]>([]);
    const [activeIds, setActiveIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const { loadingSession, isValid, user } = useValidateSession();
    const [business, setBusiness] = useState<{ date: string, open_at: string | null, close_at: string | null, is_open: boolean, last_close_at: string | null } | null>(null);

    // Multi-shop state
    const [shops, setShops] = useState<any[]>([]);
    const [selectedShopId, setSelectedShopId] = useState<number | ''>('');

    const fetchShops = async () => {
        try {
            const { status, response }: IResponse = await request("/shops", "GET");
            if (status) {
                const data = await response.json();
                const shopsData = data.data || data || [];
                setShops(Array.isArray(shopsData) ? shopsData : []);
                if (Array.isArray(shopsData) && shopsData.length > 0) {
                    setSelectedShopId(shopsData[0].id);
                }
            }
        } catch (e) {
            toast.error("Error al cargar tiendas");
        }
    };

    const loadBusiness = async (signal?: AbortSignal) => {
        if (!selectedShopId) return;
        try {
            const { status, response }: IResponse = await request(`/business/today?shop_id=${selectedShopId}`, "GET", undefined, signal);
            if (status) {
                const data = await response.json();
                setBusiness(data.data);
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                toast.error("No se pudo cargar la jornada");
            }
        }
    };

    const loadRoster = async (signal?: AbortSignal) => {
        if (!selectedShopId) return;
        setLoading(true);
        try {
            const { status, response }: IResponse = await request(`/roster/today?shop_id=${selectedShopId}`, "GET", undefined, signal);
            if (status) {
                const data = await response.json();
                setAllAgents(data.data.all ?? []);
                setActiveIds((data.data.active ?? []).map((a: any) => a.id));
            } else {
                toast.error("No se pudo cargar el roster");
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                toast.error("Error cargando roster");
            }
        } finally {
            // Only turn off loading if we weren't aborted (or strict mode check)
            // Ideally we'd track if *this* variable is still relevant, but simple catch is okay
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid) fetchShops();
    }, [isValid]);

    useEffect(() => {
        if (selectedShopId) {
            setBusiness(null);
            setAllAgents([]);
            setActiveIds([]);

            const controller = new AbortController();
            loadRoster(controller.signal);
            loadBusiness(controller.signal);

            return () => controller.abort();
        }
    }, [selectedShopId]);

    const openDay = async () => {
        if (!selectedShopId) return;
        try {
            const { status, response }: IResponse = await request(`/business/open?shop_id=${selectedShopId}`, "POST", {
                assign_backlog: true // ✅ Auto-asignar backlog al abrir la jornada
            } as any);
            if (status) {
                const data = await response.json();
                toast.success(data.message || "Jornada abierta ✅");
                await loadBusiness();
            } else {
                toast.error("No se pudo abrir la jornada ❌");
            }
        } catch {
            toast.error("Error abriendo la jornada 🚨");
        }
    };

    const closeDay = async () => {
        if (!selectedShopId) return;
        try {
            const { status, response }: IResponse = await request(`/business/close?shop_id=${selectedShopId}`, "POST");
            if (status) {
                const data = await response.json();
                toast.success(data.message || "Jornada cerrada ✅");
                await loadBusiness();
            } else {
                toast.error("No se pudo cerrar la jornada ❌");
            }
        } catch {
            toast.error("Error cerrando la jornada 🚨");
        }
    };

    const toggle = (id: number) => {
        setActiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const saveRoster = async () => {
        if (!selectedShopId) return;
        if (activeIds.length === 0) {
            toast.error("Selecciona al menos una vendedora");
            return;
        }
        try {
            const { status }: IResponse = await request("/roster/today", "POST", {
                shop_id: selectedShopId,
                agent_ids: activeIds
            } as any);
            if (status) {
                toast.success("Roster guardado ✅");
                loadRoster();
            } else {
                toast.error("No se pudo guardar el roster ❌");
            }
        } catch {
            toast.error("Error guardando roster 🚨");
        }
    };

    const assignBacklog = async () => {
        setAssigning(true);
        try {
            const { status, response }: IResponse = await request("/orders/assign-backlog", "POST", {
                shop_id: selectedShopId || undefined // ✅ Filtrar por tienda seleccionada
            } as any);
            if (status) {
                const data = await response.json();
                toast.success(data.message ?? "Backlog asignado ✅");
            } else {
                toast.error("No se pudo asignar el backlog ❌");
            }
        } catch {
            toast.error("Error asignando backlog 🚨");
        } finally {
            setAssigning(false);
        }
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <DescripcionDeVista title={"Roster y Jornadas"} description={"Gestión de vendedoras activas y horarios por tienda"} />
                <TextField
                    select
                    label="Seleccionar Tienda"
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(Number(e.target.value))}
                    sx={{ minWidth: 200 }}
                    size="small"
                >
                    {shops.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                </TextField>
            </Box>

            <RequireRole allowedRoles={["Gerente", "Admin"]}>
                <Box sx={{ p: 1, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 400px" } }}>
                    <Paper sx={{ p: 2, borderRadius: 4 }} elevation={3}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                            <Typography variant="h6" fontWeight={700}>Vendedoras Disponibles</Typography>
                            <IconButton onClick={() => loadRoster()} disabled={loading}><RefreshRoundedIcon /></IconButton>
                        </Box>
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                            Solo se muestran las vendedoras vinculadas a la tienda seleccionada.
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List dense sx={{ maxHeight: 400, overflowY: 'auto' }}>
                            {allAgents.map(a => (
                                <ListItem key={a.id} disablePadding secondaryAction={
                                    <Checkbox edge="end" checked={activeIds.includes(a.id)} onChange={() => toggle(a.id)} />
                                }>
                                    <ListItemIcon><Checkbox checked={activeIds.includes(a.id)} onChange={() => toggle(a.id)} /></ListItemIcon>
                                    <ListItemText primary={`${a.names} ${a.surnames ?? ""}`} secondary={a.email} />
                                </ListItem>
                            ))}
                            {allAgents.length === 0 && <Box sx={{ p: 2, textAlign: "center" }}>{loading ? "Cargando…" : "No hay vendedoras vinculadas a esta tienda"}</Box>}
                        </List>
                        <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                            <ButtonCustom variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveRoster} disabled={!selectedShopId}>
                                Guardar roster
                            </ButtonCustom>
                            <ButtonCustom startIcon={<PlayArrowRoundedIcon />} variant="outlined" onClick={assignBacklog} disabled={assigning}>
                                Asignar backlog (Global)
                            </ButtonCustom>
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 2, borderRadius: 4 }} elevation={3}>
                        <Typography variant="h6" fontWeight={700}>Estado de la Jornada</Typography>
                        <Divider sx={{ my: 1, mb: 2 }} />

                        <Box sx={{ mb: 3, p: 2, bgcolor: business?.is_open ? 'success.light' : 'error.light', borderRadius: 2, color: 'white' }}>
                            <Typography variant="h5" align="center" fontWeight="bold">
                                {business?.is_open ? "TIENDA ABIERTA" : "TIENDA CERRADA"}
                            </Typography>
                        </Box>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <ButtonCustom
                                variant="contained"
                                fullWidth
                                onClick={openDay}
                                disabled={business?.is_open || !selectedShopId}
                                size="large"
                            >
                                Abrir jornada
                            </ButtonCustom>
                            <ButtonCustom
                                variant="contained"
                                color="error"
                                fullWidth
                                onClick={closeDay}
                                disabled={!business?.is_open || !selectedShopId}
                                size="large"
                            >
                                Cerrar jornada
                            </ButtonCustom>
                        </Box>

                        <Box sx={{ mt: 3 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <b>Historial de hoy:</b>
                            </Typography>
                            {business?.open_at && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption">Apertura:</Typography>
                                    <Typography variant="caption" fontWeight="bold">{new Date(business.open_at).toLocaleTimeString()}</Typography>
                                </Box>
                            )}
                            {business?.close_at && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption">Cierre:</Typography>
                                    <Typography variant="caption" fontWeight="bold">{new Date(business.close_at).toLocaleTimeString()}</Typography>
                                </Box>
                            )}
                            {!business?.open_at && (
                                <Typography variant="caption" color="text.secondary">Aún no se ha registrado actividad hoy.</Typography>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </RequireRole>
        </Layout>
    );
};
