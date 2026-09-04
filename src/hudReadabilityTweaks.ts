import Phaser from "phaser";
import GameScene from "./game/GameScene";

// HUD mobile: in alto solo livello/punti e mosse; obiettivi compatti sotto gli aiuti.
// Gli aiuti emettono un breve suono solo quando vengono realmente consumati.
const proto = GameScene.prototype as any;

const compactObjectiveText = (value: string) =>
  value
    .replace(/CUORI/g, "❤️")
    .replace(/OSSA/g, "🦴")
    .replace(/TRIFOGLI/g, "🍀")
    .replace(/FIORI/g, "🌸")
    .replace(/GEMME/g, "💎")
    .replace(/CHIKI/g, "🐶");

let boosterAudioContext: AudioContext | null = null;

const getBoosterAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!boosterAudioContext) boosterAudioContext = new AudioContextCtor();
  if (boosterAudioContext.state === "suspended") void boosterAudioContext.resume();
  return boosterAudioContext;
};

const playTone = (
  ctx: AudioContext,
  type: OscillatorType,
  startFrequency: number,
  endFrequency: number,
  duration: number,
  volume: number,
  delay = 0,
) => {
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

const playBoosterSound = (label: string) => {
  const ctx = getBoosterAudioContext();
  if (!ctx) return;

  if (label === "MESCOLA") {
    // Doppio scintillio crescente, rapido e leggero.
    playTone(ctx, "sine", 360, 820, 0.24, 0.075);
    playTone(ctx, "triangle", 560, 1180, 0.20, 0.045, 0.05);
    return;
  }

  if (label === "MARTELLO") {
    // Colpo cartoon corto e pieno.
    playTone(ctx, "triangle", 150, 58, 0.17, 0.12);
    playTone(ctx, "sine", 92, 48, 0.12, 0.07, 0.015);
    return;
  }

  if (label === "RAZZO") {
    // Whoosh ascendente da lancio.
    playTone(ctx, "sawtooth", 190, 960, 0.34, 0.065);
    playTone(ctx, "sine", 280, 1320, 0.27, 0.045, 0.035);
  }
};

const originalCreateHud = proto.createHud as (this: GameScene) => void;
proto.createHud = function (this: GameScene) {
  originalCreateHud.call(this);

  const scene = this as any;
  const scoreText = scene.scoreText as Phaser.GameObjects.Text | undefined;
  const movesText = scene.movesText as Phaser.GameObjects.Text | undefined;
  const objectiveText = scene.objectiveText as Phaser.GameObjects.Text | undefined;
  if (!scoreText || !movesText || !objectiveText) return;

  // Copre i tre box originali e ricostruisce un HUD superiore a due soli blocchi.
  const topCover = this.add.graphics().setDepth(40);
  topCover.fillStyle(0x0a3155, 1);
  topCover.fillRoundedRect(92, 164, 896, 170, 34);
  topCover.lineStyle(5, 0xffb52a, 1);
  topCover.strokeRoundedRect(92, 164, 896, 170, 34);

  const drawTopCard = (x: number, width: number) => {
    topCover.fillStyle(0x5f350e, 0.72);
    topCover.fillRoundedRect(x, 194, width, 142, 30);
    topCover.fillStyle(0x0870b6, 1);
    topCover.fillRoundedRect(x, 178, width, 142, 30);
    topCover.fillStyle(0xfff5d6, 1);
    topCover.fillRoundedRect(x + 10, 188, width - 20, 115, 23);
    topCover.fillStyle(0xffffff, 0.75);
    topCover.fillRoundedRect(x + 30, 194, width - 60, 8, 4);
    topCover.lineStyle(6, 0xffba2e, 1);
    topCover.strokeRoundedRect(x, 178, width, 142, 30);
  };

  drawTopCard(112, 410);
  drawTopCard(558, 410);

  this.add
    .text(317, 216, `LIVELLO ${scene.currentLevel}`, {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "30px",
      color: "#56315f",
      fontStyle: "bold",
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(42);

  scoreText
    .setPosition(317, 270)
    .setFontFamily('"Lilita One", "Fredoka", sans-serif')
    .setFontSize(32)
    .setFontStyle("bold")
    .setColor("#402749")
    .setAlign("center")
    .setDepth(42);

  movesText
    .setPosition(763, 250)
    .setFontFamily('"Lilita One", "Fredoka", sans-serif')
    .setFontSize(44)
    .setFontStyle("bold")
    .setColor("#7a2b79")
    .setStroke("#fff4ce", 2)
    .setAlign("center")
    .setDepth(42);

  // Pannello obiettivi compatto: completamente sotto la barra degli aiuti e affiancato alle vite.
  const objectivePanel = this.add.graphics().setDepth(40);
  objectivePanel.fillStyle(0x4b260d, 0.96);
  objectivePanel.fillRoundedRect(615, 1692, 395, 176, 30);
  objectivePanel.fillStyle(0x7b3f16, 1);
  objectivePanel.fillRoundedRect(622, 1682, 381, 166, 27);
  objectivePanel.lineStyle(7, 0xffe18a, 1);
  objectivePanel.strokeRoundedRect(615, 1682, 395, 176, 30);
  objectivePanel.lineStyle(3, 0xffb82f, 1);
  objectivePanel.strokeRoundedRect(627, 1694, 371, 150, 23);

  this.add
    .text(812, 1713, "OBIETTIVI", {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "25px",
      color: "#ffe873",
      fontStyle: "bold",
      stroke: "#54280e",
      strokeThickness: 3,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(42);

  objectiveText
    .setPosition(812, 1787)
    .setFontFamily('"Lilita One", "Fredoka", sans-serif')
    .setFontSize(42)
    .setFontStyle("bold")
    .setColor("#ffffff")
    .setStroke("#3a1707", 5)
    .setAlign("center")
    .setLineSpacing(4)
    .setWordWrapWidth(350, false)
    .setFixedSize(350, 112)
    .setPadding(0, 0, 0, 0)
    .setOrigin(0.5)
    .setDepth(42);
};

const originalUpdateObjective = proto.updateObjectiveAndProgress as (this: GameScene) => void;
proto.updateObjectiveAndProgress = function (this: GameScene) {
  originalUpdateObjective.call(this);

  const objectiveText = (this as any).objectiveText as Phaser.GameObjects.Text | undefined;
  if (!objectiveText) return;

  objectiveText.setText(compactObjectiveText(objectiveText.text));

  const lineCount = Math.max(1, objectiveText.text.split("\n").length);
  const size = lineCount <= 2 ? 42 : lineCount === 3 ? 34 : 28;
  objectiveText
    .setPosition(812, lineCount <= 2 ? 1788 : 1794)
    .setFontSize(size)
    .setLineSpacing(lineCount <= 2 ? 4 : 1)
    .setFixedSize(350, 118)
    .setDepth(42);
};

// Suoni distinti per gli aiuti. Il suono parte soltanto se il contatore dell'aiuto diminuisce.
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
  const actionWithSound = () => {
    const before = remaining();
    action();
    const after = remaining();
    if (after < before) playBoosterSound(label);
  };

  originalCreateBoosterButton.call(this, x, iconKey, label, actionWithSound, remaining);
};
