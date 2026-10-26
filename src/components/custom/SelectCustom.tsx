import { lighten, darken, useTheme, InputLabel, Select, FormControl, FormHelperText, SelectProps, } from '@mui/material';
import { useUserStore } from '../../store/user/UserStore';

type CustomSelectProps = SelectProps & {
    helpertext?: string,
    uppersx?: any,
    children: any,
    label?: string,
    color?: string,
    fullWidth?: boolean,
    sx?: any,
    labelId?: string,
    error?: boolean,
}
export function SelectCustom(
    props: CustomSelectProps
) {
    const { children, label, labelId = `select-${label ?? String(new Date())}`, error = false, fullWidth = true, color = '', uppersx = {}, helpertext = '', variant, ...rest } = props;

    const user = useUserStore((state) => state.user);

    const theme = useTheme();
    const filledStyles = {
        paper: {
            '& .MuiSelect-filled': {
                background: user.color,
                color: theme.palette.getContrastText(user.color),

            },
            '& .MuiMenuItem-root': {
                backgroundColor: lighten(theme.palette.background.paper, 0.1),
                color: theme.palette.getContrastText(lighten(theme.palette.background.paper, 0.1)),
            },
            '& .MuiMenuItem-root:hover': {
                backgroundColor: darken(user.color, 0.6),
                color: theme.palette.getContrastText(darken(user.color, 0.6)),
            },
            '& .MuiMenuItem-root:focus': {
                backgroundColor: darken(user.color, 0.1),
                color: theme.palette.getContrastText(darken(user.color, 0.1)),
            }
        },
        main: {
            '&.MuiInputBase-root::before': {
                border: '0px !important',
            },
            '&.MuiInputBase-root::after': {
                border: '0px'
            },
            '&.MuiInputBase-root': {
                border: '0px',
                background: 'transparent'
            },
            '& .MuiSelect-filled': {
                background: user.color,
                color: theme.palette.getContrastText(user.color),
                borderRadius: 4,
                p: 1.5
            },
            '& .MuiSelect-icon': {
                color: theme.palette.getContrastText(user.color)
            }
        }
    }


    const standardStyles = {
        paper:
        {
            '& .MuiMenuItem-root.Mui-selected': {
                backgroundColor: user.color,
            },
            "& .MuiMenuItem-root:hover": {
                backgroundColor: lighten(user.color, 0.7),
            },
            "& .MuiMenuItem-root.Mui-selected:hover": {
                backgroundColor: darken(user.color, 0.5),
            },
            '&.MuiSelect-filled': {
                background: 'blue'
            }
        },
        main: {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: lighten(user.color, 0.3),
            },
            '& fieldset': {
                borderRadius: 4,
            },
            '& .MuiSelect-select': {
                fontFamily: 'inherit',
            },
        }
    }

    const paperProps = {
        sx: variant === 'filled' ? filledStyles.paper : standardStyles.paper
    }
    const baseStyles = variant === 'filled' ? filledStyles.main : standardStyles.main

    const selectSx = rest.sx
        ? {
            ...baseStyles,
            ...rest.sx,
        }
        : baseStyles

    return (
        <FormControl fullWidth error={error} variant={variant}>
            <InputLabel id={labelId} sx={{
                fontFamily: 'inherit',
                color: variant === 'filled' ? theme.palette.getContrastText(user.color) : theme.palette.getContrastText(theme.palette.background.default),
                position: 'absolute',
                left: 0,
                top: 0,
                '&.Mui-focused': {
                    color: variant === 'filled' ? theme.palette.getContrastText(user.color) : darken(user.color, 0.2),
                },
            }}>{label}</InputLabel>
            <Select labelId={labelId} MenuProps={paperProps} sx={selectSx} {...rest} >
                {children}
            </Select>
            {helpertext && error ? <FormHelperText>{helpertext}</FormHelperText> : ''}
        </FormControl>
    )
}