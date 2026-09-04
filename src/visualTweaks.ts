import Phaser from "phaser";

const imagePrototype = Phaser.GameObjects.Image.prototype;
const originalSetDisplaySize = imagePrototype.setDisplaySize;

imagePrototype.setDisplaySize = function (
  this: Phaser.GameObjects.Image,
  width: number,
  height: number,
) {
  const textureKey = this.texture?.key ?? "";
  let scale = 1;

  if (textureKey.startsWith("tile-")) {
    scale = 1.08;
  } else if (textureKey.startsWith("booster-")) {
    scale = 1.2;
  }

  return originalSetDisplaySize.call(this, width * scale, height * scale);
} as typeof imagePrototype.setDisplaySize;
