// src/pages/admin/StoreChatPage.tsx
// .158 (dueño, 2026-11-18: "que sepa todo sobre los productos, y pueda responderle a los clientes con IA, sin alucinar ni nada
// parecido, y siempre llevando al cliente a que llene el formulario"): "Chat de la tienda" (/chat-tienda). Responde "¿qué le
// diría el chat a un cliente y en qué productos está?": el chat de prueba (como si fueras un cliente), el examen de cada
// producto (ExamSection), los ajustes, lo que no supo responder y las conversaciones. El botón en la tienda llega con la .159.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, ButtonBase, Checkbox, FormControlLabel, Link, MenuItem, Skeleton, Stack, Switch, TextField, Typography } from "@mui/material";
import { ReportProblemRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { appear, cardSx, geist, inkSx, lineSx, plural, tapSx, Tokens, useTokens } from "../../components/ui/design";
import { Dot, Scoreboard, Section, TextAction } from "../../components/ui/designParts";
import { ExamSection } from "../../components/store-chat/ExamSection";
import { ChatMessage as Message, Conversation, StoreChatData as Data, StoreChatSettings as Settings } from "../../components/store-chat/storeChat";

const bs = (n: number) => `${n.toLocaleString("es-VE", { maximumFractionDigits: 0 })} Bs`;
const fichaLink = (id: number) => `/admin/integraciones?seccion=meta&tab=profile&producto=${id}`;
const newVisitor = () => `prueba-${Math.random().toString(36).slice(2, 12)}`;

/** Lo que pasó con una respuesta, en palabras: solo se muestra si no fue una respuesta normal. */
const statusText = (m: Pick<Message, "status" | "reason">): string | null => ({
    answered: null,
    unknown: "No lo sabía: dijo que lo confirma la asesora",
    blocked: `La revisión la paró (${m.reason ?? "algo que no está en los datos"}) y salió la respuesta segura`,
    failed: "La IA falló: el cliente ve «intenta de nuevo»",
    limit: "Se llegó a un tope: salió el mensaje fijo",
}[m.status]);

const Bubble: React.FC<{ m: Message; t: Tokens }> = ({ m, t }) => {
    const note = statusText(m);
    return (
        <Box sx={{ ...appear }}>
            <Box sx={{ ml: "auto", maxWidth: "85%", width: "fit-content", bgcolor: t.ink, color: t.onInk, borderRadius: "12px 12px 4px 12px", px: 1.5, py: 1, fontSize: 14, overflowWrap: "anywhere" }}>
                {m.question}
            </Box>
            <Box sx={{ mt: 0.75, maxWidth: "85%", width: "fit-content", bgcolor: t.soft, borderRadius: "12px 12px 12px 4px", px: 1.5, py: 1, fontSize: 14, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
                {m.answer}
            </Box>
            {note && (
                <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 0.5, fontSize: 12, color: t.muted }}>
                    <Box sx={{ pt: "4px" }}><Dot color={m.status === "unknown" ? t.amber : t.red} size={8} /></Box>
                    <span>{note}</span>
                </Stack>
            )}
            {m.raw && <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.25, overflowWrap: "anywhere" }}>Lo que había escrito la IA: «{m.raw}»</Typography>}
        </Box>
    );
};

/** Lo que el cliente ve abajo de cada respuesta: el texto fijo y el botón del formulario. */
const OrderBox: React.FC<{ note: string; button: string; ready: boolean; t: Tokens }> = ({ note, button, ready, t }) => (
    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: "10px", border: `1px solid ${ready ? t.green : t.line}`, bgcolor: ready ? t.greenSoft : "transparent" }}>
        <Typography sx={{ fontSize: 13 }}>{note}</Typography>
        <Box aria-hidden sx={{ ...inkSx(t), mt: 1, py: 1.25, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{button}</Box>
        <Typography sx={{ fontSize: 12, color: t.muted, mt: 0.75 }}>
            {ready ? "El cliente se ve decidido: en la tienda este botón se destaca." : "Así lo ve el cliente en la tienda (aquí el botón no hace nada)."}
        </Typography>
    </Box>
);

const TryChat: React.FC<{ data: Data; t: Tokens; onAsked: () => void }> = ({ data, t, onAsked }) => {
    const [productId, setProductId] = useState<number | "">(data.products[0]?.id ?? "");
    const [visitor, setVisitor] = useState(newVisitor);
    const [messages, setMessages] = useState<Message[]>([]);
    const [question, setQuestion] = useState("");
    const [asking, setAsking] = useState(false);
    const end = useRef<HTMLDivElement>(null);
    useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

    const restart = (id: number | "" = productId) => { setProductId(id); setVisitor(newVisitor()); setMessages([]); };
    const send = async () => {
        const q = question.trim();
        if (!q || productId === "" || asking) return;
        setAsking(true);
        try {
            const m = await api<Message>("/store-chat/test", "POST", { product_id: productId, question: q, visitor });
            setMessages((list) => [...list, m]);
            setQuestion("");
            onAsked();
        } catch (e) { toast.error((e as Error).message); } finally { setAsking(false); }
    };
    const last = messages[messages.length - 1];

    if (data.products.length === 0) {
        return (
            <Box sx={{ ...cardSx(t), p: 2 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Ningún producto tiene ficha</Typography>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>El chat solo sabe lo que dice la ficha. Llénala en Integraciones › Meta Ads › Ficha del producto.</Typography>
            </Box>
        );
    }
    return (
        <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField select size="small" label="Producto" value={productId} onChange={(e) => restart(Number(e.target.value))} sx={{ flex: 1 }}>
                    {data.products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
                {messages.length > 0 && <TextAction onClick={() => restart()} sx={{ color: t.muted, alignSelf: { xs: "flex-start", sm: "center" } }}>Empezar de nuevo</TextAction>}
            </Stack>
            {data.mode === "example" && (
                <Typography sx={{ fontSize: 12, color: t.muted, mt: 1 }}>En esta PC no hay IA: las respuestas son de ejemplo, armadas con la ficha.</Typography>
            )}
            {data.mode === "unavailable" && (
                <Typography role="alert" sx={{ fontSize: 13, color: t.red, mt: 1 }}>La IA no está disponible en el servidor: el chat no puede responder.</Typography>
            )}

            <Box aria-live="polite" sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
                {messages.length === 0 ? (
                    <Typography sx={{ fontSize: 14, color: t.muted }}>
                        Escribe como si fueras un cliente: «¿Cuánto cuesta?», «¿Cuánto es en dólares?», «¿Llega a Mérida?», «¿Sirve para…?». Las pruebas
                        quedan marcadas y no cuentan como clientes.
                    </Typography>
                ) : messages.map((m) => <Bubble key={m.id} m={m} t={t} />)}
                {asking && <Skeleton variant="rounded" height={44} sx={{ maxWidth: "70%" }} aria-label="La IA está respondiendo" />}
                <div ref={end} />
            </Box>
            {last && <OrderBox note={last.note} button={last.button} ready={last.ready} t={t} />}

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} component="form" onSubmit={(e) => { e.preventDefault(); send(); }}>
                <TextField size="small" fullWidth value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Escribe una pregunta de cliente"
                    slotProps={{ htmlInput: { maxLength: 400, "aria-label": "Pregunta de prueba" } }} disabled={asking} />
                <Button type="submit" variant="contained" disableElevation disabled={asking || !question.trim()} sx={{ ...inkSx(t), ...tapSx, flex: "none" }}>
                    {asking ? "…" : "Enviar"}
                </Button>
            </Stack>
        </Box>
    );
};

const SettingsCard: React.FC<{ data: Data; t: Tokens; onSaved: (d: Settings) => void }> = ({ data, t, onSaved }) => {
    const [form, setForm] = useState<Settings>(data.settings);
    const [saving, setSaving] = useState(false);
    // Al volver a cargar la página (después de cada prueba) no se pierde lo que estás cambiando: solo si lo guardado cambió
    const saved = JSON.stringify(data.settings);
    useEffect(() => setForm(JSON.parse(saved) as Settings), [saved]);
    const changed = JSON.stringify(form) !== JSON.stringify(data.settings);
    const toggle = (id: number) => setForm((f) => ({ ...f, product_ids: f.product_ids.includes(id) ? f.product_ids.filter((x) => x !== id) : [...f.product_ids, id] }));
    const save = async () => {
        setSaving(true);
        try {
            const res = await api<{ message: string; settings: Settings }>("/store-chat/settings", "PUT", form);
            toast.success(res.message);
            onSaved(res.settings);
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
            <FormControlLabel sx={{ m: 0, gap: 1 }} label={<Typography sx={{ fontSize: 15, fontWeight: 600 }}>Prendido en la tienda</Typography>}
                control={<Switch checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />} />
            <Typography sx={{ fontSize: 13, color: t.muted }}>
                Apagado, ningún cliente lo ve. El botón en la tienda llega con la próxima versión: por ahora esto solo deja todo listo.
            </Typography>

            <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 2 }}>En qué productos</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>Para la comparación con y sin botón, empieza con uno. Solo aparecen los que tienen ficha.</Typography>
            <Stack sx={{ mt: 0.5 }}>
                {data.products.map((p) => (
                    <FormControlLabel key={p.id} sx={{ m: 0, minHeight: 44 }} control={<Checkbox checked={form.product_ids.includes(p.id)} onChange={() => toggle(p.id)} />}
                        label={<Box component="span" sx={{ fontSize: 14 }}>{p.name}<Box component="span" sx={{ color: t.muted }}>{p.price_bs !== null ? ` · hoy ${bs(p.price_bs)}` : " · sin precio en Bs hoy"}</Box></Box>} />
                ))}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
                <TextField size="small" type="number" label="Respuestas por día (todas)" value={form.daily_answers}
                    onChange={(e) => setForm({ ...form, daily_answers: Number(e.target.value) })} helperText="Para que nadie te gaste la IA" slotProps={{ htmlInput: { min: 10, max: 5000 } }} />
                <TextField size="small" type="number" label="Preguntas por cliente al día" value={form.per_visitor}
                    onChange={(e) => setForm({ ...form, per_visitor: Number(e.target.value) })} helperText="Luego le sale el botón del pedido" slotProps={{ htmlInput: { min: 3, max: 100 } }} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" disableElevation onClick={save} disabled={saving || !changed} sx={{ ...inkSx(t), ...tapSx }}>{saving ? "Guardando…" : "Guardar"}</Button>
                {changed && <Button variant="outlined" onClick={() => setForm(data.settings)} disabled={saving} sx={{ ...lineSx(t), ...tapSx }}>Deshacer</Button>}
            </Stack>
        </Box>
    );
};

const ConversationRow: React.FC<{ c: Conversation; t: Tokens }> = ({ c, t }) => {
    const [open, setOpen] = useState(false);
    return (
        <Box component="li" sx={{ ...cardSx(t), mb: 1, listStyle: "none", overflow: "hidden" }}>
            <ButtonBase onClick={() => setOpen(!open)} aria-expanded={open} sx={{ width: "100%", textAlign: "left", p: "12px 14px", display: "block", minHeight: 48 }}>
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="baseline">
                    <Typography sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{c.product}</Typography>
                    <Typography sx={{ fontSize: 12, color: t.muted, whiteSpace: "nowrap" }}>{dateTime(c.at)}</Typography>
                </Stack>
                <Stack direction="row" columnGap={1.25} flexWrap="wrap" sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>
                    <span>{plural(c.questions, "pregunta", "preguntas")}</span>
                    {c.test && <span>Prueba tuya</span>}
                    {c.unanswered && <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><Dot color={t.amber} size={8} />algo no supo</Box>}
                    <Box component="span" sx={{ color: t.ink }}>{open ? "Ocultar" : "Leer"}</Box>
                </Stack>
            </ButtonBase>
            {open && (
                <Box sx={{ px: "14px", pb: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {c.messages.map((m) => <Bubble key={m.id} m={m} t={t} />)}
                </Box>
            )}
        </Box>
    );
};

export const StoreChatPage: React.FC = () => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setError(null);
        api<Data>("/store-chat").then(setData).catch((e) => setError((e as Error).message));
    }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const rate = data?.rate;
    return (
        <Layout>
            <Box sx={{ ...geist, color: t.ink, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 1 }, py: 2, pb: 6 }}>
                <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Chat de la tienda</Typography>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                    La IA responde las dudas de los clientes en la página del producto, solo con lo que dice su ficha, da el precio solo en bolívares y los
                    lleva a hacer su pedido. Lo que no sabe no lo inventa: dice que lo confirma la asesora.
                </Typography>

                {error && !data ? (
                    <Box role="alert" sx={{ ...cardSx(t), p: 3, mt: 2.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudo abrir el chat de la tienda</Typography></Stack>
                        <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                        <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
                    </Box>
                ) : loadingSession || !data || !rate ? (
                    <Box aria-busy="true" aria-label="Cargando el chat de la tienda">
                        <Skeleton variant="rounded" height={64} sx={{ mt: 2 }} />
                        {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={160} sx={{ mt: 1 }} />)}
                    </Box>
                ) : (
                    <>
                        <Scoreboard tiles={[
                            { label: "En la tienda", value: data.settings.enabled ? "Prendido" : "Apagado", color: data.settings.enabled ? t.green : undefined,
                                help: "Apagado, ningún cliente ve el chat. Lo prendes en «Ajustes», abajo." },
                            { label: "Respuestas hoy", value: `${data.today.answers} de ${data.today.cap}`, color: data.today.answers >= data.today.cap ? t.red : undefined,
                                help: "Las de los clientes y las tuyas de prueba. Al llegar al tope, el cliente ve el botón del pedido sin respuesta de la IA." },
                            { label: "No supo responder", value: data.unanswered.length, color: data.unanswered.length ? t.amber : undefined,
                                help: "Preguntas de los últimos 30 días que no estaban en la ficha o que la revisión paró. Agrégalas a la ficha y la próxima vez sí sabe." },
                        ]} />

                        <Box role="status" sx={{ ...cardSx(t), p: "12px 14px", mt: 2, display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <Box sx={{ pt: "6px" }}><Dot color={rate.binance && rate.fresh ? t.green : t.amber} size={8} /></Box>
                            <Typography sx={{ fontSize: 14 }}>
                                {rate.binance === null ? "No hay tasa Binance cargada: el chat no da precio en bolívares. Cárgala en Configuración › Tasa y pagos."
                                    : rate.fresh ? `Precio en bolívares con la tasa Binance de ${rate.binance.toLocaleString("es-VE")} Bs (${dateTime(rate.at)}).`
                                        : `La tasa Binance es de ${dateTime(rate.at)}: con más de un día, el chat no da precio en bolívares hasta que la actualices en Configuración › Tasa y pagos.`}
                            </Typography>
                        </Box>

                        <Section name="Pruébalo" hint="Como si fueras un cliente">
                            <TryChat data={data} t={t} onAsked={load} />
                        </Section>

                        <Section name="Examen del chat" hint="Preguntas difíciles, capciosas y maliciosas">
                            <ExamSection data={data} t={t} onChanged={load} />
                        </Section>

                        <Section name="Ajustes">
                            <SettingsCard data={data} t={t} onSaved={(s) => setData({ ...data, settings: s })} />
                        </Section>

                        <Section dot={data.unanswered.length ? t.amber : undefined} name="Lo que no supo responder" hint="Últimos 30 días">
                            {data.unanswered.length === 0 ? (
                                <Box sx={{ ...cardSx(t), p: 2 }}><Typography sx={{ fontSize: 14, color: t.muted }}>Nada por ahora: todo lo que preguntaron estaba en la ficha.</Typography></Box>
                            ) : (
                                <>
                                    <Typography sx={{ fontSize: 13, color: t.muted, mb: 1 }}>
                                        Agrega la respuesta en «Información clave» de la ficha del producto y la próxima vez sí sabe.
                                    </Typography>
                                    <Box component="ul" sx={{ p: 0, m: 0 }}>
                                        {data.unanswered.map((u) => (
                                            <Box component="li" key={u.id} sx={{ ...cardSx(t), p: "12px 14px", mb: 1, listStyle: "none" }}>
                                                <Typography sx={{ fontSize: 15, overflowWrap: "anywhere" }}>«{u.question}»</Typography>
                                                <Stack direction="row" columnGap={1.25} rowGap={0.25} flexWrap="wrap" sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>
                                                    <span>{u.product}</span>
                                                    <span>{dateTime(u.at)}</span>
                                                    {u.test && <span>Prueba tuya</span>}
                                                    <span>{u.status === "blocked" ? `La revisión la paró: ${u.reason}` : "No lo sabía"}</span>
                                                </Stack>
                                                {u.product_id !== null && (
                                                    <Link component={RouterLink} to={fichaLink(u.product_id)} sx={{ display: "inline-block", mt: 0.5, fontSize: 13, color: t.ink, textUnderlineOffset: 3 }}>
                                                        Abrir la ficha
                                                    </Link>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            )}
                        </Section>

                        <Section name="Conversaciones" hint="Las últimas 30">
                            {data.conversations.length === 0 ? (
                                <Box sx={{ ...cardSx(t), p: 2 }}><Typography sx={{ fontSize: 14, color: t.muted }}>Todavía no hay conversaciones.</Typography></Box>
                            ) : (
                                <Box component="ul" sx={{ p: 0, m: 0 }}>{data.conversations.map((c) => <ConversationRow key={c.id} c={c} t={t} />)}</Box>
                            )}
                        </Section>
                    </>
                )}
            </Box>
        </Layout>
    );
};
