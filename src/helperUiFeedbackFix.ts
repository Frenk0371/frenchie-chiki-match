import GameScene from "./game/GameScene";

type BoosterKind = "shuffle" | "hammer" | "rocket";

type RuntimeScene = {
  shuffleUses: number;
  hammerUses: number;
  rocketUses: number;
};

type UiState = {
  labels: Partial<Record<BoosterKind, Phaser.GameObjects.Text>>;
  previous: Record<BoosterKind, number>;
};

const proto = GameScene.prototype as any;
const states = new WeakMap<GameScene, UiState>();
let audioContext: AudioContext | null = null;

const runtime = (scene: GameScene) => scene as unknown as RuntimeScene;

const countFor = (scene: GameScene, kind: BoosterKind) => {
  const r = runtime(scene);
  if (kind === "shuffle") return Math.max(0, Number(r.shuffleUses || 0));
  if (kind === "hammer") return Math.max(0, Number(r.hammerUses || 0));
  return Math.max(0, Number(r.rocketUses || 0));
};

const ensureAudio = () => {
  try {
    if (!audioContext) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      audioContext = new Ctx();
    }
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
};

const tone = (frequency: number, duration: number, volume: number, type: OscillatorType = "sine", delay = 0) => {
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
};

const noiseHit = (delay = 0) => {
  const ctx = ensureAudio();
  if (!ctx) return;
  const duration = 0.12;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const env = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = "lowpass";
  filter.frequency.value = 1300;
  gain.gain.value = 0.16;
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  const start = ctx.currentTime + delay;
  source.start(start);
};

const playHammer = () => {
  tone(170, 0.12, 0.22, "square", 0.25);
  tone(78, 0.24, 0.28, "sine", 0.27);
  noiseHit(0.26);
};

const playRocket = () => {
  tone(240, 0.42, 0.08, "sawtooth", 0.02);
  tone(460, 0.5, 0.06, "triangle", 0.04);
  tone(90, 0.22, 0.22, "sine", 0.52);
  noiseHit(0.53);
};

const playShuffle = () => {
  tone(520, 0.12, 0.08, "triangle", 0.02);
  tone(650, 0.12, 0.08, "triangle", 0.16);
  tone(780, 0.12, 0.08, "triangle", 0.30);
  tone(920, 0.15, 0.09, "triangle", 0.44);
};

const makeCountLabel = (scene: GameScene, x: number, kind: BoosterKind) =>
  scene.add
    .text(x + 68, 1502, String(countFor(scene, kind)), {
      fontFamily: '"Lilita One", "Fredoka", sans-serif',
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
      backgroundColor: "#76359a",
      padding: { x: 10, y: 5 },
      stroke: "#3c1553",
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(2300);

const originalCreate = proto.create as (this: GameScene) => void;
proto.create = function (this: GameScene) {
  originalCreate.call(this);

  const previous: Record<BoosterKind, number> = {
    shuffle: countFor(this, "shuffle"),
    hammer: countFor(this, "hammer"),
    rocket: countFor(this, "rocket"),
  };

  const state: UiState = {
    labels: {
      shuffle: makeCountLabel(this, 270, "shuffle"),
      hammer: makeCountLabel(this, 540, "hammer"),
      rocket: makeCountLabel(this, 810, "rocket"),
    },
    previous,
  };
  states.set(this, state);

  const unlockAudio = () => {
    ensureAudio();
  };
  this.input.on("pointerdown", unlockAudio);

  const onUpdate = () => {
    const current: Record<BoosterKind, number> = {
      shuffle: countFor(this, "shuffle"),
      hammer: countFor(this, "hammer"),
      rocket: countFor(this, "rocket"),
    };

    (Object.keys(current) as BoosterKind[]).forEach((kind) => {
      const label = state.labels[kind];
      if (label?.active && label.text !== String(current[kind])) {
        label.setText(String(current[kind]));
        label.setScale(1.22);
        this.tweens.add({ targets: label, scale: 1, duration: 180, ease: "Back.easeOut" });
      }

      if (current[kind] < state.previous[kind]) {
        if (kind === "hammer") playHammer();
        else if (kind === "rocket") playRocket();
        else playShuffle();
      }
      state.previous[kind] = current[kind];
    });
  };

  this.events.on("update", onUpdate);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    this.events.off("update", onUpdate);
    this.input.off("pointerdown", unlockAudio);
    Object.values(state.labels).forEach((label) => label?.destroy());
    states.delete(this);
  });
};
