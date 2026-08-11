# La Catedral del Pisco — Carta Digital

Carta digital multi-idioma (ES / EN / PT / RU) para La Catedral del Pisco, cocina
peruana en Av. Corrientes 3126, Buenos Aires.

El comensal escanea un QR en la mesa y abre la carta de su sucursal. Incluye un
asistente que responde consultas sobre alérgenos e ingredientes, y un panel de
administración para gestionar productos, precios y disponibilidad por sucursal.

## Requisitos

- **Node.js 20.19+** (se recomienda 22 LTS)

  `@supabase/supabase-js` ya marca Node 20 como deprecado y lo va a dejar de
  soportar. En Node 20 hoy funciona, pero imprime un aviso al arrancar.

## Instalación

```bash
npm install
```

## Variables de entorno

Crear un `.env` en la raíz:

| Variable | Dónde se usa | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | cliente + servidor | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | cliente | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_KEY` | servidor | Clave de servicio. **Nunca exponer al navegador** |
| `GEMINI_API_KEY` | servidor | Clave de la API de Gemini, para el asistente |
| `PORT` | servidor | Puerto de Express (default: `3002`) |
| `TRUST_PROXY` | servidor | Definir solo si corre detrás de un proxy o CDN |

Las variables con prefijo `VITE_` quedan embebidas en el bundle del navegador —
son públicas por diseño. Las otras **nunca** deben llevar ese prefijo.

## Desarrollo

```bash
npm run dev
```

Levanta Vite y Express en paralelo. Abrir **http://localhost:5173**.

Express corre en el puerto `3002` y sirve solo la API: en desarrollo, entrar
directo a ese puerto devuelve 404 porque `dist/` todavía no existe. Es normal.

## Producción

```bash
npm run build
npm start
```

Express pasa a servir los estáticos de `dist/` además de la API. Abrir
**http://localhost:3002**.

## Tests

```bash
npm test
```

## Datos del menú

La carta vive en **Supabase**, no en archivos. `data/menu-data.json` es solo la
semilla inicial y la fuente para los scripts:

| Script | Qué hace |
|---|---|
| `npm run seed` | Carga `data/menu-data.json` en Supabase |
| `node scripts/reseed-menu.js` | Regenera el menú desde el JSON |
| `node scripts/translate-menu.js` | Traduce el JSON a los cuatro idiomas |

Para cambiar precios o platos del día a día se usa el panel de administración
(`/admin`), no el JSON.

## El asistente

El navegador **nunca** ve la clave de Gemini. El frontend postea a `/api/chat`
en nuestro propio Express, y ese servidor es quien llama al modelo con la clave
guardada del lado del servidor.

El prompt del sistema restringe al asistente a los datos del menú que se le
pasan como contexto: no puede inventar platos, precios ni alérgenos, y ante una
duda deriva al mozo.
