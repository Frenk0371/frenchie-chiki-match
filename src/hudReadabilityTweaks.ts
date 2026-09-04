import Phaser from "phaser";
import GameScene from "./game/GameScene";

// Rende il riquadro obiettivi immediatamente leggibile su iPhone.
const proto = GameScene.prototype as any;

const originalCreateHud = proto.createHud as (this: GameScene) => void;
proto.createHud = function (this: GameScene) {
  originalCreateHud.call(this);

  const objectiveText = (this as any).objectiveText as Phaser.GameObjects.Text | undefined;
  if (!objectiveText) return;

  // Sposta leggermente verso destra e sfrutta quasi tutto il box.
  objectiveText
    .setPosition(838, 246)
    .setFontFamily('"Lilita One", "Fredoka", sans-serif')
    .setFontSize(48)
    .setFontStyle("bold")
    .setColor("#35153f")
    .setStroke("#fff7dd", 3)
    .setAlign("center")
    .setLineSpacing(10)
    .setWordWrapWidth(270, false)
    .setFixedSize(276, 122)
    .setPadding(0, 0, 0, 0)
    .setOrigin(0.5)
    .setDepth(5);
};

const originalUpdateObjective = proto.updateObjectiveAndProgress as (this: GameScene) => void;
proto.updateObjectiveAndProgress = function (this: GameScene) {
  originalUpdateObjective.call(this);

  const objectiveText = (this as any).objectiveText as Phaser.GameObjects.Text | undefined;
  if (!objectiveText) return;

  const lines = objectiveText.text.split("\n").filter(Boolean);
  const lineCount = Math.max(1, lines.length);
  const longest = Math.max(...lines.map((line) => line.length), 1);

  // Due righe come nello screenshot: molto grandi. Riduce solo quando il testo è davvero lungo.
  let size = 48;
  if (lineCount === 2 && longest > 12) size = 44;
  if (lineCount === 3) size = 36;
  if (lineCount >= 4) size = 30;

  objectiveText
    .setFontSize(size)
    .setLineSpacing(lineCount <= 2 ? 10 : 4)
    .setWordWrapWidth(270, false)
    .setFixedSize(276, 122)
    .setPosition(838, 246)
    .setDepth(5);
};
