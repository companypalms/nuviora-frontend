// src/pages/editor/ReferencesPage.tsx
// .92: la biblioteca de referencias, para los editores (/editor/referencias: ver y subir; el líder también quita) y para
// el dueño (/meta-ads/referencias: ver con los resultados y quitar). La pregunta: "¿De qué referencia parto?".
// Arriba, para el líder y el dueño, las que más ganan; después los filtros y todas, la más nueva primero. Cada una dice
// cuántas veces se usó y, con "Ver dónde se usó", en qué creativos.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { AddRounded, ReportProblemRounded, VideoLibraryRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api } from "../../components/meta-ads/metaAds";
import { ReferenceItem, ReferenceLibraryData } from "../../components/meta-ads/editorShared";
import { ReferenceCard, ReferenceViewer, UploadReferenceDialog, UsesDialog } from "../../components/meta-ads/references";
import { cardSx, geist, inkSx, tapSx, useTokens } from "../../components/ui/design";
import { Section } from "../../components/ui/designParts";

export const ReferencesPage: React.FC<{ owner?: boolean }> = ({ owner = false }) => {
    const t = useTokens();
    const base = owner ? "/meta" : "/editor";
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<ReferenceLibraryData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [product, setProduct] = useState("");
    const [type, setType] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uses, setUses] = useState<ReferenceItem | null>(null);
    const [view, setView] = useState<ReferenceItem | null>(null);

    const load = useCallback(() => {
        const q = new URLSearchParams();
        if (product) q.set("product_id", product);
        if (type) q.set("type", type);
        setError(null);
        api<ReferenceLibraryData>(`${base}/references${q.toString() ? `?${q}` : ""}`).then(setData).catch((e) => setError((e as Error).message));
    }, [base, product, type]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const archive = async (r: ReferenceItem) => {
        if (!window.confirm(`¿Quitar ${r.code} de la biblioteca? Los creativos que salieron de ella la siguen mostrando.`)) return;
        try { await api(`${base}/references/${r.id}`, "DELETE"); toast.success(`${r.code} quitada`); load(); } catch (e) { toast.error((e as Error).message); }
    };

    const frame = (children: React.ReactNode) => (
        <Layout><Box sx={{ ...geist, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 2 }, py: 2, color: t.ink }}>{children}</Box></Layout>
    );
    if (loadingSession || !isValid || (!data && !error)) {
        return frame(<Box aria-busy="true"><Skeleton width={180} height={34} /><Skeleton variant="rounded" height={48} sx={{ mt: 2 }} />
            {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={170} sx={{ mt: 1.5 }} />)}</Box>);
    }
    if (error && !data) {
        return frame(
            <Box role="alert" sx={{ ...cardSx(t), p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} /><Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudo abrir la biblioteca</Typography></Stack>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
            </Box>,
        );
    }
    const d = data!;
    const filtered = !!(product || type);
    return frame(
        <>
            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Referencias</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>
                Videos que ya funcionan, de otros anunciantes, para inspirar tus piezas.{owner ? "" : " Súbelas aquí y, al entregar, di de cuál salió cada pieza."}
            </Typography>
            {!owner && (
                <Button variant="contained" disableElevation startIcon={<AddRounded />} onClick={() => setUploading(true)} disabled={!d.uploads}
                    sx={{ ...inkSx(t), ...tapSx, mt: 2, width: { xs: "100%", sm: "auto" } }}>Subir una referencia</Button>
            )}
            {!d.uploads && <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>Para subir referencias hace falta el almacén de archivos conectado.</Typography>}

            {d.results && d.top.length > 0 && !filtered && (
                <Section name="Las que más ganan" hint="solo las ven el líder y el dueño" mt={3}>
                    <Stack spacing={1}>
                        {d.top.map((r) => <ReferenceCard key={`top-${r.id}`} r={r} onUses={() => setUses(r)} onView={() => setView(r)} />)}
                    </Stack>
                </Section>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 3 }}>
                <TextField select size="small" label="Producto" value={product} onChange={(e) => setProduct(e.target.value)} sx={{ flex: 1 }}
                    SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                    <MenuItem value="">Todos</MenuItem>
                    {d.products.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name} (y las de cualquier producto)</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Tipo de video" value={type} onChange={(e) => setType(e.target.value)} sx={{ flex: 1 }}
                    SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                    <MenuItem value="">Todos</MenuItem>
                    {Object.entries(d.types).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                </TextField>
            </Stack>

            <Section name={filtered ? "Las que coinciden" : "Todas"} hint={`${d.references.length}`} mt={2}>
                {d.references.length === 0 ? (
                    <Box sx={{ ...cardSx(t), p: 3, textAlign: "center" }}>
                        <VideoLibraryRounded sx={{ fontSize: 36, color: t.faint }} />
                        <Typography sx={{ fontSize: 15, fontWeight: 600, mt: 1 }}>{filtered ? "Ninguna con esos filtros" : "Todavía no hay referencias"}</Typography>
                        <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>
                            {filtered ? "Prueba con otro producto o tipo." : owner ? "Las suben los editores." : "Sube la primera: el video y el link de donde salió."}
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {d.references.map((r) => (
                            <ReferenceCard key={r.id} r={r} onUses={() => setUses(r)} onView={() => setView(r)} onArchive={r.can_archive ? () => archive(r) : undefined} />
                        ))}
                    </Stack>
                )}
            </Section>

            <UsesDialog reference={uses} base={base} onClose={() => setUses(null)} />
            <ReferenceViewer r={view} onClose={() => setView(null)} />
            {!owner && (
                <UploadReferenceDialog open={uploading} products={d.products} types={d.types} productId={product ? Number(product) : null}
                    onClose={() => setUploading(false)} onCreated={() => load()} />
            )}
        </>,
    );
};
