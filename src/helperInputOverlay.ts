import Phaser from "phaser";
import GameScene from "./game/GameScene";

type HelperKind = "hammer" | "rocket" | null;
type BoosterKind = "shuffle" | "hammer" | "rocket";

type Tile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
};

type RuntimeScene = {
  rows: number;
  cols: number;
  tileSize: number;
  boardY: number;
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
  resetGestureState?: () => void;
};

type State = {
  active: HelperKind;
  prompt: Phaser.GameObjects.Text | null;
  overlays: Phaser.GameObjects.Zone[];
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
    state = { active: null, prompt: null, overlays: [] };
    states.set(scene, state);
  }
  return state;
};

const clearPrompt = (scene: GameScene) => {
  const state = stateFor(scene);
  if (state.prompt?.active) state.prompt.destroy();
  state.prompt = null;
};

const toast = (scene: GameScene, text: string, color = "#fff6cf") => {
  const label = scene.add.text(540, 1370, text, {
    fontFamily: '"Lilita One", "Fredoka", sans-serif',
    fontSize: "34px",
    color,
    stroke: "#442054",
    strokeThickness: 8,
    backgroundColor: "#7b35a8",
    padding: { x: 22, y: 12 },
  }).setOrigin(0.5).setDepth(1200).setScale(0.65);
  scene.tweens.add({ targets: label, scale: 1, duration: 180, ease: "Back.easeOut" });
  scene.time.delayedCall(900, () => {
    if (!label.active) return;
    scene.tweens.add({ targets: label, alpha: 0, y: label.y - 30, duration: 180, onComplete: () => label.destroy() });
  });
};

const setHelper = (scene: GameScene, helper: Exclude<HelperKind, null>) => {
  const r = runtime(scene);
  const state = stateFor(scene);
  state.active = helper;
  r.isProcessing = true;
  r.resetGestureState?.();
  if (r.selectedTile?.circle.active) r.selectedTile.circle.setDisplaySize(116, 116);
  r.selectedTile = null;
  clearPrompt(scene);
  const text = helper === "hammer" ? "🔨 TOCCA LA PEDINA DA ROMPERE" : "🚀 TOCCA LA PEDINA BERSAGLIO";
  state.prompt = scene.add.text(540, 1370, text, {
    fontFamily: '"Lilita One", "Fredoka", sans-serif',
    fontSize: "32px",
    color: "#fff6cf",
    stroke: "#442054",
    strokeThickness: 8,
    backgroundColor: "#7b35a8",
    padding: { x: 20, y: 11 },
  }).setOrigin(0.5).setDepth(1200).setScale(0.7);
  scene.tweens.add({ targets: state.prompt, scale: 1, duration: 190, ease: "Back.easeOut" });
};

const persistCounts = (scene: GameScene) => {
  const r = runtime(scene);
  let stored: Record<string, unknown> = {};
  try { stored = JSON.parse(localStorage.getItem(ROOM_STATE_KEY) || "{}") as Record<string, unknown>; } catch { stored = {}; }
  const counts = {
    shuffle: Math.max(0, Number(r.shuffleUses || 0)),
    hammer: Math.max(0, Number(r.hammerUses || 0)),
    rocket: Math.max(0, Number(r.rocketUses || 0)),
  };
  localStorage.setItem(ROOM_STATE_KEY, JSON.stringify({
    ...stored,
    booster_shuffle: counts.shuffle,
    booster_hammer: counts.hammer,
    booster_rocket: counts.rocket,
  }));
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
    // il consumo locale resta valido anche offline
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

const puff = (scene: GameScene, x: number, y: number) => {
  const c = scene.add.circle(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8), Phaser.Math.Between(14, 25), 0xffffff, 0.88).setDepth(1190).setScale(0.35);
  scene.tweens.add({
    targets: c,
    x: c.x + Phaser.Math.Between(-25, 25),
    y: c.y + Phaser.Math.Between(-25, 25),
    scale: Phaser.Math.FloatBetween(1.2, 1.9),
    alpha: 0,
    duration: Phaser.Math.Between(320, 520),
    onComplete: () => c.destroy(),
  });
};

const hammerAction = (scene: GameScene, tile: Tile) => {
  const r = runtime(scene);
  if (!tile.circle.active || r.hammerUses <= 0 || r.levelCompleted) {
    r.isProcessing = false;
    return;
  }
  consume(scene, "hammer");
  stateFor(scene).active = null;
  clearPrompt(scene);

  const x = tile.circle.x;
  const y = tile.circle.y;
  const hammer = scene.add.image(x + 125, y - 210, "booster-hammer").setDisplaySize(300, 300).setDepth(1210).setAngle(-45);
  const shadow = scene.add.ellipse(x, y + 38, 150, 42, 0x000000, 0.32).setDepth(1180).setScale(0.2);
  scene.tweens.add({ targets: shadow, scale: 1, alpha: 0.48, duration: 180 });
  scene.tweens.add({
    targets: hammer,
    x: x + 22,
    y: y - 12,
    angle: 38,
    duration: 320,
    ease: "Cubic.easeIn",
    onComplete: () => {
      scene.cameras.main.shake(170, 0.008);
      scene.cameras.main.flash(80, 255, 228, 130, false);
      for (let i = 0; i < 8; i++) puff(scene, x, y);
      if (tile.circle.active) {
        scene.tweens.add({ targets: tile.circle, scaleX: tile.circle.scaleX * 0.55, scaleY: tile.circle.scaleY * 0.55, alpha: 0.15, duration: 120, onComplete: () => tile.circle.active && tile.circle.destroy() });
      }
      if (r.board[tile.row]?.[tile.col] === tile) r.board[tile.row][tile.col] = null;
      r.damageIceAround([tile]);
      scene.time.delayedCall(130, () => finishBoardChange(scene));
      scene.tweens.add({ targets: hammer, x: x + 150, y: y - 180, alpha: 0, angle: -20, duration: 220, onComplete: () => hammer.destroy() });
      scene.tweens.add({ targets: shadow, alpha: 0, scale: 0.2, duration: 180, onComplete: () => shadow.destroy() });
    },
  });
};

const rocketAction = (scene: GameScene, tile: Tile) => {
  const r = runtime(scene);
  if (r.rocketUses <= 0 || r.levelCompleted) {
    r.isProcessing = false;
    return;
  }
  const row = tile.row;
  const targets = (r.board[row] || []).filter((t): t is Tile => Boolean(t));
  if (!targets.length) {
    r.isProcessing = false;
    return;
  }

  consume(scene, "rocket");
  stateFor(scene).active = null;
  clearPrompt(scene);
  const targetX = tile.circle.x;
  const targetY = tile.circle.y;
  const startX = 810;
  const startY = 1535;
  const rocket = scene.add.image(startX, startY, "booster-rocket").setDisplaySize(185, 185).setDepth(1210);
  const angle = Math.atan2(targetY - startY, targetX - startX);
  rocket.setAngle((angle * 180) / Math.PI + 90);
  const smoke = scene.time.addEvent({
    delay: 28,
    loop: true,
    callback: () => {
      if (!rocket.active) return;
      puff(scene, rocket.x - Math.cos(angle) * 55, rocket.y - Math.sin(angle) * 55);
    },
  });
  scene.tweens.add({
    targets: rocket,
    x: targetX,
    y: targetY,
    duration: 560,
    ease: "Cubic.easeIn",
    onComplete: () => {
      smoke.remove(false);
      rocket.destroy();
      scene.cameras.main.shake(180, 0.006);
      scene.cameras.main.flash(90, 255, 220, 120, false);
      for (let i = 0; i < 12; i++) puff(scene, targetX, targetY);
      targets.forEach((t, index) => {
        if (r.board[row]?.[t.col] === t) r.board[row][t.col] = null;
        scene.time.delayedCall(index * 24, () => {
          if (!t.circle.active) return;
          scene.tweens.add({ targets: t.circle, alpha: 0, scaleX: t.circle.scaleX * 1.25, scaleY: t.circle.scaleY * 1.25, duration: 110, onComplete: () => t.circle.active && t.circle.destroy() });
        });
      });
      r.damageIceAround(targets);
      scene.time.delayedCall(220, () => finishBoardChange(scene));
    },
  });
};

const shuffleAction = (scene: GameScene) => {
  const r = runtime(scene);
  if (r.shuffleUses <= 0 || r.levelCompleted || r.isProcessing) return;
  consume(scene, "shuffle");
  stateFor(scene).active = null;
  clearPrompt(scene);
  r.resetGestureState?.();
  r.isProcessing = true;
  const icon = scene.add.image(540, 875, "booster-shuffle").setDisplaySize(350, 350).setDepth(1210).setAlpha(0).setScale(0.35);
  const halo = scene.add.circle(540, 875, 185, 0x6bdcff, 0.22).setStrokeStyle(14, 0xffef8f, 0.95).setDepth(1200).setScale(0.4);
  scene.tweens.add({ targets: icon, alpha: 1, scale: 1, duration: 180, ease: "Back.easeOut" });
  scene.tweens.add({ targets: halo, alpha: 0.75, scale: 1, duration: 180, ease: "Back.easeOut" });
  scene.tweens.add({ targets: icon, angle: 1080, duration: 820, ease: "Cubic.easeInOut" });
  scene.tweens.add({ targets: halo, angle: -720, scale: 1.28, duration: 820, ease: "Cubic.easeInOut" });
  scene.cameras.main.shake(720, 0.0015);
  scene.time.delayedCall(640, () => {
    r.shuffleBoard();
    scene.tweens.add({ targets: [icon, halo], alpha: 0, scale: 1.45, duration: 200, onComplete: () => { icon.destroy(); halo.destroy(); } });
  });
};

const countFor = (scene: GameScene, kind: BoosterKind) => {
  const r = runtime(scene);
  if (kind === "shuffle") return r.shuffleUses;
  if (kind === "hammer") return r.hammerUses;
  return r.rocketUses;
};

const handleButton = (scene: GameScene, kind: BoosterKind) => {
  const r = runtime(scene);
  if (r.levelCompleted) return;
  if (countFor(scene, kind) <= 0) {
    if (stateFor(scene).active) {
      stateFor(scene).active = null;
      clearPrompt(scene);
      r.isProcessing = false;
    }
    toast(scene, kind === "hammer" ? "🔨 MARTELLI FINITI" : kind === "rocket" ? "🚀 RAZZI FINITI" : "🔀 MESCOLA FINITA", "#ffe8e8");
    return;
  }
  if (kind === "shuffle") {
    if (stateFor(scene).active) {
      stateFor(scene).active = null;
      clearPrompt(scene);
      r.isProcessing = false;
    }
    shuffleAction(scene);
    return;
  }
  setHelper(scene, kind);
};

const installOverlays = (scene: GameScene) => {
  const state = stateFor(scene);
  state.overlays.forEach((zone) => zone.destroy());
  state.overlays = [];
  (scene.input as any).topOnly = true;

  const defs: Array<[number, BoosterKind]> = [[270, "shuffle"], [540, "hammer"], [810, "rocket"]];
  defs.forEach(([x, kind]) => {
    const zone = scene.add.zone(x, 1540, 230, 155).setInteractive({ useHandCursor: true }).setDepth(2000);
    zone.on("pointerdown", (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: any) => {
      event?.stopPropagation?.();
      handleButton(scene, kind);
    });
    state.overlays.push(zone);
  });

  const targetHandler = (pointer: Phaser.Input.Pointer) => {
    const active = stateFor(scene).active;
    if (!active) return;
    const r = runtime(scene);
    const boardWidth = r.cols * r.tileSize;
    const startX = (1080 - boardWidth) / 2;
    const col = Math.floor((pointer.x - startX) / r.tileSize);
    const row = Math.floor((pointer.y - r.boardY) / r.tileSize);
    if (row < 0 || row >= r.rows || col < 0 || col >= r.cols) return;
    const tile = r.board[row]?.[col] ?? null;
    if (!tile || !tile.circle.active) return;
    if (active === "hammer") hammerAction(scene, tile);
    else rocketAction(scene, tile);
  };

  scene.input.on("pointerdown", targetHandler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off("pointerdown", targetHandler);
    stateFor(scene).overlays.forEach((zone) => zone.destroy());
    stateFor(scene).overlays = [];
    clearPrompt(scene);
  });
};

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  const state = stateFor(this);
  state.active = null;
  clearPrompt(this);
  originalCreate.call(this);
  installOverlays(this);
};
