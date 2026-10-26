import { FC, useEffect, useState } from "react";
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, List, ListItem, ListItemAvatar, Avatar, 
    ListItemText, Switch, CircularProgress, Box, Typography,
    IconButton
} from "@mui/material";
import { CloseRounded, PersonRounded } from "@mui/icons-material";
import { request } from "../../../common/request";
import { toast } from "react-toastify";

interface Agent {
    id: number;
    names: string;
    surnames: string;
    is_active_crm: boolean;
}

interface ShiftManagementProps {
    open: boolean;
    onClose: () => void;
}

export const ShiftManagement: FC<ShiftManagementProps> = ({ open, onClose }) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAgents = async () => {
        setLoading(true);
        try {
            const { status, response } = await request('/crm/agents', 'GET');
            if (status) {
                const data = await response.json();
                setAgents(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando personal");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchAgents();
    }, [open]);

    const handleToggle = async (agentId: number) => {
        try {
            const { status, response } = await request(`/crm/agents/${agentId}/toggle`, 'POST');
            if (status) {
                const data = await response.json();
                setAgents(prev => prev.map(a => 
                    a.id === agentId ? { ...a, is_active_crm: data.is_active_crm } : a
                ));
                toast.success(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error actualizando turno");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">Turnos de WhatsApp</Typography>
                <IconButton onClick={onClose} size="small"><CloseRounded /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Selecciona los agentes que participarán en la rotación automática de nuevos leads. Este ajuste es permanente hasta que lo cambies de nuevo.
                </Typography>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={30} /></Box>
                ) : (
                    <List disablePadding>
                        {agents.map((agent) => (
                            <ListItem 
                                key={agent.id}
                                secondaryAction={
                                    <Switch 
                                        edge="end" 
                                        checked={agent.is_active_crm} 
                                        onChange={() => handleToggle(agent.id)}
                                        color="success"
                                    />
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: agent.is_active_crm ? 'success.main' : 'grey.300' }}>
                                        <PersonRounded />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={`${agent.names} ${agent.surnames}`}
                                    secondary={agent.is_active_crm ? 'Activo para Leads' : 'Inactivo'}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};
