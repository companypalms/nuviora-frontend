// src/components/owner-panel/AlertsBar.tsx
// Las alertas arriba del panel del dueño (diccionario §6): el sistema avisa solo, en amarillo o rojo, con los límites que
// puso el dueño en "Metas y límites". No dependen de los filtros. Es una lista compacta (pedido del dueño: que no ocupe
// tanto): una línea por alerta con un punto de color; se ven las 3 primeras y el resto se despliega. Tocar una alerta lleva
// a la sección (y a los días) donde está el problema; tocar a una persona, a su detalle. La ⓘ explica cómo se calcula.
import React, { FC, KeyboardEvent, useState } from "react";
import { Box, Button, ButtonBase, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import { Panel } from "../ui/surface/Panel";
import { Explain } from "./Explain";
import { useGoalColor } from "./goalColor";
import { AlertItem, AlertsResponse, PanelAlert } from "./ownerPanel";

/** Cuántas alertas se ven sin desplegar. */
const VISIBLE = 3;
/** Cuántas personas se nombran en la línea de una alerta (las demás: "+2"). */
const NAMED = 3;

/** Un número con su color: "2 rojas". */
const Count: FC<{ n: number; color: string; label: string }> = ({ n, color, label }) => (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 12, fontWeight: 700, color }}>
        <Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color }} />
        {n} {label}
    </Box>
);

const Row: FC<{ alert: PanelAlert; first: boolean; onGo: (alert: PanelAlert, item?: AlertItem) => void }> = ({ alert: a, first, onGo }) => {
    const color = useGoalColor();
    const named = a.items.filter((i) => i.name);
    const go = () => onGo(a);
    const key = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
        }
    };

    return (
        <Box role="button" tabIndex={0} onClick={go} onKeyDown={key}
            sx={{
                display: "flex", alignItems: "center", gap: 1.25, px: { xs: 1.5, sm: 2 }, py: 0.9, cursor: "pointer",
                borderTop: first ? 0 : "1px solid", borderColor: "divider", transition: "background-color .15s",
                "&:hover, &:focus-visible": { bgcolor: "action.hover", outline: "none" },
            }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color(a.level), flexShrink: 0, boxShadow: (t) => `0 0 0 3px ${alpha(color(a.level), t.palette.mode === "dark" ? 0.25 : 0.15)}` }} />
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { md: "center" }, columnGap: 1.5, rowGap: 0.25 }}>
                <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0, whiteSpace: { md: "nowrap" } }}>{a.title}</Typography>
                {named.length > 0 ? (
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ minWidth: 0 }}>
                        {named.slice(0, NAMED).map((i) => (
                            <ButtonBase key={`${i.id}-${i.name}`} onClick={(e) => { e.stopPropagation(); onGo(a, i); }}
                                sx={{
                                    maxWidth: "100%", px: 0.75, py: 0.125, borderRadius: 1, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                                    color: color(i.level), bgcolor: alpha(color(i.level), 0.1), "&:hover": { bgcolor: alpha(color(i.level), 0.2) },
                                }}>
                                <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>{i.name} · {i.short}</Box>
                            </ButtonBase>
                        ))}
                        {named.length > NAMED && (
                            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", whiteSpace: "nowrap" }}>+{named.length - NAMED}</Typography>
                        )}
                    </Stack>
                ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0, overflow: { md: "hidden" }, textOverflow: { md: "ellipsis" }, whiteSpace: { md: "nowrap" } }}>
                        {a.items[0]?.short}
                    </Typography>
                )}
            </Box>
            <Explain title={a.title} help={a.help} extra={
                <Stack spacing={0.25}>
                    {a.items.map((i, k) => (
                        <Typography key={k} variant="caption" component="div" sx={{ color: color(i.level), fontWeight: 600 }}>
                            {i.name ? `${i.name}: ` : ""}{i.text}
                        </Typography>
                    ))}
                </Stack>
            }>
                <InfoOutlinedIcon onClick={(e) => e.stopPropagation()} tabIndex={0} sx={{ fontSize: 17, color: "text.disabled", cursor: "help", flexShrink: 0 }} />
            </Explain>
            <ChevronRightRoundedIcon sx={{ fontSize: 20, color: "text.disabled", flexShrink: 0 }} />
        </Box>
    );
};

export const AlertsBar: FC<{
    data: AlertsResponse | null;
    onGo: (alert: PanelAlert, item?: AlertItem) => void;
    onSetup: () => void;
}> = ({ data, onGo, onSetup }) => {
    const theme = useTheme();
    const [all, setAll] = useState(false);
    if (!data) return null;

    if (!data.configured) {
        return (
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ color: "text.secondary" }}>
                <NotificationsActiveRoundedIcon fontSize="small" />
                <Typography variant="body2">Pon tus metas y límites y el panel te avisará aquí cuando algo se salga.</Typography>
                <Button size="small" onClick={onSetup} sx={{ textTransform: "none" }}>Poner metas</Button>
            </Stack>
        );
    }

    if (data.alerts.length === 0) {
        return (
            <Stack direction="row" alignItems="center" gap={0.75} sx={{ color: "success.main" }}>
                <CheckCircleOutlineRoundedIcon fontSize="small" />
                <Typography variant="body2" fontWeight={700}>Todo en orden: ninguna alerta</Typography>
                <Typography variant="caption" color="text.secondary">· revisado a las {data.updated_at}</Typography>
            </Stack>
        );
    }

    const reds = data.alerts.filter((a) => a.level === "red").length;
    const yellows = data.alerts.length - reds;
    const shown = all ? data.alerts : data.alerts.slice(0, VISIBLE);
    const hidden = data.alerts.length - shown.length;

    return (
        <Panel sx={{ p: 0, overflow: "hidden" }}>
            <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap" sx={{ px: { xs: 1.5, sm: 2 }, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                <NotificationsActiveRoundedIcon sx={{ fontSize: 18, color: reds ? "error.main" : "warning.main" }} />
                <Typography variant="subtitle2" fontWeight={800}>Alertas</Typography>
                {reds > 0 && <Count n={reds} color={theme.palette.error.main} label={reds === 1 ? "roja" : "rojas"} />}
                {yellows > 0 && <Count n={yellows} color={theme.palette.warning.main} label={yellows === 1 ? "amarilla" : "amarillas"} />}
                <Box sx={{ flexGrow: 1 }} />
                <Typography variant="caption" color="text.secondary">Revisado {data.updated_at}</Typography>
            </Stack>
            {shown.map((a, k) => <Row key={a.type} alert={a} first={k === 0} onGo={onGo} />)}
            {(hidden > 0 || all) && data.alerts.length > VISIBLE && (
                <Button fullWidth size="small" onClick={() => setAll(!all)} sx={{ textTransform: "none", borderTop: "1px solid", borderColor: "divider", borderRadius: 0, py: 0.5 }}>
                    {all ? "Ver menos" : `Ver ${hidden} más`}
                </Button>
            )}
        </Panel>
    );
};
