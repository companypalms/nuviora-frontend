import React, { useState } from 'react';
import { useUserStore } from "../../store/user/UserStore";
import { Menu, MenuItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Phone as PhoneIcon, WhatsApp as WhatsAppIcon } from '@mui/icons-material';

interface PhoneActionMenuProps {
    phone: string;
    sx?: any;
}

export const PhoneActionMenu: React.FC<PhoneActionMenuProps> = ({ phone, sx }) => {
    const user = useUserStore((state) => state.user);
    const isRestricted = user?.role?.description === 'Agencia';
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (isRestricted) return;
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleCall = (event: React.MouseEvent) => {
        event.stopPropagation();
        // Limpiar el número (quitar espacios, guiones, paréntesis)
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        window.location.href = `tel:${cleanPhone}`;
        handleClose();
    };

    const handleWhatsApp = (event: React.MouseEvent) => {
        event.stopPropagation();
        // Limpiar el número y quitar el '+' inicial si existe
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
        handleClose();
    };

    return (
        <>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                onClick={handleClick}
                sx={isRestricted ? {
                    cursor: 'default',
                    color: 'text.secondary',
                    ...sx
                } : {
                    cursor: 'pointer',
                    color: 'primary.main',
                    '&:hover': {
                        color: 'primary.main',
                        textDecoration: 'underline'
                    },
                    ...sx
                }}
            >
                {phone}
            </Typography>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={(e) => e.stopPropagation()}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <MenuItem onClick={handleCall}>
                    <ListItemIcon>
                        <PhoneIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText>Llamar por teléfono</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleWhatsApp}>
                    <ListItemIcon>
                        <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
                    </ListItemIcon>
                    <ListItemText>Abrir en WhatsApp</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};
