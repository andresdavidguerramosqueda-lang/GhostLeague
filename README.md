# Ghost League

Ghost League es una plataforma web para gestionar torneos competitivos de videojuegos: crea torneos, registra jugadores, administra brackets/partidas y centraliza el ranking de la comunidad en un solo lugar.

La idea del proyecto es resolver un problema muy común en comunidades competitivas: la organización se termina llevando en chats, hojas de cálculo y capturas. Ghost League lo convierte en un flujo claro y trazable dentro de una aplicación web.

- **Demo (Frontend / Render):** https://ghostleague.onrender.com/
- **API (Backend / Render):** `https://<tu-backend>.onrender.com/api`

> Nota: el frontend y el backend están desplegados en **Render**.

---

## Características principales

- **Autenticación (JWT)**
  - Registro e inicio de sesión.
  - Sesión persistente mediante token.
  - Protección de rutas privadas.

- **Perfil de jugador**
  - Edición de datos básicos (usuario, país, juego favorito, bio, redes).
  - Personalización visual con **avatar** y **banner**.

- **Torneos**
  - Creación y gestión de torneos.
  - Página de detalle de torneo con navegación por secciones.
  - Participación/gestión de jugadores según reglas del torneo.

- **Ranking / Leaderboard**
  - Ranking global de jugadores.
  - UI optimizada para móvil (tabla adaptable sin perder información clave).

- **Panel y utilidades de administración**
  - Endpoints protegidos por rol (admin/owner) donde aplica.
  - Endurecimiento básico: CORS controlado, rate limiting, cabeceras con Helmet.

---

## Stack (real)

### Frontend

- **React 18** (Create React App / `react-scripts`)
- **React Router v6**
- **Material UI (MUI v5)** + Emotion
- **Axios**

### Backend

- **Node.js + Express**
- **MongoDB Atlas** + **Mongoose**
- **JWT** (`jsonwebtoken`) + **bcrypt**
- **Multer** para cargas de archivos (avatar/banner)
- **Helmet**, **compression** y **express-rate-limit**

### Deploy

- **Render**
  - **Static Site** para el frontend.
  - **Web Service** para el backend.

---

## Flujo general (cómo funciona)

### Autenticación

1. El usuario se registra/inicia sesión.
2. El backend entrega un **JWT**.
3. El frontend guarda el token y lo envía en cada request como `Authorization: Bearer <token>`.
4. El backend valida el token en middleware y habilita las rutas privadas.

### Perfil y personalización

- El perfil se actualiza vía endpoints privados.
- La subida de **avatar/banner** se realiza con `multipart/form-data`.
- El backend guarda la referencia del archivo en el usuario y el frontend la consume para renderizarla.

### Torneos y jugadores

- La app expone vistas de torneos (listado y detalle) y acciones sobre los mismos.
- La experiencia está pensada para admins/organizadores y jugadores finales.

---

## Estructura del proyecto

```txt
Liga Dorada/
  client/               # Frontend (React + MUI)
    public/
    src/
      context/
      pages/
      services/
  server/               # Backend (Node + Express)
    index.js
    middleware/
    models/
    routes/
    services/
    utils/
```

---

## Instalación y ejecución (local)

### Requisitos

- Node.js (recomendado: 18+)
- Cuenta/cluster en MongoDB Atlas

### 1) Backend

```bash
npm install
npm run dev
```

El backend levanta por defecto en `http://localhost:5000`.

### 2) Frontend

```bash
npm install
npm start
```

El frontend levanta por defecto en `http://localhost:3000`.

---

## Variables de entorno

### Backend (`server/.env`)

```bash
NODE_ENV=development
PORT=5000

# Base de datos
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>

# Auth
JWT_SECRET=<tu_secreto_largo>

# CORS (orígenes permitidos, separados por coma)
FRONTEND_URLS=http://localhost:3000,https://ghostleague.onrender.com

# Flags
EMAIL_DISABLED=true
```

> `MONGO_URI` puede aparecer como `MONGODB_URI` según tu configuración. Usa el nombre que esté leyendo tu backend.

### Frontend (`client/.env`)

```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_EMAIL_DISABLED=true
```

---

## Roadmap

- **Tests** (unitarios y de integración) para flujos críticos (auth, torneos, perfil).
- **Observabilidad**: healthchecks, logs estructurados y métricas básicas.
- **Mejoras de UX**: estados vacíos, skeletons, manejo de errores consistente.
- **Optimización de rendimiento**: caching, paginación en listados, reducción de payload.

---

## Aprendizajes y experiencia adquirida

- Diseño de un flujo completo **MERN** con autenticación basada en JWT.
- Construcción de UI con **Material UI** cuidando responsive real (móvil primero).
- Integración de middleware de seguridad y control de tráfico (**Helmet / rate limit / CORS**).
- Despliegue end-to-end en **Render** (frontend estático + API) y resolución de problemas reales de producción (configuración, dominios, CORS, límites de plataforma).

---

## Contacto

Si quieres que te comparta credenciales demo o una guía rápida del flujo como organizador/jugador, escríbeme y lo preparo.
