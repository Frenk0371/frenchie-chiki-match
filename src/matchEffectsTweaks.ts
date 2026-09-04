import Phaser from "phaser";
import GameScene from "./game/GameScene";

type SpecialKind = "rocket-h" | "rocket-v" | "bomb" | "rainbow";

type MatchTile = {
  row: number;
  col: number;
  type: number;
  circle: Phaser.GameObjects.Image;
  special?: SpecialKind;
  baseType?: number;
};

type RuntimeScene = {
  rows: number;
  cols: number;
  tileSize: number;
  boardY: number;
  board: (MatchTile | null)[][];
  selectedTile: MatchTile | null;
  isProcessing: boolean;
  levelCompleted: boolean;
  moves: number;
  movesText?: Phaser.GameObjects.Text;
  comboMultiplier: number;
  score: number;
  collectedAmount: number;
  collectedAmount2: number;
  currentLevelConfig: { collectType?: number; collectType2?: number };
  createTile: (row: number, col: number, type: number, fromAbove?: boolean) => MatchTile;
  selectTile: (tile: MatchTile) => void;
  trySwap: (a: MatchTile, b: MatchTile) => void;
  swapModel: (a: MatchTile, b: MatchTile) => void;
  processMatches: (matches: MatchTile[], cascade: boolean) => void;
  shuffleBoard: () => void;
  hasAvailableMove: () => boolean;
  _specialLastSwap?: MatchTile[];
  _specialPowerActive?: boolean;
};

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
type PurchasedSpecial = "grid_rocket" | "bomb" | "rainbow";

const proto = GameScene.prototype as any;
const TILE_SIZE = 116;
const SELECTED_TILE_SIZE = 126;
const ROOM_STATE_KEY = "chiki-room-state";
const SESSION_KEY = "chiki-auth-session-v1";
const SUPABASE_URL = "https://xrkqeelwutjzyqxgvxmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_vQVI5HTbjy6lrDZLmoJfkw_ulzJMIkO";
let specialSequence = 1;
let audioContext: AudioContext | null = null;

const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;

const getAudioContext = () => {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
};

const resumeAudio = () => {
  const context = getAudioContext();
  if (context?.state === "suspended") void context.resume();
};
window.addEventListener("pointerdown", resumeAudio, { passive: true });

const tone = (frequency: number, duration: number, gainValue = 0.08, type: OscillatorType = "sine", delay = 0) => {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

const playCreateSound = (kind: SpecialKind) => {
  if (kind === "rainbow") {
    [520, 660, 820, 1040].forEach((f, i) => tone(f, 0.24, 0.075, "sine", i * 0.055));
    return;
  }
  if (kind === "bomb") {
    tone(260, 0.17, 0.08, "triangle");
    tone(390, 0.2, 0.07, "sine", 0.05);
    return;
  }
  tone(420, 0.13, 0.07, "square");
  tone(690, 0.17, 0.065, "triangle", 0.055);
};

const playRocketSound = () => {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(180, now);
  oscillator.frequency.exponentialRampToValueAtTime(1050, now + 0.28);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.085, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.32);
};

const playBombSound = () => {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  const duration = 0.34;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const envelope = Math.pow(1 - i / data.length, 1.9);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }
  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  noise.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1100, now);
  gain.gain.setValueAtTime(0.13, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  noise.start(now);
  noise.stop(now + duration);
  const boom = context.createOscillator();
  const boomGain = context.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(120, now);
  boom.frequency.exponentialRampToValueAtTime(44, now + 0.3);
  boomGain.gain.setValueAtTime(0.14, now);
  boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  boom.connect(boomGain);
  boomGain.connect(context.destination);
  boom.start(now);
  boom.stop(now + 0.33);
};

const playRainbowSound = () => {
  [330, 440, 550, 660, 880, 1100].forEach((f, i) => tone(f, 0.28, 0.065, i % 2 ? "triangle" : "sine", i * 0.045));
};

const playCrumbleSound = (amount: number) => {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  const duration = Math.min(0.28, 0.12 + amount * 0.01);
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.55;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(Math.min(0.11, 0.05 + amount * 0.004), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(gain);
  gain.connect(context.destination);
  source.start(now);
  source.stop(now + duration);
};

const tileColor = (tile: MatchTile) => [0xf13b3b, 0xf4a822, 0x65d92f, 0x31bdf2, 0xcf47ef, 0xd28b48][tile.baseType ?? tile.type] ?? 0xffffff;

const crumbleTile = (scene: GameScene, tile: MatchTile, strength: number) => {
  if (!tile.circle.active) return;
  const x = tile.circle.x;
  const y = tile.circle.y;
  const color = tileColor(tile);
  const fragments = Math.min(9, 5 + Math.floor(strength / 2));
  for (let i = 0; i < fragments; i++) {
    const piece = scene.add.rectangle(
      x + Phaser.Math.Between(-22, 22), y + Phaser.Math.Between(-22, 22),
      Phaser.Math.Between(9, 20), Phaser.Math.Between(8, 18), color, 0.94,
    ).setDepth(15).setAngle(Phaser.Math.Between(-40, 40));
    scene.tweens.add({
      targets: piece,
      x: piece.x + Phaser.Math.Between(-65, 65),
      y: piece.y + Phaser.Math.Between(35, 95),
      angle: piece.angle + Phaser.Math.Between(-180, 180),
      alpha: 0,
      scale: 0.25,
      duration: Phaser.Math.Between(180, 300),
      ease: "Cubic.easeIn",
      onComplete: () => piece.destroy(),
    });
  }
};

const matchRuns = (matches: MatchTile[]) => {
  const ordinary = matches.filter((tile) => !tile.special && tile.type >= 0);
  const horizontal: MatchTile[][] = [];
  const vertical: MatchTile[][] = [];
  const rowGroups = new Map<string, MatchTile[]>();
  const colGroups = new Map<string, MatchTile[]>();

  ordinary.forEach((tile) => {
    const rowKey = `${tile.row}:${tile.type}`;
    const colKey = `${tile.col}:${tile.type}`;
    rowGroups.set(rowKey, [...(rowGroups.get(rowKey) ?? []), tile]);
    colGroups.set(colKey, [...(colGroups.get(colKey) ?? []), tile]);
  });

  rowGroups.forEach((group) => {
    const sorted = [...group].sort((a, b) => a.col - b.col);
    let run: MatchTile[] = [];
    sorted.forEach((tile, index) => {
      if (run.length === 0 || tile.col === run[run.length - 1].col + 1) run.push(tile);
      else {
        if (run.length >= 3) horizontal.push(run);
        run = [tile];
      }
      if (index === sorted.length - 1 && run.length >= 3) horizontal.push(run);
    });
  });

  colGroups.forEach((group) => {
    const sorted = [...group].sort((a, b) => a.row - b.row);
    let run: MatchTile[] = [];
    sorted.forEach((tile, index) => {
      if (run.length === 0 || tile.row === run[run.length - 1].row + 1) run.push(tile);
      else {
        if (run.length >= 3) vertical.push(run);
        run = [tile];
      }
      if (index === sorted.length - 1 && run.length >= 3) vertical.push(run);
    });
  });

  return { horizontal, vertical };
};

const chooseAnchor = (scene: GameScene, run: MatchTile[]) => {
  const lastSwap = runtime(scene)._specialLastSwap ?? [];
  const swapped = [...lastSwap].reverse().find((tile) => run.includes(tile));
  return swapped ?? run[Math.floor(run.length / 2)];
};

const findSpecialCreation = (scene: GameScene, matches: MatchTile[]) => {
  const { horizontal, vertical } = matchRuns(matches);
  const runs = [
    ...horizontal.map((run) => ({ run, orientation: "h" as const })),
    ...vertical.map((run) => ({ run, orientation: "v" as const })),
  ].sort((a, b) => b.run.length - a.run.length);

  const six = runs.find(({ run }) => run.length >= 6);
  if (six) return { anchor: chooseAnchor(scene, six.run), kind: "rainbow" as SpecialKind, baseType: six.run[0].type };

  const five = runs.find(({ run }) => run.length === 5);
  if (five) return { anchor: chooseAnchor(scene, five.run), kind: "bomb" as SpecialKind, baseType: five.run[0].type };

  const four = runs.find(({ run }) => run.length === 4);
  if (four) return {
    anchor: chooseAnchor(scene, four.run),
    kind: (four.orientation === "h" ? "rocket-h" : "rocket-v") as SpecialKind,
    baseType: four.run[0].type,
  };
  return null;
};

const specialTexture = (kind: SpecialKind) => kind.startsWith("rocket") ? "special-grid-rocket" : kind === "bomb" ? "special-bomb" : "special-rainbow";

const decorateSpecial = (scene: GameScene, tile: MatchTile, kind: SpecialKind, baseType: number, announce = true) => {
  tile.special = kind;
  tile.baseType = baseType;
  tile.type = -1000 - specialSequence++;
  tile.circle.clearTint().setTexture(specialTexture(kind)).setDisplaySize(106, 106).setAlpha(1);
  tile.circle.setAngle(kind === "rocket-v" ? 90 : 0);

  const targetScaleX = tile.circle.scaleX;
  const targetScaleY = tile.circle.scaleY;
  tile.circle.setScale(targetScaleX * 0.18, targetScaleY * 0.18);

  const glow = scene.add.circle(tile.circle.x, tile.circle.y, 52, kind === "rainbow" ? 0x8ef6ff : kind === "bomb" ? 0xff6bd5 : 0xffe46a, 0.34)
    .setDepth(12).setScale(0.25);
  scene.tweens.add({ targets: glow, scale: 1.45, alpha: 0, duration: 560, ease: "Cubic.easeOut", onComplete: () => glow.destroy() });
  scene.tweens.add({
    targets: tile.circle,
    scaleX: targetScaleX,
    scaleY: targetScaleY,
    angle: kind === "rocket-v" ? 90 : kind === "rainbow" ? 360 : 0,
    duration: 430,
    ease: "Back.easeOut",
    onComplete: () => {
      if (tile.circle.active) tile.circle.setAngle(kind === "rocket-v" ? 90 : 0);
    },
  });
  playCreateSound(kind);

  if (!announce) return;
  const label = kind === "rainbow" ? "SFERA MULTICOLORE!" : kind === "bomb" ? "BOMBA!" : "RAZZO!";
  const text = scene.add.text(tile.circle.x, tile.circle.y - 62, label, {
    fontFamily: '"Lilita One", "Fredoka", sans-serif',
    fontSize: kind === "rainbow" ? "25px" : "27px",
    color: "#fff8cf",
    stroke: "#49234f",
    strokeThickness: 6,
  }).setOrigin(0.5).setDepth(18);
  scene.tweens.add({ targets: text, y: text.y - 54, alpha: 0, duration: 820, ease: "Cubic.easeOut", onComplete: () => text.destroy() });
};

const allBoardTiles = (scene: GameScene) => runtime(scene).board.flat().filter((tile): tile is MatchTile => Boolean(tile));

const addChainTargets = (scene: GameScene, seed: MatchTile[]) => {
  const r = runtime(scene);
  const result = new Set<MatchTile>(seed);
  const queue = seed.filter((tile) => tile.special && tile.special !== "rainbow");
  const activated = new Set<MatchTile>();

  const add = (tile: MatchTile | null | undefined) => {
    if (!tile || result.has(tile)) return;
    result.add(tile);
    if (tile.special && tile.special !== "rainbow" && !activated.has(tile)) queue.push(tile);
  };

  while (queue.length) {
    const special = queue.shift()!;
    if (!special.special || activated.has(special)) continue;
    activated.add(special);
    if (special.special === "rocket-h") {
      for (let col = 0; col < r.cols; col++) add(r.board[special.row]?.[col]);
    } else if (special.special === "rocket-v") {
      for (let row = 0; row < r.rows; row++) add(r.board[row]?.[special.col]);
    } else if (special.special === "bomb") {
      for (let row = special.row - 1; row <= special.row + 1; row++) {
        for (let col = special.col - 1; col <= special.col + 1; col++) add(r.board[row]?.[col]);
      }
    }
  }
  return Array.from(result);
};

const spendMove = (scene: GameScene) => {
  const r = runtime(scene);
  if (r.moves <= 0 || r.levelCompleted || r.isProcessing) return false;
  r.moves--;
  r.movesText?.setText(`${r.moves}\nMOSSE`);
  r.isProcessing = true;
  return true;
};

const flashRocket = (scene: GameScene, tile: MatchTile) => {
  const r = runtime(scene);
  const horizontal = tile.special === "rocket-h";
  const width = horizontal ? r.cols * r.tileSize : 34;
  const height = horizontal ? 34 : r.rows * r.tileSize;
  const beam = scene.add.rectangle(tile.circle.x, tile.circle.y, width, height, 0xffe56b, 0.72).setDepth(16).setScale(horizontal ? 0.05 : 1, horizontal ? 1 : 0.05);
  scene.tweens.add({
    targets: beam,
    scaleX: 1,
    scaleY: 1,
    alpha: 0,
    duration: 340,
    ease: "Cubic.easeOut",
    onComplete: () => beam.destroy(),
  });
  scene.cameras.main.flash(90, 255, 228, 95, false);
  scene.cameras.main.shake(120, 0.0022);
  playRocketSound();
};

const flashBomb = (scene: GameScene, tile: MatchTile) => {
  for (let i = 0; i < 3; i++) {
    const ring = scene.add.circle(tile.circle.x, tile.circle.y, 30 + i * 10, 0xff6ca8, 0.2).setStrokeStyle(8, i === 0 ? 0xfff06b : 0xff6ca8, 0.85).setDepth(16);
    scene.tweens.add({ targets: ring, scale: 2.4 + i * 0.25, alpha: 0, duration: 360 + i * 55, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
  }
  scene.cameras.main.flash(120, 255, 130, 80, false);
  scene.cameras.main.shake(190, 0.006);
  playBombSound();
};

const flashRainbow = (scene: GameScene, source: MatchTile, targets: MatchTile[]) => {
  targets.slice(0, 22).forEach((tile, index) => {
    const line = scene.add.line(0, 0, source.circle.x, source.circle.y, tile.circle.x, tile.circle.y, 0xffffff, 0.65).setOrigin(0).setLineWidth(3).setDepth(17).setAlpha(0);
    scene.tweens.add({ targets: line, alpha: 0.85, duration: 90, delay: index * 8, yoyo: true, hold: 55, onComplete: () => line.destroy() });
  });
  const pulse = scene.add.circle(source.circle.x, source.circle.y, 42, 0xffffff, 0.45).setDepth(17);
  scene.tweens.add({ targets: pulse, scale: 3, alpha: 0, duration: 480, ease: "Cubic.easeOut", onComplete: () => pulse.destroy() });
  scene.cameras.main.flash(150, 195, 245, 255, false);
  scene.cameras.main.shake(140, 0.0028);
  playRainbowSound();
};

const activateTapSpecial = (scene: GameScene, tile: MatchTile) => {
  const r = runtime(scene);
  if (!tile.special || tile.special === "rainbow" || !spendMove(scene)) return;
  if (r.selectedTile?.circle.active) r.selectedTile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  r.selectedTile = null;

  let targets: MatchTile[] = [];
  if (tile.special === "rocket-h") targets = r.board[tile.row].filter((item): item is MatchTile => Boolean(item));
  if (tile.special === "rocket-v") targets = r.board.map((row) => row[tile.col]).filter((item): item is MatchTile => Boolean(item));
  if (tile.special === "bomb") {
    for (let row = tile.row - 1; row <= tile.row + 1; row++) {
      for (let col = tile.col - 1; col <= tile.col + 1; col++) {
        const candidate = r.board[row]?.[col];
        if (candidate) targets.push(candidate);
      }
    }
  }
  targets = addChainTargets(scene, targets);
  if (tile.special.startsWith("rocket")) flashRocket(scene, tile);
  else flashBomb(scene, tile);

  r._specialPowerActive = true;
  scene.time.delayedCall(250, () => {
    r.processMatches(targets, false);
    r._specialPowerActive = false;
  });
};

const activateRainbowSwap = (scene: GameScene, rainbow: MatchTile, target: MatchTile) => {
  const r = runtime(scene);
  if (!spendMove(scene)) return;
  const targetType = target.baseType ?? target.type;
  if (targetType < 0) {
    r.isProcessing = false;
    return;
  }

  const aX = rainbow.circle.x;
  const aY = rainbow.circle.y;
  const bX = target.circle.x;
  const bY = target.circle.y;
  r.swapModel(rainbow, target);
  scene.tweens.add({ targets: rainbow.circle, x: bX, y: bY, duration: 210, ease: "Power2" });
  scene.tweens.add({ targets: target.circle, x: aX, y: aY, duration: 210, ease: "Power2" });

  scene.time.delayedCall(215, () => {
    const targets = allBoardTiles(scene).filter((tile) => !tile.special && tile.type === targetType);
    targets.push(rainbow);
    flashRainbow(scene, rainbow, targets);
    r._specialPowerActive = true;
    scene.time.delayedCall(330, () => {
      r.processMatches(targets, false);
      r._specialPowerActive = false;
    });
  });
};

const readRoomState = () => {
  try { return JSON.parse(localStorage.getItem(ROOM_STATE_KEY) || "{}") as Record<string, number>; }
  catch { return {} as Record<string, number>; }
};

const writeRoomState = (state: Record<string, number>) => localStorage.setItem(ROOM_STATE_KEY, JSON.stringify(state));

const dispatchCounts = (state: Record<string, number>) => {
  window.dispatchEvent(new CustomEvent("chiki-boosters-changed", {
    detail: {
      shuffle: Math.max(0, Number(state.booster_shuffle ?? 3)),
      hammer: Math.max(0, Number(state.booster_hammer ?? 3)),
      rocket: Math.max(0, Number(state.booster_rocket ?? 2)),
      gridRocket: Math.max(0, Number(state.booster_grid_rocket ?? 0)),
      bomb: Math.max(0, Number(state.booster_bomb ?? 0)),
      rainbow: Math.max(0, Number(state.booster_rainbow ?? 0)),
    },
  }));
};

const syncPurchasedSpecialUse = async (kind: PurchasedSpecial) => {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as { access_token?: string } | null;
    if (!session?.access_token) return;
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/chiki_use_booster`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_booster: kind }),
    });
  } catch {
    // Il consumo locale viene mantenuto e sarà riallineato al prossimo accesso.
  }
};

const seedPurchasedSpecials = (scene: GameScene) => {
  const r = runtime(scene);
  if (r.levelCompleted) return;
  const state = readRoomState();
  const offers: Array<{ key: string; kind: PurchasedSpecial; special: SpecialKind }> = [
    { key: "booster_grid_rocket", kind: "grid_rocket", special: Math.random() < 0.5 ? "rocket-h" : "rocket-v" },
    { key: "booster_bomb", kind: "bomb", special: "bomb" },
    { key: "booster_rainbow", kind: "rainbow", special: "rainbow" },
  ];
  let changed = false;

  offers.forEach((offer) => {
    const count = Math.max(0, Number(state[offer.key] ?? 0));
    if (count <= 0) return;
    const candidates = allBoardTiles(scene).filter((tile) => !tile.special && tile.type >= 0);
    if (candidates.length === 0) return;
    const tile = Phaser.Utils.Array.GetRandom(candidates);
    const baseType = tile.type;
    decorateSpecial(scene, tile, offer.special, baseType, false);
    state[offer.key] = count - 1;
    changed = true;
    void syncPurchasedSpecialUse(offer.kind);
  });

  if (changed) {
    writeRoomState(state);
    dispatchCounts(state);
    const label = scene.add.text(540, 420, "✨ BONUS SHOP IN GRIGLIA!", {
      fontFamily: '"Lilita One", "Fredoka", sans-serif', fontSize: "38px", color: "#fff6a2", stroke: "#4e2254", strokeThickness: 7,
    }).setOrigin(0.5).setDepth(30);
    scene.tweens.add({ targets: label, y: 385, alpha: 0, duration: 1050, ease: "Cubic.easeOut", onComplete: () => label.destroy() });
  }
};

const originalPreload = proto.preload as (this: GameScene) => void;
proto.preload = function (this: GameScene) {
  originalPreload.call(this);
  this.load.image("special-grid-rocket", "/special-grid-rocket.svg");
  this.load.image("special-bomb", "/special-bomb.svg");
  this.load.image("special-rainbow", "/special-rainbow.svg");
};

const originalCreateTile = proto.createTile as RuntimeScene["createTile"];
proto.createTile = function (this: GameScene, row: number, col: number, type: number, fromAbove = false) {
  const tile = originalCreateTile.call(this, row, col, type, fromAbove);
  tile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  return tile;
};

const originalSelectTile = proto.selectTile as RuntimeScene["selectTile"];
proto.selectTile = function (this: GameScene, tile: MatchTile) {
  const r = runtime(this);
  if ((tile.special === "rocket-h" || tile.special === "rocket-v" || tile.special === "bomb") && !r.isProcessing) {
    activateTapSpecial(this, tile);
    return;
  }
  const previous = r.selectedTile;
  originalSelectTile.call(this, tile);
  if (previous?.circle.active && previous !== r.selectedTile) previous.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  if (tile.circle.active && tile !== r.selectedTile) tile.circle.setDisplaySize(TILE_SIZE, TILE_SIZE);
  if (r.selectedTile?.circle.active) r.selectedTile.circle.setDisplaySize(SELECTED_TILE_SIZE, SELECTED_TILE_SIZE);
};

const originalTrySwap = proto.trySwap as RuntimeScene["trySwap"];
proto.trySwap = function (this: GameScene, a: MatchTile, b: MatchTile) {
  const r = runtime(this);
  r._specialLastSwap = [a, b];
  const rainbow = a.special === "rainbow" ? a : b.special === "rainbow" ? b : null;
  const target = rainbow === a ? b : rainbow === b ? a : null;
  if (rainbow && target && !target.special) {
    activateRainbowSwap(this, rainbow, target);
    return;
  }
  originalTrySwap.call(this, a, b);
};

const originalProcessMatches = proto.processMatches as RuntimeScene["processMatches"];
proto.processMatches = function (this: GameScene, incomingMatches: MatchTile[], cascade: boolean) {
  const r = runtime(this);
  const creation = r._specialPowerActive ? null : findSpecialCreation(this, incomingMatches);
  const creationInfo = creation ? {
    row: creation.anchor.row,
    col: creation.anchor.col,
    baseType: creation.baseType,
    kind: creation.kind,
  } : null;

  r.isProcessing = true;
  playCrumbleSound(incomingMatches.length);
  incomingMatches.forEach((tile) => crumbleTile(this, tile, incomingMatches.length));

  this.time.delayedCall(145, () => {
    originalProcessMatches.call(this, incomingMatches, cascade);
    if (creationInfo && !r.levelCompleted && r.board[creationInfo.row]?.[creationInfo.col] === null) {
      const special = r.createTile(creationInfo.row, creationInfo.col, creationInfo.baseType, false);
      r.board[creationInfo.row][creationInfo.col] = special;
      decorateSpecial(this, special, creationInfo.kind, creationInfo.baseType, true);
    }
    if (!cascade) r._specialLastSwap = undefined;
  });
};

const originalShuffleBoard = proto.shuffleBoard as RuntimeScene["shuffleBoard"];
proto.shuffleBoard = function (this: GameScene) {
  const specials = allBoardTiles(this).filter((tile) => tile.special).map((tile) => ({
    tile,
    special: tile.special!,
    baseType: tile.baseType ?? 0,
  }));
  originalShuffleBoard.call(this);
  specials.forEach(({ tile, special, baseType }) => {
    decorateSpecial(this, tile, special, baseType, false);
  });
};

const originalHasAvailableMove = proto.hasAvailableMove as RuntimeScene["hasAvailableMove"];
proto.hasAvailableMove = function (this: GameScene) {
  if (allBoardTiles(this).some((tile) => tile.special)) return true;
  return originalHasAvailableMove.call(this);
};

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  originalCreate.call(this);
  this.time.delayedCall(760, () => seedPurchasedSpecials(this));
};
