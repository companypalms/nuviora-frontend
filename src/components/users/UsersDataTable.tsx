import { Dispatch, FC, SetStateAction } from "react"
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Pagination, Box } from "@mui/material";
import { TableData } from "./TableData";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { useUserStore } from "../../store/user/UserStore";
import { TextFieldCustom } from "../custom";

interface Props {
    data: any;
    setData: Dispatch<SetStateAction<any>>;
}
export const UsersDataTable: FC<Props> = ({ data, setData }) => {
    const user = useUserStore(state => state.user);
    const changePage = async (event: React.ChangeEvent<unknown>, page: number) => {
        const url = `/${data?.path}?page=${page}`
        const { status, response, err }: IResponse = await request(url, 'GET');
        switch (status) {
            case 200:
                const { data } = await response.json();
                setData(data)
                break;
            case 400:
                toast.error('Ocurrio un error al conectar con el servidor')
                break;
            case 500:
                toast.error('Ocurrio un error al conectar con el servidor')
                break;
            default:
                toast.error('Ocurrio un error al conectar con el servidor')
                break;

        }
    }
    return (
        <>
            <Box sx={{ display: 'flex', flexFlow: "row wrap", justifyContent: 'end', mt: 2, mb: 2 }}>
                <Pagination count={data.last_page} page={data.current_page} showFirstButton showLastButton onChange={(event: React.ChangeEvent<unknown>, page: number) => changePage(event, page)} />
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{
                background: (theme) => theme.palette.mode === 'dark' ? `${user.color}20` : '#fff',
                borderRadius: 5,
                p: 5,
                boxShadow: `0 8px 16px ${user.color}20`,
                '&::-webkit-scrollbar': {
                    width: '0.4em'
                },
                '&::-webkit-scrollbar-track': {
                    webkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)'
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,.1)',
                }
            }}>
                <Table size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>ID</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Nombres</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Apellidos</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Telefono</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Email</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Direccion</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Costo Delivery</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Vista Lite</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data && data.data.map((data: any) => (
                            <TableData key={data.id} data={data} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', flexFlow: "row wrap", justifyContent: 'end', mt: 2, mb: 2 }}>
                <Pagination count={data.last_page} page={data.current_page} showFirstButton showLastButton onChange={(event: React.ChangeEvent<unknown>, page: number) => changePage(event, page)} />
            </Box>
        </>
    )
}
