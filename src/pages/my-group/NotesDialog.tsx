// src/pages/my-group/NotesDialog.tsx
// Notas privadas de la Líder sobre una vendedora (spec §13). La Líder las escribe desde "Mi grupo";
// el administrador solo las lee desde "Grupos de venta". Las vendedoras nunca las ven.
import React, { useEffect, useState } from "react";
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { assignmentApi } from "../round-robin/assignmentApi";

interface Note {
    id: number;
    seller_id: number;
    body: string;
    author: string;
    group: string | null;
    created_at: string;
}

interface Props {
    seller: { id: number; name: string } | null;
    /** "leader": lee y escribe las de su grupo. "admin": lee las de todos los grupos. */
    mode: "leader" | "admin";
    onClose: () => void;
}

const when = (iso: string) => new Date(iso).toLocaleString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const NotesDialog: React.FC<Props> = ({ seller, mode, onClose }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!seller) return;
        setText("");
        setLoading(true);
        const url = mode === "leader" ? `/my-group/notes?seller_id=${seller.id}` : `/sales-groups/notes?seller_id=${seller.id}`;
        assignmentApi<Note[]>(url).then((res) => {
            setLoading(false);
            if (res.ok && res.data) setNotes(res.data);
            else toast.error(res.message);
        });
    }, [seller, mode]);

    const save = async () => {
        if (!seller) return;
        setSaving(true);
        const res = await assignmentApi<Note>("/my-group/notes", "POST", { seller_id: seller.id, body: text.trim() });
        setSaving(false);
        if (res.ok && res.data) {
            setNotes([res.data, ...notes]);
            setText("");
            toast.success("Nota guardada");
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={!!seller} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Notas sobre {seller?.name}</DialogTitle>
            <DialogContent>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    {mode === "leader"
                        ? "Solo las ven tú y el administrador. Quedan con tu nombre y la fecha, y no se pueden borrar."
                        : "Notas privadas de las Líderes. La vendedora no las ve."}
                </Typography>
                {mode === "leader" && (
                    <Box display="flex" gap={1} alignItems="flex-start" mb={2}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            size="small"
                            label="Nueva nota"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            slotProps={{ htmlInput: { maxLength: 2000 } }}
                            autoFocus
                        />
                        <Button variant="contained" onClick={save} disabled={text.trim() === "" || saving} startIcon={saving ? <CircularProgress size={14} /> : undefined}>
                            Guardar
                        </Button>
                    </Box>
                )}
                {loading ? (
                    <Box display="flex" justifyContent="center" py={2}><CircularProgress size={22} /></Box>
                ) : notes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">Todavía no hay notas.</Typography>
                ) : (
                    notes.map((n, i) => (
                        <Box key={n.id}>
                            {i > 0 && <Divider sx={{ my: 1.25 }} />}
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{n.body}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {n.author} · {when(n.created_at)}{mode === "admin" && n.group ? ` · ${n.group}` : ""}
                            </Typography>
                        </Box>
                    ))
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};
