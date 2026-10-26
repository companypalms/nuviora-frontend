// src/pages/inventory/CityInventory.tsx
// Inventario por ciudad (Fran, 2026-09-30): la vendedora ve qué hay en cada ciudad, talla por talla, sin el
// nombre de las agencias, para saber qué ofrecer antes de llamar. Solo lectura (GET /inventory/by-city).
// Fran (2026-10-02): con la misma forma que el inventario del Admin, una tarjeta por producto con todas las
// ciudades adentro, en vez de una ciudad a la vez.
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Grid, MenuItem, Paper, Stack,
    TextField, Tooltip, Typography,
} from "@mui/material";
import { ArrowBackRounded, Inventory2Outlined, RefreshRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { useUserStore } from "../../store/user/UserStore";
import { request } from "../../common/request";

type CityVariant = { id: number; title: string; available: number };
type CityProduct = { product_id: number; title: string; sku: string | null; image: string | null; total: number; unassigned: number; variants: CityVariant[] };
type CityRow = { city_id: number; city: string; has_agency: boolean; products: CityProduct[] };
type CityStock = { city_id: number; city: string; total: number; unassigned: number; variants: CityVariant[] };
type ProductCard = { product_id: number; title: string; sku: string | null; image: string | null; total: number; cities: CityStock[] };

/** De "ciudad → productos" a "producto → ciudades": una tarjeta por producto, con todas las ciudades. */
function byProduct(rows: CityRow[]): ProductCard[] {
    const cards = new Map<number, ProductCard>();
    const variantsOf = new Map<number, CityVariant[]>();
    rows.forEach((r) => r.products.forEach((p) => {
        if (!cards.has(p.product_id)) {
            cards.set(p.product_id, { product_id: p.product_id, title: p.title, sku: p.sku, image: p.image, total: 0, cities: [] });
        }
        if (p.variants.length && !variantsOf.has(p.product_id)) variantsOf.set(p.product_id, p.variants);
    }));
    cards.forEach((card) => {
        rows.forEach((r) => {
            const p = r.products.find((x) => x.product_id === card.product_id);
            // Una ciudad sin ese producto también sale, en 0: así se ve dónde no hay
            const variants = p?.variants ?? (variantsOf.get(card.product_id) ?? []).map((v) => ({ ...v, available: 0 }));
            card.cities.push({ city_id: r.city_id, city: r.city, total: p?.total ?? 0, unassigned: p?.unassigned ?? 0, variants });
            card.total += p?.total ?? 0;
        });
        card.cities.sort((a, b) => b.total - a.total || a.city.localeCompare(b.city));
    });

    return [...cards.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** Las vendedoras con vista simple no tienen menú lateral: se les da una barra con "volver". */
const Shell: React.FC<{ lite: boolean; children: React.ReactNode }> = ({ lite, children }) => {
    const navigate = useNavigate();
    if (!lite) return <Layout>{children}</Layout>;
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 2 }}>
            <Button startIcon={<ArrowBackRounded />} onClick={() => navigate("/ordenes")} sx={{ mb: 1, textTransform: "none" }}>
                Mis órdenes
            </Button>
            {children}
        </Box>
    );
};

const chipSx = { height: 20, fontSize: "0.7rem", borderRadius: 1 };

export const CityInventory: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const user = useUserStore((s) => s.user);
    const [rows, setRows] = useState<CityRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cityId, setCityId] = useState<number | "">(""); // "" = todas las ciudades
    const [search, setSearch] = useState("");

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const { status, response } = await request("/inventory/by-city", "GET");
            const data = await response.json();
            if (status === 200 && data.status) {
                setRows(data.data ?? []);
            } else {
                setError(data.message ?? "No se pudo cargar el inventario.");
            }
        } catch {
            setError("Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid]);

    const products = useMemo(() => {
        const q = search.trim().toLowerCase();
        return byProduct(cityId === "" ? rows : rows.filter((r) => r.city_id === cityId))
            .filter((p) => !q || p.title.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
    }, [rows, cityId, search]);

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Shell lite={!!user.is_lite_view}>
            <Box sx={{ maxWidth: 1300, mx: "auto" }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} mb={2}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold">Inventario por ciudad</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Lo que hay para entregar en cada ciudad, talla por talla. Revísalo antes de ofrecer una talla.
                        </Typography>
                    </Box>
                    <Button startIcon={<RefreshRounded />} onClick={fetchData} disabled={loading} sx={{ textTransform: "none" }}>
                        Actualizar
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }} elevation={0} variant="outlined">
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                        <TextField size="small" label="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
                        <TextField
                            select size="small" label="Ciudad" value={cityId}
                            onChange={(e) => setCityId(e.target.value === "" ? "" : Number(e.target.value))}
                            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                            sx={{ minWidth: 220 }}
                        >
                            <MenuItem value="">Todas las ciudades</MenuItem>
                            {rows.map((r) => (
                                <MenuItem key={r.city_id} value={r.city_id}>{r.city}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </Paper>

                {loading && rows.length === 0 ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                ) : rows.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" p={4}>No hay ciudades con agencia.</Typography>
                ) : products.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" p={4}>
                        {search ? "Ningún producto coincide con la búsqueda." : "No hay productos disponibles."}
                    </Typography>
                ) : (
                    <Grid container spacing={2}>
                        {products.map((p) => (
                            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={p.product_id}>
                                <Card elevation={2} sx={{ height: "100%", borderRadius: 3 }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1.5}>
                                            <Box display="flex" gap={1.5} alignItems="center" minWidth={0}>
                                                <Avatar src={p.image ?? undefined} variant="rounded" sx={{ width: 40, height: 40, bgcolor: "grey.100", color: "grey.700" }}>
                                                    <Inventory2Outlined fontSize="small" />
                                                </Avatar>
                                                <Box minWidth={0}>
                                                    <Typography variant="subtitle1" fontWeight="bold" noWrap title={p.title}>{p.title}</Typography>
                                                    <Typography variant="caption" color="text.secondary">SKU: {p.sku || "N/A"}</Typography>
                                                </Box>
                                            </Box>
                                            <Box textAlign="right">
                                                <Typography variant="h5" fontWeight="bold" color={p.total > 0 ? "success.main" : "error.main"}>{p.total}</Typography>
                                                <Typography variant="caption" color="text.secondary">Total</Typography>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ mb: 1 }} />
                                        <Typography variant="subtitle2" gutterBottom>Stock por ciudad</Typography>
                                        <Stack gap={1}>
                                            {p.cities.map((c) => (
                                                <Box key={c.city_id} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1, "&:last-child": { borderBottom: 0, pb: 0 } }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                                                        <Typography variant="body2" fontWeight="bold" noWrap>{c.city}</Typography>
                                                        <Typography variant="body2" fontWeight="bold" color={c.total > 0 ? "primary.main" : "text.disabled"}>
                                                            {c.total > 0 ? c.total : "No hay"}
                                                        </Typography>
                                                    </Box>
                                                    {c.variants.length > 0 && (
                                                        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                                                            {c.variants.map((v) => (
                                                                <Chip
                                                                    key={v.id}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color={v.available > 0 ? "success" : "default"}
                                                                    label={v.available > 0 ? `${v.title}: ${v.available}` : `${v.title}: no hay`}
                                                                    sx={{ ...chipSx, opacity: v.available > 0 ? 1 : 0.55 }}
                                                                />
                                                            ))}
                                                            {c.unassigned > 0 && (
                                                                <Tooltip title="Se cargaron sin decir la talla: no se pueden vender por talla hasta que se repartan.">
                                                                    <Chip size="small" color="warning" label={`Sin talla: ${c.unassigned}`} sx={chipSx} />
                                                                </Tooltip>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            ))}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
        </Shell>
    );
};
