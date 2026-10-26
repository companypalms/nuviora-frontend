// src/components/meta-ads/MetaConnections.tsx
// Configuración → Meta Ads, conexiones (documento de Fran del 2026-10-08, Módulo 2):
// - varias conexiones a la vez (§3), cada una con su estado, última sincronización y cuentas (§55);
// - el token se pega una vez y nunca vuelve a la pantalla (§4); Fran, en el audio: "que yo ponga el token, ponga la
//   ID… y vincule el nuevo BM";
// - cada cuenta se activa o desactiva sin el programador (§5); "Sincronizar ahora" (§56).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Paper,
    Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { AddRounded, EditRounded, HistoryRounded, RefreshRounded, SyncRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { ACCOUNT_STATUS, MetaAccount, MetaConnection, MetaSyncLog, SYNC_KIND, SYNC_STATUS, api, dateTime, shortDay } from "./metaAds";

type FormState = { name: string; business_id: string; access_token: string; app_secret: string; clear_app_secret: boolean };
const emptyForm: FormState = { name: "", business_id: "", access_token: "", app_secret: "", clear_app_secret: false };

const ConnectionDialog: React.FC<{ open: boolean; editing: MetaConnection | null; onClose: () => void; onSaved: () => void }> = ({ open, editing, onClose, onSaved }) => {
    const [form, setForm] = useState<FormState>(emptyForm);
    const [advanced, setAdvanced] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            // El token y el App Secret nunca se rellenan: el backend no los devuelve (§4)
            setForm({ ...emptyForm, name: editing?.name ?? "", business_id: editing?.business_id ?? "" });
            setAdvanced(false);
            setError(null);
        }
    }, [open, editing]);

    const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

    const save = async () => {
        setSaving(true);
        setError(null);
        const body: Record<string, unknown> = { name: form.name.trim(), business_id: form.business_id.trim() || null };
        if (form.access_token.trim()) body.access_token = form.access_token.trim();
        if (form.app_secret.trim()) body.app_secret = form.app_secret.trim();
        if (form.clear_app_secret) body.clear_app_secret = true;
        try {
            if (editing) await api(`/meta/connections/${editing.id}`, "PUT", body);
            else await api("/meta/connections", "POST", body);
            toast.success(editing ? "Conexión guardada" : "Conexión agregada: activa las cuentas que quieras sincronizar");
            onSaved();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
            setForm((f) => ({ ...f, access_token: "", app_secret: "" }));
        }
    };

    const canSave = form.name.trim() !== "" && (editing !== null || form.access_token.trim().length >= 20);

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>{editing ? `Editar «${editing.name}»` : "Agregar conexión de Meta"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Nombre" value={form.name} onChange={set("name")} placeholder="BM1" autoFocus={!editing} required fullWidth />
                    <TextField label="Business ID (opcional)" value={form.business_id} onChange={set("business_id")} inputProps={{ inputMode: "numeric" }} fullWidth />
                    <TextField
                        label={editing ? "Token nuevo (vacío = se queda el guardado)" : "System User Access Token"}
                        type="password" value={form.access_token} onChange={set("access_token")} autoComplete="off"
                        helperText={editing?.has_token ? "Hay un token guardado. Por seguridad no se muestra." : "Con permiso ads_read. Se guarda cifrado y no se vuelve a mostrar."}
                        required={!editing} fullWidth
                    />
                    <Box>
                        <Button size="small" onClick={() => setAdvanced(!advanced)}>{advanced ? "Ocultar" : "Opciones avanzadas"}</Button>
                        <Collapse in={advanced}>
                            <Stack spacing={1} sx={{ mt: 1 }}>
                                <TextField
                                    label="App Secret (solo si la app de Meta lo exige)" type="password" value={form.app_secret}
                                    onChange={set("app_secret")} autoComplete="off" fullWidth
                                    helperText={editing?.has_app_secret ? "Hay un App Secret guardado." : undefined}
                                />
                                {editing?.has_app_secret && (
                                    <Button size="small" color="warning" variant={form.clear_app_secret ? "contained" : "text"}
                                        onClick={() => setForm({ ...form, clear_app_secret: !form.clear_app_secret })}>
                                        {form.clear_app_secret ? "Se quitará el App Secret" : "Quitar el App Secret"}
                                    </Button>
                                )}
                            </Stack>
                        </Collapse>
                    </Box>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Typography variant="caption" color="text.secondary">
                        Antes de guardar, el sistema prueba el token con Meta. La integración solo lee: no puede crear, pausar ni modificar nada en Meta Ads.
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={!canSave || saving}>{saving ? "Probando con Meta…" : "Guardar"}</Button>
            </DialogActions>
        </Dialog>
    );
};

const LogsDialog: React.FC<{ connection: MetaConnection | null; onClose: () => void }> = ({ connection, onClose }) => {
    const [logs, setLogs] = useState<MetaSyncLog[] | null>(null);
    useEffect(() => {
        setLogs(null);
        if (connection) api<{ logs: MetaSyncLog[] }>(`/meta/connections/${connection.id}/logs`).then((r) => setLogs(r.logs)).catch(() => setLogs([]));
    }, [connection]);
    return (
        <Dialog open={connection !== null} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Sincronizaciones de «{connection?.name}»</DialogTitle>
            <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
                {logs === null ? <Typography>Cargando…</Typography> : logs.length === 0 ? <Typography>Todavía no hay sincronizaciones.</Typography> : (
                    <Box sx={{ overflowX: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow><TableCell>Inicio</TableCell><TableCell>Tipo</TableCell><TableCell>Estado</TableCell><TableCell align="right">Registros</TableCell><TableCell align="right">Llamadas</TableCell><TableCell>Problema</TableCell></TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((l) => (
                                    <TableRow key={l.id}>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{dateTime(l.started_at)}</TableCell>
                                        <TableCell>{SYNC_KIND[l.kind] ?? l.kind}{l.requested_by ? ` · ${l.requested_by}` : ""}</TableCell>
                                        <TableCell><Chip size="small" color={SYNC_STATUS[l.status].color} label={SYNC_STATUS[l.status].label} /></TableCell>
                                        <TableCell align="right">{l.records}</TableCell>
                                        <TableCell align="right">{l.calls}</TableCell>
                                        <TableCell sx={{ minWidth: 200 }}>
                                            {l.error_label && <Typography variant="body2">{l.error_label}: {l.error}</Typography>}
                                            {(l.details?.errors ?? []).filter((e) => e.account !== null).slice(0, 3).map((e, i) => (
                                                <Typography key={i} variant="caption" display="block" color="text.secondary">{e.message}</Typography>
                                            ))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
        </Dialog>
    );
};

const AccountRow: React.FC<{ account: MetaAccount; onToggle: (a: MetaAccount, active: boolean) => void; busy: boolean }> = ({ account, onToggle, busy }) => (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 1 }}>
        <Switch
            checked={account.is_active} disabled={busy}
            onChange={(e) => onToggle(account, e.target.checked)}
            inputProps={{ "aria-label": `Sincronizar ${account.name ?? account.meta_id}` }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight="bold" noWrap>{account.name ?? "Sin nombre"}</Typography>
            <Typography variant="caption" color="text.secondary" component="div">
                act_{account.meta_id} · {account.currency ?? "—"} · {account.timezone_name ?? "—"} · Meta: {ACCOUNT_STATUS[account.account_status ?? 0] ?? "—"}
            </Typography>
            {account.is_active && (
                <Typography variant="caption" color="text.secondary" component="div">
                    {account.last_synced_at ? `Sincronizada ${dateTime(account.last_synced_at)}` : "Importando…"}
                    {account.history_from ? ` · histórico desde ${shortDay(account.history_from)}` : ""}
                </Typography>
            )}
            {account.last_error && <Typography variant="caption" color="error" component="div">{account.last_error_label}: {account.last_error}</Typography>}
        </Box>
    </Stack>
);

const ConnectionCard: React.FC<{ c: MetaConnection; onEdit: () => void; onLogs: () => void; onChanged: () => void }> = ({ c, onEdit, onLogs, onChanged }) => {
    const [busy, setBusy] = useState(false);

    const run = async (fn: () => Promise<unknown>, ok?: string) => {
        setBusy(true);
        try {
            await fn();
            if (ok) toast.success(ok);
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setBusy(false);
            onChanged();
        }
    };

    const toggle = (a: MetaAccount, active: boolean) =>
        run(() => api(`/meta/ad-accounts/${a.id}`, "PUT", { is_active: active }),
            active ? `«${a.name}» activada: se importan sus últimos 30 días` : `«${a.name}» ya no se sincroniza (no se borra nada)`);

    const status = c.status === "error"
        ? { dot: "🔴", label: "Error", color: "error" as const }
        : c.status === "ok" ? { dot: "🟢", label: "Conectado", color: "success" as const } : { dot: "⚪", label: "Sin sincronizar", color: "default" as const };

    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: c.status === "error" ? "error.main" : "divider", p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="h6" component="h3" fontWeight="bold">{c.name}</Typography>
                        <Chip size="small" color={status.color} label={`${status.dot} ${status.label}`} />
                        {c.syncing && <Chip size="small" icon={<SyncRounded />} label="Sincronizando…" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Última sincronización correcta: {dateTime(c.last_success_at)} · Cuentas: {c.active_accounts} de {c.accounts.length}
                        {c.business_id ? ` · Business ID ${c.business_id}` : ""}
                    </Typography>
                    {c.meta_user_name && <Typography variant="caption" color="text.secondary">Token de «{c.meta_user_name}» · permisos: {(c.scopes ?? []).join(", ") || "—"}</Typography>}
                </Box>
                <Stack direction="row" spacing={0.5}>
                    <Button size="small" variant="contained" startIcon={<SyncRounded />} disabled={busy || c.syncing}
                        onClick={() => run(() => api(`/meta/connections/${c.id}/sync`, "POST"), "Sincronización en marcha")}>
                        Sincronizar ahora
                    </Button>
                    <Tooltip title="Volver a pedir a Meta la lista de cuentas"><span><IconButton aria-label="Actualizar cuentas" disabled={busy} onClick={() => run(() => api(`/meta/connections/${c.id}/accounts/refresh`, "POST"), "Cuentas actualizadas")}><RefreshRounded /></IconButton></span></Tooltip>
                    <Tooltip title="Sincronizaciones"><IconButton aria-label="Sincronizaciones" onClick={onLogs}><HistoryRounded /></IconButton></Tooltip>
                    <Tooltip title="Editar"><IconButton aria-label="Editar conexión" onClick={onEdit}><EditRounded /></IconButton></Tooltip>
                </Stack>
            </Stack>

            {c.last_error && (
                <Alert severity={c.status === "error" ? "error" : "warning"} sx={{ mt: 1.5 }}
                    action={c.last_error_kind === "token" ? <Button color="inherit" size="small" onClick={onEdit}>Revisar conexión</Button> : undefined}>
                    <b>Problema: {c.last_error_label}</b> · {c.last_error} <Typography component="span" variant="caption">({dateTime(c.last_error_at)})</Typography>
                </Alert>
            )}
            {c.extra_scopes.length > 0 && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                    El token también tiene {c.extra_scopes.join(", ")}. El sistema solo lee; para esta integración alcanza con ads_read.
                </Alert>
            )}

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" fontWeight="bold">Cuentas publicitarias</Typography>
            <Typography variant="caption" color="text.secondary">Activa = se sincroniza. Desactivar no borra nada ni toca la cuenta en Meta.</Typography>
            {c.accounts.length === 0 && <Typography sx={{ py: 1 }}>Meta no devolvió cuentas para esta conexión.</Typography>}
            {c.accounts.map((a) => <AccountRow key={a.id} account={a} onToggle={toggle} busy={busy} />)}
            {c.other_accounts.map((a) => (
                <Typography key={a.meta_id} variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                    «{a.name}» (act_{a.meta_id}) se sincroniza con «{a.synced_by}».
                </Typography>
            ))}
        </Paper>
    );
};

export const MetaConnections: React.FC = () => {
    const [connections, setConnections] = useState<MetaConnection[] | null>(null);
    const [dialog, setDialog] = useState<{ open: boolean; editing: MetaConnection | null }>({ open: false, editing: null });
    const [logsOf, setLogsOf] = useState<MetaConnection | null>(null);

    const load = useCallback(async () => {
        try {
            const r = await api<{ connections: MetaConnection[] }>("/meta/connections");
            setConnections(r.connections);
        } catch (e) {
            toast.error((e as Error).message);
            setConnections((c) => c ?? []);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Mientras alguna conexión sincroniza o importa, se refresca sola
    const busy = connections?.some((c) => c.syncing || c.accounts.some((a) => a.is_active && !a.last_synced_at));
    useEffect(() => {
        if (!busy) return;
        const t = setInterval(load, 5000);
        return () => clearInterval(t);
    }, [busy, load]);

    if (connections === null) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;

    return (
        <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                    Cada conexión es un Business Manager o un System User de Meta. Se sincroniza sola cada 30 minutos; nunca modifica nada en Meta.
                </Typography>
                <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ open: true, editing: null })}>Agregar conexión</Button>
            </Stack>
            {connections.length === 0 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px dashed", borderColor: "divider", p: 3, textAlign: "center" }}>
                    <Typography>Todavía no hay conexiones. Agrega la primera con el token del System User de un BM.</Typography>
                </Paper>
            )}
            {connections.map((c) => (
                <ConnectionCard key={c.id} c={c} onEdit={() => setDialog({ open: true, editing: c })} onLogs={() => setLogsOf(c)} onChanged={load} />
            ))}
            <ConnectionDialog open={dialog.open} editing={dialog.editing} onClose={() => setDialog({ open: false, editing: null })}
                onSaved={() => { setDialog({ open: false, editing: null }); load(); }} />
            <LogsDialog connection={logsOf} onClose={() => setLogsOf(null)} />
        </Stack>
    );
};
