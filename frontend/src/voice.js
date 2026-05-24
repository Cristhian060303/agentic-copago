import { state } from "./store.js";
import { sendVoiceMessage } from "./lib/api.js";
import {
  appendBubble,
  appendLoading,
  removeLoading,
  appendVoiceBubble,
  appendUrgency,
  appendEstimate,
  PLAY_ICON,
  PAUSE_ICON,
  formatDuration,
} from "./ui/chat.js";
import { saveChatLog } from "./session.js";

export function initVoice() {
  const voiceBtn = document.getElementById("voice-btn");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const recordingIndicator = document.getElementById("recording-indicator");
  const recordingTimerEl = document.getElementById("recording-timer");
  const audioPreviewEl = document.getElementById("audio-preview");
  const audioPlayBtn = document.getElementById("audio-play-btn");
  const audioProgressFill = document.getElementById("audio-progress-fill");
  const audioPreviewTime = document.getElementById("audio-preview-time");
  const audioDeleteBtn = document.getElementById("audio-delete-btn");

  if (!navigator.mediaDevices?.getUserMedia) {
    voiceBtn.style.display = "none";
    return;
  }

  let mediaRecorder = null;
  let activeStream = null;
  let audioChunks = [];
  let recordingInterval = null;
  let recordingSeconds = 0;
  let previewAudio = null;
  let discarding = false;

  const micIcon = voiceBtn.innerHTML;
  const stopIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`;

  function enterRecordingState() {
    inputEl.style.display = "none";
    recordingIndicator.style.display = "flex";
    audioPreviewEl.style.display = "none";
    voiceBtn.classList.add("listening");
    voiceBtn.innerHTML = stopIcon;
    sendBtn.disabled = true;
    recordingSeconds = 0;
    recordingTimerEl.textContent = "0:00";
    recordingInterval = setInterval(() => {
      recordingSeconds++;
      recordingTimerEl.textContent = formatDuration(recordingSeconds);
    }, 1000);
  }

  function enterPreviewState(blob, mimeType) {
    clearInterval(recordingInterval);
    inputEl.style.display = "none";
    recordingIndicator.style.display = "none";
    audioPreviewEl.style.display = "flex";
    voiceBtn.style.display = "none";
    voiceBtn.classList.remove("listening");
    voiceBtn.innerHTML = micIcon;
    sendBtn.disabled = false;

    state.pendingAudio = { blob, mimeType, duration: recordingSeconds };
    audioPreviewTime.textContent = formatDuration(recordingSeconds);
    audioProgressFill.style.width = "0%";
    audioPlayBtn.innerHTML = PLAY_ICON;

    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }
    previewAudio = new Audio(URL.createObjectURL(blob));
    previewAudio.ontimeupdate = () => {
      if (!previewAudio.duration) return;
      audioProgressFill.style.width = `${(previewAudio.currentTime / previewAudio.duration) * 100}%`;
      audioPreviewTime.textContent = `${formatDuration(previewAudio.currentTime)} / ${formatDuration(recordingSeconds)}`;
    };
    previewAudio.onended = () => {
      audioPlayBtn.innerHTML = PLAY_ICON;
      audioProgressFill.style.width = "0%";
      audioPreviewTime.textContent = formatDuration(recordingSeconds);
    };
  }

  function exitPreviewState() {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }
    state.pendingAudio = null;
    inputEl.style.display = "";
    audioPreviewEl.style.display = "none";
    voiceBtn.style.display = "";
    sendBtn.disabled = false;
    audioPlayBtn.innerHTML = PLAY_ICON;
    audioProgressFill.style.width = "0%";
  }

  voiceBtn.addEventListener("click", async () => {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
      return;
    }
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(activeStream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        activeStream.getTracks().forEach((t) => t.stop());
        activeStream = null;
        if (discarding) {
          discarding = false;
          exitPreviewState();
          return;
        }
        const mimeType = (mediaRecorder.mimeType || "audio/webm").split(";")[0];
        enterPreviewState(new Blob(audioChunks, { type: mimeType }), mimeType);
      };
      mediaRecorder.start();
      enterRecordingState();
    } catch {
      inputEl.placeholder = "No se pudo acceder al micrófono";
      setTimeout(() => {
        inputEl.placeholder = "Describe tu síntoma…";
      }, 3000);
    }
  });

  audioPlayBtn.addEventListener("click", () => {
    if (!previewAudio) return;
    if (previewAudio.paused) {
      previewAudio.play();
      audioPlayBtn.innerHTML = PAUSE_ICON;
    } else {
      previewAudio.pause();
      audioPlayBtn.innerHTML = PLAY_ICON;
    }
  });

  audioDeleteBtn.addEventListener("click", () => {
    exitPreviewState();
    inputEl.focus();
  });

  async function submitVoiceMessage() {
    if (!state.pendingAudio) return;
    const { blob, mimeType, duration } = state.pendingAudio;
    const blobUrl = URL.createObjectURL(blob);
    exitPreviewState();

    appendVoiceBubble(blobUrl, duration);
    state.history.push({ role: "user", text: "[nota de voz]" });
    state.chatLog.push({ type: "user_voice", duration });
    inputEl.disabled = true;
    sendBtn.disabled = true;
    voiceBtn.disabled = true;
    appendLoading();

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = await sendVoiceMessage(
          reader.result.split(",")[1],
          mimeType,
          state.planId,
          state.history.slice(0, -1),
        );
        removeLoading();
        const { clasificacion, estimacion } = data;
        appendBubble("agent", clasificacion.mensaje_usuario);
        state.history.push({
          role: "model",
          text: clasificacion.mensaje_usuario,
        });
        state.chatLog.push({
          type: "agent",
          text: clasificacion.mensaje_usuario,
        });
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
          "No pude procesar la nota de voz. Intenta de nuevo.",
        );
      } finally {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        voiceBtn.disabled = false;
        inputEl.focus();
      }
    };
    reader.readAsDataURL(blob);
  }

  window.__submitVoiceMessage = submitVoiceMessage;
  window.__resetVoice = () => {
    clearInterval(recordingInterval);
    if (mediaRecorder?.state === "recording") {
      discarding = true;
      mediaRecorder.stop();
    } else exitPreviewState();
  };
}
