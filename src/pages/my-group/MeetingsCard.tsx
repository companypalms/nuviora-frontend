// src/pages/my-group/MeetingsCard.tsx
// Grabaciones y archivos de reuniones de la Líder con su equipo (spec §14). La Líder los agrega; el
// administrador los ve (y es el único que puede borrarlos). Las vendedoras no los ven.
import React, { useCallback, useEffect, useState } from "react";
import {
    Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { AddRounded, DeleteOutlineRounded, DownloadRounded, LinkRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { assignmentApi } from "../round-robin/assignmentApi";
import { MyGroupData } from "../../interfaces/assignment.types";

interface Meeting {
    id: number;
    meeting_type: string;
    type_label: string;
    meeting_date: string;
    title: string;
    notes: string | null;
    has_file: boolean;
    file_name: string | null;
    url: string | null;
    sellers: { id: number; name: string }[];
    author: string;
}

const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDay = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const MeetingsCard: React.FC<{ data: MyGroupData }> = ({ data }) => {
    const readOnly = data.read_only;
    const gq = readOnly ? `?group_id=${data.group.id}` : "";
    const sellers = data.members.filter((m) => !m.is_leader).map((m) => ({ id: m.id, name: m.name }));
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [open, setOpen] = useState(false);

    const load = useCallback(async () => {
        const res = await assignmentApi<Meeting[]>(`/my-group/meetings${gq}`);
        if (res.ok && res.data) setMeetings(res.data);
    }, [gq]);

    useEffect(() => {
        load();
    }, [load]);

    const download = async (m: Meeting) => {
        const { ok, response } = await request(`/my-group/meetings/${m.id}/file${gq}`, "GET");
        if (!ok) {
            toast.error("No se pudo descargar el archivo");
            return;
        }
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = m.file_name ?? "reunion";
        a.click();
        URL.revokeObjectURL(url);
    };

    const remove = async (m: Meeting) => {
        if (!confirm(`¿Borrar "${m.title}" y su archivo? No se puede deshacer.`)) return;
        const res = await assignmentApi(`/my-group/meetings/${m.id}`, "DELETE");
        if (res.ok) {
            toast.success("Reunión borrada");
            load();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Reuniones y grabaciones</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Capacitaciones y reuniones uno a uno con tus vendedoras. Solo las ven tú y el administrador.
                    </Typography>
                </Box>
                {!readOnly && (
                    <Button size="small" startIcon={<AddRounded />} onClick={() => setOpen(true)} disabled={sellers.length === 0}>Agregar</Button>
                )}
            </Box>

            {meetings.length === 0 ? (
                <Typography variant="body2" color="text.secondary" fontStyle="italic" mt={1.5}>Todavía no hay reuniones registradas.</Typography>
            ) : (
                <Stack spacing={1.25} mt={1.5}>
                    {meetings.map((m) => (
                        <Box key={m.id} display="flex" gap={1} alignItems="flex-start" justifyContent="space-between" flexWrap="wrap">
                            <Box sx={{ minWidth: 0, flex: "1 1 240px" }}>
                                <Typography variant="body2" fontWeight={600}>{m.title}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {m.type_label} · {fmtDay(m.meeting_date)} · {m.author}
                                </Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={0.5}>
                                    {m.sellers.map((s) => <Chip key={s.id} size="small" variant="outlined" label={s.name} />)}
                                </Stack>
                                {m.notes && <Typography variant="caption" display="block" mt={0.5} sx={{ whiteSpace: "pre-wrap" }}>{m.notes}</Typography>}
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                                {m.has_file && (
                                    <Tooltip title={`Descargar ${m.file_name ?? ""}`}>
                                        <IconButton size="small" onClick={() => download(m)}><DownloadRounded fontSize="small" /></IconButton>
                                    </Tooltip>
                                )}
                                {m.url && (
                                    <Tooltip title="Abrir el enlace">
                                        <IconButton size="small" component="a" href={m.url} target="_blank" rel="noopener noreferrer"><LinkRounded fontSize="small" /></IconButton>
                                    </Tooltip>
                                )}
                                {readOnly && (
                                    <Tooltip title="Borrar (solo el administrador)">
                                        <IconButton size="small" color="error" onClick={() => remove(m)}><DeleteOutlineRounded fontSize="small" /></IconButton>
                                    </Tooltip>
                                )}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            )}

            {!readOnly && <NewMeetingDialog open={open} sellers={sellers} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
        </Paper>
    );
};

const NewMeetingDialog: React.FC<{
    open: boolean;
    sellers: { id: number; name: string }[];
    onClose: () => void;
    onSaved: () => void;
}> = ({ open, sellers, onClose, onSaved }) => {
    const [type, setType] = useState("grupal");
    const [date, setDate] = useState(todayIso());
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [who, setWho] = useState<{ id: number; name: string }[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState("");
    const [consent, setConsent] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setType("grupal");
        setDate(todayIso());
        setTitle("");
        setNotes("");
        setWho([]);
        setFile(null);
        setUrl("");
        setConsent(false);
    }, [open]);

    const tooBig = !!file && file.size > 15 * 1024 * 1024;
    const valid = title.trim() !== "" && who.length > 0 && (file || url.trim() !== "") && consent && !tooBig;

    const save = async () => {
        const form = new FormData();
        form.append("meeting_type", type);
        form.append("meeting_date", date);
        form.append("title", title.trim());
        if (notes.trim()) form.append("notes", notes.trim());
        who.forEach((s) => form.append("seller_ids[]", String(s.id)));
        if (file) form.append("file", file);
        if (url.trim()) form.append("url", url.trim());
        form.append("consent", "1");
        setSaving(true);
        const res = await assignmentApi("/my-group/meetings", "POST", form);
        setSaving(false);
        if (res.ok) {
            toast.success("Reunión guardada");
            onSaved();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Nueva reunión</DialogTitle>
            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField select size="small" label="Tipo" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 200 }}>
                            <MenuItem value="grupal">Capacitación grupal</MenuItem>
                            <MenuItem value="uno_a_uno">Reunión uno a uno</MenuItem>
                        </TextField>
                        <TextField size="small" type="date" label="Fecha" value={date} onChange={(e) => setDate(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }} />
                    </Stack>
                    <TextField size="small" label="Título" value={title} onChange={(e) => setTitle(e.target.value)} slotProps={{ htmlInput: { maxLength: 150 } }} autoFocus />
                    <Autocomplete
                        multiple
                        options={sellers}
                        value={who}
                        onChange={(_, v) => setWho(v)}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={(params) => <TextField {...params} size="small" label="Vendedoras" />}
                    />
                    <TextField size="small" label="Notas (opcional)" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} />
                    <Box>
                        <Button component="label" size="small" variant="outlined">
                            {file ? "Cambiar archivo" : "Adjuntar archivo"}
                            <input hidden type="file" accept="audio/*,video/*,.pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                        </Button>
                        {file && <Typography variant="caption" ml={1} color={tooBig ? "error" : "text.secondary"}>{file.name}{tooBig ? " · pasa de 15 MB: usa un enlace" : ""}</Typography>}
                    </Box>
                    <TextField size="small" label="O un enlace (Drive, etc.)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                    <FormControlLabel
                        control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
                        label={<Typography variant="body2">Las personas de la reunión saben que quedó registrada y están de acuerdo.</Typography>}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={!valid || saving} startIcon={saving ? <CircularProgress size={14} /> : undefined}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};
