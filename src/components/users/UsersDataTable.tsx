import { FC } from "react"
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Pagination, Box, Typography } from "@mui/material";
import { TableData } from "./TableData";
import { useUserStore } from "../../store/user/UserStore";

interface Props {
    data: any;
    /** Qué lista se ve (paso 6): las cuentas activas o las desactivadas. */
    estado: 'activos' | 'desactivados';
    /** Solo el Admin desactiva y reactiva. */
    canManage: boolean;
    selfId: number;
    onPage: (page: number) => void;
    onDeactivate: (user: any) => void;
    onReactivate: (user: any) => void;
}
export const UsersDataTable: FC<Props> = ({ data, estado, canManage, selfId, onPage, onDeactivate, onReactivate }) => {
    const user = useUserStore(state => state.user);
    const deactivated = estado === 'desactivados';
    const pager = data.last_page > 1 && (
        <Box sx={{ display: 'flex', flexFlow: "row wrap", justifyContent: 'end', mt: 2, mb: 2 }}>
            <Pagination count={data.last_page} page={data.current_page} showFirstButton showLastButton onChange={(_: React.ChangeEvent<unknown>, page: number) => onPage(page)} />
        </Box>
    );
    return (
        <>
            {pager}
            <TableContainer component={Paper} elevation={0} sx={{
                background: (theme) => theme.palette.mode === 'dark' ? `${user.color}20` : '#fff',
                borderRadius: 5,
                p: { xs: 1.5, sm: 5 },
                mt: 1,
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
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Rol</TableCell>
                            {deactivated && <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Desactivada</TableCell>}
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Telefono</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Email</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Direccion</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Costo Delivery</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Vista Lite</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data && data.data.map((row: any) => (
                            <TableData
                                key={row.id}
                                data={row}
                                showDeactivation={deactivated}
                                canManage={canManage}
                                isSelf={row.id === selfId}
                                onDeactivate={() => onDeactivate(row)}
                                onReactivate={() => onReactivate(row)}
                            />
                        ))}
                        {data && data.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={deactivated ? 11 : 10} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {deactivated ? 'No hay cuentas desactivadas.' : 'No hay usuarios con ese filtro.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {pager}
        </>
    )
}
