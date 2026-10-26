import DocumentScannerRounded from "@mui/icons-material/DocumentScannerRounded";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, useTheme } from "@mui/material";
import { FC, useState } from "react";
import { useUserStore } from "../../../store/user/UserStore";

interface Props {
    text: string;
    title?: string;
}

export const TextDialog: FC<Props> = ({ text, title = 'Observaciones de la estadistica' }) => {
    const [open, setOpen] = useState<boolean>(false);
    const user = useUserStore(state => state.user);
    const theme = useTheme();
    const toggleOpen = () => {
        setOpen(!open);
    }
    return (
        <>
            <IconButton onClick={toggleOpen}>
                <DocumentScannerRounded />
            </IconButton>

            <Dialog open={open} onClose={() => setOpen(false)} scroll='paper' sx={{ minWidth: 300 }}>
                <DialogTitle id="scroll-dialog-title">{title}</DialogTitle>
                <DialogContent dividers sx={{ p: 5 }}>
                    <DialogContentText>{text}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={toggleOpen} sx={{ color: theme.palette.mode === 'dark' ? user.lighten : user.darken }}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
