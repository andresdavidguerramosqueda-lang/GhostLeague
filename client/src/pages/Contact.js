import React from 'react';
import { Container, Typography, Box, Paper, Button } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';

function Contact() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h3" gutterBottom sx={{ color: '#a855f7', fontWeight: 'bold' }}>
          Contacto
        </Typography>
        <Typography variant="body1" paragraph sx={{ color: '#e5e7eb' }}>
          ¿Necesitas ayuda? Únete a nuestro servidor de Discord para obtener soporte rápido.
        </Typography>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#9ca3af', mb: 2 }}>
            Únete a nuestra comunidad en Discord
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => window.open('https://discord.com/invite/fuQFVYp448', '_blank')}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: '50px',
              textTransform: 'none',
              background: 'linear-gradient(135deg, #5865F2 0%, #7289DA 100%)',
              boxShadow: '0 4px 20px rgba(88, 101, 242, 0.5)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4752C4 0%, #5865F2 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(88, 101, 242, 0.7)',
              },
              transition: 'all 0.3s ease',
            }}
            startIcon={<ChatIcon />}
          >
            Unirse al Servidor de Discord
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default Contact;
