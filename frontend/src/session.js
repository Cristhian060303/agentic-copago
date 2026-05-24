import { state, LS_CHAT, LS_PLAN, LS_SESSIONS, MAX_SESSIONS } from "./store.js";
import { t } from "./i18n/index.js";
import {
  chatEl,
  appendBubble,
  appendVoiceBubbleStatic,
  appendImageBubbleStatic,
  appendUrgency,
  appendEstimate,
  createWelcomeBubble,
} from "./ui/chat.js";

const planLabel = document.getElementById("plan-label");
const planMenu = document.getElementById("plan-menu");

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  if (hrs < 48) return "ayer";
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(ts).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
  });
}

export function loadSessionsFromStorage() {
  try {
    state.sessions = JSON.parse(localStorage.getItem(LS_SESSIONS) || "[]");
  } catch {
    state.sessions = [];
  }
}

export function persistSessions() {
  try {
    localStorage.setItem(LS_SESSIONS, JSON.stringify(state.sessions));
  } catch {}
}

export function archiveCurrentSession() {
  const firstUser = state.chatLog.find(
    (e) => e.type === "user_text" || e.type === "user_voice" || e.type === "user_image",
  );
  if (!firstUser) return;

  if (!state.currentSessionId) state.currentSessionId = generateId();

  const title =
    firstUser.type === "user_text"
      ? firstUser.text.slice(0, 50)
      : firstUser.type === "user_image"
        ? (firstUser.text ? firstUser.text.slice(0, 50) : t("drawer.imageNote"))
        : t("drawer.voiceNote");
  const firstEstimate = state.chatLog.find((e) => e.type === "estimate");
  const especialidad = firstEstimate?.estimacion?.especialidad ?? null;

  const existing = state.sessions.find((s) => s.id === state.currentSessionId);
  const session = {
    id: state.currentSessionId,
    timestamp: existing?.timestamp || Date.now(),
    planId: state.planId,
    planNombre: planLabel.textContent,
    title,
    especialidad,
    chatLog: [...state.chatLog],
  };

  const idx = state.sessions.findIndex((s) => s.id === state.currentSessionId);
  if (idx !== -1) state.sessions[idx] = session;
  else {
    state.sessions.unshift(session);
    if (state.sessions.length > MAX_SESSIONS)
      state.sessions = state.sessions.slice(0, MAX_SESSIONS);
  }
  persistSessions();
}

export function saveChatLog() {
  try {
    localStorage.setItem(LS_CHAT, JSON.stringify(state.chatLog));
    if (state.planId) localStorage.setItem(LS_PLAN, state.planId);
  } catch {}
  archiveCurrentSession();
}

export function replayLog(log) {
  chatEl.innerHTML = "";
  state.history = [];
  for (const entry of log) {
    if (entry.type === "user_text") {
      appendBubble("user", entry.text);
      state.history.push({ role: "user", text: entry.text });
    } else if (entry.type === "user_voice") {
      appendVoiceBubbleStatic(entry.duration);
      state.history.push({ role: "user", text: "[nota de voz]" });
    } else if (entry.type === "user_image") {
      appendImageBubbleStatic();
      state.history.push({ role: "user", text: entry.text || "[imagen]" });
    } else if (entry.type === "agent") {
      appendBubble("agent", entry.text);
      state.history.push({ role: "model", text: entry.text });
    } else if (entry.type === "urgency") {
      appendUrgency(entry.urgencia);
    } else if (entry.type === "estimate") {
      appendEstimate(entry.estimacion);
    }
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}

export function restoreSession(plans) {
  loadSessionsFromStorage();

  const savedPlanId = localStorage.getItem(LS_PLAN);
  if (savedPlanId) {
    const saved = plans.find((p) => p.id === savedPlanId);
    if (saved) {
      state.planId = savedPlanId;
      planLabel.textContent = saved.nombre;
      planMenu.querySelectorAll(".plan-option").forEach((o) => {
        o.classList.toggle("selected", o.dataset.value === savedPlanId);
      });
    }
  }

  const raw = localStorage.getItem(LS_CHAT);
  if (!raw) {
    chatEl.appendChild(createWelcomeBubble());
    return;
  }
  try {
    const log = JSON.parse(raw);
    if (!log.length) return;
    state.chatLog = log;
    const firstUser = log.find(
      (e) => e.type === "user_text" || e.type === "user_voice" || e.type === "user_image",
    );
    if (firstUser) {
      const firstText = firstUser.type === "user_text" ? firstUser.text : null;
      const match = state.sessions.find((s) => {
        const su = s.chatLog?.find(
          (e) => e.type === "user_text" || e.type === "user_voice" || e.type === "user_image",
        );
        return su?.type === "user_text" && su.text === firstText;
      });
      state.currentSessionId = match?.id || generateId();
    }
    replayLog(log);
  } catch {}
}
