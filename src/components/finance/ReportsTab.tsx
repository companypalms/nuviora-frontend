// src/components/finance/ReportsTab.tsx
// Finanzas › Reportes (Módulo 4 de Fran, entrega 4):
// - §56 y §57: un reporte de cualquier rango; hoy, semana actual y mes actual salen PROVISIONAL. §58: cada uno se compara
//   con el período anterior del mismo largo.
// - §53 a §55: los automáticos (diario D-3, semanal, mensual), que se generan solos, con su configuración.
// - §80: el reporte ejecutivo en PDF y el Excel detallado para análisis, contador y auditoría.
// - R18: mandarlo por WhatsApp. §20, §21: versiones cuando una entrega tardía cambia las cifras.
import React, { useCallback, useEffect, useState } from "react";
import {
    Button, Chip, IconButton, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { PeriodPicker } from "./PeriodPicker";
import { ReportDialog } from "./ReportDialog";
import { ReportsConfigPanel } from "./ReportsConfigPanel";
import { FinancialReportRow, ReportType, ReportsResponse, api, changeText, download, errorMessage, money, monthRange } from "./finance";

/** Abre el PDF en otra pestaña (o lo baja, si el navegador no deja abrirla). */
const openPdf = async (url: string, name: string) => {
    try {
        const { status, response } = await request(url, "GET");
        if (status !== 200) { toast.error("No se pudo abrir el PDF"); return; }
        const href = URL.createObjectURL(await response.blob());
        if (!window.open(href, "_blank")) {
            const a = document.createElement("a");
            a.href = href;
            a.download = name;
            a.click();
        }
        setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch {
        toast.error("Error de conexión");
    }
};

export const ReportsTab: React.FC = () => {
    const [data, setData] = useState<ReportsResponse | null>(null);
    const [type, setType] = useState<ReportType | "">("");
    const [page, setPage] = useState(1);
    const [range, setRange] = useState<[string, string]>(monthRange());
    const [busy, setBusy] = useState(false);
    const [viewing, setViewing] = useState<number | null>(null);
    const [menu, setMenu] = useState<{ anchor: HTMLElement; r: FinancialReportRow } | null>(null);
    const [configKey, setConfigKey] = useState(0);

    const load = useCallback(() => {
        api<ReportsResponse>(`/finance/reports?page=${page}${type ? `&type=${type}` : ""}`).then(setData).catch((e) => toast.error(errorMessage(e)));
    }, [page, type]);
    useEffect(() => { load(); }, [load]);

    const generate = async () => {
        setBusy(true);
        try {
            const r = await api<{ message: string; report: FinancialReportRow }>("/finance/reports", "POST", { from: range[0], to: range[1] });
            toast.success(r.message);
            setViewing(r.report.id);
            load();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    };
    const pdf = (id: number, version?: number) => openPdf(`/finance/reports/${id}/pdf${version ? `?version=${version}` : ""}`, `reporte-${id}.pdf`);
    const act = (fn: (r: FinancialReportRow) => void | Promise<void>) => () => { if (menu) { const r = menu.r; setMenu(null); void fn(r); } };
    const post = async (url: string) => {
        try { toast.success((await api<{ message: string }>(url, "POST")).message); load(); } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <Stack spacing={2}>
            <Panel>
                <PanelHeader title="Generar un reporte" subtitle="Cualquier rango. Si incluye los últimos días sale PROVISIONAL, porque todavía se están entregando órdenes. Se compara con el período anterior del mismo largo." />
                <PeriodPicker value={range} onChange={setRange}>
                    <Stack direction="row" gap={1}>
                        <Button variant="contained" onClick={generate} disabled={busy}>Generar reporte</Button>
                        <Button variant="outlined" onClick={() => download(`/finance/export/excel?from=${range[0]}&to=${range[1]}`, `Nuviora - Finanzas ${range[0]} a ${range[1]}.xlsx`)}>
                            Excel detallado
                        </Button>
                    </Stack>
                </PeriodPicker>
            </Panel>

            <Panel>
                <PanelHeader title="Reportes" subtitle="Los automáticos y los generados a mano. El PDF es el reporte ejecutivo; el Excel trae el detalle de cada orden, gasto y movimiento de caja (con los datos de hoy)."
                    action={<Stack direction="row" gap={0.5} flexWrap="wrap">
                        {(["", "daily", "weekly", "monthly", "custom"] as const).map((t) => (
                            <Chip key={t || "all"} size="small" label={t ? data?.types[t] ?? t : "Todos"} color={type === t ? "primary" : "default"}
                                variant={type === t ? "filled" : "outlined"} onClick={() => { setType(t); setPage(1); }} />
                        ))}
                    </Stack>} />
                {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.reports.length === 0 ? (
                    <Typography color="text.secondary">Todavía no hay reportes. Los automáticos aparecen solos cuando les toca; también puedes generar uno arriba.</Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Reporte</TableCell><TableCell>Estado</TableCell><TableCell align="right">Ingresos</TableCell>
                                    <TableCell align="right">Beneficio operativo</TableCell><TableCell>Versión</TableCell><TableCell>WhatsApp</TableCell><TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.reports.map((r) => (
                                    <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => setViewing(r.id)}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{r.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {r.trigger === "auto" ? "automático" : `a mano${r.created_by ? `, ${r.created_by}` : ""}`} · {r.generated_at}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{r.status && <Chip size="small" variant="outlined" color={r.status === "PROVISIONAL" ? "warning" : "success"} label={r.status} />}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{money(Number(r.summary?.revenue ?? 0))}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap", color: Number(r.summary?.operating_profit ?? 0) < 0 ? "error.main" : undefined }}>
                                            {money(Number(r.summary?.operating_profit ?? 0))}
                                        </TableCell>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                                            {r.changes && r.changes.length > 0 ? (
                                                <Tooltip title={<>{r.reason}<br />{r.changes.map((c) => <div key={c.key}>{changeText(c)}</div>)}</>}>
                                                    <Chip size="small" color="info" variant="outlined" label={`v${r.version} · cambió`} />
                                                </Tooltip>
                                            ) : <Typography variant="body2">v{r.version}</Typography>}
                                        </TableCell>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                                            {r.whatsapp_sent_at ? <Chip size="small" color="success" variant="outlined" label={`enviado ${r.whatsapp_sent_at.slice(5, 16)}`} />
                                                : r.whatsapp_result?.some((x) => !x.ok) ? (
                                                    <Tooltip title={r.whatsapp_result.filter((x) => !x.ok).map((x) => x.error).join(" ")}>
                                                        <Chip size="small" color="error" variant="outlined" label="no se pudo" />
                                                    </Tooltip>
                                                ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                        </TableCell>
                                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                            <Tooltip title="Acciones">
                                                <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, r })}><MoreVertRounded fontSize="small" /></IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {data && data.last_page > 1 && (
                    <Stack direction="row" gap={1} justifyContent="flex-end" alignItems="center" sx={{ mt: 1 }}>
                        <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                        <Typography variant="caption">{page} de {data.last_page}</Typography>
                        <Button size="small" disabled={page >= data.last_page} onClick={() => setPage(page + 1)}>Siguiente</Button>
                    </Stack>
                )}
            </Panel>

            {data && <ReportsConfigPanel key={configKey} config={data.config} next={data.next} onSaved={() => { setConfigKey((k) => k + 1); load(); }} />}

            <Menu anchorEl={menu?.anchor} open={menu !== null} onClose={() => setMenu(null)}>
                <MenuItem onClick={act((r) => setViewing(r.id))}>Ver</MenuItem>
                <MenuItem onClick={act((r) => pdf(r.id))}>PDF</MenuItem>
                <MenuItem onClick={act((r) => download(`/finance/reports/${r.id}/excel`, `Nuviora - Finanzas ${r.from} a ${r.to}.xlsx`))}>Excel detallado</MenuItem>
                <MenuItem onClick={act((r) => post(`/finance/reports/${r.id}/refresh`))}>Actualizar cifras</MenuItem>
                <MenuItem onClick={act((r) => post(`/finance/reports/${r.id}/whatsapp`))}>Enviar por WhatsApp</MenuItem>
            </Menu>
            <ReportDialog reportId={viewing} onClose={() => setViewing(null)} onPdf={pdf} />
        </Stack>
    );
};
