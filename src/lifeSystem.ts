import "./Lives.css";

export const MAX_BANANA_LIVES = 5;
export const LIFE_REGEN_MS = 15 * 60 * 1000;

const LIVES_KEY = "chiki-banana-lives";
const NEXT_KEY = "chiki-banana-next-life";

type LifeState = {
  lives: number;
  nextAt: number | null;
};

const clampLives = (value: number) => Math.max(0, Math.min(MAX_BANANA_LIVES, Math.floor(value)));

const readRaw = (): LifeState => {
  const stored = localStorage.getItem(LIVES_KEY);
  const lives = stored === null ? MAX_BANANA_LIVES : clampLives(Number(stored));
  const next = Number(localStorage.getItem(NEXT_KEY) || "0");
  return { lives, nextAt: Number.isFinite(next) && next > 0 ? next : null };
};

const persist = (state: LifeState, notify = true) => {
  const normalized = { lives: clampLives(state.lives), nextAt: state.nextAt };
  localStorage.setItem(LIVES_KEY, String(normalized.lives));
  if (normalized.nextAt && normalized.lives < MAX_BANANA_LIVES) localStorage.setItem(NEXT_KEY, String(normalized.nextAt));
  else localStorage.removeItem(NEXT_KEY);
  if (notify) window.dispatchEvent(new CustomEvent("chiki-lives-change", { detail: normalized }));
  return normalized;
};

export const getLifeState = (): LifeState => {
  const now = Date.now();
  const state = readRaw();
  if (state.lives >= MAX_BANANA_LIVES) {
    if (state.nextAt) return persist({ lives: MAX_BANANA_LIVES, nextAt: null }, false);
    return { lives: MAX_BANANA_LIVES, nextAt: null };
  }

  if (!state.nextAt) return persist({ lives: state.lives, nextAt: now + LIFE_REGEN_MS }, false);
  if (now < state.nextAt) return state;

  const gained = 1 + Math.floor((now - state.nextAt) / LIFE_REGEN_MS);
  const lives = clampLives(state.lives + gained);
  const nextAt = lives >= MAX_BANANA_LIVES ? null : state.nextAt + gained * LIFE_REGEN_MS;
  return persist({ lives, nextAt }, false);
};

export const consumeBananaLife = () => {
  const state = getLifeState();
  if (state.lives <= 0) return state;
  const lives = state.lives - 1;
  const nextAt = state.nextAt ?? Date.now() + LIFE_REGEN_MS;
  return persist({ lives, nextAt });
};

export const addBananaLife = (amount = 1) => {
  const state = getLifeState();
  const lives = clampLives(state.lives + Math.max(1, amount));
  const nextAt = lives >= MAX_BANANA_LIVES ? null : state.nextAt ?? Date.now() + LIFE_REGEN_MS;
  return persist({ lives, nextAt });
};

export const timeUntilNextLife = () => {
  const state = getLifeState();
  if (!state.nextAt || state.lives >= MAX_BANANA_LIVES) return 0;
  return Math.max(0, state.nextAt - Date.now());
};

export const formatLifeTimer = (milliseconds: number) => {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const ensureBadge = () => {
  const relevant = document.querySelector(".map-screen, .game-shell");
  let badge = document.querySelector<HTMLElement>(".banana-life-badge");
  if (!relevant) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "banana-life-badge";
    badge.setAttribute("aria-live", "polite");
    document.body.appendChild(badge);
  }
  const state = getLifeState();
  const timer = state.lives < MAX_BANANA_LIVES ? timeUntilNextLife() : 0;
  badge.innerHTML = `<span>🍌</span><strong>${state.lives}/${MAX_BANANA_LIVES}</strong>${timer > 0 ? `<small>+1 ${formatLifeTimer(timer)}</small>` : ""}`;
  badge.classList.toggle("empty", state.lives === 0);
};

window.addEventListener("chiki-banana-life", () => {
  addBananaLife(1);
  ensureBadge();
});
window.addEventListener("chiki-lives-change", ensureBadge);

const observer = new MutationObserver(ensureBadge);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.setInterval(ensureBadge, 1000);
queueMicrotask(ensureBadge);
