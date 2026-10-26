// src/pages/agency/MyClosures.tsx
// "Cierres / Servicios" de la agencia (documento de Fran del 2026-10-09, Módulo 3, §22, §23 y §38): sus semanas de lunes a
// domingo, en qué punto está cada una y el botón para subir su archivo (Excel, CSV o PDF, en el formato que ya usa).
// La agencia no ve ningún cálculo interno ni el monto aprobado: el backend no se lo manda.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { CheckCircleRounded, UploadFileRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Panel } from "../../components/ui/surface/Panel";
import { useValidateSession } from "../../hooks/useValidateSession";
import { ClosureReminder } from "../../components/agency-closures/ClosureReminder";
import { ACCEPT, MyClosure, MyClosuresResponse, STATUS_COLOR, api, dateTime, day, upload } from "../../components/agency-closures/closures";

const ClosureItem: React.FC<{ c: MyClosure; onUploaded: () => void }> = ({ c, onUploaded }) => {
    const [busy, setBusy] = useState(false);
    const send = async (file: File) => {
        setBusy(true);
        try {
            const r = await upload(`/my-closures/${c.id}/upload`, { file });
            toast.success(r.message);
            onUploaded();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    return (
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }} sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={600}>Semana {c.week}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {c.file_name ? `Archivo: ${c.file_name} · ${dateTime(c.uploaded_at)}` : `Del ${day(c.period_start)} al ${day(c.period_end)}`}
                </Typography>
                {c.needs_new_file && <Typography variant="body2" color="error">No pudimos leer el archivo. Por favor, sube el Excel de esa semana.</Typography>}
                {c.paid_at && <Typography variant="body2" color="success.main">Pagado el {day(c.paid_at)}</Typography>}
            </Box>
            <Chip color={STATUS_COLOR[c.status]} label={c.status_label} icon={c.status === "pagado" ? <CheckCircleRounded /> : undefined} />
            {c.can_upload && (
                <Button component="label" variant="contained" startIcon={<UploadFileRounded />} disabled={busy}>
                    {busy ? "Subiendo…" : "Subir Excel"}
                    <input hidden type="file" accept={ACCEPT} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) send(f); }} />
                </Button>
            )}
        </Stack>
    );
};

export const MyClosures: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<MyClosuresResponse | null>(null);
    const load = useCallback(() => { api<MyClosuresResponse>("/my-closures").then(setData).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { load(); }, [load]);

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 900, mx: "auto" }}>
                <DescripcionDeVista title="Cierres / Servicios" description="Cada semana (de lunes a domingo) sube aquí tu archivo de cierre con las carreras de la semana, en el formato que ya usas. Lo revisamos y procesamos tu pago." />
                {data && <ClosureReminder reminder={data.reminder} showLink={false} sx={{ mt: 2 }} />}
                <Panel sx={{ p: 0, overflow: "hidden", mt: 2 }}>
                    {!data ? <Typography sx={{ p: 2 }}>Cargando…</Typography> : data.closures.length === 0 ? (
                        <Typography sx={{ p: 2 }} color="text.secondary">Todavía no hay semanas por cerrar.</Typography>
                    ) : data.closures.map((c) => <ClosureItem key={c.id} c={c} onUploaded={load} />)}
                </Panel>
            </Box>
        </Layout>
    );
};
