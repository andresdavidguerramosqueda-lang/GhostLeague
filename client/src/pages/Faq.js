import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Grid,
  Button,
  Divider,
} from '@mui/material';

const faqs = [
    {
      question: '¿Cómo me inscribo en un torneo?',
      answer:
        'Debes registrarte pagando la inscripción correspondiente o entrando de forma gratuita si el torneo lo permite y aún quedan cupos disponibles.',
    },
    {
      question: '¿Cuál es el costo de la inscripción y cómo se paga?',
      answer:
        'El precio de la inscripción depende de cada torneo. El pago se realiza vía Pago Móvil, cuyos datos estarán disponibles al seleccionar la opción "Realizar pago".',
    },
    {
      question: '¿Qué juegos están disponibles actualmente?',
      answer:
        'En este momento contamos con torneos de Clash Royale y Brawl Stars. Próximamente ampliaremos la variedad de títulos disponibles.',
    },
    {
      question: '¿Puedo inscribirme en varios torneos a la vez?',
      answer:
        'Sí, puedes participar en múltiples torneos, siempre que las fechas no coincidan. Ghost League no se hace responsable de choques de horarios y no se realizan devoluciones en caso de inscripciones pagas.',
    },
    {
      question: '¿Qué sucede si llego tarde a un torneo?',
      answer:
        'Dado que se trata de un ambiente competitivo, si tardas más de 7 minutos en reportarte serás descalificado automáticamente.',
    },
  ];
const Faq = () => {
  const navigate = useNavigate();

  const handleScrollTo = (index) => {
    const el = document.getElementById(`faq-${index}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const offset = window.pageYOffset || document.documentElement.scrollTop || 0;
      const headerOffset = 90; // altura aproximada del header fijo
      const targetY = rect.top + offset - headerOffset;

      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={9}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
              background:
                'linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,27,75,0.96) 100%)',
              border: '1px solid rgba(148,163,184,0.4)',
              color: '#e5e7eb',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Preguntas Frecuentes
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.9)' }}>
                  Resuelve rápidamente tus dudas más comunes sobre Ghost League y la inscripción a torneos.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate(-1)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Volver
              </Button>
            </Box>

            <Divider sx={{ mb: 2, borderColor: 'rgba(148,163,184,0.4)' }} />

            <List>
              {faqs.map((item, index) => (
                <ListItem
                  key={index}
                  alignItems="flex-start"
                  sx={{ mb: 1.5, px: 0 }}
                  id={`faq-${index}`}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#e5e7eb' }}>
                        {index + 1}. {item.question}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{ color: 'rgba(203,213,225,0.95)', mt: 0.5, whiteSpace: 'pre-line' }}
                      >
                        {item.answer}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 3,
              background: 'rgba(15,23,42,0.97)',
              border: '1px solid rgba(148,163,184,0.4)',
              color: '#e5e7eb',
              position: { md: 'sticky' },
              top: { md: 96 },
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Índice de preguntas
            </Typography>
            <List dense>
              {faqs.map((item, index) => (
                <ListItem
                  key={index}
                  button
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'rgba(148,163,184,0.12)' },
                  }}
                  onClick={() => handleScrollTo(index)}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{ color: 'rgba(226,232,240,0.95)' }}
                      >
                        {index + 1}. {item.question}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Faq;
