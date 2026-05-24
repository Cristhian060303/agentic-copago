import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import agentRouter from "./routes/agent.js";
import plansRouter from "./routes/plans.js";
import voiceRouter from "./routes/voice.js";
import hospitalsRouter from "./routes/hospitals.js";
import imageRouter from "./routes/image.js";

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "4mb" }));

app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "demasiadas solicitudes, espera un momento" },
  }),
);

app.use("/api/agent", agentRouter);
app.use("/api/plans", plansRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/hospitals", hospitalsRouter);
app.use("/api/image", imageRouter);

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err?.message);
  res.status(500).json({ error: "error interno" });
});

app.listen(PORT, () => {
  console.log(`CopagoIA API escuchando en :${PORT}`);
});
