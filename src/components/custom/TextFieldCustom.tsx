import TextField, { TextFieldProps } from '@mui/material/TextField';
import { red } from '@mui/material/colors';
import { lighten, darken } from '@mui/material';
import { useUserStore } from '../../store/user/UserStore';

export function TextFieldCustom(props: TextFieldProps) {
    const { children, ...rest } = props;
    const user = useUserStore((state) => state.user);

    return <TextField fullWidth
        FormHelperTextProps={{ sx: { color: red[500], fontWeight: 'bold' } }}
        {...rest}
        variant="outlined"
        sx={{
            '& input': {
                fontFamily: 'inherit',
                p: 1.5
            },
            '& fieldset': {
                borderRadius: 4,
                fontFamily: 'inherit',
                border: rest.variant === 'filled' ? 'transparent' : '',
                color: (theme) => theme.palette.getContrastText('rgba(200, 200, 200, 0.2)'),
                background: rest.variant === 'filled' ? 'rgba(200, 200, 200, 0.2)' : 'transparent',
            },
            '& label.Mui-focused': {
                color: darken(user.color, 0.3),
            },
            '& label': {
                fontFamily: 'inherit',
                fontSize: 13
            },
            '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                    borderColor: lighten(user.color, 0.3),
                },
            },
            'input:-webkit-autofill': {
                borderRadius: 4,
            }
        }
        }
        onKeyDownCapture={rest.onKeyDownCapture}
        onKeyUpCapture={rest.onKeyUpCapture}
    />;
}