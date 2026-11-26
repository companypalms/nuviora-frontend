// src/pages/admin/StoreFormPage.tsx
// .164 (dueño, 2026-11-19: "vamos a utilizar solo nuestro nuevo formulario"; "necesito que estipulemos unos KPIs claros para
// saber si funciona o no"): "Formulario de la tienda" (/formulario-tienda). Responde "¿está funcionando nuestro formulario en
// la landing?": arriba los KPIs con la regla para decidir, y después todo para dejarlo listo: prenderlo, el producto y sus
// ofertas (como en Releasit), el diseño con vista previa, Meta (píxel y API de conversiones), el WhatsApp del final, el código
// para pegar en la landing y los pedidos que entraron por ahí. Si nuestro formulario falla, la landing muestra Releasit.
// .168 (dueño, 2026-11-21): el pago anticipado (pago móvil con la foto del comprobante), "hablar con una asesora", las
// encomiendas (MRW y Zoom, con su lista de oficinas), los mensajes al cliente que pagó, y las campañas de cada producto que
// mandan el Purchase al entregar, con el experimento lado a lado ("Purchase al pedir" contra "al entregar").
// .170 (dueño, 2026-11-21: "quiero probar que podamos enviar bien los eventos de meta de purchase… antes de prender
// campañas"): con el código de prueba guardado, "Probar el Purchase al entregar".
// .171 (dueño, 2026-11-21: "sin duplicar campañas"): "Purchase según cómo paga el cliente" se prende por producto, y
// "¿Funciona?" lo compara con el mismo producto antes.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Button, Checkbox, FormControlLabel, MenuItem, Skeleton, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ContentCopyRounded, ReportProblemRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { appear, cardSx, geist, inkSx, lineSx, tapSx, Tokens, useTokens } from "../../components/ui/design";
import { Dot, NumberedSteps, Scoreboard, Section, TextAction } from "../../components/ui/designParts";
import {
    bsText, COLOR_LABELS, CourierOffice, ExperimentArm, ExperimentNow, offerUsd, snippet, StoreFormData as Data, StoreFormDesign, StoreFormKpi, StoreFormOffer, StoreFormProduct,
    StoreFormSettings as Settings, StoreFormSettingsInput, StoreFormTemplate, TEXT_LABELS, usdText, WA_CODES,
} from "../../components/store-form/storeForm";

const stateColor = (t: Tokens, s: StoreFormKpi["state"]) => ({ ok: t.green, bad: t.red, wait: t.gray, info: t.faint }[s]);
const stateText = { ok: "Bien", bad: "Por debajo", wait: "Midiendo", info: "" } as const;
/** "#F00" → "#FF0000" (el selector de color solo entiende 6 dígitos). */
const sixDigits = (c: string) => (/^#[0-9A-Fa-f]{3}$/.test(c) ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c);
const num = (v: number | null) => (v === null ? "—" : v.toLocaleString("es-VE", { maximumFractionDigits: 1 }));

/** Un KPI: su número, contra qué se compara, su meta y cómo va (con palabra, no solo color). */
const KpiRow: React.FC<{ k: StoreFormKpi; t: Tokens }> = ({ k, t }) => (
    <Box component="li" sx={{ ...cardSx(t), p: "12px 14px", mb: 1, listStyle: "none" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{k.label}</Typography>
            {k.state !== "info" && (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    <Dot color={stateColor(t, k.state)} size={8} /><span>{stateText[k.state]}</span>
                </Stack>
            )}
        </Stack>
        <Typography sx={{ fontSize: 14, mt: 0.25, fontVariantNumeric: "tabular-nums" }}>
            <Box component="span" sx={{ fontWeight: 600 }}>{num(k.value)}</Box> {k.unit}
            {k.base !== null && <Box component="span" sx={{ color: t.muted }}> · con Releasit: {num(k.base)}</Box>}
        </Typography>
        <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>Meta: {k.goal}{k.note ? ` · ${k.note}` : ""}</Typography>
    </Box>
);

/** Lo general: prenderlo, la tienda, el producto, el express y los topes. */
const GeneralCard: React.FC<{ data: Data; form: Settings; set: (f: Settings) => void; t: Tokens }> = ({ data, form, set, t }) => {
    const chosen = data.products.filter((p) => form.product_ids.includes(p.id));
    return (
        <Stack spacing={2}>
            <Box>
                <FormControlLabel sx={{ m: 0, gap: 1 }} label={<Typography sx={{ fontSize: 15, fontWeight: 600 }}>Prendido en la landing</Typography>}
                    control={<Switch checked={form.enabled} onChange={(e) => set({ ...form, enabled: e.target.checked })} />} />
                <Typography sx={{ fontSize: 13, color: t.muted }}>Apagado, la landing muestra tu formulario de Releasit como siempre (déjalo prendido en ese producto: es el respaldo).</Typography>
            </Box>
            <TextField select size="small" label="Tu tienda" value={form.shop_id ?? ""} onChange={(e) => set({ ...form, shop_id: e.target.value === "" ? null : Number(e.target.value) })}
                helperText="Los pedidos entran a esta tienda: así les toca vendedora y entran en los cierres de la noche." sx={{ maxWidth: 360 }}>
                <MenuItem value="">Sin elegir</MenuItem>
                {data.shops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <Autocomplete multiple size="small" options={data.products} value={chosen} getOptionLabel={(p) => p.name} isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, v) => set({ ...form, product_ids: v.map((p) => p.id) })}
                renderInput={(params) => <TextField {...params} label="En qué producto" helperText="Empieza con el producto nuevo de prueba. Solo salen los que están unidos a Shopify." />} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField size="small" type="number" label="Delivery Express ($)" value={form.express_usd} onChange={(e) => set({ ...form, express_usd: Number(e.target.value) })}
                    helperText="0 = sin la opción. Hoy en Releasit: $2." slotProps={{ htmlInput: { min: 0, max: 50, step: 0.5 } }} />
                <TextField size="small" type="number" label="Pedidos por día (tope)" value={form.daily_max} onChange={(e) => set({ ...form, daily_max: Number(e.target.value) })}
                    helperText="Para que un ataque no te llene de pedidos falsos." slotProps={{ htmlInput: { min: 10, max: 5000 } }} />
            </Stack>
            <TextField size="small" label="Direcciones de tu tienda" value={form.allowed_origins.join("\n")} multiline minRows={2}
                onChange={(e) => set({ ...form, allowed_origins: e.target.value.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean) })}
                helperText="Una por línea, como https://tutienda.com y https://tutienda.myshopify.com. El formulario solo funciona en estas." />
            <TextField size="small" label="Releasit en tu página (opcional)" value={form.releasit_selector} onChange={(e) => set({ ...form, releasit_selector: e.target.value })}
                helperText="Solo si en tu prueba se siguen viendo los dos formularios: te digo qué escribir aquí." />
        </Stack>
    );
};

/** Meta: el píxel y la API de conversiones (la clave solo se escribe: nunca se muestra). */
const MetaCard: React.FC<{ data: Data; form: StoreFormSettingsInput & { capi_set: boolean }; set: (f: StoreFormSettingsInput & { capi_set: boolean }) => void; t: Tokens }> = ({ data, form, set, t }) => (
    <Stack spacing={2}>
        <TextField size="small" label="Número de tu píxel" value={form.pixel_id} onChange={(e) => set({ ...form, pixel_id: e.target.value.replace(/\D/g, "") })}
            helperText="El mismo que tienes en Releasit (Configuraciones › Facebook Pixel)." sx={{ maxWidth: 360 }} slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 20 } }} />
        <Box>
            <TextField size="small" type="password" fullWidth label="Clave de la API de conversiones" value={form.capi_token ?? ""} autoComplete="off"
                onChange={(e) => set({ ...form, capi_token: e.target.value, capi_token_clear: false })}
                placeholder={form.capi_set ? "Ya está puesta (escribe otra solo para cambiarla)" : "Pégala aquí"}
                helperText="Cópiala de Releasit o de tu Administrador de eventos. Se guarda cifrada y nunca vuelve a mostrarse." />
            {form.capi_set && (
                <FormControlLabel sx={{ m: 0, mt: 0.5 }} control={<Checkbox checked={!!form.capi_token_clear} onChange={(e) => set({ ...form, capi_token_clear: e.target.checked, capi_token: "" })} />}
                    label={<Typography sx={{ fontSize: 14 }}>Quitar la clave puesta</Typography>} />
            )}
        </Box>
        <TextField size="small" label="Código de prueba de eventos (opcional)" value={form.capi_test_code} onChange={(e) => set({ ...form, capi_test_code: e.target.value })}
            helperText="Solo mientras pruebas en «Probar eventos» de Meta; después bórralo. Con él guardado, en «Pedidos del formulario» puedes probar el Purchase al entregar."
            sx={{ maxWidth: 360 }} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField select size="small" label="Formato del Content ID" value={form.content_id_format} onChange={(e) => set({ ...form, content_id_format: e.target.value })} sx={{ minWidth: 240 }}>
                {Object.entries(data.formats).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            <TextField size="small" label="REGION" value={form.content_region} onChange={(e) => set({ ...form, content_region: e.target.value.toUpperCase().slice(0, 2) })}
                helperText="El de tu catálogo (VE)." sx={{ maxWidth: 120 }} />
        </Stack>
        <FormControlLabel sx={{ m: 0, gap: 1 }} control={<Switch checked={form.send_initiate} onChange={(e) => set({ ...form, send_initiate: e.target.checked })} />}
            label={<Typography sx={{ fontSize: 14 }}>Mandar «InitiateCheckout» al empezar a llenarlo (apágalo si en tu prueba sale doble)</Typography>} />
        <FormControlLabel sx={{ m: 0, gap: 1 }} control={<Switch checked={form.send_pageview} onChange={(e) => set({ ...form, send_pageview: e.target.checked })} />}
            label={<Typography sx={{ fontSize: 14 }}>Mandar «PageView» (solo si tu página no lo manda ya)</Typography>} />
        <Typography sx={{ fontSize: 13, color: t.muted }}>
            «Purchase» sale al confirmar (en la página y por la API, con el mismo número: Meta no lo cuenta doble), salvo en los productos con «Purchase según cómo paga»;
            «pedido hecho» (AddPaymentInfo) sale siempre al confirmar, y «Lead» al pasar a WhatsApp.
        </Typography>
    </Stack>
);

/** El WhatsApp al que pasa el cliente después de pedir, con su mensaje. */
const WhatsappCard: React.FC<{ form: Settings; set: (f: Settings) => void; t: Tokens }> = ({ form, set, t }) => (
    <Stack spacing={2}>
        <TextField size="small" label="Tu WhatsApp" value={form.whatsapp_number} onChange={(e) => set({ ...form, whatsapp_number: e.target.value })}
            helperText="Con el código del país: +58…" sx={{ maxWidth: 280 }} slotProps={{ htmlInput: { inputMode: "tel", maxLength: 20 } }} />
        <TextField label="Mensaje que el cliente te envía" value={form.whatsapp_message} multiline minRows={3} onChange={(e) => set({ ...form, whatsapp_message: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 1000 } }} />
        <Typography sx={{ fontSize: 13, color: t.muted }}>
            Códigos: {WA_CODES.map(([c, w], i) => <React.Fragment key={c}>{i ? " · " : ""}<Box component="code" sx={{ fontSize: 12 }}>{c}</Box> {w}</React.Fragment>)}
        </Typography>
    </Stack>
);

const Codes: React.FC<{ codes: [string, string][]; t: Tokens }> = ({ codes, t }) => (
    <Typography sx={{ fontSize: 13, color: t.muted }}>
        Códigos: {codes.map(([c, w], i) => <React.Fragment key={c}>{i ? " · " : ""}<Box component="code" sx={{ fontSize: 12 }}>{c}</Box> {w}</React.Fragment>)}
    </Typography>
);

/** .181: una plantilla de Meta de los casos nuevos: su nombre exacto, cuándo sale y su texto (para crearla igual en Meta). */
const TemplateRow: React.FC<{ tp: StoreFormTemplate; t: Tokens }> = ({ tp, t }) => (
    <Box sx={{ border: `1px solid ${t.line}`, borderRadius: "10px", p: 1.5 }}>
        <Box component="code" sx={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{tp.name}</Box>
        <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>{tp.when}</Typography>
        <Typography sx={{ fontSize: 13, mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{tp.text}</Typography>
    </Box>
);

/**
 * .168: el pago anticipado (pago móvil con la foto del comprobante), la asesora y las encomiendas (de qué ciudad salen y
 * dónde deja el paquete el motorizado), y los mensajes. Nada de lo que ve o recibe el cliente nombra a una IA.
 */
const PrepaidCard: React.FC<{ data: Data; form: Settings; set: (f: Settings) => void; t: Tokens }> = ({ data, form, set, t }) => {
    const onOff = (key: "prepaid_enabled" | "advisor_enabled" | "courier_enabled", label: string, help: string) => (
        <Box>
            <FormControlLabel sx={{ m: 0, gap: 1 }} label={<Typography sx={{ fontSize: 15, fontWeight: 600 }}>{label}</Typography>}
                control={<Switch checked={form[key]} onChange={(e) => set({ ...form, [key]: e.target.checked })} />} />
            <Typography sx={{ fontSize: 13, color: t.muted }}>{help}</Typography>
        </Box>
    );
    const message = (key: keyof Settings, label: string) => (
        <TextField label={label} value={String(form[key] ?? "")} multiline minRows={2} onChange={(e) => set({ ...form, [key]: e.target.value })}
            placeholder={data.messages[key as string]} helperText="Vacío = el de siempre." slotProps={{ htmlInput: { maxLength: 1000 } }} />
    );
    const offices = (c: string) => data.offices.find((o) => o.company === c);
    return (
        <Stack spacing={2}>
            {onOff("prepaid_enabled", "Pago por adelantado en tus ciudades con delivery",
                "Además de pagar al recibir: ve la cuenta del día y el monto exacto en Bs, paga y sube la foto del comprobante. El pedido llega «✅ Ya pagó»: nadie le cobra al entregar. (Las encomiendas siempre se pagan por adelantado.)")}
            {onOff("advisor_enabled", "Encomiendas: «Hacer el pago con una asesora»",
                "En el resto del país, el cliente llena sus datos y la agencia, y hace el pago móvil con una asesora por WhatsApp (no paga en el formulario).")}
            {onOff("courier_enabled", "Encomiendas a todo el país (MRW y Zoom)",
                "El envío va incluido en el precio y se paga por adelantado. El cliente elige la empresa y la oficina donde retira.")}
            {form.courier_enabled && (
                <Stack spacing={1.5} sx={{ pl: { sm: 2 }, borderLeft: { sm: `2px solid ${t.line}` } }}>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                        {data.couriers.map((c) => (
                            <FormControlLabel key={c} sx={{ m: 0 }} label={<Typography sx={{ fontSize: 14 }}>{c} ({offices(c)?.active ?? 0} oficinas)</Typography>}
                                control={<Checkbox checked={form.courier_companies.includes(c)}
                                    onChange={(e) => set({ ...form, courier_companies: e.target.checked ? [...form.courier_companies, c] : form.courier_companies.filter((x) => x !== c) })} />} />
                        ))}
                    </Stack>
                    <TextField select size="small" label="Las encomiendas salen de" value={form.courier_origin_city_id ?? ""} sx={{ maxWidth: 360 }}
                        onChange={(e) => set({ ...form, courier_origin_city_id: e.target.value === "" ? null : Number(e.target.value) })}
                        helperText="Su agencia recibe el pedido y su stock es el que se usa. Lo cambias cuando quieras.">
                        <MenuItem value="">Sin elegir</MenuItem>
                        {data.cod_cities.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </TextField>
                    {/* .174: las encomiendas cuentan en «Resto de Venezuela», con lo que cobra MRW o Zoom */}
                    <TextField size="small" type="number" label="Costo de cada envío (USD)" value={form.courier_fee_usd ?? ""}
                        sx={{ maxWidth: 360 }} onChange={(e) => set({ ...form, courier_fee_usd: e.target.value === "" ? null : Number(e.target.value) })}
                        slotProps={{ htmlInput: { min: 0, max: 100, step: 0.5, inputMode: "decimal" } }}
                        helperText="Lo que te cobra MRW o Zoom, en promedio. Se suma a cada encomienda despachada; todas cuentan en la zona «Resto de Venezuela» (CPA objetivo, break-even y ganancia)." />
                    {form.courier_fee_usd === null && (
                        <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ fontSize: 13 }}>
                            <Box sx={{ pt: "5px" }}><Dot color={t.amber} size={8} /></Box>
                            <span>Falta el costo de la encomienda: sin él, los números de «Resto de Venezuela» salen sin lo que cobra MRW o Zoom.</span>
                        </Stack>
                    )}
                    {form.courier_companies.map((c) => (
                        <TextField key={c} size="small" label={`Dónde deja el paquete el motorizado (${c})`} value={form.courier_dropoff[c] ?? ""}
                            onChange={(e) => set({ ...form, courier_dropoff: { ...form.courier_dropoff, [c]: e.target.value } })}
                            helperText={`El link de Google Maps de la oficina de ${c} en esa ciudad. Vacío = lo pone la vendedora en cada pedido.`} />
                    ))}
                    {data.offices.every((o) => o.total === 0) && (
                        <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ fontSize: 13 }}>
                            <Box sx={{ pt: "5px" }}><Dot color={t.amber} size={8} /></Box>
                            <span>Todavía no está cargada la lista de oficinas: en el servidor corre «php artisan couriers:oficinas».</span>
                        </Stack>
                    )}
                </Stack>
            )}
            <Typography sx={{ fontSize: 14, fontWeight: 600, pt: 1 }}>Lo que le escribimos al cliente (plantillas de Meta)</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted, mt: "-8px !important" }}>
                Por WhatsApp, como si lo escribiera una persona, y siempre con su plantilla: le llega aunque no nos haya escrito. Créalas en WhatsApp Manager › Plantillas de mensajes
                con este nombre exacto (Utilidad, Español). Si una no sale (por ejemplo, Meta todavía no la aprobó) o el comprobante tiene un problema, lo atiende la vendedora.
            </Typography>
            {data.templates.map((tp) => <TemplateRow key={tp.name} tp={tp} t={t} />)}
            <Typography sx={{ fontSize: 14, fontWeight: 600, pt: 1 }}>Lo que el cliente te envía por WhatsApp</Typography>
            {message("whatsapp_message_prepaid", "Si pagó por adelantado")}
            {message("whatsapp_message_courier", "Si es encomienda")}
            {message("whatsapp_message_advisor", "Si quiere hablar con una asesora")}
            <Codes codes={[...WA_CODES, ["{courier}", "MRW o Zoom"]]} t={t} />
        </Stack>
    );
};

/** .168: la lista de oficinas de MRW y Zoom: buscar, apagar una o agregar otra. */
const OfficesCard: React.FC<{ data: Data; t: Tokens }> = ({ data, t }) => {
    const [company, setCompany] = useState(data.couriers[0] ?? "MRW");
    const [q, setQ] = useState("");
    const [list, setList] = useState<CourierOffice[] | null>(null);
    const [adding, setAdding] = useState({ state: "", city: "", name: "", address: "" });
    const [busy, setBusy] = useState(false);
    const search = useCallback(async (c: string, text: string) => {
        try { setList((await api<{ offices: CourierOffice[] }>(`/store-form/courier-offices?company=${encodeURIComponent(c)}&q=${encodeURIComponent(text)}`)).offices); }
        catch (e) { toast.error((e as Error).message); }
    }, []);
    useEffect(() => { search(company, ""); }, [company, search]);
    const toggle = async (o: CourierOffice) => {
        try {
            const r = await api<{ message: string; office: CourierOffice }>(`/store-form/courier-offices/${o.id}`, "PUT", { is_active: !o.is_active });
            toast.success(r.message);
            setList((l) => l?.map((x) => (x.id === o.id ? r.office : x)) ?? null);
        } catch (e) { toast.error((e as Error).message); }
    };
    const add = async () => {
        setBusy(true);
        try {
            const r = await api<{ message: string; office: CourierOffice }>("/store-form/courier-offices", "POST", { company, ...adding });
            toast.success(r.message);
            setAdding({ state: "", city: "", name: "", address: "" });
            search(company, q);
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    return (
        <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <ToggleButtonGroup size="small" exclusive value={company} onChange={(_, v) => v && setCompany(v)} aria-label="Empresa">
                    {data.couriers.map((c) => <ToggleButton key={c} value={c}>{c}</ToggleButton>)}
                </ToggleButtonGroup>
                <TextField size="small" label="Buscar (estado, ciudad o nombre)" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }}
                    onKeyDown={(e) => { if (e.key === "Enter") search(company, q); }} />
                <Button variant="outlined" onClick={() => search(company, q)} sx={{ ...lineSx(t), ...tapSx }}>Buscar</Button>
            </Stack>
            {list === null ? <Skeleton variant="rounded" height={120} sx={{ mt: 1 }} /> : (
                <Box component="ul" sx={{ p: 0, m: 0, mt: 1, maxHeight: 360, overflowY: "auto" }}>
                    {list.length === 0 && <Typography component="li" sx={{ fontSize: 14, color: t.muted, listStyle: "none" }}>No hay oficinas con esa búsqueda.</Typography>}
                    {list.map((o) => (
                        <Box component="li" key={o.id} sx={{ listStyle: "none", py: 0.75, borderBottom: `1px solid ${t.line}`, display: "flex", gap: 1, alignItems: "center", opacity: o.is_active ? 1 : 0.55 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{o.name} <Box component="span" sx={{ color: t.muted, fontWeight: 400 }}>· {o.city ? `${o.city}, ` : ""}{o.state}</Box></Typography>
                                {o.address && <Typography sx={{ fontSize: 12, color: t.muted, overflowWrap: "anywhere" }}>{o.address}</Typography>}
                            </Box>
                            <Switch checked={o.is_active} onChange={() => toggle(o)} slotProps={{ input: { "aria-label": `${o.is_active ? "Apagar" : "Prender"} ${o.name}` } }} />
                        </Box>
                    ))}
                </Box>
            )}
            <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 2 }}>Agregar una oficina de {company}</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: 1 }}>
                <TextField size="small" label="Estado" value={adding.state} onChange={(e) => setAdding({ ...adding, state: e.target.value })} />
                <TextField size="small" label="Ciudad" value={adding.city} onChange={(e) => setAdding({ ...adding, city: e.target.value })} />
                <TextField size="small" label="Nombre de la oficina" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
                <TextField size="small" label="Dirección" value={adding.address} onChange={(e) => setAdding({ ...adding, address: e.target.value })} />
            </Box>
            <Button variant="contained" disableElevation onClick={add} disabled={busy || !adding.state.trim() || !adding.name.trim()} sx={{ ...inkSx(t), ...tapSx, mt: 1 }}>
                {busy ? "Agregando…" : "Agregar oficina"}
            </Button>
        </Box>
    );
};

/** .172: qué sale hoy en el formulario con el stock de cada ciudad (y de dónde salen las encomiendas). */
const StockToday: React.FC<{ p: StoreFormProduct; t: Tokens }> = ({ p, t }) => {
    const on = p.stock.cities.filter((c) => c.ok);
    const off = p.stock.cities.filter((c) => !c.ok);
    const courier = p.stock.courier;
    const nothing = on.length === 0 && !courier?.ok;
    return (
        <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ fontSize: 13, mt: 0.75 }}>
            <Box sx={{ pt: "5px" }}><Dot color={nothing ? t.red : off.length || (courier && !courier.ok) ? t.amber : t.green} size={8} /></Box>
            <span>
                {nothing ? "Hoy no sale en el formulario: no hay stock en ninguna ciudad." : `Hoy sale en: ${on.map((c) => `${c.name} (${c.units})`).join(", ") || "ninguna ciudad con delivery"}.`}
                {off.length > 0 && ` Sin stock: ${off.map((c) => c.name).join(", ")}${courier?.ok ? " (ahí pueden pedir por encomienda)" : ""}.`}
                {courier && ` Encomiendas: ${courier.ok ? `desde ${courier.name} (${courier.units})` : `no salen (sin stock en ${courier.name})`}.`}
            </span>
        </Stack>
    );
};

/** .171: "Purchase según cómo paga el cliente" en todo el producto, con todas sus campañas (también las nuevas). */
const PurchaseByPaymentCard: React.FC<{ p: StoreFormProduct; t: Tokens; onSaved: (p: StoreFormProduct) => void }> = ({ p, t, onSaved }) => {
    const [saving, setSaving] = useState(false);
    const on = p.purchase_by_payment !== null;
    const toggle = async (value: boolean) => {
        setSaving(true);
        try {
            const res = await api<{ message: string; product: StoreFormProduct }>(`/store-form/products/${p.id}/purchase-mode`, "PUT", { on: value });
            toast.success(res.message);
            onSaved(res.product);
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    return (
        <Box>
            <FormControlLabel sx={{ m: 0, gap: 1, alignItems: "flex-start" }} disabled={saving}
                control={<Switch checked={on} onChange={(e) => toggle(e.target.checked)} />}
                label={<Box sx={{ pt: "7px" }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Purchase según cómo paga el cliente</Typography>
                    <Typography sx={{ fontSize: 13, color: on ? t.green : t.muted }}>
                        {on ? `Prendido desde el ${p.purchase_by_payment!.split("-").reverse().join("/")}, en todas sus campañas` : "Apagado: el Purchase sale al pedir, como siempre"}
                    </Typography>
                </Box>} />
            <Box component="ul" sx={{ fontSize: 14, m: 0, mt: 1.5, pl: 2.5, "& li": { mb: 0.5 } }}>
                <li><b>Paga ahora</b> (pago móvil o encomienda): el Purchase sale al pedir.</li>
                <li><b>Paga al recibir o con la asesora</b>: el Purchase sale cuando el pedido pasa a Entregado; si se cancela, nunca.</li>
            </Box>
            <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>
                Vale para todas las campañas del producto, también las que crees después. El sistema las sigue midiendo por pedidos (el C, el BE y las reglas no
                cambian). En el Administrador de anuncios vas a ver menos compras: es normal. Cómo va, en «¿Funciona?».
            </Typography>
        </Box>
    );
};

/** .171: el producto ahora (con "Purchase según cómo paga") contra el mismo producto antes, con los días ya cerrados. */
const ExperimentCard: React.FC<{ before: ExperimentArm | null; after: ExperimentNow; t: Tokens }> = ({ before, after, t }) => {
    const money = (v: number | null) => (v === null ? "—" : usdText(v));
    const pct = (v: number | null) => (v === null ? "—" : `${num(v)} %`);
    const rows: [string, (a: ExperimentArm) => string, string?][] = [
        ["Publicidad ÷ lo vendido", (a) => pct(a.ad_share), "El que decide: de lo que se entregó, cuánto se fue en publicidad."],
        ["Efectividad", (a) => pct(a.effectiveness), "Entregados ÷ cerrados."],
        ["Costo por pedido entregado", (a) => money(a.cost_per_delivered), "Gasto ÷ entregados."],
        ["Ganancia por día", (a) => money(a.profit_per_day), "Lo que dejan los pedidos menos el gasto, sin los gastos fijos."],
        ["Gasto", (a) => money(a.spend)],
        ["Pedidos · entregados", (a) => `${a.orders} · ${a.delivered}`],
    ];
    const [sent, delivered] = after.purchase_on_delivery;
    return (
        <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 }, overflowX: "auto" }}>
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 14, fontVariantNumeric: "tabular-nums", "& th, & td": { py: 0.75, borderBottom: `1px solid ${t.line}`, textAlign: "right", px: 1 }, "& th:first-of-type, & td:first-of-type": { textAlign: "left", pl: 0 } }}>
                <thead><tr><Box component="th" sx={{ fontWeight: 500, color: t.muted }} /><th>Antes</th><th>Ahora</th></tr></thead>
                <tbody>
                    {rows.map(([label, f, help]) => (
                        <tr key={label}>
                            <td><Box sx={{ fontWeight: 600 }}>{label}</Box>{help && <Box sx={{ fontSize: 12, color: t.muted }}>{help}</Box>}</td>
                            <td>{before ? f(before) : "—"}</td>
                            <td>{f(after)}</td>
                        </tr>
                    ))}
                </tbody>
            </Box>
            <Box component="ul" sx={{ fontSize: 13, color: t.muted, m: 0, mt: 1, pl: 2.5 }}>
                <li>Meta ve los pedidos: {pct(after.meta_sees)} (95 % o más; si no, los números del sistema fallan).</li>
                <li>Purchase que llegaron a Meta al entregar: {sent} de {delivered} entregados (meta: todos).</li>
                <li>Pagaron por adelantado: {after.prepaid}{after.courier ? ` (${after.courier} encomiendas)` : ""} · con asesora: {after.advisor}.</li>
            </Box>
        </Box>
    );
};

const PAYMENT_TEXT = { cod: "Al recibir", pago_movil: "Pagó por pago móvil", asesora: "Con asesora" } as const;
const CONFIRM_TEXT: Record<string, string> = { sent: "Se le confirmó el pago por WhatsApp", seller: "La vendedora confirma el pago", skip: "Cancelado",
    advisor: "Se le escribió para pagar con la asesora" }; // .181

/** Las ofertas de un producto, como en Releasit: título, etiqueta, unidades y % de descuento. */
const OffersEditor: React.FC<{ p: StoreFormProduct; rate: number; t: Tokens; onSaved: (p: StoreFormProduct) => void }> = ({ p, rate, t, onSaved }) => {
    const [list, setList] = useState<StoreFormOffer[]>(p.offers);
    const [saving, setSaving] = useState(false);
    const savedKey = JSON.stringify(p.offers);
    useEffect(() => setList(JSON.parse(savedKey) as StoreFormOffer[]), [savedKey]);
    const changed = JSON.stringify(list) !== savedKey;
    const edit = (i: number, x: Partial<StoreFormOffer>) => setList(list.map((o, j) => (j === i ? { ...o, ...x } : x.is_default ? { ...o, is_default: false } : o)));
    const move = (i: number, d: number) => { const n = [...list]; const [o] = n.splice(i, 1); n.splice(i + d, 0, o); setList(n); };
    const save = async () => {
        setSaving(true);
        try {
            const res = await api<{ message: string; product: StoreFormProduct }>(`/store-form/products/${p.id}/offers`, "PUT", { offers: list });
            toast.success(res.message);
            onSaved(res.product);
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    return (
        <Box>
            {list.length === 0 && <Typography sx={{ fontSize: 13, color: t.muted, mb: 1 }}>Sin ofertas, el formulario vende 1 unidad a {usdText(p.price)}.</Typography>}
            <Box component="ol" sx={{ p: 0, m: 0 }}>
                {list.map((o, i) => {
                    const usd = offerUsd(p.price, o.units, o.discount_pct);
                    return (
                        <Box component="li" key={i} sx={{ ...cardSx(t), p: 1.5, mb: 1, listStyle: "none", opacity: o.is_active ? 1 : 0.6 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <TextField size="small" label="Título" value={o.title ?? ""} fullWidth onChange={(e) => edit(i, { title: e.target.value })} placeholder="LLEVA 2 GALONES CON 25% DE DESCUENTO" />
                                <TextField size="small" label="Etiqueta" value={o.badge ?? ""} onChange={(e) => edit(i, { badge: e.target.value })} placeholder="🏆 LA OPCIÓN FAVORITA" sx={{ minWidth: 200 }} />
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                                <TextField size="small" type="number" label="Unidades" value={o.units} onChange={(e) => edit(i, { units: Number(e.target.value) })} sx={{ width: 110 }} slotProps={{ htmlInput: { min: 1, max: 10 } }} />
                                <TextField size="small" type="number" label="% descuento" value={o.discount_pct} onChange={(e) => edit(i, { discount_pct: Number(e.target.value) })} sx={{ width: 130 }} slotProps={{ htmlInput: { min: 0, max: 90 } }} />
                                <Typography sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>= {usdText(usd)} · hoy {bsText(usd * rate)}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                <FormControlLabel sx={{ m: 0 }} control={<Checkbox checked={o.is_default} onChange={(e) => edit(i, { is_default: e.target.checked })} />} label={<Typography sx={{ fontSize: 14 }}>Sale marcada</Typography>} />
                                <FormControlLabel sx={{ m: 0 }} control={<Checkbox checked={o.is_active} onChange={(e) => edit(i, { is_active: e.target.checked })} />} label={<Typography sx={{ fontSize: 14 }}>Activa</Typography>} />
                                <TextAction onClick={() => move(i, -1)} disabled={i === 0}>Subir</TextAction>
                                <TextAction onClick={() => move(i, 1)} disabled={i === list.length - 1}>Bajar</TextAction>
                                <TextAction onClick={() => setList(list.filter((_, j) => j !== i))}>Quitar</TextAction>
                            </Stack>
                        </Box>
                    );
                })}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" onClick={() => setList([...list, { units: list.length + 1, discount_pct: 0, title: "", badge: "", is_default: list.length === 0, is_active: true }])}
                    disabled={list.length >= 6} sx={{ ...lineSx(t), ...tapSx }}>Agregar oferta</Button>
                <Button variant="contained" disableElevation onClick={save} disabled={saving || !changed} sx={{ ...inkSx(t), ...tapSx }}>{saving ? "Guardando…" : "Guardar ofertas"}</Button>
            </Stack>
        </Box>
    );
};

/** El diseño del formulario en la landing de este producto, con su vista previa (lo guardado). */
const DesignEditor: React.FC<{ p: StoreFormProduct; data: Data; t: Tokens; onSaved: (p: StoreFormProduct) => void }> = ({ p, data, t, onSaved }) => {
    const [d, setD] = useState<StoreFormDesign>(p.design);
    const [saving, setSaving] = useState(false);
    const [size, setSize] = useState<"phone" | "pc">("phone");
    const [version, setVersion] = useState(0);
    const savedKey = JSON.stringify(p.design);
    useEffect(() => setD(JSON.parse(savedKey) as StoreFormDesign), [savedKey]);
    const changed = JSON.stringify(d) !== savedKey;
    const save = async () => {
        setSaving(true);
        try {
            const res = await api<{ message: string; product: StoreFormProduct }>(`/store-form/products/${p.id}/design`, "PUT", d);
            toast.success(res.message);
            onSaved(res.product);
            setVersion((v) => v + 1);
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    const srcDoc = useMemo(() => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>`
        + `<body style="margin:0;padding:12px;font-family:system-ui,sans-serif;background:#fff"><div id="nuviora-pedido"></div>`
        + `<script src="${data.base_url}/tienda/cargador.js?p=${p.shopify_id}&v=${version}" data-tasa="${data.rate}" data-prueba="1"></script></body></html>`, [data.base_url, data.rate, p.shopify_id, version]);
    return (
        <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Colores</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: 1 }}>
                {Object.keys(data.colors).map((k) => (
                    <Stack key={k} direction="row" spacing={1} alignItems="center">
                        <Box component="input" type="color" aria-label={COLOR_LABELS[k] ?? k} value={sixDigits(d.colors[k] ?? data.colors[k])}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, colors: { ...d.colors, [k]: e.target.value.toUpperCase() } })}
                            sx={{ width: 40, height: 32, p: 0, border: `1px solid ${t.line}`, borderRadius: "6px", bgcolor: "transparent", cursor: "pointer" }} />
                        <Typography sx={{ fontSize: 13 }}>{COLOR_LABELS[k] ?? k}</Typography>
                        {d.colors[k] && <TextAction onClick={() => { const c = { ...d.colors }; delete c[k]; setD({ ...d, colors: c }); }}>Volver al de siempre</TextAction>}
                    </Stack>
                ))}
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
                <TextField size="small" label="Letra (de Google Fonts)" value={d.font ?? ""} onChange={(e) => setD({ ...d, font: e.target.value || null })}
                    helperText="Vacío = la letra de tu página. Ejemplo: Poppins" />
                <TextField size="small" type="number" label="Bordes redondeados (px)" value={d.radius ?? ""} onChange={(e) => setD({ ...d, radius: e.target.value === "" ? null : Number(e.target.value) })}
                    slotProps={{ htmlInput: { min: 0, max: 30 } }} sx={{ maxWidth: 200 }} />
            </Stack>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 2 }}>Textos</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>Vacío = el de tu formulario de Releasit.</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: 1 }}>
                {Object.keys(data.texts).map((k) => (
                    <TextField key={k} size="small" label={TEXT_LABELS[k] ?? k} value={d.texts[k] ?? ""} placeholder={data.texts[k]}
                        onChange={(e) => setD({ ...d, texts: { ...d.texts, [k]: e.target.value } })} slotProps={{ htmlInput: { maxLength: 300 } }} />
                ))}
            </Box>
            <TextField label="CSS (opcional)" value={d.custom_css ?? ""} onChange={(e) => setD({ ...d, custom_css: e.target.value || null })} multiline minRows={3} fullWidth sx={{ mt: 2 }}
                helperText="Para ajustes finos, con las clases nvf-… (por ejemplo: #nuviora-pedido .nvf-title { letter-spacing: 1px })." slotProps={{ htmlInput: { maxLength: 20000, style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 13 } } }} />
            <Button variant="contained" disableElevation onClick={save} disabled={saving || !changed} sx={{ ...inkSx(t), ...tapSx, mt: 1.5 }}>{saving ? "Guardando…" : "Guardar diseño"}</Button>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Vista previa {changed && <Box component="span" sx={{ color: t.muted, fontWeight: 400 }}>(guarda para ver los cambios)</Box>}</Typography>
                <ToggleButtonGroup size="small" exclusive value={size} onChange={(_, v) => v && setSize(v)} aria-label="Tamaño de la vista previa">
                    <ToggleButton value="phone">Teléfono</ToggleButton>
                    <ToggleButton value="pc">Computadora</ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            <Box sx={{ ...cardSx(t), mt: 1, p: 1, bgcolor: t.soft, display: "flex", justifyContent: "center" }}>
                <Box component="iframe" key={`${version}-${size}`} title={`Vista previa del formulario de ${p.name}`} srcDoc={srcDoc}
                    sx={{ width: size === "phone" ? 390 : "100%", maxWidth: "100%", height: 760, border: 0, bgcolor: "#fff", borderRadius: "8px" }} />
            </Box>
            <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.5 }}>La vista previa no envía pedidos ni avisa a Meta. Usa la tasa del sistema; en tu landing usa la tuya.</Typography>
        </Box>
    );
};

/** El bloque para pegar en la landing, con los pasos. */
const SnippetCard: React.FC<{ data: Data; t: Tokens }> = ({ data, t }) => {
    const code = snippet(data.base_url);
    const test = /api-test|localhost|127\.0\.0\.1/.test(data.base_url);
    const copy = async () => {
        try { await navigator.clipboard.writeText(code); toast.success("Copiado"); } catch { toast.error("No se pudo copiar: selecciónalo y cópialo a mano."); }
    };
    return (
        <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ fontSize: 13 }}>
                <Box sx={{ pt: "5px" }}><Dot color={test ? t.amber : t.green} size={8} /></Box>
                <span>{test ? "Este es el código del servidor de pruebas: úsalo primero para tu pedido de prueba. El de producción te lo da esta misma página en nuviora.cloud."
                    : "Este es el código de producción: los pedidos entran a tu sistema de verdad."}</span>
            </Stack>
            <Box component="pre" sx={{ mt: 1.5, p: 1.5, bgcolor: t.soft, borderRadius: "8px", fontSize: 12.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", userSelect: "all", m: 0 }}>{code}</Box>
            <Button variant="contained" disableElevation startIcon={<ContentCopyRounded />} onClick={copy} sx={{ ...inkSx(t), ...tapSx, mt: 1.5 }}>Copiar</Button>
            <Box sx={{ mt: 2 }}>
                <NumberedSteps label="Cómo ponerlo" steps={[
                    "En Releasit, deja prendido el formulario en ese producto: es el respaldo si el nuestro falla.",
                    "En la landing del producto (su sección de Liquid), pega este bloque donde quieres el formulario, en vez del botón de Releasit.",
                    "Prende el formulario arriba, con tu tienda, el producto y las direcciones de tu tienda.",
                    "Haz un pedido de prueba con tu teléfono y revisa con Meta Pixel Helper que salgan InitiateCheckout, Purchase y Lead.",
                ]} />
            </Box>
        </Box>
    );
};

export const StoreFormPage: React.FC = () => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<(StoreFormSettingsInput & { capi_set: boolean }) | null>(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<number | null>(null);

    const load = useCallback(() => {
        setError(null);
        api<Data>("/store-form").then((d) => { setData(d); setForm({ ...d.settings, capi_token: "" }); }).catch((e) => setError((e as Error).message));
    }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const changed = !!data && !!form && (JSON.stringify({ ...form, capi_token: undefined, capi_token_clear: undefined }) !== JSON.stringify({ ...data.settings, capi_token: undefined, capi_token_clear: undefined })
        || !!form.capi_token || !!form.capi_token_clear);
    const save = async () => {
        if (!form) return;
        setSaving(true);
        try {
            const res = await api<{ message: string; settings: Settings }>("/store-form/settings", "PUT", form);
            toast.success(res.message);
            load();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    const replace = (p: StoreFormProduct) => data && setData({ ...data, selected: data.selected.map((x) => (x.id === p.id ? p : x)) });
    // .170: el Purchase "al entregar" de un pedido de prueba, sin entregarlo (solo con el código de prueba de eventos guardado)
    const testPurchase = async (id: number) => {
        if (!data) return;
        setTesting(id);
        try {
            const res = await api<{ message: string; orders: Data["orders"] }>(`/store-form/orders/${id}/test-purchase`, "POST");
            toast.success(res.message);
            setData({ ...data, orders: res.orders });
        } catch (e) { toast.error((e as Error).message); } finally { setTesting(null); }
    };
    const saveBar = (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" disableElevation onClick={save} disabled={saving || !changed} sx={{ ...inkSx(t), ...tapSx }}>{saving ? "Guardando…" : "Guardar ajustes"}</Button>
            {changed && data && <Button variant="outlined" onClick={() => setForm({ ...data.settings, capi_token: "" })} disabled={saving} sx={{ ...lineSx(t), ...tapSx }}>Deshacer</Button>}
        </Stack>
    );

    return (
        <Layout>
            <Box sx={{ ...geist, color: t.ink, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 1 }, py: 2, pb: 6 }}>
                <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Formulario de la tienda</Typography>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                    Nuestro formulario de pedido dentro de tu landing, ya abierto y con el diseño de cada una: los pedidos entran directo al sistema (WEB-12).
                    Si falla, tu landing muestra el de Releasit.
                </Typography>

                {error && !data ? (
                    <Box role="alert" sx={{ ...cardSx(t), p: 3, mt: 2.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudo abrir el formulario de la tienda</Typography></Stack>
                        <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                        <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
                    </Box>
                ) : loadingSession || !data || !form ? (
                    <Box aria-busy="true" aria-label="Cargando el formulario de la tienda">
                        <Skeleton variant="rounded" height={64} sx={{ mt: 2 }} />
                        {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={160} sx={{ mt: 1 }} />)}
                    </Box>
                ) : (
                    <>
                        <Scoreboard tiles={[
                            { label: "En la landing", value: data.settings.enabled ? "Prendido" : "Apagado", color: data.settings.enabled ? t.green : undefined,
                                help: "Apagado, tu landing muestra el formulario de Releasit. Lo prendes en «Ajustes»." },
                            { label: "Pedidos", value: data.kpis.window.orders, help: "Pedidos que entraron por el formulario desde el primero. Se decide a los 100 pedidos o a los 14 días." },
                            { label: "Día", value: data.kpis.window.orders ? `${Math.min(data.kpis.window.days, 14)} de 14` : "—", help: "Días desde el primer pedido del formulario." },
                        ]} />

                        {data.experiment.active && (
                            <Section dot={data.experiment.verdict.key === "go" ? t.green : data.experiment.verdict.key === "back" ? t.red : undefined}
                                name="Purchase según cómo paga" hint={data.experiment.days > 0
                                    ? `¿Funciona en ${data.experiment.product}? Días cerrados: ${data.experiment.days} (del ${data.experiment.from.split("-").reverse().join("/")} al ${data.experiment.to.split("-").reverse().join("/")})`
                                    : `¿Funciona en ${data.experiment.product}? Cuenta los días que ya cerraron (4 días después): todavía ninguno`}>
                                <Box role="status" sx={{ ...cardSx(t), ...appear, p: "12px 14px", mb: 1, display: "flex", gap: 1, alignItems: "flex-start" }}>
                                    <Box sx={{ pt: "6px" }}><Dot color={data.experiment.verdict.key === "go" ? t.green : data.experiment.verdict.key === "back" ? t.red : t.gray} size={8} /></Box>
                                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{data.experiment.verdict.text}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: 13, color: t.muted, mb: 1 }}>
                                    {data.experiment.basis === "own" && data.experiment.before
                                        ? `Antes: ${data.experiment.product} del ${data.experiment.before.from!.split("-").reverse().join("/")} al ${data.experiment.before.to!.split("-").reverse().join("/")} (sus últimos 14 días con anuncios), con el Purchase al pedir.`
                                        : data.experiment.basis === "launches"
                                            ? `Antes: el arranque de tus otros ${data.experiment.before?.products ?? 0} productos (sus primeros 14 días), con el Purchase al pedir: ${data.experiment.product} no tenía ventas de antes.`
                                            : "Todavía no hay ventas de antes con qué comparar."}
                                </Typography>
                                <ExperimentCard before={data.experiment.before} after={data.experiment.after} t={t} />
                            </Section>
                        )}

                        <Section dot={data.kpis.verdict.key === "go" ? t.green : data.kpis.verdict.key === "review" ? t.red : undefined} name="¿Funciona?" hint="Contra tus productos con Releasit en su arranque">
                            <Box role="status" sx={{ ...cardSx(t), ...appear, p: "12px 14px", mb: 1, display: "flex", gap: 1, alignItems: "flex-start" }}>
                                <Box sx={{ pt: "6px" }}><Dot color={data.kpis.verdict.key === "go" ? t.green : data.kpis.verdict.key === "review" ? t.red : t.gray} size={8} /></Box>
                                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{data.kpis.verdict.text}</Typography>
                            </Box>
                            <Box component="ul" sx={{ p: 0, m: 0 }}>{data.kpis.kpis.map((k) => <KpiRow key={k.key} k={k} t={t} />)}</Box>
                        </Section>

                        <Section name="Ajustes">
                            <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                <GeneralCard data={data} form={form} set={(f) => setForm({ ...form, ...f })} t={t} />
                                {saveBar}
                            </Box>
                        </Section>

                        {data.selected.map((p) => (
                            <React.Fragment key={p.id}>
                                <Section dot={p.warnings.length ? t.amber : undefined} name={`Ofertas de ${p.name}`} hint={`Precio en el sistema: ${usdText(p.price)}`}>
                                    {p.warnings.map((w) => (
                                        <Stack key={w} direction="row" spacing={0.75} alignItems="flex-start" sx={{ fontSize: 13, mb: 1 }}>
                                            <Box sx={{ pt: "5px" }}><Dot color={t.amber} size={8} /></Box><span>{w}</span>
                                        </Stack>
                                    ))}
                                    <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                        <OffersEditor p={p} rate={data.rate} t={t} onSaved={replace} />
                                    </Box>
                                    <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>
                                        Pagan al recibir en: {p.cities.length ? p.cities.map((c) => c.name).join(", ") : "ninguna ciudad (no tienes agencias activas para este producto): el formulario no sale"}.
                                    </Typography>
                                    <StockToday p={p} t={t} />
                                </Section>
                                <Section name="Cuándo sale el Purchase" hint={p.name}>
                                    <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                        <PurchaseByPaymentCard p={p} t={t} onSaved={replace} />
                                    </Box>
                                </Section>
                                <Section name={`Diseño de ${p.name}`} hint="Como tu landing">
                                    <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                        <DesignEditor p={p} data={data} t={t} onSaved={replace} />
                                    </Box>
                                </Section>
                            </React.Fragment>
                        ))}

                        <Section name="Pago anticipado, asesora y encomiendas">
                            <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                <PrepaidCard data={data} form={form} set={(f) => setForm({ ...form, ...f })} t={t} />
                                {saveBar}
                            </Box>
                        </Section>

                        {form.courier_enabled && (
                            <Section name="Oficinas de encomienda" hint="Las que ve el cliente">
                                <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                    <OfficesCard data={data} t={t} />
                                </Box>
                            </Section>
                        )}

                        <Section name="Meta" hint="Como en Releasit">
                            <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                <MetaCard data={data} form={form} set={setForm} t={t} />
                                {saveBar}
                            </Box>
                        </Section>

                        <Section name="Después del pedido" hint="Pasa a tu WhatsApp">
                            <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                <WhatsappCard form={form} set={(f) => setForm({ ...form, ...f })} t={t} />
                                {saveBar}
                            </Box>
                        </Section>

                        <Section name="Pegar en tu landing">
                            <SnippetCard data={data} t={t} />
                        </Section>

                        <Section name="Pedidos del formulario" hint="Los últimos 30">
                            {data.orders.length === 0 ? (
                                <Box sx={{ ...cardSx(t), p: 2 }}><Typography sx={{ fontSize: 14, color: t.muted }}>Todavía no entró ningún pedido por el formulario.</Typography></Box>
                            ) : (
                                <Box component="ul" sx={{ p: 0, m: 0 }}>
                                    {data.orders.map((o) => (
                                        <Box component="li" key={o.id} sx={{ ...cardSx(t), p: "12px 14px", mb: 1, listStyle: "none" }}>
                                            <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="baseline">
                                                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{o.name} · {o.product}</Typography>
                                                <Typography sx={{ fontSize: 12, color: t.muted, whiteSpace: "nowrap" }}>{dateTime(o.at)}</Typography>
                                            </Stack>
                                            <Stack direction="row" columnGap={1.25} rowGap={0.25} flexWrap="wrap" sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>
                                                <span>{o.units} {o.units === 1 ? "unidad" : "unidades"}</span>
                                                <span>{bsText(o.total_bs)} ({usdText(o.total_usd)})</span>
                                                <span>{o.courier ? `Encomienda ${o.courier}` : PAYMENT_TEXT[o.payment] ?? o.payment}</span>
                                                {o.express && <span>⚡ Express</span>}
                                                {o.city && <span>{o.city}</span>}
                                                {o.status && <span>{o.status}</span>}
                                                <span>{o.whatsapp ? "Pasó a WhatsApp" : "No pasó a WhatsApp"}</span>
                                                <span>{o.capi === "sent" ? (o.purchase_sent_at ? "Meta recibió la compra al entregar" : "Meta recibió la compra")
                                                    : o.capi === "failed" ? "Meta no recibió la compra"
                                                        : o.purchase_mode === "delivery" && o.payment !== "pago_movil" ? "La compra le llega a Meta al entregar" : "Sin API de Meta"}</span>
                                                {data.settings.capi_test_code && o.purchase_mode === "delivery" && o.payment !== "pago_movil" && o.capi !== "sent" && (
                                                    <TextAction onClick={() => testPurchase(o.id)} disabled={testing !== null} sx={{ fontSize: 13, color: t.ink }}>
                                                        {testing === o.id ? "Mandando…" : "Probar el Purchase al entregar"}
                                                    </TextAction>
                                                )}
                                                {o.confirm && CONFIRM_TEXT[o.confirm] && <span>{CONFIRM_TEXT[o.confirm]}</span>}
                                            </Stack>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Section>
                    </>
                )}
            </Box>
        </Layout>
    );
};
