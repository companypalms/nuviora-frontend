// src/components/store-chat/ExamSection.tsx
// .158 "Examen del chat" (dueño, 2026-11-18: "vamos a hacerles preguntas difíciles, capciosas, maliciosas y correctas para
// asegurarnos que todo esté bien… yo debo poder modificar y añadir preguntas a ese examen"): eliges un producto, el chat
// responde una por una las preguntas del examen y cada respuesta sale con ✓ o ⚠ y el porqué; al final, el puntaje. Abajo,
// las preguntas: cambiarlas, quitarlas y agregar.
import React, { useRef, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
import { toast } from "react-toastify";
import { api, dateTime } from "../meta-ads/metaAds";
import { appear, cardSx, geist, inkSx, lineSx, plural, tapSx, Tokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";
import { ExamQuestion, ExamResult, StoreChatData } from "./storeChat";

type Draft = { id: number | null; group: string; question: string; expect: string };

const okColor = (ok: boolean | null, t: Tokens) => (ok ? t.green : t.amber);

const ResultRow: React.FC<{ r: ExamResult; groups: Record<string, string>; t: Tokens }> = ({ r, groups, t }) => (
    <Box component="li" sx={{ ...cardSx(t), ...appear, p: "12px 14px", mb: 1, listStyle: "none" }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ pt: "6px" }}><Dot color={okColor(r.ok, t)} size={10} /></Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, color: t.muted }}>{groups[r.group] ?? r.group} · {r.ok ? "Bien" : "Revísala"}</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>«{r.question}»</Typography>
                {r.answer && (
                    <Box sx={{ mt: 0.75, bgcolor: t.soft, borderRadius: "10px", px: 1.5, py: 1, fontSize: 14, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{r.answer}</Box>
                )}
                <Typography sx={{ fontSize: 13, mt: 0.5, color: r.ok ? t.muted : t.ink }}>{r.grade}</Typography>
                {r.raw && <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.25, overflowWrap: "anywhere" }}>Lo que había escrito la IA: «{r.raw}»</Typography>}
            </Box>
        </Stack>
    </Box>
);

export const ExamSection: React.FC<{ data: StoreChatData; t: Tokens; onChanged: () => void }> = ({ data, t, onChanged }) => {
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const { groups, expects, questions } = data.exam;
    const [productId, setProductId] = useState<number | "">(data.products[0]?.id ?? "");
    const [results, setResults] = useState<ExamResult[]>([]);
    const [total, setTotal] = useState(0);
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const stop = useRef(false);
    const [showQuestions, setShowQuestions] = useState(false);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [removing, setRemoving] = useState<ExamQuestion | null>(null);
    const [saving, setSaving] = useState(false);

    const product = data.products.find((p) => p.id === productId);
    const ok = results.filter((r) => r.ok).length;

    const take = async () => {
        if (productId === "" || running) return;
        stop.current = false;
        setResults([]);
        setFinished(false);
        setRunning(true);
        try {
            const start = await api<{ run: string; questions: ExamQuestion[] }>("/store-chat/exam/start", "POST", { product_id: productId });
            setTotal(start.questions.length);
            for (const q of start.questions) {
                if (stop.current) break;
                try {
                    const r = await api<ExamResult>("/store-chat/exam/ask", "POST", { product_id: productId, run: start.run, question_id: q.id });
                    setResults((list) => [...list, r]);
                } catch (e) {
                    setResults((list) => [...list, { ...q, question_id: q.id, id: -q.id, answer: "", status: "failed", reason: null, raw: null, ready: false,
                        note: "", button: "", ok: false, grade: `No respondió: ${(e as Error).message}` }]);
                }
            }
            setFinished(true);
            onChanged();
        } catch (e) { toast.error((e as Error).message); } finally { setRunning(false); }
    };

    const saveDraft = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            const body = { group: draft.group, question: draft.question, expect: draft.expect };
            const res = draft.id === null
                ? await api<{ message: string }>("/store-chat/exam/questions", "POST", body)
                : await api<{ message: string }>(`/store-chat/exam/questions/${draft.id}`, "PUT", body);
            toast.success(res.message);
            setDraft(null);
            onChanged();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    const remove = async () => {
        if (!removing) return;
        setSaving(true);
        try {
            const res = await api<{ message: string }>(`/store-chat/exam/questions/${removing.id}`, "DELETE");
            toast.success(res.message);
            setRemoving(null);
            onChanged();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    if (data.products.length === 0) return null;
    const passed = finished && results.length === total && ok === total;
    return (
        <>
            <Box sx={{ ...cardSx(t), p: { xs: 1.5, sm: 2 } }}>
                <Typography sx={{ fontSize: 14 }}>
                    El chat responde solo {plural(questions.length, "pregunta", "preguntas")}: correctas, difíciles, capciosas y maliciosas. Cada respuesta sale
                    con ✓ si hizo lo que debía o ⚠ para que la leas. Los exámenes no cuentan como clientes ni para el tope del día.
                </Typography>
                {data.mode === "example" && (
                    <Typography sx={{ fontSize: 12, color: t.muted, mt: 0.75 }}>En esta PC no hay IA: el examen usa respuestas de ejemplo y muchas salen ⚠.</Typography>
                )}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mt: 1.5 }}>
                    <TextField select size="small" label="Producto" value={productId} onChange={(e) => { setProductId(Number(e.target.value)); setResults([]); setFinished(false); }}
                        disabled={running} sx={{ flex: 1 }}>
                        {data.products.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                                {p.name}{p.last_exam ? ` · último: ${p.last_exam.ok} de ${p.last_exam.total}` : " · sin examen"}
                            </MenuItem>
                        ))}
                    </TextField>
                    {running ? (
                        <Button variant="outlined" onClick={() => { stop.current = true; }} sx={{ ...lineSx(t), ...tapSx, flex: "none" }}>Parar</Button>
                    ) : (
                        <Button variant="contained" disableElevation onClick={take} disabled={productId === "" || questions.length === 0} sx={{ ...inkSx(t), ...tapSx, flex: "none" }}>
                            Tomar el examen
                        </Button>
                    )}
                </Stack>
                {product?.last_exam && !running && results.length === 0 && (
                    <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>
                        Último examen de {product.name}: {product.last_exam.ok} de {product.last_exam.total} bien ({dateTime(product.last_exam.at)}).
                    </Typography>
                )}

                {(running || results.length > 0) && total > 0 && (
                    <Box sx={{ mt: 2 }} aria-live="polite">
                        <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 13 }}>
                            <span>{running ? `Pregunta ${Math.min(results.length + 1, total)} de ${total}` : `${results.length} de ${total} respondidas`}</span>
                            <Box component="span" sx={{ color: t.muted }}>{ok} bien · {results.length - ok} para revisar</Box>
                        </Stack>
                        <Box role="progressbar" aria-label="Avance del examen" aria-valuenow={results.length} aria-valuemin={0} aria-valuemax={total}
                            sx={{ mt: 0.75, height: 8, borderRadius: 4, bgcolor: t.soft, overflow: "hidden" }}>
                            <Box sx={{ height: "100%", width: `${(results.length / total) * 100}%`, bgcolor: passed ? t.green : t.ink, transition: "width 200ms",
                                "@media (prefers-reduced-motion: reduce)": { transition: "none" } }} />
                        </Box>
                    </Box>
                )}
                {finished && results.length > 0 && (
                    <Box role="status" sx={{ ...appear, mt: 2, p: 1.5, borderRadius: "10px", border: `1px solid ${passed ? t.green : t.line}`, bgcolor: passed ? t.greenSoft : "transparent" }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{passed ? "¡Aprobado!" : `${ok} de ${total} bien`}</Typography>
                        <Typography sx={{ fontSize: 14, mt: 0.25 }}>
                            {passed ? `${product?.name ?? "Este producto"} respondió bien las ${total}: está listo para la tienda.`
                                : results.length < total ? "Lo paraste antes de terminar. Lee las ⚠ de abajo."
                                    : "Lee las ⚠ de abajo: si falta algo en la ficha, agrégalo y vuelve a tomar el examen."}
                        </Typography>
                    </Box>
                )}
            </Box>

            {results.length > 0 && (
                <Box component="ol" aria-label="Respuestas del examen" sx={{ p: 0, m: 0, mt: 1 }}>
                    {/* al terminar, las ⚠ primero */}
                    {(finished ? [...results].sort((a, b) => Number(!!a.ok) - Number(!!b.ok)) : results).map((r) => <ResultRow key={r.id} r={r} groups={groups} t={t} />)}
                </Box>
            )}

            <Box sx={{ mt: 1.5 }}>
                <TextAction onClick={() => setShowQuestions(!showQuestions)} aria-expanded={showQuestions} sx={{ color: t.ink }}>
                    {showQuestions ? "Ocultar las preguntas del examen" : `Ver y cambiar las preguntas del examen (${questions.length})`}
                </TextAction>
            </Box>
            {showQuestions && (
                <Box sx={{ ...cardSx(t), ...appear, p: { xs: 1.5, sm: 2 }, mt: 1 }}>
                    {Object.entries(groups).map(([key, label]) => {
                        const list = questions.filter((q) => q.group === key);
                        return (
                            <Box key={key} sx={{ "& + &": { mt: 2 } }}>
                                <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600 }}>{label} ({list.length})</Typography>
                                {list.length === 0 && <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>Ninguna.</Typography>}
                                {list.map((q) => (
                                    <Box key={q.id} sx={{ py: 1, borderBottom: `1px solid ${t.line}`, "&:last-of-type": { borderBottom: 0 } }}>
                                        <Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>«{q.question}»</Typography>
                                        <Stack direction="row" columnGap={2} rowGap={0.5} flexWrap="wrap" alignItems="center" sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>
                                            <span>Debe: {expects[q.expect] ?? q.expect}</span>
                                            <TextAction onClick={() => setDraft({ id: q.id, group: q.group, question: q.question, expect: q.expect })} sx={{ color: t.ink }}>Cambiar</TextAction>
                                            <TextAction onClick={() => setRemoving(q)} sx={{ color: t.muted }}>Quitar</TextAction>
                                        </Stack>
                                    </Box>
                                ))}
                            </Box>
                        );
                    })}
                    <Button variant="outlined" onClick={() => setDraft({ id: null, group: "capciosa", question: "", expect: "unknown" })} sx={{ ...lineSx(t), ...tapSx, mt: 2 }}>
                        Agregar una pregunta
                    </Button>
                </Box>
            )}

            <Dialog open={!!draft} onClose={saving ? undefined : () => setDraft(null)} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
                {draft && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>{draft.id === null ? "Agregar una pregunta" : "Cambiar la pregunta"}</Typography>
                        </DialogTitle>
                        <DialogContent dividers sx={{ borderColor: t.line }}>
                            <Stack spacing={2}>
                                <TextField label="La pregunta, como la escribiría un cliente" value={draft.question} multiline minRows={2}
                                    onChange={(e) => setDraft({ ...draft, question: e.target.value })} slotProps={{ htmlInput: { maxLength: 400 } }} autoFocus />
                                <TextField select label="Grupo" value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })}>
                                    {Object.entries(groups).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                                </TextField>
                                <TextField select label="Qué debe hacer la respuesta" value={draft.expect} onChange={(e) => setDraft({ ...draft, expect: e.target.value })}
                                    helperText="Con esto el examen le pone ✓ o ⚠. «La reviso yo» siempre sale ⚠ para que la leas.">
                                    {Object.entries(expects).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                                </TextField>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 1.5 }}>
                            <Button onClick={() => setDraft(null)} disabled={saving} variant="outlined" sx={{ ...lineSx(t), ...tapSx }}>Cancelar</Button>
                            <Button onClick={saveDraft} disabled={saving || !draft.question.trim()} variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx }}>
                                {saving ? "Guardando…" : "Guardar"}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Dialog open={!!removing} onClose={saving ? undefined : () => setRemoving(null)} fullScreen={phone} fullWidth maxWidth="xs" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
                {removing && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Quitar la pregunta</Typography>
                        </DialogTitle>
                        <DialogContent dividers sx={{ borderColor: t.line }}>
                            <Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>
                                «{removing.question}» ya no sale en los exámenes. Los exámenes que ya tomaste guardan lo que respondió.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 1.5 }}>
                            <Button onClick={() => setRemoving(null)} disabled={saving} variant="outlined" sx={{ ...lineSx(t), ...tapSx }}>Cancelar</Button>
                            <Button onClick={remove} disabled={saving} variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx }}>{saving ? "Quitando…" : "Quitar"}</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </>
    );
};
