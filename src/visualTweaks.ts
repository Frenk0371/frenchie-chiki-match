import Phaser from "phaser";
import "./HomePolish.css";

/* Keep the larger game pieces and boosters already approved. */
const imagePrototype = Phaser.GameObjects.Image.prototype;
const originalSetDisplaySize = imagePrototype.setDisplaySize;

imagePrototype.setDisplaySize = function (
  this: Phaser.GameObjects.Image,
  width: number,
  height: number,
) {
  const textureKey = this.texture?.key ?? "";
  let scale = 1;

  if (textureKey.startsWith("tile-")) {
    scale = 1.08;
  } else if (textureKey.startsWith("booster-")) {
    scale = 1.2;
  }

  return originalSetDisplaySize.call(this, width * scale, height * scale);
} as typeof imagePrototype.setDisplaySize;

/* Remove the small emoji before the game title without touching game logic. */
const factoryPrototype = Phaser.GameObjects.GameObjectFactory.prototype;
const originalTextFactory = factoryPrototype.text;

factoryPrototype.text = function (
  this: Phaser.GameObjects.GameObjectFactory,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
) {
  const cleaned =
    text === "🐾 FRENCHIE CHIKI MATCH" ? "FRENCHIE CHIKI MATCH" : text;
  return originalTextFactory.call(this, x, y, cleaned, style);
} as typeof factoryPrototype.text;

const logoMarkup = `
  <span class="logo-frenchie">FRENCHIE</span>
  <span class="logo-chiki-line">
    <span class="logo-paw logo-paw-left" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></span>
    <strong>CHIKI</strong>
    <span class="logo-paw logo-paw-right" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></span>
  </span>
  <em class="logo-match">MATCH</em>
`;

const utilityIcons: Record<string, string> = {
  EVENTI: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="cal-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4e7ff"/><stop offset=".48" stop-color="#70addb"/><stop offset="1" stop-color="#315b82"/></linearGradient></defs><rect x="10" y="14" width="44" height="40" rx="8" fill="url(#cal-g)" stroke="#e8f5ff" stroke-width="4"/><path d="M10 25h44M20 8v12M44 8v12" fill="none" stroke="#e8f5ff" stroke-width="4" stroke-linecap="round"/><path d="M20 34h8M36 34h8M20 44h8M36 44h8" fill="none" stroke="#173d62" stroke-width="4" stroke-linecap="round"/></svg>`,
  MESSAGGI: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="mail-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4e7ff"/><stop offset=".48" stop-color="#70addb"/><stop offset="1" stop-color="#315b82"/></linearGradient></defs><rect x="8" y="14" width="48" height="36" rx="8" fill="url(#mail-g)" stroke="#e8f5ff" stroke-width="4"/><path d="M11 18l21 17 21-17" fill="none" stroke="#f5fbff" stroke-width="5" stroke-linejoin="round"/><path d="M11 47l15-13M53 47L38 34" fill="none" stroke="#244e72" stroke-width="4" stroke-linecap="round"/></svg>`,
  AMICI: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="friends-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4e7ff"/><stop offset=".48" stop-color="#70addb"/><stop offset="1" stop-color="#315b82"/></linearGradient></defs><circle cx="23" cy="23" r="10" fill="url(#friends-g)" stroke="#e8f5ff" stroke-width="4"/><circle cx="43" cy="25" r="8" fill="url(#friends-g)" stroke="#e8f5ff" stroke-width="4"/><path d="M8 53c2-11 8-17 16-17s14 6 16 17M35 53c1-8 5-13 11-13 5 0 9 4 11 13" fill="url(#friends-g)" stroke="#e8f5ff" stroke-width="4" stroke-linejoin="round"/></svg>`,
  IMPOSTAZIONI: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="gear-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4e7ff"/><stop offset=".48" stop-color="#70addb"/><stop offset="1" stop-color="#315b82"/></linearGradient></defs><path d="M36 8l3 7 8 1 5 6-3 7 3 7-5 6-8 1-3 7h-8l-3-7-8-1-5-6 3-7-3-7 5-6 8-1 3-7z" fill="url(#gear-g)" stroke="#e8f5ff" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="29" r="9" fill="#244e72" stroke="#f5fbff" stroke-width="4"/></svg>`,
};

function polishHome() {
  const logo = document.querySelector<HTMLElement>(".home-screen .game-logo");
  if (logo && !logo.classList.contains("reference-logo")) {
    logo.classList.add("reference-logo");
    logo.innerHTML = logoMarkup;
  }

  document
    .querySelectorAll<HTMLButtonElement>(".home-screen .utility-menu button")
    .forEach((button) => {
      const label = button.querySelector("small")?.textContent?.trim() ?? "";
      const iconShell = button.querySelector<HTMLElement>("span");
      const icon = utilityIcons[label];
      if (!iconShell || !icon || iconShell.dataset.polished === "true") return;
      iconShell.classList.add("utility-icon-shell");
      iconShell.innerHTML = icon;
      iconShell.dataset.polished = "true";
    });
}

function startHomePolish() {
  polishHome();
  const observer = new MutationObserver(polishHome);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startHomePolish, { once: true });
} else {
  queueMicrotask(startHomePolish);
}
