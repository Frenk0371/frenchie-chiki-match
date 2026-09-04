import Phaser from "phaser";
import GameScene from "./game/GameScene";
import { levels, type BoosterKind, type LevelConfig } from "./game/levels";

type Tile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
};

type Obstacle = {
  row: number;
  col: number;
  hits: number;
  maxHits: number;
  graphic: Phaser.GameObjects.Graphics;
};

type ExtraState = {
  crates: Map<string, Obstacle>;
  crateBroken: number;
  crateTotal: number;
  boosters: Map<BoosterKind, number>;
};

const proto = GameScene.prototype as any;
const states = new WeakMap<GameScene, ExtraState>();
const COLOR_NAMES = ["CUORI", "OSSA", "TRIFOGLI", "FIORI", "GEMME", "CHIKI"];

const runtime = (scene: GameScene): any => scene as any;

const configFor = (scene: GameScene): LevelConfig => {
  const sceneRuntime = runtime(scene);
  return levels[Math.max(0, sceneRuntime.currentLevel - 1)];
};

const freshState = (scene: GameScene): ExtraState => {
  const config = configFor(scene);
  return {
    crates: new Map<string, Obstacle>(),
    crateBroken: 0,
    crateTotal: config.crateCells?.length ?? 0,
    boosters: new Map(config.boosters.map((booster) => [booster.kind, booster.uses])),
  };
};

const stateFor = (scene: GameScene) => {
  let state = states.get(scene);
  if (!state) {
    state = freshState(scene);
    states.set(scene, state);
  }
  return state;
};

const cellKey = (row: number, col: number) => `${row}:${col}`;

const cellCenter = (scene: GameScene, row: number, col: number) => {
  const sceneRuntime = runtime(scene);
  const boardWidth = sceneRuntime.cols * sceneRuntime.tileSize;
  const startX = (1080 - boardWidth) / 2;
  return {
    x: startX + col * sceneRuntime.tileSize + sceneRuntime.tileSize / 2,
    y: sceneRuntime.boardY + row * sceneRuntime.tileSize + sceneRuntime.tileSize / 2,
  };
};

const drawCrate = (scene: GameScene, crate: Obstacle) => {
  const { x, y } = cellCenter(scene, crate.row, crate.col);
  const strong = crate.maxHits > 1 && crate.hits > 1;
  const graphic = crate.graphic;

  graphic.clear();
  graphic.fillStyle(strong ? 0x8a4b22 : 0xb96d32, strong ? 0.94 : 0.86);
  graphic.fillRoundedRect(x - 48, y - 48, 96, 96, 14);
  graphic.lineStyle(strong ? 8 : 6, 0x5b2c16, 0.98);
  graphic.strokeRoundedRect(x - 48, y - 48, 96, 96, 14);
  graphic.lineStyle(9, 0xe6a15b, 0.9);
  graphic.beginPath();
  graphic.moveTo(x - 34, y - 34);
  graphic.lineTo(x + 34, y + 34);
  graphic.moveTo(x + 34, y - 34);
  graphic.lineTo(x - 34, y + 34);
  graphic.strokePath();
  graphic.fillStyle(0xffd08a, 0.68);
  graphic.fillRoundedRect(x - 36, y - 39, 46, 8, 4);
};

const createCrates = (scene: GameScene) => {
  const sceneRuntime = runtime(scene);
  const state = stateFor(scene);
  const config = configFor(scene);

  state.crates.forEach((crate) => crate.graphic.destroy());
  state.crates.clear();
  state.crateBroken = 0;
  state.crateTotal = config.crateCells?.length ?? 0;

  config.crateCells?.forEach((item) => {
    if (item.row < 0 || item.row >= sceneRuntime.rows || item.col < 0 || item.col >= sceneRuntime.cols) return;
    const hits = Math.max(1, item.hits ?? 1);
    const crate: Obstacle = {
      row: item.row,
      col: item.col,
      hits,
      maxHits: hits,
      graphic: scene.add.graphics().setDepth(5),
    };
    state.crates.set(cellKey(crate.row, crate.col), crate);
    drawCrate(scene, crate);
  });
};

const hitCrate = (scene: GameScene, key: string) => {
  const state = stateFor(scene);
  const crate = state.crates.get(key);
  if (!crate) return false;

  crate.hits--;
  if (crate.hits <= 0) {
    state.crateBroken++;
    state.crates.delete(key);
    scene.tweens.add({
      targets: crate.graphic,
      alpha: 0,
      duration: 150,
      onComplete: () => crate.graphic.destroy(),
    });
  } else {
    drawCrate(scene, crate);
  }
  return true;
};

const damageCratesAround = (scene: GameScene, tiles: Tile[]) => {
  const sceneRuntime = runtime(scene);
  const state = stateFor(scene);
  if (state.crates.size === 0) return;

  const keys = new Set<string>();
  const offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
  tiles.forEach((tile) => {
    offsets.forEach(([dr, dc]) => {
      const row = tile.row + dr;
      const col = tile.col + dc;
      if (row >= 0 && row < sceneRuntime.rows && col >= 0 && col < sceneRuntime.cols) {
        keys.add(cellKey(row, col));
      }
    });
  });
  keys.forEach((key) => hitCrate(scene, key));
};

const hitIce = (scene: GameScene, key: string) => {
  const sceneRuntime = runtime(scene);
  const ice = sceneRuntime.iceCells.get(key) as Obstacle | undefined;
  if (!ice) return false;

  ice.hits--;
  if (ice.hits <= 0) {
    sceneRuntime.iceBrokenCells++;
    sceneRuntime.iceCells.delete(key);
    scene.tweens.add({
      targets: ice.graphic,
      alpha: 0,
      duration: 150,
      onComplete: () => ice.graphic.destroy(),
    });
  } else {
    sceneRuntime.drawIceCell(ice);
  }
  return true;
};

const usesFor = (scene: GameScene, kind: BoosterKind) => stateFor(scene).boosters.get(kind) ?? 0;

const consume = (scene: GameScene, kind: BoosterKind) => {
  const state = stateFor(scene);
  const uses = state.boosters.get(kind) ?? 0;
  if (uses <= 0) return false;
  state.boosters.set(kind, uses - 1);
  return true;
};

const finishAfterDestruction = (scene: GameScene) => {
  const sceneRuntime = runtime(scene);
  sceneRuntime.updateObjectiveAndProgress();
  if (sceneRuntime.isObjectiveComplete()) {
    sceneRuntime.showLevelCompleted();
    return;
  }
  sceneRuntime.collapseTiles();
  scene.time.delayedCall(320, () => {
    sceneRuntime.refillBoard();
    scene.time.delayedCall(350, () => sceneRuntime.checkCascadeMatches());
  });
};

const destroyTiles = (scene: GameScene, tiles: Tile[]) => {
  const sceneRuntime = runtime(scene);
  const unique = Array.from(new Set(tiles));
  if (unique.length === 0) return false;

  sceneRuntime.isProcessing = true;
  sceneRuntime.damageIceAround(unique);
  damageCratesAround(scene, unique);
  unique.forEach((tile) => {
    if (sceneRuntime.board[tile.row]?.[tile.col] !== tile) return;
    tile.circle.destroy();
    sceneRuntime.board[tile.row][tile.col] = null;
  });
  finishAfterDestruction(scene);
  return true;
};

const boosterLabel = (kind: BoosterKind) => {
  if (kind === "shuffle") return "MESCOLA";
  if (kind === "hammer") return "MARTELLO";
  if (kind === "rocket") return "RAZZO";
  if (kind === "bomb") return "BOMBA";
  return "SCIOGLI";
};

const drawBoosterIcon = (scene: GameScene, x: number, y: number, kind: BoosterKind) => {
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
  const sceneRuntime = runtime(scene);
  if (sceneRuntime.levelCompleted || sceneRuntime.isProcessing) return false;

  if (kind === "shuffle") {
    if (!consume(scene, kind)) return false;
    sceneRuntime.shuffleBoard();
    return true;
  }

  if (kind === "breaker") {
    const state = stateFor(scene);
    const targets = [
      ...Array.from(sceneRuntime.iceCells.keys() as Iterable<string>).map((key) => ({ key, type: "ice" as const })),
      ...Array.from(state.crates.keys()).map((key) => ({ key, type: "crate" as const })),
    ];
    if (targets.length === 0 || !consume(scene, kind)) return false;
    targets.sort(() => Math.random() - 0.5);
    targets.slice(0, 5).forEach((target) => {
      if (target.type === "ice") hitIce(scene, target.key);
      else hitCrate(scene, target.key);
    });
    sceneRuntime.updateObjectiveAndProgress();
    if (sceneRuntime.isObjectiveComplete()) sceneRuntime.showLevelCompleted();
    return true;
  }

  if (kind === "hammer") {
    const tile = sceneRuntime.selectedTile as Tile | null;
    if (!tile || !consume(scene, kind)) return false;
    sceneRuntime.selectedTile = null;
    return destroyTiles(scene, [tile]);
  }

  if (kind === "bomb") {
    const center = sceneRuntime.selectedTile as Tile | null;
    if (!center || !consume(scene, kind)) return false;
    sceneRuntime.selectedTile = null;
    const tiles: Tile[] = [];
    for (let row = center.row - 1; row <= center.row + 1; row++) {
      for (let col = center.col - 1; col <= center.col + 1; col++) {
        const tile = sceneRuntime.board[row]?.[col] as Tile | null | undefined;
        if (tile) tiles.push(tile);
      }
    }
    return destroyTiles(scene, tiles);
  }

  if (!consume(scene, kind)) return false;
  const row = Phaser.Math.Between(0, sceneRuntime.rows - 1);
  const tiles: Tile[] = [];
  for (let col = 0; col < sceneRuntime.cols; col++) {
    const tile = sceneRuntime.board[row][col] as Tile | null;
    if (tile) tiles.push(tile);
  }
  return destroyTiles(scene, tiles);
};

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  states.set(this, freshState(this));
  originalCreate.call(this);
  createCrates(this);
  runtime(this).updateObjectiveAndProgress();
};

const originalProcessMatches = proto.processMatches as (this: GameScene, matches: Tile[], cascade: boolean) => void;
proto.processMatches = function (this: GameScene, matches: Tile[], cascade: boolean) {
  damageCratesAround(this, matches);
  originalProcessMatches.call(this, matches, cascade);
};

const originalUpdate = proto.updateObjectiveAndProgress as (this: GameScene) => void;
proto.updateObjectiveAndProgress = function (this: GameScene) {
  const sceneRuntime = runtime(this);
  const config = configFor(this);
  const state = stateFor(this);
  const crateObjective = config.objective === "crate" || config.objective === "crateCollect" || config.objective === "scoreCrate" || config.objective === "iceCrate" || config.objective === "iceCrateCollect";

  if (!crateObjective) {
    originalUpdate.call(this);
    return;
  }

  if (!sceneRuntime.objectiveText || !sceneRuntime.progressFill) return;
  sceneRuntime.objectiveText.setText(sceneRuntime.getObjectiveLabel());
  const scoreRatio = sceneRuntime.score / Math.max(1, config.targetScore);
  const collectRatio = sceneRuntime.collectedAmount / Math.max(1, config.collectAmount ?? 1);
  const iceRatio = sceneRuntime.iceTotalCells === 0 ? 1 : sceneRuntime.iceBrokenCells / sceneRuntime.iceTotalCells;
  const crateRatio = state.crateTotal === 0 ? 1 : state.crateBroken / state.crateTotal;

  let ratio = crateRatio;
  if (config.objective === "crateCollect") ratio = (crateRatio + collectRatio) / 2;
  if (config.objective === "scoreCrate") ratio = (crateRatio + scoreRatio) / 2;
  if (config.objective === "iceCrate") ratio = (crateRatio + iceRatio) / 2;
  if (config.objective === "iceCrateCollect") ratio = (crateRatio + iceRatio + collectRatio) / 3;
  sceneRuntime.progressFill.width = 600 * Phaser.Math.Clamp(ratio, 0, 1);
};

const originalLabel = proto.getObjectiveLabel as (this: GameScene) => string;
proto.getObjectiveLabel = function (this: GameScene) {
  const sceneRuntime = runtime(this);
  const config = configFor(this);
  const state = stateFor(this);
  const firstName = COLOR_NAMES[config.collectType ?? 0] ?? "PEDINE";

  if (config.objective === "crate") return `CASSE\n${state.crateBroken}/${state.crateTotal}`;
  if (config.objective === "crateCollect") return `CASSE ${state.crateBroken}/${state.crateTotal}\n${firstName} ${sceneRuntime.collectedAmount}/${config.collectAmount ?? 0}`;
  if (config.objective === "scoreCrate") return `${sceneRuntime.score}/${config.targetScore}\nCASSE ${state.crateBroken}/${state.crateTotal}`;
  if (config.objective === "iceCrate") return `GHIACCIO ${sceneRuntime.iceBrokenCells}/${sceneRuntime.iceTotalCells}\nCASSE ${state.crateBroken}/${state.crateTotal}`;
  if (config.objective === "iceCrateCollect") return `G ${sceneRuntime.iceBrokenCells}/${sceneRuntime.iceTotalCells} · C ${state.crateBroken}/${state.crateTotal}\n${firstName} ${sceneRuntime.collectedAmount}/${config.collectAmount ?? 0}`;
  return originalLabel.call(this);
};

const originalComplete = proto.isObjectiveComplete as (this: GameScene) => boolean;
proto.isObjectiveComplete = function (this: GameScene) {
  const sceneRuntime = runtime(this);
  const config = configFor(this);
  const state = stateFor(this);
  const cratesDone = state.crateTotal === 0 || state.crateBroken >= state.crateTotal;
  const iceDone = sceneRuntime.iceTotalCells === 0 || sceneRuntime.iceBrokenCells >= sceneRuntime.iceTotalCells;
  const collectDone = sceneRuntime.collectedAmount >= (config.collectAmount ?? 0);
  const scoreDone = sceneRuntime.score >= config.targetScore;

  if (config.objective === "crate") return cratesDone;
  if (config.objective === "crateCollect") return cratesDone && collectDone;
  if (config.objective === "scoreCrate") return cratesDone && scoreDone;
  if (config.objective === "iceCrate") return cratesDone && iceDone;
  if (config.objective === "iceCrateCollect") return cratesDone && iceDone && collectDone;
  return originalComplete.call(this);
};

proto.createBoosterTray = function (this: GameScene) {
  const state = stateFor(this);
  const config = configFor(this);
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
  this.add.text(540, 1442, title, {
    fontFamily: '"Lilita One", "Fredoka", sans-serif',
    fontSize: "29px",
    color: "#fff5d2",
    fontStyle: "bold",
    stroke: "#06305a",
    strokeThickness: 6,
  }).setOrigin(0.5);

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
    drawBoosterIcon(this, x - 48, 1525, booster.kind);

    const count = this.add.text(x + 68, 1502, String(usesFor(this, booster.kind)), {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
      backgroundColor: "#76359a",
      padding: { x: 10, y: 5 },
      stroke: "#3c1553",
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(x, 1582, boosterLabel(booster.kind), {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: booster.kind === "breaker" ? "19px" : "22px",
      color: "#4b2850",
      fontStyle: "bold",
      stroke: "#fff4c8",
      strokeThickness: 2,
    }).setOrigin(0.5);

    button.on("pointerup", () => {
      if (!performBooster(this, booster.kind)) return;
      count.setText(String(usesFor(this, booster.kind)));
      this.cameras.main.shake(70, 0.0012);
    });
  });
};
