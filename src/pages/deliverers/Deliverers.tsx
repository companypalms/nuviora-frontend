// src/pages/DeliverersPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Paper, IconButton, Tooltip, Chip, FormControlLabel, Switch,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Pagination
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { HowToRegRounded, PersonOffRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { ButtonCustom, TextFieldCustom } from "../../components/custom";
import { IResponse } from "../../interfaces/response-type";
import { DelivererFormDialog } from "../../components/deliverers/DelivererFormDialog";
import { DeactivateUserDialog } from "../../components/users/DeactivateUserDialog";
import { ReactivateUserDialog } from "../../components/users/ReactivateUserDialog";
import { PageLayout } from "../../components/ui/SectionTabsPage";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { Loading } from "../../components/ui/content/Loading";

export const DeliverersPage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [rows, setRows] = useState<any[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);

    const [openForm, setOpenForm] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);

    // "Eliminar" ahora desactiva (paso 6): antes borraba la cuenta, y con ella sus ganancias y su stock
    const [showInactive, setShowInactive] = useState(false);
    const [toDeactivate, setToDeactivate] = useState<{ id: number; name: string } | null>(null);
    const [toReactivate, setToReactivate] = useState<{ id: number; name: string; deactivated_at?: string | null } | null>(null);

    const fetchData = async (p = 1, search = "") => {
        setLoading(true);
        try {
            const url = `/users/deliverers?search=${encodeURIComponent(search)}&page=${p}${showInactive ? "&include_inactive=1" : ""}`;
            const { status, response }: IResponse = await request(url, "GET");
            if (status) {
                const data = await response.json();
                setRows(data.data ?? []);
                setMeta(data.meta ?? null);
            } else {
                toast.error("No se pudo cargar la lista de repartidores");
            }
        } catch {
            toast.error("Error al cargar repartidores");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(page, q);
    }, [page, showInactive]);

    const handleSearch = () => {
        setPage(1);
        fetchData(1, q);
    };

    const handleOpenCreate = () => {
        setEditing(null);
        setOpenForm(true);
    };
    const handleOpenEdit = (row: any) => {
        setEditing(row);
        setOpenForm(true);
    };

    const onSaved = () => {
        setOpenForm(false);
        fetchData(page, q);
    };

    const nameOf = (r: any) => `${r.names} ${r.surnames ?? ""}`.trim();
    const onChanged = () => {
        setToDeactivate(null);
        setToReactivate(null);
        fetchData(page, q);
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;
    return (
        <PageLayout isEmbedded={isEmbedded}>
            <DescripcionDeVista title={"Repartidores"} description={"Vista para consultar repartidores, agregar repartidores"} />
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 1, flexWrap: "wrap" }}>
                    <ButtonCustom variant={'contained'} startIcon={<AddRoundedIcon />} onClick={handleOpenCreate}>
                        Nuevo repartidor
                    </ButtonCustom>
                    <FormControlLabel
                        control={<Switch checked={showInactive} onChange={(e) => { setShowInactive(e.target.checked); setPage(1); }} />}
                        label="Ver desactivados"
                    />
                </Box>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <TextFieldCustom
                            placeholder="Buscar por nombre o email…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1 }} /> }}
                        />
                        <ButtonCustom variant="outlined" onClick={handleSearch}>Buscar</ButtonCustom>
                    </Box>
                </Paper>

                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Creado</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.id} hover sx={r.deactivated_at ? { opacity: 0.7 } : undefined}>
                                    <TableCell>
                                        {nameOf(r)}
                                        {r.deactivated_at && <Chip size="small" label="Desactivado" sx={{ ml: 1 }} />}
                                    </TableCell>
                                    <TableCell>{r.email}</TableCell>
                                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => handleOpenEdit(r)}>
                                                <EditRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {r.deactivated_at ? (
                                            <Tooltip title="Reactivar">
                                                <IconButton size="small" color="success" onClick={() => setToReactivate({ id: r.id, name: nameOf(r), deactivated_at: r.deactivated_at })}>
                                                    <HowToRegRounded fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip title="Desactivar">
                                                <IconButton size="small" color="error" onClick={() => setToDeactivate({ id: r.id, name: nameOf(r) })}>
                                                    <PersonOffRounded fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        {loading ? "Cargando…" : "Sin resultados"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Pagination
                        color="primary"
                        page={meta?.current_page ?? 1}
                        count={meta?.last_page ?? 1}
                        onChange={(_, p) => setPage(p)}
                    />
                </Box>

                <DelivererFormDialog
                    open={openForm}
                    onClose={() => setOpenForm(false)}
                    onSaved={onSaved}
                    editing={editing}
                />

                <DeactivateUserDialog
                    open={toDeactivate !== null}
                    user={toDeactivate}
                    onClose={() => setToDeactivate(null)}
                    onDone={onChanged}
                />
                <ReactivateUserDialog
                    open={toReactivate !== null}
                    user={toReactivate}
                    onClose={() => setToReactivate(null)}
                    onDone={onChanged}
                />
            </Box>
        </PageLayout>
    );
};
