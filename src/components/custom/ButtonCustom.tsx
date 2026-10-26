import { ButtonProps, Button, useTheme } from "@mui/material";
import { lighten, darken, } from "@mui/material";
import { useUserStore } from "../../store/user/UserStore";

export function ButtonCustom<C extends React.ElementType>(
    props: ButtonProps<C, { component?: C, customcolor?: string, nofull?: boolean }>
) {
    const { children, ...rest } = props;
    const user = useUserStore((state) => state.user);

    const { customcolor, nofull } = rest;
    const theme = useTheme();

    const colorForTheme = theme.palette.mode === 'dark' ? user.color : user.darken;
    /**
     * Configuraciones de colores del button custom
     */
    const background = rest.variant && rest.variant === 'outlined'
        ? 'transparent'
        : customcolor
            ? darken(customcolor, 0.2)
            : colorForTheme

    // Si hay un color personalizado de boton, entonces el borde sera el mismo color, oscurecido. Si no hay color personalizado entonces dependiendo del tema sera el color del borde. Color de usuario (para tema oscuro) / color de usuario oscurecido (para tema claro)
    const borderColor = customcolor
        ? darken(customcolor, 0.2)
        : colorForTheme

    // Si no es outlined entonces el color de la letra sera en contraste al color de usuario
    // Si hay un color personalizado, entonces la letra sera el mismo color pero oscurecido
    // Si no hay color personalizado, entonces dependiendo del tema sera el color de la letra. Color de usuario (para tema oscuro) / Color de usuario oscurecido (para tema claro)
    // Sin variant el fondo tambien es relleno, asi que la letra va en contraste (si no, quedaba del mismo color que el fondo)
    const color = rest.variant !== 'outlined'
        ? theme.palette.getContrastText(user.color)
        : customcolor
            ? darken(customcolor, 0.2)
            : colorForTheme

    /**
     * (HOVER)
    */
    //  Configuracion del borde basado en tema y props 
    const borderColorHover = customcolor ? customcolor : theme.palette.mode === 'dark' ? user.darken : user.color

    //  Configuracion del fondo basado en tema y props 
    const backgroundHover = rest.variant && rest.variant === 'outlined'
        ? customcolor ? lighten(customcolor, 0.2) : theme.palette.mode === 'dark' ? user.color : user.lighten
        : customcolor ? customcolor : theme.palette.mode === 'dark' ? user.lighten : user.color

    //  Configuracion del color de la letra basado en tema y props 
    const colorHover = theme.palette.getContrastText(
        rest.variant && rest.variant === 'outlined'
            ? customcolor ? lighten(customcolor, 0.2) : theme.palette.mode === 'dark' ? user.color : user.lighten
            : customcolor ? customcolor : theme.palette.mode === 'dark' ? user.lighten : user.color
    )

    return <Button
        fullWidth={nofull ? false : true}
        disableElevation
        sx={{
            fontFamily: 'inherit',
            borderRadius: 4,
            textTransform: 'none',
            p: 1.5,
            background,
            borderColor,
            color,
            '&:hover': {
                borderColor: borderColorHover,
                background: backgroundHover,
                color: colorHover
            }
        }}
        {...rest}
    >
        {children}
    </Button>;
}