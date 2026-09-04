import Phaser from "phaser";
import GameScene from "./game/GameScene";

type SpecialKind = "rocket-h" | "rocket-v" | "bomb" | "rainbow";

type SpecialDragTile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
  special?: SpecialKind;
};

type RuntimeScene = {
  cols: number;
  tileSize: number;
  boardY: number;
  board: (SpecialDragTile | null)[][];
  moves: number;
  levelCompleted: boolean;
  isProcessing: boolean;
  selectedTile: SpecialDragTile | null;
  trySwap: (a: SpecialDragTile, b: SpecialDragTile) => void;
  swapModel: (a: SpecialDragTile, b: SpecialDragTile) => void;
  selectTile: (tile: SpecialDragTile) => void;
};

const proto = GameScene.prototype as any;
const TILE_SIZE = 116;
const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;

const cellCenter = (scene: GameScene, row: number, col: number) => {
  const r = runtime(scene);
  const boardWidth = r.cols * r.tileSize;
  const startX = (1080 - boardWidth) / 2;
  return {
    x: startX + col * r.tileSize + r.tileSize / 2,
    y: r.boardY + row * r.tileSize + r.tileSize / 2,
  };
};

const snapTile = (scene: GameScene, tile: SpecialDragTile) => {
  if (!tile.circle.active) return;
  const { x, y } = cellCenter(scene, tile.row, tile.col);
  scene.tweens.killTweensOf(tile.circle);
  tile.circle.setPosition(x, y);
};

const isMovablePower = (tile: SpecialDragTile) =>
  tile.special === "rocket-h" || tile.special === "rocket-v" || tile.special === "bomb";

const originalTrySwap = proto.trySwap as RuntimeScene["trySwap"];

proto.trySwap = function (this: GameScene, a: SpecialDragTile, b: SpecialDragTile) {
  const r = runtime(this);
  if (r.isProcessing || r.levelCompleted || r.moves <= 0) return;

  const distance = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  if (distance !== 1) {
    originalTrySwap.call(this, a, b);
    return;
  }

  // La sfera multicolore usa già la propria attivazione: la riallineiamo
  // alla griglia prima dello swap così parte sempre dalla casella di arrivo.
  const rainbow = a.special === "rainbow" ? a : b.special === "rainbow" ? b : null;
  const rainbowTarget = rainbow === a ? b : rainbow === b ? a : null;
  if (rainbow && rainbowTarget && !rainbowTarget.special) {
    snapTile(this, a);
    snapTile(this, b);
    originalTrySwap.call(this, a, b);
    return;
  }

  // Razzo e bomba: se vengono trascinati su una pedina normale, eseguono
  // uno swap reale e poi si attivano dalla nuova casella.
  const special = isMovablePower(a) && !b.special
    ? a
    : isMovablePower(b) && !a.special
      ? b
      : null;
  const target = special === a ? b : special === b ? a : null;

  if (!special || !target) {
    originalTrySwap.call(this, a, b);
    return;
  }

  if (r.selectedTile?.circle.active) {
    r.selectedTile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  }
  r.selectedTile = null;
  r.isProcessing = true;

  const aStart = cellCenter(this, a.row, a.col);
  const bStart = cellCenter(this, b.row, b.col);
  snapTile(this, a);
  snapTile(this, b);

  r.swapModel(a, b);

  this.tweens.add({
    targets: a.circle,
    x: bStart.x,
    y: bStart.y,
    duration: 190,
    ease: "Power2",
  });
  this.tweens.add({
    targets: b.circle,
    x: aStart.x,
    y: aStart.y,
    duration: 190,
    ease: "Power2",
    onComplete: () => {
      snapTile(this, a);
      snapTile(this, b);

      if (!special.circle.active || r.levelCompleted) {
        r.isProcessing = false;
        return;
      }

      // L'attivazione esistente gestisce effetti, suoni, catene e consumo mossa.
      // La sblocchiamo solo dopo che lo special è arrivato nella casella scelta.
      r.isProcessing = false;
      r.selectTile(special);
    },
  });
};
