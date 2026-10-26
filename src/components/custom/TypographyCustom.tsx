import Typography, { TypographyProps } from '@mui/material/Typography';
import { amber, blue, green, red } from '@mui/material/colors';
import { lighten } from '@mui/material';
import { useUserStore } from '../../store/user/UserStore';

export function TypographyCustom<C extends React.ElementType>(
    props: TypographyProps<C, { component?: C, fontmode?: number, _color?: string }>
) {
    const { children, ...rest } = props;
    const user = useUserStore((state) => state.user);
    let mode = '5'
    mode = !rest.fontmode ? mode : String(rest.fontmode);

    const colorHash: any = {
        'p': user.color,
        's': lighten(user.color, 0.6),
        'success': green[500],
        'info': blue[500],
        'warning': amber[500],
        'error': red[500],
    }

    // fontmode quedó por compatibilidad: todo el sistema usa la fuente del tema (Inter)
    void mode;
    const styles = rest._color ? { color: colorHash[rest._color] } : {};
    return <Typography sx={{ ...styles }} {...rest}>{children}</Typography>;
}