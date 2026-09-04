import { addBananaLife, getLifeState, MAX_BANANA_LIVES } from "./lifeSystem";
import { readBoosterCounts, type BoosterCounts } from "./boosterEconomyTweaks";

const CLAIMED_KEY = "chiki-milestone-gifts-v1";
const ROOM_STATE_KEY = "chiki-room-state";

type Reward =
  | { kind: "hammer" | "rocket" | "shuffle"; amount: number }
  | { kind: "banana"; amount: number };

const readClaimed = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAIMED_KEY) || "{}") as Record<string, boolean>;
  } catch {
    return {} as Record<string, boolean>;
  }
};

const markClaimed = (level: number) => {
  const claimed = readClaimed();
  claimed[String(level)] = true;
  localStorage.setItem(CLAIMED_KEY, JSON.stringify(claimed));
};

const rewardForLevel = (level: number): Reward[] => {
  const milestone = Math.max(1, Math.floor(level / 5));
  const slot = milestone % 4;
  if (slot === 1) return [{ kind: "hammer", amount: 1 }];
  if (slot === 2) return [{ kind: "shuffle", amount: 1 }, { kind: "rocket", amount: 1 }];
  if (slot === 3) return [{ kind: "hammer", amount: 1 }, { kind: "rocket", amount: 1 }];
  if (getLifeState().lives < MAX_BANANA_LIVES) return [{ kind: "banana", amount: 1 }];
  return [{ kind: "shuffle", amount: 1 }];
};

const rewardLabel = (reward: Reward) => {
  if (reward.kind === "banana") return `🍌 +${reward.amount} VITA`;
  if (reward.kind === "hammer") return `🔨 +${reward.amount} MARTELLO`;
  if (reward.kind === "rocket") return `🚀 +${reward.amount} RAZZO`;
  return `🔀 +${reward.amount} MESCOLA`;
};

const persistRewards = (rewards: Reward[]) => {
  const counts = readBoosterCounts();
  rewards.forEach((reward) => {
    if (reward.kind === "banana") {
      addBananaLife(reward.amount);
      return;
    }
    counts[reward.kind] = Math.min(99, counts[reward.kind] + reward.amount);
  });

  let roomState: Record<string, unknown> = {};
  try {
    roomState = JSON.parse(localStorage.getItem(ROOM_STATE_KEY) || "{}") as Record<string, unknown>;
  } catch {
    roomState = {};
  }

  localStorage.setItem(
    ROOM_STATE_KEY,
    JSON.stringify({
      ...roomState,
      booster_shuffle: counts.shuffle,
      booster_hammer: counts.hammer,
      booster_rocket: counts.rocket,
    }),
  );
  window.dispatchEvent(new CustomEvent<BoosterCounts>("chiki-boosters-changed", { detail: counts }));
};

const showGift = (level: number) => {
  if (level % 5 !== 0 || readClaimed()[String(level)]) return;
  document.querySelector(".chiki-safe-gift")?.remove();

  const rewards = rewardForLevel(level);
  const overlay = document.createElement("div");
  overlay.className = "chiki-safe-gift";
  overlay.innerHTML = `
    <section class="chiki-safe-gift-card" role="dialog" aria-modal="true" aria-label="Regalo di Chiki">
      <small>LIVELLO ${level} COMPLETATO</small>
      <h2>CHIKI HA UN REGALO!</h2>
      <img src="/chiki-character.webp" alt="Chiki" />
      <div class="chiki-safe-gift-rewards">${rewards.map((reward) => `<strong>${rewardLabel(reward)}</strong>`).join("")}</div>
      <button type="button">PRENDI IL REGALO</button>
    </section>`;

  const style = document.createElement("style");
  style.textContent = `
    .chiki-safe-gift{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:#071322dc;backdrop-filter:blur(4px)}
    .chiki-safe-gift-card{width:min(92vw,430px);padding:20px 20px 24px;border:7px solid #ffe27a;border-radius:34px;background:linear-gradient(#1f79bd,#15538b 48%,#103e68);box-shadow:inset 0 6px #68c9ff,0 10px 0 #0b2947,0 22px 40px #0008;text-align:center;color:#fff;font-family:"Fredoka",sans-serif}
    .chiki-safe-gift-card small{display:block;color:#d9efff;font-weight:900;font-size:13px;letter-spacing:1px}
    .chiki-safe-gift-card h2{margin:6px 0 8px;color:#fff5bd;font-family:"Lilita One","Fredoka",sans-serif;font-size:34px;line-height:1;text-shadow:0 4px 0 #173b61}
    .chiki-safe-gift-card img{display:block;width:min(66vw,290px);max-height:300px;object-fit:contain;margin:0 auto 2px;filter:drop-shadow(0 10px 8px #06254166)}
    .chiki-safe-gift-rewards{display:grid;gap:7px;margin:4px 0 16px}
    .chiki-safe-gift-rewards strong{padding:9px 12px;border:3px solid #fff1a3;border-radius:16px;background:#52266fd9;color:#fff8cf;font-size:20px;box-shadow:0 4px 0 #311545}
    .chiki-safe-gift-card button{width:100%;min-height:58px;border:5px solid #f5ffc7;border-radius:24px;background:linear-gradient(#75ef52,#33b723 70%,#28901c);color:#fff;font:400 24px/1 "Lilita One","Fredoka",sans-serif;text-shadow:0 3px 0 #237219;box-shadow:inset 0 5px #b9ff91,0 6px 0 #1f7618}
  `;
  overlay.appendChild(style);

  overlay.querySelector("button")?.addEventListener("click", () => {
    persistRewards(rewards);
    markClaimed(level);
    overlay.remove();
  });

  document.body.appendChild(overlay);
};

window.addEventListener("chiki-level-complete", (event) => {
  const detail = (event as CustomEvent<{ level?: number }>).detail;
  const level = Number(detail?.level || 0);
  if (!Number.isFinite(level) || level <= 0) return;
  window.setTimeout(() => showGift(level), 450);
});
