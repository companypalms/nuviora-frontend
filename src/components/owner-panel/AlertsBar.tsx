// src/components/owner-panel/AlertsBar.tsx
// Las alertas arriba del panel del dueño (diccionario §6): el sistema avisa solo, en amarillo o rojo, con los límites que
// puso el dueño en "Metas y límites". No dependen de los filtros. Tocar una alerta lleva a la sección (y a los días) donde
// está el problema; tocar a una persona, a su detalle.
import React, { FC } from "react";
import { Alert, AlertTitle, Box, Button, Chip, Stack, Typography } from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Explain } from "./Explain";
import { AlertItem, AlertsResponse, PanelAlert } from "./ownerPanel";

export const AlertsBar: FC<{
    data: AlertsResponse | null;
    onGo: (alert: PanelAlert, item?: AlertItem) => void;
    onSetup: () => void;
}> = ({ data, onGo, onSetup }) => {
    if (!data) return null;

    if (!data.configured) {
        return (
            <Alert severity="info" variant="outlined" action={<Button size="small" onClick={onSetup} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>Poner metas</Button>}>
                Pon tus metas y los límites de las alertas, y el panel te avisará aquí, en amarillo o rojo, cuando algo se salga.
            </Alert>
        );
    }

    if (data.alerts.length === 0) {
        return (
            <Stack direction="row" alignItems="center" gap={0.75} sx={{ color: "success.main" }}>
                <CheckCircleOutlineRoundedIcon fontSize="small" />
                <Typography variant="body2" fontWeight={700}>Todo en orden: ninguna alerta</Typography>
                <Typography variant="caption" color="text.secondary">(revisado a las {data.updated_at})</Typography>
            </Stack>
        );
    }

    return (
        <Stack spacing={1}>
            {data.alerts.map((a) => {
                const named = a.items.filter((i) => i.name);
                return (
                    <Alert key={a.type} severity={a.level === "red" ? "error" : "warning"} variant="standard"
                        action={<Button color="inherit" size="small" onClick={() => onGo(a)} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>Ver</Button>}
                        sx={{ "& .MuiAlert-message": { minWidth: 0, flex: 1 }, "& .MuiAlert-icon": { display: { xs: "none", sm: "flex" } }, px: { xs: 1.5, sm: 2 } }}>
                        <AlertTitle sx={{ mb: named.length ? 0.75 : 0.25, display: "flex", alignItems: "center", gap: 0.5 }}>
                            <b>{a.title}</b>
                            <Explain title={a.title} help={a.help}>
                                <InfoOutlinedIcon sx={{ fontSize: 16, opacity: 0.7, cursor: "help" }} tabIndex={0} />
                            </Explain>
                        </AlertTitle>
                        {named.length > 0 ? (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                                {named.map((i) => (
                                    <Chip key={`${i.id}-${i.name}`} size="small" clickable onClick={() => onGo(a, i)}
                                        color={i.level === "red" ? "error" : "warning"} variant={i.level === "red" ? "filled" : "outlined"}
                                        label={<><b>{i.name}</b> · {i.text}</>} sx={{ maxWidth: "100%", height: "auto", py: 0.25, "& .MuiChip-label": { whiteSpace: "normal" } }} />
                                ))}
                            </Box>
                        ) : (
                            a.items.map((i, k) => <Typography key={k} variant="body2">{i.text}</Typography>)
                        )}
                    </Alert>
                );
            })}
            <Typography variant="caption" color="text.secondary">Revisado a las {data.updated_at}. Los límites se cambian en «Metas y límites».</Typography>
        </Stack>
    );
};
