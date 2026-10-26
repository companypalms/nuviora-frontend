import { alpha, createTheme, darken, lighten, Theme, ThemeOptions } from "@mui/material/styles";

/** Inter en todo el sistema; las demás son de reserva mientras carga. */
export const FONT_FAMILY = ['"Inter"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'].join(',');

/**
 * Colores del borde con brillo de las tarjetas, sacados del color que eligió el usuario. Todo el borde brilla (como el
 * filo de los íconos de un teléfono): las esquinas superior izquierda e inferior derecha con el tono más claro, y las
 * otras dos con uno algo menos claro, pero siempre más claro que el fondo, nunca oscuro.
 */
export const glowColors = (theme: Theme) => {
    const c = theme.palette.primary.main;
    // En oscuro, el mismo color (no aclarado hacia el blanco): las esquinas brillantes casi enteras y las otras más
    // transparentes. En claro, tintes suaves del color.
    return theme.palette.mode === "dark"
        ? { light: alpha(lighten(c, 0.1), 0.85), dark: alpha(c, 0.32) }
        : { light: lighten(c, 0.55), dark: lighten(c, 0.85) };
};

const typography: ThemeOptions["typography"] = {
    fontFamily: FONT_FAMILY,
    htmlFontSize: 16,
    h1: { fontWeight: 700, letterSpacing: "-0.025em" },
    h2: { fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 600, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
    overline: { fontWeight: 600, letterSpacing: "0.08em" },
};

const components = (paper: string, body: string): ThemeOptions["components"] => ({
    MuiCssBaseline: {
        styleOverrides: {
            body: {
                backgroundColor: body,
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
                // Números del mismo ancho: los montos y los contadores no bailan al cambiar
                fontFeatureSettings: '"tnum"',
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundColor: paper,
                backgroundImage: "none",
            },
        },
    },
    MuiButton: {
        styleOverrides: {
            root: { textTransform: "none", fontWeight: 600 },
        },
    },
    MuiTab: {
        styleOverrides: {
            root: { textTransform: "none", fontWeight: 600 },
        },
    },
});

export const getThemeLight = (primaryColor: string) => createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: primaryColor,
        },
        background: {
            default: '#F7F7F7',
        },
    },
    typography,
    components: components('#ffffff', '#fbfbfb'),
});

export const getThemeDark = (primaryColor: string) => createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: primaryColor,
        },
        background: {
            default: '#191919'
        },
    },
    typography,
    components: components(darken(primaryColor, 0.8), '#191919'),
});
