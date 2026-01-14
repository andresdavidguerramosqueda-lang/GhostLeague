import React from 'react';
import { Container, Typography, Box, Paper, List, ListItem } from '@mui/material';

function Privacy() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h3" gutterBottom sx={{ color: '#a855f7', fontWeight: 'bold' }}>
          Política de Privacidad
        </Typography>
        <Typography variant="body1" paragraph sx={{ color: '#e5e7eb' }}>
          Esta política describe cómo recopilamos, utilizamos y protegemos tus datos personales en Ghost League.
        </Typography>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          1. Responsable del tratamiento de datos
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          El responsable de la recopilación y tratamiento de los datos personales es el administrador de la plataforma. Los usuarios podrán comunicarse a través del sistema de soporte técnico disponible en la página o mediante el servidor oficial de Discord.
        </Typography>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          2. Datos que se recopilan
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          La plataforma recopila los siguientes datos:
        </Typography>
        <List sx={{ color: '#9ca3af', pl: 3 }}>
          <ListItem sx={{ p: 0, mb: 1 }}>• Correo electrónico (obligatorio)</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• País de residencia (obligatorio)</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• Redes sociales opcionales: TikTok, Discord, Instagram, X, Twitch y YouTube</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• Nombre de usuario dentro de la plataforma</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• Estadísticas de participación en torneos y actividad dentro de la comunidad</ListItem>
        </List>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          3. Finalidad del uso de datos
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          Los datos se utilizan para:
        </Typography>
        <List sx={{ color: '#9ca3af', pl: 3 }}>
          <ListItem sx={{ p: 0, mb: 1 }}>• Crear y mantener cuentas de usuario</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• Permitir la participación en torneos y actividades de la comunidad</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• Facilitar la comunicación entre usuarios y soporte técnico</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• Mejorar la experiencia dentro de la plataforma</ListItem>
        </List>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          4. Compartición de datos con terceros
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          Los datos recopilados no se venden ni se ceden a terceros. Solo se utilizan dentro de la plataforma para fines internos.
        </Typography>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          5. Almacenamiento y seguridad
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          Los datos se almacenan en bases de datos seguras con acceso restringido.
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          La plataforma aplica medidas técnicas para proteger la información contra accesos no autorizados.
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          No se garantiza protección absoluta frente a ataques externos, pero se toman medidas razonables para minimizar riesgos.
        </Typography>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          6. Derechos de los usuarios
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          Los usuarios tienen derecho a:
        </Typography>
        <List sx={{ color: '#9ca3af', pl: 3 }}>
          <ListItem sx={{ p: 0, mb: 1 }}>• Solicitar la eliminación de sus datos personales</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• Cancelar su cuenta en cualquier momento</ListItem>
          <ListItem sx={{ p: 0, mb: 1 }}>• Rectificar información incorrecta</ListItem>
        </List>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          Las solicitudes deben hacerse mediante el soporte técnico de la página o el servidor oficial de Discord.
        </Typography>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          7. Cookies y tecnologías similares
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          Actualmente la plataforma no utiliza cookies. En caso de implementarlas en el futuro, se notificará a los usuarios mediante un aviso en el footer.
        </Typography>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          8. Edad mínima de uso
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          El registro está permitido únicamente a usuarios mayores de 13 años, dado que la plataforma maneja pagos de inscripción en torneos.
        </Typography>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          9. Modificaciones de la política
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          El administrador se reserva el derecho de modificar esta política en cualquier momento. Las modificaciones serán notificadas mediante un aviso en el footer de la página.
        </Typography>
        
        <Typography variant="h6" sx={{ color: '#a855f7', mt: 3, mb: 2 }}>
          10. Legislación aplicable
        </Typography>
        <Typography variant="body2" paragraph sx={{ color: '#9ca3af' }}>
          Esta política se rige por las leyes de la República Bolivariana de Venezuela. Cualquier conflicto será resuelto en los tribunales competentes de Venezuela.
        </Typography>
      </Paper>
    </Container>
  );
}

export default Privacy;
