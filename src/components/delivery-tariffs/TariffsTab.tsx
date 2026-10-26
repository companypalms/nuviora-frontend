// src/components/delivery-tariffs/TariffsTab.tsx
// Tarifarios de las agencias (Módulo 3, §10 a §13): uno por agencia y ciudad, con rangos continuos (desde < km ≤ hasta)
// y versiones. Guardar nunca cambia una versión: crea otra, vigente desde la fecha indicada, y las carreras ya
// calculadas conservan la suya (§13, §41). Con la misma fecha que la última, la corrige (un error al cargarla) y sus
// carreras se recalculan. Solo administración (§12, §14). Desde el Módulo 4 (R11), también los de los repartidores propios.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Collapse, IconButton, ListSubheader, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { AddRounded, DeleteOutlineRounded, ExpandLessRounded, ExpandMoreRounded, ReceiptLongRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { AgencyWithWarehouses, Option, TariffGroup, TariffRange, api, day, rangeLabel, rangePrice, rangeProblem, todayCaracas } from "./deliveryTariffs";

type FormRange = { max: string; price: string; perKm: string };

const RangesTable: React.FC<{ ranges: TariffRange[] }> = ({ ranges }) => (
    <Table size="small">
        <TableHead><TableRow><TableCell>Distancia</TableCell><TableCell align="right">Precio</TableCell></TableRow></TableHead>
        <TableBody>
            {ranges.map((r, i) => (
                <TableRow key={i}><TableCell>{rangeLabel(r)}</TableCell><TableCell align="right">{rangePrice(r)}</TableCell></TableRow>
            ))}
        </TableBody>
    </Table>
);

const TariffForm: React.FC<{ agencies: AgencyWithWarehouses[]; deliverers: AgencyWithWarehouses[]; cities: Option[]; groups: TariffGroup[]; onSaved: () => void }> = ({
    agencies, deliverers, cities, groups, onSaved,
}) => {
    const [agencyId, setAgencyId] = useState<number | "">("");
    const [cityId, setCityId] = useState<number | "">("");
    const [validFrom, setValidFrom] = useState(todayCaracas());
    const [notes, setNotes] = useState("");
    const [rows, setRows] = useState<FormRange[]>([{ max: "", price: "", perKm: "" }]);
    const [saving, setSaving] = useState(false);

    const agency = [...agencies, ...deliverers].find((a) => a.id === agencyId);
    const cityOptions = agency?.cities.length ? agency.cities : cities;
    const current = groups.find((g) => g.agency_id === agencyId && g.city_id === cityId);
    // La misma fecha que la última versión: la corrige en vez de crear otra (un error al cargarla)
    const latest = current?.versions.filter((v) => v.is_active).sort((a, b) => b.valid_from.localeCompare(a.valid_from) || b.version - a.version)[0];
    const correcting = latest && latest.valid_from === validFrom ? latest : undefined;

    // "Desde" de cada rango = "hasta" del anterior: así no hay huecos ni solapes (§11)
    const ranges: TariffRange[] = useMemo(() => {
        let min = 0;
        return rows.map((r) => {
            const range = { min_km: min, max_km: r.max === "" ? null : Number(r.max), price: r.price === "" ? null : Number(r.price), price_per_km: r.perKm === "" ? null : Number(r.perKm) };
            min = range.max_km ?? min;
            return range;
        });
    }, [rows]);
    const problem = rangeProblem(ranges);

    const copyCurrent = () => {
        const v = current?.versions.find((x) => x.id === current.current_id) ?? current?.versions[0];
        if (v) setRows(v.ranges.map((r) => ({ max: r.max_km?.toString() ?? "", price: r.price?.toString() ?? "", perKm: r.price_per_km?.toString() ?? "" })));
    };
    const setRow = (i: number, patch: Partial<FormRange>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

    const save = async () => {
        setSaving(true);
        try {
            const r = await api<{ message: string }>("/delivery/tariffs", "POST", { agency_id: agencyId, city_id: cityId, valid_from: validFrom, notes: notes || null, ranges });
            toast.success(r.message);
            setRows([{ max: "", price: "", perKm: "" }]);
            setNotes("");
            onSaved();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Panel>
            <PanelHeader title="Nuevo tarifario o nueva versión"
                subtitle="La versión anterior queda cerrada el día antes. Las carreras ya calculadas no cambian. Para corregir un error, guarda la versión con la misma fecha de la equivocada." />
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mb: 1.5 }}>
                <TextField select size="small" label="Agencia o repartidor" value={agencyId} onChange={(e) => { setAgencyId(Number(e.target.value)); setCityId(""); }} sx={{ minWidth: 200 }}>
                    {agencies.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    {deliverers.length > 0 && <ListSubheader>Repartidores propios</ListSubheader>}
                    {deliverers.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Ciudad" value={cityId} onChange={(e) => setCityId(Number(e.target.value))} sx={{ minWidth: 170 }} disabled={!agency}>
                    {cityOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
                <TextField size="small" type="date" label="Vigente desde" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                {current && <Button size="small" onClick={copyCurrent}>Copiar la vigente</Button>}
            </Stack>

            <Stack spacing={1}>
                {rows.map((r, i) => {
                    const last = i === rows.length - 1;
                    return (
                        <Stack key={i} direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
                            <TextField size="small" label="Desde (km)" value={ranges[i].min_km} disabled sx={{ width: { sm: 110 } }} />
                            <TextField size="small" label="Hasta (km)" value={r.max} onChange={(e) => setRow(i, { max: e.target.value })} sx={{ width: { sm: 130 } }}
                                placeholder={last ? "en adelante" : ""} InputLabelProps={{ shrink: true }} inputProps={{ inputMode: "decimal" }} />
                            <TextField size="small" label="Precio (USD)" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} sx={{ width: { sm: 130 } }} inputProps={{ inputMode: "decimal" }} />
                            <TextField size="small" label="Extra por km" value={r.perKm} onChange={(e) => setRow(i, { perKm: e.target.value })} sx={{ width: { sm: 140 } }}
                                inputProps={{ inputMode: "decimal" }} placeholder="opcional" InputLabelProps={{ shrink: true }} />
                            {rows.length > 1 && <IconButton aria-label="Quitar rango" onClick={() => setRows(rows.filter((_, j) => j !== i))}><DeleteOutlineRounded /></IconButton>}
                        </Stack>
                    );
                })}
                <Typography variant="caption" color="text.secondary">
                    "Hasta" vacío en el último rango = en adelante. "Extra por km" suma ese monto por cada km por encima del "desde" del rango
                    (PYP: más de 20 km, $4 + $0,20 por km extra; 21 km = $4,20).
                </Typography>
                <Box><Button size="small" startIcon={<AddRounded />} onClick={() => setRows([...rows, { max: "", price: "", perKm: "" }])} disabled={ranges[ranges.length - 1].max_km === null}>Agregar rango</Button></Box>
                <TextField size="small" label="Nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} inputProps={{ maxLength: 300 }} />
                {problem && agencyId !== "" && cityId !== "" && <Alert severity="info">{problem}</Alert>}
                {correcting && (
                    <Alert severity="warning">
                        La versión {correcting.version} también empieza el {day(correcting.valid_from)}. Al guardar, esta la corrige: la versión {correcting.version} queda
                        anulada{correcting.routes > 0 ? ` y sus ${correcting.routes} carreras se recalculan con estos rangos` : ""}.
                    </Alert>
                )}
                <Box>
                    <Button variant="contained" color={correcting ? "warning" : "primary"} onClick={save} disabled={saving || agencyId === "" || cityId === "" || !!problem}>
                        {correcting ? `Corregir versión ${correcting.version}` : "Guardar versión"}
                    </Button>
                </Box>
            </Stack>
        </Panel>
    );
};

const TariffGroupPanel: React.FC<{ g: TariffGroup }> = ({ g }) => {
    const [open, setOpen] = useState(false);
    const current = g.versions.find((v) => v.id === g.current_id);
    const others = g.versions.filter((v) => v.id !== g.current_id);
    return (
        <Panel>
            <PanelHeader icon={<ReceiptLongRounded />} title={`${g.agency} — ${g.city}`}
                subtitle={current ? `Versión ${current.version}, vigente desde ${day(current.valid_from)}${current.created_by ? ` · cargada por ${current.created_by}` : ""}` : "Ninguna versión vigente hoy"} />
            {current ? <RangesTable ranges={current.ranges} /> : <Typography variant="body2" color="text.secondary">Las versiones de abajo no rigen hoy (empiezan después o ya terminaron).</Typography>}
            {current?.notes && <Typography variant="caption" color="text.secondary">{current.notes}</Typography>}
            {others.length > 0 && (
                <>
                    <Button size="small" onClick={() => setOpen(!open)} endIcon={open ? <ExpandLessRounded /> : <ExpandMoreRounded />} sx={{ mt: 1 }}>
                        {others.length === 1 ? "1 versión más" : `${others.length} versiones más`}
                    </Button>
                    <Collapse in={open}>
                        <Stack spacing={1.5} sx={{ mt: 1 }}>
                            {others.map((v) => (
                                <Box key={v.id}>
                                    <Typography variant="body2" fontWeight={600}>
                                        Versión {v.version}: {v.is_active ? `${day(v.valid_from)} → ${v.valid_to ? day(v.valid_to) : "en adelante"}` : `anulada (se corrigió con otra del ${day(v.valid_from)})`}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {v.is_active ? `${v.routes} carreras calculadas con esta versión` : "No se usa"}{v.created_by ? ` · ${v.created_by}` : ""}
                                    </Typography>
                                    <RangesTable ranges={v.ranges} />
                                </Box>
                            ))}
                        </Stack>
                    </Collapse>
                </>
            )}
        </Panel>
    );
};

export const TariffsTab: React.FC = () => {
    const [groups, setGroups] = useState<TariffGroup[] | null>(null);
    const [agencies, setAgencies] = useState<{ agencies: AgencyWithWarehouses[]; cities: Option[]; deliverers?: AgencyWithWarehouses[] } | null>(null);
    const load = useCallback(() => {
        api<{ tariffs: TariffGroup[] }>("/delivery/tariffs").then((r) => setGroups(r.tariffs)).catch((e) => toast.error(e.message));
        api<{ agencies: AgencyWithWarehouses[]; cities: Option[]; deliverers?: AgencyWithWarehouses[] }>("/delivery/warehouses").then(setAgencies).catch((e) => toast.error(e.message));
    }, []);
    useEffect(() => { load(); }, [load]);

    if (!groups || !agencies) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const without = agencies.agencies.filter((a) => !groups.some((g) => g.agency_id === a.id));

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Lo que cada agencia cobra por carrera según la distancia por carretera desde su almacén. Las agencias no ven estos tarifarios.
            </Typography>
            {without.length > 0 && <Alert severity="warning">Sin tarifario: {without.map((a) => a.name).join(", ")}. Sus carreras guardan la distancia y se cotizan cuando se cargue.</Alert>}
            <TariffForm agencies={agencies.agencies} deliverers={agencies.deliverers ?? []} cities={agencies.cities} groups={groups} onSaved={load} />
            {groups.map((g) => <TariffGroupPanel key={`${g.agency_id}-${g.city_id}`} g={g} />)}
        </Stack>
    );
};
