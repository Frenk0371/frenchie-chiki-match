import "./MapPolish.css";

let activeMap: HTMLElement | null = null;
let focusTimer: number | null = null;

const readUnlockedLevel = () => {
  const raw = Number(localStorage.getItem("chiki-unlocked-level") || "1");
  return Math.max(1, Math.min(100, Number.isFinite(raw) ? raw : 1));
};

const clearCurrentLevelMarks = (map: HTMLElement) => {
  map.querySelectorAll<HTMLElement>(".level-stop.current-level").forEach((item) => {
    item.classList.remove("current-level");
  });
};

const focusCurrentLevel = (map: HTMLElement, level: number) => {
  clearCurrentLevelMarks(map);

  const target = Array.from(map.querySelectorAll<HTMLElement>(".level-stop")).find((stop) => {
    const button = stop.querySelector<HTMLButtonElement>("button");
    return button?.textContent?.trim() === String(level);
  });

  if (!target) return false;

  target.classList.add("current-level");
  target.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
  return true;
};

const prepareMap = (map: HTMLElement) => {
  const level = readUnlockedLevel();
  const worldId = Math.max(1, Math.min(5, Math.ceil(level / 20)));
  const worldButtons = Array.from(map.querySelectorAll<HTMLButtonElement>(".world-switcher button"));
  const targetWorldButton = worldButtons[worldId - 1];

  if (targetWorldButton && !targetWorldButton.classList.contains("active")) {
    targetWorldButton.click();
  }

  if (focusTimer !== null) window.clearTimeout(focusTimer);
  focusTimer = window.setTimeout(() => {
    // React può aver appena ridisegnato il mondo selezionato: usa il nodo più recente.
    const latestMap = document.querySelector<HTMLElement>(".map-screen");
    if (!latestMap) return;

    if (!focusCurrentLevel(latestMap, level)) {
      // Su dispositivi più lenti concedi un secondo frame al rendering dei livelli.
      window.setTimeout(() => focusCurrentLevel(latestMap, level), 120);
    }
  }, 90);
};

const watchMap = () => {
  const map = document.querySelector<HTMLElement>(".map-screen");

  if (!map) {
    activeMap = null;
    return;
  }

  if (map === activeMap) return;
  activeMap = map;
  prepareMap(map);
};

const observer = new MutationObserver(watchMap);

const start = () => {
  watchMap();
  observer.observe(document.documentElement, { childList: true, subtree: true });
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  queueMicrotask(start);
}
