// src/components/logistics/OrderDialogs.tsx
// Lo que el operador hace con una orden desde la torre de control (logística propia, §8.4, §13, §19.1, §26): asignarla a
// mano a un rider que dijo que sí por teléfono, pasarla a la agencia antes del minuto 5, atender la novedad del rider y
// ver el historial con sus rondas. Las reglas las valida el backend; aquí solo se muestran sus respuestas.
import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, List, ListItemButton, ListItemText, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { api, CandidatesResponse, clock, errorMessage, hour, mapsLink, OrderDetail, TowerOrder } from "./logistics";

type Props = { row: TowerOrder | null; onClose: () => void; onDone: () => void };

/** §8.4: "Solo cuando el rider responde afirmativamente, el operador pulsa 'Asignar manualmente a [rider]'". */
export const AssignDialog: React.FC<Props> = ({ row, onClose, onDone }) => {
    const [data, setData] = useState<CandidatesResponse | null>(null);
    const [riderId, setRiderId] = useState<number | null>(null);
    const [comment, setComment] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!row) return;
        setData(null); setRiderId(null); setComment("");
        api<CandidatesResponse>(`/logistics/orders/${row.id}/candidates`).then(setData).catch((e) => toast.error(errorMessage(e)));
    }, [row]);

    const submit = async () => {
        if (!row || !riderId) return;
        setSaving(true);
        try {
            const r = await api<{ message: string }>(`/logistics/orders/${row.id}/assign`, "POST", { rider_id: riderId, comment: comment || null });
            toast.success(r.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const chosen = [...(data?.eligible ?? []), ...(data?.excluded ?? [])].find((c) => c.rider_id === riderId);

    return (
        <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Asignar a mano · {row?.order?.name}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Llama al rider y asígnala solo si te dijo que sí. Las rondas de esta orden se cierran al asignar.
                </Typography>
                {data?.warning && <Alert severity="warning" sx={{ mb: 1.5 }}>{data.warning}</Alert>}
                {!data ? <Typography color="text.secondary">Buscando riders…</Typography> : (
                    <List dense disablePadding>
                        {data.eligible.map((c) => (
                            <ListItemButton key={c.rider_id} selected={riderId === c.rider_id} onClick={() => setRiderId(c.rider_id)} sx={{ borderRadius: 2 }}>
                                <ListItemText primary={`${c.rank}. ${c.name}`}
                                    secondary={`Llega al centro en ${clock(c.eta_center_seconds)} · entrega estimada a los ${c.projected_minutes} min · ${c.delivered_today} hoy`} />
                            </ListItemButton>
                        ))}
                        {data.excluded.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.5 }}>Fuera de la ronda</Typography>}
                        {data.excluded.map((c) => (
                            <ListItemButton key={c.rider_id} selected={riderId === c.rider_id} onClick={() => setRiderId(c.rider_id)} sx={{ borderRadius: 2, opacity: 0.75 }}>
                                <ListItemText primary={c.name} secondary={c.reason_label} />
                            </ListItemButton>
                        ))}
                        {data.eligible.length + data.excluded.length === 0 && <Typography color="text.secondary">El centro no tiene riders.</Typography>}
                    </List>
                )}
                {chosen?.reason && <Alert severity="info" sx={{ mt: 1.5 }}>{chosen.name} no entraba en la ronda: {chosen.reason_label?.toLowerCase()}. Si igual te dijo que sí, el sistema decide si se puede.</Alert>}
                <TextField label="Comentario (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} fullWidth size="small" sx={{ mt: 2 }} inputProps={{ maxLength: 250 }} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={submit} disabled={!riderId || saving}>{chosen ? `Asignar a ${chosen.name}` : "Asignar"}</Button>
            </DialogActions>
        </Dialog>
    );
};

/** §19.1: el operador la pasa a la agencia antes del minuto 5, con el motivo. */
export const AgencyDialog: React.FC<Props> = ({ row, onClose, onDone }) => {
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => { setReason(""); }, [row]);

    const submit = async () => {
        if (!row) return;
        setSaving(true);
        try {
            const r = await api<{ message: string }>(`/logistics/orders/${row.id}/to-agency`, "POST", { reason });
            toast.success(r.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Pasar a la agencia · {row?.order?.name}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Se cierran las rondas y la orden queda para la agencia de respaldo. Si no la pasas, se va sola a los 5 minutos.
                </Typography>
                <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth size="small" autoFocus
                    placeholder="Ningún rider llega a tiempo, flota llena…" inputProps={{ maxLength: 250 }} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" color="secondary" onClick={submit} disabled={!reason.trim() || saving}>Pasar a la agencia</Button>
            </DialogActions>
        </Dialog>
    );
};

/** §13: lo logístico lo resuelve el operador; lo comercial solo se escala a la vendedora. */
export const NoveltyDialog: React.FC<Props> = ({ row, onClose, onDone }) => {
    const n = row?.open_novelty ?? null;
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => { setText(""); }, [row]);

    const run = async (url: string, body: object) => {
        setSaving(true);
        try {
            const r = await api<{ message: string }>(url, "POST", body);
            toast.success(r.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Novedad · {row?.order?.name}</DialogTitle>
            {n && (
                <DialogContent>
                    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
                        <Chip color="error" label={n.type_label} />
                        {n.commercial && <Chip variant="outlined" label="Comercial: va a la vendedora" />}
                        {n.escalated_at && <Chip color="secondary" label={`Escalada a las ${hour(n.escalated_at)}`} />}
                    </Stack>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {n.reporter ?? "El rider"} a las {hour(n.opened_at)}{n.description ? `: “${n.description}”` : "."}
                    </Typography>
                    {row?.rider?.phone && <Typography variant="body2" color="text.secondary">Teléfono del rider: {row.rider.phone}</Typography>}
                    {row?.order?.client?.phone && <Typography variant="body2" color="text.secondary">Teléfono del cliente: {row.order.client.phone}</Typography>}
                    {n.comments.length > 0 && (
                        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                            {n.comments.map((c, i) => <Typography key={i} variant="body2"><b>{c.name}</b> ({hour(c.at)}): {c.text}</Typography>)}
                        </Box>
                    )}
                    {n.escalated_at ? (
                        <Alert severity="info" sx={{ mt: 2 }}>La tiene la vendedora: la orden está en "Novedades". Cuando la marque "Novedad Solucionada", vuelve a la ruta.</Alert>
                    ) : (
                        <TextField label={n.commercial ? "Comentario para la vendedora (opcional)" : "Qué se hizo"} value={text} onChange={(e) => setText(e.target.value)}
                            fullWidth size="small" multiline minRows={2} sx={{ mt: 2 }} inputProps={{ maxLength: 250 }}
                            placeholder={n.commercial ? "" : "El cliente ya bajó, se le indicó la entrada…"} />
                    )}
                </DialogContent>
            )}
            <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
                <Button onClick={onClose}>Cerrar</Button>
                {n && !n.escalated_at && (
                    <>
                        <Button disabled={!text.trim() || saving} onClick={() => run(`/logistics/novelties/${n.id}/comment`, { text })}>Solo comentar</Button>
                        <Button variant={n.commercial ? "contained" : "outlined"} color="secondary" disabled={saving}
                            onClick={() => run(`/logistics/novelties/${n.id}/escalate`, { comment: text || null })}>Escalar a la vendedora</Button>
                        {!n.commercial && <Button variant="contained" disabled={!text.trim() || saving} onClick={() => run(`/logistics/novelties/${n.id}/resolve`, { result: text })}>Resuelta: sigue la ruta</Button>}
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

/**
 * §14.2: la incidencia de ruta. El operador decide si el rider sigue o si se interrumpe la ruta y de dónde recoge el
 * reemplazo el paquete: donde está el rider (sigue bajo su custodia hasta el traspaso) o el centro, si ya volvió.
 */
export const IncidentDialog: React.FC<Props> = ({ row, onClose, onDone }) => {
    const inc = row?.open_incident ?? null;
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => { setNote(""); }, [row]);

    const run = async (url: string, body: object) => {
        setSaving(true);
        try {
            const r = await api<{ message: string }>(url, "POST", body);
            toast.success(r.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Incidencia de ruta · {row?.order?.name}</DialogTitle>
            {inc && (
                <DialogContent>
                    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
                        <Chip color="error" label={inc.type_label} />
                        {inc.status === "interrumpida" && <Chip color="warning" label="Ruta interrumpida: esperando el traspaso" />}
                    </Stack>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {inc.rider?.names ?? "El rider"} a las {hour(inc.reported_at)}{inc.comment ? `: “${inc.comment}”` : "."}
                    </Typography>
                    {inc.rider?.phone && <Typography variant="body2" color="text.secondary">Teléfono del rider: {inc.rider.phone}</Typography>}
                    {inc.lat !== null && inc.lng !== null && (
                        <Link href={mapsLink(inc.lat, inc.lng)} target="_blank" rel="noopener" variant="body2">Ver dónde está en el mapa</Link>
                    )}
                    {inc.status === "abierta" && (
                        <>
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Si no puede seguir, interrumpe la ruta: la orden vuelve a buscar rider (el SLA sigue corriendo). Elige dónde recoge el paquete el reemplazo.
                            </Alert>
                            <TextField label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth size="small" sx={{ mt: 2 }} inputProps={{ maxLength: 250 }} />
                        </>
                    )}
                </DialogContent>
            )}
            <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
                <Button onClick={onClose}>Cerrar</Button>
                {inc?.status === "abierta" && (
                    <>
                        <Button disabled={saving} onClick={() => run(`/logistics/incidents/${inc.id}/continue`, { note: note || null })}>Puede seguir</Button>
                        <Button color="warning" variant="outlined" disabled={saving}
                            onClick={() => run(`/logistics/incidents/${inc.id}/interrupt`, { pickup: "almacen", note: note || null })}>Interrumpir: el paquete está en el centro</Button>
                        <Button color="error" variant="contained" disabled={saving}
                            onClick={() => run(`/logistics/incidents/${inc.id}/interrupt`, { pickup: "rider", note: note || null })}>Interrumpir: recoger donde está el rider</Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

const ROUND_RESULT: Record<string, string> = { confirmada: "Confirmada", sin_confirmar: "Nadie confirmó", cancelada: "Cancelada" };
const OFFER_RESPONSE: Record<string, string> = { confirmada: "Confirmó", sin_confirmar: "No confirmó", cubierta: "Ya otro rider aceptó", cancelada: "Cancelada" };

/** El historial de la orden en el centro (§26): rondas, a quién le llegó la alarma y cada cambio con quién lo hizo. */
export const DetailDialog: React.FC<{ id: number | null; onClose: () => void }> = ({ id, onClose }) => {
    const [d, setD] = useState<OrderDetail | null>(null);
    useEffect(() => {
        if (!id) return;
        setD(null);
        api<{ order: OrderDetail }>(`/logistics/orders/${id}`).then((r) => setD(r.order)).catch((e) => toast.error(errorMessage(e)));
    }, [id]);

    return (
        <Dialog open={!!id} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Historial · {d?.order?.name ?? "…"}</DialogTitle>
            <DialogContent>
                {!d ? <Typography color="text.secondary">Cargando…</Typography> : (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Rondas</Typography>
                        {d.rounds.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Sin rondas.</Typography>}
                        {d.rounds.map((r) => (
                            <Box key={r.id} sx={{ mb: 1.5 }}>
                                <Typography variant="body2"><b>R{r.number}</b> · {hour(r.started_at)} a {hour(r.ended_at ?? r.expires_at)} · {r.result ? (ROUND_RESULT[r.result] ?? r.result) : "en curso"}</Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 1 }}>
                                    {r.offers.map((o) => (
                                        <Chip key={o.id} size="small" variant="outlined" color={o.response === "confirmada" ? "success" : o.push_ok === false ? "error" : "default"}
                                            label={`${o.rider?.names ?? "?"}: ${o.response ? (OFFER_RESPONSE[o.response] ?? o.response) : o.seen_at ? "la vio" : o.push_ok === false ? "no le llegó la alarma" : "esperando"}`} />
                                    ))}
                                </Stack>
                            </Box>
                        ))}
                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Movimientos</Typography>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>Hora</TableCell><TableCell>Qué pasó</TableCell><TableCell>Quién</TableCell><TableCell>Detalle</TableCell></TableRow></TableHead>
                            <TableBody>
                                {d.events.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell>{hour(e.created_at)}</TableCell>
                                        <TableCell>{e.action.replace(/_/g, " ")}</TableCell>
                                        <TableCell>{e.actor?.names ?? "Sistema"}</TableCell>
                                        <TableCell sx={{ maxWidth: 320 }}>{e.reason ?? ""}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
        </Dialog>
    );
};
