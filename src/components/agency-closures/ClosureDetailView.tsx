// src/components/agency-closures/ClosureDetailView.tsx
// Un cierre semanal (Módulo 3, §31 a §37): el resultado (cálculo interno, lo reportado, la diferencia y las carreras que
// coinciden, con diferencia o sin emparejar) y, abajo, solo lo que hay que revisar (§32). Todo lo demás queda a un clic:
// todas las filas, las versiones del archivo y el historial (§40).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Chip, Link, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Theme, Typography, useMediaQuery,
} from "@mui/material";
import { ArrowBackRounded, DoneAllRounded, DownloadRounded, PaymentsRounded, RefreshRounded, UploadFileRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Panel } from "../ui/surface/Panel";
import { ApproveDialog } from "./ApproveDialog";
import { DiscrepancyDialog } from "./DiscrepancyDialog";
import { PayDialog } from "./PayDialog";
import { ACCEPT, ClosureRow, ClosureShow, FIELD_LABEL, STATUS_COLOR, api, dateTime, day, download, money, signedMoney, upload } from "./closures";

const ACTION_LABEL: Record<string, string> = {
    closure_file_uploaded: "Subió el archivo", closure_file_replaced: "Reemplazó el archivo", closure_reprocessed: "Volvió a procesar",
    discrepancy_resolved: "Resolvió un caso", closure_bulk_approved: "Aprobó el cierre completo", discrepancy_reopened: "Reabrió un caso", discrepancy_note: "Anotó", row_linked: "Enlazó una fila a mano",
    closure_approved: "Monto final aprobado", closure_reopened: "Volvió a revisión", closure_paid: "Registró el pago",
};

const Stat: React.FC<{ label: string; value: string; hint?: string; strong?: boolean; color?: string }> = ({ label, value, hint, strong, color }) => (
    <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant={strong ? "h5" : "h6"} sx={{ fontWeight: strong ? 700 : 600, color }}>{value}</Typography>
        {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
);

const rowTitle = (r: ClosureRow) => r.order?.name ?? (r.external_order_id ? `${r.external_order_id}` : `Fila ${r.position}`);

export const ClosureDetailView: React.FC<{ id: number }> = ({ id }) => {
    const [data, setData] = useState<ClosureShow | null>(null);
    const [view, setView] = useState("open");
    const [selected, setSelected] = useState<number | null>(null);
    const [paying, setPaying] = useState(false);
    const [approving, setApproving] = useState<null | "agency" | "manual">(null);
    const [busy, setBusy] = useState(false);
    const phone = useMediaQuery((t: Theme) => t.breakpoints.down("sm"));

    const load = useCallback(() => { api<ClosureShow>(`/delivery/closures/${id}`).then(setData).catch((e) => toast.error(e.message)); }, [id]);
    useEffect(() => { load(); }, [load]);
    const c = data?.closure;
    const processing = !!c && (c.status === "procesando" || (c.status === "archivo_recibido" && !c.processing_error));
    useEffect(() => {
        if (!processing) return;
        const t = setInterval(load, 4000);
        return () => clearInterval(t);
    }, [processing, load]);

    const cases = useMemo(() => (data?.rows ?? []).filter((r) => r.discrepancy), [data]);
    const open = cases.filter((r) => r.discrepancy!.status === "open");
    const shown = view === "open" ? open : view === "cases" ? cases : data?.rows ?? [];
    const row = data?.rows.find((r) => r.id === selected) ?? null;

    if (!data || !c) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const editable = c.status === "pendiente_revision" || c.status === "listo_pago";

    const sendFile = async (file: File) => {
        setBusy(true);
        try {
            const r = await upload(`/delivery/closures/${c.id}/upload`, { file });
            toast.success(r.message);
            load();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    const reprocess = async () => {
        const resolved = cases.length - open.length;
        if (resolved > 0 && !window.confirm(`Volver a procesar empareja todo otra vez: las ${resolved} resoluciones de este archivo dejan de contar (quedan en el historial). ¿Seguir?`)) return;
        setBusy(true);
        try { toast.success((await api<{ message: string }>(`/delivery/closures/${c.id}/reprocess`, "POST")).message); load(); }
        catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    const s = c.summary ?? {};
    const current = data.files.find((f) => f.is_current);

    return (
        <Stack spacing={2}>
            <Box>
                <Link component={RouterLink} to="/admin/cierres-agencias" underline="hover" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }} variant="body2">
                    <ArrowBackRounded fontSize="small" /> Cierres
                </Link>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={700}>{c.agency}</Typography>
                    <Typography variant="body2" color="text.secondary">Semana {c.week} · {c.trips_count} carreras registradas en el sistema</Typography>
                </Box>
                <Chip color={STATUS_COLOR[c.status]} label={c.status_label} />
                {c.status !== "pagado" && (
                    <Button component="label" variant="outlined" startIcon={<UploadFileRounded />} disabled={busy}>
                        {c.file ? "Reemplazar archivo" : "Subir archivo"}
                        <input hidden type="file" accept={ACCEPT} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) sendFile(f); }} />
                    </Button>
                )}
                {c.file && c.status !== "pagado" && !processing && <Button startIcon={<RefreshRounded />} onClick={reprocess} disabled={busy}>Volver a procesar</Button>}
                {c.status === "listo_pago" && <Button onClick={() => setApproving("manual")}>Otro monto</Button>}
                {c.status === "listo_pago" && <Button variant="contained" startIcon={<PaymentsRounded />} onClick={() => setPaying(true)}>Registrar pago</Button>}
            </Stack>

            {c.status === "pendiente_archivo" && (
                <Alert severity={c.reminder_due ? "warning" : "info"}>
                    La agencia todavía no subió su archivo. {c.reminder_due ? "Ya está viendo el aviso en su panel." : `El aviso le aparece el ${dateTime(c.reminder_at)}.`} También puedes subirlo tú.
                </Alert>
            )}
            {processing && <Alert severity="info">Procesando el archivo{current ? ` (${current.name})` : ""}… Con un PDF puede tardar un par de minutos.</Alert>}
            {c.processing_error && (
                <Alert severity="error">
                    No se pudo procesar el archivo: {c.processing_error}
                    {/columnas|mapeo/i.test(c.processing_error) && " Corrige las columnas en la pestaña Configuración y vuelve a procesar."}
                </Alert>
            )}

            {s.rows !== undefined && (
                <Panel>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
                        <Stat label="Cálculo interno" value={money(c.expected_total)} hint="de las carreras emparejadas" />
                        <Stat label="Reportado por la agencia" value={money(c.reported_total)} hint={`${s.rows} filas en el archivo`} />
                        <Stat label="Diferencia" value={signedMoney(c.difference)} color={(c.difference ?? 0) > 0 ? "warning.main" : undefined} />
                        <Stat label="Monto final aprobado" strong value={c.final_approved_total !== null ? money(c.final_approved_total) : "Pendiente"}
                            hint={c.final_approved_total !== null ? (c.manual_total !== null ? `otro monto${c.approved_by ? `, de ${c.approved_by}` : ""}: ${c.manual_reason}` : c.approved_by ? `aprobado por ${c.approved_by}` : "todo cuadró") : `${s.open} ${s.open === 1 ? "caso abierto" : "casos abiertos"}`} />
                    </Box>
                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
                        <Chip color="success" variant="outlined" label={`${s.ok} coinciden`} />
                        <Chip color="warning" variant="outlined" label={`${s.discrepancies} con diferencia`} />
                        <Chip color="error" variant="outlined" label={`${s.unmatched} sin emparejar o dudosas`} />
                        {!!s.trips_without_row && <Chip variant="outlined" label={`${s.trips_without_row} carreras del sistema que la agencia no cobró`} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        Tolerancia: {money(c.tolerance.amount)}{c.tolerance.percent ? ` o ${c.tolerance.percent} %` : ""}.
                        {s.by_method && Object.keys(s.by_method).length > 0 && ` Emparejadas por: ${Object.entries(s.by_method).map(([k, n]) => `${({ order_id: "número de orden", phone: "teléfono", name_date: "nombre y fecha", ai: "IA", manual: "a mano" } as Record<string, string>)[k] ?? k} ${n}`).join(", ")}.`}
                    </Typography>
                    {(s.ai_note || (s.warnings && s.warnings.length > 0)) && (
                        <Alert severity="warning" sx={{ mt: 1.5 }}>{[...(s.warnings ?? []), s.ai_note].filter(Boolean).join(" ")}</Alert>
                    )}
                    {c.payment && (
                        <Alert severity="success" sx={{ mt: 1.5 }}
                            action={c.payment.has_receipt ? <Button size="small" color="inherit" onClick={() => download(`/delivery/closures/${c.id}/receipt`, `comprobante-cierre-${c.id}`)}>Comprobante</Button> : undefined}>
                            Pagado {money(c.payment.amount)} el {day(c.payment.date)}{c.payment.method ? ` por ${c.payment.method}` : ""}{c.payment.reference ? ` (ref. ${c.payment.reference})` : ""}. Registró {c.paid_by}.
                        </Alert>
                    )}
                </Panel>
            )}

            {c.status === "pendiente_revision" && c.approve_all.cases > 0 && (
                <Panel>
                    <Typography variant="subtitle1" fontWeight={700}>Aprobar el cierre completo</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {c.approve_all.cases === 1 ? "Queda 1 diferencia" : `Quedan ${c.approve_all.cases} diferencias`} en la lista de abajo; por ellas la agencia cobra {money(c.approve_all.reported)}.
                        Puedes cambiar cualquiera antes. Con un botón se aprueban todas las que sigan abiertas.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mt: 1.5 }}>
                        <Button variant="contained" startIcon={<DoneAllRounded />} onClick={() => setApproving("agency")}>Aprobar lo de la agencia: {money(c.approve_all.total)}</Button>
                        <Button variant="outlined" onClick={() => setApproving("manual")}>Otro monto…</Button>
                    </Stack>
                </Panel>
            )}

            {data.rows.length > 0 || data.files.length > 0 ? (
                <Panel sx={{ p: 0, overflow: "hidden" }}>
                    <Tabs value={view} onChange={(_, v) => setView(v)} variant="scrollable" allowScrollButtonsMobile sx={{ px: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                        <Tab value="open" label={`Por revisar (${open.length})`} />
                        <Tab value="cases" label={`Todos los casos (${cases.length})`} />
                        <Tab value="rows" label={`Todas las filas (${data.rows.length})`} />
                        <Tab value="files" label={`Archivo (${data.files.length})`} />
                        <Tab value="history" label="Historial" />
                    </Tabs>
                    {(view === "open" || view === "cases" || view === "rows") && (
                        shown.length === 0 ? (
                            <Typography sx={{ p: 2 }} color="text.secondary">{view === "open" ? "No queda nada por revisar." : "Sin filas."}</Typography>
                        ) : phone ? (
                            <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
                                {shown.map((r) => {
                                    const d = r.discrepancy;
                                    return (
                                        <Box key={r.id} onClick={() => setSelected(r.id)} sx={{ p: 1.5, cursor: "pointer" }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                                                <Typography variant="body2" fontWeight={600} noWrap>{rowTitle(r)}{r.repeat_mark ? " (repetida)" : ""}</Typography>
                                                {d ? <Chip size="small" color={d.status === "open" ? "warning" : "success"} variant={d.status === "open" ? "filled" : "outlined"} label={d.status === "open" ? d.kind_label : "Resuelto"} />
                                                    : <Chip size="small" color="success" variant="outlined" label="Cuadra" />}
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{r.order?.client || r.client_name || "—"} · {day(r.trip?.date ?? r.row_date)}</Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                Agencia {money(r.reported_cost)} · Sistema {money(d ? d.expected_cost : r.expected_cost)}{d?.difference !== null && d?.difference !== undefined ? ` · ${signedMoney(d.difference)}` : ""}
                                                {r.approved_cost !== null && <b> · se paga {money(r.approved_cost)}</b>}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{view === "rows" ? "Fila" : "Caso"}</TableCell><TableCell>Pedido / cliente</TableCell><TableCell>Fecha</TableCell>
                                            <TableCell align="right">Agencia</TableCell><TableCell align="right">Sistema</TableCell><TableCell align="right">Diferencia</TableCell>
                                            <TableCell align="right">Se paga</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {shown.map((r) => {
                                            const d = r.discrepancy;
                                            return (
                                                <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => setSelected(r.id)}>
                                                    <TableCell sx={{ minWidth: 150 }}>
                                                        {view === "rows" && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>#{r.position} · {r.match_status_label}{r.match_method_label ? ` (${r.match_method_label})` : ""}</Typography>}
                                                        {d ? <Chip size="small" color={d.status === "open" ? "warning" : "success"} variant={d.status === "open" ? "filled" : "outlined"} label={d.status === "open" ? d.kind_label : `${d.kind_label} · resuelto`} />
                                                            : view === "rows" ? <Chip size="small" color="success" variant="outlined" label="Cuadra" /> : null}
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 170 }}>
                                                        <Typography variant="body2" fontWeight={600}>{rowTitle(r)}{r.repeat_mark ? " (repetida)" : ""}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{r.order?.client || r.client_name || "—"}{r.order && r.client_name ? ` · archivo: ${r.client_name}` : ""}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{day(r.trip?.date ?? r.row_date)}</TableCell>
                                                    <TableCell align="right">{money(r.reported_cost)}</TableCell>
                                                    <TableCell align="right">{money(d ? d.expected_cost : r.expected_cost)}</TableCell>
                                                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{signedMoney(d?.difference ?? (r.expected_cost !== null && r.reported_cost !== null ? r.reported_cost - r.expected_cost : null))}</TableCell>
                                                    <TableCell align="right"><Typography variant="body2" fontWeight={600}>{money(r.approved_cost)}</Typography></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )
                    )}
                    {view === "files" && (
                        <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
                            {data.files.map((f) => (
                                <Stack key={f.id} direction={{ xs: "column", sm: "row" }} gap={1} sx={{ p: 2 }} alignItems={{ sm: "center" }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600}>Versión {f.version}{f.is_current ? " (vigente)" : ""} · {f.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                            {f.uploaded_by ?? "—"} · {dateTime(f.uploaded_at)}{f.rows !== null ? ` · ${f.rows} filas · ${money(f.reported_total)}` : ""}
                                        </Typography>
                                        {f.extraction?.method === "excel" && f.extraction.columns && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                Columnas: {Object.entries(f.extraction.columns).map(([k, v]) => `${FIELD_LABEL[k] ?? k} ${v}`).join(" · ")} (títulos en la fila {f.extraction.header_row})
                                            </Typography>
                                        )}
                                        {f.extraction?.method === "pdf_ia" && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>PDF leído con IA; cada monto se comprobó contra su línea del documento.</Typography>}
                                    </Box>
                                    <Button size="small" startIcon={<DownloadRounded />} onClick={() => download(`/delivery/closure-files/${f.id}`, f.name)}>Descargar</Button>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                    {view === "history" && (
                        <Stack sx={{ p: 2 }} spacing={1}>
                            {data.history.length === 0 && <Typography color="text.secondary">Sin movimientos.</Typography>}
                            {data.history.map((h, i) => (
                                <Typography key={i} variant="body2">
                                    <Typography component="span" variant="caption" color="text.secondary">{dateTime(h.at)}</Typography>{" "}
                                    <b>{h.user ?? "Sistema"}</b> · {ACTION_LABEL[h.action] ?? h.action}
                                    {h.action === "discrepancy_resolved" && h.after && ` (${money(h.after.approved_cost as number)}${h.after.reason ? `: ${h.after.reason}` : ""})`}
                                    {h.action === "discrepancy_note" && h.after && `: ${h.after.text}`}
                                    {h.action === "closure_bulk_approved" && h.after && ` (${money(h.after.final_approved_total as number)}${h.after.reason ? `: ${h.after.reason}` : ", con lo de la agencia"})`}
                                    {(h.action === "closure_file_uploaded" || h.action === "closure_file_replaced") && h.after && `: ${h.after.name}${h.after.by_agency ? " (la agencia)" : ""}`}
                                </Typography>
                            ))}
                        </Stack>
                    )}
                </Panel>
            ) : null}

            {row && <DiscrepancyDialog closureId={c.id} row={row} editable={editable} onClose={() => setSelected(null)} onChanged={() => load()} />}
            {approving && <ApproveDialog closure={c} mode={approving} onClose={() => setApproving(null)} onApproved={() => { setApproving(null); load(); }} />}
            {paying && <PayDialog closure={c} onClose={() => setPaying(false)} onPaid={() => { setPaying(false); load(); }} />}
        </Stack>
    );
};
