// src/components/finance/LotCostDialog.tsx
// Poner el costo de un lote (Módulo 4 de Fran, entrega 2e; R5): el de un lote que entró sin costo de compra (ingreso
// sin compra, lote inicial o corrección de conteo; mientras tanto tiene el costo de la última compra de su producto). Pide de dónde sale el costo: queda en el
// historial (§82). Las órdenes que vendieron unidades de ese lote se recalculan solas.
import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { COST_SOURCE, InventoryLotRow, api, errorMessage, money, num } from "./finance";

type Props = { lot: InventoryLotRow | null; onClose: () => void; onSaved: () => void };

export const LotCostDialog: React.FC<Props> = (props) => (props.lot ? <LotCostForm key={props.lot.id} {...props} lot={props.lot} /> : null);

const LotCostForm: React.FC<Props & { lot: InventoryLotRow }> = ({ lot, onClose, onSaved }) => {
    const [cost, setCost] = useState(lot.unit_cost !== null ? String(lot.unit_cost) : "");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const ok = num(cost) > 0 && reason.trim() !== "";

    const save = async () => {
        setSaving(true);
        try {
            toast.success((await api<{ message: string }>(`/finance/lots/${lot.id}/cost`, "PUT", { unit_cost_usd: num(cost), reason: reason.trim() })).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Costo del lote</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <div>
                        <Typography variant="subtitle2">{lot.product}{lot.variant ? ` (${lot.variant})` : ""}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {lot.kind_label} del {lot.received_at.slice(8, 10)}/{lot.received_at.slice(5, 7)} · {lot.initial} unidades, quedan {lot.remaining}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Costo actual: {lot.unit_cost === null ? "sin costo" : `${money(lot.unit_cost)} (${COST_SOURCE[lot.cost_source ?? ""] ?? "provisional"})`}
                        </Typography>
                        {lot.origin && <Typography variant="caption" color="text.secondary" display="block">Entró con: {lot.origin}{lot.user ? ` · ${lot.user}` : ""}</Typography>}
                    </div>
                    <TextField label="Costo por unidad" value={cost} onChange={(e) => setCost(e.target.value)} required autoFocus
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} inputProps={{ inputMode: "decimal" }} sx={{ maxWidth: 220 }} />
                    <TextField label="¿De dónde sale?" value={reason} onChange={(e) => setReason(e.target.value)} required inputProps={{ maxLength: 500 }}
                        placeholder="Factura del proveedor del 10/10…" helperText="Queda en el historial del lote." />
                    <Typography variant="caption" color="text.secondary">Las órdenes que ya vendieron unidades de este lote se recalculan solas en un minuto.</Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ok}>Guardar costo</Button>
            </DialogActions>
        </Dialog>
    );
};
