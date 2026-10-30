import React, { useCallback, useEffect, useState } from "react";
import { Loading } from "../../components/ui/content/Loading";
import { PageLayout } from "../../components/ui/SectionTabsPage";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { TypographyCustom } from "../../components/custom";
import { UsersDataTable } from "../../components/users/UsersDataTable";
import { AddUserDialog } from "../../components/users/AddUserDialog";
import { DeactivateUserDialog } from "../../components/users/DeactivateUserDialog";
import { ReactivateUserDialog } from "../../components/users/ReactivateUserDialog";
import { Box, Button, InputAdornment, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { SearchRounded } from "@mui/icons-material";
import { request } from "../../common/request";
import { useValidateSession } from "../../hooks/useValidateSession";

type Estado = 'activos' | 'desactivados';
type Picked = { id: number; name: string; deactivated_at?: string | null; deactivation_reason?: string | null };

const ROLES = ['Vendedor', 'Agencia', 'Repartidor', 'Operador logístico', 'Gerente', 'Master', 'Admin'];

const fullName = (u: any) => `${u.names ?? ''} ${u.surnames ?? ''}`.trim();

export const Users: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [estado, setEstado] = useState<Estado>('activos');
    const [typed, setTyped] = useState('');
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [openAddUser, setOpenAddUser] = useState(false);
    const [toDeactivate, setToDeactivate] = useState<Picked | null>(null);
    const [toReactivate, setToReactivate] = useState<Picked | null>(null);

    const load = useCallback(async () => {
        const params = new URLSearchParams({ page: String(page), estado });
        if (search) params.set('q', search);
        if (role) params.set('rol', role);
        const { status, response } = await request(`/users?${params}`, 'GET');
        if (status === 200) {
            const { data: apiData } = await response.json();
            setData(apiData);
            setError(null);
        } else {
            setError('No se pudo cargar la lista de usuarios.');
        }
    }, [page, estado, search, role]);

    useEffect(() => {
        load();
    }, [load]);

    // Busca al dejar de escribir
    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(typed.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [typed]);

    if (loadingSession || !isValid || !user.token) return <Loading />;
    // Desactivar y reactivar: solo el Admin (paso 6)
    const canManage = user.role?.description === 'Admin';

    return (
        <PageLayout isEmbedded={isEmbedded}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={1} flexWrap="wrap">
                <DescripcionDeVista title={"Usuarios"} description={"Las cuentas de quienes usan el sistema. Una cuenta desactivada no entra ni recibe trabajo, y su historial queda."} />
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

            <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center" mb={1}>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={estado}
                    onChange={(_, v: Estado | null) => { if (v) { setEstado(v); setPage(1); } }}
                >
                    <ToggleButton value="activos">Activos</ToggleButton>
                    <ToggleButton value="desactivados">Desactivados</ToggleButton>
                </ToggleButtonGroup>
                <TextField
                    size="small"
                    placeholder="Buscar por nombre, correo o teléfono"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }}
                    sx={{ minWidth: { xs: '100%', sm: 280 } }}
                />
                <TextField
                    select
                    size="small"
                    label="Rol"
                    value={role}
                    onChange={(e) => { setRole(e.target.value); setPage(1); }}
                    sx={{ minWidth: 170 }}
                >
                    <MenuItem value="">Todos</MenuItem>
                    {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
            </Box>

            {error && <TypographyCustom color='error'>{error}</TypographyCustom>}
            {data && (
                <UsersDataTable
                    data={data}
                    estado={estado}
                    canManage={canManage}
                    selfId={user.id}
                    onPage={setPage}
                    onDeactivate={(u) => setToDeactivate({ id: u.id, name: fullName(u) })}
                    onReactivate={(u) => setToReactivate({ id: u.id, name: fullName(u), deactivated_at: u.deactivated_at, deactivation_reason: u.deactivation_reason })}
                />
            )}

            <AddUserDialog
                open={openAddUser}
                onClose={() => setOpenAddUser(false)}
                onUserAdded={() => {
                    load();
                }}
            />
            <DeactivateUserDialog
                open={toDeactivate !== null}
                user={toDeactivate}
                onClose={() => setToDeactivate(null)}
                onDone={() => { setToDeactivate(null); load(); }}
            />
            <ReactivateUserDialog
                open={toReactivate !== null}
                user={toReactivate}
                onClose={() => setToReactivate(null)}
                onDone={() => { setToReactivate(null); load(); }}
            />
        </PageLayout>
    )
}
