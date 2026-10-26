import { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
} from "@mui/material";
import { request } from "../../../common/request";
import { IResponse } from "../../../interfaces/response-type";
import { OrderDialog } from "../../../components/orders/OrderDialog";
import { Layout } from "../../../components/ui/Layout";
import { DescripcionDeVista } from "../../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../../components/ui/content/Loading";
import { useValidateSession } from "../../../hooks/useValidateSession";


export const CancellationsReview = () => {
    const [cancellations, setCancellations] = useState<any[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const { loadingSession, isValid, user } = useValidateSession();

    const fetchCancellations = async () => {
        const { status, response }: IResponse = await request(
            "/cancellations?status=pending",
            "GET"
        );
        if (status) {
            const data = await response.json();
            setCancellations(data.data ?? []);
        }
    };

    useEffect(() => {
        fetchCancellations();
    }, []);

    const handleReview = async (id: number, decision: "approved" | "rejected") => {
        const body = new URLSearchParams();
        body.append("status", decision);
        const { status, response }: IResponse = await request(
            `/cancellations/${id}/review`,
            "PUT",
            body
        );
        if (status) {
            await fetchCancellations();
        }
    };
    if (loadingSession || !isValid || !user.token) return <Loading />;
    return (
        <Layout>
            <DescripcionDeVista title={"Cancelaciones pendientes"} description={"En esta vista podras revisar las cancelaciones pendientes"} />
            <Box sx={{ p: 3 }}>
                {cancellations.length === 0 ? (
                    <Typography variant="body1" color="text.secondary">
                        No hay cancelaciones pendientes
                    </Typography>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID Orden</TableCell>
                                    <TableCell>Solicitado por</TableCell>
                                    <TableCell>Motivo</TableCell>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {cancellations.map((c) => (
                                    <TableRow key={c.id}>
                                        {/* 👇 Clic abre dialog */}
                                        <TableCell
                                            sx={{ cursor: "pointer", color: "blue" }}
                                            onClick={() => {
                                                setSelectedOrderId(c.order_id);
                                                setOpenDialog(true);
                                            }}
                                        >
                                            #{c.order_id}
                                        </TableCell>
                                        <TableCell>{c.user?.name ?? "Usuario"}</TableCell>
                                        <TableCell>
                                            <Chip label={c.reason} variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            {new Date(c.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="contained"
                                                color="success"
                                                size="small"
                                                sx={{ mr: 1 }}
                                                onClick={() => handleReview(c.id, "approved")}
                                            >
                                                Aprobar
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                onClick={() => handleReview(c.id, "rejected")}
                                            >
                                                Rechazar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Dialog con detalle de la orden */}
                {selectedOrderId && (
                    <OrderDialog
                        id={selectedOrderId}
                        open={openDialog}
                        setOpen={setOpenDialog}
                    />
                )}
            </Box>
        </Layout>
    );
};
