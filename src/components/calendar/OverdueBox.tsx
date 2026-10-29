// src/components/calendar/OverdueBox.tsx
// "Atrasadas": lo que quedó sin hacer en días anteriores y se acumula (pedido del dueño: que siga apareciendo hasta que
// se marque hecho o se descarte). Arriba del calendario; no se ve si no hay nada atrasado.
import React, { FC, useState } from "react";
import { Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Panel } from "../ui/surface/Panel";
import { CalendarItem } from "./calendar";
import { CalendarItemRow } from "./CalendarItemRow";

type Props = {
    items: CalendarItem[];
    busy: string | null;
    onToggle: (item: CalendarItem) => void;
    onDismiss: (item: CalendarItem) => void;
    onUndo: (item: CalendarItem) => void;
    onEdit: (item: CalendarItem) => void;
    onPay: (item: CalendarItem, recurringId: number) => void;
};

const VISIBLE = 4;

export const OverdueBox: FC<Props> = ({ items, busy, ...actions }) => {
    const [all, setAll] = useState(false);
    if (items.length === 0) return null;
    const shown = all ? items : items.slice(0, VISIBLE);

    return (
        <Panel sx={(t) => ({ p: { xs: 1.5, sm: 2 }, borderLeft: `4px solid ${t.palette.error.main}`, bgcolor: alpha(t.palette.error.main, 0.04) })}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <WarningAmberRoundedIcon sx={{ color: "error.main", fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={800}>
                    {items.length === 1 ? "1 cosa atrasada" : `${items.length} cosas atrasadas`}
                </Typography>
            </Stack>
            <Stack spacing={0.5}>
                {shown.map((item) => (
                    <CalendarItemRow key={`${item.item_key}-${item.due_date}`} item={item} showDate busy={busy === `${item.item_key}-${item.due_date}`} {...actions} />
                ))}
            </Stack>
            {items.length > VISIBLE && (
                <Button size="small" onClick={() => setAll(!all)} sx={{ mt: 0.5 }}>
                    {all ? "Ver menos" : `Ver ${items.length - VISIBLE} más`}
                </Button>
            )}
        </Panel>
    );
};
