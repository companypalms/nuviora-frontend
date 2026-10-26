import React, { ChangeEvent } from "react";
import { Box, Typography, Grid, Stack, IconButton, Tooltip, Paper } from "@mui/material";
import { TextFieldCustom } from "../custom";
import { Link } from "react-router-dom";
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MapIcon from '@mui/icons-material/Map';
import { PhoneActionMenu } from './PhoneActionMenu';
import { CourierShipmentSection } from './CourierShipmentSection';

interface OrderHeaderProps {
    order: any;
    user: any;
    newLocation: string;
    sendLocation: () => Promise<void>;
    handleChangeNewLocation: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onEditLogistics?: () => void;
    onOrderSaved?: (order: unknown) => void;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
    order,
    user,
    newLocation,
    sendLocation,
    handleChangeNewLocation,
    onEditLogistics,
    onOrderSaved,
}) => {
    return (
        <Grid container spacing={4}>
            {/* 👤 SECCIÓN CLIENTE */}
            <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">Detalles del Cliente</Typography>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
                            <PersonIcon fontSize="small" />
                        </Paper>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Nombre</Typography>
                            <Typography variant="body1" fontWeight="bold">
                                {order.client?.first_name} {order.client?.last_name}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'success.main', color: 'white', borderRadius: 2 }}>
                            <PhoneIcon fontSize="small" />
                        </Paper>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Teléfono</Typography>
                            {order.client?.phone ? (
                                <PhoneActionMenu phone={order.client.phone} sx={{ fontWeight: 'bold', fontSize: '1rem' }} />
                            ) : (
                                <Typography variant="body1" fontWeight="bold">No disponible</Typography>
                            )}
                        </Box>
                    </Box>

                    {order.client?.address1 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Paper elevation={0} sx={{ p: 1, bgcolor: 'info.main', color: 'white', borderRadius: 2 }}>
                                <LocationOnIcon fontSize="small" />
                            </Paper>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Dirección de Envío</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {order.client.address1}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {order.client?.address2 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Paper elevation={0} sx={{ p: 1, bgcolor: 'secondary.main', color: 'white', borderRadius: 2 }}>
                                <MapIcon fontSize="small" />
                            </Paper>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Punto de Referencia</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {order.client.address2}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Paper elevation={0} sx={{ p: 1, bgcolor: 'warning.main', color: 'white', borderRadius: 2 }}>
                                <LocationOnIcon fontSize="small" />
                            </Paper>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Provincia / Ciudad</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {order.city?.name || order.client?.city || 'No especificada'}
                                </Typography>
                            </Box>
                        </Box>
                        {['Admin', 'Gerente'].includes(user.role?.description || '') && onEditLogistics && (
                            <Tooltip title="Editar Ciudad">
                                <IconButton size="small" onClick={onEditLogistics} sx={{ color: user.color }}>
                                    <MapIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Stack>
            </Grid>

            {/* 🚚 SECCIÓN LOGÍSTICA */}
            <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">Logística y Entrega</Typography>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'secondary.main', color: 'white', borderRadius: 2 }}>
                            <StorefrontIcon fontSize="small" />
                        </Paper>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Vendedor Asignado</Typography>
                            <Typography variant="body1" fontWeight="bold">
                                {user.role?.description === 'Agencia'
                                    ? '---'
                                    : (order.agent?.names || 'Pendiente de asignar')}
                            </Typography>
                        </Box>
                    </Box>

                    {['Admin', 'Gerente', 'Master'].includes(user.role?.description || '') && order.shop && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Paper elevation={0} sx={{ p: 1, bgcolor: 'warning.light', color: 'white', borderRadius: 2 }}>
                                <StorefrontIcon fontSize="small" />
                            </Paper>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Tienda de Origen</Typography>
                                <Typography variant="body1" fontWeight="bold" color="primary.main">
                                    {order.shop.name}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Paper elevation={0} sx={{ p: 1, bgcolor: 'info.main', color: 'white', borderRadius: 2 }}>
                                <LocalShippingIcon fontSize="small" />
                            </Paper>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Logística / Agencia</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {order.deliverer?.names || (
                                        user.role?.description === 'Vendedor'
                                            ? (order.agency?.names ? 'Asignada a Agencia' : 'Sin asignar')
                                            : (order.agency?.names ? `Agencia: ${order.agency.names}` : 'Sin asignar')
                                    )}
                                </Typography>
                            </Box>
                        </Box>
                        {['Admin', 'Gerente'].includes(user.role?.description || '') && onEditLogistics && (
                            <Tooltip title="Editar Logística">
                                <IconButton size="small" onClick={onEditLogistics} sx={{ color: user.color }}>
                                    <StorefrontIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'error.main', color: 'white', borderRadius: 2 }}>
                            <MapIcon fontSize="small" />
                        </Paper>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block">{order.courier_shipment ? 'Link de la oficina de encomiendas' : 'Link de Ubicación'}</Typography>
                            {order.location ? (
                                <Link to={order.location} target="_blank" style={{ textDecoration: 'none', color: user.color }}>
                                    <Typography variant="body2" fontWeight="bold" sx={{ textDecoration: 'underline' }}>
                                        Abrir en Google Maps
                                    </Typography>
                                </Link>
                            ) : (
                                <Typography variant="body2" color="error" fontWeight="bold">Pendiente de Link</Typography>
                            )}
                            {/* Módulo 3, §7: si el link no trae coordenadas, se avisa a quien puede corregirlo */}
                            {order.location && ['pending', 'invalid'].includes(order.location_status) && !['Repartidor', 'Agencia'].includes(user.role?.description || '') && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}
                                    color={order.location_note === 'Leyendo el enlace…' ? 'text.secondary' : order.location_status === 'invalid' ? 'error.main' : 'warning.main'}>
                                    {order.location_note || (order.location_status === 'invalid' ? 'No es un link de Google Maps.' : 'No se pudieron leer las coordenadas del link.')}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Stack>
            </Grid>

            {/* 📍 INPUT DE UBICACIÓN (SI ES VENDEDOR O ADMIN) */}
            {!(user.role?.description === 'Repartidor' || user.role?.description === 'Agencia') && (
                <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2 }}>
                        <TextFieldCustom
                            onBlur={sendLocation}
                            onChange={handleChangeNewLocation}
                            value={newLocation}
                            label={order.courier_shipment ? "Link de Google Maps de la oficina de encomiendas" : "Actualizar Enlace de Google Maps"}
                            fullWidth
                            variant="outlined"
                            placeholder="Pega aquí el link de la ubicación exacta..."
                        />
                    </Box>
                </Grid>
            )}
            {onOrderSaved && (
                <Grid size={{ xs: 12 }}>
                    <CourierShipmentSection order={order} user={user} onSaved={onOrderSaved} />
                </Grid>
            )}
        </Grid>
    );
};
