import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { es } from 'date-fns/locale'
import { darken, lighten } from '@mui/material';
import { Dispatch, SetStateAction, useState } from 'react';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import moment from 'moment';
import { TextFieldCustom } from '.';
import { useUserStore } from '../../store/user/UserStore';

interface Props {
    setValue: Dispatch<SetStateAction<any>>;
    week?: boolean;
    rest: any;
}
export const CalendarCustom = (props: Props) => {
    const [value, setValue] = useState(new Date(moment().format('MM-DD-YYYY')))
    const handleChange = (newValue: any) => {
        setValue(newValue)
        // console.log({ fecha: moment(newValue).format('DD-MM-yyyy'), originalValue: newValue })
        props.setValue(newValue);
    }
    const user = useUserStore((state) => state.user);

    return (
        <LocalizationProvider adapterLocale={es} dateAdapter={AdapterDateFns}>
            <DatePicker
                {...props.rest}
                inputFormat={props.week ? 'dd-MM' : 'dd-MM-yyyy'}
                value={value}
                onChange={handleChange}
                views={props.week ? ['day', 'month'] : ['day', 'month', 'year']}
                sx={{
                    width: '100%',
                    '& input': {
                        fontFamily: 'inherit',
                        p: 1.5
                    },
                    '& fieldset': {
                        borderRadius: 10,
                        fontFamily: 'inherit',
                    },
                    '& label.Mui-focused': {
                        color: darken(user.color, 0.3),
                    },
                    '& label': {
                        fontFamily: 'inherit'
                    },
                    '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                            borderColor: lighten(user.color, 0.3),
                        },
                    },
                }}
                textField={(params: any) => <TextFieldCustom {...params} />}
            />
        </LocalizationProvider>
    )
}