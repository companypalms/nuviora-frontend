// src/components/agency-closures/DiscrepancyDialog.tsx
// La ficha de un caso (Módulo 3, §33 y §34): lo que reporta la agencia, lo que calcula el sistema, la diferencia, la
// distancia interna, el tarifario aplicado y el link del cliente (solo administración). Acciones: aceptar el cálculo del
// sistema, aceptar lo de la agencia, poner un monto a mano, marcar incidencia, enlazar la fila con otra carrera o anotar.
import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, InputAdornment, Link, List,
    ListItemButton, ListItemText, Stack, TextField, Typography,
} from "@mui/material";
import { CloseRounded, LinkRounded, SearchRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { ClosureRow, Trip, api, day, km, money, signedMoney, dateTime } from "./closures";

type Mode = null | "manual" | "incident" | "link";

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" component="div">{children}</Typography>
    </Box>
);

const LinkTrip: React.FC<{ closureId: number; row: ClosureRow; onLinked: () => void }> = ({ closureId, row, onLinked }) => {
    const [q, setQ] = useState("");
    const [trips, setTrips] = useState<Trip[] | null>(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => {
            const params = new URLSearchParams();
            if (q.trim()) params.set("q", q.trim());
            else row.candidate_trip_ids.forEach((id) => params.append("ids[]", String(id)));
            api<{ trips: Trip[] }>(`/delivery/closures/${closureId}/trips?${params}`).then((r) => setTrips(r.trips)).catch((e) => toast.error(e.message));
        }, 300);
        return () => clearTimeout(t);
    }, [q, closureId, row.candidate_trip_ids]);

    const link = async (trip: Trip) => {
        setBusy(true);
        try {
            const r = await api<{ message: string }>(`/delivery/closure-rows/${row.id}/link`, "POST", { trip_id: trip.id });
            toast.success(r.message);
            onLinked();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    return (
        <Stack spacing={1}>
            <TextField size="small" autoFocus placeholder="Buscar por orden, cliente o teléfono" value={q} onChange={(e) => setQ(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} />
            {!q.trim() && row.candidate_trip_ids.length > 0 && <Typography variant="caption" color="text.secondary">Las carreras posibles para esta fila:</Typography>}
            {trips === null ? <Typography variant="body2">Buscando…</Typography> : trips.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{q.trim() ? "No hay carreras de esta agencia con eso, una semana antes o después." : "Escribe para buscar entre las carreras de la agencia."}</Typography>
            ) : (
                <List dense disablePadding sx={{ maxHeight: 260, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    {trips.map((t) => (
                        <ListItemButton key={t.id} disabled={busy} onClick={() => link(t)} divider>
                            <ListItemText
                                primary={`${t.order_name ?? `#${t.order_id}`} · ${t.client || "sin nombre"}`}
                                secondary={[day(t.trip_date) + (t.in_week ? "" : " (otra semana)"), t.result, t.phone, t.expected_cost !== null ? `calculado ${money(t.expected_cost)}` : "sin cálculo",
                                    t.linked_row ? `ya está en la fila ${t.linked_row}` : null].filter(Boolean).join(" · ")}
                            />
                            <LinkRounded fontSize="small" color="action" />
                        </ListItemButton>
                    ))}
                </List>
            )}
        </Stack>
    );
};

export const DiscrepancyDialog: React.FC<{ closureId: number; row: ClosureRow; editable: boolean; onClose: () => void; onChanged: () => void }> = ({ closureId, row, editable, onClose, onChanged }) => {
    const d = row.discrepancy;
    const [mode, setMode] = useState<Mode>(null);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const open = d?.status === "open";
    const linked = row.match_status === "matched" || row.match_status === "manually_matched";

    const run = async (fn: () => Promise<{ message: string }>) => {
        setBusy(true);
        try {
            const r = await fn();
            toast.success(r.message);
            onChanged();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    const resolve = (option: string, extra: Record<string, unknown> = {}) =>
        run(() => api(`/delivery/closure-discrepancies/${d!.id}/resolve`, "POST", { option, ...extra }));
    const raw = row.raw.celdas ? Object.entries(row.raw.celdas).map(([k, v]) => `${k}: ${v}`).join(" · ") : row.raw.texto;

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pr: 6 }}>
                {row.order ? `Pedido ${row.order.name}` : row.external_order_id ? `Orden ${row.external_order_id} (no encontrada)` : `Fila ${row.position} del archivo`}
                <Stack direction="row" gap={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
                    {d && <Chip size="small" color={open ? "warning" : "success"} label={open ? d.kind_label : `Resuelto: ${d.resolution_label}`} />}
                    <Chip size="small" variant="outlined" label={row.match_status_label + (row.match_method_label ? ` · ${row.match_method_label}` : "")} />
                </Stack>
                <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Cerrar"><CloseRounded /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
                        <Fact label="Cliente">{row.order?.client || row.client_name || "—"}{row.order && row.client_name && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>en el archivo: {row.client_name}</Typography>}</Fact>
                        <Fact label="Agencia reporta">{money(row.reported_cost)}</Fact>
                        <Fact label="Sistema calcula">{money(d ? d.expected_cost : row.expected_cost)}{d?.kind === "duplicate" && row.expected_cost !== null && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>ya se cobra en otra fila ({money(row.expected_cost)})</Typography>}</Fact>
                        <Fact label="Diferencia">{signedMoney(d?.difference ?? null)}</Fact>
                        <Fact label="Distancia interna">{row.route ? km(row.route.distance_km) : "—"}{row.route && row.route.status !== "calculated" && <Typography variant="caption" color="warning.main" sx={{ display: "block" }}>{row.route.status_label}</Typography>}</Fact>
                        <Fact label="Tarifario aplicado">{row.route?.tariff_version ? `Versión ${row.route.tariff_version} · ${row.route.range ?? ""}` : "—"}</Fact>
                        <Fact label="Fecha">{row.trip ? `${day(row.trip.date)} · ${row.trip.result}` : day(row.row_date)}</Fact>
                        <Fact label="Link del cliente">{row.order?.location ? <Link href={row.order.location} target="_blank" rel="noreferrer">Abrir en Maps</Link> : "—"}</Fact>
                        <Fact label="Teléfono">{row.order?.phone || row.phone || "—"}</Fact>
                    </Box>
                    {(row.match_note || d?.reason) && <Alert severity={row.match_status === "possible_match" ? "warning" : "info"} sx={{ py: 0 }}>{[row.match_note, d?.status === "open" ? d?.reason : null].filter(Boolean).join(" ")}</Alert>}
                    <Box>
                        <Typography variant="caption" color="text.secondary">Lo que dice el archivo ({row.raw.fila ? `fila ${row.raw.fila}` : `línea ${row.position}`})</Typography>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-word" }}>{raw}</Typography>
                    </Box>

                    {d && !open && (
                        <Alert severity="success" action={editable ? <Button color="inherit" size="small" disabled={busy} onClick={() => run(() => api(`/delivery/closure-discrepancies/${d.id}/reopen`, "POST"))}>Reabrir</Button> : undefined}>
                            Se paga {money(d.approved_cost)} ({d.resolution_label}){d.reason ? `: ${d.reason}` : ""}. {d.resolved_by} · {dateTime(d.resolved_at)}
                        </Alert>
                    )}

                    {editable && (open || !d) && (
                        <Stack spacing={1.5}>
                            <Divider />
                            <Typography variant="subtitle2">{open ? "¿Qué se paga por esta carrera?" : "Esta fila cuadra. Si la carrera no es la correcta, enlázala con otra."}</Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                {open && linked && d?.expected_cost !== null && d?.expected_cost !== undefined && <Button variant="outlined" disabled={busy} onClick={() => resolve("system")}>Cálculo del sistema ({money(d.expected_cost)})</Button>}
                                {open && row.reported_cost !== null && <Button variant="outlined" disabled={busy} onClick={() => resolve("agency")}>Lo de la agencia ({money(row.reported_cost)})</Button>}
                                {open && <Button variant={mode === "manual" ? "contained" : "text"} disabled={busy} onClick={() => setMode(mode === "manual" ? null : "manual")}>Otro monto</Button>}
                                {open && <Button variant={mode === "incident" ? "contained" : "text"} color="warning" disabled={busy} onClick={() => setMode(mode === "incident" ? null : "incident")}>Incidencia</Button>}
                                <Button variant={mode === "link" ? "contained" : "text"} disabled={busy} startIcon={<LinkRounded />} onClick={() => setMode(mode === "link" ? null : "link")}>
                                    {linked ? "Es otra carrera" : "Enlazar a una carrera"}
                                </Button>
                            </Stack>
                            {(mode === "manual" || mode === "incident") && (
                                <Stack spacing={1}>
                                    <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                                        <TextField size="small" label="Monto a pagar" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
                                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} inputProps={{ inputMode: "decimal" }} sx={{ width: { sm: 160 } }}
                                            helperText={mode === "incident" ? "0 si no se paga" : undefined} />
                                        <TextField size="small" label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ flex: 1 }}
                                            placeholder={mode === "incident" ? "Ej.: no es una carrera, la agencia anotó otra cosa" : "Ej.: la agencia cobró correctamente por una novedad"} />
                                    </Stack>
                                    <Box>
                                        <Button variant="contained" disabled={busy || amount.trim() === "" || reason.trim() === ""}
                                            onClick={() => resolve(mode, { amount: Number(amount.replace(",", ".")), reason })}>Guardar</Button>
                                    </Box>
                                </Stack>
                            )}
                            {mode === "link" && <LinkTrip closureId={closureId} row={row} onLinked={onChanged} />}
                        </Stack>
                    )}

                    {d && (
                        <Stack spacing={1}>
                            <Divider />
                            <Typography variant="subtitle2">Notas</Typography>
                            {d.notes.length === 0 && <Typography variant="body2" color="text.secondary">Sin notas.</Typography>}
                            {d.notes.map((n, i) => (
                                <Typography key={i} variant="body2"><b>{n.user}</b> <Typography component="span" variant="caption" color="text.secondary">{dateTime(n.at)}</Typography><br />{n.text}</Typography>
                            ))}
                            {editable && (
                                <Stack direction="row" gap={1}>
                                    <TextField size="small" fullWidth placeholder="Añadir una nota" value={note} onChange={(e) => setNote(e.target.value)} />
                                    <Button disabled={busy || !note.trim()} onClick={() => run(async () => { const r = await api<{ message: string }>(`/delivery/closure-discrepancies/${d.id}/notes`, "POST", { text: note }); setNote(""); return r; })}>Anotar</Button>
                                </Stack>
                            )}
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
        </Dialog>
    );
};
