import Box from '@mui/material/Box'
import { Bounce, ToastContainer } from 'react-toastify';
import { SignInCard } from '../../components/auth/SingInCard';
// import { Content } from '../../components/auth/Content';
import { useUserStore } from '../../store/user/UserStore';
import { LoginHero } from '../../components/auth/LoginHero';

export const Login = () => {
    const user = useUserStore(state => state.user)
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
                    <SignInCard />
                </Box>
            </Box>
        </>

    )
}
