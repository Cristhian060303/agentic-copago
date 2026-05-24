import { state, LS_CHAT } from "./store.js";
import { t, getLang, setLang, applyTranslations } from "./i18n/index.js";
import { sendMessage } from "./lib/api.js";
import {
  chatEl,
  appendBubble,
  appendLoading,
  removeLoading,
  appendUrgency,
  appendEstimate,
  createWelcomeBubble,
} from "./ui/chat.js";
import { saveChatLog, archiveCurrentSession } from "./session.js";
import { loadPlans, lockToggleWidth } from "./ui/plan.js";
import { initDrawer } from "./ui/drawer.js";
import { initVoice } from "./voice.js";

const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (state.pendingAudio) {
    window.__submitVoiceMessage?.();
    return;
  }
  const msg = inputEl.value.trim();
  if (!msg || !state.planId) return;

  appendBubble("user", msg);
  state.history.push({ role: "user", text: msg });
  state.chatLog.push({ type: "user_text", text: msg });
  inputEl.value = "";
  inputEl.disabled = true;
  sendBtn.disabled = true;
  appendLoading();

  try {
    const data = await sendMessage(
      msg,
      state.planId,
      state.history.slice(0, -1),
      getLang(),
    );
    removeLoading();

    const { clasificacion, estimacion } = data;
    appendBubble("agent", clasificacion.mensaje_usuario);
    state.history.push({ role: "model", text: clasificacion.mensaje_usuario });
    state.chatLog.push({ type: "agent", text: clasificacion.mensaje_usuario });

    appendUrgency(clasificacion.urgencia);
    if (clasificacion.urgencia === "emergencia")
      state.chatLog.push({ type: "urgency", urgencia: "emergencia" });
    if (estimacion) {
      appendEstimate(estimacion);
      state.chatLog.push({ type: "estimate", estimacion });
    }
    saveChatLog();
  } catch {
    removeLoading();
    appendBubble(
      "agent",
      t("chat.error"),
    );
  } finally {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
});

document.getElementById("nueva-consulta-btn").addEventListener("click", () => {
  archiveCurrentSession();
  window.__resetVoice?.();
  state.currentSessionId = null;
  state.history = [];
  state.chatLog = [];
  try {
    localStorage.removeItem(LS_CHAT);
  } catch {}
  chatEl.innerHTML = "";
  chatEl.appendChild(createWelcomeBubble());
  inputEl.disabled = false;
  sendBtn.disabled = false;
  inputEl.focus();
});

window.addEventListener("resize", () => lockToggleWidth());

applyTranslations();

const currentLang = getLang();
document.getElementById("lang-es").classList.toggle("active", currentLang === "es");
document.getElementById("lang-en").classList.toggle("active", currentLang === "en");
document.getElementById("lang-es").addEventListener("click", () => setLang("es"));
document.getElementById("lang-en").addEventListener("click", () => setLang("en"));

initVoice();
initDrawer();
loadPlans();
