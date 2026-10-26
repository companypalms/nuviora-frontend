// src/components/finance/CohortsTab.tsx
// Finanzas › Cohortes (Módulo 4 de Fran, §2B, §21, §59): qué terminó pasando con las órdenes creadas cada día o cada
// semana. Una entrega tardía actualiza su cohorte. Efectividad COD = entregados / creados (sin cambios ni devoluciones).
import React, { useEffect, useState } from "react";
import {
    Chip, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { PeriodPicker } from "./PeriodPicker";
import { CohortResponse, FinanceOptions, api, day, errorMessage, money, pct } from "./finance";

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString("en-CA"); };

export const CohortsTab: React.FC<{ options: FinanceOptions }> = ({ options }) => {
    const [range, setRange] = useState<[string, string]>([daysAgo(30), daysAgo(0)]);
    const [group, setGroup] = useState<"day" | "week">("day");
    const [product, setProduct] = useState("");
    const [city, setCity] = useState("");
    const [data, setData] = useState<CohortResponse | null>(null);

    useEffect(() => {
        let alive = true;
        setData(null);
        const qs = new URLSearchParams({ from: range[0], to: range[1], group, ...(product ? { product_id: product } : {}), ...(city ? { city_id: city } : {}) });
        api<CohortResponse>(`/finance/cohorts?${qs}`).then((r) => { if (alive) setData(r); }).catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; };
    }, [range, group, product, city]);

    return (
        <Stack spacing={2}>
            <Panel>
                <PeriodPicker value={range} onChange={setRange}>
                    <ToggleButtonGroup size="small" exclusive value={group} onChange={(_, v) => v && setGroup(v)}>
                        <ToggleButton value="day">Por día</ToggleButton><ToggleButton value="week">Por semana</ToggleButton>
                    </ToggleButtonGroup>
                    <TextField select size="small" label="Producto" value={product} onChange={(e) => setProduct(e.target.value)} sx={{ minWidth: 180 }}
                        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                        <MenuItem value="">Todos</MenuItem>
                        {options.products.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.title}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} sx={{ minWidth: 150 }}
                        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                        <MenuItem value="">Todas</MenuItem>
                        {options.cities.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                    </TextField>
                </PeriodPicker>
            </Panel>
            {!data ? <Typography color="text.secondary" sx={{ p: 1 }}>Calculando…</Typography> : (
                <>
                    <Panel>
                        <PanelHeader title={`Cohortes por fecha de creación · efectividad ${pct(data.total.effectiveness)}`}
                            subtitle={`${data.total.delivered} entregadas de ${data.total.created} creadas. Maduras hasta el ${day(data.mature_until)}: las más nuevas todavía se están entregando.`} />
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{group === "week" ? "Semana" : "Día"}</TableCell><TableCell align="right">Creadas</TableCell>
                                        <TableCell align="right">Entregadas</TableCell><TableCell align="right">No entreg.</TableCell><TableCell align="right">Abiertas</TableCell>
                                        <TableCell align="right">Efectividad</TableCell><TableCell align="right">Ingreso</TableCell><TableCell align="right">Contribución antes de publicidad</TableCell>
                                        <TableCell align="right">Publicidad</TableCell><TableCell align="right">CPA Meta</TableCell><TableCell align="right">Después de publicidad</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.rows.map((r) => (
                                        <TableRow key={r.period}>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                {group === "week" ? `${day(r.period)} – ${day(r.period_end)}` : day(r.period)}
                                                {!r.mature && <Chip size="small" label="sin madurar" sx={{ ml: 0.5 }} />}
                                            </TableCell>
                                            <TableCell align="right">{r.created}</TableCell><TableCell align="right">{r.delivered}</TableCell>
                                            <TableCell align="right">{r.not_delivered}</TableCell><TableCell align="right">{r.open}</TableCell>
                                            <TableCell align="right">{pct(r.effectiveness)}</TableCell><TableCell align="right">{money(r.revenue)}</TableCell>
                                            <TableCell align="right">{money(r.contribution)}</TableCell><TableCell align="right">{money(r.spend)}</TableCell>
                                            <TableCell align="right">{money(r.meta_cpa)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: r.after_ads < 0 ? "error.main" : undefined }}>{money(r.after_ads)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="caption" color="text.secondary">
                            La contribución resta COGS, delivery (entregado y fallido) y comisiones. La publicidad de cada fila es la de esos mismos días.
                        </Typography>
                    </Panel>
                    <Panel>
                        <PanelHeader title="Efectividad COD por producto y ciudad" subtitle="Entregados / creados × 100, en todo el período (§59)." />
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Producto / ciudad</TableCell><TableCell align="right">Creadas</TableCell>
                                    <TableCell align="right">Entregadas</TableCell><TableCell align="right">Abiertas</TableCell><TableCell align="right">Efectividad</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {data.effectiveness.map((g) => (
                                        <TableRow key={`${g.product_id}-${g.city_id}`}>
                                            <TableCell>{g.name}</TableCell><TableCell align="right">{g.created}</TableCell><TableCell align="right">{g.delivered}</TableCell>
                                            <TableCell align="right">{g.open}</TableCell><TableCell align="right" sx={{ fontWeight: 600 }}>{pct(g.effectiveness)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Panel>
                </>
            )}
        </Stack>
    );
};
