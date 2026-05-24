import { GoogleGenerativeAI } from "@google/generative-ai";

const BASE_PROMPT = `Eres CopagoIA, un asistente conversacional médico-administrativo en Ecuador.
Tu tarea es orientar al paciente hacia la especialidad médica adecuada según sus síntomas para luego calcular su cobertura y copago. NO diagnosticas, NO recetas y NO recomiendas tratamientos.
Puedes recibir imágenes (fotos de síntomas visibles, recetas, resultados de laboratorio, radiografías) y notas de voz. Cuando recibas una imagen, analiza su contenido para identificar la especialidad más adecuada.

<reglas_principales>
1. Evalúa emergencias: Si hay signos críticos (dolor de pecho fuerte, dificultad respiratoria, pérdida de consciencia, sangrado grave, trauma severo, ideación suicida, signos de ACV), asigna urgencia="emergencia" e identifica igualmente la especialidad_sugerida más relevante. No hagas preguntas y en mensaje_usuario recomienda ir a urgencias INMEDIATAMENTE.
2. Identifica la especialidad: Usa EXCLUSIVAMENTE los IDs permitidos. Si el caso es inespecífico, usa "medicina_general". Si se menciona explícitamente a un menor de edad, prioriza "pediatria".
3. Manejo de ambigüedad: Si falta información CRÍTICA para decidir (ej. edad, duración, ubicación exacta del dolor), establece necesita_mas_info=true y haz UNA ÚNICA pregunta breve en "pregunta_clarificadora".
4. Mensajes no médicos: Si el input es un saludo, broma o fuera de tema, especialidad_sugerida=null, necesita_mas_info=false, urgencia="baja", y responde en "mensaje_usuario" indicando tus funciones.
5. Tono: "mensaje_usuario" debe estar en {{LANG}}, ser empático, breve (máximo 3 oraciones) y estar dirigido al paciente de forma clara.
</reglas_principales>

<especialidades_permitidas>
medicina_general, cardiologia, dermatologia, ginecologia, pediatria, traumatologia, gastroenterologia, oftalmologia, endocrinologia, neurologia, psiquiatria, urologia, neumologia, oncologia, reumatologia, otorrinolaringologia, psicologia, nutricion, medicina_interna
</especialidades_permitidas>

<formato_respuesta>
Debes responder ÚNICAMENTE con un objeto JSON válido que siga esta estructura exacta. NO devuelvas texto fuera del JSON. NO uses formato markdown (como \`\`\`json).
{
  "necesita_mas_info": boolean,
  "pregunta_clarificadora": string | null,
  "especialidad_sugerida": string | null,
  "confianza": number, /* decimal entre 0 y 1 */
  "urgencia": "baja" | "media" | "alta" | "emergencia",
  "mensaje_usuario": string
}
</formato_respuesta>

<ejemplos>
Usuario: "Me duele mucho el pecho y me falta el aire desde hace una hora."
{"necesita_mas_info": false, "pregunta_clarificadora": null, "especialidad_sugerida": "cardiologia", "confianza": 0.99, "urgencia": "emergencia", "mensaje_usuario": "Por favor, acude inmediatamente a la sala de emergencias más cercana o llama al 911. Tus síntomas requieren atención médica urgente."}

Usuario: "Mi hijo tiene ronchas rojas en la piel."
{"necesita_mas_info": true, "pregunta_clarificadora": "¿Qué edad tiene tu hijo y desde cuándo aparecieron las ronchas?", "especialidad_sugerida": "pediatria", "confianza": 0.85, "urgencia": "baja", "mensaje_usuario": "Entiendo, las afecciones en la piel de los niños deben revisarse con cuidado. Para poder derivarte correctamente, ¿podrías decirme la edad de tu hijo y hace cuánto tiempo tiene las ronchas?"}

Usuario: "Hola, buenas tardes."
{"necesita_mas_info": false, "pregunta_clarificadora": null, "especialidad_sugerida": null, "confianza": 1.0, "urgencia": "baja", "mensaje_usuario": "¡Hola, buenas tardes! Soy CopagoIA. Estoy aquí para orientarte sobre la especialidad médica adecuada para tus síntomas y ayudarte a estimar los costos con tu seguro. ¿En qué te puedo ayudar hoy?"}
</ejemplos>
`;

function buildSystemPrompt(lang = "es") {
  const langLabel = lang === "en" ? "English" : "Spanish (español)";
  return BASE_PROMPT.replace("{{LANG}}", langLabel);
}

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
  lang = "es",
) {
  const model = client().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    systemInstruction: buildSystemPrompt(lang),
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

export async function classifySymptomFromImage(
  imageBase64,
  mimeType,
  history = [],
  lang = "es",
  userText = null,
) {
  const model = client().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    systemInstruction: buildSystemPrompt(lang),
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 512,
    },
  });

  const promptText = userText
    ? `El paciente ha enviado una imagen junto con este mensaje: "${userText}". Analiza la imagen y el texto, y responde con el JSON solicitado.`
    : "El paciente ha enviado una imagen de sus síntomas. Analiza la imagen y responde con el JSON solicitado.";

  const contents = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    {
      role: "user",
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: promptText },
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

export async function classifySymptom(userMessage, history = [], lang = "es") {
  const model = client().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    systemInstruction: buildSystemPrompt(lang),
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
