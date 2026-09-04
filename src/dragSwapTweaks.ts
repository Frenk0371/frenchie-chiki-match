import Phaser from "phaser";
import GameScene from "./game/GameScene";

type DragTile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
  special?: "rocket-h" | "rocket-v" | "bomb" | "rainbow";
};

type RuntimeScene = {
  rows: number;
  cols: number;
  board: (DragTile | null)[][];
  moves: number;
  levelCompleted: boolean;
  isProcessing: boolean;
  selectedTile: DragTile | null;
  trySwap: (a: DragTile, b: DragTile) => void;
  selectTile: (tile: DragTile) => void;
};

const proto = GameScene.prototype as any;
const TILE_SIZE = 116;
const TAP_SELECTED_SIZE = 124;
const DRAG_SELECTED_SIZE = 128;
const DRAG_THRESHOLD = 24;
const DRAG_LIMIT = 62;

const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;

const clearSelectedTile = (scene: GameScene) => {
  const r = runtime(scene);
  if (r.selectedTile?.circle?.active) {
    r.selectedTile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  }
  r.selectedTile = null;
};

const selectHammerTarget = (scene: GameScene, tile: DragTile) => {
  const r = runtime(scene);
  if (r.isProcessing || r.levelCompleted || r.moves <= 0) return;

  if (r.selectedTile === tile) {
    tile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
    r.selectedTile = null;
    return;
  }

  if (r.selectedTile?.circle?.active) {
    r.selectedTile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  }
  r.selectedTile = tile;
  tile.circle.setDisplaySize(TAP_SELECTED_SIZE, TAP_SELECTED_SIZE);
};

const snapBack = (scene: GameScene, tile: DragTile, x: number, y: number) => {
  if (!tile.circle.active) return;
  scene.tweens.add({
    targets: tile.circle,
    x,
    y,
    duration: 110,
    ease: "Back.easeOut",
  });
};

const originalCreateTile = proto.createTile as (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove?: boolean,
) => DragTile;

proto.createTile = function (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove = false,
) {
  const tile = originalCreateTile.call(this, row, col, type, fromAbove) as DragTile;
  const circle = tile.circle;

  // Togliamo il vecchio click-per-selezionare/click-per-spostare.
  circle.removeAllListeners("pointerup");
  this.input.setDraggable(circle);

  let originX = circle.x;
  let originY = circle.y;
  let didDrag = false;
  let blockedDrag = false;

  circle.on("pointerdown", () => {
    didDrag = false;
    blockedDrag = false;
  });

  circle.on("dragstart", () => {
    didDrag = true;
    const r = runtime(this);
    originX = circle.x;
    originY = circle.y;

    if (r.moves <= 0 || r.levelCompleted || r.isProcessing) {
      blockedDrag = true;
      return;
    }

    clearSelectedTile(this);
    circle.setDepth(24).setDisplaySize(DRAG_SELECTED_SIZE, DRAG_SELECTED_SIZE);
  });

  circle.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
    if (blockedDrag || !circle.active) return;
    const dx = Phaser.Math.Clamp(dragX - originX, -DRAG_LIMIT, DRAG_LIMIT);
    const dy = Phaser.Math.Clamp(dragY - originY, -DRAG_LIMIT, DRAG_LIMIT);
    circle.setPosition(originX + dx, originY + dy);
  });

  circle.on("dragend", () => {
    if (!circle.active) return;

    circle.setDepth(3).setDisplaySize(TILE_SIZE, TILE_SIZE);
    if (blockedDrag) {
      snapBack(this, tile, originX, originY);
      return;
    }

    const dx = circle.x - originX;
    const dy = circle.y - originY;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));

    if (distance < DRAG_THRESHOLD) {
      snapBack(this, tile, originX, originY);
      return;
    }

    let targetRow = tile.row;
    let targetCol = tile.col;
    if (Math.abs(dx) >= Math.abs(dy)) targetCol += dx > 0 ? 1 : -1;
    else targetRow += dy > 0 ? 1 : -1;

    const r = runtime(this);
    const target = r.board[targetRow]?.[targetCol] ?? null;
    circle.setPosition(originX, originY);

    if (!target || r.isProcessing || r.levelCompleted) {
      snapBack(this, tile, originX, originY);
      return;
    }

    clearSelectedTile(this);
    r.trySwap(tile, target);
  });

  circle.on("pointerup", () => {
    if (didDrag || !circle.active) return;
    const r = runtime(this);
    if (r.moves <= 0 || r.levelCompleted || r.isProcessing) return;

    // Razzo e bomba restano attivabili con un tocco, come richiesto.
    if (tile.special === "rocket-h" || tile.special === "rocket-v" || tile.special === "bomb") {
      r.selectTile(tile);
      return;
    }

    // Il semplice tap non sposta più le pedine: serve solo a indicare il bersaglio del Martello.
    selectHammerTarget(this, tile);
  });

  return tile;
};

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  originalCreate.call(this);
  const canvas = this.game.canvas;
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  (this.input as any).dragDistanceThreshold = 6;
  (this.input as any).dragTimeThreshold = 0;
};
