// Ventana "Desactivar" (paso 6): lo que tiene pendiente, con botones para pasarlo a otros, y el motivo.
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField,
    Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { PersonOffRounded, SwapHorizRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { BulkReassignDialog } from "../../pages/round-robin/BulkReassignDialog";
import { assignmentApi } from "../../pages/round-robin/assignmentApi";
import { AssignmentOverview, SellerRef } from "../../interfaces/assignment.types";
import { AgencyReassignDialog } from "../agencies/AgencyReassignDialog";
import { AccountSummary, DeactivationInfo, deactivateUser, fetchDeactivation, shortDate } from "./accounts";

type Props = {
    open: boolean;
    user: { id: number; name: string } | null;
    onClose: () => void;
    onDone: (user: AccountSummary) => void;
};

export const DeactivateUserDialog: FC<Props> = ({ open, user, onClose, onDone }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const [info, setInfo] = useState<DeactivationInfo | null>(null);
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [sellers, setSellers] = useState<SellerRef[]>([]);
    const [reassign, setReassign] = useState<"seller" | "agency" | null>(null);

    const userId = user?.id;
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    // Solo depende de la persona: si la página de atrás se vuelve a dibujar, no se pierde lo escrito
    const load = useCallback(async () => {
        if (!userId) return;
        const res = await fetchDeactivation(userId);
        if (res.ok && res.data) {
            setInfo(res.data);
        } else {
            toast.error(res.message);
            closeRef.current();
        }
    }, [userId]);

    useEffect(() => {
        if (!open) return;
        setInfo(null);
        setReason("");
        setReassign(null);
        load();
    }, [open, load]);

    const openReassign = async (action: string | undefined) => {
        if (action === "reassign_agency") {
            setReassign("agency");
            return;
        }
        const res = await assignmentApi<AssignmentOverview>("/assignment/overview");
        if (!res.ok || !res.data) {
            toast.error(res.message);
            return;
        }
        setSellers(res.data.sellers);
        setReassign("seller");
    };

    const afterReassign = () => {
        setReassign(null);
        setInfo(null);
        load(); // lo pendiente cambió
    };

    const submit = async () => {
        if (!user) return;
        setSaving(true);
        const res = await deactivateUser(user.id, reason.trim());
        setSaving(false);
        if (!res.ok || !res.data) {
            toast.error(res.message);
            return;
        }
        toast.success(res.message);
        onDone(res.data);
    };

    // El mismo objeto mientras no cambie la persona (la ventana de agencias vuelve a cargar si cambia)
    const userName = user?.name ?? "";
    const agency = useMemo(() => (userId ? { id: userId, names: userName } : null), [userId, userName]);
    const min = info?.reason_min ?? 5;
    const ready = info && !info.problem && reason.trim().length >= min;
    const previous = info?.history ?? [];

    return (
        <>
            <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <PersonOffRounded color="error" /> Desactivar a {user?.name}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {!info ? (
                        <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={28} /></Stack>
                    ) : info.problem ? (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>{info.problem}</Alert>
                    ) : (
                        <Stack spacing={1.5}>
                            <Typography variant="body2" color="text.secondary">
                                Ya no podrá entrar ni recibirá trabajo. No se borra nada: lo que hizo sigue en su historial y en las métricas.
                            </Typography>
                            {info.pending.map((line) => (
                                <Alert
                                    key={line.key}
                                    severity={line.tone === "warning" ? "warning" : "info"}
                                    sx={{ borderRadius: 2, alignItems: "center" }}
                                    action={line.action ? (
                                        <Button size="small" color="inherit" startIcon={<SwapHorizRounded />} onClick={() => openReassign(line.action)} sx={{ whiteSpace: "nowrap" }}>
                                            Pasarlas
                                        </Button>
                                    ) : undefined}
                                >
                                    {line.text}
                                </Alert>
                            ))}
                            <TextField
                                label="Motivo"
                                placeholder="Por ejemplo: renunció, cambió de agencia, ya no trabaja con nosotros"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                multiline
                                minRows={2}
                                inputProps={{ maxLength: 300 }}
                                helperText={`Queda en su historial. Mínimo ${min} letras.`}
                                autoFocus={!fullScreen}
                                fullWidth
                            />
                            {previous.length > 0 && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">Antes</Typography>
                                    {previous.map((h, i) => (
                                        <Typography key={i} variant="caption" color="text.secondary" display="block">
                                            {h.label} el {shortDate(h.at)}{h.by ? ` por ${h.by}` : ""}{h.reason ? `: ${h.reason}` : ""}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={saving}>{info?.problem ? "Cerrar" : "Cancelar"}</Button>
                    {!info?.problem && (
                        <Button
                            variant="contained"
                            color="error"
                            onClick={submit}
                            disabled={!ready || saving}
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <PersonOffRounded />}
                        >
                            Desactivar
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {user && (
                <BulkReassignDialog
                    open={reassign === "seller"}
                    sellers={sellers}
                    initialFromId={user.id}
                    onClose={() => setReassign(null)}
                    onDone={afterReassign}
                />
            )}
            <AgencyReassignDialog
                open={reassign === "agency"}
                agency={agency}
                canForce
                onClose={() => setReassign(null)}
                onSaved={afterReassign}
            />
        </>
    );
};
