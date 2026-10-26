import { AppBar, Toolbar, Box, lighten, darken } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useUserStore } from "../../../store/user/UserStore";
import { UserMenu } from "./UserMenu";
import { TypographyCustom } from "../../custom";

export const NavBar = () => {
    const user = useUserStore((state) => state.user);
    if (user.is_lite_view) return null;

    return (
        <AppBar elevation={0} sx={{ background: lighten(user.color, 0.8), borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
            <Toolbar>
                <Box sx={{ width: '80%', margin: 'auto' }}>
                    <Grid container direction='row' justifyContent='space-between' alignItems='center'>
                        <Grid size={8}>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexFlow: 'row nowrap' }}>
                                <TypographyCustom>TS Sport VE</TypographyCustom>
                            </Box>
                        </Grid>
                        <Grid size={4} >
                            <Box sx={{ display: 'flex', justifyContent: 'end' }}>
                                <UserMenu />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Toolbar>
        </AppBar>
    )
}