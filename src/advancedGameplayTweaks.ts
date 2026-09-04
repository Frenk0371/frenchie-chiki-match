import Phaser from "phaser";
import GameScene from "./game/GameScene";
import { levels, type LevelConfig, type ObstacleCellConfig } from "./game/levels";
import { consumeBananaLife, formatLifeTimer, getLifeState, MAX_BANANA_LIVES, timeUntilNextLife } from "./lifeSystem";

type Tile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
};

type ObstacleKind = "chain" | "wood" | "grass" | "snow" | "rock" | "mud";
type AdvancedConfig = LevelConfig & {
  chainCells?: ObstacleCellConfig[];
  woodCells?: ObstacleCellConfig[];
  grassCells?: ObstacleCellConfig[];
  snowCells?: ObstacleCellConfig[];
  rockCells?: ObstacleCellConfig[];
  mudCells?: ObstacleCellConfig[];
  bananaChance?: number;
};

type Obstacle = {
  row: number;
  col: number;
  hits: number;
  maxHits: number;
  graphic: Phaser.GameObjects.Graphics;
};

type BananaMarker = {
  row: number;
  col: number;
  display: Phaser.GameObjects.Text;
};

type AdvancedState = {
  maps: Record<ObstacleKind, Map<string, Obstacle>>;
  totals: Record<ObstacleKind, number>;
  broken: Record<ObstacleKind, number>;
  banana: BananaMarker | null;
  blockedByLives: boolean;
};

const proto = GameScene.prototype as any;
const states = new WeakMap<GameScene, AdvancedState>();
const runtime = (scene: GameScene): any => scene as any;
const kinds: ObstacleKind[] = ["chain", "wood", "grass", "snow", "rock", "mud"];
const labels: Record<ObstacleKind, string> = {
  chain: "CAT",
  wood: "LEGNO",
  grass: "ERBA",
  snow: "NEVE",
  rock: "ROCCE",
  mud: "FANGO",
};

const configFor = (scene: GameScene) => levels[Math.max(0, runtime(scene).currentLevel - 1)] as AdvancedConfig;
const cellKey = (row: number, col: number) => `${row}:${col}`;

const freshState = (): AdvancedState => ({
  maps: {
    chain: new Map(), wood: new Map(), grass: new Map(), snow: new Map(), rock: new Map(), mud: new Map(),
  },
  totals: { chain: 0, wood: 0, grass: 0, snow: 0, rock: 0, mud: 0 },
  broken: { chain: 0, wood: 0, grass: 0, snow: 0, rock: 0, mud: 0 },
  banana: null,
  blockedByLives: false,
});

const stateFor = (scene: GameScene) => {
  let state = states.get(scene);
  if (!state) {
    state = freshState();
    states.set(scene, state);
  }
  return state;
};

const centerFor = (scene: GameScene, row: number, col: number) => {
  const r = runtime(scene);
  const boardWidth = r.cols * r.tileSize;
  const startX = (1080 - boardWidth) / 2;
  return {
    x: startX + col * r.tileSize + r.tileSize / 2,
    y: r.boardY + row * r.tileSize + r.tileSize / 2,
  };
};

const drawObstacle = (scene: GameScene, kind: ObstacleKind, obstacle: Obstacle) => {
  const { x, y } = centerFor(scene, obstacle.row, obstacle.col);
  const g = obstacle.graphic;
  const strong = obstacle.hits > 1;
  g.clear();

  if (kind === "grass") {
    g.fillStyle(strong ? 0x3d982f : 0x5fc44a, strong ? 0.62 : 0.45);
    g.fillRoundedRect(x - 52, y + 15, 104, 36, 16);
    g.lineStyle(strong ? 8 : 6, 0x25751f, 0.95);
    for (let offset = -36; offset <= 36; offset += 18) {
      g.beginPath(); g.moveTo(x + offset, y + 43); g.lineTo(x + offset - 8, y + 8); g.strokePath();
      g.beginPath(); g.moveTo(x + offset, y + 43); g.lineTo(x + offset + 10, y + 12); g.strokePath();
    }
    return;
  }

  if (kind === "snow") {
    g.fillStyle(0xf5fbff, strong ? 0.78 : 0.58);
    g.fillRoundedRect(x - 53, y - 53, 106, 106, 24);
    g.lineStyle(strong ? 8 : 6, 0xb8e5ff, 0.96);
    g.strokeRoundedRect(x - 53, y - 53, 106, 106, 24);
    g.fillStyle(0xffffff, 0.88);
    g.fillCircle(x - 24, y - 30, 12); g.fillCircle(x + 9, y - 36, 15); g.fillCircle(x + 31, y - 24, 10);
    return;
  }

  if (kind === "chain") {
    g.lineStyle(strong ? 13 : 10, strong ? 0x4b5360 : 0x6c7684, 1);
    g.beginPath(); g.moveTo(x - 44, y - 44); g.lineTo(x + 44, y + 44); g.strokePath();
    g.beginPath(); g.moveTo(x + 44, y - 44); g.lineTo(x - 44, y + 44); g.strokePath();
    g.lineStyle(4, 0xc7d0d9, 0.85);
    for (let offset = -30; offset <= 30; offset += 30) {
      g.strokeEllipse(x + offset, y + offset, 26, 16);
      g.strokeEllipse(x - offset, y + offset, 26, 16);
    }
    return;
  }

  if (kind === "wood") {
    g.fillStyle(strong ? 0x87502d : 0xb46f3b, 0.94);
    g.fillRoundedRect(x - 51, y - 45, 102, 35, 8);
    g.fillRoundedRect(x - 51, y + 10, 102, 35, 8);
    g.lineStyle(strong ? 8 : 6, 0x5e321d, 0.95);
    g.strokeRoundedRect(x - 51, y - 45, 102, 35, 8);
    g.strokeRoundedRect(x - 51, y + 10, 102, 35, 8);
    g.lineStyle(4, 0xe0a16a, 0.8);
    g.beginPath(); g.moveTo(x - 38, y - 27); g.lineTo(x + 36, y - 27); g.strokePath();
    g.beginPath(); g.moveTo(x - 36, y + 28); g.lineTo(x + 39, y + 28); g.strokePath();
    return;
  }

  if (kind === "rock") {
    const color = strong ? 0x66707c : 0x8a949f;
    g.fillStyle(color, 0.96);
    g.fillCircle(x - 25, y + 15, 31); g.fillCircle(x + 22, y + 18, 34); g.fillCircle(x, y - 18, 38);
    g.lineStyle(strong ? 8 : 6, 0x414952, 0.96);
    g.strokeCircle(x - 25, y + 15, 31); g.strokeCircle(x + 22, y + 18, 34); g.strokeCircle(x, y - 18, 38);
    g.fillStyle(0xd7dde2, 0.45); g.fillCircle(x - 12, y - 29, 10);
    return;
  }

  g.fillStyle(strong ? 0x70442d : 0x8c5a3b, strong ? 0.82 : 0.68);
  g.fillCircle(x, y + 10, 45); g.fillCircle(x - 31, y - 9, 22); g.fillCircle(x + 32, y - 12, 20);
  g.fillStyle(0xb88058, 0.46); g.fillCircle(x - 12, y - 2, 14);
};

const cellsForKind = (config: AdvancedConfig, kind: ObstacleKind) => {
  if (kind === "chain") return config.chainCells ?? [];
  if (kind === "wood") return config.woodCells ?? [];
  if (kind === "grass") return config.grassCells ?? [];
  if (kind === "snow") return config.snowCells ?? [];
  if (kind === "rock") return config.rockCells ?? [];
  return config.mudCells ?? [];
};

const createAdvancedObstacles = (scene: GameScene) => {
  const r = runtime(scene);
  const state = stateFor(scene);
  const config = configFor(scene);
  kinds.forEach((kind) => {
    state.maps[kind].forEach((item) => item.graphic.destroy());
    state.maps[kind].clear();
    state.broken[kind] = 0;
    const cells = cellsForKind(config, kind);
    state.totals[kind] = cells.length;
    cells.forEach((item) => {
      if (item.row < 0 || item.row >= r.rows || item.col < 0 || item.col >= r.cols) return;
      const hits = Math.max(1, item.hits ?? 1);
      const obstacle: Obstacle = {
        row: item.row, col: item.col, hits, maxHits: hits,
        graphic: scene.add.graphics().setDepth(kind === "grass" || kind === "mud" ? 4 : 7),
      };
      state.maps[kind].set(cellKey(item.row, item.col), obstacle);
      drawObstacle(scene, kind, obstacle);
    });
  });
};

const damageAdvanced = (scene: GameScene, matches: Tile[]) => {
  const r = runtime(scene);
  const state = stateFor(scene);
  const affected = new Set<string>();
  const offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
  matches.forEach((tile) => offsets.forEach(([dr, dc]) => {
    const row = tile.row + dr; const col = tile.col + dc;
    if (row >= 0 && row < r.rows && col >= 0 && col < r.cols) affected.add(cellKey(row, col));
  }));

  kinds.forEach((kind) => affected.forEach((key) => {
    const obstacle = state.maps[kind].get(key);
    if (!obstacle) return;
    obstacle.hits--;
    if (obstacle.hits <= 0) {
      state.maps[kind].delete(key);
      state.broken[kind]++;
      scene.tweens.add({ targets: obstacle.graphic, alpha: 0, scale: 1.15, duration: 180, onComplete: () => obstacle.graphic.destroy() });
    } else drawObstacle(scene, kind, obstacle);
  }));
};

const advancedRemaining = (scene: GameScene) => kinds.reduce((sum, kind) => sum + stateFor(scene).maps[kind].size, 0);
const advancedTotal = (scene: GameScene) => kinds.reduce((sum, kind) => sum + stateFor(scene).totals[kind], 0);

const maybeSpawnBanana = (scene: GameScene, forceChance = false) => {
  const state = stateFor(scene);
  const r = runtime(scene);
  const life = getLifeState();
  if (state.banana || life.lives >= MAX_BANANA_LIVES || r.levelCompleted) return;
  const chance = configFor(scene).bananaChance ?? 0.08;
  if (!forceChance && Math.random() > chance) return;
  const candidates: Tile[] = [];
  for (let row = 0; row < r.rows; row++) for (let col = 0; col < r.cols; col++) {
    const tile = r.board[row]?.[col] as Tile | null | undefined;
    if (tile) candidates.push(tile);
  }
  if (candidates.length === 0) return;
  const tile = Phaser.Utils.Array.GetRandom(candidates);
  const { x, y } = centerFor(scene, tile.row, tile.col);
  const display = scene.add.text(x, y - 2, "🍌", {
    fontFamily: '"Arial", sans-serif', fontSize: "60px", stroke: "#6d4b13", strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 5, color: "#2d1b08", blur: 2, fill: true },
  }).setOrigin(0.5).setDepth(13).setScale(0.15);
  scene.tweens.add({ targets: display, scale: 1, duration: 360, ease: "Back.easeOut" });
  scene.tweens.add({ targets: display, angle: { from: -7, to: 7 }, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  state.banana = { row: tile.row, col: tile.col, display };
};

const collectBananaIfMatched = (scene: GameScene, matches: Tile[]) => {
  const state = stateFor(scene);
  const banana = state.banana;
  if (!banana || !matches.some((tile) => tile.row === banana.row && tile.col === banana.col)) return;
  state.banana = null;
  scene.tweens.killTweensOf(banana.display);
  scene.tweens.add({
    targets: banana.display, y: banana.display.y - 80, scale: 1.5, alpha: 0, duration: 500,
    onComplete: () => banana.display.destroy(),
  });
  const message = scene.add.text(540, 425, "🍌 +1 VITA!", {
    fontFamily: '"Lilita One", "Fredoka", sans-serif', fontSize: "48px", color: "#fff27a",
    stroke: "#5b3510", strokeThickness: 8,
  }).setOrigin(0.5).setDepth(30).setScale(0.6);
  scene.tweens.add({ targets: message, scale: 1, y: 395, duration: 300, ease: "Back.easeOut", yoyo: true, hold: 450, onComplete: () => message.destroy() });
  window.dispatchEvent(new CustomEvent("chiki-banana-life", { detail: { level: rCurrentLevel(scene) } }));
};

const rCurrentLevel = (scene: GameScene) => Number(runtime(scene).currentLevel || 1);

const showNoLives = (scene: GameScene) => {
  const state = stateFor(scene);
  const r = runtime(scene);
  if (getLifeState().lives > 0) return;
  state.blockedByLives = true;
  r.levelCompleted = true;
  const shade = scene.add.rectangle(540, 960, 1080, 1920, 0x071322, 0.86).setDepth(60);
  const panel = scene.add.graphics().setDepth(61);
  panel.fillStyle(0x5a321f, 1); panel.fillRoundedRect(180, 600, 720, 520, 55);
  panel.lineStyle(12, 0xffe785, 1); panel.strokeRoundedRect(180, 600, 720, 520, 55);
  const title = scene.add.text(540, 715, "🍌 BANANE FINITE", {
    fontFamily: '"Lilita One", "Fredoka", sans-serif', fontSize: "64px", color: "#fff5bf", stroke: "#351a10", strokeThickness: 9,
  }).setOrigin(0.5).setDepth(62);
  const timer = scene.add.text(540, 850, "", {
    fontFamily: '"Lilita One", "Fredoka", sans-serif', fontSize: "46px", color: "#ffe15a", align: "center", stroke: "#351a10", strokeThickness: 7,
  }).setOrigin(0.5).setDepth(62);
  const hint = scene.add.text(540, 1010, "UNA NUOVA VITA OGNI 15 MINUTI\noppure torna alla mappa", {
    fontFamily: '"Fredoka", sans-serif', fontSize: "30px", color: "#ffffff", align: "center", fontStyle: "bold",
  }).setOrigin(0.5).setDepth(62);

  const updater = scene.time.addEvent({
    delay: 1000, loop: true,
    callback: () => {
      const life = getLifeState();
      if (life.lives > 0) {
        updater.destroy();
        shade.destroy(); panel.destroy(); title.destroy(); timer.destroy(); hint.destroy();
        state.blockedByLives = false;
        r.levelCompleted = false;
        maybeSpawnBanana(scene);
        return;
      }
      timer.setText(`PROSSIMA 🍌 TRA\n${formatLifeTimer(timeUntilNextLife())}`);
    },
  });
  timer.setText(`PROSSIMA 🍌 TRA\n${formatLifeTimer(timeUntilNextLife())}`);
};

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  states.set(this, freshState());
  originalCreate.call(this);
  createAdvancedObstacles(this);
  runtime(this).updateObjectiveAndProgress();
  if (getLifeState().lives <= 0) showNoLives(this);
  else this.time.delayedCall(650, () => maybeSpawnBanana(this, Math.random() < 0.18));
};

const originalProcessMatches = proto.processMatches as (this: GameScene, matches: Tile[], cascade: boolean) => void;
proto.processMatches = function (this: GameScene, matches: Tile[], cascade: boolean) {
  collectBananaIfMatched(this, matches);
  damageAdvanced(this, matches);
  originalProcessMatches.call(this, matches, cascade);
  if (!cascade) this.time.delayedCall(900, () => maybeSpawnBanana(this));
};

const originalComplete = proto.isObjectiveComplete as (this: GameScene) => boolean;
proto.isObjectiveComplete = function (this: GameScene) {
  return originalComplete.call(this) && advancedRemaining(this) === 0;
};

const originalUpdate = proto.updateObjectiveAndProgress as (this: GameScene) => void;
proto.updateObjectiveAndProgress = function (this: GameScene) {
  originalUpdate.call(this);
  const r = runtime(this);
  const total = advancedTotal(this);
  if (!r.progressFill || total <= 0) return;
  const remaining = advancedRemaining(this);
  const extraRatio = (total - remaining) / Math.max(1, total);
  const baseRatio = Phaser.Math.Clamp(Number(r.progressFill.width || 0) / 600, 0, 1);
  r.progressFill.width = 600 * ((baseRatio + extraRatio) / 2);
};

const originalLabel = proto.getObjectiveLabel as (this: GameScene) => string;
proto.getObjectiveLabel = function (this: GameScene) {
  const base = originalLabel.call(this);
  const state = stateFor(this);
  const active = kinds
    .map((kind) => ({ kind, left: state.maps[kind].size }))
    .filter((item) => item.left > 0)
    .slice(0, 2);
  if (active.length === 0) return base;
  return `${base}\n${active.map((item) => `${labels[item.kind]} ${item.left}`).join(" · ")}`;
};

const originalFailed = proto.showLevelFailed as (this: GameScene) => void;
proto.showLevelFailed = function (this: GameScene) {
  const r = runtime(this);
  if (!r.levelCompleted) consumeBananaLife();
  originalFailed.call(this);
};
