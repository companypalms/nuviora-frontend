import EmailRounded from "@mui/icons-material/EmailRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import Typography from "@mui/material/Typography";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";

import { FormikState, Form, Formik } from "formik";
import { toast } from "react-toastify";
import { useUserStore } from "../../store/user/UserStore";
import { TypographyCustom, TextFieldCustom, ButtonCustom } from "../custom";
import { useState } from "react";
import { Loading } from "../ui/content/Loading";

const initialValues: FormData = {
    email: '',
    password: '',
}
interface FormData {
    email: string;
    password: string;
}
export const SignInCard = () => {
    const [loading, setLoading] = useState<boolean>(false)
    const login = useUserStore((state) => state.login);
    const onSubmit = async (values: FormData, resetForm: (nextState?: Partial<FormikState<FormData>> | undefined) => void) => {
        setLoading(true)
        const result = await login(values.email, values.password);
        if (result.status) {
            resetForm()
            toast.success(result.message)
            setTimeout(() => {
                const currentUser = useUserStore.getState().user;
                if (currentUser.is_lite_view) {
                    window.location.href = '/ordenes';
                } else {
                    window.location.href = '/dashboard';
                }
            }, 2000)
        } else {
            toast.error(result.message);
            setLoading(false)
        }

    }
    return (
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
                    Iniciar sesión
                </TypographyCustom>
                <Typography variant="body1" color="text.secondary">
                    Bienvenido de nuevo, por favor ingresa tus datos.
                </Typography>
            </Box>

            <Formik
                initialValues={initialValues}
                onSubmit={(values, { resetForm }) => onSubmit(values, resetForm)}
            >
                {({ handleSubmit, handleChange, values }) => (
                    <Form onSubmit={handleSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 3 }}>
                            <FormControl sx={{ gap: 1 }}>
                                <FormLabel htmlFor="email" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Correo electrónico
                                </FormLabel>
                                <TextFieldCustom
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="nombre@ejemplo.com"
                                    autoComplete="email"
                                    value={values.email}
                                    autoFocus
                                    required
                                    fullWidth
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: <EmailRounded sx={{ color: 'text.secondary', mr: 1 }} />,
                                    }}
                                />
                            </FormControl>

                            <FormControl sx={{ gap: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <FormLabel htmlFor="password" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        Contraseña
                                    </FormLabel>
                                </Box>
                                <TextFieldCustom
                                    id="password"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    autoComplete="password"
                                    value={values.password}
                                    required
                                    fullWidth
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: <LockRounded sx={{ color: 'text.secondary', mr: 1 }} />,
                                    }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                                    <Link
                                        href="/recover-password"
                                        variant="subtitle2"
                                        underline="hover"
                                        sx={{ fontWeight: 500, fontSize: '0.875rem' }}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </Box>
                            </FormControl>

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
                                Iniciar sesión
                            </ButtonCustom>

                            <Box sx={{ textAlign: 'center', mt: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    ¿No tienes una cuenta?{' '}
                                    <Link
                                        href="/register"
                                        variant="subtitle2"
                                        underline="hover"
                                        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Regístrate
                                    </Link>
                                </Typography>
                            </Box>
                        </Box>
                    </Form>
                )}
            </Formik>
        </Box>
    )

}