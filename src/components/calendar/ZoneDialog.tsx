// src/components/calendar/ZoneDialog.tsx
// .108 "Tu hora" (dueño, 2026-11-06: "yo estoy en Portugal… mi horario del calendario debe ser en horario portugués (sería
// bueno que yo lo pueda seleccionar, ya que mi pc también la tengo en horario de Venezuela). Pero todo el sistema debe seguir
// en horario de Venezuela"): elegir la zona de las horas del calendario. Se guarda en el sistema (no en la computadora).
// Los días siguen siendo los del negocio: cambian a medianoche de Venezuela (lo eligió el dueño).
import React, { FC, useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery } from "@mui/material";
import { Theme } from "@mui/material/styles";
import { toast } from "react-toastify";
import { geist, inkSx, useTokens } from "../ui/design";
import { CalendarZone, fetchCalendarSettings, saveTimezone } from "./calendar";
import { ChoiceButton } from "./PlanMenu";
import { hourIn } from "./timer";

export const ZoneDialog: FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({ open, onClose, onSaved }) => {
    const t = useTokens();
    const phone = useMediaQuery((th: Theme) => th.breakpoints.down("sm"));
    const [zones, setZones] = useState<CalendarZone[] | null>(null);
    const [pick, setPick] = useState<string>("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        fetchCalendarSettings().then((r) => { if (alive) { setZones(r.timezone.zones); setPick(r.timezone.key); } }).catch((e) => toast.error(e.message));
        return () => { alive = false; };
    }, [open]);

    const save = async () => {
        setSaving(true);
        try { toast.success((await saveTimezone(pick)).message); onSaved(); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={phone} PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>Tu hora</DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: 14, color: t.muted, mb: 2 }}>
                    Las horas de tu calendario (tus notas, "ya es la hora", lo que se tildó y a qué hora) se ven en la zona que elijas. El resto del sistema
                    sigue en hora de Venezuela, y los días también: cambian a medianoche de Venezuela.
                </Typography>
                {!zones ? <Typography sx={{ fontSize: 14, color: t.muted }}>Cargando…</Typography> : (
                    <Stack spacing={1} role="radiogroup" aria-label="Zona horaria">
                        {zones.map((z) => (
                            <Box key={z.key} sx={{ "& .MuiButtonBase-root": { width: "100%", justifyContent: "space-between", minHeight: 48 } }}>
                                <ChoiceButton on={pick === z.key} onClick={() => setPick(z.key)} label={`${z.label}: ahora son las ${hourIn(Date.now(), z.key)}`}>
                                    <span>{z.label}</span><span style={{ opacity: 0.75 }}>ahora {hourIn(Date.now(), z.key)}</span>
                                </ChoiceButton>
                            </Box>
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ color: t.ink }}>Cancelar</Button>
                <Button variant="contained" disableElevation onClick={save} disabled={saving || !pick} sx={{ ...inkSx(t), minHeight: { xs: 48, sm: 40 } }}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};
