import { FormControl, FormLabel, FormControlLabel, Radio, RadioProps, RadioGroup, darken, FormHelperText } from '@mui/material'
import { ChangeEvent } from 'react'
import { useUserStore } from '../../store/user/UserStore';

interface Props extends RadioProps {
  label: string;
  defaultvalue: string;
  options: RadioOption[];
  error?: boolean;
  helpertext?: string;
  onChange: (e: ChangeEvent<any>) => void;
}

type RadioOption = {
  label: string;
  value: string;
}
export const RadioGroupCustom = (props: Props) => {

  const user = useUserStore((state) => state.user);

  return (
    <FormControl fullWidth error={props.error}>
      <FormLabel id={`custom-radio-button-name-${props.label}`} sx={{
        '&.Mui-focused': {
          color: darken(user.color, 0.1),
        }
      }}>{props.label}</FormLabel>
      <RadioGroup
        aria-labelledby={`custom-radio-button-name-${props.label}`}
        defaultValue={props.defaultvalue}
        onChange={props.onChange}
        name={props.name}
        sx={{ display: 'flex', flexFlow: 'row wrap' }}
      >
        {props.options.map((option) => (
          <FormControlLabel key={option.value} value={option.value} control={<Radio sx={{
            color: user.color,
            '&.Mui-checked': {
              color: user.color
            }
          }} />} label={option.label} />
        ))}
      </RadioGroup>
      {props.helpertext && props.error ? <FormHelperText>{props.helpertext}</FormHelperText> : ''}
    </FormControl>
  )
}