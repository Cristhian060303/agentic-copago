import { sendMessage, fetchPlans } from './lib/api.js';

const chatEl = document.getElementById('chat');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const planToggle = document.getElementById('plan-toggle');
const planLabel = document.getElementById('plan-label');
const planMenu = document.getElementById('plan-menu');
const planWrapper = document.getElementById('plan-dropdown-wrapper');

const state = { history: [], planId: null };

const C = {
  midnight: '#0e0e52',
  indigo:   '#150578',
  royal:    '#3943b7',
  cerulean: '#449dd1',
  sky:      '#78c0e0',
};

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function formatEspecialidad(slug) {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function botAvatarHtml() {
  return `
    <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
         style="background:${C.midnight}; box-shadow: 0 0 0 2px ${C.cerulean};">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
           style="color:${C.sky}">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
      </svg>
    </div>`;
}

function appendBubble(role, text) {
  const wrap = document.createElement('div');
  if (role === 'user') {
    wrap.className = 'chat-bubble flex justify-end';
    wrap.innerHTML = `
      <div class="text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-xs sm:max-w-sm text-sm leading-relaxed"
           style="background:${C.royal}">
        ${escapeHtml(text)}
      </div>`;
  } else {
    wrap.className = 'chat-bubble flex gap-2.5 self-start max-w-xs sm:max-w-sm md:max-w-md';
    wrap.innerHTML = `
      ${botAvatarHtml()}
      <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200 text-slate-800 text-sm leading-relaxed">
        ${escapeHtml(text)}
      </div>`;
  }
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function appendLoading() {
  const wrap = document.createElement('div');
  wrap.id = 'loading-indicator';
  wrap.className = 'chat-bubble flex gap-2.5 self-start';
  wrap.innerHTML = `
    ${botAvatarHtml()}
    <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200">
      <div class="loader-dots"><span></span><span></span><span></span></div>
    </div>`;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function removeLoading() {
  document.getElementById('loading-indicator')?.remove();
}

function appendUrgency(urgencia) {
  if (urgencia !== 'emergencia') return;
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble flex gap-2.5 self-start max-w-xs sm:max-w-sm md:max-w-md';
  wrap.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
      <span class="text-white text-sm font-extrabold">!</span>
    </div>
    <div class="bg-red-50 border-2 border-red-300 rounded-2xl rounded-tl-sm px-4 py-3 text-red-900 text-sm leading-relaxed">
      <strong class="flex items-center gap-1.5 mb-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        URGENTE
      </strong>
      La severidad de los síntomas requiere atención inmediata. Acude a la sala de emergencias del hospital más cercano <strong>ahora mismo</strong>.
    </div>`;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function appendEstimate(estimacion) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble w-full max-w-2xl self-start';

  const top = estimacion.hospitales[0];
  const peor = estimacion.hospitales[estimacion.hospitales.length - 1];
  const ahorro = peor && top && peor !== top
    ? (peor.desglose.copago - top.desglose.copago).toFixed(2)
    : 0;

  const rows = estimacion.hospitales.map((h, i) => `
    <tr class="border-b border-slate-100" style="${i === 0 ? `background:${C.sky}18` : ''}">
      <td class="py-3 pl-2 pr-3">
        <div class="font-semibold text-slate-800 text-sm">${escapeHtml(h.nombre)}</div>
        <div class="flex flex-wrap gap-x-2 mt-0.5">
          <span class="text-xs text-slate-500">${escapeHtml(h.ciudad)}</span>
          <span class="text-xs text-yellow-500 flex items-center gap-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${h.rating}
          </span>
          ${h.en_red
            ? `<span class="text-xs font-semibold" style="color:${C.royal}">✓ En red</span>`
            : `<span class="text-xs text-orange-600 font-medium">Fuera de red</span>`}
        </div>
      </td>
      <td class="text-right text-slate-600 text-sm col-hide-xs">$${h.desglose.precio_base}</td>
      <td class="text-right text-slate-600 text-sm col-hide-xs">${h.desglose.cobertura_pct}%</td>
      <td class="text-right pr-2 font-bold text-sm whitespace-nowrap" style="color:${C.midnight}">
        $${h.desglose.copago}
      </td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      <!-- Cabecera de la card -->
      <div class="px-4 sm:px-5 py-3 flex items-center justify-between"
           style="background: linear-gradient(135deg, ${C.midnight} 0%, ${C.indigo} 60%, ${C.royal} 100%)">
        <div>
          <p class="text-xs uppercase tracking-wide font-medium" style="color:${C.sky}">Especialidad sugerida</p>
          <h3 class="text-white font-bold text-base sm:text-lg">${escapeHtml(formatEspecialidad(estimacion.especialidad))}</h3>
        </div>
        <div class="text-right">
          <p class="text-xs" style="color:${C.sky}">Tu plan</p>
          <p class="text-white text-xs sm:text-sm font-semibold leading-tight max-w-[120px] sm:max-w-none">
            ${escapeHtml(estimacion.plan.nombre)}
          </p>
        </div>
      </div>

      <div class="p-4 sm:p-5">

        <!-- Mejor opción destacada -->
        ${top ? `
          <div class="mb-4 p-3 sm:p-4 rounded-xl border flex items-start gap-3"
               style="background:${C.sky}18; border-color:${C.cerulean}50">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                 style="background:${C.royal}">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wide" style="color:${C.indigo}">Opción más económica</p>
              <p class="font-bold text-sm sm:text-base" style="color:${C.midnight}">${escapeHtml(top.nombre)}</p>
              <p class="text-sm" style="color:${C.indigo}">
                Pagas solo <strong>$${top.desglose.copago}</strong>
                ${ahorro > 0 ? ` · ahorras <strong>$${ahorro}</strong> vs. la más cara` : ''}
              </p>
            </div>
          </div>
        ` : `
          <div class="mb-4 p-3 bg-slate-100 rounded-xl text-sm text-slate-600">
            Ningún hospital de la red atiende esta especialidad. Contacta a tu aseguradora.
          </div>
        `}

        <!-- Tabla comparativa -->
        ${rows ? `
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full text-sm border-collapse min-w-[260px] estimate-table">
              <thead>
                <tr class="border-b-2" style="border-color:${C.sky}">
                  <th class="text-left pb-2 pl-2 text-xs font-bold uppercase tracking-wide" style="color:${C.midnight}">Hospital</th>
                  <th class="text-right pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 col-hide-xs">Precio</th>
                  <th class="text-right pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 col-hide-xs">Cobertura</th>
                  <th class="text-right pb-2 pr-2 text-xs font-bold uppercase tracking-wide" style="color:${C.royal}">Tu copago</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <p class="text-xs text-slate-400 mt-1 text-center sm:hidden">← desliza para ver más →</p>
        ` : ''}

        <!-- Disclaimer -->
        <p class="text-xs text-slate-500 mt-4 italic leading-relaxed border-t border-slate-100 pt-3">
          ${escapeHtml(estimacion.disclaimer)}
        </p>
      </div>
    </div>`;

  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function closeMenu() {
  planMenu.classList.remove('open');
  planToggle.classList.remove('open');
  planMenu.setAttribute('aria-hidden', 'true');
}

function openMenu() {
  planMenu.classList.add('open');
  planToggle.classList.add('open');
  planMenu.setAttribute('aria-hidden', 'false');
}

async function loadPlans() {
  try {
    const plans = await fetchPlans();
    if (!plans.length) throw new Error('no plans');

    planMenu.innerHTML = plans.map((p, i) => `
      <li class="plan-option${i === 0 ? ' selected' : ''}" data-value="${escapeHtml(p.id)}" role="option">
        ${escapeHtml(p.nombre)}
      </li>`).join('');

    state.planId = plans[0].id;

    // On desktop only: lock button width to widest option to prevent resize on selection
    const widest = plans.reduce((a, b) => a.nombre.length >= b.nombre.length ? a : b);
    planLabel.textContent = widest.nombre;
    requestAnimationFrame(() => {
      if (window.innerWidth >= 640) {
        planToggle.style.minWidth = planToggle.offsetWidth + 'px';
      }
      planLabel.textContent = plans[0].nombre;
    });

    planToggle.addEventListener('click', () => {
      planMenu.classList.contains('open') ? closeMenu() : openMenu();
    });

    planMenu.addEventListener('click', (e) => {
      const opt = e.target.closest('.plan-option');
      if (!opt) return;
      state.planId = opt.dataset.value;
      planLabel.textContent = opt.textContent.trim();
      planMenu.querySelectorAll('.plan-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!planWrapper.contains(e.target)) closeMenu();
    });
  } catch (e) {
    planLabel.textContent = 'Sin conexión';
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
  appendLoading();

  try {
    const data = await sendMessage(msg, state.planId, state.history.slice(0, -1));
    removeLoading();

    const { clasificacion, estimacion } = data;
    appendBubble('agent', clasificacion.mensaje_usuario);
    state.history.push({ role: 'model', text: clasificacion.mensaje_usuario });

    appendUrgency(clasificacion.urgencia);
    if (estimacion) appendEstimate(estimacion);
  } catch {
    removeLoading();
    appendBubble('agent', 'Tuve un problema procesando tu mensaje. Intenta de nuevo en unos segundos.');
  } finally {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
});

// Web Speech API
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const rec = new SR();
  rec.lang = 'es-EC';
  rec.interimResults = false;
  rec.continuous = false;

  voiceBtn.addEventListener('click', () => {
    try {
      rec.start();
      voiceBtn.classList.add('listening');
    } catch { /* ya escuchando */ }
  });
  rec.onresult = (e) => {
    inputEl.value = e.results[0][0].transcript;
    inputEl.focus();
  };
  rec.onend = () => voiceBtn.classList.remove('listening');
  rec.onerror = () => voiceBtn.classList.remove('listening');
} else {
  voiceBtn.style.display = 'none';
}

window.addEventListener('resize', () => {
  if (window.innerWidth < 640) planToggle.style.minWidth = '';
});

loadPlans();
