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
  <svg class="logo-svg" viewBox="0 0 900 400" role="img" aria-label="Frenchie Chiki Match">
    <defs>
      <linearGradient id="plaqueFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6b422f"/>
        <stop offset=".48" stop-color="#44291f"/>
        <stop offset="1" stop-color="#2b1915"/>
      </linearGradient>
      <linearGradient id="creamFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fffdf0"/>
        <stop offset=".48" stop-color="#fff1d8"/>
        <stop offset="1" stop-color="#e9c49b"/>
      </linearGradient>
      <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd94a"/>
        <stop offset=".52" stop-color="#ffb516"/>
        <stop offset="1" stop-color="#ee8c06"/>
      </linearGradient>
      <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8eeaff"/>
        <stop offset=".5" stop-color="#48c4ef"/>
        <stop offset="1" stop-color="#2788c6"/>
      </linearGradient>
      <linearGradient id="pawFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffdca8"/>
        <stop offset="1" stop-color="#e99451"/>
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#14283c" flood-opacity=".45"/>
      </filter>
    </defs>

    <g filter="url(#softShadow)">
      <path
        d="M132 72 C168 40 214 38 252 43 C334 14 566 14 648 43 C696 37 742 47 775 76 C807 103 814 137 807 169 C835 192 838 236 816 266 C795 294 765 306 729 306 C680 334 220 334 171 306 C135 306 105 294 84 266 C62 236 65 192 93 169 C86 133 98 101 132 72 Z"
        fill="url(#plaqueFill)"
        stroke="#29160f"
        stroke-width="12"
        stroke-linejoin="round"
      />
      <path
        d="M143 78 C180 53 218 51 256 55 C337 29 563 29 644 55 C688 49 725 58 758 83"
        fill="none"
        stroke="#9b6849"
        stroke-width="8"
        stroke-linecap="round"
        opacity=".75"
      />

      <g class="paw-mark" fill="url(#pawFill)" stroke="#3b2117" stroke-width="8">
        <ellipse cx="104" cy="203" rx="30" ry="25" transform="rotate(-14 104 203)"/>
        <ellipse cx="72" cy="170" rx="13" ry="18" transform="rotate(-30 72 170)"/>
        <ellipse cx="91" cy="151" rx="13" ry="19" transform="rotate(-14 91 151)"/>
        <ellipse cx="116" cy="147" rx="13" ry="19" transform="rotate(7 116 147)"/>
        <ellipse cx="139" cy="161" rx="13" ry="18" transform="rotate(28 139 161)"/>

        <ellipse cx="796" cy="203" rx="30" ry="25" transform="rotate(14 796 203)"/>
        <ellipse cx="828" cy="170" rx="13" ry="18" transform="rotate(30 828 170)"/>
        <ellipse cx="809" cy="151" rx="13" ry="19" transform="rotate(14 809 151)"/>
        <ellipse cx="784" cy="147" rx="13" ry="19" transform="rotate(-7 784 147)"/>
        <ellipse cx="761" cy="161" rx="13" ry="18" transform="rotate(-28 761 161)"/>
      </g>

      <text class="logo-word logo-depth" x="450" y="135" font-size="118">FRENCHIE</text>
      <text class="logo-word logo-mid-depth" x="450" y="128" font-size="118">FRENCHIE</text>
      <text class="logo-word logo-front logo-frenchie" x="450" y="119" font-size="118">FRENCHIE</text>

      <text class="logo-word logo-depth" x="450" y="272" font-size="172">CHIKI</text>
      <text class="logo-word logo-mid-depth" x="450" y="264" font-size="172">CHIKI</text>
      <text class="logo-word logo-front logo-chiki" x="450" y="254" font-size="172">CHIKI</text>

      <text class="logo-word logo-depth" x="450" y="376" font-size="116">MATCH</text>
      <text class="logo-word logo-mid-depth" x="450" y="369" font-size="116">MATCH</text>
      <text class="logo-word logo-front logo-match" x="450" y="360" font-size="116">MATCH</text>
    </g>
  </svg>
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
