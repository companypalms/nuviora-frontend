import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, TextField, Divider, Grid, Card, CardContent } from "@mui/material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { fmtMoney } from "../../lib/money";
import { IResponse } from "../../interfaces/response-type";
import dayjs from "dayjs";

export const MyEarningsPage: React.FC = () => {
    const { user, isValid, loadingSession } = useValidateSession();
    const [date, setDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request(`/earnings/me?date=${date}`, "GET");
            if (status) {
                const json = await response.json();
                setData(json.data);
            } else {
                toast.error("No se pudieron cargar tus ganancias");
            }
        } catch {
            toast.error("Error cargando información");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid) load();
    }, [date, isValid]);

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista title="Mis Ganancias Acumuladas" description="Consulta tus comisiones generadas por fecha" />

            <Box sx={{ p: 1 }}>
                <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }} elevation={2}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <TextField
                            type="date"
                            label="Seleccionar Fecha"
                            size="small"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Mostrando datos para el día: <b>{dayjs(date).format("DD/MM/YYYY")}</b>
                        </Typography>
                    </Box>
                </Paper>

                {loading ? (
                    <Loading />
                ) : (
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card sx={{ borderRadius: 4, height: '100%', borderLeft: 6, borderColor: 'primary.main' }} elevation={3}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Órdenes Completadas</Typography>
                                    <Typography variant="h3" fontWeight="bold">{data?.orders_count ?? 0}</Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        Rol: <b>{user?.role?.description ?? "—"}</b>
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card sx={{ borderRadius: 4, height: '100%', borderLeft: 6, borderColor: 'success.main' }} elevation={3}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Comisión Total</Typography>
                                    <Box display="flex" alignItems="baseline" gap={1}>
                                        <Typography variant="h3" fontWeight="bold" color="success.main">
                                            {fmtMoney(data?.amount_usd ?? 0, "USD")}
                                        </Typography>
                                        <Typography variant="subtitle1" color="text.secondary">USD</Typography>
                                    </Box>

                                    {data?.breakdown && (
                                        <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Órdenes</Typography>
                                                <Typography variant="body2" fontWeight="bold">${data.breakdown.orders}</Typography>
                                            </Box>
                                            <Divider orientation="vertical" flexItem />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Upsell</Typography>
                                                <Typography variant="body2" fontWeight="bold">${data.breakdown.upsells}</Typography>
                                            </Box>
                                            {data.breakdown.leadership > 0 && (
                                                <>
                                                    <Divider orientation="vertical" flexItem />
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" display="block">Liderazgo</Typography>
                                                        <Typography variant="body2" fontWeight="bold">${data.breakdown.leadership}</Typography>
                                                    </Box>
                                                </>
                                            )}
                                        </Box>
                                    )}

                                    <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                                        ≈ {fmtMoney(data?.amount_local ?? 0, "VES")}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Tasa BCV: {data?.rate ?? 1}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>


                        <Grid size={{ xs: 12 }}>
                            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'info.light', color: 'info.contrastText' }}>
                                <Typography variant="body1">
                                    <b>Nota:</b> Las comisiones se calculan en base a las órdenes marcadas como <b>"Confirmado"</b> o <b>"Entregado"</b> en la fecha seleccionada.
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </Box>
        </Layout>
    );
};
