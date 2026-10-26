import { FC, useEffect, useState } from "react";
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Button, IconButton, 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, MenuItem, Select, FormControl, InputLabel, 
    CircularProgress, Chip, Switch, Tooltip, Accordion,
    AccordionSummary, AccordionDetails, Card, CardContent,
    Fade, alpha
} from "@mui/material";
import { 
    DeleteRounded, AddRounded, LinkRounded, 
    EditRounded, ExpandMoreRounded, InfoRounded,
    IntegrationInstructionsRounded, AutoAwesomeRounded
} from "@mui/icons-material";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";

interface Status {
    id: number;
    description: string;
}

interface Webhook {
    id: number;
    name: string;
    url: string;
    status_id: number | null;
    status: Status | null;
    is_active: boolean;
}

export const WebhooksPage: FC = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Dialog states
    const [openDialog, setOpenDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // Form state
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [newName, setNewName] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<number | "all">("all");
    const [selectedEventType, setSelectedEventType] = useState("order.status_changed");
    const [isActive, setIsActive] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [webhookRes, statusRes] = await Promise.all([
                request("/webhooks", "GET"),
                request("/statuses", "GET")
            ]);

            if (webhookRes.ok) {
                setWebhooks(await webhookRes.response.json());
            } else {
                console.error("Error loading webhooks:", webhookRes.status);
            }
            
            if (statusRes.ok) {
                setStatuses(await statusRes.response.json());
            } else {
                console.error("Error loading statuses:", statusRes.status);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenAdd = () => {
        setEditMode(false);
        setCurrentId(null);
        setNewName("");
        setNewUrl("");
        setSelectedStatus("all");
        setSelectedEventType("order.status_changed");
        setIsActive(true);
        setOpenDialog(true);
    };

    const handleOpenEdit = (webhook: Webhook) => {
        setEditMode(true);
        setCurrentId(webhook.id);
        setNewName(webhook.name);
        setNewUrl(webhook.url);
        setSelectedStatus(webhook.status_id || "all");
        // @ts-ignore - event_type might not be in the interface yet
        setSelectedEventType(webhook.event_type || "order.status_changed");
        setIsActive(webhook.is_active);
        setOpenDialog(true);
    };

    const handleSave = async () => {
        if (!newName || !newUrl) {
            return toast.warning("Nombre y URL son obligatorios");
        }

        try {
            const body = {
                name: newName,
                url: newUrl,
                status_id: selectedEventType === "order.status_changed" ? (selectedStatus === "all" ? null : selectedStatus) : null,
                is_active: isActive,
                event_type: selectedEventType
            };

            let res;
            if (editMode && currentId) {
                res = await request(`/webhooks/${currentId}`, "PUT", body);
            } else {
                res = await request("/webhooks", "POST", body);
            }

            if (res.ok) {
                toast.success(editMode ? "Webhook actualizado" : "Webhook configurado exitosamente");
                setOpenDialog(false);
                fetchData();
            } else {
                toast.error("Error al guardar webhook: " + res.status);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar webhook");
        }
    };

    const handleToggleActive = async (webhook: Webhook, checked: boolean) => {
        try {
            const body = {
                name: webhook.name,
                url: webhook.url,
                status_id: webhook.status_id,
                is_active: checked
            };
            const { ok } = await request(`/webhooks/${webhook.id}`, "PUT", body);
            if (ok) {
                toast.success(`Webhook ${checked ? 'activado' : 'desactivado'}`);
                setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, is_active: checked } : w));
            }
        } catch (error) {
            toast.error("Error cambiando estado");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Estás seguro de eliminar este webhook permanentemente?")) return;
        
        try {
            const { status, response } = await request(`/webhooks/${id}`, "DELETE");
            if (status === 200) {
                toast.success("Webhook eliminado correctamente");
                fetchData();
            } else {
                const data = await response.json();
                toast.error(data.message || "Error al eliminar");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar");
        }
    };

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, margin: "0 auto" }}>
                {/* Header Section */}
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, 
                    justifyContent: 'space-between', 
                    alignItems: { xs: 'flex-start', md: 'center' }, 
                    gap: 2,
                    mb: 5 
                }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{ 
                                p: 1.5, 
                                borderRadius: 3, 
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                display: 'flex'
                            }}>
                                <IntegrationInstructionsRounded />
                            </Box>
                            <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.5px' }}>
                                Integraciones Webhooks
                            </Typography>
                        </Box>
                        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                            Conecta Nuviora con n8n, Make u otras herramientas externas. 
                            Las automatizaciones se dispararán según los eventos de estado configurados.
                        </Typography>
                    </Box>
                    <Button 
                        variant="contained" 
                        startIcon={<AddRounded />} 
                        onClick={handleOpenAdd}
                        sx={{ 
                            borderRadius: '12px', 
                            px: 3, 
                            py: 1.5, 
                            textTransform: 'none', 
                            fontWeight: 'bold',
                            boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                boxShadow: '0 6px 20px 0 rgba(16, 185, 129, 0.39)',
                            }
                        }}
                    >
                        Añadir Integración
                    </Button>
                </Box>

                {/* Main Content */}
                <Fade in={true} timeout={500}>
                    <Card sx={{ 
                        borderRadius: 4, 
                        border: '1px solid', 
                        borderColor: 'divider',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                        mb: 4
                    }}>
                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ bgcolor: alpha('#10b981', 0.05), fontWeight: 700 }}>Nombre / Destino URL</TableCell>
                                        <TableCell sx={{ bgcolor: alpha('#10b981', 0.05), fontWeight: 700 }}>Activador (Trigger)</TableCell>
                                        <TableCell sx={{ bgcolor: alpha('#10b981', 0.05), fontWeight: 700 }}>Estado</TableCell>
                                        <TableCell align="right" sx={{ bgcolor: alpha('#10b981', 0.05), fontWeight: 700 }}>Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                                <CircularProgress sx={{ color: '#10b981' }} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {!loading && webhooks.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                                <Box sx={{ color: 'text.secondary', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <LinkRounded sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                                                    <Typography variant="h6" fontWeight="bold">Sin integraciones activas</Typography>
                                                    <Typography variant="body2">Añade tu primer webhook para comenzar a automatizar.</Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {webhooks.map((webhook) => (
                                        <TableRow 
                                            key={webhook.id} 
                                            hover
                                            sx={{ '&:hover': { bgcolor: alpha('#10b981', 0.02) } }}
                                        >
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#2d3748' }}>
                                                    {webhook.name}
                                                </Typography>
                                                <Tooltip title={webhook.url} placement="bottom-start">
                                                    <Typography variant="caption" sx={{ 
                                                        color: 'text.secondary',
                                                        display: 'block', 
                                                        maxWidth: 350, 
                                                        overflow: 'hidden', 
                                                        textOverflow: 'ellipsis', 
                                                        whiteSpace: 'nowrap',
                                                        fontFamily: 'monospace',
                                                        bgcolor: alpha('#000', 0.04),
                                                        p: 0.5,
                                                        borderRadius: 1,
                                                        mt: 0.5
                                                    }}>
                                                        {webhook.url}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                {/* @ts-ignore */}
                                                {webhook.event_type === 'whatsapp.message_received' ? (
                                                    <Chip 
                                                        label="Mensaje de WhatsApp" 
                                                        size="small" 
                                                        sx={{ 
                                                            fontWeight: 600, 
                                                            bgcolor: alpha('#2563eb', 0.1),
                                                            color: '#2563eb'
                                                        }} 
                                                    />
                                                ) : (
                                                    webhook.status_id ? (
                                                        <Chip 
                                                            label={`Estado: ${webhook.status?.description}`} 
                                                            size="small" 
                                                            sx={{ 
                                                                fontWeight: 600, 
                                                                bgcolor: alpha('#10b981', 0.1),
                                                                color: '#059669'
                                                            }} 
                                                        />
                                                    ) : (
                                                        <Chip 
                                                            label="Cualquier cambio de estado" 
                                                            size="small" 
                                                            variant="outlined" 
                                                            sx={{ fontWeight: 500 }}
                                                        />
                                                    )
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Switch 
                                                        size="small" 
                                                        checked={webhook.is_active} 
                                                        onChange={(e) => handleToggleActive(webhook, e.target.checked)}
                                                        color="success"
                                                    />
                                                    <Typography variant="body2" color={webhook.is_active ? 'success.main' : 'text.secondary'} fontWeight={webhook.is_active ? 600 : 400}>
                                                        {webhook.is_active ? "Activo" : "Inactivo"}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Editar">
                                                    <IconButton color="primary" onClick={() => handleOpenEdit(webhook)} sx={{ mr: 1 }}>
                                                        <EditRounded fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Eliminar permanentemente">
                                                    <IconButton color="error" onClick={() => handleDelete(webhook.id)}>
                                                        <DeleteRounded fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Fade>

                {/* Tutorial Section */}
                <Accordion 
                    elevation={0} 
                    sx={{ 
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '16px !important',
                        overflow: 'hidden',
                        '&:before': { display: 'none' },
                        bgcolor: alpha('#3b82f6', 0.02)
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 1, borderRadius: 2, display: 'flex' }}>
                                <AutoAwesomeRounded fontSize="small" />
                            </Box>
                            <Typography variant="h6" fontWeight="bold" color="primary.main">
                                Mini Tutorial: Nuviora ➔ n8n
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 2, md: 4 }, pb: 4, pt: 0 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Typography variant="body1">
                                Sigue estos pasos para conectar con éxito un flujo de n8n al CRM usando webhooks:
                            </Typography>
                            
                            <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                                    1. Crea un Webhook en n8n
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    En n8n, añade un nodo principal (trigger) llamado <strong>"Webhook"</strong>.
                                    Configúralo como método <code>POST</code> y copia la <strong>Test URL</strong> o <strong>Production URL</strong>.
                                </Typography>
                            </Box>

                            <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                                    2. Configura el Webhook en Nuviora
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Haz clic en el botón verde <strong>"Añadir Integración"</strong> de esta página. 
                                    Pega la URL de n8n en el campo correspondiente. Puedes elegir si quieres que se dispare en <strong>cualquier cambio de estado</strong> o solo cuando una orden pase a un estado específico (ej. "Enviado").
                                </Typography>
                            </Box>

                            <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                                    3. Captura los datos en n8n
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Dale click a "Capture Webhook" y en Nuviora mueve de estado a una orden (que coincida con el trigger que definiste). 
                                    Nuviora enviará un JSON con la estructura de la orden, los productos y los datos del cliente.
                                </Typography>
                            </Box>
                            
                            <Card sx={{ bgcolor: alpha('#f59e0b', 0.1), border: 'none', borderRadius: 3, p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <InfoRounded sx={{ color: '#d97706' }} />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ color: '#b45309', fontWeight: 'bold' }}>
                                        Nota de Seguridad
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#b45309', mt: 0.5 }}>
                                        Mientras estés probando tu flujo en n8n, asegúrate de enviar datos a la "Test URL". Cuando termines tu flujo y lo actives, debes cambiar la URL en Nuviora aquí mismo usando el botón <strong>Editar</strong> para poner la "Production URL".
                                    </Typography>
                                </Box>
                            </Card>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </Box>

            {/* DIALOG AÑADIR / EDITAR */}
            <Dialog 
                open={openDialog} 
                onClose={() => setOpenDialog(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 4, p: 1 }
                }}
            >
                <DialogTitle sx={{ fontWeight: '800', fontSize: '1.25rem' }}>
                    {editMode ? "Editar Integración n8n" : "Nueva Integración con n8n"}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <TextField
                            label="Nombre descriptivo"
                            placeholder="Ej: n8n Ventas Confirmadas"
                            fullWidth
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                            label="URL del Webhook (n8n)"
                            placeholder="https://n8n.tu-instancia.com/webhook/..."
                            fullWidth
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            helperText="Pega aquí la Test URL o Production URL de tu nodo de Webhook en n8n"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                            <InputLabel>Evento que dispara la integración</InputLabel>
                            <Select
                                value={selectedEventType}
                                label="Evento que dispara la integración"
                                onChange={(e) => setSelectedEventType(e.target.value as string)}
                            >
                                <MenuItem value="order.status_changed">Cambio de estado de Orden</MenuItem>
                                <MenuItem value="whatsapp.message_received"><strong>Recibir mensaje de WhatsApp</strong></MenuItem>
                            </Select>
                        </FormControl>

                        {selectedEventType === "order.status_changed" && (
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                                <InputLabel>Disparar al cambiar a este estado...</InputLabel>
                                <Select
                                    value={selectedStatus}
                                    label="Disparar al cambiar a este estado..."
                                    onChange={(e) => setSelectedStatus(e.target.value as number | "all")}
                                >
                                    <MenuItem value="all"><strong>Cualquier cambio de estado</strong></MenuItem>
                                    {statuses.map((s) => (
                                        <MenuItem key={s.id} value={s.id}>{s.description}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {editMode && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: alpha('#000', 0.02), borderRadius: 2 }}>
                                <Switch 
                                    checked={isActive} 
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    color="success"
                                />
                                <Typography fontWeight="bold" color={isActive ? "success.main" : "text.secondary"}>
                                    {isActive ? "Webhook Activo" : "Webhook Inactivo"}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenDialog(false)} color="inherit" sx={{ fontWeight: 'bold' }}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleSave} 
                        sx={{ 
                            borderRadius: 2, 
                            px: 3, 
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)'
                        }}
                    >
                        {editMode ? "Guardar Cambios" : "Crear Integración"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};
