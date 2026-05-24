const LS_KEY = "copago_theme";

export function getTheme() {
  const stored = localStorage.getItem(LS_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(LS_KEY, theme);
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
