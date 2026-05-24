import { C } from "../store.js";
import { t } from "../i18n/index.js";

export const chatEl = document.getElementById("chat");

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatEspecialidad(slug) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDuration(secs) {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs) % 60).padStart(2, "0")}`;
}

export const PLAY_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21"/></svg>`;
export const PAUSE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

export function botAvatarHtml() {
  return `
    <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
         style="background:${C.midnight}; box-shadow: 0 0 0 2px ${C.cerulean};">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
           style="color:${C.sky}">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
      </svg>
    </div>`;
}

export function appendBubble(role, text) {
  const wrap = document.createElement("div");
  if (role === "user") {
    wrap.className = "chat-bubble flex justify-end";
    wrap.innerHTML = `
      <div class="text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-xs sm:max-w-sm text-sm leading-relaxed"
           style="background:${C.royal}">
        ${escapeHtml(text)}
      </div>`;
  } else {
    wrap.className =
      "chat-bubble flex gap-2.5 self-start max-w-xs sm:max-w-sm md:max-w-md";
    wrap.innerHTML = `
      ${botAvatarHtml()}
      <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200 text-slate-800 text-sm leading-relaxed">
        ${escapeHtml(text)}
      </div>`;
  }
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

export function appendLoading() {
  const wrap = document.createElement("div");
  wrap.id = "loading-indicator";
  wrap.className = "chat-bubble flex gap-2.5 self-start";
  wrap.innerHTML = `
    ${botAvatarHtml()}
    <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200">
      <div class="loader-dots"><span></span><span></span><span></span></div>
    </div>`;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

export function removeLoading() {
  document.getElementById("loading-indicator")?.remove();
}

export function appendUrgency(urgencia) {
  if (urgencia !== "emergencia") return;
  const wrap = document.createElement("div");
  wrap.className =
    "chat-bubble flex gap-2.5 self-start max-w-xs sm:max-w-sm md:max-w-md";
  wrap.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
      <span class="text-white text-sm font-extrabold">!</span>
    </div>
    <div class="bg-red-50 border-2 border-red-300 rounded-2xl rounded-tl-sm px-4 py-3 text-red-900 text-sm leading-relaxed">
      <strong class="flex items-center gap-1.5 mb-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        ${t("urgency.label")}
      </strong>
      ${t("urgency.message")}
    </div>`;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

export function appendEstimate(estimacion) {
  const wrap = document.createElement("div");
  wrap.className = "chat-bubble w-full max-w-2xl self-start";

  const top = estimacion.hospitales[0];
  const peor = estimacion.hospitales[estimacion.hospitales.length - 1];
  const ahorro =
    peor && top && peor !== top
      ? (peor.desglose.copago - top.desglose.copago).toFixed(2)
      : 0;

  const rows = estimacion.hospitales
    .map(
      (h, i) => `
    <tr class="border-b border-slate-100" style="${i === 0 ? `background:${C.sky}18` : ""}">
      <td class="py-3 pl-2 pr-3">
        <div class="font-semibold text-slate-800 text-sm">${escapeHtml(h.nombre)}</div>
        <div class="flex flex-wrap gap-x-2 mt-0.5">
          <span class="text-xs text-slate-500">${escapeHtml(h.ciudad)}</span>
          <span class="text-xs text-yellow-500 flex items-center gap-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${h.rating}
          </span>
          ${
            h.en_red
              ? `<span class="text-xs font-semibold" style="color:${C.royal}">${t("estimate.inNetwork")}</span>`
              : `<span class="text-xs text-orange-600 font-medium">${t("estimate.outNetwork")}</span>`
          }
        </div>
      </td>
      <td class="text-right text-slate-600 text-sm col-hide-xs">$${h.desglose.precio_base}</td>
      <td class="text-right text-slate-600 text-sm col-hide-xs">${h.desglose.cobertura_pct}%</td>
      <td class="text-right pr-2 font-bold text-sm whitespace-nowrap" style="color:${C.midnight}">
        $${h.desglose.copago}
      </td>
    </tr>
  `,
    )
    .join("");

  wrap.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="px-4 sm:px-5 py-3 flex items-center justify-between"
           style="background: linear-gradient(135deg, ${C.midnight} 0%, ${C.indigo} 60%, ${C.royal} 100%)">
        <div>
          <p class="text-xs uppercase tracking-wide font-medium" style="color:${C.sky}">${t("estimate.specialty")}</p>
          <h3 class="text-white font-bold text-base sm:text-lg">${escapeHtml(formatEspecialidad(estimacion.especialidad))}</h3>
        </div>
        <div class="text-right">
          <p class="text-xs" style="color:${C.sky}">${t("estimate.yourPlan")}</p>
          <p class="text-white text-xs sm:text-sm font-semibold leading-tight max-w-[120px] sm:max-w-none">
            ${escapeHtml(estimacion.plan.nombre)}
          </p>
        </div>
      </div>
      <div class="p-4 sm:p-5">
        ${
          top
            ? `
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
              <p class="text-xs font-bold uppercase tracking-wide" style="color:${C.indigo}">${t("estimate.cheapest")}</p>
              <p class="font-bold text-sm sm:text-base" style="color:${C.midnight}">${escapeHtml(top.nombre)}</p>
              <p class="text-sm" style="color:${C.indigo}">
                ${t("estimate.youPay")} <strong>$${top.desglose.copago}</strong>
                ${ahorro > 0 ? ` · ${t("estimate.youSave")} <strong>$${ahorro}</strong> ${t("estimate.vs")}` : ""}
              </p>
            </div>
          </div>
        `
            : `
          <div class="mb-4 p-3 bg-slate-100 rounded-xl text-sm text-slate-600">
            ${t("estimate.noHospital")}
          </div>
        `
        }
        ${
          rows
            ? `
          <div class="overflow-x-auto -mx-1 px-1">
            <table class="w-full text-sm border-collapse min-w-[260px] estimate-table">
              <thead>
                <tr class="border-b-2" style="border-color:${C.sky}">
                  <th class="text-left pb-2 pl-2 text-xs font-bold uppercase tracking-wide" style="color:${C.midnight}">${t("estimate.hospital")}</th>
                  <th class="text-right pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 col-hide-xs">${t("estimate.price")}</th>
                  <th class="text-right pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 col-hide-xs">${t("estimate.coverage")}</th>
                  <th class="text-right pb-2 pr-2 text-xs font-bold uppercase tracking-wide" style="color:${C.royal}">${t("estimate.copago")}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <p class="text-xs text-slate-400 mt-1 text-center sm:hidden">${t("estimate.swipeHint")}</p>
        `
            : ""
        }
        <p class="text-xs text-slate-500 mt-4 italic leading-relaxed border-t border-slate-100 pt-3">
          ${t("estimate.disclaimer")}
        </p>
      </div>
    </div>`;

  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

export function appendVoiceBubble(blobUrl, duration) {
  const wrap = document.createElement("div");
  wrap.className = "chat-bubble flex justify-end";
  const id = `vb-${Date.now()}`;
  wrap.innerHTML = `
    <div class="text-white rounded-2xl rounded-tr-sm px-3 py-2.5 shadow-sm flex items-center gap-2.5"
         style="background:${C.royal}; min-width:180px; max-width:260px">
      <button type="button" id="${id}-btn"
              class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20 hover:bg-white/30 transition-colors">
        ${PLAY_ICON}
      </button>
      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
        <div class="relative h-1 bg-white/30 rounded-full overflow-hidden">
          <div id="${id}-fill" class="h-full bg-white absolute left-0 top-0" style="width:0%;transition:width 0.15s linear"></div>
        </div>
        <span id="${id}-time" class="text-xs font-mono" style="color:rgba(255,255,255,0.75)">
          0:00 / ${formatDuration(duration)}
        </span>
      </div>
    </div>`;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;

  const audio = new Audio(blobUrl);
  const btn = document.getElementById(`${id}-btn`);
  const fill = document.getElementById(`${id}-fill`);
  const timeEl = document.getElementById(`${id}-time`);

  btn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
      btn.innerHTML = PAUSE_ICON;
    } else {
      audio.pause();
      btn.innerHTML = PLAY_ICON;
    }
  });
  audio.ontimeupdate = () => {
    if (!audio.duration) return;
    fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    timeEl.textContent = `${formatDuration(audio.currentTime)} / ${formatDuration(duration)}`;
  };
  audio.onended = () => {
    btn.innerHTML = PLAY_ICON;
    fill.style.width = "0%";
    timeEl.textContent = `0:00 / ${formatDuration(duration)}`;
  };
}

export function appendVoiceBubbleStatic(duration) {
  const wrap = document.createElement("div");
  wrap.className = "chat-bubble flex justify-end";
  wrap.innerHTML = `
    <div class="text-white rounded-2xl rounded-tr-sm px-3 py-2.5 shadow-sm flex items-center gap-2.5"
         style="background:${C.royal}; min-width:180px; max-width:260px">
      <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
        </svg>
      </div>
      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
        <div class="relative h-1 bg-white/30 rounded-full overflow-hidden">
          <div class="h-full bg-white/40 absolute left-0 top-0" style="width:100%"></div>
        </div>
        <span class="text-xs font-mono" style="color:rgba(255,255,255,0.75)">${formatDuration(duration)}</span>
      </div>
    </div>`;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

export function createWelcomeBubble() {
  const wrap = document.createElement("div");
  wrap.className =
    "chat-bubble flex gap-2.5 self-start max-w-xs sm:max-w-sm md:max-w-md";
  wrap.innerHTML = `
    <div class="bot-avatar w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
      <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </div>
    <div class="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-slate-200">
      <p class="text-slate-800 text-sm leading-relaxed">${t("chat.welcome")}</p>
      <p class="text-xs text-slate-500 mt-2 italic">${t("chat.welcomeHint")}</p>
    </div>`;
  return wrap;
}
