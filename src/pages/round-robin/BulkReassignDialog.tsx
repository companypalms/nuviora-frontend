// src/pages/round-robin/BulkReassignDialog.tsx
// Fase 4 (tarea 8): pasar las órdenes de una vendedora a otra, al resto de su grupo o a varias.
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert, Autocomplete, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, FormControlLabel, FormGroup, Radio, RadioGroup, TextField, Typography,
} from "@mui/material";
import { SwapHorizRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { assignmentApi } from "./assignmentApi";
import { ReassignPreview, SellerRef } from "../../interfaces/assignment.types";

type Mode = "group" | "one" | "many";

interface Props {
    open: boolean;
    sellers: SellerRef[];
    onClose: () => void;
    onDone: () => void;
    /** "/assignment" para el Admin y la Gerente; "/my-group" para la Líder (el servidor limita a su grupo). */
    apiBase?: string;
    /** Quién no puede recibir órdenes (la Líder no se asigna a sí misma, spec §5.1). */
    excludeTargetIds?: number[];
}

export const BulkReassignDialog: React.FC<Props> = ({ open, sellers, onClose, onDone, apiBase = "/assignment", excludeTargetIds = [] }) => {
    const [from, setFrom] = useState<SellerRef | null>(null);
    const [preview, setPreview] = useState<ReassignPreview | null>(null);
    const [statusIds, setStatusIds] = useState<number[]>([]);
    const [mode, setMode] = useState<Mode>("group");
    const [targets, setTargets] = useState<SellerRef[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) {
            setFrom(null);
            setPreview(null);
            setTargets([]);
            setMode("group");
        }
    }, [open]);

    useEffect(() => {
        if (!from) {
            setPreview(null);
            return;
        }
        let cancelled = false;
        setLoadingPreview(true);
        assignmentApi<ReassignPreview>(`${apiBase}/reassign/preview?from_agent_id=${from.id}`).then((res) => {
            if (cancelled) return;
            setLoadingPreview(false);
            if (!res.ok || !res.data) {
                toast.error(res.message);
                return;
            }
            setPreview(res.data);
            setStatusIds(res.data.statuses.filter((s) => s.default && s.count > 0).map((s) => s.id));
            setMode(res.data.group_mate_ids.length > 0 ? "group" : "one");
            setTargets([]);
        });
        return () => {
            cancelled = true;
        };
    }, [from, apiBase]);

    const groupMates = useMemo(
        () => sellers.filter((s) => preview?.group_mate_ids.includes(s.id)),
        [sellers, preview]
    );
    const destinations = mode === "group" ? groupMates : targets;
    const selectedCount = (preview?.statuses ?? []).filter((s) => statusIds.includes(s.id)).reduce((a, s) => a + s.count, 0);
    const others = sellers.filter((s) => s.id !== from?.id && !excludeTargetIds.includes(s.id));

    const toggleStatus = (id: number) =>
        setStatusIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

    const submit = async () => {
        if (!from) return;
        setSaving(true);
        const res = await assignmentApi<{ moved: Record<string, number>; total: number; kept_message?: string | null }>(`${apiBase}/reassign`, "POST", {
            from_agent_id: from.id,
            to_agent_ids: destinations.map((d) => d.id),
            status_ids: statusIds,
        });
        setSaving(false);
        if (!res.ok || !res.data) {
            toast.error(res.message);
            return;
        }
        const detail = Object.entries(res.data.moved)
            .filter(([, n]) => n > 0)
            .map(([id, n]) => `${sellers.find((s) => s.id === Number(id))?.name ?? id}: ${n}`)
            .join(" · ");
        toast.success(`${res.message}${detail ? ` (${detail})` : ""}`);
        // Las órdenes de una tienda donde no está ninguna de las elegidas se quedan con la de origen
        if (res.data.kept_message) toast.warning(res.data.kept_message, { autoClose: 10000 });
        onDone();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <SwapHorizRounded color="primary" /> Reasignar órdenes en bloque
                </Box>
            </DialogTitle>
            <DialogContent>
                <Autocomplete
                    options={sellers}
                    value={from}
                    onChange={(_, v) => setFrom(v)}
                    getOptionLabel={(o) => o.name}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderOption={(props, o) => {
                        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: React.Key };
                        return (
                            <li key={key} {...rest}>
                                <Box display="flex" justifyContent="space-between" width="100%" gap={1}>
                                    <span>{o.name}</span>
                                    <Typography variant="caption" color="text.secondary">
                                        {o.group ? `${o.group.name} · ` : ""}{o.active_orders} activas
                                    </Typography>
                                </Box>
                            </li>
                        );
                    }}
                    renderInput={(params) => <TextField {...params} label="Vendedora de origen" sx={{ mt: 1 }} />}
                />

                {loadingPreview && <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>}

                {preview && !loadingPreview && (
                    <>
                        <Typography variant="subtitle2" mt={2}>¿Qué órdenes?</Typography>
                        <FormGroup sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                            {preview.statuses.map((s) => (
                                <FormControlLabel
                                    key={s.id}
                                    control={<Checkbox size="small" checked={statusIds.includes(s.id)} onChange={() => toggleStatus(s.id)} disabled={s.count === 0} />}
                                    label={<Typography variant="body2" color={s.count === 0 ? "text.disabled" : undefined}>{s.description} ({s.count})</Typography>}
                                />
                            ))}
                        </FormGroup>

                        <Typography variant="subtitle2" mt={2}>¿A quién?</Typography>
                        <RadioGroup value={mode} onChange={(e) => { setMode(e.target.value as Mode); setTargets([]); }}>
                            <FormControlLabel
                                value="group"
                                disabled={groupMates.length === 0}
                                control={<Radio size="small" />}
                                label={groupMates.length > 0 ? `Al resto de su grupo (${groupMates.map((g) => g.name.split(" ")[0]).join(", ")})` : "Al resto de su grupo (no tiene grupo o está sola)"}
                            />
                            <FormControlLabel value="one" control={<Radio size="small" />} label="A una vendedora" />
                            <FormControlLabel value="many" control={<Radio size="small" />} label="A varias vendedoras" />
                        </RadioGroup>

                        {mode === "one" && (
                            <Autocomplete
                                options={others}
                                value={targets[0] ?? null}
                                onChange={(_, v) => setTargets(v ? [v] : [])}
                                getOptionLabel={(o) => o.name}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                renderInput={(params) => <TextField {...params} label="Vendedora de destino" size="small" />}
                            />
                        )}
                        {mode === "many" && (
                            <Autocomplete
                                multiple
                                options={others}
                                value={targets}
                                onChange={(_, v) => setTargets(v)}
                                getOptionLabel={(o) => o.name}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                renderInput={(params) => <TextField {...params} label="Vendedoras de destino" size="small" />}
                            />
                        )}

                        <Alert severity="info" sx={{ mt: 2 }}>
                            Se reparten con los mismos % del reparto automático, y cada orden solo va a vendedoras de su tienda. Cada orden conserva su estado y el cambio queda en su historial.
                        </Alert>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={submit}
                    disabled={!from || !preview || selectedCount === 0 || destinations.length === 0 || saving}
                    startIcon={saving ? <CircularProgress size={14} /> : <SwapHorizRounded />}
                >
                    {selectedCount === 1 ? "Reasignar 1 orden" : `Reasignar ${selectedCount} órdenes`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
