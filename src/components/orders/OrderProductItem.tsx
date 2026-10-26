import React, { useState } from "react";
import { Box, Avatar, Typography, IconButton, Paper, Tooltip, Chip, Menu, MenuItem, ListItemText, Button } from "@mui/material";
import { TypographyCustom } from "../custom";
import { fmtMoney } from "../../lib/money";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import EditRoundedIcon from '@mui/icons-material/EditRounded';

interface OrderProductItemProps {
    product: any;
    currency: string;
    onDelete?: () => void;
    onEditQuantity?: (qty: number) => void;
    /** Tarea 4: cambiar la talla o variante de la línea */
    onChangeVariant?: (variantId: number) => void;
}

export const OrderProductItem: React.FC<OrderProductItemProps> = ({ product, currency, onDelete, onEditQuantity, onChangeVariant }) => {
    const subtotal = (Number(product.price) || 0) * (Number(product.quantity) || 0);
    const variants: Array<{ id: number; title: string; is_active: boolean; available: number }> = product.variants ?? [];
    const [variantMenu, setVariantMenu] = useState<HTMLElement | null>(null);
    const canChangeVariant = !!onChangeVariant && variants.length > 0;
    // Fran (30-sep y 3-oct): se ve qué tallas hay y no se puede marcar una que no alcanza, nadie (tampoco el Admin)
    const enough = (v: { available: number }) => v.available >= Number(product.quantity);
    const otherVariants = variants.filter((v) => v.is_active && v.id !== product.variant_id);
    // Fran (3-oct): el selector era muy pequeño y se olvidaba; sin talla no se puede mandar a la agencia
    const missingSize = !product.variant_id && variants.some((v) => v.is_active);
    // La talla elegida (también con los datos sin desglose, que traen solo `size`)
    const sizeTitle: string | null = product.variant_title || (product.variant_id ? product.size : null) || null;

    return (
        <Paper
            elevation={0}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'white',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    borderColor: 'primary.main',
                }
            }}
        >
            <Avatar
                src={product.image || undefined}
                alt={product.showable_name || product.title}
                variant="rounded"
                sx={{
                    width: 50,
                    height: 50,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    bgcolor: 'grey.100',
                    color: 'grey.800'
                }}
            >
                {!product.image && <Inventory2OutlinedIcon fontSize="small" />}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <TypographyCustom
                    variant="body2"
                    fontWeight="bold"
                    sx={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: 'block'
                    }}
                    title={product.showable_name || product.title}
                >
                    {product.showable_name || product.title}
                </TypographyCustom>

                {product.description && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '0.7rem',
                            mt: -0.2,
                            opacity: 0.7
                        }}
                    >
                        {product.description}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    {/* Tarea 4: la talla de la línea. Fran (3-oct): en grande, para que la agencia no se equivoque */}
                    {sizeTitle ? (
                        <Tooltip title={canChangeVariant ? "Cambiar la talla" : ""}>
                            <Box
                                onClick={canChangeVariant ? (e) => setVariantMenu(e.currentTarget) : undefined}
                                sx={{
                                    display: 'inline-flex', alignItems: 'baseline', gap: 0.75,
                                    px: 1.5, py: 0.25, borderRadius: 2,
                                    bgcolor: 'primary.main', color: 'primary.contrastText',
                                    cursor: canChangeVariant ? 'pointer' : 'default',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                }}
                            >
                                <Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, opacity: 0.85 }}>TALLA</Typography>
                                <Typography component="span" sx={{ fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.2 }}>{String(sizeTitle).toUpperCase()}</Typography>
                                {canChangeVariant && <EditRoundedIcon sx={{ fontSize: 14, opacity: 0.8, alignSelf: 'center' }} />}
                            </Box>
                        </Tooltip>
                    ) : variants.length > 0 && (
                        <Chip
                            size="small"
                            label="Sin talla"
                            color="warning"
                            onClick={canChangeVariant ? (e) => setVariantMenu(e.currentTarget) : undefined}
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 'bold' }}
                        />
                    )}
                    <Tooltip title={onEditQuantity ? "Click para editar cantidad" : ""}>
                        <Box
                            onClick={() => onEditQuantity && onEditQuantity(Number(product.quantity))}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5,
                                bgcolor: product.has_stock === false ? 'error.main' : 'action.hover',
                                color: product.has_stock === false ? 'white' : 'text.primary',
                                px: 0.8, py: 0.2, borderRadius: 1, fontWeight: 'bold',
                                cursor: onEditQuantity ? 'pointer' : 'default',
                                '&:hover': onEditQuantity ? { bgcolor: 'action.selected' } : {}
                            }}
                        >
                            <Typography variant="caption" fontWeight="bold" color="inherit">
                                Cant: {product.quantity}
                            </Typography>
                            {onEditQuantity && <EditRoundedIcon sx={{ fontSize: 12, opacity: 0.7 }} />}
                        </Box>
                    </Tooltip>
                    {product.stock_available !== undefined && (
                        <Typography variant="caption" sx={{ color: product.has_stock === false ? 'error.main' : 'text.secondary', fontWeight: 'bold' }}>
                            (Disp: {product.stock_available})
                        </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                        × {fmtMoney(Number(product.price), currency)}
                    </Typography>
                </Box>

                {missingSize && (
                    <Box sx={{ mt: 1, p: 1, borderRadius: 2, border: '2px solid', borderColor: 'warning.main', bgcolor: 'rgba(237,108,2,0.08)' }}>
                        <Typography variant="body2" fontWeight="bold" color="warning.main">
                            ⚠️ Elige la talla. Sin talla no se puede mandar a la agencia.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            {variants.filter((v) => v.is_active).map((v) => (
                                <Button
                                    key={v.id}
                                    size="small"
                                    variant={enough(v) ? 'contained' : 'outlined'}
                                    color={enough(v) ? 'primary' : 'inherit'}
                                    disabled={!canChangeVariant || !enough(v)}
                                    onClick={() => onChangeVariant?.(v.id)}
                                    sx={{ minWidth: 64, textTransform: 'none', flexDirection: 'column', lineHeight: 1.2, py: 0.5 }}
                                >
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{v.title}</span>
                                    <span style={{ fontSize: '0.65rem' }}>{enough(v) ? `hay ${v.available}` : 'no hay'}</span>
                                </Button>
                            ))}
                        </Box>
                    </Box>
                )}

                {!missingSize && otherVariants.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">Otras tallas:</Typography>
                        {otherVariants.map((v) => (
                            <Tooltip key={v.id} title={enough(v) ? (canChangeVariant ? `Cambiar a ${v.title}` : '') : 'No hay suficientes en la agencia'}>
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    color={enough(v) ? 'success' : 'default'}
                                    label={enough(v) ? `${v.title} · hay ${v.available}` : `${v.title} · no hay`}
                                    onClick={canChangeVariant && enough(v) ? () => onChangeVariant?.(v.id) : undefined}
                                    sx={{ height: 18, fontSize: '0.65rem', opacity: enough(v) ? 1 : 0.6, textDecoration: enough(v) ? 'none' : 'line-through' }}
                                />
                            </Tooltip>
                        ))}
                    </Box>
                )}

                {product.upsell_user_name && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', display: 'block', mt: 0.5 }}>
                        ✨ Upsell por: {product.upsell_user_name}
                    </Typography>
                )}
            </Box>

            <Menu anchorEl={variantMenu} open={!!variantMenu} onClose={() => setVariantMenu(null)}>
                {variants.map(v => (
                    <MenuItem
                        key={v.id}
                        selected={v.id === product.variant_id}
                        disabled={v.id !== product.variant_id && (!v.is_active || !enough(v))}
                        onClick={() => { setVariantMenu(null); if (v.id !== product.variant_id) onChangeVariant?.(v.id); }}
                    >
                        <ListItemText
                            primary={v.title}
                            secondary={v.available > 0 ? `Hay ${v.available}` : 'No hay en la agencia'}
                            secondaryTypographyProps={{ color: enough(v) ? 'success.main' : 'error.main' }}
                        />
                    </MenuItem>
                ))}
            </Menu>

            <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="black" color="text.primary">
                    {fmtMoney(subtotal, currency)}
                </Typography>
                {onDelete && (
                    <Tooltip title="Eliminar Producto">
                        <IconButton size="small" color="error" onClick={onDelete} sx={{ '&:hover': { bgcolor: 'error.lighter' } }}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        </Paper>
    );
};
