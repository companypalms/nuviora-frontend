import LoyaltyRounded from "@mui/icons-material/LoyaltyRounded";
import SportsBasketballRounded from "@mui/icons-material/SportsBasketballRounded";
import TrophyRounded from '@mui/icons-material/EmojiEventsRounded';

import { Stack, Box, CardMedia } from "@mui/material";
import { TypographyCustom } from "../custom";

export const Content = () => {
    return (
        <Stack
            sx={{ flexDirection: 'column', alignSelf: 'center', gap: 4, maxWidth: 450, }}
        >
            {items.map((item, index) => (
                <Stack key={index} direction="row" sx={{ gap: 2 }}>
                    {item.icon}
                    <Box sx={{ color: 'white' }}>
                        <TypographyCustom gutterBottom sx={{ fontWeight: 'medium' }}>
                            {item.title}
                        </TypographyCustom>
                        <CardMedia
                            sx={{ height: '180px' }}
                            component='iframe'
                            title='test'
                            src={item.videoUrl}
                            allowFullScreen
                        />
                    </Box>
                </Stack>
            ))}
        </Stack>
    )
}

const items = [
    {
        icon: <SportsBasketballRounded sx={{ color: "white" }} />,
        title: 'Informacion 1',
        videoUrl: 'https://www.youtube.com/embed/'
    },
    {
        icon: <LoyaltyRounded sx={{ color: "white" }} />,
        title: 'Informacion 2',
        videoUrl: 'https://www.youtube.com/embed/'
    },
    {
        icon: <TrophyRounded sx={{ color: "white" }} />,
        title: 'Informacion 3',
        videoUrl: 'https://www.youtube.com/embed/'
    },
];