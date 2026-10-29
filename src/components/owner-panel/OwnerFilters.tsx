// src/components/owner-panel/OwnerFilters.tsx
// Los filtros del panel del dueño (diccionario de métricas, §8): período, tienda, ciudad y producto, y los botones
// "Ver" que prenden y apagan secciones. Todo en una sola barra, sin pestañas.
import React, { FC } from "react";
import { Box, Button, Chip, Divider, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Panel } from "../ui/surface/Panel";
import { Filters, PRESETS, PanelOptions, VIEWS, ViewKey } from "./ownerPanel";

const Select: FC<{ label: string; all: string; value: string; options: { id: number; name: string }[]; onChange: (v: string) => void }> = ({ label, all, value, options, onChange }) => (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: { sm: 170 }, flex: { xs: 1, sm: "0 0 auto" } }}
        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
        <MenuItem value="">{all}</MenuItem>
        {options.map((o) => <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>)}
    </TextField>
);

export const OwnerFilters: FC<{
    filters: Filters;
    onChange: (f: Filters) => void;
    options: PanelOptions | null;
    views: ViewKey[];
    onViews: (v: ViewKey[]) => void;
    updatedAt?: string;
    onRefresh: () => void;
    dateError: string | null;
}> = ({ filters, onChange, options, views, onViews, updatedAt, onRefresh, dateError }) => {
    const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
    const hasFilters = Boolean(filters.shop || filters.city || filters.product);

    return (
        <Panel sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={1.5}>
                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                    {PRESETS.map((p) => (
                        <Chip key={p.key} label={p.label} color={filters.preset === p.key ? "primary" : "default"}
                            variant={filters.preset === p.key ? "filled" : "outlined"} onClick={() => set({ preset: p.key })} />
                    ))}
                    <Box sx={{ flexGrow: 1 }} />
                    <Tooltip title="Volver a calcular ahora">
                        <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={onRefresh} sx={{ textTransform: "none" }}>
                            {updatedAt ? `Actualizado ${updatedAt}` : "Actualizar"}
                        </Button>
                    </Tooltip>
                </Stack>

                {filters.preset === "custom" && (
                    <Stack direction="row" gap={1.5} flexWrap="wrap">
                        <TextField type="date" size="small" label="Desde" value={filters.from} onChange={(e) => set({ from: e.target.value })} InputLabelProps={{ shrink: true }} />
                        <TextField type="date" size="small" label="Hasta" value={filters.to} onChange={(e) => set({ to: e.target.value })} InputLabelProps={{ shrink: true }}
                            error={Boolean(dateError)} helperText={dateError ?? undefined} />
                    </Stack>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }} flexWrap="wrap">
                    <Select label="Tienda" all="Todas las tiendas" value={filters.shop} options={options?.shops ?? []} onChange={(v) => set({ shop: v })} />
                    <Select label="Ciudad" all="Todas las ciudades" value={filters.city} options={options?.cities ?? []} onChange={(v) => set({ city: v })} />
                    <Select label="Producto" all="Todos los productos" value={filters.product} options={options?.products ?? []} onChange={(v) => set({ product: v })} />
                    {hasFilters && (
                        <Button size="small" onClick={() => set({ shop: "", city: "", product: "" })} sx={{ textTransform: "none", alignSelf: { xs: "flex-start", sm: "center" } }}>
                            Quitar filtros
                        </Button>
                    )}
                </Stack>
                {filters.product && (
                    <Typography variant="caption" color="text.secondary">
                        Con producto: cuenta los pedidos cuyo producto principal es ese (el de mayor valor sin contar upsells), igual que Finanzas › Cohortes.
                    </Typography>
                )}

                <Divider />

                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                    <Typography variant="body2" fontWeight={800} sx={{ mr: 0.5 }}>Ver:</Typography>
                    {VIEWS.map((v) => {
                        const on = views.includes(v.key);
                        const chip = (
                            <Chip
                                label={v.soon ? `${v.label} · pronto` : v.label}
                                icon={on ? <CheckRoundedIcon /> : undefined}
                                color={on ? "primary" : "default"}
                                variant={on ? "filled" : "outlined"}
                                disabled={v.soon}
                                onClick={v.soon ? undefined : () => onViews(on ? views.filter((x) => x !== v.key) : [...views, v.key])}
                            />
                        );
                        return v.soon
                            ? <Tooltip key={v.key} title="Llega en los próximos pasos"><span>{chip}</span></Tooltip>
                            : <React.Fragment key={v.key}>{chip}</React.Fragment>;
                    })}
                </Stack>
            </Stack>
        </Panel>
    );
};
