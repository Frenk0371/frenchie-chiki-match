let audioContext: AudioContext | null = null;
let musicTimer: number | null = null;
let musicStep = 0;

const melody = [
  523.25, 659.25, 783.99, 659.25,
  587.33, 698.46, 880.0, 698.46,
  659.25, 783.99, 987.77, 783.99,
  587.33, 698.46, 783.99, 659.25,
];

const bass = [261.63, 293.66, 329.63, 293.66];

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
};

const playTone = (
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  type: OscillatorType = "triangle",
) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2800, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.04);
};

const playMusicStep = () => {
  const context = getAudioContext();
  if (!context || context.state !== "running") return;

  const now = context.currentTime;
  const note = melody[musicStep % melody.length];
  playTone(context, note, now, 0.28, 0.027, "triangle");
  playTone(context, note * 2, now + 0.012, 0.18, 0.008, "sine");

  if (musicStep % 4 === 0) {
    const bassNote = bass[Math.floor(musicStep / 4) % bass.length];
    playTone(context, bassNote, now, 0.48, 0.018, "sine");
  }

  if (musicStep % 8 === 6) {
    playTone(context, note * 1.5, now + 0.09, 0.16, 0.009, "triangle");
  }

  musicStep += 1;
};

export const unlockHomeAudio = async () => {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state !== "running") await context.resume();
  } catch {
    return false;
  }

  return context.state === "running";
};

export const startHomeMusic = async () => {
  const unlocked = await unlockHomeAudio();
  const context = getAudioContext();
  if (!unlocked || !context || context.state !== "running") return false;
  if (musicTimer !== null) return true;

  playMusicStep();
  musicTimer = window.setInterval(playMusicStep, 360);
  return true;
};

export const stopHomeMusic = () => {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
};

export const playPurchaseJingle = async () => {
  const context = getAudioContext();
  if (!context) return;

  try {
    if (context.state !== "running") await context.resume();
  } catch {
    return;
  }

  const now = context.currentTime;
  [659.25, 783.99, 987.77, 1318.51].forEach((note, index) => {
    playTone(context, note, now + index * 0.085, 0.25, 0.05, index % 2 === 0 ? "triangle" : "sine");
  });
};

export const playEquipPop = async () => {
  const context = getAudioContext();
  if (!context) return;

  try {
    if (context.state !== "running") await context.resume();
  } catch {
    return;
  }

  const now = context.currentTime;
  playTone(context, 440, now, 0.09, 0.035, "sine");
  playTone(context, 660, now + 0.055, 0.14, 0.035, "triangle");
};
