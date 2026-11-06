// src/components/calendar/MissionNow.tsx
// .107 "Tu día": la misión de ahora, en grande. Una sola cosa: dónde se hace, qué es, cuánto toma y por qué va primero,
// sus botones de siempre ("Ir a conciliación"…) y el botón principal ("Hecho", o "Registrar pago" si es un gasto fijo).
// Al terminarla entra la siguiente sola. "Descartar hoy" también la resuelve (nunca quedarse trabado).
import React, { FC, useState } from "react";
import { Box, Collapse, Stack, Typography } from "@mui/material";
import { appear, cardSx, useTokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";
import { CalendarItem, StageKey, stageColor, whereOf } from "./calendar";
import { PlanChip } from "./PlanMenu";
import { DoneButton, ItemDetails, RowHandlers } from "./TaskRow";

type Props = Pick<RowHandlers, "onDone" | "onDismiss" | "onPay" | "onPlan"> & {
    item: CalendarItem;
    reason: string;
    stage: { key: StageKey; label: string };
    n: number;
    total: number;
    busy?: boolean;
    /** La eligió el dueño con "Hacerla ahora" (no es la primera del orden): se puede volver al orden. */
    picked?: boolean;
    onBackToOrder?: () => void;
};

export const MissionNow: FC<Props> = ({ item, reason, stage, n, total, busy, picked, onBackToOrder, onDone, onDismiss, onPay, onPlan }) => {
    const t = useTokens();
    const [why, setWhy] = useState(false);
    const links = item.actions.filter((a) => a.link);
    return (
        <Box component="section" aria-label="Misión de ahora" sx={{ ...cardSx(t), p: { xs: "14px 14px", sm: "16px 18px" }, mt: 2, borderColor: t.ink, ...appear }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Dot color={stageColor(stage.key, t)} size={9} />
                    <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>Ahora · misión {n} de {total} · {stage.label}</Typography>
                </Stack>
                <PlanChip item={item} onSave={onPlan} disabled={busy} />
            </Stack>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: t.muted, mt: 1.25 }}>{whereOf(item)}{item.time ? ` · a las ${item.time} (hora de Venezuela)` : ""}</Typography>
            <Typography component="h2" sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, mt: 0.25, overflowWrap: "anywhere" }}>{item.title}</Typography>
            <ItemDetails item={{ ...item, help: null, actions: links }} busy={busy} onDone={onDone} onPay={onPay} />
            <Typography component="div" sx={{ fontSize: 13, color: item.status === "overdue" ? t.red : t.muted, mt: 1.25, overflowWrap: "anywhere" }}>
                {picked ? "La elegiste para hacerla ahora." : reason}
                {item.help && <> · <TextAction onClick={() => setWhy((o) => !o)} aria-expanded={why} sx={{ color: t.muted }}>{why ? "Ocultar" : "¿Por qué importa?"}</TextAction></>}
                {picked && onBackToOrder && <> · <TextAction onClick={onBackToOrder} sx={{ color: t.muted }}>Volver al orden</TextAction></>}
            </Typography>
            <Collapse in={why} unmountOnExit>
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.75, overflowWrap: "anywhere" }}>{item.help}</Typography>
            </Collapse>
            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mt: 2 }}>
                <DoneButton item={item} busy={busy} onDone={onDone} onPay={onPay} />
                <TextAction onClick={() => onDismiss(item)} disabled={busy} sx={{ fontSize: 14, color: t.muted }}>Descartar hoy</TextAction>
            </Stack>
        </Box>
    );
};
