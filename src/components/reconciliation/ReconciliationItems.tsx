// src/components/reconciliation/ReconciliationItems.tsx
// Los pagos de una conciliación (documento de Fran del 2026-10-06):
// §20: de un pago no encontrado se muestra "orden; cliente; método; monto; referencia; comprobante correspondiente", y
// el administrador puede confirmarlo, marcarlo como no recibido o vincularlo a un movimiento del extracto.
// §21: una orden con un pago encontrado y otro no se ve como "Parcialmente conciliada".
import React, { useState } from "react";
import {
    Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
} from "@mui/material";
import { CheckRounded, CloseRounded, LinkRounded, SearchRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { orderNo } from "../../lib/functions";
import { Candidate, dateTime, ITEM_META, ItemView, longDate, money, RECEIVED } from "./reconciliation";

type Action = "confirm" | "not_received" | "link";

const ACTION_TEXT: Record<Action, { title: string; button: string }> = {
    confirm: { title: "Confirmar manualmente", button: "Confirmar que llegó" },
    not_received: { title: "Confirmar como no recibido", button: "No se recibió" },
    link: { title: "Vincular manualmente", button: "Vincular" },
};

const OPEN = ["pending", "not_found", "review"];

/** Movimientos del extracto: fila del archivo (§17), fecha, referencia, monto y descripción, con "Vincular". */
const CandidateList: React.FC<{ rows: Candidate[]; currency: string | null; onLink?: (row: Candidate) => void; busy?: boolean }> = ({ rows, currency, onLink, busy }) => (
    <Stack component="ul" spacing={0.75} sx={{ listStyle: "none", m: 0, mt: 0.5, p: 0 }} aria-label="Movimientos del extracto">
        {rows.map((r) => (
            <Box
                component="li"
                key={r.row_id}
                sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: 1.25, py: 0.75, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
            >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2" fontWeight={600}>
                        {money(r.amount, currency)} · Ref. {r.reference ?? "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ overflowWrap: "anywhere" }}>
                        Fila {r.line}{r.date ? ` · ${longDate(r.date)}` : ""}{r.description ? ` · ${r.description}` : ""}{r.reason ? ` · ${r.reason}` : ""}
                    </Typography>
                    {r.used_by && <Typography variant="caption" color="error" display="block">Ya es de la orden {orderNo(r.used_by)}</Typography>}
                </Box>
                {onLink && (
                    <Button size="small" variant="outlined" startIcon={<LinkRounded />} disabled={busy || !!r.used_by} onClick={() => onLink(r)} sx={{ textTransform: "none" }}>
                        Vincular
                    </Button>
                )}
            </Box>
        ))}
    </Stack>
);

interface Props {
    items: ItemView[];
    onChanged: () => void;
    onOpenOrder: (orderId: number) => void;
}

export const ReconciliationItems: React.FC<Props> = ({ items, onChanged, onOpenOrder }) => {
    const [pending, setPending] = useState<{ item: ItemView; action: Action; row?: Candidate } | null>(null);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState<{ item: ItemView; q: string; rows: Candidate[] | null } | null>(null);

    const resolve = async () => {
        if (!pending) return;
        setBusy(true);
        try {
            const { response } = await request(`/reconciliation-items/${pending.item.id}/resolve`, "POST", {
                action: pending.action, row_id: pending.row?.row_id, note: note.trim() || null,
            });
            const data = await response.json();
            if (!data.status) {
                toast.error(data.message ?? "No se pudo guardar");
                return;
            }
            toast.success(`${ACTION_TEXT[pending.action].title}: listo`);
            setPending(null);
            setSearch(null);
            setNote("");
            onChanged();
        } catch {
            toast.error("Error de conexión");
        } finally {
            setBusy(false);
        }
    };

    /** Busca en el extracto de ese pago un monto o una referencia; sin texto, los del mismo monto o referencia (§23). */
    const find = async (item: ItemView, q: string) => {
        setSearch({ item, q, rows: null });
        try {
            const { status, response } = await request(`/reconciliation-items/${item.id}/rows?q=${encodeURIComponent(q)}`, "GET");
            const data = status === 200 ? await response.json() : { rows: [] };
            setSearch({ item, q, rows: (data.rows ?? []).map((r: Candidate & { id: number }) => ({ ...r, row_id: r.id })) });
        } catch {
            toast.error("Error de conexión");
            setSearch({ item, q, rows: [] });
        }
    };

    if (items.length === 0) {
        return (
            <Box role="status" sx={{ textAlign: "center", py: 4, opacity: 0.7 }}>
                <Typography>No hay pagos que revisar.</Typography>
            </Box>
        );
    }

    return (
        <Stack spacing={1.5}>
            {items.map((item) => {
                const meta = ITEM_META[item.status];
                const received = item.order_payments.filter((p) => RECEIVED.includes(p.status));
                const partial = received.length > 0 && !RECEIVED.includes(item.status);
                return (
                    <Card key={item.id} elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                        <CardContent sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                            {item.receipt_url && (
                                <Box
                                    component="img"
                                    src={item.receipt_url}
                                    alt={`Comprobante de ${item.order_name ? orderNo(item.order_name) : "la orden"}`}
                                    onClick={() => window.open(item.receipt_url!, "_blank")}
                                    sx={{ width: { xs: "100%", sm: 96 }, maxHeight: { xs: 180, sm: 140 }, objectFit: "cover", borderRadius: 2, cursor: "zoom-in", bgcolor: "action.hover", flexShrink: 0 }}
                                />
                            )}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                    {item.order_id ? (
                                        <Button onClick={() => onOpenOrder(item.order_id!)} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: "bold", fontSize: "1.05rem" }}>
                                            {item.order_name ? orderNo(item.order_name) : `#${item.order_id}`}
                                        </Button>
                                    ) : (
                                        <Typography fontWeight="bold">{item.order_name ? orderNo(item.order_name) : "Orden borrada"}</Typography>
                                    )}
                                    <Chip size="small" color={meta.color} label={`${meta.icon} ${meta.label}`} />
                                    <Chip size="small" variant="outlined" label={item.method_label} />
                                </Box>
                                {item.status === "not_found" && (
                                    <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>Pago no encontrado en nuestros extractos.</Typography>
                                )}
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {[item.client_name, money(item.amount, item.currency), item.reference && `Ref. ${item.reference}`, item.paid_on && `pagado el ${longDate(item.paid_on)}`, item.source && `extracto de ${item.source}`].filter(Boolean).join(" · ")}
                                </Typography>
                                {item.match_note && <Typography variant="caption" color="text.secondary" display="block">{item.match_note}</Typography>}

                                {partial && (
                                    <Alert severity="warning" icon={false} sx={{ mt: 1, py: 0 }}>
                                        <strong>⚠️ Orden parcialmente conciliada:</strong>{" "}
                                        {[...item.order_payments, { id: item.id, status: item.status, amount: item.amount, currency: item.currency }]
                                            .sort((a, b) => a.id - b.id)
                                            .map((p) => `${ITEM_META[p.status].icon} ${money(p.amount, p.currency)} ${ITEM_META[p.status].label.toLowerCase()}`)
                                            .join(" · ")}
                                    </Alert>
                                )}

                                {item.row && (
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                        Movimiento: fila {item.row.line}{item.row.file ? ` de ${item.row.file}` : ""} · {item.row.date ? longDate(item.row.date) : ""} · Ref. {item.row.reference ?? "—"} · {money(item.row.amount, item.currency)}
                                    </Typography>
                                )}
                                {item.resolved_by && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {meta.label} por {item.resolved_by}, {dateTime(item.resolved_at)}{item.note ? ` · ${item.note}` : ""}
                                    </Typography>
                                )}

                                {item.status === "review" && item.candidates.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="caption" fontWeight="bold">Posibles movimientos del extracto</Typography>
                                        <CandidateList rows={item.candidates} currency={item.currency} busy={busy} onLink={(row) => setPending({ item, action: "link", row })} />
                                    </Box>
                                )}

                                {OPEN.includes(item.status) && (
                                    <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: "wrap" }}>
                                        <Button size="small" variant="outlined" color="success" startIcon={<CheckRounded />} onClick={() => setPending({ item, action: "confirm" })} sx={{ textTransform: "none" }}>
                                            {ACTION_TEXT.confirm.button}
                                        </Button>
                                        <Button size="small" variant="outlined" color="error" startIcon={<CloseRounded />} onClick={() => setPending({ item, action: "not_received" })} sx={{ textTransform: "none" }}>
                                            {ACTION_TEXT.not_received.button}
                                        </Button>
                                        {item.status !== "pending" && (
                                            <Button size="small" startIcon={<SearchRounded />} onClick={() => find(item, "")} sx={{ textTransform: "none" }}>
                                                Buscar en el extracto
                                            </Button>
                                        )}
                                    </Stack>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                );
            })}

            {/* Nota y confirmación de la acción (§28: queda registrado quién, cuándo y qué) */}
            <Dialog open={!!pending} onClose={busy ? undefined : () => setPending(null)} maxWidth="xs" fullWidth>
                {pending && (
                    <>
                        <DialogTitle sx={{ fontWeight: "bold" }}>{ACTION_TEXT[pending.action].title}</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                {pending.item.order_name ? orderNo(pending.item.order_name) : ""} · {money(pending.item.amount, pending.item.currency)}
                                {pending.row && ` → fila ${pending.row.line}, ref. ${pending.row.reference ?? "—"}, ${money(pending.row.amount, pending.item.currency)}`}
                            </Typography>
                            <TextField label="Nota (opcional)" fullWidth multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 300 }} />
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={() => setPending(null)} disabled={busy} color="inherit">Cancelar</Button>
                            <Button variant="contained" onClick={resolve} disabled={busy}>{ACTION_TEXT[pending.action].button}</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Buscar el movimiento para vincularlo (§20: "Vinculado manualmente") */}
            <Dialog open={!!search && !pending} onClose={() => setSearch(null)} maxWidth="md" fullWidth>
                {search && (
                    <>
                        <DialogTitle sx={{ fontWeight: "bold" }}>Buscar en el extracto</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" sx={{ mb: 1.5 }}>
                                {search.item.order_name ? orderNo(search.item.order_name) : ""} · {money(search.item.amount, search.item.currency)}
                                {search.item.reference ? ` · Ref. ${search.item.reference}` : ""}
                            </Typography>
                            <Box component="form" onSubmit={(e) => { e.preventDefault(); find(search.item, search.q); }} sx={{ display: "flex", gap: 1, mb: 2 }}>
                                <TextField size="small" fullWidth label="Monto o referencia" value={search.q} onChange={(e) => setSearch({ ...search, q: e.target.value })} />
                                <Button type="submit" variant="outlined" startIcon={<SearchRounded />} sx={{ textTransform: "none" }}>Buscar</Button>
                            </Box>
                            {search.rows === null ? (
                                <Typography variant="body2" color="text.secondary">Buscando…</Typography>
                            ) : search.rows.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    {search.q ? "No hay ingresos con ese monto o esa referencia." : "No hay ingresos con el mismo monto ni la misma referencia. Busca otro monto o referencia."}
                                </Typography>
                            ) : (
                                <CandidateList rows={search.rows} currency={search.item.currency} busy={busy} onLink={(row) => setPending({ item: search.item, action: "link", row })} />
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={() => setSearch(null)} color="inherit">Cerrar</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Stack>
    );
};
