import { Box, Typography } from '@mui/material';
import { TypographyCustom } from '../custom';

export const LoginHero = () => {
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                padding: 4,
                position: 'relative',
                background: `linear-gradient(135deg, rgba(0, 115, 255, 0.85) 0%, rgba(0, 80, 180, 0.9) 100%), url(/img/crm_bg.png)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 600, textAlign: 'center' }}>
                <TypographyCustom
                    variant="h2"
                    component="h1"
                    sx={{
                        fontWeight: 800,
                        mb: 2,
                        color: 'white',
                        textShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                >
                    Bienvenido a Nuviora
                </TypographyCustom>
                <Typography variant="h5" sx={{ fontWeight: 500, opacity: 0.95, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    Potencia tu negocio con el CRM más avanzado.
                </Typography>
            </Box>
        </Box>
    );
};
