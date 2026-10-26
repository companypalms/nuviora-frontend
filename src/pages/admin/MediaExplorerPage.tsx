import { useState, useEffect, useCallback } from 'react';
import { 
    Box, Paper, Typography, Breadcrumbs, Link, Button, 
    IconButton, Grid, Card, CardContent, CardActionArea, 
    Menu, MenuItem, Dialog, DialogTitle, DialogContent, 
    DialogActions, TextField, LinearProgress, Tooltip,
    InputAdornment, Alert, Snackbar, Divider
} from '@mui/material';
import { 
    FolderRounded, InsertDriveFileRounded, UploadRounded, 
    CreateNewFolderRounded, MoreVertRounded, DeleteRounded, 
    EditRounded, ContentCopyRounded, RefreshRounded, 
    ArrowForwardIosRounded, SearchRounded, VisibilityRounded,
    VideoLibraryRounded
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { request } from '../../common/request';
import { useDropzone } from 'react-dropzone';

interface FileItem {
    name: string;
    type: 'file' | 'directory';
    path: string;
    url?: string;
    size?: number;
    extension?: string;
    last_modified: number;
}

export const MediaExplorerPage = () => {
    const [path, setPath] = useState('');
    const [items, setItems] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modals
    const [folderModal, setFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameModal, setRenameModal] = useState(false);
    const [renameState, setRenameState] = useState<{old: string, new: string}>({old: '', new: ''});
    
    // Context Menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);

    // Snackbar
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const fetchItems = useCallback(async (targetPath = path) => {
        setLoading(true);
        try {
            const { ok, response } = await request(`/media-explorer?path=${encodeURIComponent(targetPath)}`, 'GET');
            if (ok) {
                const json = await response.json();
                setItems(json.items || []);
            }
        } catch (error) {
            console.error(error);
            setToast({ open: true, message: 'Error al cargar archivos', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [path]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const formData = new FormData();
        formData.append('path', path);
        acceptedFiles.forEach(file => formData.append('files[]', file));

        try {
            const { status } = await request('/media-explorer/upload', 'POST', formData);
            if (status) {
                setToast({ open: true, message: 'Subida completada', severity: 'success' });
                fetchItems();
            }
        } catch (error) {
            setToast({ open: true, message: 'Error al subir archivos', severity: 'error' });
        }
    }, [path, fetchItems]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

    const handleCreateFolder = async () => {
        if (!newFolderName) return;
        try {
            const { status } = await request('/media-explorer/mkdir', 'POST', { path, name: newFolderName });
            if (status) {
                setFolderModal(false);
                setNewFolderName('');
                fetchItems();
            }
        } catch (error) {
            setToast({ open: true, message: 'Error al crear carpeta', severity: 'error' });
        }
    };

    const handleRename = async () => {
        try {
            const { status } = await request('/media-explorer/rename', 'POST', { 
                path, 
                old_name: renameState.old, 
                new_name: renameState.new 
            });
            if (status) {
                setRenameModal(false);
                fetchItems();
            }
        } catch (error) {
            setToast({ open: true, message: 'Error al renombrar', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!selectedItem) return;
        if (!window.confirm(`¿Estás seguro de eliminar "${selectedItem.name}"?`)) return;
        try {
            const { status } = await request('/media-explorer/delete', 'POST', { path, name: selectedItem.name });
            if (status) {
                handleCloseMenu();
                fetchItems();
            }
        } catch (error) {
            setToast({ open: true, message: 'Error al eliminar', severity: 'error' });
        }
    };

    const handleCopyUrl = (url?: string) => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        setToast({ open: true, message: 'URL copiada al portapapeles', severity: 'success' });
        handleCloseMenu();
    };

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, item: FileItem) => {
        setAnchorEl(event.currentTarget);
        setSelectedItem(item);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedItem(null);
    };

    const navigateTo = (newPath: string) => {
        setPath(newPath);
    };

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <Layout>
            <Box sx={{ p: 3, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>Biblioteca de Medios</Typography>
                        <Breadcrumbs separator={<ArrowForwardIosRounded sx={{ fontSize: 10 }} />}>
                            <Link 
                                component="button" 
                                underline="hover" 
                                color="inherit" 
                                onClick={() => navigateTo('')}
                                sx={{ display: 'flex', alignItems: 'center' }}
                            >
                                Home
                            </Link>
                            {path.split('/').filter(Boolean).map((p, i, arr) => (
                                <Link 
                                    key={i}
                                    component="button" 
                                    underline="hover" 
                                    color={i === arr.length -1 ? "primary" : "inherit"}
                                    onClick={() => navigateTo(arr.slice(0, i + 1).join('/'))}
                                >
                                    {p}
                                </Link>
                            ))}
                        </Breadcrumbs>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField 
                            size="small" 
                            placeholder="Buscar..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment>
                            }}
                        />
                        <Button variant="outlined" startIcon={<RefreshRounded />} onClick={() => fetchItems()}>Refrescar</Button>
                        <Button variant="outlined" startIcon={<CreateNewFolderRounded />} onClick={() => setFolderModal(true)}>Nueva Carpeta</Button>
                        <label htmlFor="upload-button">
                            <input 
                                style={{ display: 'none' }} 
                                id="upload-button" 
                                type="file" 
                                multiple 
                                onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} 
                            />
                            <Button variant="contained" component="span" startIcon={<UploadRounded />}>Subir Archivos</Button>
                        </label>
                    </Box>
                </Box>

                <Paper 
                    {...getRootProps()}
                    elevation={0}
                    sx={{ 
                        flexGrow: 1, 
                        p: 3, 
                        bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'divider',
                        borderRadius: 4,
                        overflowY: 'auto',
                        position: 'relative'
                    }}
                >
                    <input {...getInputProps()} />
                    {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
                    
                    {filteredItems.length === 0 && !loading && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                            <FolderRounded sx={{ fontSize: 100, mb: 2 }} />
                            <Typography variant="h6">Esta carpeta está vacía</Typography>
                        </Box>
                    )}

                    <Grid container spacing={2}>
                        {filteredItems.map((item, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }} key={index}>
                                <Card variant="outlined" sx={{ borderRadius: 3, transition: '0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
                                    <CardActionArea 
                                        onClick={() => item.type === 'directory' ? navigateTo(item.path) : window.open(item.url, '_blank')}
                                        sx={{ p: 1 }}
                                    >
                                        <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 2, mb: 1, overflow: 'hidden' }}>
                                            {item.type === 'directory' ? (
                                                <FolderRounded sx={{ fontSize: 60, color: 'primary.main' }} />
                                            ) : (
                                                item.extension?.match(/(jpg|jpeg|png|webp|gif)/i) ? (
                                                    <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : item.extension?.match(/(mp4|mov|avi|wmv)/i) ? (
                                                    <VideoLibraryRounded sx={{ fontSize: 60, color: 'secondary.main' }} />
                                                ) : (
                                                    <InsertDriveFileRounded sx={{ fontSize: 60, color: 'text.secondary' }} />
                                                )
                                            )}
                                        </Box>
                                        <CardContent sx={{ p: '8px !important' }}>
                                            <Typography variant="body2" noWrap fontWeight="bold">{item.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {item.type === 'directory' ? 'Carpeta' : `${(item.size! / 1024).toFixed(1)} KB`}
                                            </Typography>
                                        </CardContent>
                                    </CardActionArea>
                                    <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
                                        <IconButton size="small" onClick={(e) => handleOpenMenu(e, item)} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}>
                                            <MoreVertRounded fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            </Box>

            {/* Context Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
                {selectedItem?.type === 'file' && (
                    <MenuItem onClick={() => handleCopyUrl(selectedItem.url)}>
                        <ContentCopyRounded sx={{ mr: 1, fontSize: 18 }} /> Copiar URL
                    </MenuItem>
                )}
                {selectedItem?.type === 'file' && (
                    <MenuItem onClick={() => window.open(selectedItem.url, '_blank')}>
                        <VisibilityRounded sx={{ mr: 1, fontSize: 18 }} /> Ver archivo
                    </MenuItem>
                )}
                <MenuItem onClick={() => {
                    setRenameState({ old: selectedItem!.name, new: selectedItem!.name });
                    setRenameModal(true);
                    handleCloseMenu();
                }}>
                    <EditRounded sx={{ mr: 1, fontSize: 18 }} /> Renombrar
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                    <DeleteRounded sx={{ mr: 1, fontSize: 18 }} /> Eliminar
                </MenuItem>
            </Menu>

            {/* Folder Modal */}
            <Dialog open={folderModal} onClose={() => setFolderModal(false)}>
                <DialogTitle>Nueva Carpeta</DialogTitle>
                <DialogContent>
                    <TextField 
                        autoFocus 
                        fullWidth 
                        label="Nombre de la carpeta" 
                        margin="dense" 
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFolderModal(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleCreateFolder}>Crear</Button>
                </DialogActions>
            </Dialog>

            {/* Rename Modal */}
            <Dialog open={renameModal} onClose={() => setRenameModal(false)}>
                <DialogTitle>Renombrar {selectedItem?.type === 'directory' ? 'Carpeta' : 'Archivo'}</DialogTitle>
                <DialogContent>
                    <TextField 
                        autoFocus 
                        fullWidth 
                        label="Nuevo nombre" 
                        margin="dense" 
                        value={renameState.new}
                        onChange={e => setRenameState(prev => ({ ...prev, new: e.target.value }))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameModal(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleRename}>Guardar</Button>
                </DialogActions>
            </Dialog>

            <Snackbar 
                open={toast.open} 
                autoHideDuration={4000} 
                onClose={() => setToast(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={toast.severity} sx={{ width: '100%', borderRadius: 3 }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Layout>
    );
};
