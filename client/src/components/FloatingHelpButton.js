import React, { useState } from 'react';
import { Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, List, ListItem, ListItemIcon, ListItemText, Divider, IconButton } from '@mui/material';
import { 
  Help as HelpIcon,
  QuestionAnswer as FaqIcon,
  Gavel as RulesIcon,
  ContactPhone as ContactIcon,
  SupportAgent as SupportIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const FloatingHelpButton = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const helpOptions = [
    {
      icon: <FaqIcon />,
      title: 'Preguntas Frecuentes',
      description: 'Consulta las preguntas y respuestas más comunes',
      action: () => {
        navigate('/faq');
        handleClose();
      }
    },
    {
      icon: <RulesIcon />,
      title: 'Términos y Condiciones',
      description: 'Conoce los términos y condiciones del servicio',
      action: () => {
        navigate('/terms');
        handleClose();
      }
    },
    {
      icon: <ContactIcon />,
      title: 'Servidor de Discord',
      description: 'Únete a nuestra comunidad en Discord',
      action: () => {
        window.open('https://discord.com/invite/fuQFVYp448', '_blank');
        handleClose();
      }
    },
    {
      icon: <SupportIcon />,
      title: 'Soporte Técnico',
      description: 'Reporta un problema o solicita ayuda',
      action: () => {
        navigate('/support');
        handleClose();
      }
    }
  ];

  return (
    <>
      <Tooltip title="Centro de ayuda" placement="left">
        <Fab
          color="secondary"
          aria-label="ayuda"
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <HelpIcon />
        </Fab>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
            Centro de Ayuda
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ¿En qué podemos ayudarte? Selecciona una opción:
          </Typography>
          <List sx={{ p: 0 }}>
            {helpOptions.map((option, index) => (
              <React.Fragment key={index}>
                <ListItem
                  button
                  onClick={option.action}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    '&:hover': {
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      borderColor: 'rgba(168, 85, 247, 0.3)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon sx={{ color: 'primary.main' }}>
                    {option.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={option.title}
                    secondary={option.description}
                    primaryTypographyProps={{ fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                {index < helpOptions.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ pt: 2 }}>
          <Button onClick={handleClose} variant="outlined">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FloatingHelpButton;
