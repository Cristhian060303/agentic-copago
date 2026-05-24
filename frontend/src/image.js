import { state } from "./store.js";
import { t, getLang } from "./i18n/index.js";
import { sendImageMessage } from "./lib/api.js";
import {
  appendBubble,
  appendLoading,
  removeLoading,
  appendImageBubble,
  appendUrgency,
  appendEstimate,
} from "./ui/chat.js";
import { saveChatLog } from "./session.js";
import { renderDrawer } from "./ui/drawer.js";

const MAX_SIZE = 3 * 1024 * 1024;
const MAX_DIM = 1200;

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= MAX_DIM && height <= MAX_DIM && file.size <= MAX_SIZE) {
        resolve(file);
        return;
      }
      if (width > height) {
        if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
      } else {
        if (height > MAX_DIM) { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    };
    img.src = url;
  });
}

export function initImage() {
  const imageBtn = document.getElementById("image-btn");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const voiceBtn = document.getElementById("voice-btn");
  const imagePreviewEl = document.getElementById("image-preview");
  const imagePreviewImg = document.getElementById("image-preview-img");
  const imageDeleteBtn = document.getElementById("image-delete-btn");
  const fileInput = document.getElementById("image-file-input");

  if (!imageBtn) return;

  function enterPreviewState(blob, mimeType) {
    const url = URL.createObjectURL(blob);
    imagePreviewEl.style.display = "flex";
    imagePreviewImg.src = url;
    voiceBtn.style.display = "none";
    imageBtn.style.display = "none";
    state.pendingImage = { blob, mimeType };
  }

  function exitPreviewState() {
    if (imagePreviewImg.src) {
      URL.revokeObjectURL(imagePreviewImg.src);
    }
    state.pendingImage = null;
    imagePreviewEl.style.display = "none";
    imagePreviewImg.src = "";
    voiceBtn.style.display = "";
    imageBtn.style.display = "";
    fileInput.value = "";
  }

  imageBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      inputEl.placeholder = t("chat.imageTypeError");
      setTimeout(() => { inputEl.placeholder = t("chat.placeholder"); }, 3000);
      fileInput.value = "";
      return;
    }

    const compressed = await compressImage(file);
    const mimeType = compressed instanceof Blob && compressed !== file ? "image/jpeg" : file.type;
    enterPreviewState(compressed, mimeType);
  });

  imageDeleteBtn.addEventListener("click", () => {
    exitPreviewState();
    inputEl.focus();
  });

  async function submitImageMessage() {
    if (!state.pendingImage) return;
    const { blob, mimeType } = state.pendingImage;
    const blobUrl = URL.createObjectURL(blob);
    const textMsg = inputEl.value.trim() || null;
    exitPreviewState();

    appendImageBubble(blobUrl);
    if (textMsg) {
      appendBubble("user", textMsg);
      state.history.push({ role: "user", text: textMsg });
    } else {
      state.history.push({ role: "user", text: "[imagen]" });
    }
    state.chatLog.push({ type: "user_image", text: textMsg });
    saveChatLog();
    renderDrawer();

    inputEl.value = "";
    inputEl.disabled = true;
    sendBtn.disabled = true;
    voiceBtn.disabled = true;
    imageBtn.disabled = true;
    appendLoading();

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(",")[1];
        const data = await sendImageMessage(
          base64,
          mimeType,
          state.planId,
          state.history.slice(0, -1),
          getLang(),
          textMsg,
        );
        removeLoading();
        const { clasificacion, estimacion } = data;
        appendBubble("agent", clasificacion.mensaje_usuario);
        state.history.push({ role: "model", text: clasificacion.mensaje_usuario });
        state.chatLog.push({ type: "agent", text: clasificacion.mensaje_usuario });

        if (clasificacion.urgencia === "emergencia") {
          appendUrgency(clasificacion.urgencia);
          state.chatLog.push({ type: "urgency", urgencia: "emergencia" });
        }
        if (estimacion) {
          appendEstimate(estimacion);
          state.chatLog.push({ type: "estimate", estimacion });
        }
        saveChatLog();
        renderDrawer();
      } catch {
        removeLoading();
        appendBubble("agent", t("chat.imageError"));
      } finally {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        voiceBtn.disabled = false;
        imageBtn.disabled = false;
        inputEl.focus();
      }
    };
    reader.readAsDataURL(blob);
  }

  window.__submitImageMessage = submitImageMessage;
  window.__resetImage = () => exitPreviewState();
}
