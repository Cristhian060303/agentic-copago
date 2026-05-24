import { state, LS_PLAN } from "../store.js";
import { t } from "../i18n/index.js";
import { escapeHtml } from "./chat.js";
import { fetchPlans } from "../lib/api.js";
import { restoreSession } from "../session.js";
import { renderDrawer } from "./drawer.js";

const planToggle = document.getElementById("plan-toggle");
const planLabel = document.getElementById("plan-label");
const planMenu = document.getElementById("plan-menu");
const planWrapper = document.getElementById("plan-dropdown-wrapper");

let widestPlanNombre = "";

export function lockToggleWidth() {
  if (window.innerWidth < 640) {
    planToggle.style.width = "";
    planMenu.style.minWidth = "";
    return;
  }
  const current = planLabel.textContent;
  planLabel.textContent = widestPlanNombre;
  planToggle.style.width = "";
  const w = planToggle.offsetWidth + "px";
  planToggle.style.width = w;
  planMenu.style.minWidth = w;
  planLabel.textContent = current;
}

export function closeMenu() {
  planMenu.classList.remove("open");
  planToggle.classList.remove("open");
  planMenu.setAttribute("aria-hidden", "true");
}

function openMenu() {
  planMenu.classList.add("open");
  planToggle.classList.add("open");
  planMenu.setAttribute("aria-hidden", "false");
}

export async function loadPlans() {
  try {
    const plans = await fetchPlans();
    if (!plans.length) throw new Error("no plans");

    planMenu.innerHTML = plans
      .map(
        (p, i) => `
      <li class="plan-option${i === 0 ? " selected" : ""}" data-value="${escapeHtml(p.id)}" role="option">
        ${escapeHtml(p.nombre)}
      </li>`,
      )
      .join("");

    state.planId = plans[0].id;

    const widest = plans.reduce((a, b) =>
      a.nombre.length >= b.nombre.length ? a : b,
    );
    widestPlanNombre = widest.nombre;
    planLabel.textContent = plans[0].nombre;
    document.fonts.ready.then(() => lockToggleWidth());

    planToggle.addEventListener("click", () => {
      planMenu.classList.contains("open") ? closeMenu() : openMenu();
    });

    planMenu.addEventListener("click", (e) => {
      const opt = e.target.closest(".plan-option");
      if (!opt) return;
      state.planId = opt.dataset.value;
      planLabel.textContent = opt.textContent.trim();
      planMenu
        .querySelectorAll(".plan-option")
        .forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      localStorage.setItem(LS_PLAN, state.planId);
      closeMenu();
    });

    document.addEventListener("click", (e) => {
      if (!planWrapper.contains(e.target)) closeMenu();
    });

    restoreSession(plans);
    renderDrawer();
  } catch (e) {
    planLabel.textContent = t("header.noConnection");
    console.error(e);
  }
}
