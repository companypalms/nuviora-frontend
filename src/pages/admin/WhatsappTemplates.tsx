import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Switch,
    FormControlLabel,
    Stack,
    Divider,
    Paper,
    LinearProgress,
    Chip,
    Alert,
    Tooltip,
    CircularProgress,
    Avatar,
} from '@mui/material';
import {
    AddRounded,
    EditRounded,
    DeleteRounded,
    WhatsApp as WhatsAppIcon,
    VerifiedRounded,
    MessageRounded,
    SyncRounded,
    DownloadDoneRounded,
    CheckCircleRounded,
    ErrorRounded,
    HourglassTopRounded,
    CloudDownloadRounded,
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { toast } from 'react-toastify';
import { useValidateSession } from '../../hooks/useValidateSession';

interface IWhatsappTemplate {
    id: number;
    name: string;
    label: string;
    body: string;
    language?: string;
    is_official: boolean;
    visible_to_sellers: boolean;
    meta_components?: any[];
    created_at?: string;
}

interface IMetaTemplate {
    id: string;
    name: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
    language: string;
    category: string;
    body_preview: string;
    already_imported: boolean;
    components: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }> = {
    APPROVED: { label: 'Aprobada', color: 'success', icon: <CheckCircleRounded sx={{ fontSize: 14 }} /> },
    PENDING:  { label: 'Pendiente', color: 'warning', icon: <HourglassTopRounded sx={{ fontSize: 14 }} /> },
    REJECTED: { label: 'Rechazada', color: 'error', icon: <ErrorRounded sx={{ fontSize: 14 }} /> },
    PAUSED:   { label: 'Pausada', color: 'default', icon: <ErrorRounded sx={{ fontSize: 14 }} /> },
    DISABLED: { label: 'Desactivada', color: 'default', icon: <ErrorRounded sx={{ fontSize: 14 }} /> },
};

export const WhatsappTemplates: React.FC = () => {
    const { isValid } = useValidateSession();
    const [templates, setTemplates] = useState<IWhatsappTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<IWhatsappTemplate | null>(null);

    // Meta sync
    const [metaDialogOpen, setMetaDialogOpen] = useState(false);
    const [metaTemplates, setMetaTemplates] = useState<IMetaTemplate[]>([]);
    const [metaLoading, setMetaLoading] = useState(false);
    const [metaError, setMetaError] = useState<string | null>(null);
    const [importingId, setImportingId] = useState<string | null>(null);
    const [importLabelFor, setImportLabelFor] = useState<string>('');

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        label: '',
        body: '',
        is_official: false,
        visible_to_sellers: true,
        meta_components: [] as any[]
    });

    useEffect(() => {
        if (isValid) {
            loadTemplates();
        }
    }, [isValid]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/whatsapp-templates', 'GET');
            if (status === 200) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar las plantillas');
        } finally {
            setLoading(false);
        }
    };

    // ─── Meta Sync ────────────────────────────────────────────────────────────

    const handleOpenMetaDialog = async () => {
        setMetaDialogOpen(true);
        setMetaError(null);
        setMetaTemplates([]);
        setMetaLoading(true);
        try {
            const { status, response }: IResponse = await request('/whatsapp-templates/meta', 'GET');
            const data = await response.json();
            if (status === 200) {
                setMetaTemplates(data.data ?? []);
            } else {
                setMetaError(data.error ?? 'Error al consultar Meta.');
            }
        } catch (err) {
            setMetaError('No se pudo conectar con el servidor.');
        } finally {
            setMetaLoading(false);
        }
    };

    const handleImportMeta = async (tpl: IMetaTemplate) => {
        setImportingId(tpl.id);
        try {
            const label = importLabelFor === tpl.id
                ? (document.getElementById(`meta-label-${tpl.id}`) as HTMLInputElement)?.value || tpl.name
                : tpl.name;

            const { status, response }: IResponse = await request('/whatsapp-templates/import-meta', 'POST', {
                name:                tpl.name,
                label:               label,
                language:            tpl.language,
                body:                tpl.body_preview || tpl.name,
                meta_components:     tpl.components,
                visible_to_sellers:  true, // Default visible; admin can change it afterwards
            });

            if (status === 200 || status === 201) {
                toast.success(`Plantilla "${tpl.name}" importada correctamente`);
                setMetaTemplates(prev =>
                    prev.map(t => t.id === tpl.id ? { ...t, already_imported: true } : t)
                );
                loadTemplates();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al importar');
            }
        } catch (err) {
            toast.error('Error al importar la plantilla');
        } finally {
            setImportingId(null);
        }
    };

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    const handleOpenDialog = (template: IWhatsappTemplate | null = null) => {
        if (template) {
            setSelectedTemplate(template);
            setFormData({
                name: template.name,
                label: template.label,
                body: template.body,
                is_official: !!template.is_official,
                visible_to_sellers: template.visible_to_sellers !== false,
                meta_components: template.meta_components || []
            });
        } else {
            setSelectedTemplate(null);
            setFormData({ 
                name: '', 
                label: '', 
                body: '', 
                is_official: false,
                visible_to_sellers: true,
                meta_components: []
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedTemplate(null);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.label || !formData.body) {
            toast.warning('Todos los campos son obligatorios');
            return;
        }

        setLoading(true);
        try {
            const endpoint = selectedTemplate ? `/whatsapp-templates/${selectedTemplate.id}` : '/whatsapp-templates';
            const method   = selectedTemplate ? 'PUT' : 'POST';
            const submissionData = {
                ...formData,
                name: formData.name.toLowerCase().replace(/\s+/g, '_')
            };
            const { status } = await request(endpoint, method, submissionData);
            if (status === 200 || status === 201) {
                toast.success(selectedTemplate ? 'Plantilla actualizada' : 'Plantilla creada');
                handleCloseDialog();
                loadTemplates();
            } else {
                toast.error('Error al guardar la plantilla');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar la plantilla');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar esta plantilla?')) return;
        setLoading(true);
        try {
            const { status } = await request(`/whatsapp-templates/${id}`, 'DELETE');
            if (status === 200) {
                toast.success('Plantilla eliminada');
                loadTemplates();
            }
        } catch (error) {
            toast.error('Error al eliminar la plantilla');
        } finally {
            setLoading(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, md: 4 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <WhatsAppIcon sx={{ color: '#25d366', fontSize: 40 }} />
                            Plantillas de WhatsApp
                        </Typography>
                        <DescripcionDeVista
                            description="Configura mensajes predefinidos y plantillas oficiales de Meta API."
                        />
                    </Box>

                    <Stack direction="row" spacing={2}>
                        <Tooltip title="Consultar las plantillas aprobadas en tu cuenta de WhatsApp Business (Meta)">
                            <Button
                                id="btn-sync-meta"
                                variant="outlined"
                                startIcon={<SyncRounded />}
                                onClick={handleOpenMetaDialog}
                                sx={{
                                    borderRadius: 3,
                                    px: 3,
                                    py: 1.5,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    borderColor: '#1877F2',
                                    color: '#1877F2',
                                    '&:hover': { bgcolor: 'rgba(24,119,242,0.06)', borderColor: '#1877F2' }
                                }}
                            >
                                Sincronizar con Meta
                            </Button>
                        </Tooltip>

                        <Button
                            id="btn-new-template"
                            variant="contained"
                            startIcon={<AddRounded />}
                            onClick={() => handleOpenDialog()}
                            sx={{
                                borderRadius: 3,
                                px: 3,
                                py: 1.5,
                                textTransform: 'none',
                                fontWeight: 'bold',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                bgcolor: '#25d366',
                                '&:hover': { bgcolor: '#128c7e' }
                            }}
                        >
                            Nueva Plantilla
                        </Button>
                    </Stack>
                </Stack>

                {loading && <LinearProgress sx={{ mb: 4, borderRadius: 2 }} />}

                <Grid container spacing={3}>
                    {templates.map((template) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
                            <Card
                                sx={{
                                    borderRadius: 4,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }
                                }}
                            >
                                <CardContent sx={{ flex: 1 }}>
                                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                                        <Box sx={{
                                            p: 1.5, borderRadius: 3,
                                            bgcolor: template.is_official ? 'secondary.main' : 'rgba(37, 211, 102, 0.1)',
                                            color: template.is_official ? 'white' : '#25d366'
                                        }}>
                                            {template.is_official ? <VerifiedRounded /> : <MessageRounded />}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                                                {template.label}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', display: 'block' }}>
                                                {template.name}
                                            </Typography>
                                        </Box>
                                        {!!template.is_official && (
                                            <Chip label="OFICIAL" size="small" color="secondary"
                                                sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 20 }} />
                                        )}
                                    </Stack>

                                    <Paper variant="outlined" sx={{
                                        p: 2, borderRadius: 3, borderStyle: 'dashed',
                                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                    }}>
                                        {template.meta_components?.find((c: any) => c.type === 'HEADER')?.text && (
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                                                {template.meta_components.find((c: any) => c.type === 'HEADER').text}
                                            </Typography>
                                        )}
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', fontStyle: 'italic' }}>
                                            "{template.body}"
                                        </Typography>
                                    </Paper>
                                </CardContent>

                                <Divider />

                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        size="small"
                                        label={template.visible_to_sellers ? 'Visible a vendedoras' : 'Solo admin'}
                                        color={template.visible_to_sellers ? 'success' : 'warning'}
                                        sx={{ fontSize: '0.65rem', height: 22, fontWeight: 'bold', opacity: 0.9 }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                    <IconButton size="small" onClick={() => handleOpenDialog(template)} sx={{ bgcolor: 'action.hover' }}>
                                        <EditRounded fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(template.id)}
                                        sx={{ bgcolor: 'rgba(255,0,0,0.05)', '&:hover': { bgcolor: 'rgba(255,0,0,0.1)' } }}>
                                        <DeleteRounded fontSize="small" />
                                    </IconButton>
                                    </Box>
                                </Box>
                            </Card>
                        </Grid>
                    ))}

                    {templates.length === 0 && !loading && (
                        <Grid size={{ xs: 12 }}>
                            <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 4, bgcolor: 'background.default', border: '2px dashed', borderColor: 'divider' }}>
                                <MessageRounded sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography color="text.secondary">No hay plantillas registradas</Typography>
                                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                                    <Button variant="outlined" onClick={handleOpenMetaDialog} startIcon={<SyncRounded />}>
                                        Importar desde Meta
                                    </Button>
                                    <Button variant="outlined" onClick={() => handleOpenDialog()}>
                                        Crear manualmente
                                    </Button>
                                </Stack>
                            </Paper>
                        </Grid>
                    )}
                </Grid>

                {/* ── Dialog: Meta Templates ─────────────────────────────────────── */}
                <Dialog
                    open={metaDialogOpen}
                    onClose={() => setMetaDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 4 } }}
                >
                    <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#1877F2', width: 36, height: 36 }}>
                            <SyncRounded sx={{ fontSize: 20 }} />
                        </Avatar>
                        Plantillas en Meta (WhatsApp Business)
                        <Chip
                            label={`${metaTemplates.length} encontradas`}
                            size="small"
                            color="primary"
                            sx={{ ml: 'auto', fontWeight: 'bold' }}
                        />
                    </DialogTitle>

                    <DialogContent dividers>
                        {metaLoading && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                                <CircularProgress size={48} />
                                <Typography color="text.secondary">Consultando la API de Meta...</Typography>
                            </Box>
                        )}

                        {metaError && !metaLoading && (
                            <Alert
                                severity="error"
                                sx={{ borderRadius: 3 }}
                                action={
                                    <Button size="small" onClick={handleOpenMetaDialog}>Reintentar</Button>
                                }
                            >
                                <strong>Error:</strong> {metaError}
                                {metaError.includes('WHATSAPP_WABA_ID') && (
                                    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2, fontFamily: 'monospace', fontSize: 13 }}>
                                        Agrega esta línea al .env del VPS:<br />
                                        <strong>WHATSAPP_WABA_ID=tu_waba_id_aqui</strong>
                                    </Box>
                                )}
                            </Alert>
                        )}

                        {!metaLoading && !metaError && metaTemplates.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <MessageRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                                <Typography color="text.secondary">No se encontraron plantillas en Meta.</Typography>
                            </Box>
                        )}

                        {!metaLoading && metaTemplates.length > 0 && (
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                {metaTemplates.map((tpl) => {
                                    const statusCfg = STATUS_CONFIG[tpl.status] ?? STATUS_CONFIG.PENDING;
                                    return (
                                        <Paper
                                            key={tpl.id}
                                            variant="outlined"
                                            sx={{
                                                p: 2.5,
                                                borderRadius: 3,
                                                borderColor: tpl.already_imported ? 'success.main' : 'divider',
                                                bgcolor: tpl.already_imported
                                                    ? (theme) => theme.palette.mode === 'dark' ? 'rgba(46,125,50,0.08)' : 'rgba(46,125,50,0.04)'
                                                    : 'transparent',
                                                opacity: tpl.status === 'REJECTED' || tpl.status === 'DISABLED' ? 0.65 : 1,
                                            }}
                                        >
                                            <Stack direction="row" alignItems="flex-start" spacing={2}>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                                        <Typography fontWeight="bold" sx={{ fontFamily: 'monospace', fontSize: 14 }}>
                                                            {tpl.name}
                                                        </Typography>
                                                        <Chip
                                                            size="small"
                                                            label={statusCfg.label}
                                                            color={statusCfg.color}
                                                            icon={statusCfg.icon as any}
                                                            sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 20 }}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            label={tpl.category}
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.65rem', height: 20 }}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            label={tpl.language?.toUpperCase()}
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.65rem', height: 20 }}
                                                        />
                                                    </Stack>

                                                    {tpl.components?.find(c => c.type === 'HEADER')?.text && (
                                                        <Typography variant="body2" fontWeight="bold" sx={{ color: 'text.primary', mb: 0.5 }}>
                                                            {tpl.components.find(c => c.type === 'HEADER').text}
                                                        </Typography>
                                                    )}

                                                    {tpl.body_preview ? (
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                            "{tpl.body_preview}"
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="caption" color="text.disabled">
                                                            (Sin cuerpo de texto — puede ser una plantilla de medios)
                                                        </Typography>
                                                    )}

                                                    {/* Label input for import */}
                                                    {!tpl.already_imported && tpl.status === 'APPROVED' && (
                                                        <TextField
                                                            id={`meta-label-${tpl.id}`}
                                                            size="small"
                                                            label="Etiqueta amigable"
                                                            placeholder={tpl.name}
                                                            sx={{ mt: 1.5, maxWidth: 320 }}
                                                            helperText="Nombre que verán los vendedores"
                                                        />
                                                    )}
                                                </Box>

                                                <Box sx={{ flexShrink: 0 }}>
                                                    {tpl.already_imported ? (
                                                        <Chip
                                                            icon={<DownloadDoneRounded sx={{ fontSize: 16 }} />}
                                                            label="Ya importada"
                                                            color="success"
                                                            size="small"
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                    ) : tpl.status === 'APPROVED' ? (
                                                        <Button
                                                            id={`btn-import-${tpl.name}`}
                                                            variant="contained"
                                                            size="small"
                                                            startIcon={importingId === tpl.id
                                                                ? <CircularProgress size={14} color="inherit" />
                                                                : <CloudDownloadRounded />
                                                            }
                                                            onClick={() => handleImportMeta(tpl)}
                                                            disabled={importingId === tpl.id}
                                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                                                        >
                                                            Importar
                                                        </Button>
                                                    ) : (
                                                        <Typography variant="caption" color="text.disabled">
                                                            No importable
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        )}
                    </DialogContent>

                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setMetaDialogOpen(false)} color="inherit">Cerrar</Button>
                        <Button onClick={handleOpenMetaDialog} startIcon={<SyncRounded />} disabled={metaLoading}>
                            Actualizar lista
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* ── Dialog: Create / Edit ──────────────────────────────────────── */}
                <Dialog
                    open={dialogOpen}
                    onClose={handleCloseDialog}
                    PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 500 } }}
                >
                    <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        {selectedTemplate ? <EditRounded color="primary" /> : <AddRounded color="primary" />}
                        {selectedTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                label="Título amigable (Etiqueta)"
                                fullWidth
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                placeholder="Ej: Pedir Ubicación"
                                helperText="Nombre que verán los vendedores en el chat."
                            />
                            <TextField
                                label="Nombre técnico (API ID)"
                                fullWidth
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: pedir_ubicacion"
                                helperText="Debe ser minúsculas y sin espacios. Si es oficial, debe coincidir con Meta."
                            />
                            <TextField
                                label="Contenido del Mensaje"
                                fullWidth
                                multiline
                                rows={4}
                                value={formData.body}
                                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                placeholder="Escribe el mensaje aquí..."
                                helperText={<span>Usa <strong>{"{{1}}"}</strong> para insertar el nombre del cliente automáticamente.</span>}
                            />
                            <Paper sx={{
                                p: 2,
                                bgcolor: (theme) => formData.is_official ? 'secondary.main' : 'action.hover',
                                color: formData.is_official ? 'white' : 'inherit',
                                transition: 'all 0.3s'
                            }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            color="default"
                                            checked={formData.is_official}
                                            onChange={(e) => setFormData({ ...formData, is_official: e.target.checked })}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold">Plantilla Oficial de Meta API</Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                Actívalo solo si ya registraste y aprobaste este template en Facebook Business.
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Paper>

                            {/* Visibility toggle */}
                            <Paper sx={{
                                p: 2,
                                bgcolor: formData.visible_to_sellers ? 'rgba(46,125,50,0.08)' : 'rgba(237,108,2,0.08)',
                                border: '1px solid',
                                borderColor: formData.visible_to_sellers ? 'success.light' : 'warning.light',
                                transition: 'all 0.3s',
                                borderRadius: 2,
                            }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            color={formData.visible_to_sellers ? 'success' : 'warning'}
                                            checked={formData.visible_to_sellers}
                                            onChange={(e) => setFormData({ ...formData, visible_to_sellers: e.target.checked })}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {formData.visible_to_sellers ? '👁️ Visible para vendedoras' : '🔒 Solo visible para admin/gerente'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formData.visible_to_sellers
                                                    ? 'Las vendedoras pueden usar esta plantilla en el chat.'
                                                    : 'Esta plantilla solo la verán admins y gerentes.'
                                                }
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Paper>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={handleCloseDialog} color="inherit">Cancelar</Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={loading || !formData.name || !formData.label || !formData.body}
                            sx={{ borderRadius: 2, px: 4 }}
                        >
                            Guardar Plantilla
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};
