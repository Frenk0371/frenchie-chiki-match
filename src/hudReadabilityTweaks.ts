import Phaser from "phaser";
import GameScene from "./game/GameScene";

// Migliora la leggibilità del riquadro obiettivi su iPhone senza alterare il gameplay.
const proto = GameScene.prototype as any;

const originalCreateHud = proto.createHud as (this: GameScene) => void;
proto.createHud = function (this: GameScene) {
  originalCreateHud.call(this);

  const objectiveText = (this as any).objectiveText as Phaser.GameObjects.Text | undefined;
  if (!objectiveText) return;

  objectiveText
    .setFontFamily('"Lilita One", "Fredoka", sans-serif')
    .setFontSize(38)
    .setFontStyle("bold")
    .setColor("#3f2148")
    .setStroke("#fff7dd", 2)
    .setAlign("center")
    .setLineSpacing(8)
    .setWordWrapWidth(248, false)
    .setFixedSize(250, 118)
    .setPadding(0, 2, 0, 0)
    .setOrigin(0.5);
};

const originalUpdateObjective = proto.updateObjectiveAndProgress as (this: GameScene) => void;
proto.updateObjectiveAndProgress = function (this: GameScene) {
  originalUpdateObjective.call(this);

  const objectiveText = (this as any).objectiveText as Phaser.GameObjects.Text | undefined;
  if (!objectiveText) return;

  const lineCount = Math.max(1, objectiveText.text.split("\n").length);
  // Due righe: molto grandi. Se entrano obiettivi avanzati, riduce solo quanto basta per non tagliare il testo.
  const size = lineCount <= 2 ? 38 : lineCount === 3 ? 30 : 25;
  objectiveText.setFontSize(size).setLineSpacing(lineCount <= 2 ? 8 : 3);
};
