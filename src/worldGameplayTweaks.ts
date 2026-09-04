import Phaser from "phaser";
import GameScene from "./game/GameScene";
import { levels, type BoosterKind, type LevelConfig } from "./game/levels";

type RuntimeTile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
};

type RuntimeObstacle = {
  row: number;
  col: number;
  hits: number;
  maxHits: number;
  graphic: Phaser.GameObjects.Graphics;
};

type ExtraState = {
  crates: Map<string, RuntimeObstacle>;
  crateBroken: number;
  crateTotal: number;
  boosters: Map<BoosterKind, number>;
};

type SceneRuntime = GameScene & {
  currentLevel: number;
  rows: number;
  cols: number;
  tileSize: number;
  boardY: number;
  board: (RuntimeTile | null)[][];
  selectedTile: RuntimeTile | null;
  levelCompleted: boolean;
  isProcessing: boolean;
  score: number;
  collectedAmount: number;
  collectedAmount2: number;
  targetScore: number;
  objectiveText: Phaser.GameObjects.Text;
  progressFill: Phaser.GameObjects.Rectangle;
  iceCells: Map<string, RuntimeObstacle>;
  iceBrokenCells: number;
  iceTotalCells: number;
  damageIceAround: (tiles: RuntimeTile[]) => void;
  drawIceCell: (cell: RuntimeObstacle) => void;
  shuffleBoard: () => void;
  collapseTiles: () => void;
  refillBoard: () => void;
  checkCascadeMatches: () => void;
  showLevelCompleted: () => void;
  createBoosterTray: () => void;
  processMatches: (matches: RuntimeTile[], cascade: boolean) => void;
  updateObjectiveAndProgress: () => void;
  getObjectiveLabel: () => string;
  isObjectiveComplete: () => boolean;
  create: () => void;
};

const runtimePrototype = GameScene.prototype as unknown as Record<string, unknown>;
const extraStates = new WeakMap<GameScene, ExtraState>();

const getScene = (scene: GameScene) => scene as unknown as SceneRuntime;

const getConfig = (scene: GameScene): LevelConfig => {
  const runtime = getScene(scene);
  return levels[Math.max(0, runtime.currentLevel - 1)];
};

const buildState = (scene: GameScene): ExtraState => {
  const config = getConfig(scene);
  return {
    crates: new Map<string, RuntimeObstacle>(),
    crateBroken: 0,
    crateTotal: config.crateCells?.length ?? 0,
    boosters: new Map(config.boosters.map((booster) => [booster.kind, booster.uses])),
  };
};

const getState = (scene: GameScene): ExtraState => {
  let state = extraStates.get(scene);
  if (!state) {
    state = buildState(scene);
    extraStates.set(scene, state);
  }
  return state;
};

const keyFor = (row: number, col: number) => `${row}:${col}`;

const cellCenter = (scene: GameScene, row: number, col: number) => {
  const runtime = getScene(scene);
  const boardWidth = runtime.cols * runtime.tileSize;
  const startX = (1080 - boardWidth) / 2;
  return {
    x: startX + col * runtime.tileSize + runtime.tileSize / 2,
    y: runtime.boardY + row * runtime.tileSize + runtime.tileSize / 2,
  };
};

const drawCrate = (scene: GameScene, cell: RuntimeObstacle) => {
  const { x, y } = cellCenter(scene, cell.row, cell.col);
  const strong = cell.maxHits > 1 && cell.hits > 1;
  const graphic = cell.graphic;

  graphic.clear();
  graphic.fillStyle(strong ? 0x8a4b22 : 0xb96d32, strong ? 0.93 : 0.84);
  graphic.fillRoundedRect(x - 48, y - 48, 96, 96, 14);
  graphic.lineStyle(strong ? 8 : 6, 0x5b2c16, 0.96);
  graphic.strokeRoundedRect(x - 48, y - 48, 96, 96, 14);
  graphic.lineStyle(9, 0xe6a15b, 0.88);
  graphic.beginPath();
  graphic.moveTo(x - 34, y - 34);
  graphic.lineTo(x + 34, y + 34);
  graphic.moveTo(x + 34, y - 34);
  graphic.lineTo(x - 34, y + 34);
  graphic.strokePath();
  graphic.fillStyle(0xffd08a, 0.62);
  graphic.fillRoundedRect(x - 36, y - 39, 46, 8, 4);
};

const createCrates = (scene: GameScene) => {
  const runtime = getScene(scene);
  const state = getState(scene);
  const config = getConfig(scene);

  state.crates.forEach((crate) => crate.graphic.destroy());
  state.crates.clear();
  state.crateBroken = 0;
  state.crateTotal = config.crateCells?.length ?? 0;

  config.crateCells?.forEach((crateConfig) => {
    if (
      crateConfig.row < 0 ||
      crateConfig.row >= runtime.rows ||
      crateConfig.col < 0 ||
      crateConfig.col >= runtime.cols
    ) return;

    const hits = Math.max(1, crateConfig.hits ?? 1);
    const crate: RuntimeObstacle = {
      row: crateConfig.row,
      col: crateConfig.col,
      hits,
      maxHits: hits,
      graphic: scene.add.graphics().setDepth(5),
    };
    state.crates.set(keyFor(crate.row, crate.col), crate);
    drawCrate(scene, crate);
  });
};

const hitCrate = (scene: GameScene, crateKey: string) => {
  const state = getState(scene);
  const crate = state.crates.get(crateKey);
  if (!crate) return false;

  crate.hits--;
  if (crate.hits <= 0) {
    state.crateBroken++;
    state.crates.delete(crateKey);
    scene.tweens.add({
      targets: crate.graphic,
      alpha: 0,
      duration: 150,
      onComplete: () => crate.graphic.destroy(),
    });
    scene.cameras.main.shake(60, 0.0012);
  } else {
    drawCrate(scene, crate);
  }
  return true;
};

const damageCratesAround = (scene: GameScene, tiles: RuntimeTile[]) => {
  const runtime = getScene(scene);
  const state = getState(scene);
  if (state.crates.size === 0) return;

  const affected = new Set<string>();
  const offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];

  tiles.forEach((tile) => {
    offsets.forEach(([dr, dc]) => {
      const row = tile.row + dr;
      const col = tile.col + dc;
      if (row >= 0 && row < runtime.rows && col >= 0 && col < runtime.cols) {
        affected.add(keyFor(row, col));
      }
    });
  });

  affected.forEach((crateKey) => hitCrate(scene, crateKey));
};

const hitIceDirect = (scene: GameScene, iceKey: string) => {
  const runtime = getScene(scene);
  const cell = runtime.iceCells.get(iceKey);
  if (!cell) return false;

  cell.hits--;
  if (cell.hits <= 0) {
    runtime.iceBrokenCells++;
    runtime.iceCells.delete(iceKey);
    scene.tweens.add({
      targets: cell.graphic,
      alpha: 0,
      duration: 150,
      onComplete: () => cell.graphic.destroy(),
    });
  } else {
    runtime.drawIceCell(cell);
  }
  return true;
};

const finishBoosterAction = (scene: GameScene) => {
  const runtime = getScene(scene);
  runtime.updateObjectiveAndProgress();
  if (runtime.isObjectiveComplete()) {
    runtime.showLevelCompleted();
    return;
  }
  runtime.collapseTiles();
  scene.time.delayedCall(320, () => {
    runtime.refillBoard();
    scene.time.delayedCall(350, () => runtime.checkCascadeMatches());
  });
};

const destroyTiles = (scene: GameScene, tiles: RuntimeTile[]) => {
  const runtime = getScene(scene);
  const unique = Array.from(new Set(tiles));
  if (unique.length === 0) return false;

  runtime.isProcessing = true;
  runtime.damageIceAround(unique);
  damageCratesAround(scene, unique);

  unique.forEach((tile) => {
    if (runtime.board[tile.row]?.[tile.col] !== tile) return;
    tile.circle.destroy();
    runtime.board[tile.row][tile.col] = null;
  });

  finishBoosterAction(scene);
  return true;
};

const getUses = (scene: GameScene, kind: BoosterKind) => getState(scene).boosters.get(kind) ?? 0;

const consume = (scene: GameScene, kind: BoosterKind) => {
  const state = getState(scene);
  const uses = state.boosters.get(kind) ?? 0;
  if (uses <= 0) return false;
  state.boosters.set(kind, uses - 1);
  return true;
};

const boosterLabel = (kind: BoosterKind) => {
  if (kind === "shuffle") return "MESCOLA";
  if (kind === "hammer") return "MARTELLO";
  if (kind === "rocket") return "RAZZO";
  if (kind === "bomb") return "BOMBA";
  return "SCIOGLI";
};

const drawCustomBooster = (scene: GameScene, x: number, y: number, kind: BoosterKind) => {
  if (kind === "shuffle" || kind === "hammer" || kind === "rocket") {
    scene.add.image(x, y, `booster-${kind}`).setDisplaySize(102, 102);
    return;
  }

  const graphic = scene.add.graphics();
  if (kind === "bomb") {
    graphic.fillStyle(0x30313a, 1);
    graphic.fillCircle(x, y + 7, 39);
    graphic.lineStyle(6, 0x111219, 1);
    graphic.strokeCircle(x, y + 7, 39);
    graphic.fillStyle(0xffffff, 0.5);
    graphic.fillCircle(x - 14, y - 8, 9);
    graphic.lineStyle(7, 0x6d3c24, 1);
    graphic.beginPath();
    graphic.moveTo(x + 23, y - 21);
    graphic.lineTo(x + 37, y - 38);
    graphic.strokePath();
    graphic.fillStyle(0xffd13b, 1);
    graphic.fillCircle(x + 42, y - 43, 9);
    return;
  }

  graphic.lineStyle(8, 0x56bfea, 1);
  for (let index = 0; index < 3; index++) {
    const angle = (Math.PI / 3) * index;
    const dx = Math.cos(angle) * 38;
    const dy = Math.sin(angle) * 38;
    graphic.beginPath();
    graphic.moveTo(x - dx, y - dy);
    graphic.lineTo(x + dx, y + dy);
    graphic.strokePath();
  }
  graphic.fillStyle(0xff8a22, 1);
  graphic.fillCircle(x + 26, y + 24, 18);
  graphic.fillStyle(0xffd250, 1);
  graphic.fillCircle(x + 20, y + 18, 9);
};

const performBooster = (scene: GameScene, kind: BoosterKind) => {
  const runtime = getScene(scene);
  if (runtime.levelCompleted || runtime.isProcessing) return false;

  if (kind === "shuffle") {
    if (!consume(scene, kind)) return false;
    runtime.shuffleBoard();
    return true;
  }

  if (kind === "breaker") {
    const state = getState(scene);
    const targets = [
      ...Array.from(runtime.iceCells.keys()).map((targetKey) => ({ targetKey, type: "ice" as const })),
      ...Array.from(state.crates.keys()).map((targetKey) => ({ targetKey, type: "crate" as const })),
    ];
    if (targets.length === 0 || !consume(scene, kind)) return false;
    Phaser.Utils.Array.Shuffle(targets);
    targets.slice(0, 5).forEach((target) => {
      if (target.type === "ice") hitIceDirect(scene, target.targetKey);
      else hitCrate(scene, target.targetKey);
    });
    runtime.updateObjectiveAndProgress();
    if (runtime.isObjectiveComplete()) runtime.showLevelCompleted();
    return true;
  }

  if (kind === "hammer") {
    const tile = runtime.selectedTile;
    if (!tile || !consume(scene, kind)) return false;
    runtime.selectedTile = null;
    return destroyTiles(scene, [tile]);
  }

  if (kind === "bomb") {
    const center = runtime.selectedTile;
    if (!center || !consume(scene, kind)) return false;
    runtime.selectedTile = null;
    const tiles: RuntimeTile[] = [];
    for (let row = center.row - 1; row <= center.row + 1; row++) {
      for (let col = center.col - 1; col <= center.col + 1; col++) {
        const tile = runtime.board[row]?.[col];
        if (tile) tiles.push(tile);
      }
    }
    return destroyTiles(scene, tiles);
  }

  if (!consume(scene, kind)) return false;
  const row = Phaser.Math.Between(0, runtime.rows - 1);
  const tiles: RuntimeTile[] = [];
  for (let col = 0; col < runtime.cols; col++) {
    const tile = runtime.board[row][col];
    if (tile) tiles.push(tile);
  }
  return destroyTiles(scene, tiles);
};

const originalCreate = runtimePrototype.create as SceneRuntime["create"];
runtimePrototype.create = function (this: GameScene) {
  extraStates.set(this, buildState(this));
  originalCreate.call(this);
  createCrates(this);
  getScene(this).updateObjectiveAndProgress();
};

const originalProcessMatches = runtimePrototype.processMatches as SceneRuntime["processMatches"];
runtimePrototype.processMatches = function (this: GameScene, matches: RuntimeTile[], cascade: boolean) {
  damageCratesAround(this, matches);
  originalProcessMatches.call(this, matches, cascade);
};

const originalUpdateProgress = runtimePrototype.updateObjectiveAndProgress as SceneRuntime["updateObjectiveAndProgress"];
runtimePrototype.updateObjectiveAndProgress = function (this: GameScene) {
  const runtime = getScene(this);
  const config = getConfig(this);
  const crateObjectives = ["crate", "crateCollect", "scoreCrate", "iceCrate", "iceCrateCollect"];
  if (!crateObjectives.includes(config.objective)) {
    originalUpdateProgress.call(this);
    return;
  }

  if (!runtime.objectiveText || !runtime.progressFill) return;
  runtime.objectiveText.setText(runtime.getObjectiveLabel());
  const state = getState(this);
  const scoreRatio = runtime.score / Math.max(1, config.targetScore);
  const collectRatio = runtime.collectedAmount / Math.max(1, config.collectAmount ?? 1);
  const iceRatio = runtime.iceTotalCells === 0 ? 1 : runtime.iceBrokenCells / runtime.iceTotalCells;
  const crateRatio = state.crateTotal === 0 ? 1 : state.crateBroken / state.crateTotal;

  let ratio = crateRatio;
  if (config.objective === "crateCollect") ratio = (crateRatio + collectRatio) / 2;
  if (config.objective === "scoreCrate") ratio = (crateRatio + scoreRatio) / 2;
  if (config.objective === "iceCrate") ratio = (crateRatio + iceRatio) / 2;
  if (config.objective === "iceCrateCollect") ratio = (crateRatio + iceRatio + collectRatio) / 3;
  runtime.progressFill.width = 600 * Phaser.Math.Clamp(ratio, 0, 1);
};

const originalObjectiveLabel = runtimePrototype.getObjectiveLabel as SceneRuntime["getObjectiveLabel"];
runtimePrototype.getObjectiveLabel = function (this: GameScene) {
  const runtime = getScene(this);
  const config = getConfig(this);
  const state = getState(this);
  const firstName = runtime["colorNames"]?.[config.collectType ?? 0] ?? "PEDINE";

  if (config.objective === "crate") return `CASSE\n${state.crateBroken}/${state.crateTotal}`;
  if (config.objective === "crateCollect") {
    return `CASSE ${state.crateBroken}/${state.crateTotal}\n${firstName} ${runtime.collectedAmount}/${config.collectAmount ?? 0}`;
  }
  if (config.objective === "scoreCrate") {
    return `${runtime.score}/${config.targetScore}\nCASSE ${state.crateBroken}/${state.crateTotal}`;
  }
  if (config.objective === "iceCrate") {
    return `GHIACCIO ${runtime.iceBrokenCells}/${runtime.iceTotalCells}\nCASSE ${state.crateBroken}/${state.crateTotal}`;
  }
  if (config.objective === "iceCrateCollect") {
    return `G ${runtime.iceBrokenCells}/${runtime.iceTotalCells} · C ${state.crateBroken}/${state.crateTotal}\n${firstName} ${runtime.collectedAmount}/${config.collectAmount ?? 0}`;
  }
  return originalObjectiveLabel.call(this);
};

const originalObjectiveComplete = runtimePrototype.isObjectiveComplete as SceneRuntime["isObjectiveComplete"];
runtimePrototype.isObjectiveComplete = function (this: GameScene) {
  const runtime = getScene(this);
  const config = getConfig(this);
  const state = getState(this);
  const cratesDone = state.crateTotal === 0 || state.crateBroken >= state.crateTotal;
  const iceDone = runtime.iceTotalCells === 0 || runtime.iceBrokenCells >= runtime.iceTotalCells;
  const collectDone = runtime.collectedAmount >= (config.collectAmount ?? 0);
  const scoreDone = runtime.score >= config.targetScore;

  if (config.objective === "crate") return cratesDone;
  if (config.objective === "crateCollect") return cratesDone && collectDone;
  if (config.objective === "scoreCrate") return cratesDone && scoreDone;
  if (config.objective === "iceCrate") return cratesDone && iceDone;
  if (config.objective === "iceCrateCollect") return cratesDone && iceDone && collectDone;
  return originalObjectiveComplete.call(this);
};

runtimePrototype.createBoosterTray = function (this: GameScene) {
  const state = getState(this);
  const config = getConfig(this);
  state.boosters = new Map(config.boosters.map((booster) => [booster.kind, booster.uses]));

  const tray = this.add.graphics();
  tray.fillStyle(0x06182f, 0.9);
  tray.fillRoundedRect(105, 1422, 870, 235, 42);
  tray.fillStyle(0x09518f, 1);
  tray.fillRoundedRect(105, 1408, 870, 235, 42);
  tray.fillStyle(0x2699dc, 0.75);
  tray.fillRoundedRect(135, 1419, 810, 13, 7);
  tray.lineStyle(8, 0xffb51f, 1);
  tray.strokeRoundedRect(105, 1408, 870, 235, 42);
  tray.lineStyle(3, 0xffec75, 1);
  tray.strokeRoundedRect(116, 1419, 848, 211, 34);

  const title = config.world === 1 ? "AIUTI DI CHIKI" : config.world === 2 ? "AIUTI POLARI" : "AIUTI REALI";
  this.add
    .text(540, 1442, title, {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "29px",
      color: "#fff5d2",
      fontStyle: "bold",
      stroke: "#06305a",
      strokeThickness: 6,
    })
    .setOrigin(0.5);

  const positions = [270, 540, 810];
  config.boosters.slice(0, 3).forEach((booster, index) => {
    const x = positions[index];
    const plate = this.add.graphics();
    plate.fillStyle(0x07335e, 0.95);
    plate.fillRoundedRect(x - 110, 1484, 220, 135, 28);
    plate.fillStyle(0x1687cd, 1);
    plate.fillRoundedRect(x - 110, 1474, 220, 135, 28);
    plate.fillStyle(0xffc83d, 1);
    plate.fillRoundedRect(x - 101, 1482, 202, 103, 22);
    plate.fillStyle(0xffffff, 0.55);
    plate.fillRoundedRect(x - 82, 1488, 164, 8, 4);
    plate.lineStyle(6, 0xffed91, 1);
    plate.strokeRoundedRect(x - 110, 1474, 220, 135, 28);

    const button = this.add.zone(x, 1540, 220, 135).setInteractive({ useHandCursor: true });
    drawCustomBooster(this, x - 48, 1525, booster.kind);

    const count = this.add
      .text(x + 68, 1502, String(getUses(this, booster.kind)), {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#76359a",
        padding: { x: 10, y: 5 },
        stroke: "#3c1553",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(x, 1582, boosterLabel(booster.kind), {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: booster.kind === "breaker" ? "19px" : "22px",
        color: "#4b2850",
        fontStyle: "bold",
        stroke: "#fff4c8",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    button.on("pointerup", () => {
      if (!performBooster(this, booster.kind)) return;
      count.setText(String(getUses(this, booster.kind)));
      this.cameras.main.shake(70, 0.0012);
    });
  });
};
