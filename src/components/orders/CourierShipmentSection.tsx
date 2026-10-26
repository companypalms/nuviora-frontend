// src/components/orders/CourierShipmentSection.tsx
// Envío por agencia de encomiendas (Fran, audios del 2026-10-12): con el check, el link de Maps de la orden es el de la
// oficina de donde sale la encomienda, y aparte van los datos que pide la empresa: cédula, nombre y teléfono de quien la
// recibe. La vendedora y administración los editan; la agencia los ve, porque es quien lleva el paquete a la oficina.
import React, { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { request } from "../../common/request";

const EDITORS = ["Vendedor", "Gerente", "Admin"];

type CourierOrder = {
    id: number;
    courier_shipment?: boolean | null;
    courier_recipient_name?: string | null;
    courier_recipient_id_number?: string | null;
    courier_recipient_phone?: string | null;
    client?: { first_name?: string | null; last_name?: string | null; phone?: string | null } | null;
};

const defaults = (order: CourierOrder) => ({
    name: order.courier_recipient_name ?? [order.client?.first_name, order.client?.last_name].filter(Boolean).join(" "),
    idNumber: order.courier_recipient_id_number ?? "",
    phone: order.courier_recipient_phone ?? order.client?.phone ?? "",
});

type Props = { order: CourierOrder; user: { role?: { description?: string } | null }; onSaved: (order: unknown) => void; dense?: boolean };

// Al abrir otra orden, o cuando se guardan sus datos, el formulario vuelve a empezar con lo que tiene la orden (sin borrar
// lo que se está escribiendo cuando la orden se actualiza por otra cosa)
export const CourierShipmentSection: React.FC<Props> = (props) => (
    <CourierShipmentForm key={[props.order.id, props.order.courier_shipment, props.order.courier_recipient_name, props.order.courier_recipient_id_number, props.order.courier_recipient_phone].join("|")} {...props} />
);

const CourierShipmentForm: React.FC<Props> = ({ order, user, onSaved, dense }) => {
    const canEdit = EDITORS.includes(user.role?.description ?? "");
    const [checked, setChecked] = useState<boolean>(!!order.courier_shipment);
    const [form, setForm] = useState(defaults(order));
    const [saving, setSaving] = useState(false);

    const save = async (shipment: boolean) => {
        setSaving(true);
        try {
            const body = shipment
                ? { courier_shipment: true, courier_recipient_name: form.name, courier_recipient_id_number: form.idNumber, courier_recipient_phone: form.phone }
                : { courier_shipment: false };
            const { status, response } = await request(`/orders/${order.id}/courier`, "PUT", body);
            const data = await response.json().catch(() => null);
            if (status === 200) {
                toast.success(data?.message ?? "Guardado.");
                onSaved(data.order);
            } else {
                toast.error(data?.message ?? "No se pudieron guardar los datos de la encomienda.");
                if (!shipment) setChecked(true);
            }
        } catch {
            toast.error("No se logró conectar con el servidor.");
        } finally { setSaving(false); }
    };

    if (!canEdit) {
        if (!order.courier_shipment) return null;
        return (
            <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider" }}>
                <Typography variant="caption" color="text.secondary" display="block">Envío por agencia de encomiendas</Typography>
                <Typography variant="body2" fontWeight="bold">{order.courier_recipient_name}</Typography>
                <Typography variant="body2">Cédula: {order.courier_recipient_id_number} · Teléfono: {order.courier_recipient_phone}</Typography>
                <Typography variant="caption" color="text.secondary">El link de ubicación es el de la oficina de donde sale la encomienda.</Typography>
            </Box>
        );
    }

    const complete = form.name.trim() !== "" && form.idNumber.trim() !== "" && form.phone.trim() !== "";
    return (
        <Box>
            <FormControlLabel
                control={<Checkbox checked={checked} disabled={saving} onChange={(e) => {
                    setChecked(e.target.checked);
                    if (!e.target.checked && order.courier_shipment) save(false);
                }} />}
                label="Envío por agencia de encomiendas (MRW, Tealca, Zoom…)"
            />
            {checked && (
                <Stack spacing={1} sx={{ pl: { sm: 4 }, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        En el link de ubicación pega el de Google Maps de la oficina de donde sale la encomienda. Estos son los datos que pide la empresa de encomiendas:
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                        <TextField size={dense ? "small" : "medium"} label="Nombre de quien recibe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth inputProps={{ maxLength: 150 }} />
                        <TextField size={dense ? "small" : "medium"} label="Cédula" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} placeholder="V-12345678" sx={{ minWidth: { sm: 170 } }} inputProps={{ maxLength: 30 }} />
                        <TextField size={dense ? "small" : "medium"} label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} sx={{ minWidth: { sm: 170 } }} inputProps={{ maxLength: 40, inputMode: "tel" }} />
                    </Stack>
                    <Box>
                        <Button variant="contained" size="small" disabled={saving || !complete} onClick={() => save(true)}>Guardar datos de la encomienda</Button>
                    </Box>
                </Stack>
            )}
        </Box>
    );
};
