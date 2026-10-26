import { Box, Typography } from '@mui/material';
import { Bounce, ToastContainer } from 'react-toastify';
import { LoginHero } from '../../components/auth/LoginHero';
import { TypographyCustom, TextFieldCustom, ButtonCustom } from "../../components/custom";
import LockRounded from "@mui/icons-material/LockRounded";
import EmailRounded from "@mui/icons-material/EmailRounded";
import { useState, useEffect } from 'react';
import { useUserStore } from '../../store/user/UserStore';
import { Loading } from "../../components/ui/content/Loading";
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';

export const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // We'll need to add this action to the store later
    const resetPassword = useUserStore((state: any) => state.resetPassword);

    const location = useLocation();
    const navigate = useNavigate();
    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    const emailParam = query.get('email');

    useEffect(() => {
        if (emailParam) setEmail(emailParam);
    }, [emailParam]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }
        if (!token) {
            toast.error('Token inválido.');
            return;
        }

        setLoading(true);
        try {
            const result = await resetPassword({ email, password, password_confirmation: confirmPassword, token });
            if (result.status) {
                toast.success(result.message);
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Ocurrió un error al restablecer la contraseña.');
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
                                Restablecer contraseña
                            </TypographyCustom>
                            <Typography variant="body1" color="text.secondary">
                                Ingresa tu nueva contraseña.
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
                                        value={email}
                                        disabled
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <EmailRounded sx={{ color: 'text.secondary', mr: 1 }} />,
                                        }}
                                    />
                                </Box>

                                <Box sx={{ gap: 1 }}>
                                    <TypographyCustom
                                        variant="subtitle2"
                                        fontWeight={600}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                                    >
                                        Nueva contraseña
                                    </TypographyCustom>
                                    <TextFieldCustom
                                        id="password"
                                        type="password"
                                        name="password"
                                        placeholder="••••••••"
                                        value={password}
                                        required
                                        fullWidth
                                        onChange={(e: any) => setPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: <LockRounded sx={{ color: 'text.secondary', mr: 1 }} />,
                                        }}
                                    />
                                </Box>

                                <Box sx={{ gap: 1 }}>
                                    <TypographyCustom
                                        variant="subtitle2"
                                        fontWeight={600}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                                    >
                                        Confirmar contraseña
                                    </TypographyCustom>
                                    <TextFieldCustom
                                        id="confirmPassword"
                                        type="password"
                                        name="confirmPassword"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        required
                                        fullWidth
                                        onChange={(e: any) => setConfirmPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: <LockRounded sx={{ color: 'text.secondary', mr: 1 }} />,
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
                                    Restablecer contraseña
                                </ButtonCustom>
                            </Box>
                        </form>
                    </Box>
                </Box>
            </Box>
        </>
    );
};
