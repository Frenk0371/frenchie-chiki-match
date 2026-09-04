import GameScene from "./game/GameScene";

const SUPABASE_URL = "https://xrkqeelwutjzyqxgvxmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_vQVI5HTbjy6lrDZLmoJfkw_ulzJMIkO";
const SESSION_KEY = "chiki-auth-session-v1";
const ROOM_STATE_KEY = "chiki-room-state";

export type BoosterCounts = {
  shuffle: number;
  hammer: number;
  rocket: number;
};

const defaults: BoosterCounts = { shuffle: 3, hammer: 3, rocket: 2 };

export const readBoosterCounts = (): BoosterCounts => {
  try {
    const state = JSON.parse(localStorage.getItem(ROOM_STATE_KEY) || "{}") as Record<string, unknown>;
    return {
      shuffle: Math.max(0, Number(state.booster_shuffle ?? defaults.shuffle)),
      hammer: Math.max(0, Number(state.booster_hammer ?? defaults.hammer)),
      rocket: Math.max(0, Number(state.booster_rocket ?? defaults.rocket)),
    };
  } catch {
    return { ...defaults };
  }
};

const writeBoosterCounts = (counts: BoosterCounts) => {
  let state: Record<string, unknown> = {};
  try {
    state = JSON.parse(localStorage.getItem(ROOM_STATE_KEY) || "{}") as Record<string, unknown>;
  } catch {
    state = {};
  }

  const updated = {
    ...state,
    booster_shuffle: counts.shuffle,
    booster_hammer: counts.hammer,
    booster_rocket: counts.rocket,
  };
  localStorage.setItem(ROOM_STATE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent<BoosterCounts>("chiki-boosters-changed", { detail: counts }));
};

const syncUseToCloud = async (booster: keyof BoosterCounts) => {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as { access_token?: string } | null;
    if (!session?.access_token) return;

    await fetch(`${SUPABASE_URL}/rest/v1/rpc/chiki_use_booster`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_booster: booster }),
    });
  } catch {
    // Il consumo locale resta valido anche se la sincronizzazione e' temporaneamente offline.
  }
};

const labelToBooster = (label: string): keyof BoosterCounts | null => {
  if (label === "MESCOLA") return "shuffle";
  if (label === "MARTELLO") return "hammer";
  if (label === "RAZZO") return "rocket";
  return null;
};

const proto = GameScene.prototype as any;

const originalCreateBoosterTray = proto.createBoosterTray as (this: GameScene) => void;
proto.createBoosterTray = function (this: GameScene) {
  const counts = readBoosterCounts();
  const scene = this as any;
  scene.shuffleUses = counts.shuffle;
  scene.hammerUses = counts.hammer;
  scene.rocketUses = counts.rocket;
  originalCreateBoosterTray.call(this);
};

const originalCreateBoosterButton = proto.createBoosterButton as (
  this: GameScene,
  x: number,
  iconKey: string,
  label: string,
  action: () => void,
  remaining: () => number,
) => void;

proto.createBoosterButton = function (
  this: GameScene,
  x: number,
  iconKey: string,
  label: string,
  action: () => void,
  remaining: () => number,
) {
  const actionWithPersistence = () => {
    const before = remaining();
    action();
    const after = remaining();
    if (after >= before) return;

    const booster = labelToBooster(label);
    if (!booster) return;

    const scene = this as any;
    const counts: BoosterCounts = {
      shuffle: Math.max(0, Number(scene.shuffleUses ?? 0)),
      hammer: Math.max(0, Number(scene.hammerUses ?? 0)),
      rocket: Math.max(0, Number(scene.rocketUses ?? 0)),
    };
    writeBoosterCounts(counts);
    void syncUseToCloud(booster);
  };

  originalCreateBoosterButton.call(this, x, iconKey, label, actionWithPersistence, remaining);
};
