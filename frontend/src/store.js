export const C = {
  midnight: "var(--midnight)",
  indigo: "var(--navy)",
  royal: "var(--royal)",
  cerulean: "var(--cerulean)",
  sky: "var(--sky)",
};

export const LS_CHAT = "copago_chat_v1";
export const LS_PLAN = "copago_plan_v1";
export const LS_SESSIONS = "copago_sessions_v1";
export const MAX_SESSIONS = 10;

export const state = {
  history: [],
  planId: null,
  pendingAudio: null,
  pendingImage: null,
  chatLog: [],
  sessions: [],
  currentSessionId: null,
};
