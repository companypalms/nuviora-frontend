// src/pages/DeliverersPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Paper, Typography, IconButton, TextField, Divider, Tooltip,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Pagination
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { ButtonCustom, TextFieldCustom } from "../../components/custom";
import { IResponse } from "../../interfaces/response-type";
import { DelivererFormDialog } from "../../components/deliverers/DelivererFormDialog";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { Loading } from "../../components/ui/content/Loading";

export const DeliverersPage: React.FC = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [rows, setRows] = useState<any[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);

    const [openForm, setOpenForm] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);

    const [openConfirm, setOpenConfirm] = useState(false);
    const [toDelete, setToDelete] = useState<any | null>(null);

    const fetchData = async (p = 1, search = "") => {
        setLoading(true);
        try {
            const url = `/users/deliverers?search=${encodeURIComponent(search)}&page=${p}`;
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
    }, [page]);

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

    const askDelete = (row: any) => {
        setToDelete(row);
        setOpenConfirm(true);
    };

    const doDelete = async () => {
        if (!toDelete) return;
        try {
            const { status }: IResponse = await request(`/users/deliverers/${toDelete.id}`, "DELETE");
            if (status) {
                toast.success("Repartidor eliminado");
                fetchData(page, q);
            } else {
                toast.error("No se pudo eliminar");
            }
        } catch {
            toast.error("Error eliminando repartidor");
        } finally {
            setOpenConfirm(false);
            setToDelete(null);
        }
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;
    return (
        <Layout>
            <DescripcionDeVista title={"Repartidores"} description={"Vista para consultar repartidores, agregar repartidores"} />
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <ButtonCustom variant={'contained'} startIcon={<AddRoundedIcon />} onClick={handleOpenCreate}>
                        Nuevo repartidor
                    </ButtonCustom>
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
                                <TableRow key={r.id} hover>
                                    <TableCell>{`${r.names} ${r.surnames ?? ""}`}</TableCell>
                                    <TableCell>{r.email}</TableCell>
                                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => handleOpenEdit(r)}>
                                                <EditRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => askDelete(r)}>
                                                <DeleteRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
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

                <ConfirmDialog
                    open={openConfirm}
                    title="Eliminar repartidor"
                    message={`¿Seguro que deseas eliminar a ${toDelete ? toDelete.names : ""}?`}
                    onClose={() => setOpenConfirm(false)}
                    onConfirm={doDelete}
                />
            </Box>
        </Layout>
    );
};
