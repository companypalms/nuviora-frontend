import { ReactElement } from 'react'
import Chip, { chipClasses } from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import { useUserStore } from '../../../store/user/UserStore';
import { Option } from '.';

type Props = {
    option: Option
}
export const OptionWidget = (props: Props) => {
    const theme = useTheme();
    const user = useUserStore((state) => state.user);
    const router = useNavigate();
    return (
        <Paper sx={{ borderRadius: 2 }} elevation={0}>

            <Chip
                icon={props.option.icon as ReactElement<any>}
                label={props.option.text}
                onClick={() => {
                    props.option.external
                        ? window.open(props.option.path, '_blank')
                        : router(props.option.path)
                }}
                variant='outlined'
                sx={{
                    outline: 'none',
                    borderRadius: 3,
                    display: 'flex',
                    justifyContent: 'start',
                    padding: 2,
                    border: '1px solid rgba(150,150,150,0.2)',
                    [`& .${chipClasses.icon}`]: { color: theme.palette.mode === 'dark' ? user : user.darken },
                    fontFamily: 'inherit',
                    width: '100%'
                }}
            />
        </Paper>
    )
}