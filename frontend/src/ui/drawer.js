import { state, LS_CHAT, LS_PLAN } from "../store.js";
import {
  escapeHtml,
  formatEspecialidad,
  chatEl,
  createWelcomeBubble,
} from "./chat.js";
import {
  timeAgo,
  archiveCurrentSession,
  persistSessions,
  replayLog,
} from "../session.js";
import { lockToggleWidth } from "./plan.js";

let historyDrawer, historyOverlay, historyList;
const planMenu = document.getElementById("plan-menu");
const planLabel = document.getElementById("plan-label");

function createDrawerDOM() {
  const overlay = document.createElement("div");
  overlay.id = "history-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const drawer = document.createElement("aside");
  drawer.id = "history-drawer";
  drawer.setAttribute("aria-label", "Consultas recientes");
  drawer.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
         style="border-bottom: 1px solid rgba(68, 157, 209, 0.15)">
      <div class="flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#449dd1"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <h2 class="font-bold text-white text-sm tracking-tight">Consultas recientes</h2>
      </div>
      <button id="history-close-btn" class="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style="color: #78c0e0" aria-label="Cerrar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <ul id="history-list" class="flex-1 overflow-y-auto py-1" role="list"></ul>
    <div class="px-4 py-3 flex-shrink-0"
         style="border-top: 1px solid rgba(68, 157, 209, 0.12)">
      <button id="history-clear-btn"
              class="w-full text-xs py-2 px-3 rounded-lg transition-colors font-medium hover:bg-red-500/10"
              style="color: rgba(120, 192, 224, 0.45)">
        Borrar historial
      </button>
    </div>`;

  document.body.prepend(drawer, overlay);

  historyDrawer = drawer;
  historyOverlay = overlay;
  historyList = drawer.querySelector("#history-list");
}

export function openDrawer() {
  renderDrawer();
  historyDrawer.classList.add("open");
  historyOverlay.classList.add("open");
}

export function closeDrawer() {
  historyDrawer.classList.remove("open");
  historyOverlay.classList.remove("open");
}

export function renderDrawer() {
  if (!state.sessions.length) {
    historyList.innerHTML = `
      <li class="px-5 py-10 text-center list-none">
        <p class="text-xs leading-relaxed" style="color:rgba(120,192,224,0.4)">Aún no tienes<br>consultas guardadas</p>
      </li>`;
    return;
  }
  historyList.innerHTML = state.sessions
    .map((s) => {
      const active = s.id === state.currentSessionId;
      const especialidad = s.especialidad
        ? formatEspecialidad(s.especialidad)
        : null;
      return `
      <li class="history-item list-none ${active ? "active" : ""}" role="listitem">
        <button class="w-full text-left px-4 py-3.5 flex items-start gap-3" data-session-id="${escapeHtml(s.id)}">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
               style="background:${active ? "#3943b7" : "rgba(255,255,255,0.08)"}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${active ? "white" : "#449dd1"}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold truncate" style="color:${active ? "white" : "rgba(255,255,255,0.85)"}">${escapeHtml(s.title)}</p>
            ${especialidad ? `<p class="text-xs mt-0.5 truncate" style="color:rgba(68,157,209,0.7)">${escapeHtml(especialidad)}</p>` : ""}
            <p class="text-xs mt-0.5" style="color:rgba(120,192,224,0.45)">${escapeHtml(s.planNombre || "")} · ${timeAgo(s.timestamp)}</p>
          </div>
          ${active ? `<span class="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style="background:#78c0e0"></span>` : ""}
        </button>
      </li>`;
    })
    .join("");

  historyList.querySelectorAll("button[data-session-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sid = btn.dataset.sessionId;
      if (sid === state.currentSessionId) {
        closeDrawer();
        return;
      }
      loadHistorySession(sid);
    });
  });
}

export function loadHistorySession(sessionId) {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return;

  window.__resetVoice?.();
  archiveCurrentSession();

  state.currentSessionId = sessionId;
  state.chatLog = [...session.chatLog];
  try {
    localStorage.setItem(LS_CHAT, JSON.stringify(state.chatLog));
    if (session.planId) localStorage.setItem(LS_PLAN, session.planId);
  } catch {}

  if (session.planId) {
    state.planId = session.planId;
    planMenu.querySelectorAll(".plan-option").forEach((o) => {
      const match = o.dataset.value === session.planId;
      o.classList.toggle("selected", match);
      if (match) planLabel.textContent = o.textContent.trim();
    });
    lockToggleWidth();
  }

  replayLog(session.chatLog);
  closeDrawer();
  document.getElementById("chat-input").focus();
}

export function initDrawer() {
  createDrawerDOM();

  document.getElementById("history-btn").addEventListener("click", openDrawer);
  document.getElementById("history-close-btn").addEventListener("click", closeDrawer);
  historyOverlay.addEventListener("click", closeDrawer);
  document.getElementById("history-clear-btn").addEventListener("click", () => {
    if (!confirm("¿Borrar todo el historial de consultas?")) return;
    state.sessions = [];
    persistSessions();
    state.currentSessionId = null;
    state.history = [];
    state.chatLog = [];
    try {
      localStorage.removeItem(LS_CHAT);
    } catch {}
    chatEl.innerHTML = "";
    chatEl.appendChild(createWelcomeBubble());
    renderDrawer();
    closeDrawer();
    document.getElementById("chat-input").focus();
  });
}
