import Phaser from "phaser";
import GameScene from "./game/GameScene";
import { levels } from "./game/levels";
import { addBananaLife, getLifeState, MAX_BANANA_LIVES } from "./lifeSystem";
import { readBoosterCounts, type BoosterCounts } from "./boosterEconomyTweaks";

type Tile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
  special?: string;
};

type RuntimeScene = {
  currentLevel: number;
  rows: number;
  cols: number;
  board: (Tile | null)[][];
  isProcessing: boolean;
  levelCompleted: boolean;
  selectedTile: Tile | null;
  shuffleUses: number;
  hammerUses: number;
  rocketUses: number;
  resetGestureState?: () => void;
  clearSelectedTile?: () => void;
  collapseTiles: () => void;
  refillBoard: () => void;
  checkCascadeMatches: () => void;
  damageIceAround: (tiles: Tile[]) => void;
};

type BananaState = {
  tile: Tile | null;
  nextIn: number;
  collecting: boolean;
};

type Reward =
  | { kind: "hammer" | "rocket" | "shuffle"; amount: number }
  | { kind: "banana"; amount: number };

const proto = GameScene.prototype as any;
const bananaStates = new WeakMap<GameScene, BananaState>();
const ROOM_STATE_KEY = "chiki-room-state";
const CLAIMED_KEY = "chiki-milestone-gifts-v1";

const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;

const stateFor = (scene: GameScene) => {
  let state = bananaStates.get(scene);
  if (!state) {
    state = { tile: null, nextIn: Phaser.Math.Between(16, 30), collecting: false };
    bananaStates.set(scene, state);
  }
  return state;
};

// Spegne il vecchio sistema banana sovrapposto: da qui in poi la banana è una vera casella speciale.
levels.forEach((level) => {
  (level as any).bananaChance = 0;
});

const playGiftChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    [659, 784, 988].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.09 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.09);
      oscillator.stop(now + index * 0.09 + 0.2);
    });
    window.setTimeout(() => void context.close(), 700);
  } catch {
    // L'effetto sonoro non deve mai bloccare il gioco.
  }
};

const lifePop = (scene: GameScene, text: string) => {
  const label = scene.add
    .text(540, 410, text, {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "50px",
      color: "#fff578",
      stroke: "#5c3510",
      strokeThickness: 9,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(3000)
    .setScale(0.55);

  scene.tweens.add({
    targets: label,
    y: 370,
    scale: 1,
    duration: 260,
    ease: "Back.easeOut",
    yoyo: true,
    hold: 500,
    onComplete: () => label.destroy(),
  });
};

const awardBanana = (scene: GameScene) => {
  const before = getLifeState().lives;
  const after = addBananaLife(1).lives;
  if (after > before) {
    lifePop(scene, "🍌 +1 VITA!");
    playGiftChime();
  } else {
    lifePop(scene, "🍌 VITE GIÀ PIENE!");
  }
};

const clearBananaState = (scene: GameScene) => {
  const state = stateFor(scene);
  if (state.tile) {
    (state.tile as any).bananaLife = false;
  }
  state.tile = null;
  state.collecting = false;
  state.nextIn = Phaser.Math.Between(22, 45);
};

const collectBananaFromBoard = (scene: GameScene, tile: Tile, directTap: boolean) => {
  const state = stateFor(scene);
  if (state.tile !== tile || state.collecting) return;
  state.collecting = true;

  const r = runtime(scene);
  if (!tile.circle.active) {
    clearBananaState(scene);
    awardBanana(scene);
    return;
  }

  if (!directTap) {
    clearBananaState(scene);
    awardBanana(scene);
    return;
  }

  r.isProcessing = true;
  r.resetGestureState?.();
  r.clearSelectedTile?.();
  r.selectedTile = null;

  const row = tile.row;
  const col = tile.col;
  if (r.board[row]?.[col] === tile) r.board[row][col] = null;

  const targetX = 105;
  const targetY = 1765;
  scene.tweens.killTweensOf(tile.circle);
  scene.tweens.add({
    targets: tile.circle,
    x: targetX,
    y: targetY,
    scaleX: tile.circle.scaleX * 0.5,
    scaleY: tile.circle.scaleY * 0.5,
    angle: 24,
    duration: 480,
    ease: "Cubic.easeIn",
    onComplete: () => {
      if (tile.circle.active) tile.circle.destroy();
      clearBananaState(scene);
      awardBanana(scene);
      r.collapseTiles();
      scene.time.delayedCall(320, () => {
        r.refillBoard();
        scene.time.delayedCall(360, () => r.checkCascadeMatches());
      });
    },
  });
};

const turnIntoBanana = (scene: GameScene, tile: Tile) => {
  const state = stateFor(scene);
  const r = runtime(scene);
  if (
    state.tile ||
    state.collecting ||
    r.levelCompleted ||
    getLifeState().lives >= MAX_BANANA_LIVES ||
    tile.special ||
    !tile.circle.active
  ) return;

  state.tile = tile;
  (tile as any).bananaLife = true;
  tile.circle.setTexture("banana-life").setDisplaySize(104, 104).setDepth(14);

  scene.tweens.add({
    targets: tile.circle,
    scaleX: tile.circle.scaleX * 1.08,
    scaleY: tile.circle.scaleY * 1.08,
    duration: 420,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  tile.circle.on("pointerup", () => {
    const current = stateFor(scene);
    if (current.tile !== tile || current.collecting || runtime(scene).levelCompleted) return;
    collectBananaFromBoard(scene, tile, true);
  });
};

const maybeScheduleBanana = (scene: GameScene, tile: Tile, fromAbove: boolean) => {
  if (!fromAbove) return;
  const state = stateFor(scene);
  if (state.tile || state.collecting || getLifeState().lives >= MAX_BANANA_LIVES) return;
  state.nextIn--;
  if (state.nextIn > 0) return;
  state.nextIn = Phaser.Math.Between(22, 45);
  scene.time.delayedCall(20, () => turnIntoBanana(scene, tile));
};

const originalPreload = proto.preload as (this: GameScene) => void;
proto.preload = function (this: GameScene) {
  originalPreload.call(this);
  this.load.image("banana-life", "/banana-life.svg");
};

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  bananaStates.set(this, { tile: null, nextIn: Phaser.Math.Between(16, 30), collecting: false });

  // Il vecchio tweak poteva generare un'emoji banana sovrapposta all'avvio.
  // Forzando temporaneamente Math.random alto, quella strada resta inattiva.
  const nativeRandom = Math.random;
  Math.random = () => 1;
  try {
    originalCreate.call(this);
  } finally {
    Math.random = nativeRandom;
  }
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
  maybeScheduleBanana(this, tile, fromAbove);
  return tile;
};

const originalProcessMatches = proto.processMatches as (
  this: GameScene,
  matches: Tile[],
  cascade: boolean,
) => void;

proto.processMatches = function (this: GameScene, matches: Tile[], cascade: boolean) {
  const banana = stateFor(this).tile;
  if (banana && matches.includes(banana)) collectBananaFromBoard(this, banana, false);
  originalProcessMatches.call(this, matches, cascade);
};

const originalDamageIceAround = proto.damageIceAround as (this: GameScene, tiles: Tile[]) => void;
proto.damageIceAround = function (this: GameScene, tiles: Tile[]) {
  const banana = stateFor(this).tile;
  if (banana && tiles.includes(banana)) collectBananaFromBoard(this, banana, false);
  originalDamageIceAround.call(this, tiles);
};

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
  if (slot === 2) return [
    { kind: "shuffle", amount: 1 },
    { kind: "rocket", amount: 1 },
  ];
  if (slot === 3) return [
    { kind: "hammer", amount: 1 },
    { kind: "rocket", amount: 1 },
  ];

  if (getLifeState().lives < MAX_BANANA_LIVES) return [{ kind: "banana", amount: 1 }];
  return [{ kind: "shuffle", amount: 1 }];
};

const rewardLabel = (reward: Reward) => {
  if (reward.kind === "banana") return `🍌 +${reward.amount} VITA`;
  if (reward.kind === "hammer") return `🔨 +${reward.amount} MARTELLO`;
  if (reward.kind === "rocket") return `🚀 +${reward.amount} RAZZO`;
  return `🔀 +${reward.amount} MESCOLA`;
};

const persistBoosterReward = (scene: GameScene, rewards: Reward[]) => {
  const counts = readBoosterCounts();
  rewards.forEach((reward) => {
    if (reward.kind === "banana") return;
    counts[reward.kind] = Math.min(99, counts[reward.kind] + reward.amount);
  });

  const r = runtime(scene);
  r.shuffleUses = counts.shuffle;
  r.hammerUses = counts.hammer;
  r.rocketUses = counts.rocket;

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

  window.dispatchEvent(
    new CustomEvent<BoosterCounts>("chiki-boosters-changed", { detail: counts }),
  );
};

const applyMilestoneReward = (scene: GameScene, rewards: Reward[]) => {
  persistBoosterReward(scene, rewards);
  rewards.forEach((reward) => {
    if (reward.kind === "banana") addBananaLife(reward.amount);
  });
  playGiftChime();
};

const showMilestoneGift = (scene: GameScene, level: number) => {
  if (level % 5 !== 0) return;
  if (readClaimed()[String(level)]) return;

  const rewards = rewardForLevel(level);
  const depth = 5000;
  const shade = scene.add.rectangle(540, 960, 1080, 1920, 0x071322, 0.88).setDepth(depth);
  const panel = scene.add.graphics().setDepth(depth + 1);
  panel.fillStyle(0x0d4f8b, 1);
  panel.fillRoundedRect(100, 330, 880, 1240, 70);
  panel.fillStyle(0x176db4, 1);
  panel.fillRoundedRect(125, 355, 830, 1190, 55);
  panel.lineStyle(14, 0xffcb3c, 1);
  panel.strokeRoundedRect(110, 340, 860, 1220, 62);
  panel.lineStyle(4, 0xfff0a0, 0.9);
  panel.strokeRoundedRect(130, 360, 820, 1180, 48);

  const title = scene.add
    .text(540, 445, "CHIKI HA UN REGALO!", {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "62px",
      color: "#fff6cf",
      stroke: "#15385c",
      strokeThickness: 11,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(depth + 2);

  const chiki = scene.add
    .image(540, 760, "chiki-character")
    .setDisplaySize(500, 525)
    .setDepth(depth + 2)
    .setScale(0.2)
    .setAlpha(0);

  scene.tweens.add({
    targets: chiki,
    alpha: 1,
    scale: 1,
    duration: 420,
    ease: "Back.easeOut",
  });

  const rewardText = scene.add
    .text(540, 1085, rewards.map(rewardLabel).join("\n"), {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: rewards.length > 1 ? "46px" : "54px",
      color: "#fff36c",
      stroke: "#553412",
      strokeThickness: 8,
      align: "center",
      lineSpacing: 12,
    })
    .setOrigin(0.5)
    .setDepth(depth + 2)
    .setScale(0.7);

  scene.tweens.add({
    targets: rewardText,
    scale: 1,
    duration: 320,
    delay: 250,
    ease: "Back.easeOut",
  });

  const button = scene.add
    .rectangle(540, 1330, 520, 126, 0x63c53e, 1)
    .setStrokeStyle(9, 0xffed7c, 1)
    .setDepth(depth + 2)
    .setInteractive({ useHandCursor: true });

  const buttonText = scene.add
    .text(540, 1322, "PRENDI IL REGALO", {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "48px",
      color: "#fff9d8",
      stroke: "#2d681c",
      strokeThickness: 8,
    })
    .setOrigin(0.5)
    .setDepth(depth + 3)
    .setInteractive({ useHandCursor: true });

  const claim = () => {
    if (!button.input?.enabled) return;
    button.disableInteractive();
    buttonText.disableInteractive();
    applyMilestoneReward(scene, rewards);
    markClaimed(level);
    rewardText.setText(`${rewards.map(rewardLabel).join("\n")}\n\nRICEVUTO!`);

    for (let i = 0; i < 18; i++) {
      const spark = scene.add
        .circle(
          540 + Phaser.Math.Between(-210, 210),
          990 + Phaser.Math.Between(-100, 100),
          Phaser.Math.Between(5, 11),
          Phaser.Utils.Array.GetRandom([0xffe55c, 0xffffff, 0x8ff06d, 0x6edcff]),
          1,
        )
        .setDepth(depth + 4);
      scene.tweens.add({
        targets: spark,
        y: spark.y - Phaser.Math.Between(100, 230),
        x: spark.x + Phaser.Math.Between(-80, 80),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(500, 850),
        onComplete: () => spark.destroy(),
      });
    }

    scene.time.delayedCall(850, () => {
      [shade, panel, title, chiki, rewardText, button, buttonText].forEach((item) => item.destroy());
    });
  };

  button.on("pointerup", claim);
  buttonText.on("pointerup", claim);
};

const originalShowLevelCompleted = proto.showLevelCompleted as (this: GameScene) => void;
proto.showLevelCompleted = function (this: GameScene) {
  const alreadyCompleted = runtime(this).levelCompleted;
  originalShowLevelCompleted.call(this);
  if (alreadyCompleted) return;
  const level = Math.max(1, Number(runtime(this).currentLevel || 1));
  if (level % 5 === 0) this.time.delayedCall(350, () => showMilestoneGift(this, level));
};
