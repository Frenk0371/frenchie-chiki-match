import Phaser from "phaser";
import { levels } from "./levels";

type Tile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
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

  private board: (Tile | null)[][] = [];

  private score = 0;
  private collectedAmount = 0;
  private collectedAmount2 = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private comboMultiplier = 1;
  private comboText!: Phaser.GameObjects.Text;
  private currentLevel = 1;
  private get currentLevelConfig() {
    return levels[this.currentLevel - 1];
  }

  private moves = this.currentLevelConfig.moves;
  private movesText!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private shuffleUses = 3;
  private hammerUses = 3;
  private rocketUses = 2;
  private targetScore = this.currentLevelConfig.targetScore;
  private levelCompleted = false;
  private isProcessing = false;

  private readonly colors = [
    0xff5c8a, 0xffc857, 0x5dd39e, 0x5dade2, 0x9b5de5, 0xff8c42,
  ];

  private readonly colorNames = [
    "Cuori rossi",
    "Ossa dorate",
    "Quadrifogli verdi",
    "Fiori azzurri",
    "Gemme viola",
    "Chiki",
  ];

  constructor(startLevel = 1) {
    super("GameScene");
    this.currentLevel = Phaser.Math.Clamp(startLevel, 1, levels.length);
    this.moves = this.currentLevelConfig.moves;
    this.targetScore = this.currentLevelConfig.targetScore;
  }

  preload() {
    this.load.image("garden-bg", "/garden-game-bg.png");
    this.tileKeys.forEach((key) =>
      this.load.image(`tile-${key}`, `/tiles/${key}.png`),
    );
  }

  create() {
    this.add.image(540, 960, "garden-bg").setDisplaySize(1080, 1920);
    this.add.rectangle(540, 960, 1080, 1920, 0x16324a, 0.13);

    const hud = this.add.graphics();
    hud.fillStyle(0x44205f, 0.96);
    hud.fillRoundedRect(120, 56, 840, 98, 42);
    hud.lineStyle(6, 0xffffff, 0.94);
    hud.strokeRoundedRect(120, 56, 840, 98, 42);

    hud.fillStyle(0xfff2d3, 0.98);
    hud.fillRoundedRect(112, 178, 270, 142, 30);
    hud.fillRoundedRect(405, 178, 270, 142, 30);
    hud.fillRoundedRect(698, 178, 270, 142, 30);
    hud.lineStyle(5, 0xf2c553, 1);
    hud.strokeRoundedRect(112, 178, 270, 142, 30);
    hud.strokeRoundedRect(405, 178, 270, 142, 30);
    hud.strokeRoundedRect(698, 178, 270, 142, 30);

    this.add
      .text(540, 105, "🐾 FRENCHIE CHIKI MATCH", {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "42px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(247, 218, `LIVELLO ${this.currentLevel}`, {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "25px",
        color: "#56315f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.scoreText = this.add
      .text(247, 271, "0\nPUNTI", {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "28px",
        color: "#402749",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);
    this.movesText = this.add
      .text(540, 250, `${this.moves}\nMOSSE`, {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "32px",
        color: "#7a2b79",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);
    this.objectiveText = this.add
      .text(833, 250, this.getObjectiveLabel(), {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "21px",
        color: "#402749",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 235 },
      })
      .setOrigin(0.5);

    const progress = this.add.graphics();
    progress.fillStyle(0x28143b, 0.9);
    progress.fillRoundedRect(230, 337, 620, 30, 15);
    progress.lineStyle(4, 0xffffff, 0.9);
    progress.strokeRoundedRect(230, 337, 620, 30, 15);
    this.progressFill = this.add
      .rectangle(240, 352, 0, 18, 0xffcf36, 1)
      .setOrigin(0, 0.5);
    this.add.text(188, 327, "⭐", { fontSize: "44px" });

    this.comboText = this.add
      .text(540, 350, "", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffff00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.createBoard();
    this.createBoosterTray();
  }

  private createBoosterTray() {
    const tray = this.add.graphics();
    tray.fillStyle(0x3f205c, 0.95);
    tray.fillRoundedRect(105, 1408, 870, 235, 42);
    tray.lineStyle(7, 0xffffff, 0.92);
    tray.strokeRoundedRect(105, 1408, 870, 235, 42);

    this.add
      .text(540, 1442, "AIUTI DI CHIKI", {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "29px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.createBoosterButton(
      270,
      "🔀",
      "MESCOLA",
      () => {
        if (this.shuffleUses <= 0 || this.isProcessing || this.levelCompleted)
          return;
        this.shuffleUses--;
        this.shuffleBoard();
        this.scene.restart();
      },
      () => this.shuffleUses,
    );

    this.createBoosterButton(
      540,
      "🔨",
      "MARTELLO",
      () => {
        if (
          this.hammerUses <= 0 ||
          !this.selectedTile ||
          this.isProcessing ||
          this.levelCompleted
        )
          return;
        this.hammerUses--;
        const tile = this.selectedTile;
        this.selectedTile = null;
        tile.circle.destroy();
        this.board[tile.row][tile.col] = null;
        this.collapseTiles();
        this.time.delayedCall(330, () => {
          this.refillBoard();
          this.time.delayedCall(380, () => this.checkCascadeMatches());
        });
      },
      () => this.hammerUses,
    );

    this.createBoosterButton(
      810,
      "🚀",
      "RAZZO",
      () => {
        if (this.rocketUses <= 0 || this.isProcessing || this.levelCompleted)
          return;
        this.rocketUses--;
        this.isProcessing = true;
        const row = Phaser.Math.Between(0, this.rows - 1);
        for (let col = 0; col < this.cols; col++) {
          const tile = this.board[row][col];
          if (tile) tile.circle.destroy();
          this.board[row][col] = null;
        }
        this.collapseTiles();
        this.time.delayedCall(330, () => {
          this.refillBoard();
          this.time.delayedCall(380, () => this.checkCascadeMatches());
        });
      },
      () => this.rocketUses,
    );
  }

  private createBoosterButton(
    x: number,
    icon: string,
    label: string,
    action: () => void,
    remaining: () => number,
  ) {
    const button = this.add
      .rectangle(x, 1540, 220, 135, 0xf3b72d, 1)
      .setStrokeStyle(6, 0xffefae, 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(x - 78, 1490, icon, { fontSize: "55px" });
    const count = this.add
      .text(x + 68, 1502, String(remaining()), {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#6b2c78",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5);
    this.add
      .text(x, 1584, label, {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "22px",
        color: "#4b2846",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    button.on("pointerup", () => {
      action();
      count.setText(String(remaining()));
      this.tweens.add({
        targets: button,
        scaleX: 0.94,
        scaleY: 0.94,
        yoyo: true,
        duration: 90,
      });
    });
  }

  private updateProgress() {
    const config = this.currentLevelConfig;
    let ratio = this.score / Math.max(1, config.targetScore);
    if (config.objective === "collect") {
      ratio = this.collectedAmount / Math.max(1, config.collectAmount ?? 1);
    } else if (config.objective === "collectDouble") {
      const first =
        this.collectedAmount / Math.max(1, config.collectAmount ?? 1);
      const second =
        this.collectedAmount2 / Math.max(1, config.collectAmount2 ?? 1);
      ratio = (first + second) / 2;
    }
    this.progressFill.width = 600 * Phaser.Math.Clamp(ratio, 0, 1);
  }

  private createBoard() {
    const boardWidth = this.cols * this.tileSize;
    const boardHeight = this.rows * this.tileSize;

    const startX = (1080 - boardWidth) / 2;
    const startY = this.boardY;

    const boardPanel = this.add.graphics();
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

    this.board = [];

    for (let row = 0; row < this.rows; row++) {
      this.board[row] = [];

      for (let col = 0; col < this.cols; col++) {
        let type: number;

        do {
          type = Phaser.Math.Between(0, this.colors.length - 1);
        } while (this.createsInitialMatch(row, col, type));

        const x = startX + col * this.tileSize + this.tileSize / 2;

        const y = startY + row * this.tileSize + this.tileSize / 2;

        const circle = this.add
          .image(x, y, `tile-${this.tileKeys[type]}`)
          .setDisplaySize(110, 110)
          .setInteractive({ useHandCursor: true });

        const tile: Tile = {
          row,
          col,
          type,
          circle,
        };

        circle.on("pointerup", () => {
          if (this.moves <= 0 || this.levelCompleted) {
            return;
          }

          this.selectTile(tile);
        });

        this.board[row][col] = tile;
      }
    }
    if (!this.hasAvailableMove()) {
      this.shuffleBoard();
    }
  }
  private selectedTile: Tile | null = null;

  private selectTile(tile: Tile) {
    if (this.isProcessing) {
      return;
    }
    if (!this.selectedTile) {
      this.selectedTile = tile;
      tile.circle.setDisplaySize(118, 118);
      return;
    }

    if (this.selectedTile === tile) {
      this.selectedTile.circle.setDisplaySize(110, 110);
      this.selectedTile = null;
      return;
    }

    const rowDistance = Math.abs(this.selectedTile.row - tile.row);
    const colDistance = Math.abs(this.selectedTile.col - tile.col);
    const areAdjacent = rowDistance + colDistance === 1;

    if (!areAdjacent) {
      this.selectedTile.circle.setDisplaySize(110, 110);
      this.selectedTile = tile;
      tile.circle.setDisplaySize(118, 118);
      return;
    }

    const firstTile = this.selectedTile;

    firstTile.circle.setDisplaySize(110, 110);
    this.selectedTile = null;

    this.swapTiles(firstTile, tile);
  }

  private createsInitialMatch(row: number, col: number, type: number): boolean {
    if (
      col >= 2 &&
      this.board[row]?.[col - 1]?.type === type &&
      this.board[row]?.[col - 2]?.type === type
    ) {
      return true;
    }

    if (
      row >= 2 &&
      this.board[row - 1]?.[col]?.type === type &&
      this.board[row - 2]?.[col]?.type === type
    ) {
      return true;
    }

    return false;
  }

  private getObjectiveLabel(): string {
    const config = this.currentLevelConfig;

    if (config.objective === "score") {
      return `Obiettivo: ${config.targetScore}`;
    }

    const firstType = config.collectType ?? 0;
    const first = `${this.colorNames[firstType]}: ${this.collectedAmount} / ${config.collectAmount}`;

    if (config.objective === "collectDouble") {
      const secondType = config.collectType2 ?? 0;
      return `${first}   ${this.colorNames[secondType]}: ${this.collectedAmount2} / ${config.collectAmount2}`;
    }

    return first;
  }

  private showLevelCompleted() {
    if (this.levelCompleted) return;

    this.levelCompleted = true;
    window.dispatchEvent(
      new CustomEvent("chiki-level-complete", {
        detail: { level: this.currentLevel, stars: this.calculateStars() },
      }),
    );

    this.add.rectangle(540, 960, 1080, 1920, 0x160c22, 0.72);
    const card = this.add.graphics();
    card.fillStyle(0x5b277d, 1);
    card.fillRoundedRect(150, 540, 780, 720, 55);
    card.lineStyle(10, 0xffdc55, 1);
    card.strokeRoundedRect(150, 540, 780, 720, 55);
    this.add.image(540, 755, "tile-chiki").setDisplaySize(250, 250);

    this.add
      .text(540, 620, "LIVELLO COMPLETATO!", {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "48px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(540, 920, "⭐  ⭐  ⭐", {
        fontSize: "76px",
      })
      .setOrigin(0.5);
    this.add
      .text(540, 1015, `${this.score} PUNTI`, {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "38px",
        color: "#fff3c8",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const continuePlate = this.add
      .rectangle(540, 1140, 430, 100, 0x5ed137, 1)
      .setStrokeStyle(7, 0xffffff, 1)
      .setInteractive({ useHandCursor: true });

    const continueButton = this.add
      .text(540, 1140, "CONTINUA", {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    continuePlate.on("pointerup", () => continueButton.emit("pointerup"));

    continueButton.on("pointerup", () => {
      this.score = 0;
      this.collectedAmount = 0;
      this.collectedAmount2 = 0;
      if (this.currentLevel >= levels.length) {
        continueButton.setText("PROSSIMAMENTE");
        continueButton.disableInteractive();
        return;
      }

      this.currentLevel++;
      this.moves = this.currentLevelConfig.moves;
      this.targetScore = this.currentLevelConfig.targetScore;

      this.comboMultiplier = 1;
      this.levelCompleted = false;
      this.selectedTile = null;

      this.isProcessing = false;

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

    this.add.rectangle(540, 960, 1080, 1920, 0x160c22, 0.72);
    const card = this.add.graphics();
    card.fillStyle(0x4c2767, 1);
    card.fillRoundedRect(170, 610, 740, 520, 55);
    card.lineStyle(9, 0xffffff, 1);
    card.strokeRoundedRect(170, 610, 740, 520, 55);

    this.add
      .text(540, 735, "RIPROVIAMO!", {
        fontFamily: '"Arial Rounded MT Bold", Arial',
        fontSize: "52px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .image(540, 875, "tile-chiki")
      .setDisplaySize(190, 190)
      .setTint(0xb9b9b9);

    const retryButton = this.add
      .text(540, 1035, "RIPROVA", {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#ffffff",
        backgroundColor: "#dc3545",
        padding: { x: 30, y: 18 },
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryButton.on("pointerup", () => {
      this.score = 0;
      this.collectedAmount = 0;
      this.collectedAmount2 = 0;
      this.moves = this.currentLevelConfig.moves;
      this.comboMultiplier = 1;
      this.levelCompleted = false;
      this.selectedTile = null;

      this.scene.restart();
    });
  }

  private swapTiles(tileA: Tile, tileB: Tile, isReverting = false) {
    if (!isReverting) {
      this.isProcessing = true;
    }
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

    const xA = tileA.circle.x;
    const yA = tileA.circle.y;

    const xB = tileB.circle.x;
    const yB = tileB.circle.y;

    this.tweens.add({
      targets: tileA.circle,
      x: xB,
      y: yB,
      duration: 220,
      ease: "Power2",
    });

    this.tweens.add({
      targets: tileB.circle,
      x: xA,
      y: yA,
      duration: 220,
      ease: "Power2",
      onComplete: () => {
        if (isReverting) {
          this.isProcessing = false;
          return;
        }
        const matchCreated =
          this.tileHasMatch(tileA) || this.tileHasMatch(tileB);

        console.log("MATCH TROVATO:", matchCreated);
        if (!matchCreated) {
          console.log("MOSSA NON VALIDA");
          this.swapTiles(tileA, tileB, true);
        }
        if (matchCreated) {
          const matches = this.findMatches();
          this.moves--;
          this.movesText.setText(`${this.moves}\nMOSSE`);

          console.log("PEDINE DEL TRIS:", matches);
          this.score += matches.length * 100;
          this.scoreText.setText(`${this.score}\nPUNTI`);
          this.updateProgress();
          if (
            this.currentLevelConfig.objective === "score" &&
            this.score >= this.targetScore
          ) {
            this.showLevelCompleted();
          }

          matches.forEach((tile) => {
            if (
              this.currentLevelConfig.objective === "collect" &&
              tile.type === this.currentLevelConfig.collectType
            ) {
              this.collectedAmount = Math.min(
                this.collectedAmount + 1,
                this.currentLevelConfig.collectAmount ?? 0,
              );
            }
            if (this.currentLevelConfig.objective === "collectDouble") {
              if (tile.type === this.currentLevelConfig.collectType) {
                this.collectedAmount = Math.min(
                  this.collectedAmount + 1,
                  this.currentLevelConfig.collectAmount ?? 0,
                );
              }

              if (tile.type === this.currentLevelConfig.collectType2) {
                this.collectedAmount2 = Math.min(
                  this.collectedAmount2 + 1,
                  this.currentLevelConfig.collectAmount2 ?? 0,
                );
              }
            }
            tile.circle.destroy();
            this.board[tile.row][tile.col] = null;
          });
          if (this.currentLevelConfig.objective !== "score") {
            this.objectiveText.setText(this.getObjectiveLabel());
            this.updateProgress();
          }
          if (
            this.currentLevelConfig.objective === "collect" &&
            this.collectedAmount >= (this.currentLevelConfig.collectAmount ?? 0)
          ) {
            this.showLevelCompleted();
          }
          if (
            this.currentLevelConfig.objective === "collectDouble" &&
            this.collectedAmount >=
              (this.currentLevelConfig.collectAmount ?? 0) &&
            this.collectedAmount2 >=
              (this.currentLevelConfig.collectAmount2 ?? 0)
          ) {
            this.showLevelCompleted();
          }
          this.collapseTiles();
          this.refillBoard();
          this.time.delayedCall(400, () => {
            this.checkCascadeMatches();
          });
        }
      },
    });
  }
  private hasMatch(): boolean {
    // Controllo orizzontale
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols - 2; col++) {
        const tile = this.board[row][col];
        if (!tile) continue;
        const type = tile.type;

        const tileB = this.board[row][col + 1];
        const tileC = this.board[row][col + 2];

        if (tileB && tileC && tileB.type === type && tileC.type === type) {
          return true;
        }
      }
    }

    // Controllo verticale
    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows - 2; row++) {
        const tile = this.board[row][col];
        if (!tile) continue;
        const type = tile.type;

        const tileB = this.board[row + 1][col];
        const tileC = this.board[row + 2][col];

        if (tileB && tileC && tileB.type === type && tileC.type === type) {
          return true;
        }
      }
    }

    return false;
  }
  private tileHasMatch(tile: Tile): boolean {
    const row = tile.row;
    const col = tile.col;
    const type = tile.type;

    let horizontalCount = 1;

    for (let c = col - 1; c >= 0; c--) {
      const currentTile = this.board[row][c];
      if (!currentTile || currentTile.type !== type) break;
      horizontalCount++;
    }

    for (let c = col + 1; c < this.cols; c++) {
      const currentTile = this.board[row][c];
      if (!currentTile || currentTile.type !== type) break;
      horizontalCount++;
    }

    if (horizontalCount >= 3) {
      return true;
    }

    let verticalCount = 1;

    for (let r = row - 1; r >= 0; r--) {
      const currentTile = this.board[r][col];
      if (!currentTile || currentTile.type !== type) break;
      verticalCount++;
    }

    for (let r = row + 1; r < this.rows; r++) {
      const currentTile = this.board[r][col];
      if (!currentTile || currentTile.type !== type) break;
      verticalCount++;
    }

    return verticalCount >= 3;
  }

  private hasAvailableMove(): boolean {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.board[row][col];

        if (!tile) continue;

        // Prova lo scambio con la pedina a destra
        if (col < this.cols - 1) {
          const rightTile = this.board[row][col + 1];

          if (rightTile) {
            const typeA = tile.type;
            const typeB = rightTile.type;

            tile.type = typeB;
            rightTile.type = typeA;

            const createsMatch = this.hasMatch();

            tile.type = typeA;
            rightTile.type = typeB;

            if (createsMatch) {
              return true;
            }
          }
        }

        // Prova lo scambio con la pedina sotto
        if (row < this.rows - 1) {
          const bottomTile = this.board[row + 1][col];

          if (bottomTile) {
            const typeA = tile.type;
            const typeB = bottomTile.type;

            tile.type = typeB;
            bottomTile.type = typeA;

            const createsMatch = this.hasMatch();

            tile.type = typeA;
            bottomTile.type = typeB;

            if (createsMatch) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }
  private shuffleBoard() {
    this.isProcessing = true;

    const tiles: Tile[] = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.board[row][col];

        if (tile) {
          tiles.push(tile);
        }
      }
    }

    let attempts = 0;

    do {
      Phaser.Utils.Array.Shuffle(tiles);

      let index = 0;

      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const tile = tiles[index];

          this.board[row][col] = tile;

          tile.row = row;
          tile.col = col;

          const boardWidth = this.cols * this.tileSize;
          const startX = (1080 - boardWidth) / 2;
          const startY = this.boardY;

          const x = startX + col * this.tileSize + this.tileSize / 2;

          const y = startY + row * this.tileSize + this.tileSize / 2;

          tile.circle.setPosition(x, y);

          index++;
        }
      }

      attempts++;
    } while ((this.hasMatch() || !this.hasAvailableMove()) && attempts < 1000);
    this.isProcessing = false;
  }

  private findMatches(): Tile[] {
    const matches = new Set<Tile>();

    // Cerca i match orizzontali
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols - 2; col++) {
        const tileA = this.board[row][col];
        const tileB = this.board[row][col + 1];
        const tileC = this.board[row][col + 2];
        if (!tileA || !tileB || !tileC) continue;

        if (tileA.type === tileB.type && tileA.type === tileC.type) {
          matches.add(tileA);
          matches.add(tileB);
          matches.add(tileC);
        }
      }
    }

    // Cerca i match verticali
    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows - 2; row++) {
        const tileA = this.board[row][col];
        const tileB = this.board[row + 1][col];
        const tileC = this.board[row + 2][col];
        if (!tileA || !tileB || !tileC) continue;

        if (tileA.type === tileB.type && tileA.type === tileC.type) {
          matches.add(tileA);
          matches.add(tileB);
          matches.add(tileC);
        }
      }
    }

    return Array.from(matches);
  }
  private collapseTiles() {
    for (let col = 0; col < this.cols; col++) {
      let emptyRow = this.rows - 1;

      for (let row = this.rows - 1; row >= 0; row--) {
        const tile = this.board[row][col];

        if (tile) {
          if (row !== emptyRow) {
            this.board[emptyRow][col] = tile;
            this.board[row][col] = null;

            tile.row = emptyRow;
            this.tweens.add({
              targets: tile.circle,
              y: tile.circle.y + (emptyRow - row) * this.tileSize,
              duration: 300,
              ease: "Bounce.easeOut",
            });
          }

          emptyRow--;
        }
      }
    }
  }
  private refillBoard() {
    const boardWidth = this.cols * this.tileSize;
    const startX = (1080 - boardWidth) / 2;
    const startY = this.boardY;

    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        if (this.board[row][col] !== null) continue;

        const type = Phaser.Math.Between(0, this.colors.length - 1);

        const x = startX + col * this.tileSize + this.tileSize / 2;

        const finalY = startY + row * this.tileSize + this.tileSize / 2;

        const circle = this.add
          .image(x, finalY - this.tileSize * 2, `tile-${this.tileKeys[type]}`)
          .setDisplaySize(110, 110)
          .setInteractive({ useHandCursor: true });

        const tile: Tile = {
          row,
          col,
          type,
          circle,
        };

        circle.on("pointerup", () => {
          if (this.moves <= 0 || this.levelCompleted) {
            return;
          }

          this.selectTile(tile);
        });

        this.board[row][col] = tile;

        this.tweens.add({
          targets: circle,
          y: finalY,
          duration: 300,
          ease: "Bounce.easeOut",
        });
      }
    }
  }
  private checkCascadeMatches() {
    const matches = this.findMatches();

    if (matches.length === 0) {
      this.isProcessing = false;

      this.comboMultiplier = 1;
      this.comboText.setText("");

      if (this.moves <= 0 && !this.levelCompleted) {
        this.showLevelFailed();
        return;
      }

      if (this.moves > 0 && !this.levelCompleted && !this.hasAvailableMove()) {
        console.log("NESSUNA MOSSA DISPONIBILE");
        this.shuffleBoard();
      }

      return;
    }
    this.comboMultiplier++;
    this.comboText.setText(`COMBO x${this.comboMultiplier}!`);
    this.score += matches.length * 100 * this.comboMultiplier;

    this.scoreText.setText(`${this.score}\nPUNTI`);
    this.updateProgress();
    if (
      this.currentLevelConfig.objective === "score" &&
      this.score >= this.targetScore
    ) {
      this.showLevelCompleted();
      return;
    }
    matches.forEach((tile) => {
      if (
        this.currentLevelConfig.objective === "collect" &&
        tile.type === this.currentLevelConfig.collectType
      ) {
        this.collectedAmount = Math.min(
          this.collectedAmount + 1,
          this.currentLevelConfig.collectAmount ?? 0,
        );
      }
      if (this.currentLevelConfig.objective === "collectDouble") {
        if (tile.type === this.currentLevelConfig.collectType) {
          this.collectedAmount = Math.min(
            this.collectedAmount + 1,
            this.currentLevelConfig.collectAmount ?? 0,
          );
        }

        if (tile.type === this.currentLevelConfig.collectType2) {
          this.collectedAmount2 = Math.min(
            this.collectedAmount2 + 1,
            this.currentLevelConfig.collectAmount2 ?? 0,
          );
        }
      }

      tile.circle.destroy();
      this.board[tile.row][tile.col] = null;
    });
    if (this.currentLevelConfig.objective === "collectDouble") {
      this.objectiveText.setText(this.getObjectiveLabel());
      this.updateProgress();
    }
    if (this.currentLevelConfig.objective === "collectDouble") {
      if (
        this.collectedAmount >= (this.currentLevelConfig.collectAmount ?? 0) &&
        this.collectedAmount2 >= (this.currentLevelConfig.collectAmount2 ?? 0)
      ) {
        this.showLevelCompleted();
        return;
      }
    }

    if (this.currentLevelConfig.objective === "collect") {
      this.objectiveText.setText(this.getObjectiveLabel());
      this.updateProgress();

      if (
        this.collectedAmount >= (this.currentLevelConfig.collectAmount ?? 0)
      ) {
        this.showLevelCompleted();
        return;
      }
    }
    this.time.delayedCall(250, () => {
      this.collapseTiles();

      this.time.delayedCall(350, () => {
        this.refillBoard();

        this.time.delayedCall(400, () => {
          this.checkCascadeMatches();
        });
      });
    });
  }
}