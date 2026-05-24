import es from "./locales/es.js";
import en from "./locales/en.js";

const locales = { es, en };
const LS_LANG = "copago_lang";

export function getLang() {
  const stored = localStorage.getItem(LS_LANG);
  if (stored && locales[stored]) return stored;
  const browser = navigator.language?.slice(0, 2);
  return locales[browser] ? browser : "es";
}

export function setLang(lang) {
  localStorage.setItem(LS_LANG, lang);
  location.reload();
}

export function t(key) {
  const locale = locales[getLang()] ?? locales.es;
  const value = key.split(".").reduce((o, k) => o?.[k], locale);
  return value ?? key;
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute("aria-label", t(el.dataset.i18nTitle));
  });
}
