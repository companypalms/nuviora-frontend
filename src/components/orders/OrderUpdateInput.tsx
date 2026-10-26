import React, { useState } from "react";
import { Box, Dialog, IconButton, darken, lighten, useTheme, InputAdornment, Tooltip } from "@mui/material";
import { AttachFile, CloseRounded, SendRounded, PhotoLibraryRounded } from "@mui/icons-material";
import { red, grey } from "@mui/material/colors";
import { toast } from "react-toastify";
import { TextFieldCustom } from "../custom";
import { useUserStore } from "../../store/user/UserStore";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { IResponse } from "../../interfaces/response-type";
import { request } from "../../common/request";

interface OrderUpdateInputProps {
    orderId: number;
}

export const OrderUpdateInput: React.FC<OrderUpdateInputProps> = ({ orderId }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const user = useUserStore((state) => state.user);
    const { selectedOrder, updateOrderInColumns } = useOrdersStore();

    const [newUpdate, setNewUpdate] = useState<string>("");
    const [newUpdateImage, setNewUpdateImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [openPreview, setOpenPreview] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSendUpdate = async () => {
        if ((!newUpdate.trim() && !newUpdateImage) || !orderId || loading) return;

        setLoading(true);
        const form = new FormData();
        form.append("message", newUpdate || "Adjunto de imagen");
        if (newUpdateImage) form.append("image", newUpdateImage);

        try {
            const { status, response }: IResponse = await request(
                `/orders/${orderId}/updates`,
                "POST",
                form,
                true
            );

            if (status >= 200 && status < 300) {
                const data = await response.json();

                const newUpdatesList = [...(selectedOrder?.updates ?? selectedOrder?.order_updates ?? []), data.update];
                updateOrderInColumns({
                    ...selectedOrder,
                    updates: newUpdatesList,
                    order_updates: newUpdatesList
                });

                setNewUpdate("");
                setNewUpdateImage(null);
                setPreview(null);
                toast.success("Actualización agregada ✅");
            } else {
                toast.error((await response.json().catch(() => ({})))?.message || "No se pudo guardar la actualización ❌");
            }
        } catch (err) {
            toast.error("Error en servidor ⚠️");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            width: '100%',
            p: 2,
            // 🛡️ Forzamos un color sólido para evitar que se vea lo que pasa por detrás
            bgcolor: isDark ? darken(user.color, 0.94) : '#ffffff',
            borderTop: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            boxShadow: isDark ? '0 -12px 40px rgba(0,0,0,0.7)' : '0 -12px 40px rgba(0,0,0,0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            zIndex: 999
        }}>
            <Box sx={{ maxWidth: { xs: '100%', md: '80%', lg: '60%' }, margin: 'auto' }}>
                {preview && (
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{
                            position: 'relative',
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            border: `2px solid ${user.color}`,
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.02)' }
                        }}>
                            <img
                                src={preview}
                                alt="preview"
                                style={{ height: 100, width: 'auto', display: 'block', cursor: 'pointer' }}
                                onClick={() => setOpenPreview(true)}
                            />
                            <IconButton
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    bgcolor: red[600],
                                    color: 'white',
                                    padding: 0.5,
                                    '&:hover': { bgcolor: red[800] }
                                }}
                                onClick={() => { setPreview(null); setNewUpdateImage(null); }}
                            >
                                <CloseRounded sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Box>
                    </Box>
                )}

                <Box sx={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 1.5,
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    p: 1,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}>
                    {user.role?.description !== 'Vendedor' && (
                        <>
                            <input
                                type="file"
                                accept="image/*"
                                id="update-image"
                                style={{ display: "none" }}
                                onChange={(e: any) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setNewUpdateImage(file);
                                    setPreview(URL.createObjectURL(file));
                                }}
                            />
                            <label htmlFor="update-image">
                                <Tooltip title="Adjuntar imagen">
                                    <IconButton component="span" sx={{
                                        color: isDark ? grey[400] : grey[600],
                                        '&:hover': { color: user.color, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'white' }
                                    }}>
                                        <PhotoLibraryRounded />
                                    </IconButton>
                                </Tooltip>
                            </label>
                        </>
                    )}

                    <TextFieldCustom
                        placeholder="Escribe un comentario..."
                        value={newUpdate}
                        multiline
                        maxRows={4}
                        onChange={(e: any) => setNewUpdate(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendUpdate();
                            }
                        }}
                        variant="standard"
                        fullWidth
                        sx={{
                            px: 1,
                            pb: 0.5,
                            '& .MuiInputBase-root:before, & .MuiInputBase-root:after': { display: 'none' }
                        }}
                    />

                    <IconButton
                        onClick={handleSendUpdate}
                        disabled={(!newUpdate.trim() && !newUpdateImage) || loading}
                        sx={{
                            background: user.color,
                            color: theme.palette.getContrastText(user.color),
                            width: 44,
                            height: 44,
                            boxShadow: `0 4px 14px ${user.color}66`,
                            transition: 'all 0.2s',
                            "&:hover": {
                                background: darken(user.color, 0.2),
                                transform: 'translateY(-2px)',
                                boxShadow: `0 6px 20px ${user.color}88`,
                            },
                            "&:disabled": {
                                background: isDark ? grey[800] : grey[300],
                                color: isDark ? grey[600] : grey[500],
                                boxShadow: 'none'
                            }
                        }}
                    >
                        <SendRounded sx={{ transform: 'rotate(-45deg) translate(2px, -2px)' }} />
                    </IconButton>
                </Box>
            </Box>

            <Dialog open={openPreview} onClose={() => setOpenPreview(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}>
                <Box sx={{ position: 'relative' }}>
                    <IconButton onClick={() => setOpenPreview(false)} sx={{ position: 'absolute', top: -40, right: 0, color: 'white' }}>
                        <CloseRounded />
                    </IconButton>
                    <img
                        src={preview!}
                        alt="full preview"
                        style={{ width: '100%', height: 'auto', borderRadius: 16 }}
                    />
                </Box>
            </Dialog>
        </Box>
    );
};
