import React, { useContext, useState } from 'react'
import { Avatar, Box, Divider, IconButton, Menu, MenuItem, Typography, darken, lighten, useTheme } from '@mui/material';

import { useNavigate } from 'react-router-dom';
import ExitToApp from '@mui/icons-material/ExitToAppRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import { useUserStore } from '../../../store/user/UserStore';
// import { TypographyCustom } from '../../custom';

export const UserMenu = () => {
    const userLogout = useUserStore((state) => state.logout);
    const user = useUserStore((state) => state.user);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const router = useNavigate();
    const handleClose = () => {
        setAnchorEl(null);
    };
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const redirect = (path: string) => {
        router(path)
    }

    const logout = async () => {
        const result = await userLogout();
        console.log({ result })
        if (result) return window.location.href = '/';
    }
    const theme = useTheme();
    return (
        <Box>
            <IconButton onClick={handleClick}>
                <Avatar alt='User Avatar' sx={{
                    width: 40, height: 40, bgcolor: user.color, color: theme.palette.getContrastText(user.color)
                }}>{user.names.substring(0, 1) + user.surnames.substring(0, 1)}</Avatar>
            </IconButton>
            <Menu open={open} anchorEl={anchorEl} onClose={handleClose} onClick={handleClose}
                PaperProps={styles.paperProps}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={() => redirect('/profile')} sx={{ textAlign: 'center' }}>
                    <SettingsRounded sx={{ color: theme.palette.mode === 'dark' ? lighten(user.color, 0.6) : darken(user.color, 0.6) }} />
                    <Typography variant='subtitle1' sx={{ color: theme.palette.mode === 'dark' ? lighten(user.color, 0.6) : darken(user.color, 0.6), textAlign: 'center' }}>
                        Mi perfil
                    </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => logout()}>
                    <ExitToApp color="error" />
                    <Typography variant='subtitle1' color="error">
                        Cerrar sesion
                    </Typography>
                </MenuItem>
            </Menu>
        </Box>
    )
}


const styles = {
    paperProps: {
        elevation: 0,
        sx: {
            overflow: 'visible',
            width: 200,
            borderRadius: 5,
            p: 2,
            filter: 'drop-shadow(0px 8px 8px rgba(100,100,100,0.1))',
            mt: 1.5,
            '& .MuiAvatar-root': {
                width: 32,
                height: 32,
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
    }
}