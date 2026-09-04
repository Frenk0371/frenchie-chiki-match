import Phaser from "phaser";
import GameScene from "./game/GameScene";

// HUD leggibile su mobile: in alto solo livello/punti e mosse;
// obiettivi grandi in basso a destra, accanto al contatore vite.
const proto = GameScene.prototype as any;

const compactObjectiveText = (value: string) =>
  value
    .replace(/CUORI/g, "❤️")
    .replace(/OSSA/g, "🦴")
    .replace(/TRIFOGLI/g, "🍀")
    .replace(/FIORI/g, "🌸")
    .replace(/GEMME/g, "💎")
    .replace(/CHIKI/g, "🐶");

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

  // Nuovo pannello obiettivi grande in basso a destra.
  const objectivePanel = this.add.graphics().setDepth(40);
  objectivePanel.fillStyle(0x4b260d, 0.96);
  objectivePanel.fillRoundedRect(548, 1605, 480, 245, 36);
  objectivePanel.fillStyle(0x7b3f16, 1);
  objectivePanel.fillRoundedRect(558, 1592, 460, 235, 32);
  objectivePanel.lineStyle(9, 0xffe18a, 1);
  objectivePanel.strokeRoundedRect(548, 1592, 480, 245, 36);
  objectivePanel.lineStyle(4, 0xffb82f, 1);
  objectivePanel.strokeRoundedRect(562, 1606, 452, 217, 28);

  this.add
    .text(788, 1632, "OBIETTIVI", {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "31px",
      color: "#ffe873",
      fontStyle: "bold",
      stroke: "#54280e",
      strokeThickness: 4,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(42);

  objectiveText
    .setPosition(788, 1736)
    .setFontFamily('"Lilita One", "Fredoka", sans-serif')
    .setFontSize(54)
    .setFontStyle("bold")
    .setColor("#ffffff")
    .setStroke("#3a1707", 6)
    .setAlign("center")
    .setLineSpacing(10)
    .setWordWrapWidth(430, false)
    .setFixedSize(430, 150)
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
  const size = lineCount <= 2 ? 54 : lineCount === 3 ? 43 : 34;
  objectiveText
    .setPosition(788, lineCount <= 2 ? 1738 : 1746)
    .setFontSize(size)
    .setLineSpacing(lineCount <= 2 ? 10 : 4)
    .setFixedSize(430, 160)
    .setDepth(42);
};
