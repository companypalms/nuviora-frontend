import React, { useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    Box,
    Typography,
    Divider,
    Switch,
    FormControlLabel,
    Tooltip
} from '@mui/material';
import {
    SettingsRounded,
    DarkModeRounded,
    LightModeRounded,
    Circle
} from '@mui/icons-material';
import { useUserStore } from '../../store/user/UserStore';
import { toast } from 'react-toastify';

const COLORS = [
    '#0073ff', // Azul (Default)
    '#00c853', // Verde
    '#ff3d00', // Naranja
    '#d500f9', // Púrpura
    '#f50057', // Rosa
    '#2962ff', // Azul Intenso
    '#00b0ff', // Azul Cielo
    '#ffab00', // Ámbar
];

export const LiteSettingsMenu = () => {
    const { user, changeTheme, changeColor } = useUserStore();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleThemeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newTheme = event.target.checked ? 'dark' : 'light';
        const result = await changeTheme(newTheme);
        if (result.status) {
            toast.success(`Tema cambiado a ${newTheme === 'dark' ? 'Oscuro' : 'Claro'}`);
        }
    };

    const handleColorChange = async (color: string) => {
        const result = await changeColor(color);
        if (result.status) {
            toast.success('Color actualizado');
            // Mantener abierto o cerrar segun preferencia. Lo dejamos abierto para feedback visual inmediato
        }
    };

    return (
        <>
            <Tooltip title="Configuración">
                <IconButton
                    onClick={handleClick}
                    size="small"
                    sx={{ ml: 1, bgcolor: 'action.hover' }}
                >
                    <SettingsRounded fontSize="small" />
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        borderRadius: 3,
                        minWidth: 220,
                        '& .MuiAvatar-root': {
                            width: 32,
                            height: 32,
                            ml: -0.5,
                            mr: 1,
                        },
                        '&:before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 14,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                        Apariencia
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {user.theme === 'dark' ? <DarkModeRounded fontSize="small" /> : <LightModeRounded fontSize="small" />}
                            <Typography variant="body2">Modo Oscuro</Typography>
                        </Box>
                        <Switch
                            checked={user.theme === 'dark'}
                            onChange={handleThemeChange}
                            size="small"
                            color="primary"
                        />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                        Color de Énfasis
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: 200, justifyContent: 'center' }}>
                        {COLORS.map((color) => (
                            <IconButton
                                key={color}
                                size="small"
                                onClick={() => handleColorChange(color)}
                                sx={{
                                    p: 0.5,
                                    border: user.color === color ? `2px solid ${color}` : '2px solid transparent',
                                }}
                            >
                                <Circle sx={{ color: color, fontSize: 24 }} />
                            </IconButton>
                        ))}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <MenuItem onClick={() => window.location.href = '/profile'} sx={{ borderRadius: 2 }}>
                        <Typography variant="body2" fontWeight="medium">Ver mi Perfil</Typography>
                    </MenuItem>
                </Box>
            </Menu>
        </>
    );
};
