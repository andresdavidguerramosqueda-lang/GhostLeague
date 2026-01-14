// client/src/components/layout/Footer.js
import React from 'react';
import { Box, Container, Grid, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              GHOST LEAGUE
            </Typography>
            <Typography variant="body2" color="text.secondary">
              La plataforma líder en organización de torneos de videojuegos. Conectamos jugadores y creamos experiencias competitivas inolvidables.
            </Typography>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              Enlaces Rápidos
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              <li><Link component={RouterLink} to="/tournaments" color="text.secondary" underline="hover">Torneos</Link></li>
              {/* <li><Link component={RouterLink} to="/rules" color="text.secondary" underline="hover">Reglas</Link></li> */}
              <li><Link component={RouterLink} to="/contact" color="text.secondary" underline="hover">Contacto</Link></li>
            </Box>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              Soporte
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              <li><Link component={RouterLink} to="/faq" color="text.secondary" underline="hover">Preguntas Frecuentes</Link></li>
              <li><Link component={RouterLink} to="/support" color="text.secondary" underline="hover">Soporte Técnico</Link></li>
              <li><Link component={RouterLink} to="/terms" color="text.secondary" underline="hover">Términos y Condiciones</Link></li>
              <li><Link component={RouterLink} to="/privacy" color="text.secondary" underline="hover">Política de Privacidad</Link></li>
            </Box>
          </Grid>
        </Grid>
        <Box mt={5}>
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Ghost League. Todos los derechos reservados.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
