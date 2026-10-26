// src/components/reconciliation/StatementSources.tsx
// Los extractos de una conciliación (documento de Fran del 2026-10-06):
// §16: "Dentro de una conciliación, el sistema debe decir exactamente qué archivo necesita… Mercantil · 37 pagos
// pendientes de verificar · [Subir extracto]". §26: "Reemplazar extracto". §17: la primera vez que se sube un formato,
// el administrador confirma qué columna es cada dato (ver FormatDialog).
import React, { useRef, useState } from "react";
import { Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import { DownloadRounded, SwapHorizRounded, UploadFileRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { FormatDialog, FormatProposal } from "./FormatDialog";
import { dateTime, downloadStatement, longDate, plural, SourceCard } from "./reconciliation";

const ACCEPT = ".xlsx,.xls,.ods,.csv,.txt,.html,.htm";

interface Props {
    date: string;
    sources: SourceCard[];
    onChanged: () => void;
}

export const StatementSources: React.FC<Props> = ({ date, sources, onChanged }) => {
    const input = useRef<HTMLInputElement>(null);
    const target = useRef<{ source: SourceCard; replace: boolean } | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const [proposal, setProposal] = useState<{ file: File; source: SourceCard; replace: boolean; data: FormatProposal } | null>(null);

    /** Sube el archivo; si el formato no está confirmado, el servidor devuelve lo que entendió para confirmarlo. */
    const send = async (file: File, source: SourceCard, replace: boolean, format?: Partial<FormatProposal>, preview = false) => {
        const body = new FormData();
        body.append("file", file);
        body.append("statement_source_id", String(source.id));
        if (replace && source.statement) body.append("replace_id", String(source.statement.id));
        if (format) body.append("format", JSON.stringify({ header_row: format.header_row, columns: format.columns, mode: format.mode }));
        if (preview) body.append("preview", "1");
        setBusy(source.id);
        try {
            const { response } = await request(`/reconciliations/${date}/statements`, "POST", body, true);
            const data = await response.json();
            if (!data.status) {
                toast.error(data.message ?? "No se pudo subir el extracto");
                return;
            }
            if (data.step === "confirm") {
                setProposal({ file, source, replace, data });
                return;
            }
            setProposal(null);
            toast.success(`Extracto de ${source.name} subido: se buscaron los pagos.`);
            onChanged();
        } catch {
            toast.error("Error de conexión");
        } finally {
            setBusy(null);
        }
    };

    const pick = (source: SourceCard, replace: boolean) => {
        target.current = { source, replace };
        input.current?.click();
    };

    return (
        <>
            <input
                ref={input}
                type="file"
                accept={ACCEPT}
                hidden
                aria-label="Archivo del extracto"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file && target.current) send(file, target.current.source, target.current.replace);
                }}
            />
            <Grid container spacing={2}>
                {sources.map((s) => {
                    const st = s.statement;
                    const range = s.range.from === s.range.to ? `del ${longDate(s.range.to)}` : `del ${longDate(s.range.from)} al ${longDate(s.range.to)}`;
                    return (
                        <Grid key={s.id} size={{ xs: 12, md: 6, lg: 4 }}>
                            <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: st ? "divider" : "warning.main", height: "100%" }}>
                                <CardContent>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                        <Typography variant="h6" fontWeight="bold">{s.name}</Typography>
                                        <Chip size="small" color={st ? "success" : "warning"} label={st ? "Extracto subido" : "Falta el extracto"} />
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        {s.pending > 0 ? plural(s.pending, "pago pendiente de verificar", "pagos pendientes de verificar") : plural(s.payments, "pago", "pagos")}
                                    </Typography>
                                    {!st && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            El extracto tiene que tener los movimientos {range}.
                                        </Typography>
                                    )}
                                    {st && (
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
                                            {st.file} · {plural(st.rows_credit, "ingreso", "ingresos")}
                                            {st.date_from && ` · del ${longDate(st.date_from)}${st.date_to && st.date_to !== st.date_from ? ` al ${longDate(st.date_to)}` : ""}`}
                                            {st.uploaded_by && ` · ${st.uploaded_by}, ${dateTime(st.uploaded_at)}`}
                                        </Typography>
                                    )}
                                    <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: "wrap" }}>
                                        {!st ? (
                                            <Button
                                                variant="contained"
                                                startIcon={busy === s.id ? <CircularProgress size={16} color="inherit" /> : <UploadFileRounded />}
                                                disabled={busy !== null}
                                                onClick={() => pick(s, false)}
                                                sx={{ textTransform: "none" }}
                                            >
                                                Subir extracto
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={busy === s.id ? <CircularProgress size={16} color="inherit" /> : <SwapHorizRounded />}
                                                    disabled={busy !== null}
                                                    onClick={() => pick(s, true)}
                                                    sx={{ textTransform: "none" }}
                                                >
                                                    Reemplazar extracto
                                                </Button>
                                                <Button startIcon={<DownloadRounded />} onClick={() => downloadStatement(st.id, st.file)} sx={{ textTransform: "none" }}>
                                                    Descargar
                                                </Button>
                                            </>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {proposal && (
                <FormatDialog
                    source={proposal.source.name}
                    proposal={proposal.data}
                    busy={busy !== null}
                    onPreview={(format) => send(proposal.file, proposal.source, proposal.replace, format, true)}
                    onConfirm={(format) => send(proposal.file, proposal.source, proposal.replace, format)}
                    onClose={() => setProposal(null)}
                />
            )}
        </>
    );
};
