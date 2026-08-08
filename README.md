# Tucson — Carta Digital con Asistente IA

Demo de carta digital multi-idioma (ES/EN/RU) para restaurante, con asistente de IA integrado.

## Requisitos

- Node.js >= 18

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Esto arranca Vite (frontend) y el servidor Express (API) simultáneamente.
Abrir `http://localhost:5173`.

## Producción

```bash
npm run build
npm start
```

El servidor Express sirve los archivos estáticos de `dist/` y la API de chat.
Abrir `http://localhost:3001`.

## Chat de IA

Crear un archivo `.env` en la raíz del proyecto (ya existe, solo completar):

```
DEEPSEEK_API_KEY=sk-...
```

La API key se obtiene en [platform.deepseek.com](https://platform.deepseek.com).

**Importante**: la clave se usa SOLO del lado del servidor (Express), nunca se envía
al navegador. El frontend envía los mensajes al endpoint `/api/chat` del servidor,
y este se encarga de llamar a la API de DeepSeek.

## Datos del menú

Editar `data/menu-data.json` para modificar platos, precios, alérgenos e ingredientes.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DEEPSEEK_API_KEY` | API key de DeepSeek (obligatoria para el chat) |
| `PORT` | Puerto del servidor Express (default: 3001) |
