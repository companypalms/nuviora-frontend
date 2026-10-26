import { FC, useState, useEffect } from "react";
import {
    Box, Typography, Grid, Paper, Divider, Button,
    IconButton, CircularProgress,
    TextField, InputAdornment,
    Tab, Tabs, useTheme, Chip
} from "@mui/material";
import {
    SearchRounded,
    CloudUploadRounded,
    DeleteRounded,
    InfoOutlined,
    ImageRounded,
    Inventory2Outlined as Inventory2OutlinedIcon,
    EditRounded,
    SaveRounded,
    CancelRounded
} from "@mui/icons-material";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { fmtMoney } from "../../lib/money";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL.replace('/api', '');

interface ProductImage {
    id: number;
    path: string;
}

interface ProductDetail {
    id: number;
    title: string;
    description: string;
    showable_name?: string;
    price: number;
    image: string;
    sku: string;
    gallery: ProductImage[];
}

interface Props {
    orderProducts: any[];
    isAdmin?: boolean;
}

export const ProductTechnicalSheet: FC<Props> = ({ orderProducts, isAdmin }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const getImageUrl = (path: string) => {
        if (!path) return "https://placehold.co/400x400/1e1e1e/white?text=No+Imagen";
        if (path.startsWith('http')) return path;
        return `${BACKEND_URL}${path}`;
    };

    const handleImageError = (e: any) => {
        e.target.src = "https://placehold.co/400x400/1e1e1e/white?text=No+Imagen";
    };

    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [activeViewTab, setActiveViewTab] = useState(0);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState("");

    useEffect(() => {
        if (orderProducts.length > 0 && activeViewTab === 0 && !selectedProductId) {
            fetchProductDetails(orderProducts[0].product_id);
        }
    }, [orderProducts]);

    const fetchProductDetails = async (id: number) => {
        setLoading(true);
        setSelectedProductId(id);
        setIsEditingDesc(false);
        try {
            const { status, response } = await request(`/products/${id}`, "GET");
            if (status) {
                const data = await response.json();
                setProduct(data.product);
                setTempDesc(data.product.description || "");
            }
        } catch (error) {
            toast.error("Error al cargar detalles del producto");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDescription = async () => {
        if (!product) return;
        setLoading(true);
        try {
            const { ok, status, response } = await request(`/products/${product.id}`, "PUT", {
                description: tempDesc
            });
            if (ok) {
                setProduct({ ...product, description: tempDesc });
                setIsEditingDesc(false);
                toast.success("Descripción actualizada ✨");
            } else {
                const err = await response.json();
                toast.error(err.message || `Error ${status} al actualizar descripción`);
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const { status, response } = await request(`/products?search=${query}`, "GET");
            if (status) {
                const data = await response.json();
                setSearchResults(data.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!product || !e.target.files?.[0]) return;

        const formData = new FormData();
        formData.append('image', e.target.files[0]);

        setLoading(true);
        try {
            const { status, response } = await request(`/products/${product.id}/gallery`, "POST", formData, true);
            if (status) {
                const data = await response.json();
                setProduct({
                    ...product,
                    gallery: [...(product.gallery || []), data.image]
                });
                toast.success("Imagen subida ✅");
            } else {
                const err = await response.json();
                toast.error(err.message || "Error al subir imagen");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteImage = async (imageId: number) => {
        if (!product || !confirm("¿Eliminar esta imagen de la galería?")) return;

        try {
            const { status } = await request(`/products/${product.id}/gallery/${imageId}`, "DELETE");
            if (status) {
                setProduct({
                    ...product,
                    gallery: product.gallery.filter(img => img.id !== imageId)
                });
                toast.success("Imagen eliminada");
            }
        } catch (error) {
            toast.error("Error al eliminar imagen");
        }
    };

    return (
        <Box sx={{ p: { xs: 0, sm: 2 } }}>
            <Grid container spacing={3}>
                {/* Sidebar: Search and List */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: 4,
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fff',
                            border: '1px solid',
                            borderColor: 'divider',
                            position: 'sticky',
                            top: 20
                        }}
                    >
                        <Tabs
                            value={activeViewTab}
                            onChange={(_, v) => setActiveViewTab(v)}
                            variant="fullWidth"
                            sx={{
                                mb: 2,
                                minHeight: 40,
                                '& .MuiTab-root': {
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    minHeight: 40,
                                    borderRadius: 2,
                                    transition: 'all 0.2s'
                                },
                                '& .Mui-selected': {
                                    color: 'primary.main',
                                    bgcolor: 'action.selected'
                                },
                                '& .MuiTabs-indicator': { display: 'none' }
                            }}
                        >
                            <Tab label="ÓRDEN" />
                            <Tab label="BUSCAR" />
                        </Tabs>

                        {activeViewTab === 1 && (
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Escribe para buscar..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                                    }
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRounded fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', pr: 0.5 }}>
                            {activeViewTab === 0 ? (
                                <>
                                    {orderProducts.length === 0 && (
                                        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                                            Sin productos en órden
                                        </Typography>
                                    )}
                                    {orderProducts.map((op) => (
                                        <Box
                                            key={op.id}
                                            onClick={() => fetchProductDetails(op.product_id)}
                                            sx={{
                                                p: 1.5,
                                                cursor: 'pointer',
                                                borderRadius: 3,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                border: '1px solid',
                                                borderColor: selectedProductId === op.product_id ? 'primary.main' : 'transparent',
                                                bgcolor: selectedProductId === op.product_id ? (isDark ? 'rgba(0, 115, 255, 0.15)' : 'rgba(0, 115, 255, 0.05)') : 'transparent',
                                                '&:hover': {
                                                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.02)',
                                                    transform: 'translateX(4px)'
                                                },
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={getImageUrl(op.image)}
                                                sx={{ width: 44, height: 44, borderRadius: 2, objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
                                                onError={(e: any) => e.target.src = "https://via.placeholder.com/44?text=P"}
                                            />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="subtitle2" noWrap fontWeight={selectedProductId === op.product_id ? "bold" : "medium"}>
                                                    {op.showable_name || op.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">Cant: {op.quantity}</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {searching && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>}
                                    {searchResults.map((p) => (
                                        <Box
                                            key={p.id}
                                            onClick={() => fetchProductDetails(p.id)}
                                            sx={{
                                                p: 1.5,
                                                cursor: 'pointer',
                                                borderRadius: 3,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                border: '1px solid',
                                                borderColor: selectedProductId === p.id ? 'primary.main' : 'transparent',
                                                bgcolor: selectedProductId === p.id ? (isDark ? 'rgba(0, 115, 255, 0.1)' : 'rgba(0, 115, 255, 0.05)') : 'transparent',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={getImageUrl(p.image)}
                                                onError={handleImageError}
                                                sx={{ width: 36, height: 36, borderRadius: 1.5, objectFit: 'cover' }}
                                            />
                                            <Typography variant="body2" fontWeight="bold" noWrap sx={{ flex: 1 }}>{p.showable_name || p.title}</Typography>
                                        </Box>
                                    ))}
                                </>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* Main Content */}
                <Grid size={{ xs: 12, md: 9 }}>
                    {loading ? (
                        <Box sx={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
                            <CircularProgress thickness={2} size={60} />
                            <Typography sx={{ mt: 2, opacity: 0.6, letterSpacing: 2 }}>CARGANDO</Typography>
                        </Box>
                    ) : product ? (
                        <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
                            {/* Product Hero Section */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 3, sm: 5 },
                                    borderRadius: 6,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    mb: 3
                                }}
                            >
                                <Grid container spacing={4} alignItems="center">
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Box sx={{ position: 'relative' }}>
                                            <Box
                                                component="img"
                                                src={getImageUrl(product.image)}
                                                onError={handleImageError}
                                                sx={{
                                                    width: '100%',
                                                    aspectRatio: '1/1',
                                                    borderRadius: 5,
                                                    objectFit: 'cover',
                                                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                                    transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                    '&:hover': { transform: 'scale(1.05)' }
                                                }}
                                            />
                                            {product.sku && (
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -10,
                                                    left: -10,
                                                    bgcolor: 'primary.main',
                                                    color: 'white',
                                                    px: 2,
                                                    py: 0.5,
                                                    borderRadius: 2,
                                                    fontWeight: 'black',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                                    zIndex: 1
                                                }}>
                                                    {product.sku}
                                                </Box>
                                            )}
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 8 }}>
                                        <Typography variant="h3" fontWeight="900" sx={{ mb: 1, letterSpacing: -1, lineHeight: 1.1, fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}>
                                            {product.showable_name || product.title}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                            <Typography variant="h4" color="primary" fontWeight="bold">
                                                {fmtMoney(product.price, "USD")}
                                            </Typography>
                                            <Chip
                                                icon={<Inventory2OutlinedIcon sx={{ fontSize: '1rem' }} />}
                                                label="En Inventario"
                                                color="success"
                                                variant="outlined"
                                                size="small"
                                                sx={{ borderRadius: 2, fontWeight: 'bold' }}
                                            />
                                        </Box>
                                        <Divider sx={{ mb: 3, opacity: 0.5 }} />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                            <Typography variant="overline" fontWeight="black" color="text.secondary">ESPECIFICACIONES TÉCNICAS</Typography>
                                            {isAdmin && !isEditingDesc && (
                                                <Button
                                                    size="small"
                                                    startIcon={<EditRounded />}
                                                    onClick={() => setIsEditingDesc(true)}
                                                    sx={{ borderRadius: 2 }}
                                                >
                                                    Editar
                                                </Button>
                                            )}
                                        </Box>

                                        {isEditingDesc ? (
                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    rows={4}
                                                    value={tempDesc}
                                                    onChange={(e) => setTempDesc(e.target.value)}
                                                    sx={{
                                                        mb: 2,
                                                        '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'background.paper' }
                                                    }}
                                                />
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Button variant="contained" startIcon={<SaveRounded />} onClick={handleSaveDescription} sx={{ borderRadius: 2 }}>Guardar</Button>
                                                    <Button variant="outlined" color="inherit" onClick={() => { setIsEditingDesc(false); setTempDesc(product.description || ""); }} sx={{ borderRadius: 2 }}>Cancelar</Button>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <Typography variant="body1" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', lineHeight: 1.8, fontSize: '0.95rem' }}>
                                                {product.description || "Sin especificaciones técnicas registradas."}
                                            </Typography>
                                        )}
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* Gallery Section */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 3, sm: 5 },
                                    borderRadius: 6,
                                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                    <Box>
                                        <Typography variant="h5" fontWeight="black" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <ImageRounded color="primary" /> Galería Multimedia
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">Fotos reales y capturas del producto físico</Typography>
                                    </Box>
                                    {isAdmin && (
                                        <Button
                                            variant="contained"
                                            component="label"
                                            startIcon={<CloudUploadRounded />}
                                            sx={{ borderRadius: 3, px: 3, boxShadow: '0 4px 14px rgba(0, 115, 255, 0.4)' }}
                                        >
                                            Añadir Foto
                                            <input type="file" hidden accept="image/*" onChange={handleUploadImage} />
                                        </Button>
                                    )}
                                </Box>

                                {(product.gallery || []).length > 0 ? (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
                                        {product.gallery.map((img) => (
                                            <Box
                                                key={img.id}
                                                sx={{
                                                    position: 'relative',
                                                    borderRadius: 4,
                                                    overflow: 'hidden',
                                                    aspectRatio: '3/4',
                                                    '&:hover .overlay': { opacity: 1 },
                                                    '&:hover img': { transform: 'scale(1.1)' },
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={getImageUrl(img.path)}
                                                    onError={handleImageError}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                                                    }}
                                                />
                                                <Box
                                                    className="overlay"
                                                    sx={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        bgcolor: 'rgba(0,0,0,0.4)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        opacity: 0,
                                                        transition: 'opacity 0.3s',
                                                        backdropFilter: 'blur(4px)',
                                                        gap: 1
                                                    }}
                                                >
                                                    <IconButton
                                                        onClick={() => window.open(getImageUrl(img.path), '_blank')}
                                                        sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                                                    >
                                                        <SearchRounded />
                                                    </IconButton>
                                                    {isAdmin && (
                                                        <IconButton
                                                            onClick={() => handleDeleteImage(img.id)}
                                                            sx={{ color: '#ff4d4d', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                                                        >
                                                            <DeleteRounded />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Box sx={{
                                        py: 8,
                                        textAlign: 'center',
                                        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                        borderRadius: 6,
                                        border: '2px dashed',
                                        borderColor: 'divider'
                                    }}>
                                        <ImageRounded sx={{ fontSize: 48, opacity: 0.1, mb: 2 }} />
                                        <Typography variant="body2" color="text.secondary">Aún no hay fotos en esta galería técnico.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    ) : (
                        <Box sx={{
                            height: '100%',
                            minHeight: 500,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            opacity: 0.5
                        }}>
                            <Box sx={{
                                width: 120, height: 120,
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: 'action.hover', border: '1px solid divider',
                                mb: 2, mx: 'auto'
                            }}>
                                <Inventory2OutlinedIcon sx={{ fontSize: 60 }} />
                            </Box>
                            <Typography variant="h5" fontWeight="bold" textAlign="center">Selecciona un producto</Typography>
                            <Typography variant="body2" textAlign="center">Para visualizar sus especificaciones técnicas y material multimedia</Typography>
                        </Box>
                    )}
                </Grid>
            </Grid>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 0.5; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </Box>
    );
};

