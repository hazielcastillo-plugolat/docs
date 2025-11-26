## Cookies & Cream Frontend

SPA construida con Vite + React para consumir la API de FastAPI documentada en `index.mdx`.

### Requisitos

- Node.js 18+
- API levantada con `uvicorn main:app --reload`

### Variables de entorno

Configura la URL base de la API mediante un archivo `.env` (opcional):

```bash
VITE_API_BASE=http://127.0.0.1:8000
```

Si no se define, la aplicación usará `http://127.0.0.1:8000`.

### Desarrollo

```bash
cd front-app
npm install
npm run dev
```

Visita `http://localhost:5173` y crea sabores/pedidos desde la interfaz.

### Build

```bash
npm run build
npm run preview
```

El artefacto listo para producción queda en `front-app/dist`.
