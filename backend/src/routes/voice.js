import { Router } from 'express';
import { z } from 'zod';
import { classifySymptomFromAudio } from '../services/gemini.js';
import { estimate, ESPECIALIDADES_VALIDAS } from '../services/estimator.js';

const router = Router();

const ALLOWED_MIME_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg'];

const voiceSchema = z.object({
  audio: z.string().min(1),
  mime_type: z.string().refine(t => ALLOWED_MIME_TYPES.some(a => t.startsWith(a)), {
    message: 'tipo de audio no soportado'
  }),
  plan_id: z.string().min(1).max(64),
  historial: z
    .array(z.object({ role: z.enum(['user', 'model']), text: z.string().max(2000) }))
    .max(20)
    .optional()
    .default([])
});

router.post('/', async (req, res) => {
  const parsed = voiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'input inválido', detalles: parsed.error.issues });
  }

  const { audio, mime_type, plan_id, historial } = parsed.data;

  try {
    const clasificacion = await classifySymptomFromAudio(audio, mime_type, historial);

    let estimacion = null;
    const esp = clasificacion.especialidad_sugerida;
    if (!clasificacion.necesita_mas_info && esp && ESPECIALIDADES_VALIDAS.has(esp)) {
      try { estimacion = estimate({ specialty: esp, planId: plan_id }); }
      catch (e) { console.error('[estimator]', e.message); }
    }

    res.json({ clasificacion, estimacion });
  } catch (e) {
    console.error('[voice]', e.message);
    res.status(502).json({ error: 'el agente no pudo procesar la nota de voz' });
  }
});

export default router;
