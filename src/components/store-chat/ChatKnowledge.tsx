// src/components/store-chat/ChatKnowledge.tsx
// .159 (dueño, 2026-11-18: "una parte donde yo pueda colocar más detalles sobre el producto… que la inteligencia artificial
// tenga más de dónde agarrar información"): los "Más detalles" de cada producto, que solo lee el chat de la tienda y valen
// igual que la ficha. Se cambian en "Chat de la tienda › Lo que sabe el chat" (con la ficha a la vista) y en la ficha del
// producto (Integraciones › Meta Ads › Ficha del producto): es el mismo texto.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Link, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../meta-ads/metaAds";
import { cardSx, inkSx, tapSx, Tokens } from "../ui/design";
import { ChatKnowledge, StoreChatProduct } from "./storeChat";

const fichaLink = (id: number) => `/admin/integraciones?seccion=meta&tab=profile&producto=${id}`;

/** El recuadro de los "Más detalles", con su contador y "Guardar" (con t, el botón de tinta de las pantallas rehechas). */
const DetailsBox: React.FC<{ k: ChatKnowledge; onSaved: (details: string) => void; t?: Tokens }> = ({ k, onSaved, t }) => {
    const [text, setText] = useState(k.details);
    const [saving, setSaving] = useState(false);
    useEffect(() => setText(k.details), [k.details, k.product_id]);
    const changed = text.trim() !== k.details.trim();

    if (!k.has_profile) {
        return <Alert severity="info">Guarda primero la ficha de {k.name} (Qué es, Para qué sirve y Cómo funciona): después le agregas los detalles.</Alert>;
    }
    const save = async () => {
        setSaving(true);
        try {
            const res = await api<{ message: string }>(`/store-chat/products/${k.product_id}/details`, "PUT", { details: text });
            toast.success(res.message);
            onSaved(text.trim());
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    return (
        <Box>
            <TextField label="Más detalles" value={text} onChange={(e) => setText(e.target.value)} fullWidth multiline minRows={6} maxRows={24}
                placeholder="Pega aquí todo lo que quieras que el chat sepa: preguntas frecuentes, cómo se usa, tallas, materiales, resultados, lo que dicen tus clientes…"
                slotProps={{ htmlInput: { maxLength: k.max } }}
                helperText={`${text.length.toLocaleString("es-VE")} de ${k.max.toLocaleString("es-VE")} letras. El chat lo da por cierto, igual que la ficha. Los editores no lo ven.`} />
            <Button variant="contained" disableElevation onClick={save} disabled={saving || !changed} sx={{ mt: 1, ...tapSx, ...(t ? inkSx(t) : { borderRadius: "10px" }) }}>
                {saving ? "Guardando…" : "Guardar los detalles"}
            </Button>
        </Box>
    );
};

const useKnowledge = (productId: number | null) => {
    const [k, setK] = useState<ChatKnowledge | null>(null);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(() => {
        if (!productId) return;
        setError(null);
        api<ChatKnowledge>(`/store-chat/products/${productId}/knowledge`).then(setK).catch((e) => setError((e as Error).message));
    }, [productId]);
    useEffect(() => { setK(null); load(); }, [load]);

    return { k, error, setK };
};

/** Para la ficha del producto: solo el recuadro de los detalles. */
export const ChatDetailsEditor: React.FC<{ productId: number }> = ({ productId }) => {
    const { k, error, setK } = useKnowledge(productId);
    if (error) return <Alert severity="error">No se pudieron abrir los detalles: {error}</Alert>;
    if (!k) return <Skeleton variant="rounded" height={160} />;

    return <DetailsBox k={k} onSaved={(details) => setK({ ...k, details })} />;
};

/** "Chat de la tienda › Lo que sabe el chat": la ficha a la vista y los detalles, por producto. */
export const ChatKnowledgeSection: React.FC<{ products: StoreChatProduct[]; t: Tokens }> = ({ products, t }) => {
    const [productId, setProductId] = useState<number | null>(products[0]?.id ?? null);
    const { k, error, setK } = useKnowledge(productId);
    if (products.length === 0) return null;

    return (
        <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
            <TextField select size="small" label="Producto" value={productId ?? ""} onChange={(e) => setProductId(Number(e.target.value))} fullWidth>
                {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            {error && <Alert severity="error" sx={{ mt: 1.5 }}>No se pudo abrir: {error}</Alert>}
            {!k && !error && <Skeleton variant="rounded" height={220} sx={{ mt: 1.5 }} />}
            {k && (
                <>
                    <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600, mt: 2 }}>Su ficha</Typography>
                    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                        {Object.entries(k.labels).map(([key, label]) => (
                            <Typography key={key} sx={{ fontSize: 14, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>
                                <Box component="span" sx={{ color: t.muted }}>{label}: </Box>{k.ficha[key]?.trim() || "—"}
                            </Typography>
                        ))}
                    </Stack>
                    <Link component={RouterLink} to={fichaLink(k.product_id)} sx={{ display: "inline-block", mt: 0.75, fontSize: 13, color: t.ink, textUnderlineOffset: 3 }}>
                        Cambiar la ficha
                    </Link>
                    <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600, mt: 2, mb: 1 }}>Más detalles (solo para el chat)</Typography>
                    <DetailsBox k={k} onSaved={(details) => setK({ ...k, details })} t={t} />
                </>
            )}
        </Box>
    );
};
