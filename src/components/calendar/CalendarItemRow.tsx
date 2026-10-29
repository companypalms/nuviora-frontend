// src/components/calendar/CalendarItemRow.tsx
// Una cosa del calendario: la casilla para tildarla, qué es (pago, tarea o revisión, por color), la hora, cómo se repite,
// si se corrió por un domingo y quién la marcó (o si se tildó sola). Los recordatorios del sistema traen sus botones
// ("Abrir panel", "Están bien", "Registrar pago"…), su detalle (cada vendedora o agencia con su monto) y, en la ⓘ, por qué
// importan. Un gasto fijo se tilda registrando su pago. En el menú ⋮: descartar, deshacer, y editar o borrar si es una nota.
import React, { FC, useState } from "react";
import { Box, Button, Checkbox, Chip, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
import { CalendarItem, TYPE_META, isAutoDone, isClosed, payTarget, shortDate } from "./calendar";

type Props = {
    item: CalendarItem;
    /** En la lista de atrasadas se muestra de qué día era. */
    showDate?: boolean;
    busy?: boolean;
    onToggle: (item: CalendarItem) => void;
    onDismiss: (item: CalendarItem) => void;
    onUndo: (item: CalendarItem) => void;
    onEdit: (item: CalendarItem) => void;
    /** "Registrar pago" de un gasto fijo: abre la ventana de pago de Finanzas. */
    onPay: (item: CalendarItem, recurringId: number) => void;
};

/** Cuántas líneas del detalle (vendedoras, agencias) se ven antes de "Ver todas". */
const LINES_VISIBLE = 4;

/** "Hecho por Francisco · 29/10 15:46", o "Se tildó sola: No queda ningún día por conciliar." */
const markLine = (item: CalendarItem) => {
    const m = item.mark;
    if (!m) return null;
    if (m.source === "auto") return `Se tildó sola: ${m.note ?? "el sistema vio que ya está hecho."}`;
    const when = m.at ? ` · ${shortDate(m.at.slice(0, 10)).split(" ")[1]} ${m.at.slice(11, 16)}` : "";
    return `${m.status === "done" ? "Hecho" : "Descartado"}${m.by ? ` por ${m.by}` : ""}${when}${m.note ? ` · ${m.note}` : ""}`;
};

export const CalendarItemRow: FC<Props> = ({ item, showDate, busy, onToggle, onDismiss, onUndo, onEdit, onPay }) => {
    const navigate = useNavigate();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [allLines, setAllLines] = useState(false);
    // Un gasto fijo se tilda registrando su pago (así la caja queda al día), no con la casilla sola
    const pay = payTarget(item);
    const check = () => (pay !== null && item.status !== "done" ? onPay(item, pay) : onToggle(item));
    const lines = allLines ? item.lines : item.lines.slice(0, LINES_VISIBLE);
    const meta = TYPE_META[item.type];
    const closed = isClosed(item);
    const auto = isAutoDone(item);
    const moved = item.date !== item.due_date;
    const close = () => setAnchor(null);
    const line = markLine(item);
    // Los botones que marcan ("Están bien") solo mientras está pendiente; los que llevan a una página, siempre
    const actions = item.actions.filter((a) => a.link || !closed);

    return (
        <Stack
            direction="row"
            alignItems="flex-start"
            gap={0.5}
            sx={(t) => ({
                py: 0.75, pr: 0.5, pl: 0.25, borderRadius: 2,
                borderLeft: `4px solid ${t.palette[meta.color].main}`,
                bgcolor: item.status === "overdue" ? alpha(t.palette.error.main, 0.06) : "transparent",
                opacity: closed ? 0.7 : 1,
            })}
        >
            <Tooltip title={auto ? "Se tildó sola: el sistema vio que ya está hecho" : item.status === "done" ? "Deshacer" : pay !== null ? "Registrar el pago" : "Marcar como hecho"}>
                <span>
                    <Checkbox
                        size="small"
                        checked={item.status === "done"}
                        disabled={busy || auto || item.status === "dismissed"}
                        onChange={check}
                        inputProps={{ "aria-label": item.status === "done" ? `Deshacer ${item.title}` : `Marcar hecho ${item.title}` }}
                        sx={{ p: 0.5 }}
                    />
                </span>
            </Tooltip>
            <Box sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
                <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                    {item.time && <Typography variant="body2" fontWeight={800} color="text.secondary">{item.time}</Typography>}
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ textDecoration: closed ? "line-through" : "none", wordBreak: "break-word" }}
                    >
                        {item.title}
                    </Typography>
                    {item.help && (
                        <Tooltip title={item.help} enterTouchDelay={0}>
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} aria-label={`Por qué importa: ${item.help}`} />
                        </Tooltip>
                    )}
                    <Chip size="small" label={meta.label} color={meta.color} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                    {item.status === "overdue" && (
                        <Chip size="small" color="error" label={showDate ? `Atrasada · era del ${shortDate(item.date)}` : "Atrasada"} sx={{ height: 20, fontSize: 11 }} />
                    )}
                    {item.status === "dismissed" && <Chip size="small" label="Descartada" sx={{ height: 20, fontSize: 11 }} />}
                    {item.source === "assistant" && <Chip size="small" variant="outlined" label="La anotó tu asistente" sx={{ height: 20, fontSize: 11 }} />}
                </Stack>
                {item.details && (
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>
                        {item.details}
                    </Typography>
                )}
                {item.group !== "daily" && (
                    <Typography variant="caption" color="text.secondary" component="div">
                        {item.repeat_label}
                        {moved && ` · El ${shortDate(item.due_date).split(" ")[1]} cae domingo: ${item.date < item.due_date ? "se adelantó al sábado" : "pasó al lunes"}`}
                    </Typography>
                )}
                {item.lines.length > 0 && (
                    <Box component="ul" sx={{ m: 0, mt: 0.5, p: 0, listStyle: "none" }}>
                        {lines.map((l, i) => (
                            <Box component="li" key={`${l.label}-${i}`} sx={{ display: "flex", gap: 1, alignItems: "baseline", py: 0.1 }}>
                                <Typography variant="caption" fontWeight={700} sx={{ minWidth: 0, flex: 1, wordBreak: "break-word" }}>
                                    {l.label}
                                    {l.note && <Typography component="span" variant="caption" color="text.secondary"> · {l.note}</Typography>}
                                </Typography>
                                <Typography variant="caption" fontWeight={800} sx={{ flexShrink: 0 }}>{l.value}</Typography>
                            </Box>
                        ))}
                        {item.lines.length > LINES_VISIBLE && (
                            <Button size="small" onClick={() => setAllLines(!allLines)} sx={{ p: 0, minWidth: 0, fontSize: 12 }}>
                                {allLines ? "Ver menos" : `Ver todas (${item.lines.length})`}
                            </Button>
                        )}
                    </Box>
                )}
                {line && <Typography variant="caption" color={item.status === "done" ? "success.main" : "text.secondary"} component="div">{line}</Typography>}
                {actions.length > 0 && (
                    <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {actions.map((a) => (
                            <Button
                                key={a.label}
                                size="small"
                                variant={a.mark || a.pay ? "contained" : "outlined"}
                                color={a.pay ? "success" : "primary"}
                                disabled={busy}
                                onClick={() => (a.pay ? onPay(item, a.pay) : a.mark ? onToggle(item) : a.link && navigate(a.link))}
                                sx={{ py: 0.1, px: 1, minWidth: 0, fontSize: 12 }}
                            >
                                {a.label}
                            </Button>
                        ))}
                    </Stack>
                )}
            </Box>
            {!auto && (
                <IconButton size="small" aria-label={`Más opciones de ${item.title}`} onClick={(e) => setAnchor(e.currentTarget)} disabled={busy}>
                    <MoreVertRoundedIcon fontSize="small" />
                </IconButton>
            )}
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
                {closed
                    ? <MenuItem onClick={() => { close(); onUndo(item); }}>Deshacer (vuelve a quedar pendiente)</MenuItem>
                    : <MenuItem onClick={() => { close(); onDismiss(item); }}>Descartar este día</MenuItem>}
                {item.note_id !== null && <MenuItem onClick={() => { close(); onEdit(item); }}>Editar o borrar la nota</MenuItem>}
            </Menu>
        </Stack>
    );
};
