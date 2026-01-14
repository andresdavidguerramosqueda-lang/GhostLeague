import React from 'react';
import { Box, Button, Typography } from '@mui/material';

const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: { xs: 5, md: 7 },
        px: { xs: 2, md: 3 },
        borderRadius: 3,
        border: '1px dashed rgba(148,163,184,0.35)',
        background: 'rgba(15,23,42,0.55)',
      }}
      role="status"
      aria-live="polite"
    >
      {icon ? (
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center', color: 'secondary.main' }}>
          {icon}
        </Box>
      ) : null}

      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 520, mx: 'auto' }}>
          {description}
        </Typography>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          onClick={onAction}
          variant="contained"
          sx={{ mt: 2, borderRadius: '999px' }}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
};

export default EmptyState;
