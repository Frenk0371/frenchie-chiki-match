import Phaser from "phaser";
import GameScene from "./game/GameScene";

type SpecialKind = "rocket-h" | "rocket-v" | "bomb" | "rainbow";
type ToolKind = "hammer" | "rocket" | null;

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

type ToolState = {
  active: ToolKind;
  prompt: Phaser.GameObjects.Text | null;
};

const proto = GameScene.prototype as any;
const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;
const TILE_SIZE = 116;
const toolStates = new WeakMap<GameScene, ToolState>();
const specialLocks = new WeakSet<GameScene>();

const toolState = (scene: GameScene) => {
  let state = toolStates.get(scene);
  if (!state) {
    state = { active: null, prompt: null };
    toolStates.set(scene, state);
  }
  return state;
};

const boardCenter = (scene: GameScene, row: number, col: number) => {
  const r = runtime(scene);
  const boardWidth = r.cols * r.tileSize;
  const startX = (1080 - boardWidth) / 2;
  return {
    x: startX + col * r.tileSize + r.tileSize / 2,
    y: r.boardY + row * r.tileSize + r.tileSize / 2,
  };
};

const clearPrompt = (scene: GameScene) => {
  const state = toolState(scene);
  if (state.prompt?.active) state.prompt.destroy();
  state.prompt = null;
};

const showToolPrompt = (scene: GameScene, kind: Exclude<ToolKind, null>) => {
  clearPrompt(scene);
  const text = kind === "hammer" ? "🔨 TOCCA LA PEDINA DA ROMPERE" : "🚀 TOCCA LA PEDINA BERSAGLIO";
  const prompt = scene.add
    .text(540, 1370, text, {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "30px",
      color: "#fff6cf",
      stroke: "#442054",
      strokeThickness: 7,
      backgroundColor: "#7b35a8",
      padding: { x: 18, y: 10 },
    })
    .setOrigin(0.5)
    .setDepth(70)
    .setScale(0.75);
  scene.tweens.add({ targets: prompt, scale: 1, duration: 220, ease: "Back.easeOut" });
  toolState(scene).prompt = prompt;
};

const makeSmokePuff = (
  scene: GameScene,
  x: number,
  y: number,
  dark = false,
  depth = 55,
  size = Phaser.Math.Between(15, 28),
) => {
  const colors = dark
    ? [0x111318, 0x22252b, 0x36383d, 0x4b4848]
    : [0xffffff, 0xf7f9fc, 0xe7edf4, 0xd0dbe5];
  const puff = scene.add
    .circle(
      x + Phaser.Math.Between(-9, 9),
      y + Phaser.Math.Between(-9, 9),
      size,
      Phaser.Utils.Array.GetRandom(colors),
      dark ? 0.82 : 0.9,
    )
    .setDepth(depth)
    .setScale(0.42);

  scene.tweens.add({
    targets: puff,
    x: puff.x + Phaser.Math.Between(-42, 42),
    y: puff.y + Phaser.Math.Between(-35, 30),
    scale: dark ? Phaser.Math.FloatBetween(1.6, 2.5) : Phaser.Math.FloatBetween(1.25, 2),
    alpha: 0,
    duration: dark ? Phaser.Math.Between(500, 780) : Phaser.Math.Between(350, 560),
    ease: "Cubic.easeOut",
    onComplete: () => puff.destroy(),
  });
};

const burst = (scene: GameScene, x: number, y: number, color = 0xffdf5d, darkSmoke = false) => {
  const ring = scene.add
    .circle(x, y, 28, color, 0.18)
    .setStrokeStyle(10, color, 0.96)
    .setDepth(58);
  scene.tweens.add({
    targets: ring,
    scale: darkSmoke ? 4 : 3.2,
    alpha: 0,
    duration: darkSmoke ? 420 : 320,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy(),
  });

  const amount = darkSmoke ? 22 : 10;
  for (let i = 0; i < amount; i++) {
    scene.time.delayedCall(i * 12, () =>
      makeSmokePuff(scene, x, y, darkSmoke, 57, Phaser.Math.Between(14, darkSmoke ? 34 : 24)),
    );
  }
};

const animateShuffle = (scene: GameScene, done: () => void) => {
  const icon = scene.add
    .image(540, 875, "booster-shuffle")
    .setDisplaySize(330, 330)
    .setDepth(62)
    .setAlpha(0)
    .setScale(0.35);
  const halo = scene.add
    .circle(540, 875, 180, 0x66ddff, 0.2)
    .setStrokeStyle(14, 0xfff19b, 0.9)
    .setDepth(61)
    .setScale(0.4);

  scene.tweens.add({ targets: icon, alpha: 1, scale: 1, duration: 170, ease: "Back.easeOut" });
  scene.tweens.add({ targets: halo, alpha: 0.72, scale: 1, duration: 170, ease: "Back.easeOut" });
  scene.tweens.add({ targets: icon, angle: 1080, duration: 780, ease: "Cubic.easeInOut" });
  scene.tweens.add({ targets: halo, angle: -720, scale: 1.25, duration: 780, ease: "Cubic.easeInOut" });
  scene.cameras.main.shake(700, 0.0014);

  scene.time.delayedCall(650, () => {
    done();
    scene.tweens.add({
      targets: [icon, halo],
      alpha: 0,
      scale: 1.45,
      duration: 180,
      onComplete: () => {
        icon.destroy();
        halo.destroy();
      },
    });
  });
};

const animateHammer = (scene: GameScene, tile: PowerTile, done: () => void) => {
  const { x, y } = boardCenter(scene, tile.row, tile.col);
  const hammer = scene.add
    .image(x + 105, y - 220, "booster-hammer")
    .setDisplaySize(285, 285)
    .setDepth(65)
    .setAngle(-42)
    .setScale(0.9);
  const shadow = scene.add.ellipse(x, y + 40, 130, 38, 0x000000, 0.3).setDepth(59).setScale(0.25);

  scene.tweens.add({ targets: shadow, scaleX: 1, scaleY: 1, alpha: 0.48, duration: 210 });
  scene.tweens.add({
    targets: hammer,
    x: x + 20,
    y: y - 20,
    angle: 38,
    scale: 1.12,
    duration: 285,
    ease: "Cubic.easeIn",
    onComplete: () => {
      scene.cameras.main.shake(180, 0.008);
      scene.cameras.main.flash(70, 255, 235, 150, false);
      burst(scene, x, y, 0xffe26a, false);
      if (tile.circle.active) {
        scene.tweens.add({
          targets: tile.circle,
          scaleX: tile.circle.scaleX * 0.72,
          scaleY: tile.circle.scaleY * 0.72,
          angle: Phaser.Math.Between(-10, 10),
          duration: 75,
          yoyo: true,
        });
      }
      scene.time.delayedCall(100, done);
      scene.tweens.add({
        targets: hammer,
        x: x + 130,
        y: y - 175,
        angle: -28,
        alpha: 0,
        duration: 230,
        ease: "Cubic.easeOut",
        onComplete: () => hammer.destroy(),
      });
      scene.tweens.add({ targets: shadow, alpha: 0, scale: 0.2, duration: 190, onComplete: () => shadow.destroy() });
    },
  });
};

const animateHelpRocket = (scene: GameScene, target: PowerTile, done: () => void) => {
  const targetPos = boardCenter(scene, target.row, target.col);
  const startX = 810;
  const startY = 1530;
  const rocket = scene.add
    .image(startX, startY, "booster-rocket")
    .setDisplaySize(190, 190)
    .setDepth(66);
  const angle = Math.atan2(targetPos.y - startY, targetPos.x - startX);
  rocket.setAngle((angle * 180) / Math.PI + 90);

  const smoke = scene.time.addEvent({
    delay: 28,
    loop: true,
    callback: () => {
      if (!rocket.active) return;
      const backX = rocket.x - Math.cos(angle) * 58;
      const backY = rocket.y - Math.sin(angle) * 58;
      makeSmokePuff(scene, backX, backY, false, 63, Phaser.Math.Between(17, 30));
    },
  });

  scene.tweens.add({
    targets: rocket,
    x: targetPos.x,
    y: targetPos.y,
    scaleX: rocket.scaleX * 1.08,
    scaleY: rocket.scaleY * 1.08,
    duration: 560,
    ease: "Cubic.easeIn",
    onComplete: () => {
      smoke.remove(false);
      scene.cameras.main.shake(180, 0.006);
      scene.cameras.main.flash(90, 255, 226, 130, false);
      burst(scene, targetPos.x, targetPos.y, 0xffdf67, false);
      rocket.destroy();
      scene.time.delayedCall(80, done);
    },
  });
};

const trailRocket = (
  scene: GameScene,
  x: number,
  y: number,
  angle: number,
  endX: number,
  endY: number,
  done: () => void,
) => {
  const rocket = scene.add
    .image(x, y, "special-grid-rocket")
    .setDisplaySize(120, 120)
    .setDepth(68)
    .setAngle(angle);
  const horizontal = Math.abs(endX - x) >= Math.abs(endY - y);
  const signX = endX >= x ? 1 : -1;
  const signY = endY >= y ? 1 : -1;
  const smoke = scene.time.addEvent({
    delay: 24,
    loop: true,
    callback: () => {
      if (!rocket.active) return;
      const sx = horizontal ? rocket.x - signX * 52 : rocket.x + Phaser.Math.Between(-8, 8);
      const sy = horizontal ? rocket.y + Phaser.Math.Between(-8, 8) : rocket.y - signY * 52;
      makeSmokePuff(scene, sx, sy, false, 66, Phaser.Math.Between(14, 26));
    },
  });

  scene.tweens.add({
    targets: rocket,
    x: endX,
    y: endY,
    duration: 390,
    ease: "Cubic.easeIn",
    onComplete: () => {
      smoke.remove(false);
      rocket.destroy();
      done();
    },
  });
};

const animateGridRocket = (scene: GameScene, tile: PowerTile, done: () => void) => {
  const r = runtime(scene);
  if (!tile.special?.startsWith("rocket")) {
    done();
    return;
  }
  const horizontal = tile.special === "rocket-h";
  const boardWidth = r.cols * r.tileSize;
  const left = (1080 - boardWidth) / 2;
  const right = left + boardWidth;
  const top = r.boardY;
  const bottom = top + r.rows * r.tileSize;
  const x = tile.circle.x;
  const y = tile.circle.y;
  tile.circle.setAlpha(0.12);

  let finished = 0;
  const finishOne = () => {
    finished++;
    if (finished < 2) return;
    scene.cameras.main.shake(130, 0.004);
    done();
  };

  if (horizontal) {
    trailRocket(scene, x, y, 0, right + 90, y, finishOne);
    trailRocket(scene, x, y, 180, left - 90, y, finishOne);
  } else {
    trailRocket(scene, x, y, 90, x, bottom + 90, finishOne);
    trailRocket(scene, x, y, -90, x, top - 90, finishOne);
  }
};

const animateBomb = (scene: GameScene, tile: PowerTile, done: () => void) => {
  const x = tile.circle.x;
  const y = tile.circle.y;
  const clone = scene.add.image(x, y, "special-bomb").setDisplaySize(128, 128).setDepth(69);
  scene.tweens.add({
    targets: clone,
    scaleX: clone.scaleX * 1.55,
    scaleY: clone.scaleY * 1.55,
    angle: 22,
    duration: 190,
    yoyo: true,
    repeat: 1,
    ease: "Sine.easeInOut",
    onComplete: () => {
      clone.destroy();
      scene.cameras.main.shake(260, 0.009);
      scene.cameras.main.flash(105, 255, 170, 70, false);
      burst(scene, x, y, 0xff9b3d, true);
      scene.time.delayedCall(170, done);
    },
  });
};

const lightning = (scene: GameScene, sx: number, sy: number, tx: number, ty: number, delay: number) => {
  scene.time.delayedCall(delay, () => {
    const g = scene.add.graphics().setDepth(72);
    const points: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(sx, sy)];
    const segments = 7;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const baseX = Phaser.Math.Linear(sx, tx, t);
      const baseY = Phaser.Math.Linear(sy, ty, t);
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const nx = -dy / len;
      const ny = dx / len;
      const jitter = Phaser.Math.Between(-24, 24);
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
    draw(11, 0x3cc6ff, 0.62);
    draw(5, 0xffffff, 1);

    const hit = scene.add.circle(tx, ty, 28, 0xffffff, 0.78).setDepth(73);
    scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    scene.tweens.add({
      targets: hit,
      scale: 2.3,
      alpha: 0,
      duration: 270,
      ease: "Cubic.easeOut",
      onComplete: () => hit.destroy(),
    });
  });
};

const animateRainbowSpin = (scene: GameScene, rainbow: PowerTile, done: () => void) => {
  const glow = scene.add
    .circle(rainbow.circle.x, rainbow.circle.y, 52, 0xb4f5ff, 0.28)
    .setStrokeStyle(9, 0xffffff, 0.8)
    .setDepth(67);
  scene.tweens.add({ targets: glow, scale: 2.2, alpha: 0, duration: 520, onComplete: () => glow.destroy() });
  scene.tweens.add({
    targets: rainbow.circle,
    angle: rainbow.circle.angle + 1080,
    scaleX: rainbow.circle.scaleX * 1.16,
    scaleY: rainbow.circle.scaleY * 1.16,
    duration: 520,
    ease: "Cubic.easeInOut",
    onComplete: done,
  });
};

const animateRainbowLightning = (scene: GameScene, rainbow: PowerTile, targetType: number) => {
  const r = runtime(scene);
  const sx = rainbow.circle.x;
  const sy = rainbow.circle.y;
  const targets = r.board
    .flat()
    .filter(
      (tile): tile is PowerTile =>
        Boolean(tile) && !tile!.special && (tile!.baseType ?? tile!.type) === targetType,
    );

  targets.forEach((tile, index) => {
    if (!tile.circle.active) return;
    lightning(scene, sx, sy, tile.circle.x, tile.circle.y, index * 16);
    scene.time.delayedCall(95 + index * 16, () => {
      if (tile.circle.active) burst(scene, tile.circle.x, tile.circle.y, 0x8feaff, false);
    });
  });
  scene.cameras.main.shake(260, 0.004);
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
      if (toolState(this).active || r.shuffleUses <= 0 || r.isProcessing || r.levelCompleted) return;
      r.shuffleUses--;
      r.isProcessing = true;
      animateShuffle(this, () => r.shuffleBoard());
    };
  } else if (label === "MARTELLO") {
    animatedAction = () => {
      if (toolState(this).active || r.hammerUses <= 0 || r.isProcessing || r.levelCompleted) return;
      r.hammerUses--;
      if (r.selectedTile?.circle.active) r.selectedTile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
      r.selectedTile = null;
      toolState(this).active = "hammer";
      showToolPrompt(this, "hammer");
    };
  } else if (label === "RAZZO") {
    animatedAction = () => {
      if (toolState(this).active || r.rocketUses <= 0 || r.isProcessing || r.levelCompleted) return;
      r.rocketUses--;
      if (r.selectedTile?.circle.active) r.selectedTile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
      r.selectedTile = null;
      toolState(this).active = "rocket";
      showToolPrompt(this, "rocket");
    };
  }

  originalCreateBoosterButton.call(this, x, iconKey, label, animatedAction, remaining);
};

const originalSelectTile = proto.selectTile as RuntimeScene["selectTile"];
proto.selectTile = function (this: GameScene, tile: PowerTile) {
  const r = runtime(this);
  const state = toolState(this);

  if (state.active === "hammer" && !r.isProcessing && !r.levelCompleted) {
    state.active = null;
    clearPrompt(this);
    r.selectedTile = null;
    r.isProcessing = true;
    animateHammer(this, tile, () => resolveHammer(this, tile));
    return;
  }

  if (state.active === "rocket" && !r.isProcessing && !r.levelCompleted) {
    state.active = null;
    clearPrompt(this);
    r.selectedTile = null;
    r.isProcessing = true;
    const row = tile.row;
    const rowTiles = r.board[row].filter((candidate): candidate is PowerTile => Boolean(candidate));
    animateHelpRocket(this, tile, () => resolveHelpRocket(this, row, rowTiles));
    return;
  }

  if (specialLocks.has(this)) return;

  if ((tile.special === "rocket-h" || tile.special === "rocket-v") && !r.isProcessing && !r.levelCompleted) {
    specialLocks.add(this);
    animateGridRocket(this, tile, () => {
      specialLocks.delete(this);
      originalSelectTile.call(this, tile);
    });
    return;
  }

  if (tile.special === "bomb" && !r.isProcessing && !r.levelCompleted) {
    specialLocks.add(this);
    animateBomb(this, tile, () => {
      specialLocks.delete(this);
      originalSelectTile.call(this, tile);
    });
    return;
  }

  originalSelectTile.call(this, tile);
};

const originalTrySwap = proto.trySwap as RuntimeScene["trySwap"];
proto.trySwap = function (this: GameScene, a: PowerTile, b: PowerTile) {
  const r = runtime(this);
  const state = toolState(this);
  if (state.active) return;
  if (specialLocks.has(this)) return;

  const rainbow = a.special === "rainbow" ? a : b.special === "rainbow" ? b : null;
  const target = rainbow === a ? b : rainbow === b ? a : null;

  if (rainbow && target && !target.special && !r.isProcessing && !r.levelCompleted) {
    const targetType = target.baseType ?? target.type;
    if (targetType < 0) {
      originalTrySwap.call(this, a, b);
      return;
    }

    specialLocks.add(this);
    animateRainbowSpin(this, rainbow, () => {
      specialLocks.delete(this);
      originalTrySwap.call(this, a, b);
      this.time.delayedCall(235, () => animateRainbowLightning(this, rainbow, targetType));
    });
    return;
  }

  originalTrySwap.call(this, a, b);
};