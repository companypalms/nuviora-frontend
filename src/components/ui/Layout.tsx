import { FC } from 'react';
import { Box, darken, lighten } from '@mui/material';
// import { Footer } from './footer';

import { useUserStore } from '../../store/user/UserStore';
import { SideBar } from './nav';
import { NotificationMonitor } from './notifications/NotificationMonitor';
import { BroadcastMonitor } from './notifications/BroadcastMonitor';
import { AppToasts } from './notifications/AppToasts';
import { HelpChat } from '../help/HelpChat';
import { EDITOR_ROLES } from '../meta-ads/editorShared';
type Props = {
    children: React.ReactNode;
    noMargin?: boolean;
    container?: boolean;
}

export const Layout: FC<Props> = ({ children, container = true, noMargin = false }) => {
    const user = useUserStore((state) => state.user);
    // .96: los editores tienen el botón "¿Dudas?" abajo a la derecha; se deja lugar para que no tape lo último de la pantalla
    const helpRoom = EDITOR_ROLES.includes(user.role?.description ?? '');
    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', justifyContent: 'space-between' }}>
            <NotificationMonitor />
            <BroadcastMonitor />
            <SideBar />
            <Box sx={{
                flex: 1,
                minHeight: '100vh',
                p: noMargin ? 0 : 2,
                ...(helpRoom ? { pb: 10 } : {}),
                background: (theme) => theme.palette.mode === 'dark' ? darken(user.color, 0.9) : lighten(user.color, 0.97),
                overflowX: 'hidden'
            }}>
                {children}
            </Box>
            {/* <Footer /> */}
            <AppToasts />
            <HelpChat />
        </Box >
    )
}

