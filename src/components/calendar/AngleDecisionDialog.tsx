// src/components/calendar/AngleDecisionDialog.tsx
// .116 (dueño: "me gustaría que me lo propusiera a mí solamente, en mi calendario… y yo veo si le digo que hagamos ese ángulo,
// otro que yo recomiende, o uno de los que ya está"): se abre desde la tarea "Decide el ángulo nuevo". Lo que se elija es el
// ángulo del siguiente encargo del líder; mientras no se decida, no se piden batches nuevos de ese producto.
import React, { FC, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import { Theme } from "@mui/material/styles";
import { toast } from "react-toastify";
import { cardSx, geist, inkSx, lineSx, useTokens } from "../ui/design";
import { AngleChoice, AngleProposal, decideAngle, fetchAngleProposal, notifyAngleDecided, notifyCalendarChanged } from "./calendar";

type Props = { id: number; onClose: () => void };

export const AngleDecisionDialog: FC<Props> = ({ id, onClose }) => {
    const t = useTokens();
    const phone = useMediaQuery((th: Theme) => th.breakpoints.down("sm"));
    const [data, setData] = useState<AngleProposal | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [choice, setChoice] = useState<AngleChoice | null>(null);
    const [name, setName] = useState("");
    const [about, setAbout] = useState("");
    const [code, setCode] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAngleProposal(id).then((d) => { setData(d); setChoice(d.name ? "accepted" : "other"); }).catch((e: Error) => setError(e.message));
    }, [id]);

    const save = async () => {
        if (!choice) return;
        setSaving(true);
        setErrors({});
        try {
            toast.success((await decideAngle(id, { choice, name: choice === "other" ? name : null, about: choice === "other" ? about : null, code: choice === "existing" ? code : null })).message);
            notifyAngleDecided();
            notifyCalendarChanged();
            onClose();
        } catch (e) {
            const err = e as Error & { errors?: Record<string, string[]> };
            if (err.errors) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
            toast.error(err.message);
        } finally { setSaving(false); }
    };

    const option = (value: AngleChoice, title: string, body?: React.ReactNode) => (
        <Box component="label" key={value} sx={{ ...cardSx(t), display: "block", p: "12px 14px", cursor: "pointer", borderColor: choice === value ? t.ink : t.line, "&:focus-within": { outline: `2px solid ${t.ink}` } }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minHeight: 28 }}>
                <input type="radio" name="angulo" checked={choice === value} onChange={() => setChoice(value)} style={{ width: 18, height: 18, accentColor: t.ink, margin: 0, flex: "none" }} />
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{title}</Typography>
            </Stack>
            {body && <Box sx={{ mt: 1, ml: "30px" }}>{body}</Box>}
        </Box>
    );

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={phone} PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ fontSize: 18, fontWeight: 600, overflowWrap: "anywhere" }}>{data ? `Ángulo nuevo de ${data.product}` : "Ángulo nuevo"}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error">{error}</Alert>}
                {!data && !error && <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress size={24} aria-label="Cargando" /></Box>}
                {data && (
                    <Stack spacing={1.25}>
                        <Typography sx={{ fontSize: 14, color: t.muted }}>A este producto ya no le quedan ángulos disponibles. Mientras no decidas, no se piden batches nuevos de él.</Typography>
                        {data.name && option("accepted", `Hacer este: ${data.name}`, (
                            <>
                                {data.about && <Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>{data.about}</Typography>}
                                {data.why && <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.5, overflowWrap: "anywhere" }}>Por qué: {data.why}</Typography>}
                            </>
                        ))}
                        {option("other", "Otro que yo recomiendo", choice === "other" && (
                            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                                <TextField label="¿Cuál es?" placeholder="Dolor de espalda en la oficina" value={name} onChange={(e) => setName(e.target.value)} error={!!errors.name} helperText={errors.name || " "} fullWidth autoFocus inputProps={{ maxLength: 120 }} />
                                <TextField label="¿De qué trata? (si quieres)" value={about} onChange={(e) => setAbout(e.target.value)} multiline minRows={2} fullWidth inputProps={{ maxLength: 1000 }} />
                            </Stack>
                        ))}
                        {data.angles.length > 0 && option("existing", "Uno de los que ya están", choice === "existing" && (
                            <TextField select label="Ángulo" value={code} onChange={(e) => setCode(e.target.value)} error={!!errors.code} helperText={errors.code || "Si está en descanso, su cuenta empieza de cero."} fullWidth sx={{ mt: 1.5 }}>
                                {data.angles.map((a) => <MenuItem key={a.code} value={a.code}>{a.code}{a.name ? ` · ${a.name}` : ""}{a.note ? ` (${a.note})` : ""}</MenuItem>)}
                            </TextField>
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button variant="outlined" onClick={onClose} sx={{ ...lineSx(t), minHeight: { xs: 48, sm: 40 } }}>Ahora no</Button>
                <Button variant="contained" disableElevation onClick={save} disabled={!data || saving} sx={{ ...inkSx(t), minHeight: { xs: 48, sm: 40 } }}>Guardar decisión</Button>
            </DialogActions>
        </Dialog>
    );
};
