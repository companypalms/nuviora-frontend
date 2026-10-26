import { useEffect, useState } from "react";
import { useUserStore } from "../../store/user/UserStore";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { TypographyCustom } from "../../components/custom";
import { UsersDataTable } from "../../components/users/UsersDataTable";
import { AddUserDialog } from "../../components/users/AddUserDialog";
import { IResponse } from "../../interfaces/response-type";
import { Box, Button } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { request } from "../../common/request";
import { useValidateSession } from "../../hooks/useValidateSession";
const useGetUsers = (url: string) => {
    const [data, setData] = useState<any>(null);
    const [errors, setErrors] = useState<any>(null);

    const getData = async () => {
        const { status, response }: IResponse = await request(url, 'GET');
        switch (status) {
            case 200:
                const { data: apiData } = await response.json()
                setData(apiData);
                break;
            case 400:
                const { errors } = await response.json();
                setErrors(errors);
                break;
            default:
                setErrors(['Ocurrio un error inesperado']);
                break;
        }
    }
    useEffect(() => {
        getData();
    }, []);

    return { data, setData, errors, getData }
}
export const Users = () => {
    const { data, setData, errors, getData } = useGetUsers('/users');
    const { loadingSession, isValid, user } = useValidateSession();
    const [openAddUser, setOpenAddUser] = useState(false);

    if (loadingSession || !isValid || !user.token) return <Loading />;
    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <DescripcionDeVista title={"Usuarios"} description={"En esta vista podras consultar los usuarios registrados"} />
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenAddUser(true)}
                    sx={{ borderRadius: 2 }}
                >
                    Agregar Usuario
                </Button>
            </Box>

            {errors && errors.length > 0 && (
                <>
                    <TypographyCustom color='error'>Ocurrio un error</TypographyCustom>
                    <TypographyCustom color='error'>{JSON.stringify(errors)}</TypographyCustom>
                </>
            )}
            {data && (
                <UsersDataTable data={data} setData={setData} />
            )}

            <AddUserDialog
                open={openAddUser}
                onClose={() => setOpenAddUser(false)}
                onUserAdded={() => {
                    getData();
                }}
            />
        </Layout >
    )
}

