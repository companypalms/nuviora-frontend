// src/components/assistant/ActionCardView.tsx
// La tarjeta de un cambio que propone el asistente (Etapa 4, paso 5): lo que se va a guardar (con lo de antes si cambia
// algo que ya existía), los avisos y los botones Confirmar y Cancelar. Nada se guarda hasta que el dueño confirma; el
// servidor vuelve a revisar todo en ese momento.
import React, { FC, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useNavigate } from "react-router-dom";
import { ActionCard, ActionStatus, cancelAction, confirmAction } from "./assistant";

const STATUS_COLOR: Record<ActionStatus, "warning" | "success" | "error" | "default"> = {
    proposed: "warning", done: "success", failed: "error", cancelled: "default", expired: "default",
};

export const ActionCardView: FC<{ card: ActionCard; readOnly?: boolean }> = ({ card: initial, readOnly }) => {
    const [card, setCard] = useState(initial);
    const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    useEffect(() => setCard(initial), [initial]);

    const decide = async (what: "confirm" | "cancel") => {
        setBusy(what);
        setError(null);
        try {
            setCard(await (what === "confirm" ? confirmAction(card.id) : cancelAction(card.id)));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(null);
        }
    };

    const open = card.status === "proposed";
    return (
        <Box
            sx={(t) => ({
                border: 1.5, borderRadius: 2, p: { xs: 1.25, sm: 1.5 }, bgcolor: "background.paper",
                borderColor: open ? alpha(t.palette.warning.main, 0.6) : card.status === "done" ? alpha(t.palette.success.main, 0.5) : "divider",
            })}
        >
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={800} sx={{ flex: 1, minWidth: 0 }}>{card.title}</Typography>
                <Chip size="small" color={STATUS_COLOR[card.status]} variant={open ? "outlined" : "filled"} label={card.status_label} sx={{ flexShrink: 0 }} />
            </Stack>

            <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(110px, auto) 1fr" }, columnGap: 1.5, rowGap: { xs: 0, sm: 0.5 } }}>
                {card.lines.map((l) => (
                    <React.Fragment key={l.label}>
                        <Typography component="dt" variant="caption" color="text.secondary" sx={{ pt: { xs: 0.5, sm: 0.25 } }}>{l.label}</Typography>
                        <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: "anywhere" }}>
                            {l.before && (
                                <Box component="span" sx={{ color: "text.disabled", textDecoration: "line-through", mr: 0.75 }}>{l.before}</Box>
                            )}
                            <Box component="span" sx={{ fontWeight: l.before ? 800 : 500 }}>{l.value}</Box>
                        </Typography>
                    </React.Fragment>
                ))}
            </Box>

            {card.warnings.map((w) => (
                <Alert key={w} severity="warning" variant="outlined" sx={{ mt: 1, py: 0 }}>{w}</Alert>
            ))}
            {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
            {card.error && card.status !== "proposed" && <Alert severity={card.status === "failed" ? "error" : "info"} sx={{ mt: 1, py: 0 }}>{card.error}</Alert>}
            {card.result && (
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    <CheckCircleRoundedIcon color="success" fontSize="small" />
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }}>{card.result.text}</Typography>
                    {card.result.link && (
                        <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate(card.result!.link!.to)} sx={{ textTransform: "none" }}>
                            {card.result.link.label}
                        </Button>
                    )}
                </Stack>
            )}

            {open && !readOnly && (
                <Stack direction="row" gap={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                    <Button onClick={() => decide("cancel")} disabled={!!busy} color="inherit" sx={{ textTransform: "none" }}>
                        {busy === "cancel" ? <CircularProgress size={18} /> : "Cancelar"}
                    </Button>
                    <Button variant="contained" onClick={() => decide("confirm")} disabled={!!busy} sx={{ textTransform: "none", minWidth: 110 }}>
                        {busy === "confirm" ? <CircularProgress size={18} color="inherit" /> : "Confirmar"}
                    </Button>
                </Stack>
            )}
            {open && readOnly && (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>Se confirma desde el chat.</Typography>
            )}
            {(card.created || card.decided) && readOnly && (
                <Typography variant="caption" color="text.disabled" component="div" sx={{ mt: 0.5 }}>
                    {[card.created && `Propuesto el ${card.created}`, card.decided && `decidido el ${card.decided}`].filter(Boolean).join(" · ")}
                </Typography>
            )}
        </Box>
    );
};
