import { Router } from "express";
import { z } from "zod";
import { classifySymptom } from "../services/gemini.js";
import { estimate, ESPECIALIDADES_VALIDAS } from "../services/estimator.js";

const router = Router();

const chatSchema = z.object({
  mensaje: z.string().min(1).max(1000),
  plan_id: z.string().min(1).max(64),
  lang: z.enum(["es", "en"]).optional().default("es"),
  historial: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().max(2000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

router.post("/", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "input inválido", detalles: parsed.error.issues });
  }

  const { mensaje, plan_id, historial, lang } = parsed.data;

  try {
    const clasificacion = await classifySymptom(mensaje, historial, lang);

    let estimacion = null;
    const esp = clasificacion.especialidad_sugerida;
    if (
      !clasificacion.necesita_mas_info &&
      esp &&
      ESPECIALIDADES_VALIDAS.has(esp)
    ) {
      try {
        estimacion = estimate({ specialty: esp, planId: plan_id });
      } catch (e) {
        console.error("[estimator]", e.message);
      }
    }

    res.json({ clasificacion, estimacion });
  } catch (e) {
    console.error("[agent]", e.message);
    res.status(502).json({ error: "el agente no pudo procesar la solicitud" });
  }
});

export default router;
