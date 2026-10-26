import { MoreHorizRounded, Check } from "@mui/icons-material";
import { IconButton, Menu, MenuList, Divider, Chip, MenuItem, ListItemIcon, ListItemText, Box, Tooltip, CircularProgress } from "@mui/material";
import { purple, blue, green, red, yellow, grey, orange } from "@mui/material/colors";
import { useState, useEffect } from "react";
import { useUserStore } from "../../../store/user/UserStore";
import { request } from "../../../common/request";

export default function DenseMenu({
    data,
    changeStatus,
    icon = true,
    customComponent
}: {
    data: any,
    changeStatus: (status: string) => void,  // ← Solo texto, sin ID
    icon?: boolean,
    customComponent?: React.ReactNode
}) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClose = () => {
        setAnchorEl(null);
    };
    const user = useUserStore((state) => state.user);

    // Estado para los status obtenidos de la API
    const [statuses, setStatuses] = useState<{ id: number, description: string, color: string, roles: string[] }[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchStatuses = async () => {
        setLoading(true);
        try {
            // Usar el nuevo endpoint que valida todo en el backend
            const { status, response } = await request(`/orders/${data.id}/available-statuses`, 'GET');
            if (status === 200) {
                const result = await response.json();
                setStatuses(result.statuses || []);
            }
        } catch (error) {
            console.error('Error fetching statuses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
        fetchStatuses();
    };

    // Función para asignar colores según el status
    const getColorForStatus = (statusName: string) => {
        const colorMap: { [key: string]: string } = {
            'Novedades': yellow[700],
            'Novedad Solucionada': green[300],
            'Nuevo': purple[300],
            'Reprogramado': green[500],
            'Asignado a vendedor': blue[500],
            'Llamado 1': green[500],
            'Llamado 2': red[500],
            'Llamado 3': purple[300],
            'Esperando Ubicacion': blue[500],
            'Confirmado': green[500],
            'Asignado a repartidor': green[500],
            'En ruta': red[500],
            'Programado para mas tarde': purple[300],
            'Programado para otro dia': blue[500],
            'Entregado': green[500],
            'Cancelado': red[500],
            'Asignar a agencia': blue[400],
            'Pendiente de asignación a agencia': orange[700],
            'Sin Stock': grey[700],
        };
        return colorMap[statusName] || blue[500];
    };

    // Función para asignar roles según el status
    const getRolesForStatus = (statusName: string): string[] => {
        const roleMap: { [key: string]: string[] } = {
            'Novedades': ['Admin', 'Gerente', 'Repartidor', 'Agencia'],
            'Novedad Solucionada': ['Admin', 'Gerente', 'Vendedor'],
            'Nuevo': ['Admin'],
            'Reprogramado': ['Admin', 'Gerente'],
            'Asignado a vendedor': ['Admin', 'Gerente'],
            'Llamado 1': ['Admin', 'Gerente', 'Vendedor'],
            'Llamado 2': ['Admin', 'Gerente', 'Vendedor'],
            'Llamado 3': ['Admin', 'Gerente', 'Vendedor'],
            'Esperando Ubicacion': ['Admin', 'Vendedor', 'Gerente'],
            'Confirmado': ['Admin', 'Vendedor', 'Gerente'],
            'Asignado a repartidor': ['Admin', 'Gerente', 'Vendedor', 'Agencia'],
            'En ruta': ['Admin', 'Gerente', 'Repartidor', 'Agencia'],
            'Programado para mas tarde': ['Admin', 'Gerente', 'Vendedor', 'Repartidor'],
            'Programado para otro dia': ['Admin', 'Gerente', 'Vendedor', 'Repartidor'],
            'Entregado': ['Admin', 'Gerente', 'Repartidor', 'Agencia'],
            'Cancelado': ['Admin', 'Gerente', 'Vendedor'],
            'Asignar a agencia': ['Admin', 'Gerente', 'Vendedor'],
            // Lo ponía el sistema cuando todas las agencias de la ciudad estaban llenas (desde el 30-sep ya no esperan)
            'Pendiente de asignación a agencia': ['Admin'],
            'Sin Stock': ['Admin', 'Gerente'],
        };
        return roleMap[statusName] || ['Admin'];
    };

    return (
        <>
            {icon ? (
                <IconButton onClick={handleClick}>
                    <MoreHorizRounded />
                </IconButton>
            ) : (
                <Box component="button" onClick={handleClick} sx={{ border: 'none', background: 'none', p: 0 }}>
                    {customComponent}
                </Box>
            )}
            <Menu
                elevation={0}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                slotProps={{
                    paper: {
                        sx: {
                            width: 250,
                            padding: 0,
                            borderRadius: 4,
                            border: '1px solid rgba(150,150,150,0.5)'
                        }
                    }
                }}
            >
                <MenuList dense>
                    <Divider textAlign="left">
                        <Chip label="Status" size="small" />
                    </Divider>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        statuses.map((status) => {
                            // El backend ya filtró las opciones disponibles
                            // Solo mostramos lo que nos devolvió
                            const isDisabled = false; // Ya no hay validación en el frontend
                            const tooltipTitle = ""; // Ya no hay tooltip de deshabilitado

                            const menuItem = (
                                <MenuItem
                                    key={status.id}
                                    disabled={isDisabled}
                                    sx={isDisabled ? { opacity: 0.5, color: 'text.disabled' } : {}}
                                    onClick={() => {
                                        if (!isDisabled) {
                                            changeStatus(status.description);
                                            handleClose();
                                        }
                                    }}
                                >
                                    {status.description === data.status?.description ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <ListItemIcon>
                                                <Check sx={{ color: status.color }} />
                                            </ListItemIcon>
                                            {status.description}
                                        </Box>
                                    ) : (
                                        <ListItemText inset>
                                            {status.description}
                                        </ListItemText>
                                    )}
                                </MenuItem>
                            );

                            return isDisabled ? (
                                <Tooltip key={status.id} title={tooltipTitle} placement="left" arrow>
                                    <span>{menuItem}</span>
                                </Tooltip>
                            ) : menuItem;
                        })
                    )}
                </MenuList>
            </Menu>
        </>
    );
}