import { Box, Typography } from '@mui/material';
import { Bounce, ToastContainer } from 'react-toastify';
import { LoginHero } from '../../components/auth/LoginHero';
import { TypographyCustom, TextFieldCustom, ButtonCustom } from "../../components/custom";
import EmailRounded from "@mui/icons-material/EmailRounded";
import { useState } from 'react';
import { useUserStore } from '../../store/user/UserStore';
import { Loading } from "../../components/ui/content/Loading";
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

export const RecoverPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    // We'll need to add this action to the store later
    const forgotPassword = useUserStore((state: any) => state.forgotPassword);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await forgotPassword(email);
            if (result.status) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Ocurrió un error al enviar el correo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ToastContainer
                stacked
                toastClassName="Toastify__toast"
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                transition={Bounce}
            />
            <Box sx={{
                width: '100%',
                minHeight: '100vh',
                height: '100%',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
            }}>
                <Box sx={{
                    width: { xs: "100%", md: "50%" },
                    height: { xs: '35vh', md: '100vh' },
                    position: 'relative',
                    display: { xs: 'none', md: 'block' }
                }}>
                    <LoginHero />
                </Box>
                <Box sx={{
                    width: { xs: "100%", md: "50%" },
                    minHeight: '100vh',
                    height: '100%',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: { xs: 2, md: 4 }
                }}>
                    <Box sx={{ width: '100%', maxWidth: 450 }}>
                        {loading && (<Loading />)}
                        <Box sx={{ mb: 4 }}>
                            <TypographyCustom
                                textAlign={'left'}
                                component="h1"
                                variant="h4"
                                fontWeight={'bold'}
                                sx={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', mb: 1, color: '#0073ff' }}
                            >
                                Recuperar contraseña
                            </TypographyCustom>
                            <Typography variant="body1" color="text.secondary">
                                Ingresa tu correo electrónico para recibir un enlace de recuperación.
                            </Typography>
                        </Box>

                        <form onSubmit={handleSubmit}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 3 }}>
                                <Box sx={{ gap: 1 }}>
                                    <TypographyCustom
                                        variant="subtitle2"
                                        fontWeight={600}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                                    >
                                        Correo electrónico
                                    </TypographyCustom>
                                    <TextFieldCustom
                                        id="email"
                                        type="email"
                                        name="email"
                                        placeholder="nombre@ejemplo.com"
                                        autoComplete="email"
                                        value={email}
                                        autoFocus
                                        required
                                        fullWidth
                                        onChange={(e: any) => setEmail(e.target.value)}
                                        InputProps={{
                                            startAdornment: <EmailRounded sx={{ color: 'text.secondary', mr: 1 }} />,
                                        }}
                                    />
                                </Box>

                                <ButtonCustom
                                    variant="contained"
                                    fullWidth
                                    type='submit'
                                    sx={{
                                        py: 1.5,
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        mt: 1
                                    }}
                                >
                                    Enviar enlace
                                </ButtonCustom>

                                <Box sx={{ textAlign: 'center', mt: 2 }}>
                                    <Link
                                        to="/"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', cursor: 'pointer' }}>
                                            Volver al inicio de sesión
                                        </Typography>
                                    </Link>
                                </Box>
                            </Box>
                        </form>
                    </Box>
                </Box>
            </Box>
        </>
    );
};
