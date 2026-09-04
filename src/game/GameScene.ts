import Phaser from "phaser";
import { levels } from "./levels";

type Tile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
};

type IceCell = {
  row: number;
  col: number;
  hits: number;
  maxHits: number;
  graphic: Phaser.GameObjects.Graphics;
};

export default class GameScene extends Phaser.Scene {
  private readonly rows = 8;
  private readonly cols = 7;
  private readonly tileSize = 120;
  private readonly boardY = 390;
  private readonly tileKeys = [
    "heart",
    "bone",
    "clover",
    "flower",
    "gem",
    "chiki",
  ];

  private readonly colorNames = [
    "CUORI",
    "OSSA",
    "TRIFOGLI",
    "FIORI",
    "GEMME",
    "CHIKI",
  ];

  private board: (Tile | null)[][] = [];
  private iceCells = new Map<string, IceCell>();
  private iceBrokenCells = 0;
  private iceTotalCells = 0;

  private score = 0;
  private collectedAmount = 0;
  private collectedAmount2 = 0;
  private comboMultiplier = 1;

  private scoreText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;

  private currentLevel = 1;
  private moves = 20;
  private targetScore = 0;
  private selectedTile: Tile | null = null;
  private levelCompleted = false;
  private isProcessing = false;

  private shuffleUses = 3;
  private hammerUses = 3;
  private rocketUses = 2;

  private get currentLevelConfig() {
    return levels[this.currentLevel - 1];
  }

  constructor(startLevel = 1) {
    super("GameScene");
    this.currentLevel = Phaser.Math.Clamp(startLevel, 1, levels.length);
    this.moves = this.currentLevelConfig.moves;
    this.targetScore = this.currentLevelConfig.targetScore;
  }

  preload() {
    this.load.image("garden-bg", "/garden-game-bg.jpg");
    this.load.image("chiki-character", "/chiki-character.webp");
    this.load.image("booster-shuffle", "/booster-shuffle.webp");
    this.load.image("booster-hammer", "/booster-hammer.webp");
    this.load.image("booster-rocket", "/booster-rocket.webp");
    this.load.image("victory-reward", "/victory-reward.png");
    this.tileKeys.forEach((key) =>
      this.load.image(`tile-${key}`, `/tiles/${key}.png`),
    );
  }

  create() {
    this.resetRuntimeState();

    this.add.image(540, 960, "garden-bg").setDisplaySize(1080, 1920);
    this.add.rectangle(540, 960, 1080, 1920, 0x16324a, 0.13);

    this.createHud();
    this.createBoard();
    this.createIceLayer();
    this.createBoosterTray();
    this.updateObjectiveAndProgress();
  }

  private resetRuntimeState() {
    this.score = 0;
    this.collectedAmount = 0;
    this.collectedAmount2 = 0;
    this.comboMultiplier = 1;
    this.moves = this.currentLevelConfig.moves;
    this.targetScore = this.currentLevelConfig.targetScore;
    this.selectedTile = null;
    this.levelCompleted = false;
    this.isProcessing = false;
    this.iceBrokenCells = 0;
    this.iceTotalCells = 0;
    this.iceCells.clear();
  }

  private createHud() {
    const hud = this.add.graphics();
    hud.fillStyle(0x06182f, 0.9);
    hud.fillRoundedRect(120, 70, 840, 104, 42);
    hud.fillStyle(0x09518f, 1);
    hud.fillRoundedRect(120, 56, 840, 98, 42);
    hud.fillStyle(0x1d8cd0, 1);
    hud.fillRoundedRect(145, 66, 790, 15, 8);
    hud.lineStyle(8, 0xffad12, 1);
    hud.strokeRoundedRect(120, 56, 840, 98, 42);
    hud.lineStyle(3, 0xffed70, 1);
    hud.strokeRoundedRect(130, 65, 820, 78, 35);

    [112, 405, 698].forEach((x) => {
      hud.fillStyle(0x5f350e, 0.72);
      hud.fillRoundedRect(x, 194, 270, 142, 30);
      hud.fillStyle(0x0870b6, 1);
      hud.fillRoundedRect(x, 178, 270, 142, 30);
      hud.fillStyle(0xfff5d6, 1);
      hud.fillRoundedRect(x + 10, 188, 250, 115, 23);
      hud.fillStyle(0xffffff, 0.75);
      hud.fillRoundedRect(x + 30, 194, 210, 8, 4);
      hud.lineStyle(6, 0xffba2e, 1);
      hud.strokeRoundedRect(x, 178, 270, 142, 30);
    });

    this.add
      .text(540, 105, "FRENCHIE CHIKI MATCH", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "42px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#07325d",
        strokeThickness: 7,
        shadow: {
          offsetX: 0,
          offsetY: 6,
          color: "#031a32",
          blur: 0,
          fill: true,
        },
      })
      .setOrigin(0.5);

    this.add
      .text(247, 218, `LIVELLO ${this.currentLevel}`, {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "25px",
        color: "#56315f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.scoreText = this.add
      .text(247, 271, "0\nPUNTI", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "28px",
        color: "#402749",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    this.movesText = this.add
      .text(540, 250, `${this.moves}\nMOSSE`, {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "39px",
        color: "#7a2b79",
        fontStyle: "bold",
        align: "center",
        stroke: "#fff4ce",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.objectiveText = this.add
      .text(833, 250, "", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "20px",
        color: "#402749",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 235 },
      })
      .setOrigin(0.5);

    const progress = this.add.graphics();
    progress.fillStyle(0x06284c, 0.95);
    progress.fillRoundedRect(230, 337, 620, 30, 15);
    progress.lineStyle(5, 0xffbd2f, 1);
    progress.strokeRoundedRect(230, 337, 620, 30, 15);

    this.progressFill = this.add
      .rectangle(240, 352, 0, 18, 0x65da31, 1)
      .setOrigin(0, 0.5);

    this.add
      .text(193, 350, "★", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "50px",
        color: "#ffd438",
        stroke: "#a65d00",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.comboText = this.add
      .text(540, 350, "", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "26px",
        color: "#ffff00",
        fontStyle: "bold",
        stroke: "#634800",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
  }

  private createBoard() {
    const boardWidth = this.cols * this.tileSize;
    const boardHeight = this.rows * this.tileSize;
    const startX = (1080 - boardWidth) / 2;
    const startY = this.boardY;

    const boardPanel = this.add.graphics();
    boardPanel.fillStyle(0x061426, 0.7);
    boardPanel.fillRoundedRect(
      startX - 24,
      startY - 12,
      boardWidth + 48,
      boardHeight + 48,
      28,
    );
    boardPanel.fillStyle(0x102e50, 0.92);
    boardPanel.fillRoundedRect(
      startX - 24,
      startY - 24,
      boardWidth + 48,
      boardHeight + 48,
      28,
    );
    boardPanel.lineStyle(8, 0xffdf6f, 1);
    boardPanel.strokeRoundedRect(
      startX - 24,
      startY - 24,
      boardWidth + 48,
      boardHeight + 48,
      28,
    );
    boardPanel.lineStyle(4, 0x426e9e, 0.75);
    boardPanel.strokeRoundedRect(
      startX - 14,
      startY - 14,
      boardWidth + 28,
      boardHeight + 28,
      21,
    );

    this.board = [];

    for (let row = 0; row < this.rows; row++) {
      this.board[row] = [];
      for (let col = 0; col < this.cols; col++) {
        let type: number;
        do {
          type = Phaser.Math.Between(0, this.tileKeys.length - 1);
        } while (this.createsInitialMatch(row, col, type));

        this.board[row][col] = this.createTile(row, col, type);
      }
    }

    if (!this.hasAvailableMove()) this.shuffleBoard();
  }

  private createTile(row: number, col: number, type: number, fromAbove = false) {
    const boardWidth = this.cols * this.tileSize;
    const startX = (1080 - boardWidth) / 2;
    const x = startX + col * this.tileSize + this.tileSize / 2;
    const finalY = this.boardY + row * this.tileSize + this.tileSize / 2;

    const circle = this.add
      .image(x, fromAbove ? finalY - this.tileSize * 2 : finalY, `tile-${this.tileKeys[type]}`)
      .setDisplaySize(110, 110)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    const tile: Tile = { row, col, type, circle };

    circle.on("pointerup", () => {
      if (this.moves <= 0 || this.levelCompleted || this.isProcessing) return;
      this.selectTile(tile);
    });

    if (fromAbove) {
      this.tweens.add({
        targets: circle,
        y: finalY,
        duration: 300,
        ease: "Bounce.easeOut",
      });
    }

    return tile;
  }

  private createIceLayer() {
    const cells = this.currentLevelConfig.iceCells ?? [];
    this.iceTotalCells = cells.length;

    cells.forEach((config) => {
      if (
        config.row < 0 ||
        config.row >= this.rows ||
        config.col < 0 ||
        config.col >= this.cols
      ) {
        return;
      }

      const hits = Math.max(1, config.hits ?? 1);
      const cell: IceCell = {
        row: config.row,
        col: config.col,
        hits,
        maxHits: hits,
        graphic: this.add.graphics().setDepth(6),
      };
      this.iceCells.set(this.iceKey(config.row, config.col), cell);
      this.drawIceCell(cell);
    });
  }

  private drawIceCell(cell: IceCell) {
    const boardWidth = this.cols * this.tileSize;
    const startX = (1080 - boardWidth) / 2;
    const x = startX + cell.col * this.tileSize + this.tileSize / 2;
    const y = this.boardY + cell.row * this.tileSize + this.tileSize / 2;
    const g = cell.graphic;

    g.clear();
    const strong = cell.hits > 1;
    g.fillStyle(strong ? 0x9deaff : 0xbcefff, strong ? 0.52 : 0.36);
    g.fillRoundedRect(x - 53, y - 53, 106, 106, 20);
    g.lineStyle(strong ? 8 : 6, 0xdffaff, 0.95);
    g.strokeRoundedRect(x - 53, y - 53, 106, 106, 20);
    g.lineStyle(3, 0xffffff, 0.86);
    g.beginPath();
    g.moveTo(x - 27, y - 48);
    g.lineTo(x - 4, y - 13);
    g.lineTo(x - 16, y + 9);
    g.lineTo(x + 11, y + 43);
    g.moveTo(x + 43, y - 24);
    g.lineTo(x + 10, y - 5);
    g.lineTo(x + 26, y + 18);
    g.moveTo(x - 45, y + 26);
    g.lineTo(x - 12, y + 13);
    g.strokePath();

    if (strong) {
      g.fillStyle(0xffffff, 0.35);
      g.fillRoundedRect(x - 38, y - 41, 52, 12, 6);
    }
  }

  private iceKey(row: number, col: number) {
    return `${row}:${col}`;
  }

  private damageIceAround(matches: Tile[]) {
    if (this.iceCells.size === 0) return;

    const affected = new Set<string>();
    const offsets = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    matches.forEach((tile) => {
      offsets.forEach(([dr, dc]) => {
        const row = tile.row + dr;
        const col = tile.col + dc;
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
          affected.add(this.iceKey(row, col));
        }
      });
    });

    affected.forEach((key) => {
      const cell = this.iceCells.get(key);
      if (!cell || cell.hits <= 0) return;

      cell.hits--;
      if (cell.hits <= 0) {
        this.iceBrokenCells++;
        this.tweens.add({
          targets: cell.graphic,
          alpha: 0,
          duration: 180,
          onComplete: () => cell.graphic.destroy(),
        });
        this.iceCells.delete(key);
        this.cameras.main.shake(70, 0.0015);
      } else {
        this.drawIceCell(cell);
        this.tweens.add({
          targets: cell.graphic,
          alpha: { from: 0.45, to: 1 },
          duration: 180,
        });
      }
    });
  }

  private selectTile(tile: Tile) {
    if (this.isProcessing || this.levelCompleted) return;

    if (!this.selectedTile) {
      this.selectedTile = tile;
      tile.circle.setDisplaySize(118, 118);
      return;
    }

    if (this.selectedTile === tile) {
      tile.circle.setDisplaySize(110, 110);
      this.selectedTile = null;
      return;
    }

    const rowDistance = Math.abs(this.selectedTile.row - tile.row);
    const colDistance = Math.abs(this.selectedTile.col - tile.col);

    if (rowDistance + colDistance !== 1) {
      this.selectedTile.circle.setDisplaySize(110, 110);
      this.selectedTile = tile;
      tile.circle.setDisplaySize(118, 118);
      return;
    }

    const first = this.selectedTile;
    first.circle.setDisplaySize(110, 110);
    this.selectedTile = null;
    this.trySwap(first, tile);
  }

  private trySwap(tileA: Tile, tileB: Tile) {
    this.isProcessing = true;
    const aX = tileA.circle.x;
    const aY = tileA.circle.y;
    const bX = tileB.circle.x;
    const bY = tileB.circle.y;

    this.swapModel(tileA, tileB);

    this.tweens.add({ targets: tileA.circle, x: bX, y: bY, duration: 210, ease: "Power2" });
    this.tweens.add({
      targets: tileB.circle,
      x: aX,
      y: aY,
      duration: 210,
      ease: "Power2",
      onComplete: () => {
        const matches = this.findMatches();
        if (matches.length === 0) {
          this.swapModel(tileA, tileB);
          this.tweens.add({ targets: tileA.circle, x: aX, y: aY, duration: 190, ease: "Power2" });
          this.tweens.add({
            targets: tileB.circle,
            x: bX,
            y: bY,
            duration: 190,
            ease: "Power2",
            onComplete: () => {
              this.isProcessing = false;
            },
          });
          return;
        }

        this.moves--;
        this.movesText.setText(`${this.moves}\nMOSSE`);
        this.comboMultiplier = 1;
        this.processMatches(matches, false);
      },
    });
  }

  private swapModel(tileA: Tile, tileB: Tile) {
    const rowA = tileA.row;
    const colA = tileA.col;
    const rowB = tileB.row;
    const colB = tileB.col;

    this.board[rowA][colA] = tileB;
    this.board[rowB][colB] = tileA;
    tileA.row = rowB;
    tileA.col = colB;
    tileB.row = rowA;
    tileB.col = colA;
  }

  private processMatches(matches: Tile[], cascade: boolean) {
    if (this.levelCompleted) return;

    if (cascade) {
      this.comboMultiplier++;
      this.comboText.setText(`COMBO x${this.comboMultiplier}!`);
    }

    this.score += matches.length * 100 * this.comboMultiplier;
    this.scoreText.setText(`${this.score}\nPUNTI`);

    matches.forEach((tile) => {
      if (tile.type === this.currentLevelConfig.collectType) {
        this.collectedAmount++;
      }
      if (tile.type === this.currentLevelConfig.collectType2) {
        this.collectedAmount2++;
      }
    });

    this.damageIceAround(matches);

    matches.forEach((tile) => {
      tile.circle.destroy();
      this.board[tile.row][tile.col] = null;
    });

    this.updateObjectiveAndProgress();

    if (this.isObjectiveComplete()) {
      this.showLevelCompleted();
      return;
    }

    this.time.delayedCall(220, () => {
      this.collapseTiles();
      this.time.delayedCall(320, () => {
        this.refillBoard();
        this.time.delayedCall(360, () => this.checkCascadeMatches());
      });
    });
  }

  private updateObjectiveAndProgress() {
    if (!this.objectiveText || !this.progressFill) return;
    this.objectiveText.setText(this.getObjectiveLabel());

    const config = this.currentLevelConfig;
    const scoreRatio = this.score / Math.max(1, config.targetScore);
    const collectRatio = this.collectedAmount / Math.max(1, config.collectAmount ?? 1);
    const collect2Ratio = this.collectedAmount2 / Math.max(1, config.collectAmount2 ?? 1);
    const iceRatio = this.iceTotalCells === 0 ? 1 : this.iceBrokenCells / this.iceTotalCells;

    let ratio = scoreRatio;
    if (config.objective === "collect") ratio = collectRatio;
    if (config.objective === "collectDouble") ratio = (collectRatio + collect2Ratio) / 2;
    if (config.objective === "ice") ratio = iceRatio;
    if (config.objective === "iceCollect") ratio = (iceRatio + collectRatio) / 2;
    if (config.objective === "scoreIce") ratio = (iceRatio + scoreRatio) / 2;

    this.progressFill.width = 600 * Phaser.Math.Clamp(ratio, 0, 1);
  }

  private getObjectiveLabel() {
    const config = this.currentLevelConfig;
    const firstName = this.colorNames[config.collectType ?? 0];
    const secondName = this.colorNames[config.collectType2 ?? 0];

    switch (config.objective) {
      case "score":
        return `OBIETTIVO\n${config.targetScore}`;
      case "collect":
        return `${firstName}\n${this.collectedAmount}/${config.collectAmount ?? 0}`;
      case "collectDouble":
        return `${firstName} ${this.collectedAmount}/${config.collectAmount ?? 0}\n${secondName} ${this.collectedAmount2}/${config.collectAmount2 ?? 0}`;
      case "ice":
        return `❄ GHIACCIO\n${this.iceBrokenCells}/${this.iceTotalCells}`;
      case "iceCollect":
        return `❄ ${this.iceBrokenCells}/${this.iceTotalCells}\n${firstName} ${this.collectedAmount}/${config.collectAmount ?? 0}`;
      case "scoreIce":
        return `${this.score}/${config.targetScore}\n❄ ${this.iceBrokenCells}/${this.iceTotalCells}`;
    }
  }

  private isObjectiveComplete() {
    const config = this.currentLevelConfig;
    const firstDone = this.collectedAmount >= (config.collectAmount ?? 0);
    const secondDone = this.collectedAmount2 >= (config.collectAmount2 ?? 0);
    const iceDone = this.iceTotalCells === 0 || this.iceBrokenCells >= this.iceTotalCells;
    const scoreDone = this.score >= config.targetScore;

    switch (config.objective) {
      case "score":
        return scoreDone;
      case "collect":
        return firstDone;
      case "collectDouble":
        return firstDone && secondDone;
      case "ice":
        return iceDone;
      case "iceCollect":
        return iceDone && firstDone;
      case "scoreIce":
        return iceDone && scoreDone;
    }
  }

  private createBoosterTray() {
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

    this.add
      .text(540, 1442, "AIUTI DI CHIKI", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "29px",
        color: "#fff5d2",
        fontStyle: "bold",
        stroke: "#06305a",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.createBoosterButton(270, "booster-shuffle", "MESCOLA", () => {
      if (this.shuffleUses <= 0 || this.isProcessing || this.levelCompleted) return;
      this.shuffleUses--;
      this.shuffleBoard();
    }, () => this.shuffleUses);

    this.createBoosterButton(540, "booster-hammer", "MARTELLO", () => {
      if (
        this.hammerUses <= 0 ||
        !this.selectedTile ||
        this.isProcessing ||
        this.levelCompleted
      ) return;

      this.hammerUses--;
      const tile = this.selectedTile;
      this.selectedTile = null;
      this.isProcessing = true;
      this.damageIceAround([tile]);
      tile.circle.destroy();
      this.board[tile.row][tile.col] = null;
      this.updateObjectiveAndProgress();

      if (this.isObjectiveComplete()) {
        this.showLevelCompleted();
        return;
      }

      this.collapseTiles();
      this.time.delayedCall(320, () => {
        this.refillBoard();
        this.time.delayedCall(350, () => this.checkCascadeMatches());
      });
    }, () => this.hammerUses);

    this.createBoosterButton(810, "booster-rocket", "RAZZO", () => {
      if (this.rocketUses <= 0 || this.isProcessing || this.levelCompleted) return;
      this.rocketUses--;
      this.isProcessing = true;
      const row = Phaser.Math.Between(0, this.rows - 1);
      const rowTiles: Tile[] = [];

      for (let col = 0; col < this.cols; col++) {
        const tile = this.board[row][col];
        if (!tile) continue;
        rowTiles.push(tile);
        tile.circle.destroy();
        this.board[row][col] = null;
      }

      this.damageIceAround(rowTiles);
      this.updateObjectiveAndProgress();

      if (this.isObjectiveComplete()) {
        this.showLevelCompleted();
        return;
      }

      this.collapseTiles();
      this.time.delayedCall(320, () => {
        this.refillBoard();
        this.time.delayedCall(350, () => this.checkCascadeMatches());
      });
    }, () => this.rocketUses);
  }

  private createBoosterButton(
    x: number,
    iconKey: string,
    label: string,
    action: () => void,
    remaining: () => number,
  ) {
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

    const button = this.add
      .zone(x, 1540, 220, 135)
      .setInteractive({ useHandCursor: true });

    this.add.image(x - 48, 1525, iconKey).setDisplaySize(102, 102);

    const count = this.add
      .text(x + 68, 1502, String(remaining()), {
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
      .text(x, 1582, label, {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "22px",
        color: "#4b2850",
        fontStyle: "bold",
        stroke: "#fff4c8",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    button.on("pointerup", () => {
      action();
      count.setText(String(remaining()));
      this.cameras.main.shake(70, 0.0012);
    });
  }

  private createsInitialMatch(row: number, col: number, type: number) {
    if (
      col >= 2 &&
      this.board[row]?.[col - 1]?.type === type &&
      this.board[row]?.[col - 2]?.type === type
    ) return true;

    if (
      row >= 2 &&
      this.board[row - 1]?.[col]?.type === type &&
      this.board[row - 2]?.[col]?.type === type
    ) return true;

    return false;
  }

  private hasMatch() {
    return this.findMatches().length > 0;
  }

  private findMatches() {
    const matches = new Set<Tile>();

    for (let row = 0; row < this.rows; row++) {
      let runStart = 0;
      for (let col = 1; col <= this.cols; col++) {
        const previous = this.board[row][col - 1];
        const current = col < this.cols ? this.board[row][col] : null;
        if (previous && current && previous.type === current.type) continue;

        const runLength = col - runStart;
        if (runLength >= 3 && previous) {
          for (let c = runStart; c < col; c++) {
            const tile = this.board[row][c];
            if (tile) matches.add(tile);
          }
        }
        runStart = col;
      }
    }

    for (let col = 0; col < this.cols; col++) {
      let runStart = 0;
      for (let row = 1; row <= this.rows; row++) {
        const previous = this.board[row - 1]?.[col] ?? null;
        const current = row < this.rows ? this.board[row][col] : null;
        if (previous && current && previous.type === current.type) continue;

        const runLength = row - runStart;
        if (runLength >= 3 && previous) {
          for (let r = runStart; r < row; r++) {
            const tile = this.board[r][col];
            if (tile) matches.add(tile);
          }
        }
        runStart = row;
      }
    }

    return Array.from(matches);
  }

  private hasAvailableMove() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.board[row][col];
        if (!tile) continue;

        const neighbors = [
          this.board[row]?.[col + 1] ?? null,
          this.board[row + 1]?.[col] ?? null,
        ];

        for (const neighbor of neighbors) {
          if (!neighbor) continue;
          const typeA = tile.type;
          tile.type = neighbor.type;
          neighbor.type = typeA;
          const available = this.hasMatch();
          neighbor.type = tile.type;
          tile.type = typeA;
          neighbor.type = neighbor.type === typeA ? neighbor.type : neighbor.type;

          // Restore explicitly: the temporary swap above changed both types.
          tile.type = typeA;
          neighbor.type = typeA === neighbor.type ? neighbor.type : neighbor.type;

          // Use a clean second restoration to avoid any ambiguity.
          const originalNeighborType = neighbor.circle.texture.key
            ? this.tileKeys.indexOf(neighbor.circle.texture.key.replace("tile-", ""))
            : neighbor.type;
          neighbor.type = originalNeighborType >= 0 ? originalNeighborType : neighbor.type;

          if (available) return true;
        }
      }
    }

    // Fallback: a random reshuffle is preferable to a dead board.
    return false;
  }

  private shuffleBoard() {
    let attempts = 0;
    do {
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const tile = this.board[row][col];
          if (!tile) continue;
          tile.type = Phaser.Math.Between(0, this.tileKeys.length - 1);
        }
      }
      attempts++;
    } while (this.hasMatch() && attempts < 100);

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.board[row][col];
        if (tile) tile.circle.setTexture(`tile-${this.tileKeys[tile.type]}`);
      }
    }

    this.isProcessing = false;
  }

  private collapseTiles() {
    for (let col = 0; col < this.cols; col++) {
      let emptyRow = this.rows - 1;

      for (let row = this.rows - 1; row >= 0; row--) {
        const tile = this.board[row][col];
        if (!tile) continue;

        if (row !== emptyRow) {
          this.board[emptyRow][col] = tile;
          this.board[row][col] = null;
          const distance = emptyRow - row;
          tile.row = emptyRow;
          tile.col = col;
          this.tweens.add({
            targets: tile.circle,
            y: tile.circle.y + distance * this.tileSize,
            duration: 300,
            ease: "Bounce.easeOut",
          });
        }

        emptyRow--;
      }
    }
  }

  private refillBoard() {
    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        if (this.board[row][col] !== null) continue;
        const type = Phaser.Math.Between(0, this.tileKeys.length - 1);
        this.board[row][col] = this.createTile(row, col, type, true);
      }
    }
  }

  private checkCascadeMatches() {
    const matches = this.findMatches();

    if (matches.length > 0) {
      this.processMatches(matches, true);
      return;
    }

    this.isProcessing = false;
    this.comboMultiplier = 1;
    this.comboText.setText("");

    if (this.moves <= 0 && !this.levelCompleted) {
      this.showLevelFailed();
      return;
    }

    if (this.moves > 0 && !this.levelCompleted && !this.hasAvailableMove()) {
      this.shuffleBoard();
    }
  }

  private showLevelCompleted() {
    if (this.levelCompleted) return;
    this.levelCompleted = true;

    window.dispatchEvent(
      new CustomEvent("chiki-level-complete", {
        detail: { level: this.currentLevel, stars: this.calculateStars() },
      }),
    );

    this.add.rectangle(540, 960, 1080, 1920, 0x071322, 0.82).setDepth(20);
    this.drawResultPanel(410, 1010);

    this.add
      .text(540, 500, `LIVELLO ${this.currentLevel}`, {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "78px",
        color: "#fff4c9",
        stroke: "#102d55",
        strokeThickness: 13,
        shadow: { offsetX: 0, offsetY: 8, color: "#061a35", fill: true },
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.add
      .text(540, 635, "BEN FATTO!", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "68px",
        color: "#fff7d5",
        stroke: "#17456f",
        strokeThickness: 13,
        shadow: { offsetX: 0, offsetY: 8, color: "#d18b00", fill: true },
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.add.image(540, 850, "victory-reward").setDisplaySize(410, 410).setDepth(22);

    this.add
      .text(540, 1035, `${this.calculateStars()} STELLE  •  ${this.score} PUNTI`, {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "34px",
        color: "#fff7d5",
        stroke: "#12365e",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(22);

    const continuePlate = this.drawGlossyButton(540, 1195, 480, 126, "green");
    continuePlate.setDepth(22);

    const continueButton = this.add
      .text(540, 1187, "CONTINUA", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "55px",
        color: "#fff8d5",
        stroke: "#255c13",
        strokeThickness: 9,
        shadow: { offsetX: 0, offsetY: 6, color: "#17440e", fill: true },
      })
      .setOrigin(0.5)
      .setDepth(23)
      .setInteractive({ useHandCursor: true });

    continuePlate.on("pointerup", () => continueButton.emit("pointerup"));
    continueButton.on("pointerup", () => {
      if (this.currentLevel >= levels.length) {
        continueButton.setText("COMPLETATO!");
        continueButton.disableInteractive();
        return;
      }

      this.currentLevel++;
      this.scene.restart();
    });
  }

  private calculateStars() {
    const movesRatio = this.moves / Math.max(1, this.currentLevelConfig.moves);
    if (movesRatio >= 0.45) return 3;
    if (movesRatio >= 0.15) return 2;
    return 1;
  }

  private showLevelFailed() {
    if (this.levelCompleted) return;
    this.levelCompleted = true;

    this.add.rectangle(540, 960, 1080, 1920, 0x071322, 0.82).setDepth(20);
    this.drawResultPanel(500, 850);

    this.add
      .text(540, 590, "MOSSE FINITE!", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "72px",
        color: "#fff4c9",
        stroke: "#102d55",
        strokeThickness: 13,
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.add.image(540, 815, "chiki-character").setDisplaySize(260, 273).setDepth(22);

    this.add
      .text(540, 975, "CHIKI HA BISOGNO DI TE", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "35px",
        color: "#fff7d5",
        stroke: "#12365e",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(22);

    const retryPlate = this.drawGlossyButton(540, 1105, 460, 120, "red");
    retryPlate.setDepth(22);

    const retryButton = this.add
      .text(540, 1097, "RIPROVA", {
        fontFamily: '"Lilita One", "Fredoka", sans-serif',
        fontSize: "52px",
        color: "#fff8d5",
        stroke: "#7b171d",
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setDepth(23)
      .setInteractive({ useHandCursor: true });

    retryPlate.on("pointerup", () => retryButton.emit("pointerup"));
    retryButton.on("pointerup", () => this.scene.restart());
  }

  private drawResultPanel(y: number, height: number) {
    const x = 105;
    const width = 870;
    const top = y - height / 2;
    const panel = this.add.graphics().setDepth(21);
    panel.fillStyle(0x071b35, 0.9);
    panel.fillRoundedRect(x + 12, top + 24, width, height, 62);
    panel.fillStyle(0x1766ad, 1);
    panel.fillRoundedRect(x, top, width, height, 62);
    panel.fillStyle(0x0e4d8a, 1);
    panel.fillRoundedRect(x + 20, top + 20, width - 40, height - 40, 48);
    panel.lineStyle(13, 0xffa900, 1);
    panel.strokeRoundedRect(x + 8, top + 8, width - 16, height - 16, 56);
    panel.lineStyle(7, 0xffe45f, 1);
    panel.strokeRoundedRect(x + 23, top + 23, width - 46, height - 46, 44);
  }

  private drawGlossyButton(
    x: number,
    y: number,
    width: number,
    height: number,
    color: "green" | "red",
  ) {
    const palette = color === "green"
      ? { shadow: 0x174f10, base: 0x2f9d18, face: 0x63d92f, shine: 0xb8ff79 }
      : { shadow: 0x621219, base: 0xa91f29, face: 0xeb3944, shine: 0xff8a86 };

    const button = this.add
      .rectangle(x, y + 12, width, height, palette.shadow, 1)
      .setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, width, height, palette.base, 1).setDepth(button.depth);
    this.add.rectangle(x, y - 10, width - 18, height - 24, palette.face, 1).setDepth(button.depth);
    this.add.rectangle(x, y - height * 0.28, width * 0.7, 10, palette.shine, 0.8).setDepth(button.depth);
    button.setStrokeStyle(7, 0xfff4c7, 1);
    return button;
  }
}
