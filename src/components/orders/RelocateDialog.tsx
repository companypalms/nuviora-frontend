// src/components/orders/RelocateDialog.tsx
// .149 (dueño, 2026-11-16: "lo correcto sería que solo se reasignara a una ciudad, si quiero reasignarlo a una ciudad, y si
// quiero reasignarlo de agencia dentro de esa ciudad, también lo pueda reasignar… que la líder de vendedoras pueda reasignar
// de ciudad al igual que yo"): una sola ventana en 2 pasos, la ciudad y después solo las agencias de esa ciudad. Reemplaza
// "Gestión Logística" (salían todas las agencias de todas las ciudades) y "Asignar / Reasignar agencia". Quién y cuándo lo
// decide el servidor (OrderRelocation); aquí solo se explica. Con sendToAgency (el Kanban, al mandar a la agencia un pedido
// sin agencia), después de elegir pasa a "Asignar a agencia" con el cambio de estado de siempre.
import React, { useEffect, useState } from "react";
import {
    Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { orderNo } from "../../lib/functions";
import { geist, inkSx, lineSx, tapSx, useTokens } from "../ui/design";
import { Dot } from "../ui/designParts";

type Agency = { id: number; name: string; stock: boolean; active: number; max: number | null; full: boolean; off: string | null };
type City = { id: number; name: string; center: boolean; stock: boolean; agencies: Agency[] };
type Options = { stop: string | null; status: string | null; city_id: number | null; agency_id: number | null; client_city: string | null; can_force: boolean; cities: City[] };

/** Una opción para elegir (como un radio, pero a lo ancho y fácil de tocar). */
const Choice: React.FC<{ selected: boolean; onClick: () => void; title: React.ReactNode; hint?: React.ReactNode }> = ({ selected, onClick, title, hint }) => {
    const t = useTokens();
    return (
        <ButtonBase role="radio" aria-checked={selected} onClick={onClick}
            sx={{ width: "100%", justifyContent: "flex-start", alignItems: "flex-start", textAlign: "left", gap: 1.25, p: "10px 12px", minHeight: 48,
                borderRadius: "10px", bgcolor: t.card, border: `1px solid ${selected ? t.ink : t.line}`, boxShadow: selected ? `inset 0 0 0 1px ${t.ink}` : "none",
                transition: "border-color 150ms, box-shadow 150ms", "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
            <Box aria-hidden sx={{ width: 18, height: 18, mt: "2px", flex: "none", borderRadius: "50%", border: `2px solid ${selected ? t.ink : t.faint}`,
                display: "grid", placeItems: "center" }}>
                {selected && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: t.ink }} />}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography component="span" sx={{ display: "block", fontSize: 15, fontWeight: 600, color: t.ink }}>{title}</Typography>
                {hint && <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted, mt: 0.25 }}>{hint}</Typography>}
            </Box>
        </ButtonBase>
    );
};

/** Lo que se sabe de una agencia, con su punto de color y siempre en palabras. */
const AgencyHint: React.FC<{ a: Agency; today: boolean }> = ({ a, today }) => {
    const t = useTokens();
    const bits: React.ReactNode[] = [
        <Box component="span" key="s" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><Dot size={8} color={a.stock ? t.green : t.gray} />{a.stock ? "con stock" : "sin stock"}</Box>,
    ];
    if (a.full) bits.push(<Box component="span" key="f" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><Dot size={8} color={t.amber} />llena · {a.active} de {a.max}</Box>);
    else if (a.max !== null) bits.push(<span key="c">{a.active} de {a.max} pedidos</span>);
    if (a.off) bits.push(<span key="o">{a.off}</span>);
    if (today) bits.push(<span key="h">la de hoy</span>);
    return <Box component="span" sx={{ display: "inline-flex", flexWrap: "wrap", columnGap: 1, rowGap: 0.25 }}>{bits.map((b, i) => <React.Fragment key={i}>{i > 0 && "·"}{b}</React.Fragment>)}</Box>;
};

export const RelocateDialog: React.FC<{
    open: boolean; onClose: () => void; orderId: number; orderName?: string | number | null; onDone?: () => void; sendToAgency?: boolean;
}> = ({ open, onClose, orderId, orderName, onDone, sendToAgency = false }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const { updateOrderInColumns, changeStatus } = useOrdersStore();
    const [opts, setOpts] = useState<Options | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [cityId, setCityId] = useState<number | null>(null);
    const [agencyId, setAgencyId] = useState<number | "auto">("auto");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [full, setFull] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        setOpts(null);
        setLoadError(null);
        setError(null);
        setFull(null);
        request(`/orders/${orderId}/logistics`, "GET")
            .then(async ({ status, response }: IResponse) => {
                const data = await response.json().catch(() => ({}));
                if (!alive) return;
                if (status !== 200) {
                    setLoadError(data?.message || "No se pudieron traer las ciudades.");
                    return;
                }
                const o = data as Options;
                const city = o.city_id ?? o.cities[0]?.id ?? null;
                const here = o.cities.find((c) => c.id === city);
                setOpts(o);
                setCityId(city);
                setAgencyId(o.agency_id && here?.agencies.some((a) => a.id === o.agency_id) ? o.agency_id : "auto");
            })
            .catch(() => { if (alive) setLoadError("Error en el servidor."); });
        return () => { alive = false; };
    }, [open, orderId]);

    const city = opts?.cities.find((c) => c.id === cityId) ?? null;
    const agency = agencyId === "auto" ? null : city?.agencies.find((a) => a.id === agencyId) ?? null;
    const today = (c: City | null, a: Agency | null) => !!c && c.id === opts?.city_id && !!a && a.id === opts?.agency_id;
    const same = today(city, agency);
    const noAgencies = !!city && !city.center && city.agencies.length === 0;

    const pickCity = (c: City) => {
        setCityId(c.id);
        setError(null);
        setFull(null);
        // En la ciudad de hoy vuelve la agencia de hoy; en otra, la elige el sistema
        setAgencyId(c.id === opts?.city_id && opts?.agency_id && c.agencies.some((a) => a.id === opts.agency_id) ? opts.agency_id : "auto");
    };
    const pickAgency = (id: number | "auto") => {
        setAgencyId(id);
        setError(null);
        setFull(null);
    };

    const save = async (force = false) => {
        if (!city) return;
        setBusy(true);
        setError(null);
        try {
            if (same && sendToAgency) {
                // Ya está donde va: solo se manda a la agencia
                if (await changeStatus(orderId, "Asignar a agencia")) onClose();
                return;
            }
            const body = new URLSearchParams({ city_id: String(city.id) });
            if (agencyId !== "auto") body.append("agency_id", String(agencyId));
            if (force) body.append("force", "1");
            const { status, response }: IResponse = await request(`/orders/${orderId}/logistics`, "PUT", body);
            const data = await response.json().catch(() => ({}));
            if (status >= 200 && status < 300) {
                updateOrderInColumns(data.order);
                if (sendToAgency) {
                    // El cambio de estado de siempre (con sus revisiones); si algo falta, lo dice y el pedido queda en su ciudad nueva
                    await changeStatus(orderId, "Asignar a agencia");
                    onClose();
                    return;
                }
                toast.success(data.message || "Listo.");
                onDone?.();
                onClose();
            } else if (data?.full) {
                setFull(data.message);
            } else {
                setError(data?.message || "No se pudo cambiar.");
            }
        } catch {
            setError("Error en el servidor.");
        } finally {
            setBusy(false);
        }
    };

    const where = city ? `${city.name}${agency ? ` con ${agency.name}` : ""}` : "";
    const verb = sendToAgency ? "Mandar a" : "Pasar a";
    const label = same && !sendToAgency ? "No cambiaste nada"
        : agency ? `${verb} ${where}` : city?.center ? `${verb} ${city.name} (centro logístico)` : `${verb} ${city?.name ?? ""} (elige el sistema)`;
    const nowCity = opts?.cities.find((c) => c.id === opts.city_id);
    const nowAgency = nowCity?.agencies.find((a) => a.id === opts?.agency_id);

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>{sendToAgency ? "¿A qué ciudad y agencia va?" : "Cambiar ciudad o agencia"}</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted, mt: 0.5 }}>
                    {orderName ? `Pedido ${orderNo(orderName)}` : "Este pedido"}
                    {nowCity ? ` · hoy: ${nowCity.name}${nowAgency ? ` con ${nowAgency.name}` : ""}` : ""}
                    {opts?.client_city ? ` · el cliente escribió: ${opts.client_city}` : ""}
                    {sendToAgency && " · después pasa a «Asignar a agencia»"}
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line }}>
                {loadError ? (
                    <Typography role="alert" sx={{ fontSize: 14, color: t.red }}>{loadError}</Typography>
                ) : !opts ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: t.muted, py: 2 }}>
                        <CircularProgress size={16} sx={{ color: "inherit" }} /><Typography sx={{ fontSize: 14 }}>Buscando las agencias…</Typography>
                    </Stack>
                ) : opts.stop ? (
                    <Box sx={{ bgcolor: t.soft, borderRadius: "10px", p: "12px 14px" }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>No se puede cambiar ahora</Typography>
                        <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>{opts.stop}</Typography>
                    </Box>
                ) : (
                    <>
                        <Typography component="h3" id="relocate-city" sx={{ fontSize: 14, fontWeight: 600 }}>1. Ciudad</Typography>
                        <Stack role="radiogroup" aria-labelledby="relocate-city" spacing={1} sx={{ mt: 1 }}>
                            {opts.cities.map((c) => (
                                <Choice key={c.id} selected={c.id === cityId} onClick={() => pickCity(c)} title={c.name}
                                    hint={<Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                        <Dot size={8} color={c.stock ? t.green : t.gray} />{c.stock ? "hay stock para este pedido" : "sin stock para este pedido"}
                                        {c.center && " · centro logístico"}{c.id === opts.city_id && " · la de hoy"}
                                    </Box>} />
                            ))}
                        </Stack>

                        {city && (
                            <>
                                <Typography component="h3" id="relocate-agency" sx={{ fontSize: 14, fontWeight: 600, mt: 2.5 }}>2. Agencia en {city.name}</Typography>
                                {noAgencies ? (
                                    <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>{city.name} no tiene agencias activas: configúralas en Reparto de agencias.</Typography>
                                ) : (
                                    <Stack role="radiogroup" aria-labelledby="relocate-agency" spacing={1} sx={{ mt: 1 }}>
                                        <Choice selected={agencyId === "auto"} onClick={() => pickAgency("auto")}
                                            title={city.center ? "Que lo reparta el centro logístico" : "Que la elija el sistema"}
                                            hint={city.center ? `El centro de ${city.name} se lo da a un motorizado o a la agencia de respaldo.` : "La que tiene stock y cupo, según el % de cada una."} />
                                        {city.agencies.map((a) => (
                                            <Choice key={a.id} selected={agencyId === a.id} onClick={() => pickAgency(a.id)} title={a.name}
                                                hint={<AgencyHint a={a} today={today(city, a)} />} />
                                        ))}
                                    </Stack>
                                )}
                            </>
                        )}

                        {full && (
                            <Box role="alert" sx={{ mt: 2, border: `1px solid ${t.amber}`, borderRadius: "10px", p: "12px 14px" }}>
                                <Typography sx={{ fontSize: 14 }}>{full}</Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                                    <Button variant="contained" disableElevation disabled={busy} onClick={() => save(true)} sx={{ ...inkSx(t), ...tapSx }}>Sí, pasárselo</Button>
                                    <Button variant="outlined" disabled={busy} onClick={() => setFull(null)} sx={{ ...lineSx(t), ...tapSx }}>Elegir otra</Button>
                                </Stack>
                            </Box>
                        )}
                        {error && <Typography role="alert" sx={{ fontSize: 14, color: t.red, mt: 1.5 }}>{error}</Typography>}
                    </>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap" }}>
                <Button onClick={onClose} disabled={busy} sx={{ color: t.muted, ...tapSx }}>{opts?.stop || loadError ? "Cerrar" : "Cancelar"}</Button>
                {opts && !opts.stop && (
                    <Button variant="contained" disableElevation disabled={busy || !city || (same && !sendToAgency) || noAgencies || !!full} onClick={() => save()}
                        startIcon={busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined} sx={{ ...inkSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}>
                        {label}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
