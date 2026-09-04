let barkContext: AudioContext | null = null;

const getBarkContext = () => {
  if (typeof window === "undefined") return null;
  if (!barkContext) barkContext = new AudioContext();
  return barkContext;
};

const makeNoiseBuffer = (context: AudioContext, duration: number) => {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const fade = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * fade;
  }
  return buffer;
};

const barkBurst = (context: AudioContext, when: number, pitch: number, volume: number) => {
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  const oscillator = context.createOscillator();
  const noise = context.createBufferSource();
  const noiseGain = context.createGain();

  master.gain.setValueAtTime(0.0001, when);
  master.gain.exponentialRampToValueAtTime(volume, when + 0.012);
  master.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(780, when);
  filter.Q.setValueAtTime(1.25, when);

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(pitch, when);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(95, pitch * 0.54), when + 0.14);

  noise.buffer = makeNoiseBuffer(context, 0.19);
  noiseGain.gain.setValueAtTime(0.33, when);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.17);

  oscillator.connect(filter);
  noise.connect(noiseGain);
  noiseGain.connect(filter);
  filter.connect(master);
  master.connect(context.destination);

  oscillator.start(when);
  oscillator.stop(when + 0.19);
  noise.start(when);
  noise.stop(when + 0.19);
};

export const playChikiBark = async () => {
  const context = getBarkContext();
  if (!context) return false;

  try {
    if (context.state !== "running") await context.resume();
  } catch {
    return false;
  }

  if (context.state !== "running") return false;

  const now = context.currentTime + 0.01;
  const variation = 0.92 + Math.random() * 0.14;
  barkBurst(context, now, 235 * variation, 0.16);
  barkBurst(context, now + 0.15, 285 * variation, 0.12);
  return true;
};
