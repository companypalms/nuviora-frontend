import { Avatar, AvatarProps, Theme, useTheme } from '@mui/material'
import { FC } from 'react';
import { useUserStore } from '../../store/user/UserStore';

interface Props extends AvatarProps {
    customurl?: string;
    customsize?: number;
}

export const AvatarCustom: FC<Props> = (props) => {
    const theme: Theme = useTheme();
    const user = useUserStore((state) => state.user);
    const { customurl, customsize = 40, ...rest } = props;
    const customSize = {
        width: customsize,
        height: customsize,
        fontSize: customsize * 0.5
    };
    return customurl ?
        (<Avatar {...rest} src={customurl} />)
        : (<Avatar {...rest} sx={{ background: user.color, color: theme.palette.getContrastText(user.color), ...customSize }}>{`${user.names.charAt(0)}${user.surnames.charAt(0)}`}</Avatar>)
}
