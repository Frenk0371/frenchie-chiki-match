import Phaser from "phaser";
import GameScene from "./game/GameScene";

type SpecialKind = "rocket" | "bomb" | "rainbow";

type MatchTile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
  special?: SpecialKind;
};

type RuntimeScene = GameScene & {
  rows: number;
  cols: number;
  board: (MatchTile | null)[][];
  selectedTile: MatchTile | null;
  isProcessing: boolean;
  comboMultiplier: number;
  score: number;
  scoreText: Phaser.GameObjects.Text;
  collectedAmount: number;
  collectedAmount2: number;
  currentLevelConfig: {
    collectType?: number;
    collectType2?: number;
  };
  createTile: (row: number, col: number, type: number, fromAbove?: boolean) => MatchTile;
  selectTile: (tile: MatchTile) => void;
  processMatches: (matches: MatchTile[], cascade: boolean) => void;
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const proto = GameScene.prototype as unknown as Record<string, unknown>;
const BASE_TILE_SIZE = 116;
const SELECTED_TILE_SIZE = 124;

const tileColors = [
  0xf13b3b,
  0xf4a822,
  0x65d92f,
  0x31bdf2,
  0xcf47ef,
  0xd28b48,
];

let audioContext: AudioContext | null = null;

const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;

const getAudioContext = () => {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
};

const playCrumbleSound = (amount: number) => {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume();
  }

  const now = context.currentTime;
  const duration = Math.min(0.34, 0.17 + amount * 0.012);
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < data.length; index++) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.58 + white * 0.42;
    const envelope = 1 - index / data.length;
    data[index] = previous * envelope * (0.72 + Math.random() * 0.28);
  }

  const noise = context.createBufferSource();
  noise.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(920 + Math.min(700, amount * 70), now);
  filter.Q.setValueAtTime(0.75, now);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.min(0.16, 0.075 + amount * 0.008), now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  noise.start(now);
  noise.stop(now + duration);

  const thud = context.createOscillator();
  const thudGain = context.createGain();
  thud.type = "triangle";
  thud.frequency.setValueAtTime(105, now);
  thud.frequency.exponentialRampToValueAtTime(58, now + 0.11);
  thudGain.gain.setValueAtTime(Math.min(0.08, 0.035 + amount * 0.003), now);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  thud.connect(thudGain);
  thudGain.connect(context.destination);
  thud.start(now);
  thud.stop(now + 0.14);
};

const crumbleTile = (scene: GameScene, tile: MatchTile, strength: number) => {
  if (!tile.circle.active) return;

  tile.circle.disableInteractive();
  const x = tile.circle.x;
  const y = tile.circle.y;
  const color = tileColors[tile.type] ?? 0xd8d8d8;
  const fragmentCount = strength >= 5 ? 8 : strength === 4 ? 7 : 6;

  for (let index = 0; index < fragmentCount; index++) {
    const size = Phaser.Math.Between(10, 23);
    const fragment = scene.add
      .rectangle(
        x + Phaser.Math.Between(-24, 24),
        y + Phaser.Math.Between(-24, 24),
        size,
        Phaser.Math.Between(9, 21),
        color,
        0.96,
      )
      .setDepth(11)
      .setAngle(Phaser.Math.Between(-45, 45));

    scene.tweens.add({
      targets: fragment,
      x: fragment.x + Phaser.Math.Between(-58, 58),
      y: fragment.y + Phaser.Math.Between(28, 88),
      angle: fragment.angle + Phaser.Math.Between(-150, 150),
      scaleX: 0.35,
      scaleY: 0.35,
      alpha: 0,
      duration: Phaser.Math.Between(170, 270),
      ease: "Cubic.easeIn",
      onComplete: () => fragment.destroy(),
    });
  }

  scene.tweens.add({
    targets: tile.circle,
    scaleX: tile.circle.scaleX * 0.32,
    scaleY: tile.circle.scaleY * 0.32,
    angle: tile.circle.angle + Phaser.Math.Between(-18, 18),
    alpha: 0,
    duration: 180,
    ease: "Back.easeIn",
  });
};

const matchRuns = (matches: MatchTile[]) => {
  const byPosition = new Map(matches.map((tile) => [`${tile.row}:${tile.col}`, tile]));
  const horizontal: MatchTile[][] = [];
  const vertical: MatchTile[][] = [];

  const rows = new Map<number, number[]>();
  const cols = new Map<number, number[]>();
  matches.forEach((tile) => {
    rows.set(tile.row, [...(rows.get(tile.row) ?? []), tile.col]);
    cols.set(tile.col, [...(cols.get(tile.col) ?? []), tile.row]);
  });

  rows.forEach((values, row) => {
    const sorted = [...new Set(values)].sort((a, b) => a - b);
    let current: number[] = [];
    sorted.forEach((col, index) => {
      if (current.length === 0 || col === current[current.length - 1] + 1) current.push(col);
      else {
        if (current.length >= 3) horizontal.push(current.map((value) => byPosition.get(`${row}:${value}`)!).filter(Boolean));
        current = [col];
      }
      if (index === sorted.length - 1 && current.length >= 3) {
        horizontal.push(current.map((value) => byPosition.get(`${row}:${value}`)!).filter(Boolean));
      }
    });
  });

  cols.forEach((values, col) => {
    const sorted = [...new Set(values)].sort((a, b) => a - b);
    let current: number[] = [];
    sorted.forEach((row, index) => {
      if (current.length === 0 || row === current[current.length - 1] + 1) current.push(row);
      else {
        if (current.length >= 3) vertical.push(current.map((value) => byPosition.get(`${value}:${col}`)!).filter(Boolean));
        current = [row];
      }
      if (index === sorted.length - 1 && current.length >= 3) {
        vertical.push(current.map((value) => byPosition.get(`${value}:${col}`)!).filter(Boolean));
      }
    });
  });

  return { horizontal, vertical };
};

const findSpecialCreation = (matches: MatchTile[]) => {
  const { horizontal, vertical } = matchRuns(matches);
  const allRuns = [...horizontal, ...vertical].sort((a, b) => b.length - a.length);
  const fiveRun = allRuns.find((run) => run.length >= 5);

  if (fiveRun) {
    return {
      anchor: fiveRun[Math.floor(fiveRun.length / 2)],
      kind: "rainbow" as SpecialKind,
      label: "SUPER CHIKI!",
    };
  }

  for (const hRun of horizontal) {
    const intersection = hRun.find((tile) =>
      vertical.some((vRun) => vRun.some((candidate) => candidate === tile)),
    );
    if (intersection) {
      return { anchor: intersection, kind: "bomb" as SpecialKind, label: "BOMBA!" };
    }
  }

  const fourRun = allRuns.find((run) => run.length === 4);
  if (fourRun) {
    return {
      anchor: fourRun[Math.floor(fourRun.length / 2)],
      kind: "rocket" as SpecialKind,
      label: "RAZZO!",
    };
  }

  return null;
};

const decorateSpecial = (scene: GameScene, tile: MatchTile, kind: SpecialKind, label: string) => {
  tile.special = kind;
  tile.circle.setAlpha(1).setAngle(0).setDisplaySize(BASE_TILE_SIZE, BASE_TILE_SIZE);

  if (kind === "rocket") tile.circle.setTint(0xffe36a);
  if (kind === "bomb") tile.circle.setTint(0xff72c7);
  if (kind === "rainbow") tile.circle.setTint(0xa9f4ff);

  const text = scene.add
    .text(tile.circle.x, tile.circle.y - 66, label, {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: kind === "rainbow" ? "25px" : "23px",
      color: "#fff7cf",
      stroke: "#54204f",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(14);

  scene.tweens.add({
    targets: text,
    y: text.y - 42,
    alpha: 0,
    duration: 760,
    ease: "Cubic.easeOut",
    onComplete: () => text.destroy(),
  });

  scene.tweens.add({
    targets: tile.circle,
    scaleX: tile.circle.scaleX * 1.12,
    scaleY: tile.circle.scaleY * 1.12,
    duration: 160,
    yoyo: true,
    repeat: 1,
    ease: "Sine.easeInOut",
    onComplete: () => {
      if (tile.circle.active) tile.circle.setDisplaySize(BASE_TILE_SIZE, BASE_TILE_SIZE);
    },
  });
};

const expandSpecialMatches = (scene: GameScene, initial: MatchTile[]) => {
  const sceneRuntime = runtime(scene);
  const result = new Set(initial);
  const queue = initial.filter((tile) => tile.special);
  const activated = new Set<MatchTile>();

  while (queue.length > 0) {
    const special = queue.shift()!;
    if (activated.has(special) || !special.special) continue;
    activated.add(special);

    const addTile = (tile: MatchTile | null | undefined) => {
      if (!tile || result.has(tile)) return;
      result.add(tile);
      if (tile.special && !activated.has(tile)) queue.push(tile);
    };

    if (special.special === "rocket") {
      for (let col = 0; col < sceneRuntime.cols; col++) {
        addTile(sceneRuntime.board[special.row]?.[col]);
      }
    }

    if (special.special === "bomb") {
      for (let row = special.row - 1; row <= special.row + 1; row++) {
        for (let col = special.col - 1; col <= special.col + 1; col++) {
          addTile(sceneRuntime.board[row]?.[col]);
        }
      }
    }

    if (special.special === "rainbow") {
      for (let row = 0; row < sceneRuntime.rows; row++) {
        for (let col = 0; col < sceneRuntime.cols; col++) {
          const tile = sceneRuntime.board[row]?.[col];
          if (tile?.type === special.type) addTile(tile);
        }
      }
    }
  }

  return { matches: Array.from(result), activated: activated.size > 0 };
};

const originalCreateTile = proto.createTile as RuntimeScene["createTile"];
proto.createTile = function (
  this: GameScene,
  row: number,
  col: number,
  type: number,
  fromAbove = false,
) {
  const tile = originalCreateTile.call(this, row, col, type, fromAbove);
  tile.circle.setDisplaySize(BASE_TILE_SIZE, BASE_TILE_SIZE);
  return tile;
};

const originalSelectTile = proto.selectTile as RuntimeScene["selectTile"];
proto.selectTile = function (this: GameScene, tile: MatchTile) {
  const sceneRuntime = runtime(this);
  const previous = sceneRuntime.selectedTile;
  originalSelectTile.call(this, tile);

  if (previous?.circle.active && previous !== sceneRuntime.selectedTile) {
    previous.circle.setDisplaySize(BASE_TILE_SIZE, BASE_TILE_SIZE);
  }
  if (tile.circle.active && tile !== sceneRuntime.selectedTile) {
    tile.circle.setDisplaySize(BASE_TILE_SIZE, BASE_TILE_SIZE);
  }
  if (sceneRuntime.selectedTile?.circle.active) {
    sceneRuntime.selectedTile.circle.setDisplaySize(SELECTED_TILE_SIZE, SELECTED_TILE_SIZE);
  }
};

const originalProcessMatches = proto.processMatches as RuntimeScene["processMatches"];
proto.processMatches = function (this: GameScene, incomingMatches: MatchTile[], cascade: boolean) {
  const sceneRuntime = runtime(this);
  const expanded = expandSpecialMatches(this, incomingMatches);
  const creation = expanded.activated ? null : findSpecialCreation(incomingMatches);
  const matches = creation
    ? expanded.matches.filter((tile) => tile !== creation.anchor)
    : expanded.matches;

  if (matches.length === 0) {
    originalProcessMatches.call(this, incomingMatches, cascade);
    return;
  }

  sceneRuntime.isProcessing = true;
  playCrumbleSound(matches.length);
  matches.forEach((tile) => crumbleTile(this, tile, incomingMatches.length));

  if (expanded.activated) {
    this.cameras.main.flash(95, 255, 238, 145, false);
    this.cameras.main.shake(110, 0.0022);
  }

  if (creation) {
    const multiplier = cascade ? sceneRuntime.comboMultiplier + 1 : sceneRuntime.comboMultiplier;
    sceneRuntime.score += 100 * Math.max(1, multiplier);
    if (creation.anchor.type === sceneRuntime.currentLevelConfig.collectType) {
      sceneRuntime.collectedAmount++;
    }
    if (creation.anchor.type === sceneRuntime.currentLevelConfig.collectType2) {
      sceneRuntime.collectedAmount2++;
    }
    decorateSpecial(this, creation.anchor, creation.kind, creation.label);
  }

  this.time.delayedCall(185, () => {
    originalProcessMatches.call(this, matches, cascade);
  });
};
