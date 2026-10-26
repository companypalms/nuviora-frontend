import { Box, CircularProgress, darken, Dialog } from '@mui/material'
import { useUserStore } from '../../../store/user/UserStore'

export const Loading = () => {
    const user = useUserStore((state) => state.user);
    return (
        <Dialog fullScreen open={true}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', background: darken(user.color, 0.9) }}>
                <CircularProgress sx={{ color: user.color }} />
            </Box>
        </Dialog>
    )
}
