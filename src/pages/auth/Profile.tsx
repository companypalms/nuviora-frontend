import { Avatar, Box, Button, Chip, CircularProgress, Collapse, darken, Paper, Stack, useTheme, alpha } from '@mui/material'
import { orange } from '@mui/material/colors';
import { toast } from 'react-toastify';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista'
import { Layout } from '../../components/ui/Layout'
import { useUserStore } from '../../store/user/UserStore';
import { request } from '../../common/request';
import { useEffect, useState } from 'react';
import { TypographyCustom } from '../../components/custom';
import { ColorPicker } from '../../components/profile/ColorPicker';
import { ThemeChanger } from '../../components/profile/ThemeChanger';
import { Loading } from '../../components/ui/content/Loading';

export const Profile = () => {
    const user = useUserStore(state => state.user);
    const validateToken = useUserStore((state) => state.validateToken);
    const [data, setData] = useState<any>([]);
    const [showTestPanel, setShowTestPanel] = useState(false);
    const theme = useTheme();
    const getUserData = async () => {
        const result = await request('/user/data', 'GET');
        console.log({ result });
        switch (result.status) {
            case 200:
                setData(result.response);
                break;
            default:
                break;
        }

    }

    const triggerTestNoti = async (type: string) => {
        try {
            const body = new URLSearchParams();
            body.append('type', type);
            const { status, response } = await request('/test/notifications', 'POST', body);
            if (status === 200) {
                toast.success(`Disparada: ${type}`);
            } else {
                const data = await response.json();
                toast.error(data.message || "Error al disparar notificación");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error de conexión");
        }
    };
    const validarSesion = async () => {
        const result = await validateToken();
        console.log({ result });
        if (!result.status) return window.location.href = '/';
    }
    useEffect(() => {
        validarSesion();
        getUserData()
    }, [])
    if (!user.token) return (<Loading />)
    return (
        <Layout>
            <DescripcionDeVista title={'Perfil'} description={'Aqui podras ver tus datos personales, editar, entre otras cosas mas!'} />
            <Box sx={{ gap: 2, display: 'flex', flexFlow: 'row wrap' }}>

                <Box sx={{ paddingBlock: 2, background: theme.palette.mode === 'dark' ? darken(user.color, 0.92) : 'white', borderRadius: 5, display: 'flex', justifyContent: 'start', alignItems: 'start', flexFlow: 'column wrap', width: '100%', boxShadow: `0 8px 16px ${user.color}20` }}>
                    <Box sx={{ display: 'flex', flexFlow: 'column nowrap', justifyContent: 'center', alignItems: 'center', margin: 'auto' }}>
                        <Avatar sx={{ width: 100, height: 100, fontSize: 50, background: user.color, color: (theme) => theme.palette.getContrastText(user.color) }}>{`${user.names.charAt(0)}${user.surnames.charAt(0)}`}</Avatar>
                        <TypographyCustom variant="h6" fontWeight={'bold'}>{`${user.names}`}</TypographyCustom>
                        <TypographyCustom variant="h6" fontWeight={'bold'}>{`${user.surnames}`}</TypographyCustom>
                    </Box>
                    <Box sx={{ display: 'flex', flexFlow: 'column wrap', justifyContent: 'center', alignItems: 'center', gap: 1, margin: 'auto' }}>
                        <TypographyCustom>Cambiar color</TypographyCustom>
                        <ColorPicker />
                    </Box>
                    <Box sx={{ display: 'flex', flexFlow: 'column wrap', justifyContent: 'center', alignItems: 'center', gap: 1, margin: 'auto', }}>
                        <TypographyCustom>Cambiar modo</TypographyCustom>
                        <ThemeChanger />
                    </Box>
                </Box>
                <Box sx={{ paddingBlock: 2, background: theme.palette.mode === 'dark' ? darken(user.color, 0.92) : 'white', boxShadow: `0 8px 16px ${user.color}20`, borderRadius: 5, display: 'flex', flexFlow: 'column nowrap', width: '100%' }}>
                    <Box sx={{ p: 2 }}>
                        <TypographyCustom variant="h6" fontWeight={'bold'}>Datos personales</TypographyCustom>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1, pt: 2 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Nombre</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.names}</TypographyCustom>
                        </Box>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Apellidos</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.surnames}</TypographyCustom>
                        </Box>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Correo</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.email}</TypographyCustom>
                        </Box>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Telefono</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.phone}</TypographyCustom>
                        </Box>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Direccion</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.address}</TypographyCustom>
                        </Box>
                    </Box>
                </Box>

                {/* TEST NOTIFICATIONS PANEL */}
                <Box sx={{ width: '100%' }}>
                    <Button
                        variant="outlined"
                        color="warning"
                        fullWidth
                        onClick={() => setShowTestPanel(!showTestPanel)}
                        sx={{
                            borderRadius: 4,
                            py: 1.5,
                            fontWeight: 'bold',
                            bgcolor: alpha(orange[500], 0.1),
                            color: orange[900],
                            '&:hover': { bgcolor: alpha(orange[500], 0.2) }
                        }}
                    >
                        {showTestPanel ? 'Ocultar Panel de Pruebas' : 'Mostrar Panel de Pruebas de Notificaciones 🛠'}
                    </Button>
                    <Collapse in={showTestPanel}>
                        <Paper sx={{ p: 3, mt: 2, borderRadius: 5, border: '2px dashed', borderColor: orange[300], bgcolor: alpha(orange[500], 0.05) }}>
                            <TypographyCustom variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: orange[900], display: 'flex', alignItems: 'center', gap: 1 }}>
                                🛠 PANEL DE PRUEBAS - NOTIFICACIONES
                            </TypographyCustom>
                            <TypographyCustom variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
                                Haz clic en los botones para enviarte una notificación de prueba a ti mismo.
                                Útil para verificar que el sonido y los avisos funcionan en este dispositivo.
                            </TypographyCustom>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                <Button variant="contained" color="primary" sx={{ borderRadius: 3, textTransform: 'none' }} onClick={() => triggerTestNoti('assigned')}>Test Asignación</Button>
                                <Button variant="contained" color="error" sx={{ borderRadius: 3, textTransform: 'none' }} onClick={() => triggerTestNoti('novelty')}>Test Novedad</Button>
                                <Button variant="contained" color="success" sx={{ borderRadius: 3, textTransform: 'none' }} onClick={() => triggerTestNoti('resolved')}>Test Resuelta</Button>
                                <Button variant="contained" color="info" sx={{ borderRadius: 3, textTransform: 'none' }} onClick={() => triggerTestNoti('scheduled')}>Test Posponer</Button>
                                <Button variant="contained" color="warning" sx={{ borderRadius: 3, textTransform: 'none' }} onClick={() => triggerTestNoti('waiting')}>Test Espera</Button>
                            </Box>
                        </Paper>
                    </Collapse>
                </Box>
            </Box>
        </Layout >
    )
}
