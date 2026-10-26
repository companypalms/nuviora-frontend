import React, { FC, ReactNode } from 'react'
import { useUserStore } from '../../store/user/UserStore';
import { Box } from '@mui/material';
import { TypographyCustom } from '../custom';

interface Props {
    title: string;
    children: ReactNode;
}
export const Widget: FC<Props> = ({ title, children }) => {
    const user = useUserStore(state => state.user);
    return (
        <Box sx={{
            mt: 5,
            borderRadius: 5,
            p: 2,
            gap: 1,
            minWidth: 150,
            minHeight: 100,
            border: `2px solid ${user.color}30`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            flexFlow: 'column wrap'
        }}>
            <TypographyCustom fontWeight={'bold'} variant='h5'>{title}</TypographyCustom>
            {children}
        </Box>
    )
}
