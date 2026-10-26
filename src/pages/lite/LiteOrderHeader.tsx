import React, { ChangeEvent } from "react";
import { Box, Typography, Grid, Stack, IconButton, Tooltip, Link as MuiLink, Alert, AlertTitle } from "@mui/material";
import { TextFieldCustom } from "../../components/custom";
import { Link } from "react-router-dom";
import { PhoneActionMenu } from '../../components/orders/PhoneActionMenu';
import { CourierShipmentSection } from '../../components/orders/CourierShipmentSection';
import MapIcon from '@mui/icons-material/Map';
import StorefrontIcon from '@mui/icons-material/Storefront';

interface LiteOrderHeaderProps {
    order: any;
    user: any;
    newLocation: string;
    sendLocation: () => Promise<void>;
    handleChangeNewLocation: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onEditLogistics?: () => void;
    onOrderSaved?: (order: unknown) => void;
}

const InfoRow = ({ label, children, action }: { label: string, children: React.ReactNode, action?: React.ReactNode }) => (
    <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
                {children}
            </Box>
            {action}
        </Box>
    </Box>
);

export const LiteOrderHeader: React.FC<LiteOrderHeaderProps> = ({
    order,
    user,
    newLocation,
    sendLocation,
    handleChangeNewLocation,
    onEditLogistics,
    onOrderSaved,
}) => {
    const isNovedad = order.status?.description === 'Novedades';

    return (
        <Grid container spacing={4} sx={{ mt: 0 }}>
            {isNovedad && (
                <Grid size={{ xs: 12 }}>
                    <Alert severity="error" variant="filled" sx={{ mb: 1, borderRadius: 2 }}>
                        <AlertTitle>Novedad Reportada</AlertTitle>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {order.novedad_type}
                        </Typography>
                        <Typography variant="body2">
                            {order.novedad_description}
                        </Typography>
                    </Alert>
                </Grid>
            )}

            {/* COLUMN 1: CLIENTE */}
            <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Cliente">
                    <Typography variant="body1" fontWeight="bold">
                        {order.client?.first_name} {order.client?.last_name}
                    </Typography>
                </InfoRow>

                <InfoRow label="Teléfono">
                    {order.client?.phone ? (
                        <PhoneActionMenu phone={order.client.phone} sx={{ fontWeight: 'bold', fontSize: '1rem' }} />
                    ) : (
                        <Typography variant="body1" color="text.secondary">No disponible</Typography>
                    )}
                </InfoRow>

                {order.client?.address1 && (
                    <InfoRow label="Dirección de Envío">
                        <Typography variant="body1" fontWeight="bold">
                            {order.client.address1}
                        </Typography>
                    </InfoRow>
                )}

                {order.client?.address2 && (
                    <InfoRow label="Punto de Referencia">
                        <Typography variant="body1" fontWeight="bold">
                            {order.client.address2}
                        </Typography>
                    </InfoRow>
                )}

                <InfoRow
                    label="Ubicación (Ciudad)"
                    action={
                        ['Admin', 'Gerente'].includes(user.role?.description || '') && onEditLogistics ? (
                            <Tooltip title="Editar Ciudad">
                                <IconButton size="small" onClick={onEditLogistics} sx={{ p: 0 }}>
                                    <MapIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : null
                    }
                >
                    <Typography variant="body1" fontWeight="bold">
                        {order.city?.name || order.client?.city || 'No especificada'}
                    </Typography>
                </InfoRow>
            </Grid>

            {/* COLUMN 2: LOGÍSTICA */}
            <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Vendedor">
                    <Typography variant="body1" fontWeight="medium">
                        {order.agent?.names || 'Pendiente'}
                    </Typography>
                </InfoRow>

                <InfoRow label="Agencia / Logística">
                    <Typography variant="body1" fontWeight="medium">
                        {order.deliverer?.names || (
                            user.role?.description === 'Vendedor'
                                ? (order.agency?.names ? 'Asignada a Agencia' : 'Sin asignar')
                                : (order.agency?.names ? `Agencia: ${order.agency.names}` : 'Sin asignar')
                        )}
                    </Typography>
                </InfoRow>

                <InfoRow label={order.courier_shipment ? "Link de la oficina de encomiendas" : "Link de Mapa"}>
                    {order.location ? (
                        <MuiLink href={order.location} target="_blank" underline="hover" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                            Abrir en Google Maps ↗
                        </MuiLink>
                    ) : (
                        <Typography variant="body2" color="error">Pendiente</Typography>
                    )}
                </InfoRow>
            </Grid>

            {/* INPUT UPDATE LOCATION */}
            {!(user.role?.description === 'Repartidor' || user.role?.description === 'Agencia') && (
                <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 1 }}>
                        <TextFieldCustom
                            onBlur={sendLocation}
                            onChange={handleChangeNewLocation}
                            value={newLocation}
                            label={order.courier_shipment ? "Link de Maps de la oficina de encomiendas" : "Actualizar Enlace de Mapa"}
                            size="small"
                            fullWidth
                            variant="outlined"
                            placeholder="https://maps.google.com/..."
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.9rem' } }}
                        />
                    </Box>
                </Grid>
            )}
            {onOrderSaved && (
                <Grid size={{ xs: 12 }}>
                    <CourierShipmentSection order={order} user={user} onSaved={onOrderSaved} dense />
                </Grid>
            )}
        </Grid>
    );
};
