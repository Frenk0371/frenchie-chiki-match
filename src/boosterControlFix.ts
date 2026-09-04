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
  counters: Partial<Record<BoosterKind, Phaser.GameObjects.Text>>;
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
    state = { active: null, prompt: null, counters: {} };
    states.set(scene, state);
  }
  return state;
};

const clearPrompt = (scene: GameScene) => {
  const state = stateFor(scene);
  if (state.prompt?.active) state.prompt.destroy();
  state.prompt = null;
};

const boosterKindForLabel = (label: string): BoosterKind | null => {
  if (label === "MESCOLA") return "shuffle";
  if (label === "MARTELLO") return "hammer";
  if (label === "RAZZO") return "rocket";
  return null;
};

const refreshCounter = (scene: GameScene, kind: BoosterKind) => {
  const r = runtime(scene);
  const counter = stateFor(scene).counters[kind];
  if (!counter?.active) return;
  const value = kind === "shuffle" ? r.shuffleUses : kind === "hammer" ? r.hammerUses : r.rocketUses;
  counter.setText(String(Math.max(0, value)));
};

const setHelper = (scene: GameScene, helper: Exclude<HelperKind, null>) => {
  const state = stateFor(scene);
  state.active = helper;
  clearPrompt(scene);
  const label = helper === "hammer" ? "🔨 TOCCA LA PEDINA DA ROMPERE" : "🚀 TOCCA LA PEDINA BERSAGLIO";
  state.prompt = scene.add
    .text(540, 1364, label, {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "31px",
      color: "#fff6cf",
      stroke: "#442054",
      strokeThickness: 7,
      backgroundColor: "#7b35a8",
      padding: { x: 20, y: 11 },
    })
    .setOrigin(0.5)
    .setDepth(140)
    .setScale(0.7);
  scene.tweens.add({ targets: state.prompt, scale: 1, duration: 180, ease: "Back.easeOut" });
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
  refreshCounter(scene, kind);
  persistCounts(scene);
  void syncUse(kind);
};

const smokePuff = (scene: GameScene, x: number, y: number, dark = false) => {
  const color = dark
    ? Phaser.Utils.Array.GetRandom([0x111216, 0x202228, 0x34363c, 0x4a4545])
    : Phaser.Utils.Array.GetRandom([0xffffff, 0xf5f8fc, 0xe4ebf2, 0xcfdbe6]);
  const puff = scene.add
    .circle(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8), Phaser.Math.Between(15, 27), color, dark ? 0.82 : 0.92)
    .setDepth(122)
    .setScale(0.35);
  scene.tweens.add({
    targets: puff,
    x: puff.x + Phaser.Math.Between(-35, 35),
    y: puff.y + Phaser.Math.Between(-28, 24),
    scale: dark ? Phaser.Math.FloatBetween(1.6, 2.35) : Phaser.Math.FloatBetween(1.25, 1.95),
    alpha: 0,
    duration: dark ? Phaser.Math.Between(500, 760) : Phaser.Math.Between(360, 560),
    ease: "Cubic.easeOut",
    onComplete: () => puff.destroy(),
  });
};

const impactBurst = (scene: GameScene, x: number, y: number, dark = false) => {
  const ring = scene.add
    .circle(x, y, 30, dark ? 0xff8a35 : 0xffe56c, 0.2)
    .setStrokeStyle(10, dark ? 0xffa248 : 0xfff3a3, 0.95)
    .setDepth(123);
  scene.tweens.add({
    targets: ring,
    scale: dark ? 4.2 : 3.1,
    alpha: 0,
    duration: dark ? 430 : 320,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy(),
  });
  for (let i = 0; i < (dark ? 18 : 9); i++) {
    scene.time.delayedCall(i * 12, () => smokePuff(scene, x, y, dark));
  }
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

const animateHammer = (scene: GameScene, tile: Tile, done: () => void) => {
  const x = tile.circle.x;
  const y = tile.circle.y;
  const hammer = scene.add
    .image(x + 120, y - 225, "booster-hammer")
    .setDisplaySize(300, 300)
    .setDepth(135)
    .setAngle(-48)
    .setScale(0.82);
  const shadow = scene.add.ellipse(x, y + 38, 150, 42, 0x000000, 0.28).setDepth(119).setScale(0.3);

  scene.tweens.add({ targets: shadow, scaleX: 1, scaleY: 1, alpha: 0.48, duration: 220 });
  scene.tweens.add({
    targets: hammer,
    x: x + 10,
    y: y - 12,
    angle: 44,
    scale: 1.06,
    duration: 300,
    ease: "Cubic.easeIn",
    onComplete: () => {
      scene.cameras.main.shake(170, 0.009);
      scene.cameras.main.flash(75, 255, 232, 145, false);
      impactBurst(scene, x, y, false);
      if (tile.circle.active) {
        scene.tweens.add({
          targets: tile.circle,
          scaleX: tile.circle.scaleX * 0.62,
          scaleY: tile.circle.scaleY * 0.62,
          angle: Phaser.Math.Between(-12, 12),
          duration: 85,
        });
      }
      scene.time.delayedCall(100, done);
      scene.tweens.add({
        targets: hammer,
        x: x + 140,
        y: y - 185,
        angle: -30,
        alpha: 0,
        duration: 230,
        ease: "Cubic.easeOut",
        onComplete: () => hammer.destroy(),
      });
      scene.tweens.add({ targets: shadow, alpha: 0, scale: 0.2, duration: 190, onComplete: () => shadow.destroy() });
    },
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

  animateHammer(scene, tile, () => {
    if (tile.circle.active) tile.circle.destroy();
    if (r.board[tile.row]?.[tile.col] === tile) r.board[tile.row][tile.col] = null;
    r.damageIceAround([tile]);
    finishBoardChange(scene);
  });
};

const animateRocketToTarget = (scene: GameScene, target: Tile, done: () => void) => {
  const targetX = target.circle.x;
  const targetY = target.circle.y;
  const startX = 810;
  const startY = 1535;
  const rocket = scene.add
    .image(startX, startY, "booster-rocket")
    .setDisplaySize(205, 205)
    .setDepth(136);
  const angle = Math.atan2(targetY - startY, targetX - startX);
  rocket.setAngle((angle * 180) / Math.PI + 90);

  const smoke = scene.time.addEvent({
    delay: 26,
    loop: true,
    callback: () => {
      if (!rocket.active) return;
      smokePuff(scene, rocket.x - Math.cos(angle) * 62, rocket.y - Math.sin(angle) * 62, false);
    },
  });

  scene.tweens.add({
    targets: rocket,
    x: targetX,
    y: targetY,
    duration: 600,
    ease: "Cubic.easeIn",
    onComplete: () => {
      smoke.remove(false);
      scene.cameras.main.shake(180, 0.007);
      scene.cameras.main.flash(90, 255, 224, 130, false);
      impactBurst(scene, targetX, targetY, false);
      rocket.destroy();
      scene.time.delayedCall(90, done);
    },
  });
};

const useRocket = (scene: GameScene, target: Tile) => {
  const r = runtime(scene);
  if (r.rocketUses <= 0 || r.levelCompleted || r.isProcessing || !target.circle.active) return;

  const row = target.row;
  const rowTiles = (r.board[row] || []).filter((tile): tile is Tile => Boolean(tile));
  if (rowTiles.length === 0) return;

  consume(scene, "rocket");
  stateFor(scene).active = null;
  clearPrompt(scene);
  r.resetGestureState?.();
  r.selectedTile = null;
  r.isProcessing = true;

  animateRocketToTarget(scene, target, () => {
    rowTiles.forEach((tile, index) => {
      scene.time.delayedCall(index * 28, () => {
        if (!tile.circle.active) return;
        smokePuff(scene, tile.circle.x, tile.circle.y, false);
        scene.tweens.add({
          targets: tile.circle,
          alpha: 0,
          scaleX: tile.circle.scaleX * 1.35,
          scaleY: tile.circle.scaleY * 1.35,
          duration: 135,
          onComplete: () => {
            if (tile.circle.active) tile.circle.destroy();
          },
        });
      });
      if (r.board[row]?.[tile.col] === tile) r.board[row][tile.col] = null;
    });
    r.damageIceAround(rowTiles);
    scene.time.delayedCall(250, () => finishBoardChange(scene));
  });
};

const animateShuffle = (scene: GameScene, done: () => void) => {
  const icon = scene.add
    .image(540, 880, "booster-shuffle")
    .setDisplaySize(360, 360)
    .setDepth(134)
    .setAlpha(0)
    .setScale(0.35);
  const halo = scene.add
    .circle(540, 880, 190, 0x5edcff, 0.2)
    .setStrokeStyle(14, 0xfff09a, 0.92)
    .setDepth(133)
    .setScale(0.35);

  scene.tweens.add({ targets: icon, alpha: 1, scale: 1, duration: 180, ease: "Back.easeOut" });
  scene.tweens.add({ targets: halo, alpha: 0.7, scale: 1, duration: 180, ease: "Back.easeOut" });
  scene.tweens.add({ targets: icon, angle: 1080, duration: 860, ease: "Cubic.easeInOut" });
  scene.tweens.add({ targets: halo, angle: -720, scale: 1.28, duration: 860, ease: "Cubic.easeInOut" });
  scene.cameras.main.shake(760, 0.0018);

  scene.time.delayedCall(680, done);
  scene.time.delayedCall(760, () => {
    scene.tweens.add({
      targets: [icon, halo],
      alpha: 0,
      scale: 1.45,
      duration: 180,
      onComplete: () => {
        if (icon.active) icon.destroy();
        if (halo.active) halo.destroy();
      },
    });
  });
};

const useShuffle = (scene: GameScene) => {
  const r = runtime(scene);
  if (r.shuffleUses <= 0 || r.levelCompleted || r.isProcessing) return;

  stateFor(scene).active = null;
  clearPrompt(scene);
  r.resetGestureState?.();
  consume(scene, "shuffle");
  r.isProcessing = true;

  animateShuffle(scene, () => {
    r.shuffleBoard();
    r.isProcessing = true;
    scene.time.delayedCall(220, () => {
      if (!r.levelCompleted) r.isProcessing = false;
    });
  });
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

  const kind = boosterKindForLabel(label);
  if (kind && countText) stateFor(this).counters[kind] = countText;

  zone.setDepth(150);
  zone.removeAllListeners("pointerup");
  zone.removeAllListeners("pointerdown");

  zone.on("pointerdown", () => {
    const r = runtime(this);
    if (r.levelCompleted || r.isProcessing) return;

    if (label === "MESCOLA") {
      useShuffle(this);
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
  state.counters = {};
  clearPrompt(this);
  originalCreate.call(this);
};
