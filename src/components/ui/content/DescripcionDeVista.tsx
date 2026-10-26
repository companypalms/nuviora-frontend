import { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';
import { Typography, useTheme } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { To, useNavigate } from 'react-router-dom';
import NavigateBeforeRounded from '@mui/icons-material/NavigateBeforeRounded';
import { useUserStore } from '../../../store/user/UserStore';

type Props = {
    title?: string;
    description: string;
    backPath?: string | To;
    buttons?: boolean;
    children?: ReactNode;
}

export const DescripcionDeVista: FC<Props> = ({ description, title, backPath = undefined, buttons = true, children = undefined }) => {

    const router = useNavigate();
    const theme = useTheme();
    const user = useUserStore(state => state.user);
    const styles: any = {
        // Sin el espacio de 64 px que dejaba arriba un Toolbar vacío (no hay barra fija encima)
        nameContainer: {
            borderRadius: 3,
            marginTop: 1,
            marginBottom: 2,
        },
        buttons: {
            background: 'rgba(100,100,100,0.1)',
            textTransform: 'none',
            borderRadius: '10em',
            color: 'text.secondary',
            fontFamily: 'inherit',
            mb: 2,
            '&:hover': {
                background: user.color,
                color: theme.palette.getContrastText(user.color)
            }
        },
        container: {
            display: 'flex',
            alignItems: 'center',
            flexFlow: 'row nowrap',
            gap: 1
        }
    }
    const redirect = () => {
        router('/dashboard')
    }
    return (
        <Box sx={styles.nameContainer} >
            {/* {buttons && (<Button size='small' onClick={redirect} variant="text" sx={styles.buttons} startIcon={< HomeRounded />}>
                Volver al inicio
            </Button >)} */}
            <Box sx={styles.container}>
                {buttons && (<IconButton onClick={() => router(backPath ? backPath : -1 as To)}>
                    <NavigateBeforeRounded />
                </IconButton>)
                }
                {children}
                {title && (
                    <Typography variant='h4' fontWeight={'bold'}>
                        {title}
                    </Typography>
                )}
            </Box>
            <Typography variant='subtitle2' color='text.secondary'>
                {description}
            </Typography>
        </Box>
    )
}