// src/components/calendar/TaskRow.tsx
// .107 "Tu día": una cosa de la lista. El agarre para arrastrarla (si se puede), la casilla, qué es, por qué va ahí y
// cuánto toma ("5 min": se cambia con un toque). "Cómo y por qué" abre lo demás: el detalle, cada vendedora o agencia con
// su monto, los botones de siempre ("Ir a conciliación", "Registrar pago") y por qué importa. En el menú ⋮: hacerla
// ahora, subir o bajar (lo mismo que arrastrar, para quien no puede o no quiere arrastrar), descartarla hoy y editar la nota.
import React, { FC, useState } from "react";
import { Box, Button, Checkbox, Collapse, IconButton, ListItemIcon, Menu, MenuItem, Stack, Typography } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import { useNavigate } from "react-router-dom";
import { cardSx, inkSx, lineSx, useTokens } from "../ui/design";
import { TextAction } from "../ui/designParts";
import { CalendarItem, isAutoDone, isClosed, markLine, payTarget, shortDate, whereOf } from "./calendar";
import { AngleDecisionDialog } from "./AngleDecisionDialog";
import { PlanChip, PlanPatch } from "./PlanMenu";

export type RowHandlers = {
    onDone: (item: CalendarItem) => void;
    onUndo: (item: CalendarItem) => void;
    onDismiss: (item: CalendarItem) => void;
    onEdit: (item: CalendarItem) => void;
    onPay: (item: CalendarItem, recurringId: number) => void;
    onPlan: (item: CalendarItem, patch: PlanPatch) => void;
    /** "Hacerla ahora": pasa a la tarjeta grande. */
    onNow?: (item: CalendarItem) => void;
};

type Props = RowHandlers & {
    item: CalendarItem;
    reason?: string;
    busy?: boolean;
    /** El agarre de arrastrar (dnd-kit): sus eventos y atributos. Sin esto, la fila no se arrastra. */
    handle?: React.HTMLAttributes<HTMLElement> & { ref?: (el: HTMLElement | null) => void };
    /** Subir o bajar un lugar dentro de su grupo (null: no se puede, ya está arriba o abajo). */
    onMove?: ((dir: -1 | 1) => void) | null;
    canUp?: boolean;
    canDown?: boolean;
    /** El cuadro del Dashboard: sin agarre ni "Cómo y por qué". */
    compact?: boolean;
    /** .108: lo de su reloj, en palabras ("En pausa · 3:20", "12 min · a tiempo"). */
    timing?: string;
    dragging?: boolean;
};

/** Cuántas líneas del detalle (vendedoras, agencias) se ven antes de "Ver todas". */
const LINES_VISIBLE = 4;

/** Lo que se abre: el detalle, las líneas, los botones y por qué importa (lo mismo en la tarjeta grande). */
export const ItemDetails: FC<{ item: CalendarItem; busy?: boolean; onDone: (i: CalendarItem) => void; onPay: (i: CalendarItem, id: number) => void; buttons?: boolean }> = ({ item, busy, onDone, onPay, buttons = true }) => {
    const t = useTokens();
    const navigate = useNavigate();
    const [all, setAll] = useState(false);
    const [angle, setAngle] = useState<number | null>(null);
    const closed = isClosed(item);
    const lines = all ? item.lines : item.lines.slice(0, LINES_VISIBLE);
    const moved = item.date !== item.due_date;
    const actions = item.actions.filter((a) => a.link || !closed);
    return (
        <Box sx={{ mt: 1 }}>
            {item.details && <Typography sx={{ fontSize: 14, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{item.details}</Typography>}
            {item.lines.length > 0 && (
                <Box component="ul" sx={{ m: 0, mt: 0.75, p: 0, listStyle: "none" }}>
                    {lines.map((l, i) => (
                        <Box component="li" key={`${l.label}-${i}`} sx={{ display: "flex", gap: 1, alignItems: "baseline", py: 0.25, borderTop: i ? `1px solid ${t.line}` : "none" }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 500, minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>
                                {l.label}{l.note && <Box component="span" sx={{ color: t.muted, fontWeight: 400 }}> · {l.note}</Box>}
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, flex: "none" }}>{l.value}</Typography>
                        </Box>
                    ))}
                    {item.lines.length > LINES_VISIBLE && (
                        <TextAction onClick={() => setAll(!all)} sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>{all ? "Ver menos" : `Ver todas (${item.lines.length})`}</TextAction>
                    )}
                </Box>
            )}
            {(item.group === null && item.repeat_label) && (
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.75 }}>
                    {item.repeat_label}
                    {moved && ` · El ${shortDate(item.due_date).split(" ")[1]} cae domingo: ${item.date < item.due_date ? "se adelantó al sábado" : "pasó al lunes"}`}
                </Typography>
            )}
            {item.help && <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.75, overflowWrap: "anywhere" }}>Por qué importa: {item.help}</Typography>}
            {item.source === "assistant" && <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.5 }}>La anotó tu asistente.</Typography>}
            {buttons && actions.length > 0 && (
                <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.25 }}>
                    {actions.map((a) => (
                        <Button key={a.label} variant="outlined" size="small" disabled={busy} sx={{ ...lineSx(t), minHeight: 36, fontSize: 13 }}
                            onClick={() => (a.angle ? setAngle(a.angle) : a.pay ? onPay(item, a.pay) : a.mark ? onDone(item) : a.link && navigate(a.link))}>
                            {a.label}
                        </Button>
                    ))}
                </Stack>
            )}
            {angle !== null && <AngleDecisionDialog id={angle} onClose={() => setAngle(null)} />}
        </Box>
    );
};

export const TaskRow: FC<Props> = ({ item, reason, busy, handle, onMove, canUp, canDown, compact, dragging, timing, onDone, onUndo, onDismiss, onEdit, onPay, onPlan, onNow }) => {
    const t = useTokens();
    const [open, setOpen] = useState(false);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const done = item.status === "done";
    const dismissed = item.status === "dismissed";
    const closed = isClosed(item);
    const auto = isAutoDone(item);
    const pay = payTarget(item);
    const close = () => setAnchor(null);
    // Un gasto fijo se tilda registrando su pago (así la caja queda al día), no con la casilla sola
    const check = () => (done ? onUndo(item) : pay !== null ? onPay(item, pay) : onDone(item));
    const box = { width: 22, height: 22, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" } as const;
    const late = item.status === "overdue" && !reason ? `Atrasada: era del ${shortDate(item.date).split(" ")[1]}` : null;
    const line = closed ? [markLine(item), timing].filter(Boolean).join(" · ")
        : [late, timing, reason, whereOf(item), item.time && item.status !== "overdue" ? `a las ${item.time}` : null].filter(Boolean).join(" · ");

    return (
        <Box sx={{ ...cardSx(t), display: "flex", gap: { xs: 0.75, sm: 1 }, alignItems: "flex-start", p: { xs: "8px 8px 8px 4px", sm: "10px 10px 10px 6px" }, mb: 0.75,
            bgcolor: t.card, ...(dragging ? { boxShadow: "0 10px 28px rgba(0,0,0,.18)", borderColor: t.ink } : {}),
            ...(item.status === "overdue" ? { borderLeft: `3px solid ${t.red}` } : {}) }}>
            {handle ? (
                <Box {...handle} role="button" tabIndex={0} aria-label={`Arrastrar ${item.title} para cambiarla de lugar (o usa espacio y las flechas)`}
                    sx={{ flex: "none", width: 24, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", color: t.faint, cursor: "grab",
                        touchAction: "none", borderRadius: "6px", "&:hover": { color: t.ink }, "&:focus-visible": { outline: `2px solid ${t.ink}` }, "&:active": { cursor: "grabbing" } }}>
                    <DragIndicatorRounded sx={{ fontSize: 20 }} />
                </Box>
            ) : <Box sx={{ width: { xs: 4, sm: 6 }, flex: "none" }} />}
            <Checkbox checked={done} indeterminate={dismissed} onChange={check} disabled={busy || auto || dismissed} disableRipple sx={{ p: "9px", m: "-9px", mt: "0px", flex: "none" }}
                inputProps={{ "aria-label": done ? `Deshacer: ${item.title}` : pay !== null ? `Registrar el pago: ${item.title}` : `Hecho: ${item.title}` }}
                icon={<Box sx={{ ...box, border: `1.5px solid ${t.faint}` }} />}
                checkedIcon={<Box sx={{ ...box, bgcolor: auto ? t.green : t.ink, color: t.onInk }}><CheckRounded sx={{ fontSize: 16 }} /></Box>}
                indeterminateIcon={<Box sx={{ ...box, bgcolor: t.soft, border: `1.5px solid ${t.faint}`, color: t.muted }}><RemoveRounded sx={{ fontSize: 16 }} /></Box>} />
            <Box sx={{ flex: 1, minWidth: 0, pt: "9px", ml: { xs: 0.5, sm: 1 } }}>
                <Typography sx={{ fontSize: 15, fontWeight: closed ? 400 : 500, lineHeight: 1.35, overflowWrap: "anywhere",
                    color: closed ? t.faint : t.ink, textDecoration: done ? "line-through" : "none" }}>
                    {item.title}
                </Typography>
                <Typography component="div" sx={{ fontSize: 13, color: item.status === "overdue" ? t.red : t.muted, mt: 0.25, overflowWrap: "anywhere" }}>
                    {line}
                    {!compact && !closed && (
                        <>{line && " · "}<TextAction onClick={() => setOpen((o) => !o)} aria-expanded={open} sx={{ color: t.muted }}>{open ? "Ocultar" : "Cómo y por qué"}</TextAction></>
                    )}
                </Typography>
                {/* En el celular el botón de minutos va debajo, para que el título tenga lugar */}
                {!closed && <Box sx={{ display: { xs: "flex", sm: "none" }, mt: 0.75 }}><PlanChip item={item} onSave={onPlan} disabled={busy} /></Box>}
                {!compact && (
                    <Collapse in={open && !closed} unmountOnExit>
                        <ItemDetails item={item} busy={busy} onDone={onDone} onPay={onPay} />
                    </Collapse>
                )}
            </Box>
            <Stack direction="row" alignItems="center" sx={{ flex: "none", pt: "4px" }}>
                {!closed && <Box sx={{ display: { xs: "none", sm: "flex" } }}><PlanChip item={item} onSave={onPlan} disabled={busy} /></Box>}
                {!auto && (
                    <IconButton size="small" aria-label={`Más opciones de ${item.title}`} onClick={(e) => setAnchor(e.currentTarget)} disabled={busy} sx={{ width: 36, height: 36, color: t.muted }}>
                        <MoreVertRounded fontSize="small" />
                    </IconButton>
                )}
            </Stack>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
                {!closed && onNow && <MenuItem onClick={() => { close(); onNow(item); }}><ListItemIcon><PlayArrowRounded fontSize="small" /></ListItemIcon>Hacerla ahora</MenuItem>}
                {!closed && onMove && canUp && <MenuItem onClick={() => { close(); onMove(-1); }}><ListItemIcon><ArrowUpwardRounded fontSize="small" /></ListItemIcon>Subir</MenuItem>}
                {!closed && onMove && canDown && <MenuItem onClick={() => { close(); onMove(1); }}><ListItemIcon><ArrowDownwardRounded fontSize="small" /></ListItemIcon>Bajar</MenuItem>}
                {closed
                    ? <MenuItem onClick={() => { close(); onUndo(item); }}>Deshacer (vuelve a quedar pendiente)</MenuItem>
                    : <MenuItem onClick={() => { close(); onDismiss(item); }}>Descartar hoy</MenuItem>}
                {item.note_id !== null && <MenuItem onClick={() => { close(); onEdit(item); }}>Editar o borrar la nota</MenuItem>}
            </Menu>
        </Box>
    );
};

/** El botón principal de una cosa: "Registrar pago" si es un gasto fijo; si no, "Hecho". */
export const DoneButton: FC<{ item: CalendarItem; busy?: boolean; onDone: (i: CalendarItem) => void; onPay: (i: CalendarItem, id: number) => void }> = ({ item, busy, onDone, onPay }) => {
    const t = useTokens();
    const pay = payTarget(item);
    return (
        <Button variant="contained" disableElevation disabled={busy} startIcon={<CheckRounded />} sx={{ ...inkSx(t), minHeight: { xs: 48, sm: 40 } }}
            onClick={() => (pay !== null ? onPay(item, pay) : onDone(item))}>
            {pay !== null ? "Registrar pago" : "Hecho"}
        </Button>
    );
};
