import { FC, useEffect, useRef, useState } from "react";
import {
    Box, Typography, Avatar, IconButton, TextField, CircularProgress,
    Chip, Tooltip, Button, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, List, ListItemButton, ListItemText, Divider,
    Stack, ClickAwayListener, useTheme, alpha, Collapse,
    Menu, MenuItem, ListItemIcon
} from "@mui/material";
import {
    SendRounded, AttachFileRounded, ArrowBackRounded,
    VerifiedRounded, MicRounded, DeleteRounded, MessageRounded,
    MoreVertRounded, CheckCircleOutlineRounded, AccessTimeRounded, ErrorOutlineRounded,
    PersonAddRounded
} from "@mui/icons-material";
import EmojiEmotionsRoundedIcon from "@mui/icons-material/EmojiEmotionsRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { request } from "../../../common/request";
import { WHATSAPP_ACCEPT, whatsappFileTooBig, readUploadError } from "../../../common/whatsappMedia";
import { CrmConversation } from "./CrmContactCard";
import { OrderDialog } from "../../../components/orders/OrderDialog";
import { LiteOrderDialog } from "../../lite/LiteOrderDialog";
import { useUserStore } from "../../../store/user/UserStore";
import { DeliveryFailure, DeliveryTicks } from "../../../components/whatsapp/MessageDelivery";
import { DeliveryInfo, undeliveredOutline, withDelivery } from "../../../common/whatsappDelivery";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Message {
    id: number;
    body: string;
    is_from_client: boolean;
    status: string;
    error_code?: number | null;
    error_reason?: string | null;
    media: any | null;
    sent_at: string;
    message_type: string;
}

interface ITemplate {
    id: number;
    name: string;
    label: string;
    body: string;
    is_official: boolean;
    meta_components?: any[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const extractVars = (tpl: ITemplate): string[] => {
    let allText = tpl.body;
    tpl.meta_components?.forEach((c) => { if (c.text) allText += " " + c.text; });
    const matches = allText.match(/\{\{\d+\}\}/g) || [];
    const nums = [...new Set(matches.map((m) => m.replace(/\D/g, "")))].sort((a, b) => +a - +b);
    return nums;
};

const buildPreview = (tpl: ITemplate, vars: Record<string, string>) => {
    let full = "";
    const header = tpl.meta_components?.find((c: any) => c.type === "HEADER")?.text;
    if (header) full += header.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => vars[n] ? `*${vars[n]}*` : `{{${n}}}`) + "\n\n";
    full += tpl.body.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => vars[n] ? `*${vars[n]}*` : `{{${n}}}`);
    return full;
};

function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#10b981","#3b82f6","#ef4444"];
    return colors[Math.abs(hash) % colors.length];
}

const renderMedia = (media: any) => {
    if (!media) return null;
    const mediaUrl = typeof media === "string" ? media : media.link;
    if (!mediaUrl) return null;
    const urlLower = mediaUrl.toLowerCase().split("?")[0];
    const mType = typeof media === "string" ? "unknown" : (media.type || "unknown");
    const isAudio = mType === "audio" || mType === "voice" || urlLower.match(/\.(ogg|mp3|wav|m4a)$/);
    const isVideo = mType === "video" || urlLower.match(/\.(mp4|webm|mov|3gp)$/);
    const isPdf = urlLower.endsWith(".pdf");
    const isSticker = mType === "sticker" || urlLower.match(/\.(webp)$/);
    const isImage = mType === "image" || urlLower.match(/\.(jpg|jpeg|png|gif)$/);

    if (isAudio) return <Box component="audio" controls sx={{ width: "100%", minWidth: 250, height: 45, outline: "none", borderRadius: "24px" }}><source src={mediaUrl} /></Box>;
    if (isVideo) return <Box component="video" controls sx={{ width: "100%", maxHeight: 300, borderRadius: 2 }}><source src={mediaUrl} /></Box>;
    if (isPdf) return <Box onClick={() => window.open(mediaUrl, "_blank")} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderRadius: 2, bgcolor: "rgba(0,0,0,0.06)", cursor: "pointer", border: "1px solid rgba(0,0,0,0.1)" }}>📄 <Typography variant="caption" fontWeight={600}>Documento PDF — Click para abrir</Typography></Box>;
    if (isSticker) return <Box component="img" src={mediaUrl} sx={{ maxWidth: 140, width: "100%", objectFit: "contain", cursor: "pointer", dropShadow: "0 2px 4px rgba(0,0,0,0.1)" }} onClick={() => window.open(mediaUrl, "_blank")} />;
    if (isImage) return <Box component="img" src={mediaUrl} sx={{ maxWidth: 280, width: "100%", borderRadius: 2, cursor: "pointer" }} onClick={() => window.open(mediaUrl, "_blank")} />;
    return <a href={mediaUrl} target="_blank" rel="noopener noreferrer">📦 Archivo adjunto</a>;
};

// ── Componente principal ─────────────────────────────────────────────────────
interface Props {
    selected: CrmConversation | null;
    incomingMessage: any;
    /** Meta avisó que un mensaje de este chat se entregó, se leyó o no llegó */
    deliveryUpdate?: DeliveryInfo | null;
    onRefresh: () => void;
    onBucketUpdate?: (clientId: number, bucket: string) => void;
    onBack: () => void;
    isAdmin?: boolean;
    agents?: any[];
}

export const CrmChatArea: FC<Props> = ({ selected, incomingMessage, deliveryUpdate, onRefresh, onBucketUpdate, onBack, isAdmin, agents }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const isLite = useUserStore((s) => s.user.is_lite_view);

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);

    // Grabación de voz
    const [isRecording, setIsRecording] = useState(false);
    const [recDuration, setRecDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recIntervalRef = useRef<any>(null);

    // Order dialog and info
    const [orderOpen, setOrderOpen] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // Template picker
    const [tplOpen, setTplOpen] = useState(false);
    const [templates, setTemplates] = useState<ITemplate[]>([]);
    const [tplLoading, setTplLoading] = useState(false);
    const [selectedTpl, setSelectedTpl] = useState<ITemplate | null>(null);
    const [tplVars, setTplVars] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Bucket Menu
    const [bucketAnchorEl, setBucketAnchorEl] = useState<null | HTMLElement>(null);
    const openBucketMenu = Boolean(bucketAnchorEl);

    // Agent Menu
    const [agentAnchorEl, setAgentAnchorEl] = useState<null | HTMLElement>(null);
    const openAgentMenu = Boolean(agentAnchorEl);

    const scrollToBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

    // ── Carga de mensajes ────────────────────────────────────────────────────
    const fetchMessages = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/messages`, "GET");
            if (status === 200) {
                const json = await response.json();
                setMessages(Array.isArray(json) ? json : []);
                scrollToBottom();
            }
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async () => {
        if (!selected) return;
        const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/read`, "POST");
        if (status === 200) {
            const json = await response.json();
            if (json.conversation_bucket && onBucketUpdate) {
                onBucketUpdate(selected.client_id, json.conversation_bucket);
            }
        }
    };

    useEffect(() => {
        if (selected) { fetchMessages(); markAsRead(); }
        else { setMessages([]); }
    }, [selected?.client_id]);

    // Mensaje entrante en tiempo real
    useEffect(() => {
        if (!incomingMessage) return;
        setMessages((prev) => prev.find((m) => m.id === incomingMessage.id) ? prev : [...prev, incomingMessage]);
        markAsRead();
        scrollToBottom();
    }, [incomingMessage]);

    // Entregado, leído o no entregado, sin recargar el chat
    useEffect(() => {
        if (deliveryUpdate) setMessages((prev) => withDelivery(prev, deliveryUpdate));
    }, [deliveryUpdate]);

    useEffect(() => { scrollToBottom(); }, [messages.length]);

    // ── Mover bucket ─────────────────────────────────────────────────────────
    const handleMoveBucket = async (bucket: string) => {
        if (!selected) return;
        setBucketAnchorEl(null);
        const { status } = await request(`/whatsapp-crm/conversations/${selected.client_id}/move`, "POST", { bucket });
        if (status === 200) { 
            toast.success(`Chat movido a ${bucket === "closed" ? "Cerrados" : bucket === "requires_attention" ? "Atención" : "Seguimiento"}`); 
            onRefresh(); 
        }
    };

    const handleAssignAgent = async (agentId: number) => {
        if (!selected) return;
        setAgentAnchorEl(null);
        const { status } = await request(`/whatsapp-crm/conversations/${selected.client_id}/assign`, "POST", { agent_id: agentId });
        if (status === 200) {
            toast.success("Agente reasignado ✅");
            onRefresh();
        } else {
            toast.error("Error al reasignar agente");
        }
    };

    // ── Enviar texto ─────────────────────────────────────────────────────────
    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !selected) return;
        setSending(true);
        const text = inputText;
        setInputText(""); setShowEmoji(false);
        try {
            const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/messages`, "POST", { body: text });
            if (status === 201 || status === 200) {
                const json = await response.json();
                setMessages((prev) => [...prev, json]);
                onRefresh();
            } else { toast.error("Error enviando mensaje"); }
        } finally { setSending(false); }
    };

    // ── Subir archivo ────────────────────────────────────────────────────────
    const handleUpload = async (file: File) => {
        if (!selected) return;
        const tooBig = whatsappFileTooBig(file);
        if (tooBig) { toast.error(tooBig); return; }
        setUploading(true);
        const fd = new FormData(); fd.append("file", file);
        try {
            const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/media`, "POST", fd);
            if (status === 201 || status === 200) {
                const json = await response.json(); setMessages((prev) => [...prev, json]); onRefresh();
            } else { toast.error(await readUploadError(response, status)); }
        } catch { toast.error("Error de conexión al subir el archivo"); }
        finally { setUploading(false); }
    };

    // ── Grabación de voz ─────────────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr; audioChunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mr.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/ogg" });
                handleUpload(new File([blob], `voice-${Date.now()}.ogg`, { type: "audio/ogg" }));
                stream.getTracks().forEach((t) => t.stop());
            };
            mr.start(); setIsRecording(true); setRecDuration(0);
            recIntervalRef.current = setInterval(() => setRecDuration((n) => n + 1), 1000);
        } catch { toast.error("No se pudo acceder al micrófono"); }
    };

    const stopRecording = (send = true) => {
        if (!mediaRecorderRef.current || !isRecording) return;
        if (!send) mediaRecorderRef.current.onstop = () => mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(recIntervalRef.current);
    };

    // ── Plantillas ───────────────────────────────────────────────────────────
    const openTemplates = async () => {
        setTplLoading(true); setSelectedTpl(null); setTplVars({}); setTplOpen(true);
        try {
            const { status, response } = await request("/whatsapp-templates", "GET");
            if (status === 200) setTemplates(await response.json());
        } finally { setTplLoading(false); }
    };

    const handleSendTemplate = async () => {
        if (!selectedTpl || !selected) return;
        setSending(true);
        try {
            const nums = extractVars(selectedTpl);
            const vars = nums.map((n) => tplVars[n] ?? "");
            const preview = buildPreview(selectedTpl, tplVars);
            const payload: any = { body: preview };
            if (selectedTpl.is_official) { payload.template_name = selectedTpl.name; payload.vars = vars; }
            const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/messages`, "POST", payload);
            if (status === 201 || status === 200) {
                const json = await response.json(); setMessages((prev) => [...prev, json]); onRefresh(); setTplOpen(false);
            } else { const e = await response.json(); toast.error(e.message || "Error enviando plantilla"); }
        } finally { setSending(false); }
    };

    // ── Emojis ───────────────────────────────────────────────────────────────
    const EMOJIS = ["😊","😂","❤️","😍","🙏","👏","🔥","✅","💪","🎉","😅","😭","🤔","👍","💯","🙌","😎","📦","🚀","⭐","⏰","📅","💵","💰","📢","👋","🤝","✔️","❌","⚠️"];

    // ── Pantalla vacía ───────────────────────────────────────────────────────
    if (!selected) {
        return (
            <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                <Box sx={{ p: 3, borderRadius: "50%", bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    <MessageRounded sx={{ fontSize: 48, color: "primary.main" }} />
                </Box>
                <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" color="text.primary" fontWeight={800} sx={{ letterSpacing: "-0.5px" }}>WhatsApp CRM</Typography>
                    <Typography variant="body2" color="text.secondary">Selecciona un chat en el menú lateral para conversar</Typography>
                </Box>
            </Box>
        );
    }

    const isWindowOpen = selected.is_window_open;
    const orderId = selected.order?.id;
    const avatarColor = stringToColor(selected.client_name || selected.client_phone);

    // Dynamic background based on theme
    const bgPattern = theme.palette.mode === "dark" 
        ? "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)" 
        : "#efeae2 url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')";

    return (
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", background: bgPattern, overflow: "hidden" }}>

            {/* ── HEADER DEL CHAT ────────────────────────────────────────────── */}
            <Box sx={{ p: 1.5, px: 2.5, display: "flex", alignItems: "center", gap: 2, zIndex: 2, flexShrink: 0, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
                <IconButton onClick={onBack} sx={{ display: { xs: "flex", md: "none" } }}>
                    <ArrowBackRounded />
                </IconButton>

                <Avatar sx={{ bgcolor: avatarColor, fontWeight: 800, width: 42, height: 42, fontSize: "1rem" }}>
                    {selected.client_name.charAt(0).toUpperCase()}
                </Avatar>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: "-0.2px" }} noWrap>{selected.client_name}</Typography>
                        <Chip label={isWindowOpen ? "Sesión activa" : "24h vencida"} size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: isWindowOpen ? alpha("#10b981", 0.15) : alpha(theme.palette.text.primary, 0.1), color: isWindowOpen ? "#10b981" : "text.secondary" }} />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>{selected.client_phone}</Typography>
                    {isAdmin && (selected.order?.agent_name || selected.agent_name) && (
                        <>
                            <Typography variant="caption" color="divider">•</Typography>
                            <Typography variant="caption" color="info.main" sx={{ fontWeight: 800 }}>
                                👤 {selected.order?.agent_name || selected.agent_name}
                            </Typography>
                        </>
                    )}
                        {selected.order && (
                            <>
                                <Typography variant="caption" color="divider">•</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }} noWrap>
                                    {selected.order.products_summary || `Orden #${selected.order.order_number}`}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Box>

                {/* Acciones del header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {/* BOTÓN VER ORDEN E INFO */}
                    {orderId && (
                        <>
                            <Tooltip title="Información de la Orden">
                                <IconButton onClick={() => setShowInfo(!showInfo)} size="small" sx={{ bgcolor: showInfo ? alpha(theme.palette.primary.main, 0.1) : "transparent", color: showInfo ? "primary.main" : "text.secondary" }}>
                                    <InfoOutlinedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={`Ver Orden #${selected.order?.order_number}`}>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<OpenInNewRoundedIcon fontSize="small" />}
                                    onClick={() => setOrderOpen(true)}
                                    sx={{ borderRadius: "8px", fontSize: "0.75rem", textTransform: "none", py: 0.6, px: 2, fontWeight: 700, boxShadow: "none" }}
                                >
                                    Ver Orden
                                </Button>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="Mover a...">
                        <IconButton onClick={(e) => setBucketAnchorEl(e.currentTarget)} size="small" sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                            <MoreVertRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Menu
                        anchorEl={bucketAnchorEl}
                        open={openBucketMenu}
                        onClose={() => setBucketAnchorEl(null)}
                        PaperProps={{ sx: { borderRadius: "12px", minWidth: 180, boxShadow: theme.shadows[10] } }}
                    >
                        <Typography variant="caption" sx={{ px: 2, py: 1, display: "block", fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                            Mover a:
                        </Typography>
                        <MenuItem onClick={() => handleMoveBucket("requires_attention")} sx={{ py: 1.2 }}>
                            <ListItemIcon><ErrorOutlineRounded fontSize="small" sx={{ color: "#ef4444" }} /></ListItemIcon>
                            <ListItemText primary="Atención" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
                        </MenuItem>
                        <MenuItem onClick={() => handleMoveBucket("follow_up")} sx={{ py: 1.2 }}>
                            <ListItemIcon><AccessTimeRounded fontSize="small" sx={{ color: "#f59e0b" }} /></ListItemIcon>
                            <ListItemText primary="Seguimiento" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
                        </MenuItem>
                        <MenuItem onClick={() => handleMoveBucket("closed")} sx={{ py: 1.2 }}>
                            <ListItemIcon><CheckCircleOutlineRounded fontSize="small" sx={{ color: "#64748b" }} /></ListItemIcon>
                            <ListItemText primary="Cerrado" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
                        </MenuItem>
                        
                        {isAdmin && agents && (
                            <>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="caption" sx={{ px: 2, py: 1, display: "block", fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                                    Administración:
                                </Typography>
                                <MenuItem onClick={(e) => { setBucketAnchorEl(null); setAgentAnchorEl(e.currentTarget); }} sx={{ py: 1.2 }}>
                                    <ListItemIcon><PersonAddRounded fontSize="small" color="primary" /></ListItemIcon>
                                    <ListItemText primary="Reasignar Agente" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
                                </MenuItem>
                            </>
                        )}
                    </Menu>

                    {/* Menu de Agentes */}
                    <Menu
                        anchorEl={agentAnchorEl}
                        open={openAgentMenu}
                        onClose={() => setAgentAnchorEl(null)}
                        PaperProps={{ sx: { borderRadius: "12px", minWidth: 200, maxHeight: 400, boxShadow: theme.shadows[10] } }}
                    >
                        <Typography variant="caption" sx={{ px: 2, py: 1, display: "block", fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                            Seleccionar Agente:
                        </Typography>
                        {agents?.map((agent) => (
                            <MenuItem key={agent.id} onClick={() => handleAssignAgent(agent.id)} sx={{ py: 1.2 }}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: "0.7rem", mr: 1.5, bgcolor: stringToColor(agent.names) }}>{agent.names[0]}</Avatar>
                                <ListItemText primary={`${agent.names} ${agent.surnames ?? ""}`} primaryTypographyProps={{ variant: "body2", fontWeight: 700 }} />
                            </MenuItem>
                        ))}
                    </Menu>

                    <Tooltip title="Ir a la lista de pedidos">
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ArrowBackRounded fontSize="small" />}
                            onClick={() => navigate("/orders")}
                            sx={{ 
                                borderRadius: "8px", 
                                fontSize: "0.75rem", 
                                textTransform: "none", 
                                py: 0.6, 
                                px: 1.5, 
                                fontWeight: 700, 
                                borderColor: "divider",
                                color: "text.primary",
                                display: { xs: "none", sm: "flex" } // Ocultar en mobile muy pequeño para no romper el header
                            }}
                        >
                            Pedidos
                        </Button>
                    </Tooltip>
                    <Tooltip title="Ir a la lista de pedidos">
                        <IconButton 
                            size="small" 
                            onClick={() => navigate("/orders")}
                            sx={{ 
                                display: { xs: "flex", sm: "none" },
                                bgcolor: alpha(theme.palette.text.primary, 0.05),
                                borderRadius: "8px"
                            }}
                        >
                            <ArrowBackRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* ── INFO PANEL ─────────────────────────────────────────────────── */}
            <Collapse in={showInfo && !!selected.order} unmountOnExit>
                <Box sx={{ p: 2, bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc", borderBottom: "1px solid", borderColor: "divider", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", position: "relative", zIndex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: "primary.main", display: "flex", alignItems: "center", gap: 1 }}>
                        <InfoOutlinedIcon fontSize="small" /> Detalles de la Orden #{selected.order?.order_number}
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Cliente</Typography>
                            <Typography variant="body2" fontWeight={600}>{selected.client_name}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Agente Asignado</Typography>
                            <Typography variant="body2" fontWeight={600}>{selected.order?.agent_name || selected.agent_name || "Sin asignar"}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Estado</Typography>
                            <Chip label={selected.order?.status} size="small" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 800, mt: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main" }} />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Fecha de Creación</Typography>
                            <Typography variant="body2" fontWeight={600}>{selected.order?.created_at ? dayjs(selected.order.created_at).format("DD/MM/YYYY hh:mm A") : "-"}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Monto</Typography>
                            <Typography variant="body2" fontWeight={800} color="success.main">
                                ${Number(selected.order?.total_usd || 0).toFixed(2)} USD 
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 600 }}>
                                    (Bs {Number(selected.order?.total_ves || 0).toFixed(2)} Binance | Bs {Number(selected.order?.bcv_equivalence || 0).toFixed(2)} BCV)
                                </Typography>
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Ciudad</Typography>
                            <Typography variant="body2" fontWeight={600}>{selected.order?.location || "-"}</Typography>
                        </Box>
                        {selected.order?.address1 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Dirección de Envío</Typography>
                                <Typography variant="body2" fontWeight={600}>{selected.order.address1}</Typography>
                            </Box>
                        )}
                        {selected.order?.address2 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Punto de Referencia</Typography>
                                <Typography variant="body2" fontWeight={600}>{selected.order.address2}</Typography>
                            </Box>
                        )}
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Veces atendido</Typography>
                            <Typography variant="body2" fontWeight={600} color={selected.order?.reset_count && selected.order.reset_count > 0 ? "error.main" : "text.primary"}>{selected.order?.reset_count || 0}</Typography>
                        </Box>
                    </Box>
                </Box>
            </Collapse>

            {/* ── ÁREA DE MENSAJES ───────────────────────────────────────────── */}
            <Box sx={{ flexGrow: 1, overflowY: "auto", p: { xs: 1.5, md: 3 }, display: "flex", flexDirection: "column", gap: 1 }}>
                {loading && messages.length === 0 ? (
                    <Box sx={{ m: "auto", bgcolor: "background.paper", p: 2, borderRadius: 2, display: "flex", gap: 1, alignItems: "center" }}>
                        <CircularProgress size={20} /> <Typography variant="body2" fontWeight={600}>Cargando mensajes...</Typography>
                    </Box>
                ) : messages.map((msg) => {
                    const isClient = msg.is_from_client;
                    // Colors adaptable to dark mode
                    const bubbleBg = isClient ? theme.palette.background.paper : (theme.palette.mode === "dark" ? "#064e3b" : "#d9fdd3");
                    const textColor = theme.palette.text.primary;
                    const metaColor = alpha(theme.palette.text.primary, 0.6);
                    
                    return (
                        <Box key={msg.id} sx={{ alignSelf: isClient ? "flex-start" : "flex-end", maxWidth: { xs: "90%", md: "75%" }, minWidth: 100 }}>
                            <Box sx={{ p: 1.2, px: 1.5, bgcolor: bubbleBg, borderRadius: "12px", borderTopLeftRadius: isClient ? 0 : "12px", borderTopRightRadius: isClient ? "12px" : 0, boxShadow: (!isClient && undeliveredOutline(msg)) || "0 1px 2px rgba(0,0,0,0.1)" }}>
                                {msg.media && <Box sx={{ mb: 1 }}>{renderMedia(msg.media)}</Box>}
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: textColor, fontSize: "0.9rem", lineHeight: 1.4 }}>
                                    {(msg.body || "").split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                        part.match(/^https?:\/\//) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.primary.main, textDecoration: "none", fontWeight: 600 }}>{part}</a> : part
                                    )}
                                </Typography>
                                {!isClient && <DeliveryFailure message={msg} dark={theme.palette.mode === "dark"} />}
                                <Typography variant="caption" sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", color: metaColor, fontSize: "0.65rem", mt: 0.5, fontWeight: 500 }}>
                                    {dayjs(msg.sent_at).format("HH:mm")}
                                    {!isClient && <DeliveryTicks message={msg} dark={theme.palette.mode === "dark"} />}
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
                <div ref={bottomRef} />
            </Box>

            {/* ── INPUT AREA ─────────────────────────────────────────────────── */}
            <Box component="form" onSubmit={handleSend} sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, bgcolor: "background.paper", zIndex: 2, flexShrink: 0, borderTop: "1px solid", borderColor: "divider" }}>
                {!isWindowOpen ? (
                    <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ flexGrow: 1, p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), border: "1px dashed", borderColor: alpha(theme.palette.warning.main, 0.3), borderRadius: "10px", textAlign: "center" }}>
                            <Typography variant="body2" color="warning.main" fontWeight={700}>⚠️ Ventana de 24h cerrada. Para hablar con el cliente debes usar una plantilla oficial.</Typography>
                        </Box>
                        <Button variant="contained" color="primary" onClick={openTemplates} startIcon={<VerifiedRounded />} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700, py: 1 }}>
                            Enviar Plantilla
                        </Button>
                    </Box>
                ) : isRecording ? (
                    <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", bgcolor: alpha(theme.palette.error.main, 0.1), p: 1, px: 3, borderRadius: "12px", gap: 2 }}>
                        <Box sx={{ width: 10, height: 10, bgcolor: "error.main", borderRadius: "50%", animation: "blink 1s infinite", "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.2 } } }} />
                        <Typography variant="body1" fontWeight={800} color="error.main">{Math.floor(recDuration / 60)}:{String(recDuration % 60).padStart(2, "0")}</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button color="error" onClick={() => stopRecording(false)} sx={{ textTransform: "none", fontWeight: 700 }}>Cancelar</Button>
                        <Button variant="contained" color="error" onClick={() => stopRecording(true)} endIcon={<SendRounded />} sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700 }}>Enviar</Button>
                    </Box>
                ) : (
                    <>
                        <input type="file" hidden ref={fileInputRef} accept={WHATSAPP_ACCEPT} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
                        <Tooltip title="Adjuntar archivo">
                            <IconButton onClick={() => fileInputRef.current?.click()} disabled={uploading} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                                {uploading ? <CircularProgress size={24} /> : <AttachFileRounded />}
                            </IconButton>
                        </Tooltip>
                        
                        {/* Emoji picker */}
                        <ClickAwayListener onClickAway={() => setShowEmoji(false)}>
                            <Box sx={{ position: "relative" }}>
                                <Tooltip title="Emojis">
                                    <IconButton onClick={() => setShowEmoji((v) => !v)} sx={{ bgcolor: showEmoji ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.text.primary, 0.05), color: showEmoji ? "primary.main" : "inherit" }}>
                                        <EmojiEmotionsRoundedIcon />
                                    </IconButton>
                                </Tooltip>
                                {showEmoji && (
                                    <Box sx={{ position: "absolute", bottom: 60, left: 0, zIndex: 1300, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "16px", p: 2, boxShadow: theme.shadows[8], width: 280 }}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>Emojis rápidos</Typography>
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                            {EMOJIS.map((em) => (
                                                <Box key={em} onClick={() => { setInputText((p) => p + em); setShowEmoji(false); }} sx={{ fontSize: "1.4rem", cursor: "pointer", p: 0.5, borderRadius: "8px", "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.08) }, transition: "background 0.1s" }}>{em}</Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </ClickAwayListener>

                        <TextField
                            fullWidth
                            placeholder="Escribe un mensaje..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            disabled={uploading}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                            sx={{ 
                                "& fieldset": { borderColor: "transparent" },
                                "& .MuiOutlinedInput-root": { 
                                    bgcolor: alpha(theme.palette.background.default, 0.8),
                                    borderRadius: "12px",
                                    "&:hover fieldset": { borderColor: "divider" },
                                    "&.Mui-focused fieldset": { borderColor: "primary.main" }
                                }
                            }}
                        />
                        
                        {inputText.trim() ? (
                            <Button type="submit" variant="contained" disabled={sending} sx={{ minWidth: 50, width: 50, height: 50, borderRadius: "12px", p: 0 }}>
                                {sending ? <CircularProgress size={24} color="inherit" /> : <SendRounded />}
                            </Button>
                        ) : (
                            <Tooltip title="Nota de voz">
                                <Button variant="contained" color="secondary" onClick={startRecording} disabled={uploading} sx={{ minWidth: 50, width: 50, height: 50, borderRadius: "12px", p: 0, bgcolor: theme.palette.mode === "dark" ? "#14b8a6" : "#0d9488" }}>
                                    <MicRounded />
                                </Button>
                            </Tooltip>
                        )}
                    </>
                )}
            </Box>

            {/* ── TEMPLATE DIALOG ─────────────────────────────────────────────── */}
            <Dialog open={tplOpen} onClose={() => setTplOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "16px", backgroundImage: "none" } }}>
                <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                    <VerifiedRounded color="primary" /> Enviar Plantilla
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {tplLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}><CircularProgress /></Box>
                    ) : !selectedTpl ? (
                        <List disablePadding>
                            {templates.length === 0 && <Box sx={{ p: 6, textAlign: "center" }}><Typography color="text.secondary">No hay plantillas registradas.</Typography></Box>}
                            {templates.map((tpl, i) => (
                                <Box key={tpl.id}>
                                    <ListItemButton onClick={() => { setSelectedTpl(tpl); const nums = extractVars(tpl); const defs: Record<string, string> = {}; if (nums[0]) defs[nums[0]] = selected?.client_name?.split(" ")[0] ?? ""; setTplVars(defs); }} sx={{ py: 2, px: 3 }}>
                                        <Box sx={{ mr: 2, color: tpl.is_official ? "primary.main" : "text.secondary" }}>{tpl.is_official ? <VerifiedRounded /> : <MessageRounded />}</Box>
                                        <ListItemText 
                                            primary={<Typography fontWeight={700}>{tpl.label}</Typography>} 
                                            secondary={<Typography variant="body2" color="text.secondary" noWrap>{tpl.body}</Typography>} 
                                        />
                                    </ListItemButton>
                                    {i < templates.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                    ) : (
                        <Box sx={{ p: 4 }}>
                            <Button size="small" onClick={() => setSelectedTpl(null)} sx={{ mb: 3, textTransform: "none", fontWeight: 700 }}>← Volver a la lista</Button>
                            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>{selectedTpl.label}</Typography>
                            {extractVars(selectedTpl).length > 0 && (
                                <Stack spacing={2} sx={{ mb: 3 }}>
                                    {extractVars(selectedTpl).map((num) => (
                                        <TextField key={num} label={`Variable {{${num}}}`} variant="outlined" fullWidth value={tplVars[num] ?? ""} onChange={(e) => setTplVars((p) => ({ ...p, [num]: e.target.value }))} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }} />
                                    ))}
                                </Stack>
                            )}
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: "1px solid", borderColor: alpha(theme.palette.primary.main, 0.1), borderRadius: "12px" }}>
                                <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: "block", mb: 1 }}>Vista previa del mensaje</Typography>
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{buildPreview(selectedTpl, tplVars)}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
                    <Button onClick={() => setTplOpen(false)} color="inherit" sx={{ fontWeight: 700, textTransform: "none" }}>Cancelar</Button>
                    {selectedTpl && (
                        <Button variant="contained" onClick={handleSendTemplate} disabled={sending} startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendRounded />} sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, px: 3 }}>
                            Enviar Plantilla
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* ── ORDER DIALOG — ÚNICA DIFERENCIA LITE / PRO ───────────────── */}
            {orderId && (
                isLite
                    ? <LiteOrderDialog id={orderId} open={orderOpen} setOpen={setOrderOpen} />
                    : <OrderDialog id={orderId} open={orderOpen} setOpen={setOrderOpen} />
            )}
        </Box>
    );
};
