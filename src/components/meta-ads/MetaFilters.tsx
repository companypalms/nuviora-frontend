// src/components/meta-ads/MetaFilters.tsx
// §27 rangos de fecha, §28 comparar períodos, §30 filtros combinables (producto, ciudad, cuenta, campaña, ad set,
// creativo, estado, fecha) y §42 "[ Mostrar inactivos ]".
import React from "react";
import { Autocomplete, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField } from "@mui/material";
import { FilterOptions, Filters, RANGES } from "./metaAds";

function Pick<T>({ label, options, value, getKey, getLabel, onChange, width = 200 }: {
    label: string; options: T[]; value: string | number | null; getKey: (o: T) => string | number; getLabel: (o: T) => string;
    onChange: (v: string | number | null) => void; width?: number;
}) {
    const selected = options.find((o) => getKey(o) === value) ?? null;
    return (
        <Autocomplete
            size="small" options={options} value={selected} sx={{ width: { xs: "100%", sm: width } }}
            getOptionLabel={getLabel} isOptionEqualToValue={(a, b) => getKey(a) === getKey(b)}
            onChange={(_, o) => onChange(o ? getKey(o) : null)}
            renderInput={(params) => <TextField {...params} label={label} />}
        />
    );
}

export const MetaFilters: React.FC<{ value: Filters; onChange: (f: Filters) => void; options?: FilterOptions | null; compact?: boolean }> = ({ value: f, onChange, options, compact }) => {
    const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
    const campaigns = (options?.campaigns ?? []).filter((c) => (!f.product_id || c.product_id === f.product_id) && (!f.city_id || c.city_id === f.city_id) && (f.include_inactive || c.active || c.meta_id === f.campaign));
    const adsets = (options?.adsets ?? []).filter((s) => (!f.campaign || s.campaign_meta_id === f.campaign) && (f.include_inactive || s.active || s.meta_id === f.adset));

    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 1.5 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <TextField select size="small" label="Rango" value={f.range} onChange={(e) => set({ range: e.target.value })} sx={{ width: { xs: "100%", sm: 180 } }}>
                    {RANGES.map((r) => <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>)}
                </TextField>
                {f.range === "custom" && (
                    <>
                        <TextField size="small" type="date" label="Desde" value={f.from} onChange={(e) => set({ from: e.target.value })} InputLabelProps={{ shrink: true }} />
                        <TextField size="small" type="date" label="Hasta" value={f.to} onChange={(e) => set({ to: e.target.value })} InputLabelProps={{ shrink: true }} />
                    </>
                )}
                <FormControlLabel control={<Checkbox checked={f.compare} onChange={(e) => set({ compare: e.target.checked })} />} label="Comparar con el período anterior" />
                {!compact && options && (
                    <>
                        <Pick label="Producto" options={options.products} value={f.product_id} getKey={(o) => o.id} getLabel={(o) => o.name}
                            onChange={(v) => set({ product_id: v as number | null, campaign: null, adset: null })} />
                        <Pick label="Ciudad" options={options.cities} value={f.city_id} getKey={(o) => o.id} getLabel={(o) => o.name}
                            onChange={(v) => set({ city_id: v as number | null, campaign: null, adset: null })} width={160} />
                        <Pick label="Cuenta" options={options.accounts} value={f.account_id} getKey={(o) => o.id} getLabel={(o) => o.name ?? `act_${o.meta_id}`}
                            onChange={(v) => set({ account_id: v as number | null })} width={160} />
                        <Pick label="Campaña" options={campaigns} value={f.campaign} getKey={(o) => o.meta_id} getLabel={(o) => o.name ?? o.meta_id}
                            onChange={(v) => set({ campaign: v as string | null, adset: null })} width={240} />
                        <Pick label="Ad set" options={adsets} value={f.adset} getKey={(o) => o.meta_id} getLabel={(o) => o.name ?? o.meta_id}
                            onChange={(v) => set({ adset: v as string | null })} />
                        <Pick label="Creativo" options={options.creatives} value={f.creative} getKey={(o) => o.id} getLabel={(o) => o.tracking_id}
                            onChange={(v) => set({ creative: v as number | null })} width={180} />
                        <TextField select size="small" label="Estado" value={f.status} onChange={(e) => set({ status: e.target.value as Filters["status"] })} sx={{ width: { xs: "100%", sm: 140 } }}>
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="active">Activos</MenuItem>
                            <MenuItem value="inactive">Inactivos</MenuItem>
                        </TextField>
                        <FormControlLabel control={<Checkbox checked={f.include_inactive} onChange={(e) => set({ include_inactive: e.target.checked })} />} label="Mostrar inactivos" />
                    </>
                )}
            </Stack>
        </Paper>
    );
};
