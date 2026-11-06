// src/components/calendar/TaskBoard.tsx
// .107 "Tu día": "Lo que sigue", por etapas. Lo urgente (atrasado o ya es su hora) y lo que tiene hora más tarde lo ordena el
// sistema; los grupos Alta, Normal y Baja se acomodan arrastrando (dueño: "¿puedo arrastrar tareas para colocar una encima
// de otra en prioridad?"): con el mouse, con el dedo (apretar un momento y arrastrar) o con el teclado (espacio y flechas).
// Soltarla en otro grupo le cambia la prioridad. El orden se guarda para todos los días. "Subir" y "Bajar" del menú hacen lo
// mismo sin arrastrar.
import React, { FC, useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
    Announcements, DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, TouchSensor,
    closestCorners, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTokens } from "../ui/design";
import { Section } from "../ui/designParts";
import { CalendarItem, PRIORITIES, PlanStage, Priority, minutesText, planKey, stageColor } from "./calendar";
import { RowHandlers, TaskRow } from "./TaskRow";

type Props = RowHandlers & {
    stages: PlanStage[];
    /** Cada cosa por planKey (item_key|due_date). */
    byKey: Record<string, CalendarItem>;
    /** La misión de ahora: no se repite en la lista (pero cuenta para el orden de su grupo). */
    hidden?: string | null;
    busy?: string | null;
    /** El grupo entero de una prioridad, de arriba hacia abajo, después de arrastrar (o de subir o bajar). */
    onReorder: (priority: Priority, keys: string[]) => void;
};

type Groups = Record<Priority, string[]>;

const groupsOf = (stages: PlanStage[]): Groups => {
    const out: Groups = { alta: [], normal: [], baja: [] };
    for (const s of stages) if (s.key in out) out[s.key as Priority] = s.items.map(planKey);
    return out;
};

const findGroup = (groups: Groups, id: string): Priority | null => {
    if (id.startsWith("group:")) return id.slice(6) as Priority;
    return (Object.keys(groups) as Priority[]).find((p) => groups[p].includes(id)) ?? null;
};

const SortableRow: FC<Omit<React.ComponentProps<typeof TaskRow>, "handle" | "dragging"> & { id: string }> = ({ id, ...row }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <Box ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} sx={{ opacity: isDragging ? 0.35 : 1 }}>
            <TaskRow {...row} handle={{ ...attributes, ...listeners, ref: setActivatorNodeRef }} />
        </Box>
    );
};

/** El hueco de un grupo: se puede soltar ahí aunque esté vacío. */
const GroupDrop: FC<{ id: string; empty: boolean; hint: string; children: React.ReactNode }> = ({ id, empty, hint, children }) => {
    const t = useTokens();
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <Box ref={setNodeRef} sx={{ minHeight: empty ? 52 : 8, borderRadius: "10px", transition: "background-color 150ms", bgcolor: isOver ? t.soft : "transparent" }}>
            {empty && (
                <Box sx={{ border: `1.5px dashed ${t.line}`, borderRadius: "10px", p: "12px 14px" }}>
                    <Typography sx={{ fontSize: 13, color: t.faint }}>{hint}</Typography>
                </Box>
            )}
            {children}
        </Box>
    );
};

export const TaskBoard: FC<Props> = ({ stages, byKey, hidden, busy, onReorder, ...handlers }) => {
    const t = useTokens();
    const fromProps = useMemo(() => groupsOf(stages), [stages]);
    const [groups, setGroups] = useState<Groups>(fromProps);
    const [active, setActive] = useState<string | null>(null);
    const [startGroup, setStartGroup] = useState<Priority | null>(null);
    // Lo que llega del servidor manda, salvo mientras se arrastra
    useEffect(() => { if (!active) setGroups(fromProps); }, [fromProps, active]);

    const reason = useMemo(() => Object.fromEntries(stages.flatMap((s) => s.items.map((i) => [planKey(i), i.reason]))), [stages]);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const titleOf = (id: string | number) => byKey[String(id)]?.title ?? "la tarea";
    const groupLabel = (id: string | number | undefined) => {
        const g = id === undefined ? null : findGroup(groups, String(id));
        return g ? PRIORITIES.find((p) => p.key === g)!.label : "";
    };
    const announcements: Announcements = {
        onDragStart: ({ active: a }) => `Agarraste ${titleOf(a.id)}. Muévela con las flechas y suéltala con espacio.`,
        onDragOver: ({ active: a, over }) => (over ? `${titleOf(a.id)} está en ${groupLabel(over.id)}.` : `${titleOf(a.id)} está fuera de la lista.`),
        onDragEnd: ({ active: a, over }) => (over ? `Soltaste ${titleOf(a.id)} en ${groupLabel(over.id)}.` : `${titleOf(a.id)} volvió a su lugar.`),
        onDragCancel: ({ active: a }) => `${titleOf(a.id)} volvió a su lugar.`,
    };

    // La misión de ahora no se ve en la lista, pero va en su lugar cuando se guarda el orden de su grupo
    const withHidden = (p: Priority, keys: string[]) => {
        if (!hidden || !fromProps[p].includes(hidden) || keys.includes(hidden)) return keys;
        const at = Math.min(fromProps[p].indexOf(hidden), keys.length);
        return [...keys.slice(0, at), hidden, ...keys.slice(at)];
    };
    const save = (p: Priority, keys: string[]) => onReorder(p, withHidden(p, keys).map((k) => k.split("|")[0]));

    const onStart = ({ active: a }: DragStartEvent) => { setActive(String(a.id)); setStartGroup(findGroup(groups, String(a.id))); };
    const onOver = ({ active: a, over }: DragOverEvent) => {
        if (!over) return;
        const from = findGroup(groups, String(a.id));
        const to = findGroup(groups, String(over.id));
        if (!from || !to || from === to) return;
        setGroups((g) => {
            const target = g[to].filter((k) => k !== a.id);
            const at = String(over.id).startsWith("group:") ? target.length : Math.max(0, target.indexOf(String(over.id)));
            return { ...g, [from]: g[from].filter((k) => k !== a.id), [to]: [...target.slice(0, at), String(a.id), ...target.slice(at)] };
        });
    };
    const onEnd = ({ active: a, over }: DragEndEvent) => {
        const id = String(a.id);
        setActive(null);
        const to = over ? findGroup(groups, String(over.id)) : null;
        if (!to) { setGroups(fromProps); return; }
        let list = groups[to];
        if (over && !String(over.id).startsWith("group:") && list.includes(String(over.id))) {
            list = arrayMove(list, list.indexOf(id), list.indexOf(String(over.id)));
        }
        const next = { ...groups, [to]: list };
        setGroups(next);
        const before = fromProps[to].filter((k) => k !== hidden);
        if (startGroup !== to || before.join() !== list.join()) save(to, list);
    };

    const move = (p: Priority, id: string, dir: -1 | 1) => {
        const list = groups[p].filter((k) => k !== hidden);
        const i = list.indexOf(id);
        if (i < 0 || i + dir < 0 || i + dir >= list.length) return;
        const next = arrayMove(list, i, i + dir);
        setGroups((g) => ({ ...g, [p]: next }));
        save(p, next);
    };

    // En el grupo de una prioridad no se repite "Prioridad alta" (lo dice el grupo) ni "en el orden que pusiste" (se ve):
    // solo "Es la más corta."
    const shortReason = (r?: string) => (r && /^Prioridad \p{L}+[.:]/u.test(r) ? (r.endsWith("la más corta.") ? "Es la más corta." : undefined) : r);
    const rowProps = (id: string) => ({ item: byKey[id], reason: shortReason(reason[id]), busy: busy === id, ...handlers });
    const fixed = (key: "urgent" | "later") => stages.find((s) => s.key === key);
    const urgent = fixed("urgent");
    const later = fixed("later");
    const visible = (keys: string[]) => keys.filter((k) => k !== hidden && byKey[k]);
    const minutesOf = (keys: string[]) => keys.reduce((n, k) => n + (byKey[k]?.minutes ?? 0), 0);

    return (
        <>
            {urgent && visible(urgent.items.map(planKey)).length > 0 && (
                <Section dot={stageColor("urgent", t)} name="Urgente" hint={`${visible(urgent.items.map(planKey)).length} · ~${minutesText(urgent.minutes)} · lo atrasado y lo que ya es su hora`} mt={2.5}>
                    {visible(urgent.items.map(planKey)).map((k) => <TaskRow key={k} {...rowProps(k)} />)}
                </Section>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onStart} onDragOver={onOver} onDragEnd={onEnd}
                onDragCancel={() => { setActive(null); setGroups(fromProps); }}
                accessibility={{ announcements, screenReaderInstructions: { draggable: "Para mover una tarea: espacio para agarrarla, flechas para moverla, espacio para soltarla, Escape para cancelar." } }}>
                {PRIORITIES.map((p) => {
                    const keys = visible(groups[p.key]);
                    const empty = keys.length === 0;
                    return (
                        <Section key={p.key} dot={stageColor(p.key, t)} name={p.label} mt={2.5}
                            hint={empty ? p.hint : `${keys.length} · ~${minutesText(minutesOf(keys))} · ${p.hint}`}>
                            <SortableContext id={`group:${p.key}`} items={keys} strategy={verticalListSortingStrategy}>
                                <GroupDrop id={`group:${p.key}`} empty={empty} hint={`Nada en ${p.label.toLowerCase()}. Arrastra aquí lo que ${p.key === "alta" ? "sea lo más importante" : p.key === "baja" ? "pueda esperar" : "sea de siempre"}.`}>
                                    {keys.map((k, i) => (
                                        <SortableRow key={k} id={k} {...rowProps(k)} onMove={(dir) => move(p.key, k, dir)} canUp={i > 0} canDown={i < keys.length - 1} />
                                    ))}
                                </GroupDrop>
                            </SortableContext>
                        </Section>
                    );
                })}
                <DragOverlay>{active && byKey[active] ? <TaskRow {...rowProps(active)} handle={{}} dragging /> : null}</DragOverlay>
            </DndContext>
            {later && visible(later.items.map(planKey)).length > 0 && (
                <Section dot={stageColor("later", t)} name="A su hora" hint="(hora de Venezuela)" mt={2.5}>
                    {visible(later.items.map(planKey)).map((k) => <TaskRow key={k} {...rowProps(k)} />)}
                </Section>
            )}
        </>
    );
};
