// src/pages/admin/ReconciliationDay.tsx
// Una conciliación (documento de Fran del 2026-10-06, Módulo 1): qué extractos necesita (§16), el resumen (§24), las
// incidencias para revisar (§20, §24: "Si algo está correcto, el sistema no me molesta con ello") y, al final, los
// extractos utilizados y las resoluciones manuales (§27). Solo el Administrador (§29).
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Divider, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { OrderDialog } from "../../components/orders/OrderDialog";
import { request } from "../../common/request";
import { useValidateSession } from "../../hooks/useValidateSession";
import { DayHistory } from "../../components/reconciliation/DayHistory";
import { ReconciliationItems } from "../../components/reconciliation/ReconciliationItems";
import { StatementSources } from "../../components/reconciliation/StatementSources";
import { DAY_META, DayDetail, ITEM_COUNT, ITEM_META, longDate, money, plural } from "../../components/reconciliation/reconciliation";

export const ReconciliationDay: React.FC = () => {
    const { date = "" } = useParams();
    const navigate = useNavigate();
    const { loadingSession, isValid } = useValidateSession();
    const [detail, setDetail] = useState<DayDetail | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [all, setAll] = useState(false);
    const [openOrderId, setOpenOrderId] = useState<number | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const { status, response } = await request(`/reconciliations/${date}${all ? "?all=1" : ""}`, "GET");
            if (status === 404) {
                setNotFound(true);
                return;
            }
            if (status !== 200) {
                toast.error("No se pudo cargar la conciliación");
                return;
            }
            setDetail(await response.json());
        } catch {
            toast.error("Error de conexión");
        }
    }, [date, all]);

    useEffect(() => {
        if (isValid) load();
    }, [isValid, load]);

    if (loadingSession || !isValid) return <Loading />;

    const back = (
        <Button startIcon={<ArrowBackRounded />} onClick={() => navigate("/conciliacion")} sx={{ textTransform: "none", mb: 1 }}>
            Conciliaciones
        </Button>
    );

    if (notFound) {
        return (
            <Layout>
                <Box sx={{ p: 2 }}>
                    {back}
                    <Alert severity="info">No hay conciliación del {longDate(date)}: ese día no hubo pagos digitales.</Alert>
                </Box>
            </Layout>
        );
    }
    if (!detail) return <Loading />;

    const { day, summary } = detail;
    const meta = DAY_META[day.status];
    const count = (s: keyof typeof ITEM_META) => summary.by_status[s] ?? 0;
    const incidents = count("not_found") + count("review");

    return (
        <Layout>
            <Box sx={{ p: 2, maxWidth: 1200, mx: "auto" }}>
                {back}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <Typography variant="h5" component="h1" fontWeight="bold">Conciliación — {longDate(day.date)}</Typography>
                    <Chip color={meta.color} label={`${meta.dot} ${meta.label}`} />
                </Box>

                <Typography variant="h6" component="h2" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Extractos</Typography>
                <StatementSources date={day.date} sources={detail.sources} onChanged={load} />

                <Typography variant="h6" component="h2" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Resumen</Typography>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                    {day.status === "completed" ? (
                        <Typography fontWeight="bold">🟢 Conciliación completada · {day.resolved}/{day.payments} pagos resueltos</Typography>
                    ) : (
                        <Typography fontWeight="bold">Pagos digitales registrados: {summary.total}</Typography>
                    )}
                    <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: "wrap" }}>
                        {(["matched", "linked", "confirmed", "not_found", "review", "not_received", "pending"] as const).filter((s) => count(s) > 0).map((s) => (
                            <Chip key={s} size="small" variant="outlined" color={ITEM_META[s].color} label={`${ITEM_META[s].icon} ${plural(count(s), ...ITEM_COUNT[s])}`} />
                        ))}
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    {summary.amounts.map((a) => (
                        <Box key={a.currency} sx={{ mb: 0.5 }}>
                            <Typography variant="body2"><strong>Monto digital esperado según comprobantes:</strong> {money(a.expected, a.currency)}</Typography>
                            <Typography variant="body2"><strong>Monto conciliado:</strong> {money(a.conciliated, a.currency)}</Typography>
                            <Typography variant="body2"><strong>Monto pendiente de confirmar:</strong> {money(a.pending, a.currency)}</Typography>
                            {a.not_received > 0 && <Typography variant="body2"><strong>Confirmado como no recibido:</strong> {money(a.not_received, a.currency)}</Typography>}
                        </Box>
                    ))}
                    {incidents > 0 && !all && (
                        <Button variant="contained" color="warning" sx={{ mt: 1.5, textTransform: "none" }} onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth" })}>
                            Ver {plural(incidents, "incidencia", "incidencias")}
                        </Button>
                    )}
                </Paper>

                <Box ref={listRef} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mt: 3, mb: 1 }}>
                    <Typography variant="h6" component="h2" fontWeight="bold">{all ? "Todos los pagos" : "Incidencias"}</Typography>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={all ? "all" : "incidents"}
                        onChange={(_, v) => v && setAll(v === "all")}
                        aria-label="Qué pagos mostrar"
                        sx={{ "& .MuiToggleButton-root": { textTransform: "none" } }}
                    >
                        <ToggleButton value="incidents">Incidencias</ToggleButton>
                        <ToggleButton value="all">Todos</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
                <ReconciliationItems items={detail.items} onChanged={load} onOpenOrder={setOpenOrderId} />

                <Divider sx={{ my: 3 }} />
                <DayHistory detail={detail} />
            </Box>

            {openOrderId && (
                <OrderDialog id={openOrderId} open={!!openOrderId} setOpen={(val) => { if (!val) setOpenOrderId(null); }} />
            )}
        </Layout>
    );
};
