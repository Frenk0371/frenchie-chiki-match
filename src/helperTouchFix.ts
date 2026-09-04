import Phaser from "phaser";
import GameScene from "./game/GameScene";

type HelperTile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
};

type RuntimeScene = {
  isProcessing: boolean;
  levelCompleted: boolean;
  selectTile: (tile: HelperTile) => void;
  resetGestureState?: () => void;
};

const proto = GameScene.prototype as any;
const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;

const helperPromptActive = (scene: GameScene) =>
  scene.children.list.some((child) => {
    if (!(child instanceof Phaser.GameObjects.Text) || !child.active) return false;
    const text = child.text || "";
    return text.includes("TOCCA LA PEDINA DA ROMPERE") || text.includes("TOCCA LA PEDINA BERSAGLIO");
  });

// Su iPhone un tap può contenere qualche pixel di movimento e venire classificato
// come swipe prima del pointerup. Quando un aiuto sta aspettando un bersaglio,
// intercettiamo quindi direttamente il pointerdown della pedina: azzeriamo il
// gesto normale e passiamo subito la pedina alla logica dell'aiuto.
const originalCreateTile = proto.createTile as (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove?: boolean,
) => HelperTile;

proto.createTile = function (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove = false,
) {
  const tile = originalCreateTile.call(this, row, col, type, fromAbove);

  tile.circle.on("pointerdown", () => {
    const r = runtime(this);
    if (r.isProcessing || r.levelCompleted || !helperPromptActive(this)) return;

    r.resetGestureState?.();
    r.selectTile(tile);
  });

  return tile;
};
