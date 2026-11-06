// src/components/calendar/MonthSheet.tsx
// .107 "Tu día": la ventana "Mes", con el mes completo para ver lo que viene o mirar un día que pasó. En el celular ocupa
// toda la pantalla. Tocar un día lo abre en Tu día.
import React, { FC, useEffect, useState } from "react";
import { Box, Button, Dialog, IconButton, Stack, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { Theme } from "@mui/material/styles";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { toast } from "react-toastify";
import { geist, lineSx, useTokens } from "../ui/design";
import { RangeResponse, cap, fetchRange, monthLabel, monthStart, monthWeeks, shiftMonth } from "./calendar";
import { MonthGrid } from "./MonthGrid";

export const MonthSheet: FC<{ open: boolean; today: string; selected: string; onClose: () => void; onSelect: (d: string) => void }> = ({ open, today, selected, onClose, onSelect }) => {
    const t = useTokens();
    const phone = useMediaQuery((th: Theme) => th.breakpoints.down("sm"));
    const [month, setMonth] = useState(monthStart(selected));
    const [data, setData] = useState<RangeResponse | null>(null);
    useEffect(() => { if (open) setMonth(monthStart(selected)); }, [open, selected]);

    const weeks = monthWeeks(month);
    const from = weeks[0][0];
    const to = weeks[weeks.length - 1][6];
    useEffect(() => {
        if (!open) return;
        let alive = true;
        setData(null);
        fetchRange(from, to).then((r) => { if (alive) setData(r); }).catch((e) => toast.error(e.message));
        return () => { alive = false; };
    }, [open, from, to]);

    return (
        <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="md" PaperProps={{ sx: { ...geist, color: t.ink, bgcolor: t.card, borderRadius: phone ? 0 : "12px" } }}>
            <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Tooltip title="Mes anterior"><IconButton onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior"><ChevronLeftRounded /></IconButton></Tooltip>
                        <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600, minWidth: 150, textAlign: "center" }}>{cap(monthLabel(month))}</Typography>
                        <Tooltip title="Mes siguiente"><IconButton onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente"><ChevronRightRounded /></IconButton></Tooltip>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {month !== monthStart(today) && <Button variant="outlined" size="small" sx={lineSx(t)} onClick={() => setMonth(monthStart(today))}>Hoy</Button>}
                        <IconButton onClick={onClose} aria-label="Cerrar el mes"><CloseRounded /></IconButton>
                    </Stack>
                </Stack>
                <Box sx={{ opacity: data ? 1 : 0.5, transition: "opacity 150ms" }}>
                    <MonthGrid month={month} days={data?.days ?? {}} today={today} selected={selected} onSelect={(d) => { onSelect(d); onClose(); }} />
                </Box>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 1.5 }}>Cada día: hechas / total. ✓ todo hecho · punto rojo: quedó algo atrasado. El domingo no se trabaja.</Typography>
            </Box>
        </Dialog>
    );
};
