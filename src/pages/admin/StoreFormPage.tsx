// src/pages/admin/StoreFormPage.tsx
// .164 (dueño, 2026-11-19: "vamos a utilizar solo nuestro nuevo formulario"; "necesito que estipulemos unos KPIs claros para
// saber si funciona o no"): "Formulario de la tienda" (/formulario-tienda). Responde "¿está funcionando nuestro formulario en
// la landing?": arriba los KPIs con la regla para decidir, y después todo para dejarlo listo: prenderlo, el producto y sus
// ofertas (como en Releasit), el diseño con vista previa, Meta (píxel y API de conversiones), el WhatsApp del final, el código
// para pegar en la landing y los pedidos que entraron por ahí. Si nuestro formulario falla, la landing muestra Releasit.
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
    bsText, COLOR_LABELS, offerUsd, snippet, StoreFormData as Data, StoreFormDesign, StoreFormKpi, StoreFormOffer, StoreFormProduct,
    StoreFormSettings as Settings, StoreFormSettingsInput, TEXT_LABELS, usdText, WA_CODES,
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
            helperText="Solo mientras pruebas en «Probar eventos» de Meta; después bórralo." sx={{ maxWidth: 360 }} />
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
        <Typography sx={{ fontSize: 13, color: t.muted }}>«Purchase» sale siempre al confirmar (en la página y por la API, con el mismo número: Meta no lo cuenta doble) y «Lead» al pasar a WhatsApp.</Typography>
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
                                </Section>
                                <Section name={`Diseño de ${p.name}`} hint="Como tu landing">
                                    <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                                        <DesignEditor p={p} data={data} t={t} onSaved={replace} />
                                    </Box>
                                </Section>
                            </React.Fragment>
                        ))}

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
                                                {o.express && <span>⚡ Express</span>}
                                                {o.city && <span>{o.city}</span>}
                                                {o.status && <span>{o.status}</span>}
                                                <span>{o.whatsapp ? "Pasó a WhatsApp" : "No pasó a WhatsApp"}</span>
                                                <span>{o.capi === "sent" ? "Meta lo recibió" : o.capi === "failed" ? "Meta no lo recibió" : "Sin API de Meta"}</span>
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
