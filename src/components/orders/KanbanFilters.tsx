// src/components/orders/KanbanFilters.tsx
// La barra de filtros del Kanban: la búsqueda y, para el Admin y el Gerente, ciudad, agencia, vendedora y fechas, en
// una sola fila ordenada. "Limpiar" solo aparece cuando hay algo puesto. En el teléfono los filtros se pliegan detrás de
// un botón "Filtros", con cuántos hay activos.
import React, { FC, useState } from "react";
import {
    Badge, Box, Button, Collapse, FormControl, InputAdornment, InputLabel, MenuItem, Select, Stack, TextField,
    useMediaQuery, useTheme,
} from "@mui/material";
import { FilterListOffRounded, SearchRounded, TuneRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { LeaderViewSelect } from "../../pages/my-group/LeaderViewSelect";
import { Panel } from "../ui/surface/Panel";

type Option = { id: number | string; name: string };

const SelectFilter: FC<{ label: string; value: string; options: Option[]; onChange: (v: string) => void; width: number }> = ({ label, value, options, onChange, width }) => (
    <FormControl size="small" sx={{ width: { xs: "100%", md: width } }}>
        <InputLabel>{label}</InputLabel>
        <Select value={value} label={label} onChange={(e) => onChange(String(e.target.value))} MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}>
            <MenuItem value="">Todas</MenuItem>
            {options.map((o) => <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>)}
        </Select>
    </FormControl>
);

export const KanbanFilters: FC<{ isSupervisor: boolean; cities: Option[]; agencies: Option[]; sellers: Option[] }> = ({ isSupervisor, cities, agencies, sellers }) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const [open, setOpen] = useState(false);
    const { filters, setFilters, searchTerm, setSearchTerm } = useOrdersStore();

    const active = [filters.city_id, filters.agency_id, filters.seller_id, filters.date_from, filters.date_to, filters.scope].filter(Boolean).length;
    const anyActive = active > 0 || searchTerm !== "";

    const clear = () => {
        setFilters({ city_id: "", agency_id: "", seller_id: "", date_from: "", date_to: "", scope: "" });
        setSearchTerm("");
        toast.info("Filtros limpiados");
    };

    const search = (
        <TextField
            size="small"
            placeholder="Buscar por orden, cliente o teléfono"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
                input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> },
                htmlInput: { "aria-label": "Buscar órdenes" },
            }}
            sx={{ flex: "1 1 240px", minWidth: 0, maxWidth: { md: 380 } }}
        />
    );

    const fields = isSupervisor ? (
        <>
            <SelectFilter label="Ciudad" value={String(filters.city_id ?? "")} options={cities} onChange={(v) => setFilters({ city_id: v })} width={150} />
            <SelectFilter label="Agencia" value={String(filters.agency_id ?? "")} options={agencies} onChange={(v) => setFilters({ agency_id: v })} width={160} />
            <SelectFilter label="Vendedora" value={String(filters.seller_id ?? "")} options={sellers} onChange={(v) => setFilters({ seller_id: v })} width={170} />
            <Stack direction="row" gap={1} sx={{ width: { xs: "100%", md: "auto" } }}>
                <TextField label="Desde" type="date" size="small" value={filters.date_from} onChange={(e) => setFilters({ date_from: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1, width: { md: 150 } }} />
                <TextField label="Hasta" type="date" size="small" value={filters.date_to} onChange={(e) => setFilters({ date_to: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1, width: { md: 150 } }} />
            </Stack>
        </>
    ) : (
        <LeaderViewSelect
            value={{ scope: filters.scope, sellerId: filters.seller_id }}
            onChange={(v) => setFilters({ scope: v.scope, seller_id: v.sellerId })}
            fullWidth={!isDesktop}
        />
    );

    const clearButton = anyActive && (
        <Button size="small" color="inherit" startIcon={<FilterListOffRounded />} onClick={clear} sx={{ color: "text.secondary", flexShrink: 0 }}>
            Limpiar
        </Button>
    );

    if (isDesktop) {
        return (
            <Panel sx={{ p: 1.25 }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    {search}
                    {fields}
                    {clearButton}
                </Stack>
            </Panel>
        );
    }

    return (
        <Panel sx={{ p: 1.25 }}>
            <Stack direction="row" alignItems="center" gap={1}>
                {search}
                <Button
                    size="small" variant={open ? "contained" : "outlined"} onClick={() => setOpen(!open)} aria-expanded={open}
                    startIcon={<Badge color="primary" badgeContent={active} invisible={open}><TuneRounded /></Badge>}
                    sx={{ flexShrink: 0 }}
                >
                    Filtros
                </Button>
            </Stack>
            <Collapse in={open}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, pt: 1.25 }}>
                    {fields}
                    {clearButton}
                </Box>
            </Collapse>
        </Panel>
    );
};
