import { ReactElement } from "react";
import Grid from '@mui/material/Grid'
import { OptionWidget } from '.';
type Breakpoints = {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
}

export type Option = {
    text: string;
    icon: ReactElement;
    path: string;
    external?: boolean;
}
type Props = {
    options: Option[];
    breakpoints?: Breakpoints;
}
export const OptionsList = (props: Props) => {
    const { breakpoints = { xs: 6, sm: 6, md: 4, lg: 3 } } = props;
    return (
        <Grid container display='flex' alignItems='center' justifyContent='space-between' spacing={1} sx={{ mt: 5 }}>
            {props.options.map((option) => (
                <Grid key={option.text} size={{ ...breakpoints }} >
                    <OptionWidget option={option} />
                </Grid>
            ))}
        </Grid >
    )
}