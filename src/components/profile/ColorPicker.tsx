import { FC, useState } from 'react'
import { Box, IconButton } from '@mui/material'
import { useUserStore } from '../../store/user/UserStore';
import { toast } from 'react-toastify';
import { amber, blue, green, pink, purple, red, yellow } from '@mui/material/colors';
export const ColorPicker: FC = () => {
    const [changing, setChanging] = useState<boolean>(false);
    const changeColor = useUserStore((state) => state.changeColor);

    const changeColorLocal = async (color: string) => {
        setChanging(true);
        const result = await changeColor(color);
        if (result.status) {
            toast.success('Se cambio el color');
            setChanging(false);
        } else {
            toast.success(result.message);
            setChanging(false);
        }
    }
    const colors = [
        { color: '#0073ff' },
        { color: green[500] },
        { color: red[500] },
        { color: yellow[500] },
        { color: amber[500] },
        { color: purple[500] },
        { color: pink[500] },
    ]

    return (
        <Box sx={{ display: "flex", flexFlow: "row nowrap", alignItems: "center" }}>
            {colors.map((c, i) => (
                <Box key={i}>
                    <IconButton disabled={changing} onClick={() => changeColorLocal(c.color)} >
                        <Box sx={{ width: 15, height: 15, borderRadius: "100%", bgcolor: c.color }}></Box>
                    </IconButton>
                </Box>
            ))}
        </Box>
    )
}