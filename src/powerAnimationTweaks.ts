import Phaser from "phaser";
import GameScene from "./game/GameScene";

type SpecialKind = "rocket-h" | "rocket-v" | "bomb" | "rainbow";
type PowerTile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
  special?: SpecialKind;
  baseType?: number;
};

type RuntimeScene = {
  rows: number;
  cols: number;
  tileSize: number;
  boardY: number;
  board: (PowerTile | null)[][];
  selectedTile: PowerTile | null;
  isProcessing: boolean;
  levelCompleted: boolean;
  moves: number;
  shuffleUses: number;
  hammerUses: number;
  rocketUses: number;
  damageIceAround: (tiles: PowerTile[]) => void;
  updateObjectiveAndProgress: () => void;
  isObjectiveComplete: () => boolean;
  showLevelCompleted: () => void;
  collapseTiles: () => void;
  refillBoard: () => void;
  checkCascadeMatches: () => void;
  shuffleBoard: () => void;
  selectTile: (tile: PowerTile) => void;
  trySwap: (a: PowerTile, b: PowerTile) => void;
};

const proto = GameScene.prototype as any;
const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;
const TILE_SIZE = 116;

const boardCenter = (scene: GameScene, row: number, col: number) => {
  const r = runtime(scene);
  const boardWidth = r.cols * r.tileSize;
  const startX = (1080 - boardWidth) / 2;
  return {
    x: startX + col * r.tileSize + r.tileSize / 2,
    y: r.boardY + row * r.tileSize + r.tileSize / 2,
  };
};

const makeSmokePuff = (
  scene: GameScene,
  x: number,
  y: number,
  dark = false,
  depth = 35,
  size = Phaser.Math.Between(15, 28),
) => {
  const colors = dark ? [0x171820, 0x292a33, 0x41424a, 0x5c5555] : [0xffffff, 0xf4f7fb, 0xdfe7ef, 0xcbd6e0];
  const puff = scene.add
    .circle(x + Phaser.Math.Between(-9, 9), y + Phaser.Math.Between(-9, 9), size, Phaser.Utils.Array.GetRandom(colors), dark ? 0.76 : 0.84)
    .setDepth(depth)
    .setScale(0.45);
  scene.tweens.add({
    targets: puff,
    x: puff.x + Phaser.Math.Between(-38, 38),
    y: puff.y + Phaser.Math.Between(-30, 30),
    scale: dark ? Phaser.Math.FloatBetween(1.5, 2.3) : Phaser.Math.FloatBetween(1.2, 1.9),
    alpha: 0,
    duration: dark ? Phaser.Math.Between(430, 680) : Phaser.Math.Between(300, 520),
    ease: "Cubic.easeOut",
    onComplete: () => puff.destroy(),
  });
};

const burst = (scene: GameScene, x: number, y: number, color = 0xffdf5d, darkSmoke = false) => {
  const ring = scene.add.circle(x, y, 28, color, 0.16).setStrokeStyle(9, color, 0.92).setDepth(42);
  scene.tweens.add({
    targets: ring,
    scale: 3.1,
    alpha: 0,
    duration: 330,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy(),
  });
  for (let i = 0; i < (darkSmoke ? 15 : 8); i++) {
    scene.time.delayedCall(i * 14, () => makeSmokePuff(scene, x, y, darkSmoke, 41, Phaser.Math.Between(13, darkSmoke ? 31 : 22)));
  }
};

const animateShuffle = (scene: GameScene, done: () => void) => {
  const icon = scene.add.image(540, 870, "booster-shuffle").setDisplaySize(285, 285).setDepth(45).setAlpha(0).setScale(0.45);
  const halo = scene.add.circle(540, 870, 145, 0x58d9ff, 0.2).setStrokeStyle(12, 0xfff09a, 0.85).setDepth(44).setScale(0.45);
  scene.tweens.add({ targets: icon, alpha: 1, scale: 1, duration: 180, ease: "Back.easeOut" });
  scene.tweens.add({ targets: halo, alpha: 0.7, scale: 1, duration: 180, ease: "Back.easeOut" });
  scene.tweens.add({
    targets: icon,
    angle: 720,
    duration: 620,
    ease: "Cubic.easeInOut",
  });
  scene.tweens.add({
    targets: halo,
    angle: -540,
    scale: 1.2,
    duration: 620,
    ease: "Cubic.easeInOut",
  });
  scene.cameras.main.shake(620, 0.0011);
  scene.time.delayedCall(560, () => {
    done();
    scene.tweens.add({ targets: [icon, halo], alpha: 0, scale: 1.35, duration: 190, onComplete: () => {
      icon.destroy();
      halo.destroy();
    } });
  });
};

const animateHammer = (scene: GameScene, tile: PowerTile, done: () => void) => {
  const { x, y } = boardCenter(scene, tile.row, tile.col);
  const hammer = scene.add.image(x + 95, y - 190, "booster-hammer").setDisplaySize(245, 245).setDepth(46).setAngle(-38).setScale(0.86);
  const shadow = scene.add.ellipse(x, y + 36, 115, 34, 0x000000, 0.24).setDepth(39).setScale(0.35);
  scene.tweens.add({ targets: shadow, scaleX: 1, scaleY: 1, alpha: 0.42, duration: 220 });
  scene.tweens.add({
    targets: hammer,
    x: x + 24,
    y: y - 18,
    angle: 34,
    scale: 1.08,
    duration: 250,
    ease: "Cubic.easeIn",
    onComplete: () => {
      scene.cameras.main.shake(150, 0.0065);
      burst(scene, x, y, 0xffe16a, false);
      if (tile.circle.active) {
        scene.tweens.add({ targets: tile.circle, scaleX: tile.circle.scaleX * 0.8, scaleY: tile.circle.scaleY * 0.8, duration: 60, yoyo: true });
      }
      scene.time.delayedCall(85, done);
      scene.tweens.add({
        targets: hammer,
        y: y - 145,
        x: x + 110,
        angle: -25,
        alpha: 0,
        duration: 210,
        ease: "Cubic.easeOut",
        onComplete: () => hammer.destroy(),
      });
      scene.tweens.add({ targets: shadow, alpha: 0, scale: 0.25, duration: 180, onComplete: () => shadow.destroy() });
    },
  });
};

const animateHelpRocket = (scene: GameScene, row: number, done: () => void) => {
  const r = runtime(scene);
  const { y } = boardCenter(scene, row, 0);
  const boardWidth = r.cols * r.tileSize;
  const left = (1080 - boardWidth) / 2;
  const startX = left - 105;
  const endX = left + boardWidth + 105;
  const rocket = scene.add.image(startX, y, "booster-rocket").setDisplaySize(175, 175).setDepth(46).setAngle(90);
  const timer = scene.time.addEvent({
    delay: 32,
    loop: true,
    callback: () => {
      if (!rocket.active) return;
      makeSmokePuff(scene, rocket.x - 62, rocket.y + Phaser.Math.Between(-12, 12), false, 43, Phaser.Math.Between(16, 28));
    },
  });
  scene.tweens.add({
    targets: rocket,
    x: endX,
    duration: 610,
    ease: "Cubic.easeIn",
    onComplete: () => {
      timer.remove(false);
      scene.cameras.main.shake(150, 0.004);
      burst(scene, endX - 55, y, 0xffe071, false);
      rocket.destroy();
      done();
    },
  });
};

const animateGridRocket = (scene: GameScene, tile: PowerTile) => {
  if (!tile.special?.startsWith("rocket")) return;
  const r = runtime(scene);
  const horizontal = tile.special === "rocket-h";
  const boardWidth = r.cols * r.tileSize;
  const left = (1080 - boardWidth) / 2;
  const top = r.boardY;
  const clone = scene.add.image(tile.circle.x, tile.circle.y, "special-grid-rocket")
    .setDisplaySize(110, 110)
    .setDepth(47)
    .setAngle(horizontal ? 0 : 90);
  const endX = horizontal ? left + boardWidth + 70 : clone.x;
  const endY = horizontal ? clone.y : top + r.rows * r.tileSize + 70;
  const timer = scene.time.addEvent({
    delay: 27,
    loop: true,
    callback: () => {
      if (!clone.active) return;
      const sx = horizontal ? clone.x - 48 : clone.x + Phaser.Math.Between(-9, 9);
      const sy = horizontal ? clone.y + Phaser.Math.Between(-9, 9) : clone.y - 48;
      makeSmokePuff(scene, sx, sy, false, 44, Phaser.Math.Between(13, 24));
    },
  });
  scene.tweens.add({
    targets: clone,
    x: endX,
    y: endY,
    scaleX: clone.scaleX * 1.08,
    scaleY: clone.scaleY * 1.08,
    duration: 285,
    ease: "Cubic.easeIn",
    onComplete: () => {
      timer.remove(false);
      clone.destroy();
    },
  });
};

const animateBomb = (scene: GameScene, tile: PowerTile) => {
  const x = tile.circle.x;
  const y = tile.circle.y;
  const clone = scene.add.image(x, y, "special-bomb").setDisplaySize(112, 112).setDepth(47);
  scene.tweens.add({
    targets: clone,
    scaleX: clone.scaleX * 1.42,
    scaleY: clone.scaleY * 1.42,
    angle: 16,
    duration: 155,
    yoyo: true,
    ease: "Sine.easeInOut",
    onComplete: () => {
      clone.destroy();
      scene.cameras.main.shake(220, 0.0075);
      scene.cameras.main.flash(95, 255, 200, 90, false);
      burst(scene, x, y, 0xffa047, true);
    },
  });
};

const lightning = (scene: GameScene, sx: number, sy: number, tx: number, ty: number, delay: number) => {
  scene.time.delayedCall(delay, () => {
    const g = scene.add.graphics().setDepth(49);
    const points: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(sx, sy)];
    const segments = 6;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const baseX = Phaser.Math.Linear(sx, tx, t);
      const baseY = Phaser.Math.Linear(sy, ty, t);
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const nx = -dy / len;
      const ny = dx / len;
      const jitter = Phaser.Math.Between(-22, 22);
      points.push(new Phaser.Math.Vector2(baseX + nx * jitter, baseY + ny * jitter));
    }
    points.push(new Phaser.Math.Vector2(tx, ty));

    const draw = (width: number, color: number, alpha: number) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
      g.strokePath();
    };
    draw(9, 0x4ac8ff, 0.58);
    draw(4, 0xffffff, 1);

    const hit = scene.add.circle(tx, ty, 24, 0xffffff, 0.72).setDepth(50);
    scene.tweens.add({ targets: g, alpha: 0, duration: 185, onComplete: () => g.destroy() });
    scene.tweens.add({ targets: hit, scale: 2.1, alpha: 0, duration: 250, ease: "Cubic.easeOut", onComplete: () => hit.destroy() });
  });
};

const animateRainbow = (scene: GameScene, rainbow: PowerTile, target: PowerTile) => {
  const r = runtime(scene);
  const targetType = target.baseType ?? target.type;
  if (targetType < 0) return;
  const targets = r.board.flat().filter((tile): tile is PowerTile => Boolean(tile) && !tile!.special && (tile!.baseType ?? tile!.type) === targetType);

  scene.tweens.killTweensOf(rainbow.circle);
  scene.tweens.add({
    targets: rainbow.circle,
    angle: rainbow.circle.angle + 1080,
    duration: 540,
    ease: "Cubic.easeInOut",
  });

  const startX = rainbow.circle.x;
  const startY = rainbow.circle.y;
  scene.time.delayedCall(220, () => {
    targets.forEach((tile, index) => {
      if (!tile.circle.active) return;
      lightning(scene, startX, startY, tile.circle.x, tile.circle.y, index * 13);
      scene.time.delayedCall(80 + index * 13, () => {
        if (tile.circle.active) burst(scene, tile.circle.x, tile.circle.y, 0x8feaff, false);
      });
    });
    scene.cameras.main.shake(280, 0.0032);
  });
};

const resolveHammer = (scene: GameScene, tile: PowerTile) => {
  const r = runtime(scene);
  if (!tile.circle.active) {
    r.isProcessing = false;
    return;
  }
  r.damageIceAround([tile]);
  tile.circle.destroy();
  if (r.board[tile.row]?.[tile.col] === tile) r.board[tile.row][tile.col] = null;
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

const resolveHelpRocket = (scene: GameScene, row: number, rowTiles: PowerTile[]) => {
  const r = runtime(scene);
  rowTiles.forEach((tile) => {
    if (tile.circle.active) tile.circle.destroy();
    if (r.board[row]?.[tile.col] === tile) r.board[row][tile.col] = null;
  });
  r.damageIceAround(rowTiles);
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
  const r = runtime(this);
  let animatedAction = action;

  if (label === "MESCOLA") {
    animatedAction = () => {
      if (r.shuffleUses <= 0 || r.isProcessing || r.levelCompleted) return;
      r.shuffleUses--;
      r.isProcessing = true;
      animateShuffle(this, () => r.shuffleBoard());
    };
  } else if (label === "MARTELLO") {
    animatedAction = () => {
      if (r.hammerUses <= 0 || !r.selectedTile || r.isProcessing || r.levelCompleted) return;
      const tile = r.selectedTile;
      r.hammerUses--;
      r.selectedTile = null;
      if (tile.circle.active) tile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
      r.isProcessing = true;
      animateHammer(this, tile, () => resolveHammer(this, tile));
    };
  } else if (label === "RAZZO") {
    animatedAction = () => {
      if (r.rocketUses <= 0 || r.isProcessing || r.levelCompleted) return;
      const selected = r.selectedTile;
      const row = selected ? selected.row : Phaser.Math.Between(0, r.rows - 1);
      if (selected?.circle.active) selected.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
      r.selectedTile = null;
      const rowTiles = r.board[row].filter((tile): tile is PowerTile => Boolean(tile));
      r.rocketUses--;
      r.isProcessing = true;
      animateHelpRocket(this, row, () => resolveHelpRocket(this, row, rowTiles));
    };
  }

  originalCreateBoosterButton.call(this, x, iconKey, label, animatedAction, remaining);
};

const originalSelectTile = proto.selectTile as RuntimeScene["selectTile"];
proto.selectTile = function (this: GameScene, tile: PowerTile) {
  if (!runtime(this).isProcessing) {
    if (tile.special === "rocket-h" || tile.special === "rocket-v") animateGridRocket(this, tile);
    else if (tile.special === "bomb") animateBomb(this, tile);
  }
  originalSelectTile.call(this, tile);
};

const originalTrySwap = proto.trySwap as RuntimeScene["trySwap"];
proto.trySwap = function (this: GameScene, a: PowerTile, b: PowerTile) {
  const r = runtime(this);
  if (!r.isProcessing) {
    const rainbow = a.special === "rainbow" ? a : b.special === "rainbow" ? b : null;
    const target = rainbow === a ? b : rainbow === b ? a : null;
    if (rainbow && target && !target.special) animateRainbow(this, rainbow, target);
  }
  originalTrySwap.call(this, a, b);
};
