import Phaser from "phaser";
import GameScene from "./game/GameScene";

type BoosterKind = "shuffle" | "hammer" | "rocket";
type HelperKind = "hammer" | "rocket" | null;

type Tile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
};

type RuntimeScene = {
  rows: number;
  cols: number;
  board: (Tile | null)[][];
  shuffleUses: number;
  hammerUses: number;
  rocketUses: number;
  isProcessing: boolean;
  levelCompleted: boolean;
  selectedTile: Tile | null;
  damageIceAround: (tiles: Tile[]) => void;
  updateObjectiveAndProgress: () => void;
  isObjectiveComplete: () => boolean;
  showLevelCompleted: () => void;
  collapseTiles: () => void;
  refillBoard: () => void;
  checkCascadeMatches: () => void;
  shuffleBoard: () => void;
  resetGestureState: () => void;
};

type State = {
  active: HelperKind;
  prompt: Phaser.GameObjects.Text | null;
};

const proto = GameScene.prototype as any;
const states = new WeakMap<GameScene, State>();
const ROOM_STATE_KEY = "chiki-room-state";
const SESSION_KEY = "chiki-auth-session-v1";
const SUPABASE_URL = "https://xrkqeelwutjzyqxgvxmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_vQVI5HTbjy6lrDZLmoJfkw_ulzJMIkO";

const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;

const stateFor = (scene: GameScene) => {
  let state = states.get(scene);
  if (!state) {
    state = { active: null, prompt: null };
    states.set(scene, state);
  }
  return state;
};

const clearPrompt = (scene: GameScene) => {
  const state = stateFor(scene);
  if (state.prompt?.active) state.prompt.destroy();
  state.prompt = null;
};

const setHelper = (scene: GameScene, helper: Exclude<HelperKind, null>) => {
  const state = stateFor(scene);
  state.active = helper;
  clearPrompt(scene);
  const label = helper === "hammer" ? "🔨 SCEGLI UNA PEDINA" : "🚀 SCEGLI UNA RIGA";
  state.prompt = scene.add
    .text(540, 1370, label, {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "32px",
      color: "#fff6cf",
      stroke: "#442054",
      strokeThickness: 7,
      backgroundColor: "#7b35a8",
      padding: { x: 18, y: 10 },
    })
    .setOrigin(0.5)
    .setDepth(90);
};

const persistCounts = (scene: GameScene) => {
  const r = runtime(scene);
  let stored: Record<string, unknown> = {};
  try {
    stored = JSON.parse(localStorage.getItem(ROOM_STATE_KEY) || "{}") as Record<string, unknown>;
  } catch {
    stored = {};
  }

  const counts = {
    shuffle: Math.max(0, Number(r.shuffleUses || 0)),
    hammer: Math.max(0, Number(r.hammerUses || 0)),
    rocket: Math.max(0, Number(r.rocketUses || 0)),
  };

  localStorage.setItem(
    ROOM_STATE_KEY,
    JSON.stringify({
      ...stored,
      booster_shuffle: counts.shuffle,
      booster_hammer: counts.hammer,
      booster_rocket: counts.rocket,
    }),
  );
  window.dispatchEvent(new CustomEvent("chiki-boosters-changed", { detail: counts }));
};

const syncUse = async (kind: BoosterKind) => {
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
      body: JSON.stringify({ p_booster: kind }),
    });
  } catch {
    // Il consumo locale resta valido anche se la sincronizzazione e' temporaneamente offline.
  }
};

const consume = (scene: GameScene, kind: BoosterKind) => {
  const r = runtime(scene);
  if (kind === "shuffle") r.shuffleUses = Math.max(0, r.shuffleUses - 1);
  if (kind === "hammer") r.hammerUses = Math.max(0, r.hammerUses - 1);
  if (kind === "rocket") r.rocketUses = Math.max(0, r.rocketUses - 1);
  persistCounts(scene);
  void syncUse(kind);
};

const finishBoardChange = (scene: GameScene) => {
  const r = runtime(scene);
  r.updateObjectiveAndProgress();
  if (r.isObjectiveComplete()) {
    r.showLevelCompleted();
    return;
  }
  r.collapseTiles();
  scene.time.delayedCall(330, () => {
    r.refillBoard();
    scene.time.delayedCall(360, () => r.checkCascadeMatches());
  });
};

const useHammer = (scene: GameScene, tile: Tile) => {
  const r = runtime(scene);
  if (!tile.circle.active || r.hammerUses <= 0 || r.levelCompleted || r.isProcessing) return;

  consume(scene, "hammer");
  stateFor(scene).active = null;
  clearPrompt(scene);
  r.resetGestureState?.();
  r.selectedTile = null;
  r.isProcessing = true;

  scene.cameras.main.shake(120, 0.004);
  scene.tweens.add({
    targets: tile.circle,
    scaleX: tile.circle.scaleX * 0.55,
    scaleY: tile.circle.scaleY * 0.55,
    alpha: 0.25,
    angle: 18,
    duration: 150,
    ease: "Back.easeIn",
    onComplete: () => {
      if (tile.circle.active) tile.circle.destroy();
      if (r.board[tile.row]?.[tile.col] === tile) r.board[tile.row][tile.col] = null;
      r.damageIceAround([tile]);
      finishBoardChange(scene);
    },
  });
};

const useRocket = (scene: GameScene, target: Tile) => {
  const r = runtime(scene);
  if (r.rocketUses <= 0 || r.levelCompleted || r.isProcessing) return;

  const row = target.row;
  const rowTiles = (r.board[row] || []).filter((tile): tile is Tile => Boolean(tile));
  if (rowTiles.length === 0) return;

  consume(scene, "rocket");
  stateFor(scene).active = null;
  clearPrompt(scene);
  r.resetGestureState?.();
  r.selectedTile = null;
  r.isProcessing = true;

  scene.cameras.main.flash(90, 255, 224, 120, false);
  scene.cameras.main.shake(160, 0.006);
  rowTiles.forEach((tile, index) => {
    scene.time.delayedCall(index * 22, () => {
      if (!tile.circle.active) return;
      scene.tweens.add({
        targets: tile.circle,
        alpha: 0,
        scaleX: tile.circle.scaleX * 1.35,
        scaleY: tile.circle.scaleY * 1.35,
        duration: 120,
        onComplete: () => {
          if (tile.circle.active) tile.circle.destroy();
        },
      });
    });
    if (r.board[row]?.[tile.col] === tile) r.board[row][tile.col] = null;
  });
  r.damageIceAround(rowTiles);
  scene.time.delayedCall(190, () => finishBoardChange(scene));
};

const useShuffle = (scene: GameScene) => {
  const r = runtime(scene);
  if (r.shuffleUses <= 0 || r.levelCompleted || r.isProcessing) return;

  stateFor(scene).active = null;
  clearPrompt(scene);
  r.resetGestureState?.();
  consume(scene, "shuffle");
  r.isProcessing = true;
  scene.cameras.main.shake(180, 0.003);
  scene.time.delayedCall(110, () => r.shuffleBoard());
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
  const before = new Set(this.children.list);
  originalCreateBoosterButton.call(this, x, iconKey, label, action, remaining);
  const created = this.children.list.filter((child) => !before.has(child));
  const zone = created.find((child) => child instanceof Phaser.GameObjects.Zone) as Phaser.GameObjects.Zone | undefined;
  const countText = created.find(
    (child) => child instanceof Phaser.GameObjects.Text && child.text !== label,
  ) as Phaser.GameObjects.Text | undefined;

  if (!zone) return;

  zone.setDepth(100);
  zone.removeAllListeners("pointerup");
  zone.removeAllListeners("pointerdown");

  const updateCount = () => {
    if (countText?.active) countText.setText(String(remaining()));
  };

  zone.on("pointerdown", () => {
    const r = runtime(this);
    if (r.levelCompleted || r.isProcessing) return;

    if (label === "MESCOLA") {
      useShuffle(this);
      updateCount();
      return;
    }

    if (label === "MARTELLO") {
      if (r.hammerUses <= 0) return;
      setHelper(this, "hammer");
      return;
    }

    if (label === "RAZZO") {
      if (r.rocketUses <= 0) return;
      setHelper(this, "rocket");
    }
  });
};

const originalCreateTile = proto.createTile as (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove?: boolean,
) => Tile;

proto.createTile = function (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove = false,
) {
  const tile = originalCreateTile.call(this, row, col, type, fromAbove);
  tile.circle.on("pointerdown", () => {
    const helper = stateFor(this).active;
    if (!helper) return;
    const r = runtime(this);
    if (r.levelCompleted || r.isProcessing) return;

    r.resetGestureState?.();
    if (helper === "hammer") useHammer(this, tile);
    else useRocket(this, tile);
  });
  return tile;
};

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  const state = stateFor(this);
  state.active = null;
  clearPrompt(this);
  originalCreate.call(this);
};
