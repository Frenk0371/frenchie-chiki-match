import Phaser from "phaser";
import GameScene from "./game/GameScene";
import { levels } from "./game/levels";

type MatchTile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const proto = GameScene.prototype as any;
const TILE_SIZE = 120;
const SELECTED_SIZE = 130;
let rockAudio: AudioContext | null = null;

const sceneRuntime = (scene: GameScene): any => scene as any;

const audioContext = () => {
  if (rockAudio) return rockAudio;
  const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  rockAudio = new AudioContextClass();
  return rockAudio;
};

const unlockAudio = () => {
  const context = audioContext();
  if (context?.state === "suspended") void context.resume();
};

window.addEventListener("pointerdown", unlockAudio, { passive: true });

const playStrongRockCrumble = (amount: number) => {
  const context = audioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const now = context.currentTime;
  const duration = Math.min(0.5, 0.3 + amount * 0.014);
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  let lowNoise = 0;

  for (let index = 0; index < data.length; index++) {
    const white = Math.random() * 2 - 1;
    lowNoise = lowNoise * 0.76 + white * 0.24;
    const t = index / data.length;
    const envelope = Math.pow(1 - t, 1.35);
    const grit = Math.random() > 0.965 ? (Math.random() * 2 - 1) * 1.8 : 0;
    data[index] = (lowNoise * 0.82 + grit) * envelope;
  }

  const noise = context.createBufferSource();
  noise.buffer = buffer;

  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.setValueAtTime(120, now);

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(2100 + Math.min(900, amount * 55), now);
  lowpass.Q.setValueAtTime(0.7, now);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.min(0.27, 0.18 + amount * 0.009), now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noise.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(context.destination);
  noise.start(now);
  noise.stop(now + duration);

  const impacts = Math.min(7, 3 + Math.floor(amount / 2));
  for (let index = 0; index < impacts; index++) {
    const start = now + index * 0.026 + Math.random() * 0.018;
    const oscillator = context.createOscillator();
    const impactGain = context.createGain();
    oscillator.type = index % 2 === 0 ? "triangle" : "sine";
    const frequency = 78 + Math.random() * 95;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(42 + Math.random() * 20, start + 0.12);
    impactGain.gain.setValueAtTime(0.0001, start);
    impactGain.gain.exponentialRampToValueAtTime(0.055 + Math.random() * 0.035, start + 0.006);
    impactGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    oscillator.connect(impactGain);
    impactGain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.15);
  }
};

const originalCreateTile = proto.createTile as (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove?: boolean,
) => MatchTile;

proto.createTile = function (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove = false,
) {
  const tile = originalCreateTile.call(this, row, col, type, fromAbove);
  tile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  return tile;
};

const originalSelectTile = proto.selectTile as (this: GameScene, tile: MatchTile) => void;
proto.selectTile = function (this: GameScene, tile: MatchTile) {
  const runtime = sceneRuntime(this);
  const previous = runtime.selectedTile as MatchTile | null;
  originalSelectTile.call(this, tile);

  if (previous?.circle.active && previous !== runtime.selectedTile) {
    previous.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  }
  if (tile.circle.active && tile !== runtime.selectedTile) {
    tile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  }
  if (runtime.selectedTile?.circle.active) {
    runtime.selectedTile.circle.setDisplaySize(SELECTED_SIZE, SELECTED_SIZE);
  }
};

const originalCreateHud = proto.createHud as (this: GameScene) => void;
proto.createHud = function (this: GameScene) {
  originalCreateHud.call(this);
  const runtime = sceneRuntime(this);

  runtime.movesText?.setFontSize(48).setStroke("#fff4ce", 3);
  runtime.objectiveText?.setFontSize(25).setWordWrapWidth(245, false);
  runtime.scoreText?.setFontSize(31);

  this.children.list.forEach((child) => {
    if (!(child instanceof Phaser.GameObjects.Text)) return;
    if (child.text.startsWith("LIVELLO ")) {
      child.setFontSize(31).setStroke("#fff4ce", 1);
    }
  });
};

const drawLargeBomb = (scene: GameScene, x: number, y: number) => {
  const graphic = scene.add.graphics().setDepth(12);
  graphic.fillStyle(0x252833, 1);
  graphic.fillCircle(x, y + 6, 45);
  graphic.lineStyle(7, 0x101117, 1);
  graphic.strokeCircle(x, y + 6, 45);
  graphic.fillStyle(0xffffff, 0.5);
  graphic.fillCircle(x - 16, y - 11, 11);
  graphic.lineStyle(8, 0x704126, 1);
  graphic.beginPath();
  graphic.moveTo(x + 27, y - 25);
  graphic.lineTo(x + 43, y - 45);
  graphic.strokePath();
  graphic.fillStyle(0xffd13b, 1);
  graphic.fillCircle(x + 49, y - 50, 11);
};

const drawLargeBreaker = (scene: GameScene, x: number, y: number) => {
  const graphic = scene.add.graphics().setDepth(12);
  graphic.lineStyle(10, 0x69d5ff, 1);
  for (let index = 0; index < 3; index++) {
    const angle = (Math.PI / 3) * index;
    const dx = Math.cos(angle) * 44;
    const dy = Math.sin(angle) * 44;
    graphic.beginPath();
    graphic.moveTo(x - dx, y - dy);
    graphic.lineTo(x + dx, y + dy);
    graphic.strokePath();
  }
  graphic.fillStyle(0xff8525, 1);
  graphic.fillCircle(x + 30, y + 29, 21);
  graphic.fillStyle(0xffdf5a, 1);
  graphic.fillCircle(x + 23, y + 21, 11);
};

const boosterTitles: Record<number, string> = {
  1: "AIUTI DI CHIKI",
  2: "AIUTI POLARI",
  3: "AIUTI REALI",
  4: "AIUTI INCANTATI",
  5: "AIUTI VULCANICI",
};

const originalCreateBoosterTray = proto.createBoosterTray as (this: GameScene) => void;
proto.createBoosterTray = function (this: GameScene) {
  const before = new Set(this.children.list);
  originalCreateBoosterTray.call(this);
  const created = this.children.list.filter((child) => !before.has(child));
  const runtime = sceneRuntime(this);
  const config = levels[Math.max(0, runtime.currentLevel - 1)];

  created.forEach((child) => {
    if (child instanceof Phaser.GameObjects.Image && child.texture.key.startsWith("booster-")) {
      child.setDisplaySize(118, 118).setDepth(11);
    }

    if (!(child instanceof Phaser.GameObjects.Text)) return;

    if (child.text.startsWith("AIUTI ")) {
      child.setText(boosterTitles[config.world] ?? "AIUTI DI CHIKI").setFontSize(32);
      return;
    }

    if (["MESCOLA", "MARTELLO", "RAZZO", "BOMBA", "SCIOGLI"].includes(child.text)) {
      child.setFontSize(child.text === "SCIOGLI" ? 23 : 26);
      return;
    }

    if (/^\d+$/.test(child.text) && child.y > 1470) {
      child.setFontSize(35).setPadding(12, 6);
    }
  });

  created
    .filter((child): child is Phaser.GameObjects.Text => child instanceof Phaser.GameObjects.Text)
    .forEach((label) => {
      if (label.text === "BOMBA") drawLargeBomb(this, label.x - 48, 1525);
      if (label.text === "SCIOGLI") drawLargeBreaker(this, label.x - 48, 1525);
    });
};

const originalProcessMatches = proto.processMatches as (
  this: GameScene,
  matches: MatchTile[],
  cascade: boolean,
) => void;

proto.processMatches = function (this: GameScene, matches: MatchTile[], cascade: boolean) {
  playStrongRockCrumble(matches.length);
  originalProcessMatches.call(this, matches, cascade);
};

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  originalCreate.call(this);
  const runtime = sceneRuntime(this);
  const config = levels[Math.max(0, runtime.currentLevel - 1)];
  const tintByWorld: Record<number, number> = {
    2: 0xcceeff,
    3: 0xe4d1ff,
    4: 0x8fc79e,
    5: 0xffb07c,
  };

  this.children.list.forEach((child) => {
    if (!(child instanceof Phaser.GameObjects.Image) || child.texture.key !== "garden-bg") return;
    const tint = tintByWorld[config.world];
    if (tint) child.setTint(tint);
    else child.clearTint();
  });
};

const fixWorldStarCounter = () => {
  document.querySelectorAll<HTMLElement>(".map-title > span").forEach((element) => {
    if (element.textContent?.includes("/45")) {
      element.textContent = element.textContent.replace("/45", "/60");
    }
  });
};

const observer = new MutationObserver(fixWorldStarCounter);
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
fixWorldStarCounter();
