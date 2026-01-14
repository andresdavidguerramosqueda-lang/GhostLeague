import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Badge,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  SupportAgent as SupportAgentIcon,
  Gavel as GavelIcon,
  Inbox as InboxIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import api from '../services/api';

const AdminPendingInbox = ({ open, onClose, onOpenSupport, onOpenAppeals }) => {
  const [tab, setTab] = useState('public');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTab('public');
  }, [open]);

  const fetchPending = async (scope) => {
    setLoading(true);
    setError('');

    const supportScope = scope === 'private' ? 'taken' : 'inbox';
    const appealsScope = scope === 'private' ? 'taken' : 'inbox';

    try {
      const [supportRes, appealsRes] = await Promise.all([
        api.get(`/users/admin/support-tickets?scope=${supportScope}&status=open`),
        api.get(`/users/admin/appeals?scope=${appealsScope}&page=1&limit=100`),
      ]);

      const supportTickets = Array.isArray(supportRes.data?.tickets)
        ? supportRes.data.tickets
        : [];
      const appeals = Array.isArray(appealsRes.data?.appeals)
        ? appealsRes.data.appeals
        : Array.isArray(appealsRes.data)
          ? appealsRes.data
          : [];

      const mappedSupport = supportTickets.map((t) => ({
        kind: 'support',
        id: t._id,
        read: !!t.read,
        updatedAt: t.updatedAt || t.createdAt,
        createdAt: t.createdAt,
        title: t.subject || 'Soporte técnico',
        message:
          Array.isArray(t.conversation) && t.conversation.length
            ? t.conversation[t.conversation.length - 1]?.message
            : t.message,
        username: t.username || t.user?.username,
        subtype: t.subtype,
      }));

      const mappedAppeals = appeals.map((a) => ({
        kind: 'appeal',
        id: a._id,
        read: !!a.read,
        updatedAt: a.createdAt,
        createdAt: a.createdAt,
        title: 'Apelación',
        message:
          Array.isArray(a.conversation) && a.conversation.length
            ? a.conversation[a.conversation.length - 1]?.message
            : a.message,
        username: a.username || a.user?.username,
        status: a.status,
      }));

      setItems([...mappedSupport, ...mappedAppeals]);
    } catch (err) {
      console.error('Error al cargar pendientes de admin:', err);
      setError('No se pudieron cargar los pendientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchPending(tab);
  }, [open, tab]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const sorted = useMemo(() => {
    const copy = Array.isArray(items) ? items.slice() : [];
    copy.sort((a, b) => {
      if (!!a.read === !!b.read) {
        const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bd - ad;
      }
      return a.read ? 1 : -1;
    });
    return copy;
  }, [items]);

  const formatAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
  };

  const handleOpenItem = (item) => {
    if (!item) return;
    if (typeof onClose === 'function') onClose();

    if (item.kind === 'support') {
      if (typeof onOpenSupport === 'function') {
        onOpenSupport(tab === 'private' ? 'taken' : 'inbox', item.id);
      }
      return;
    }

    if (item.kind === 'appeal') {
      if (typeof onOpenAppeals === 'function') {
        onOpenAppeals(tab === 'private' ? 'taken' : 'inbox', item.id);
      }
    }
  };

  const getIcon = (item) => {
    if (item.kind === 'appeal') return <GavelIcon />;
    return <SupportAgentIcon />;
  };

  const getTypeChip = (item) => {
    if (item.kind === 'appeal') {
      const label = (item.status || '').toLowerCase() === 'banned' ? 'Ban' : 'Suspensión';
      return <Chip size="small" label={label} color="warning" variant="outlined" />;
    }

    if (item.subtype === 'payment_validation') {
      return <Chip size="small" label="Pago" color="info" variant="outlined" />;
    }

    return <Chip size="small" label="Soporte" color="secondary" variant="outlined" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InboxIcon />
          <Typography variant="h6" fontWeight={800}>
            Pendientes
          </Typography>
        </Box>
        <Badge color="error" badgeContent={unreadCount} max={99} />
      </DialogTitle>

      <DialogContent dividers>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{ mb: 2 }}
        >
          <Tab icon={<InboxIcon />} iconPosition="start" value="public" label="Pública" />
          <Tab icon={<LockIcon />} iconPosition="start" value="private" label="Privada" />
        </Tabs>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && sorted.length === 0 && (
          <Alert severity="info">No hay pendientes.</Alert>
        )}

        {!loading && !error && sorted.length > 0 && (
          <List disablePadding>
            {sorted.map((item) => (
              <ListItem key={`${item.kind}_${item.id}`} disablePadding divider>
                <ListItemButton
                  onClick={() => handleOpenItem(item)}
                  sx={{
                    opacity: item.read ? 0.72 : 1,
                    alignItems: 'flex-start',
                    py: 1.2,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: item.kind === 'appeal' ? 'warning.main' : 'secondary.main' }}>
                      {getIcon(item)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: item.read ? 600 : 800 }} noWrap>
                            {item.title}
                          </Typography>
                          {getTypeChip(item)}
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {formatAgo(item.updatedAt || item.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.username ? `Usuario: ${item.username}` : 'Usuario'}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: item.read ? 'text.secondary' : 'text.primary',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.message || ''}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminPendingInbox;
