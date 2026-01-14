// client/src/pages/NotFound.js
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const NotFound = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 12, textAlign: 'center' }}>
      <ErrorOutlineIcon
        sx={{ fontSize: 80, color: 'error.main', mb: 2 }}
      />
      <Typography variant="h3" component="h1" gutterBottom>
        404 - Página no encontrada
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        Lo sentimos, la página que estás buscando no existe o ha sido movida.
      </Typography>
      <Button
        component={RouterLink}
        to="/"
        variant="contained"
        color="primary"
        sx={{ mt: 3 }}
      >
        Volver al Inicio
      </Button>
    </Container>
  );
};

export default NotFound;
