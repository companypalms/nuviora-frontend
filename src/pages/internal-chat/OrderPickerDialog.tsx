// Iniciar un chat: buscar una de mis órdenes (o de mi grupo, para la Líder) y abrir su hilo.
import { FC, useEffect, useState } from "react";
import {
    Avatar, Box, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, List, ListItemButton,
    ListItemText, TextField, Typography,
} from "@mui/material";
import { CloseRounded, ReceiptLongRounded, SearchRounded } from "@mui/icons-material";
import { request } from "../../common/request";
import { ChatParty } from "../../components/internal-chat/chat/types";

interface OrderResult {
    order_id: number;
    order_name: string;
    client: string | null;
    counterpart: ChatParty | null;
    conversation_id: number | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    /** Parámetros de la vista de la Líder (scope/seller_id), o "". */
    viewQuery: string;
    onPick: (orderId: number) => void;
}

export const OrderPickerDialog: FC<Props> = ({ open, onClose, viewQuery, onPick }) => {
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<OrderResult[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (open) {
            setTerm("");
            setResults([]);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        setSearching(true);
        const t = setTimeout(async () => {
            const { ok, response } = await request(`/internal-chat/orders/search?q=${encodeURIComponent(term)}${viewQuery ? `&${viewQuery}` : ""}`, "GET");
            setSearching(false);
            if (ok) setResults(await response.json());
        }, 300);
        return () => clearTimeout(t);
    }, [term, open, viewQuery]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
                <Box sx={{ flex: 1 }}>Iniciar chat por una orden</Box>
                <IconButton onClick={onClose} aria-label="Cerrar"><CloseRounded /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    placeholder="Número de orden, cliente o teléfono…"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }}
                    sx={{ mb: 1 }}
                />
                {searching ? (
                    <Box sx={{ textAlign: "center", py: 3 }}><CircularProgress size={24} /></Box>
                ) : results.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No se encontraron órdenes asignadas.</Typography>
                ) : (
                    <List>
                        {results.map((o) => (
                            <ListItemButton key={o.order_id} onClick={() => { onClose(); onPick(o.order_id); }} sx={{ borderRadius: 1.5 }}>
                                <Avatar sx={{ bgcolor: "primary.main", mr: 1.5 }}><ReceiptLongRounded /></Avatar>
                                <ListItemText primary={`Orden ${o.order_name} · ${o.counterpart?.name ?? "(sin agencia)"}`} secondary={o.client ?? undefined} />
                                {o.conversation_id && <Chip size="small" color="success" label="Chat activo" />}
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
};
