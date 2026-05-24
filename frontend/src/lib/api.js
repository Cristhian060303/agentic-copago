const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function sendVoiceMessage(audio, mime_type, plan_id, historial, lang) {
  const r = await fetch(`${API_BASE}/api/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio, mime_type, plan_id, historial, lang }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export async function fetchPlans() {
  const r = await fetch(`${API_BASE}/api/plans`);
  if (!r.ok) throw new Error("no se pudieron cargar los planes");
  return r.json();
}

export async function sendMessage(mensaje, plan_id, historial, lang) {
  const r = await fetch(`${API_BASE}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje, plan_id, historial, lang }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  return r.json();
}
