import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `Eres CopagoIA, un asistente médico-administrativo para pacientes en Ecuador.
Tu única tarea es: dado un síntoma o molestia que describe el paciente, identificar la especialidad médica más apropiada para que sea atendido.

Especialidades disponibles (usa EXACTAMENTE estos ids, en minúsculas):
- medicina_general
- cardiologia
- dermatologia
- ginecologia
- pediatria
- traumatologia
- gastroenterologia
- oftalmologia
- endocrinologia
- neurologia
- psiquiatria
- urologia
- neumologia
- oncologia
- reumatologia
- otorrinolaringologia
- psicologia
- nutricion
- medicina_interna

DEBES responder EXCLUSIVAMENTE con un JSON con esta forma exacta:
{
  "necesita_mas_info": boolean,
  "pregunta_clarificadora": string | null,
  "especialidad_sugerida": string | null,
  "confianza": number,
  "urgencia": "baja" | "media" | "alta" | "emergencia",
  "mensaje_usuario": string
}

Reglas:
1. Si el síntoma es vago o falta contexto (edad, duración, intensidad), pon necesita_mas_info=true y haz UNA pregunta corta en pregunta_clarificadora.
2. Si el síntoma indica urgencia vital (dolor torácico intenso, dificultad respiratoria severa, pérdida de consciencia, sangrado abundante, signos de ACV), pon urgencia="emergencia" y en mensaje_usuario recomienda acudir a emergencias INMEDIATAMENTE antes que agendar consulta.
3. confianza es un decimal entre 0 y 1.
4. mensaje_usuario es una respuesta empática y breve (1-3 oraciones) en español, dirigida al paciente. No diagnostiques, no recetes, no des dosis.
5. Si el mensaje no es médico (saludo, broma, off-topic), responde amablemente que solo puedes orientar sobre especialidades médicas y costos. En ese caso especialidad_sugerida=null y necesita_mas_info=false.
6. Si el síntoma claramente corresponde a pediatría (paciente menor de edad mencionado), prefiere pediatria sobre la especialidad adulto equivalente.
7. NUNCA inventes especialidades fuera de la lista.`;

let _client = null;
function client() {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("falta GEMINI_API_KEY en el entorno");
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

export async function classifySymptomFromAudio(
  audioBase64,
  mimeType,
  history = [],
) {
  const model = client().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 512,
    },
  });

  const contents = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    {
      role: "user",
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        {
          text: "El paciente ha enviado una nota de voz describiendo sus síntomas. Analiza el audio y responde con el JSON solicitado.",
        },
      ],
    },
  ];

  const result = await model.generateContent({ contents });
  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("respuesta del LLM no es JSON válido");
  }

  return {
    necesita_mas_info: !!parsed.necesita_mas_info,
    pregunta_clarificadora: parsed.pregunta_clarificadora ?? null,
    especialidad_sugerida: parsed.especialidad_sugerida ?? null,
    confianza: typeof parsed.confianza === "number" ? parsed.confianza : 0,
    urgencia: ["baja", "media", "alta", "emergencia"].includes(parsed.urgencia)
      ? parsed.urgencia
      : "baja",
    mensaje_usuario:
      parsed.mensaje_usuario ?? "Cuéntame un poco más sobre lo que sientes.",
  };
}

export async function classifySymptom(userMessage, history = []) {
  const model = client().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 512,
    },
  });

  const contents = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const result = await model.generateContent({ contents });
  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("respuesta del LLM no es JSON válido");
  }

  return {
    necesita_mas_info: !!parsed.necesita_mas_info,
    pregunta_clarificadora: parsed.pregunta_clarificadora ?? null,
    especialidad_sugerida: parsed.especialidad_sugerida ?? null,
    confianza: typeof parsed.confianza === "number" ? parsed.confianza : 0,
    urgencia: ["baja", "media", "alta", "emergencia"].includes(parsed.urgencia)
      ? parsed.urgencia
      : "baja",
    mensaje_usuario:
      parsed.mensaje_usuario ?? "Cuéntame un poco más sobre lo que sientes.",
  };
}
