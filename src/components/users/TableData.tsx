import { TableRow, TableCell, IconButton, SelectChangeEvent, Box, Stack, Switch } from "@mui/material";
import moment from "moment";
import { ChangeEvent, ReactNode, useState } from "react";
import EditRounded from "@mui/icons-material/EditRounded";
import { toast } from "react-toastify";
import { UserType } from "../../interfaces/user-type";
import { errorArrayLaravelTransformToString } from "../../lib/functions";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { CancelRounded, CheckRounded, KeyRounded } from "@mui/icons-material";
import { TextFieldCustom, ButtonCustom } from "../custom";
import { useUserStore } from "../../store/user/UserStore";


type InitialValues = Omit<UserType, 'id' | 'created_at' | 'updated_at' | 'closing_date' | 'observations'>

interface DataProps {
    data: any;
}
export const TableData = ({ data }: DataProps) => {
    const user = useUserStore(state => state.user);
    const initialValues: InitialValues = {
        names: data.names,
        surnames: data.surnames,
        phone: data.phone,
        email: data.email,
        address: data.address,
        role: data.role,
        status: data.status,
        delivery_cost: data.delivery_cost ?? 0,
        is_lite_view: Boolean(data.is_lite_view),
        can_handle_no_stock: Boolean(data.can_handle_no_stock),
    }
    const [info, setInfo] = useState<UserType>(data);
    const [values, setValues] = useState<InitialValues>(initialValues);
    const [editing, setEditing] = useState<boolean>(false);
    const [newPassword, setNewPassword] = useState<string>('');
    const [changingPassword, setChangingPassword] = useState<boolean>(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setValues({ ...values, [e.target.name]: e.target.value })
    }
    const handleChangeSelect = (e: SelectChangeEvent<unknown>, child: ReactNode) => {
        setValues({ ...values, [e.target.name]: e.target.value })

    }
    const toggleEdit = () => {
        setEditing(!editing);
        setNewPassword(''); // Reset password field
    }

    const onSubmit = async () => {
        const url = `/user/${data.id}`;
        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(values)) {
            if (key === 'is_lite_view' || key === 'can_handle_no_stock') {
                body.append(key, value ? '1' : '0');
            } else {
                body.append(key, String(value));
            }
        }
        const { status, response, err }: IResponse = await request(url, 'PUT', body);
        switch (status) {
            case 200:
                const { data } = await response.json();
                setInfo(data)
                toast.success('Se ha actualizado la información')
                setEditing(false);
                break;
            case 400:
                const { errors } = await response.json();
                toast.error(errorArrayLaravelTransformToString(errors))
                break;
            default:
                toast.error(`Ocurrio un error inesperado (${response.status})`)
        }
    }

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setChangingPassword(true);
        try {
            const body = new URLSearchParams();
            body.append('new_password', newPassword);

            const { status, response }: IResponse = await request(`/user/${data.id}/change/password`, 'PUT', body);

            if (status) {
                const result = await response.json();
                if (result.status) {
                    toast.success('Contraseña actualizada exitosamente');
                    setNewPassword('');
                } else {
                    toast.error(result.message || 'Error al actualizar contraseña');
                }
            } else {
                toast.error('Error al actualizar contraseña');
            }
        } catch (error) {
            toast.error('Error en el servidor');
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <>
            {editing ?
                <TableRow>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.id}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="names" onChange={handleChange} value={values.names} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="surnames" onChange={handleChange} value={values.surnames} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="phone" onChange={handleChange} value={values.phone} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="email" onChange={handleChange} value={values.email} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="address" onChange={handleChange} value={values.address} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {data.role?.description === 'Agencia' && (
                            <TextFieldCustom name="delivery_cost" type="number" onChange={handleChange} value={values.delivery_cost} />
                        )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <Box display="flex" flexDirection="column" gap={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Switch
                                    checked={Boolean(values.is_lite_view)}
                                    onChange={(e) => setValues({ ...values, is_lite_view: e.target.checked })}
                                />
                                <span style={{ fontSize: '0.75rem' }}>Vista Lite</span>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Switch
                                    checked={Boolean(values.can_handle_no_stock)}
                                    onChange={(e) => setValues({ ...values, can_handle_no_stock: e.target.checked })}
                                />
                                <span style={{ fontSize: '0.75rem' }}>Sin Stock</span>
                            </Box>
                        </Box>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <Stack direction="column" spacing={1} alignItems="center">
                            <Box display="flex" gap={1}>
                                <IconButton onClick={onSubmit} color="success">
                                    <CheckRounded />
                                </IconButton>
                                <IconButton onClick={toggleEdit} color="error">
                                    <CancelRounded />
                                </IconButton>
                            </Box>
                            {user.role?.description === 'Admin' && (
                                <Box display="flex" gap={1} alignItems="center" width="100%">
                                    <TextFieldCustom
                                        size="small"
                                        type="password"
                                        placeholder="Nueva Contraseña"
                                        value={newPassword}
                                        onChange={(e: any) => setNewPassword(e.target.value)}
                                        sx={{ minWidth: '150px' }}
                                    />
                                    <ButtonCustom
                                        size="small"
                                        variant="contained"
                                        color="primary"
                                        onClick={handleChangePassword}
                                        loading={changingPassword}
                                        disabled={changingPassword || !newPassword}
                                        startIcon={<KeyRounded />}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        Cambiar Clave
                                    </ButtonCustom>
                                </Box>
                            )}
                        </Stack>
                    </TableCell>
                </TableRow>
                : (
                    <TableRow>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.id}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.names}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.surnames}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.phone}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.email}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.address}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.delivery_cost || 0}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <Box display="flex" flexDirection="column" gap={0.5}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Switch size="small" checked={Boolean(info.is_lite_view)} disabled />
                                    <span style={{ fontSize: '0.7rem' }}>Vista Lite</span>
                                </Box>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Switch size="small" checked={Boolean(info.can_handle_no_stock)} disabled />
                                    <span style={{ fontSize: '0.7rem' }}>Sin Stock</span>
                                </Box>
                            </Box>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <IconButton onClick={toggleEdit}>
                                <EditRounded />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                )}
        </>
    )
}
