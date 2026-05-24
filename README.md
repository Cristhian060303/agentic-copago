# CopagoIA · Estimador agéntico de copago en tiempo real

> Reto 3 · hackIAthon Viamatica 2026

Agente conversacional que ayuda al paciente a entender **cuánto pagará** y **a qué hospital de la red le conviene ir** antes de atenderse. El paciente describe su síntoma en lenguaje natural; el agente identifica la especialidad médica, cruza con su plan de seguro y devuelve un estimado de copago con desglose por hospital.

## Demo

- **App pública:** _por publicar_
- **Repositorio:** este mismo

## ¿Qué resuelve?

Hoy un paciente tarda horas en llamar al call center del seguro para saber qué especialista necesita, qué hospitales acepta su plan y cuánto pagará de su bolsillo. CopagoIA responde eso en **menos de 10 segundos**, con desglose transparente.

## Diferenciadores

1. **Salida estructurada del LLM** — Gemini devuelve JSON tipado, no texto suelto.
2. **Desglose visible** — el paciente ve `precio base − cobertura = copago` por cada hospital.
3. **Detección de urgencia** — si el síntoma es grave, el agente recomienda emergencias antes que consulta.
4. **Disclaimer médico** — visible siempre, no reemplaza consulta médica ni autorización formal.
5. **Notas de voz** — el paciente graba un audio; Gemini lo transcribe y procesa directamente, sin depender de servicios externos de reconocimiento de voz.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express |
| LLM | Gemini Flash Lite (JSON mode, configurable vía `GEMINI_MODEL`) |
| Frontend | Vite + Vanilla JS + Tailwind (CDN) |
| Datos | JSON estático (planes, hospitales, especialidades) |
| Despliegue | Railway (back) + Vercel (front) |

## Cómo correr en local

### Requisitos
- Node 20+
- Una API key de Gemini ([obtener gratis](https://aistudio.google.com/app/apikey))

### Backend

```bash
cd backend
cp .env.example .env
# edita .env y pega tu GEMINI_API_KEY
# (opcional) GEMINI_MODEL=gemini-flash-lite-latest  — default si se omite
npm install
npm run dev
```

API disponible en `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponible en `http://localhost:5173`.

## Endpoints

- `GET  /api/plans` — lista de planes de seguro disponibles
- `POST /api/agent` — envía un mensaje al agente
  - Body: `{ mensaje, plan_id, historial }`
  - Retorna: `{ clasificacion, estimacion }`
- `POST /api/voice` — envía una nota de voz al agente
  - Body: `{ audio (base64), mime_type, plan_id, historial }`
  - Retorna: `{ clasificacion, estimacion }`
- `GET  /health` — healthcheck

## Consideraciones de seguridad

- API keys solo en variables de entorno, nunca en el código.
- Rate limiting (20 req/min por IP).
- Validación de inputs con Zod en el backend.
- CORS restringido al dominio del frontend en producción.
- No se persiste información médica personal — la conversación vive solo en memoria del navegador.
- Disclaimer médico y legal visible en todas las pantallas.

## Equipo

- Gabriel Tumbaco
- Diego Parrales
- Cristhian Bastidas

## Licencia

Proyecto académico para hackIAthon Viamatica 2026.
