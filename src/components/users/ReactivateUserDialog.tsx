// Ventana "Reactivar" (paso 6): vuelve a entrar con su misma contraseña y a recibir trabajo.
import { FC, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { HowToRegRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { AccountSummary, reactivateUser, shortDate } from "./accounts";

type Props = {
    open: boolean;
    user: { id: number; name: string; deactivated_at?: string | null; deactivation_reason?: string | null } | null;
    onClose: () => void;
    onDone: (user: AccountSummary) => void;
};

export const ReactivateUserDialog: FC<Props> = ({ open, user, onClose, onDone }) => {
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!user) return;
        setSaving(true);
        const res = await reactivateUser(user.id);
        setSaving(false);
        if (!res.ok || !res.data) {
            toast.error(res.message);
            return;
        }
        toast.success(res.message);
        onDone(res.data);
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <HowToRegRounded color="success" /> Reactivar a {user?.name}
                </Box>
            </DialogTitle>
            <DialogContent>
                {user?.deactivated_at && (
                    <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                        Cuenta desactivada el {shortDate(user.deactivated_at)}{user.deactivation_reason ? `: ${user.deactivation_reason}` : ""}
                    </Alert>
                )}
                <Typography variant="body2">
                    Vuelve a entrar con su misma contraseña y a recibir trabajo. Al abrir la jornada vuelve a su roster de siempre.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={submit}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <HowToRegRounded />}
                >
                    Reactivar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
