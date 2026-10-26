// src/pages/admin/ReceiptReview.tsx
// Comprobantes por revisar (Fran, 2026-10-03): los que la IA marcó porque no cuadran con el pago, no se leen,
// tienen dudas o no se pudieron revisar. Fran abre la orden, mira la foto y lo aprueba si está bien.
import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, Card, CardContent, CardMedia, Chip, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { CheckCircleRounded, RefreshRounded } from "@mui/icons-material";
import moment from "moment";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { OrderDialog } from "../../components/orders/OrderDialog";
import { request } from "../../common/request";
import { useValidateSession } from "../../hooks/useValidateSession";
import { orderNo } from "../../lib/functions";
import { ReceiptCheckStatus, ReceiptCheckView, statusMeta } from "../../components/orders/receipt-checks/receiptChecks";

type Row = ReceiptCheckView & {
    created_at: string | null;
    receipt_url: string | null;
    order: { id: number; name: string; status: string | null; agent: string | null; agency: string | null; total: number };
};

type Filter = "all" | ReceiptCheckStatus;

const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "fail", label: "No cuadran" },
    { value: "unreadable", label: "No se leen" },
    { value: "warning", label: "Con dudas" },
    { value: "error", label: "Sin revisar" },
];

export const ReceiptReview: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [rows, setRows] = useState<Row[]>([]);
    const [mode, setMode] = useState("off");
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<Filter>("all");
    const [openOrderId, setOpenOrderId] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const { status, response } = await request("/receipt-checks", "GET");
            if (status === 200) {
                const data = await response.json();
                setRows(data.checks ?? []);
                setMode(data.mode ?? "off");
            } else {
                toast.error("No se pudieron cargar los comprobantes");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid) load();
    }, [isValid]);

    if (loadingSession || !isValid) return <Loading />;

    const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
    const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

    return (
        <Layout>
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <DescripcionDeVista
                            title="Comprobantes por revisar"
                            description="La IA lee cada comprobante y lo compara con el pago y con las cuentas de la empresa. Aquí están los que no cuadran, no se leen o tienen dudas, de las últimas 2 semanas. Abre la orden para ver la foto; si el pago está bien, apruébalo ahí."
                        />
                    </Box>
                    <Button startIcon={<RefreshRounded />} onClick={load} disabled={loading} sx={{ textTransform: "none", flexShrink: 0 }}>
                        Actualizar
                    </Button>
                </Box>

                {mode === "off" && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        La revisión automática de comprobantes está apagada.
                    </Alert>
                )}
                {mode === "observe" && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        Modo observación: la IA marca los comprobantes, pero todavía no bloquea entregas.
                    </Alert>
                )}

                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={filter}
                    onChange={(_, v) => v && setFilter(v)}
                    sx={{ mt: 2, flexWrap: "wrap", "& .MuiToggleButton-root": { textTransform: "none" } }}
                    aria-label="Filtrar comprobantes"
                >
                    {FILTERS.map((f) => (
                        <ToggleButton key={f.value} value={f.value}>
                            {f.label} ({f.value === "all" ? rows.length : counts[f.value] ?? 0})
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                {loading && rows.length === 0 ? (
                    <Loading />
                ) : shown.length === 0 ? (
                    <Box role="status" sx={{ textAlign: "center", py: 10, opacity: 0.6 }}>
                        <CheckCircleRounded color="success" sx={{ fontSize: 56, mb: 1 }} />
                        <Typography variant="h6">No hay comprobantes por revisar</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {shown.map((r) => {
                            const meta = statusMeta(r);
                            return (
                                <Grid key={r.id} size={{ xs: 12, md: 6, xl: 4 }}>
                                    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%", display: "flex" }}>
                                        {r.receipt_url && (
                                            <CardMedia
                                                component="img"
                                                image={r.receipt_url}
                                                alt={`Comprobante de ${orderNo(r.order.name)}`}
                                                onClick={() => window.open(r.receipt_url!, "_blank")}
                                                sx={{ width: 96, minWidth: 96, objectFit: "cover", cursor: "zoom-in", bgcolor: "action.hover" }}
                                            />
                                        )}
                                        <CardContent sx={{ flex: 1, minWidth: 0 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                                <Button onClick={() => setOpenOrderId(r.order.id)} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: "bold", fontSize: "1.05rem" }}>
                                                    {orderNo(r.order.name)}
                                                </Button>
                                                <Chip size="small" color={meta.color} label={meta.short} />
                                                {r.kind_label && <Chip size="small" variant="outlined" label={r.kind_label} />}
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {[r.order.status, r.order.agent && `Vendedora: ${r.order.agent}`, r.order.agency && `Agencia: ${r.order.agency}`].filter(Boolean).join(" · ")}
                                            </Typography>
                                            <Stack component="ul" spacing={0.25} sx={{ m: 0, mt: 1, pl: 2.5 }}>
                                                {(r.error ? [{ level: "warning", text: r.error }] : r.issues).map((issue, i) => (
                                                    <Typography component="li" variant="body2" key={i} fontWeight={issue.level === "fail" ? 600 : 400}>
                                                        {issue.text}
                                                    </Typography>
                                                ))}
                                            </Stack>
                                            {r.created_at && (
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                                    Subido el {moment(r.created_at).format("DD/MM hh:mm A")}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Box>

            {openOrderId && (
                <OrderDialog
                    id={openOrderId}
                    open={!!openOrderId}
                    setOpen={(val) => {
                        if (!val) {
                            setOpenOrderId(null);
                            load();
                        }
                    }}
                />
            )}
        </Layout>
    );
};
