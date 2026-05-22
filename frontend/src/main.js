import { sendMessage, fetchPlans } from './lib/api.js';

const chatEl = document.getElementById('chat');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const planSelector = document.getElementById('plan-selector');
const voiceBtn = document.getElementById('voice-btn');

const state = {
  history: [],
  planId: null
};

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatEspecialidad(slug) {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function appendBubble(role, text) {
  const div = document.createElement('div');
  const isUser = role === 'user';
  div.className = isUser
    ? 'chat-bubble bg-emerald-600 text-white rounded-2xl p-3 px-4 shadow-sm self-end max-w-md'
    : 'chat-bubble bg-white text-slate-800 rounded-2xl p-3 px-4 shadow-sm border border-slate-200 self-start max-w-md';
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function appendUrgency(urgencia) {
  if (urgencia !== 'emergencia') return;
  const div = document.createElement('div');
  div.className = 'chat-bubble rounded-2xl p-4 bg-red-50 border-2 border-red-300 text-red-900 self-start max-w-md';
  div.innerHTML = `<strong>🚨 URGENTE:</strong> Por la severidad de los síntomas descritos, acude a la sala de emergencias del hospital más cercano AHORA. No esperes a agendar una consulta.`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function appendEstimate(estimacion) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 self-start w-full max-w-2xl';

  const top = estimacion.hospitales[0];
  const peor = estimacion.hospitales[estimacion.hospitales.length - 1];
  const ahorro = peor && top && peor !== top
    ? (peor.desglose.copago - top.desglose.copago).toFixed(2)
    : 0;

  const rows = estimacion.hospitales.map((h, i) => `
    <tr class="border-b border-slate-100 ${i === 0 ? 'bg-emerald-50/40' : ''}">
      <td class="py-3 pr-2">
        <div class="font-medium text-slate-800">${escapeHtml(h.nombre)}</div>
        <div class="text-xs text-slate-500 mt-0.5">
          ${escapeHtml(h.ciudad)} · ⭐ ${h.rating}
          ${h.en_red
            ? ' · <span class="text-emerald-700 font-medium">En red</span>'
            : ' · <span class="text-orange-600 font-medium">Fuera de red</span>'}
        </div>
      </td>
      <td class="text-right text-slate-700 text-sm">$${h.desglose.precio_base}</td>
      <td class="text-right text-slate-600 text-sm">${h.desglose.cobertura_pct}%</td>
      <td class="text-right font-bold text-slate-900">$${h.desglose.copago}</td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <div class="mb-3">
      <p class="text-xs uppercase tracking-wide text-slate-500">Especialidad sugerida</p>
      <h3 class="text-lg font-bold text-slate-900">${escapeHtml(formatEspecialidad(estimacion.especialidad))}</h3>
      <p class="text-xs text-slate-600 mt-1">Tu plan: <strong>${escapeHtml(estimacion.plan.nombre)}</strong></p>
    </div>

    ${top ? `
      <div class="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p class="text-xs font-medium text-emerald-800">💡 Opción más económica</p>
        <p class="font-bold text-emerald-900">${escapeHtml(top.nombre)} — pagas $${top.desglose.copago}</p>
        ${ahorro > 0 ? `<p class="text-xs text-emerald-700 mt-1">Ahorras hasta $${ahorro} frente a la opción más cara.</p>` : ''}
      </div>
    ` : `
      <p class="text-sm text-slate-600">Ningún hospital de la red ofrece esta especialidad. Contacta a tu aseguradora.</p>
    `}

    ${rows ? `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-slate-500 border-b border-slate-200">
            <tr>
              <th class="text-left py-2 pr-2 font-medium">Hospital</th>
              <th class="text-right font-medium">Precio</th>
              <th class="text-right font-medium">Cobertura</th>
              <th class="text-right font-medium">Tu copago</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    ` : ''}

    <p class="text-xs text-slate-500 mt-4 italic leading-relaxed">${escapeHtml(estimacion.disclaimer)}</p>
  `;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function loadPlans() {
  try {
    const plans = await fetchPlans();
    if (!plans.length) throw new Error('sin planes');
    planSelector.innerHTML = plans
      .map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} · $${p.prima_mensual}/mes</option>`)
      .join('');
    state.planId = plans[0].id;
    planSelector.addEventListener('change', e => {
      state.planId = e.target.value;
    });
  } catch (e) {
    planSelector.innerHTML = '<option>Sin conexión al servidor</option>';
    console.error(e);
  }
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = inputEl.value.trim();
  if (!msg || !state.planId) return;

  appendBubble('user', msg);
  state.history.push({ role: 'user', text: msg });
  inputEl.value = '';
  inputEl.disabled = true;
  sendBtn.disabled = true;

  const loading = document.createElement('div');
  loading.className = 'text-sm text-slate-400 self-start animate-pulse italic';
  loading.textContent = 'CopagoIA está pensando…';
  chatEl.appendChild(loading);
  chatEl.scrollTop = chatEl.scrollHeight;

  try {
    const data = await sendMessage(msg, state.planId, state.history.slice(0, -1));
    loading.remove();

    const { clasificacion, estimacion } = data;
    appendBubble('agent', clasificacion.mensaje_usuario);
    state.history.push({ role: 'model', text: clasificacion.mensaje_usuario });

    appendUrgency(clasificacion.urgencia);

    if (estimacion) appendEstimate(estimacion);
  } catch (err) {
    loading.remove();
    appendBubble('agent', 'Tuve un problema procesando tu mensaje. Intenta de nuevo.');
    console.error(err);
  } finally {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
});

// Web Speech API
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const recognition = new SR();
  recognition.lang = 'es-EC';
  recognition.interimResults = false;
  recognition.continuous = false;

  voiceBtn.addEventListener('click', () => {
    try {
      recognition.start();
      voiceBtn.classList.add('animate-pulse', 'bg-red-100');
    } catch { /* ya está escuchando */ }
  });
  recognition.onresult = (e) => {
    inputEl.value = e.results[0][0].transcript;
    inputEl.focus();
  };
  recognition.onend = () => voiceBtn.classList.remove('animate-pulse', 'bg-red-100');
  recognition.onerror = () => voiceBtn.classList.remove('animate-pulse', 'bg-red-100');
} else {
  voiceBtn.style.display = 'none';
}

loadPlans();
