import { Router } from "express";
import { z } from "zod";
import { classifySymptomFromImage } from "../services/gemini.js";
import { estimate, ESPECIALIDADES_VALIDAS } from "../services/estimator.js";

const router = Router();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const imageSchema = z.object({
  image: z.string().min(1),
  mime_type: z
    .string()
    .refine((t) => ALLOWED_MIME_TYPES.some((a) => t.startsWith(a)), {
      message: "tipo de imagen no soportado",
    }),
  mensaje: z.string().max(1000).nullish().default(null),
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
  const parsed = imageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "input inválido", detalles: parsed.error.issues });
  }

  const { image, mime_type, plan_id, historial, lang, mensaje } = parsed.data;

  try {
    const clasificacion = await classifySymptomFromImage(
      image,
      mime_type,
      historial,
      lang,
      mensaje,
    );

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
    console.error("[image]", e.message);
    res.status(502).json({ error: "el agente no pudo procesar la imagen" });
  }
});

export default router;
