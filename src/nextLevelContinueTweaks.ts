import Phaser from "phaser";
import GameScene from "./game/GameScene";
import { levels } from "./game/levels";

type RuntimeScene = {
  currentLevel: number;
};

const proto = GameScene.prototype as any;
const originalShowLevelCompleted = proto.showLevelCompleted as (this: GameScene) => void;

const startFreshNextLevel = (scene: GameScene, nextLevel: number) => {
  const game = scene.game;

  // Un nuovo GameScene evita di trascinarsi dietro stato/tweak del livello appena concluso.
  window.setTimeout(() => {
    try {
      game.scene.stop("GameScene");
      game.scene.remove("GameScene");
      game.scene.add("GameScene", new GameScene(nextLevel), true);
    } catch {
      // Fallback: se il SceneManager non può sostituire la scena in quel frame,
      // aggiorna comunque il livello e riavvia la scena corrente.
      const runtime = scene as unknown as RuntimeScene;
      runtime.currentLevel = nextLevel;
      scene.scene.restart();
    }
  }, 0);
};

proto.showLevelCompleted = function (this: GameScene) {
  const runtime = this as unknown as RuntimeScene;
  const completedLevel = Math.max(1, Number(runtime.currentLevel || 1));

  originalShowLevelCompleted.call(this);

  const continueText = this.children.list.find(
    (child) => child instanceof Phaser.GameObjects.Text && child.text === "CONTINUA",
  ) as Phaser.GameObjects.Text | undefined;

  if (!continueText) return;

  // Sostituisce il vecchio scene.restart(), che riutilizzava la stessa istanza
  // e poteva lasciare il gioco sul livello appena concluso.
  continueText.removeAllListeners("pointerup");
  continueText.on("pointerup", () => {
    if (completedLevel >= levels.length) {
      continueText.setText("COMPLETATO!");
      continueText.disableInteractive();
      return;
    }

    continueText.disableInteractive();
    continueText.setText("CARICO…");
    startFreshNextLevel(this, completedLevel + 1);
  });
};
