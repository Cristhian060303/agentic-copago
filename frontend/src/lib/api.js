const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchPlans() {
  const r = await fetch(`${API_BASE}/api/plans`);
  if (!r.ok) throw new Error('no se pudieron cargar los planes');
  return r.json();
}

export async function sendMessage(mensaje, plan_id, historial) {
  const r = await fetch(`${API_BASE}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje, plan_id, historial })
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  return r.json();
}
