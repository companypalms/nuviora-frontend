// src/components/reconciliation/DayHistory.tsx
// Lo que pasó en una conciliación (documento de Fran del 2026-10-06):
// §27: al entrar en una fecha se consultan los "extractos utilizados" y las "resoluciones manuales".
// §26 y §28: el registro de que un archivo fue sustituido, y de cada acción manual (usuario, fecha y hora, acción y pago).
import React from "react";
import { Box, Button, List, ListItem, ListItemText, Typography } from "@mui/material";
import { DownloadRounded } from "@mui/icons-material";
import { orderNo } from "../../lib/functions";
import { DayDetail, dateTime, downloadStatement, longDate, plural } from "./reconciliation";

const ACTIONS: Record<string, string> = {
    upload: "Subió el extracto",
    replace: "Reemplazó el extracto",
    confirm: "Confirmó manualmente un pago",
    not_received: "Marcó un pago como no recibido",
    link: "Vinculó manualmente un pago",
};

export const DayHistory: React.FC<{ detail: DayDetail }> = ({ detail }) => (
    <Box>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Extractos utilizados</Typography>
        {detail.statements.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Todavía no se subió ningún extracto.</Typography>
        ) : (
            <List dense disablePadding>
                {detail.statements.map((s) => (
                    <ListItem
                        key={s.id}
                        disableGutters
                        secondaryAction={
                            <Button size="small" startIcon={<DownloadRounded />} onClick={() => downloadStatement(s.id, s.file)} sx={{ textTransform: "none" }}>
                                Descargar
                            </Button>
                        }
                        sx={{ opacity: s.replaced_at ? 0.6 : 1, pr: 14 }}
                    >
                        <ListItemText
                            primary={`${s.source ?? ""} · ${s.file}${s.replaced_at ? " (reemplazado)" : ""}`}
                            secondary={[
                                plural(s.rows_credit, "ingreso", "ingresos"),
                                s.date_from && `del ${longDate(s.date_from)}${s.date_to && s.date_to !== s.date_from ? ` al ${longDate(s.date_to)}` : ""}`,
                                s.uploaded_by && `subido por ${s.uploaded_by}, ${dateTime(s.uploaded_at)}`,
                                s.replaced_at && `reemplazado el ${dateTime(s.replaced_at)}`,
                            ].filter(Boolean).join(" · ")}
                            primaryTypographyProps={{ sx: { overflowWrap: "anywhere" } }}
                        />
                    </ListItem>
                ))}
            </List>
        )}

        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Registro</Typography>
        {detail.events.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Sin acciones todavía.</Typography>
        ) : (
            <List dense disablePadding>
                {detail.events.map((e, i) => {
                    const data = (e.data ?? {}) as Record<string, string | number | null>;
                    const what = data.orden ? `orden ${orderNo(String(data.orden))}` : data.archivo ? `${data.extracto ?? ""}: ${data.archivo}` : "";
                    return (
                        <ListItem key={i} disableGutters>
                            <ListItemText
                                primary={`${ACTIONS[e.action] ?? e.action}${what ? ` (${what})` : ""}`}
                                secondary={[e.user, dateTime(e.at), e.note].filter(Boolean).join(" · ")}
                            />
                        </ListItem>
                    );
                })}
            </List>
        )}
    </Box>
);
