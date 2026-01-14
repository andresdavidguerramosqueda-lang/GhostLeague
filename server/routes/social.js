const express = require('express');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const router = express.Router();

function checkUrlExists(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const lib = parsed.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          method: 'HEAD',
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          timeout: 5000,
        },
        (res) => {
          const { statusCode } = res;
          if (statusCode && statusCode >= 200 && statusCode < 400) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

// POST /api/social/validate
// Body: { url: string, network?: string }
// Respuestas:
//  - 200 { valid: true }
//  - 400 { valid: false, message: 'El enlace no es una URL válida' }
//  - 404 { valid: false, message: 'Este perfil no se ha encontrado' }
router.post('/validate', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ valid: false, message: 'Debe proporcionar un enlace' });
  }

  let normalizedUrl = url.trim();

  try {
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Validación sintáctica de URL
    // eslint-disable-next-line no-new
    new URL(normalizedUrl);
  } catch (e) {
    return res.status(400).json({ valid: false, message: 'El enlace no es una URL válida' });
  }

  try {
    const exists = await checkUrlExists(normalizedUrl);
    if (!exists) {
      return res.status(404).json({ valid: false, message: 'Este perfil no se ha encontrado' });
    }

    return res.json({ valid: true });
  } catch (err) {
    console.error('Error validando enlace de red social:', err);
    return res.status(500).json({ valid: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
