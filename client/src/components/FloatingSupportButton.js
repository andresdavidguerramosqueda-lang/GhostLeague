import React from 'react';
import { Fab, Tooltip, Zoom } from '@mui/material';
import { SupportAgent as SupportIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const FloatingSupportButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/support');
  };

  return (
    <Tooltip title="Soporte técnico" placement="left">
      <Fab
        color="secondary"
        aria-label="soporte"
        onClick={handleClick}
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
        <SupportIcon />
      </Fab>
    </Tooltip>
  );
};

export default FloatingSupportButton;
