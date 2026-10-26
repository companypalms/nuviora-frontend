// src/components/inventory/MovementsDrawer.tsx
import React, { FC, useEffect, useState } from "react";
import { Box, Drawer, IconButton, List, ListItem, ListItemText, Chip, CircularProgress, Pagination, Divider, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";

export const MovementsDrawer: FC<{
    open: boolean;
    onClose: () => void;
    product: any | null;
}> = ({ open, onClose, product }) => {
    const [rows, setRows] = useState<any[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const loadData = async (p = 1) => {
        if (!product) return;
        setLoading(true);
        try {
            const { status, response }: IResponse = await request(`/products/${product.id}/movements?page=${p}`, "GET");
            if (status) {
                const data = await response.json();
                setRows(data.data ?? []);
                setMeta(data.meta ?? null);
            } else {
                toast.error("No se pudo cargar el historial");
            }
        } catch {
            toast.error("Error cargando historial");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setPage(1);
            loadData(1);
        }
    }, [open, product?.id]);

    useEffect(() => {
        if (open) loadData(page);
    }, [page]);

    const colorByType = (t: string) => t === 'in' ? 'success' : t === 'out' ? 'error' : 'warning';

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box sx={{ width: 420, p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="h6">Movimientos — {product?.name ?? product?.title ?? "Producto"}</Typography>
                    <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {loading ? (
                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <List dense sx={{ flex: 1, overflowY: "auto" }}>
                            {rows.map((m) => (
                                <ListItem key={m.id} alignItems="flex-start">
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <Chip size="small" label={m.type.toUpperCase()} color={colorByType(m.type)} />
                                                <Typography variant="body2">
                                                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="caption">
                                                    {new Date(m.created_at).toLocaleString()} — {m.user ? `${m.user.names} ${m.user.surnames ?? ""}` : "Sistema"}
                                                </Typography>
                                                <br />
                                                <Typography variant="caption" color="text.secondary">
                                                    Stock: {m.before} → {m.after} {m.note ? ` — ${m.note}` : ""}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                            {rows.length === 0 && (
                                <Box sx={{ p: 2, textAlign: "center" }}>Sin movimientos</Box>
                            )}
                        </List>

                        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                            <Pagination
                                size="small"
                                page={meta?.current_page ?? 1}
                                count={meta?.last_page ?? 1}
                                onChange={(_, p) => setPage(p)}
                            />
                        </Box>
                    </>
                )}
            </Box>
        </Drawer>
    );
};
