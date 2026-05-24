import { Router } from "express";
import { loadPlans } from "../services/estimator.js";

const router = Router();

router.get("/", (_req, res) => {
  const plans = loadPlans();
  res.json(
    plans.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      aseguradora: p.aseguradora,
      tier: p.tier,
      prima_mensual: p.prima_mensual,
      deducible_anual: p.deducible_anual,
    })),
  );
});

export default router;
