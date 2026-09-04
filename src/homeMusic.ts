let audioContext: AudioContext | null = null;
let musicTimer: number | null = null;
let musicStep = 0;
let musicRequested = false;
let unlockListenersArmed = false;

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
  filter.frequency.setValueAtTime(3000, startAt);

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
  if (!context || context.state !== "running" || !musicRequested) return;

  const now = context.currentTime;
  const note = melody[musicStep % melody.length];

  // Volume volutamente più presente rispetto alla prima versione.
  playTone(context, note, now, 0.31, 0.055, "triangle");
  playTone(context, note * 2, now + 0.012, 0.2, 0.016, "sine");

  if (musicStep % 4 === 0) {
    const bassNote = bass[Math.floor(musicStep / 4) % bass.length];
    playTone(context, bassNote, now, 0.52, 0.034, "sine");
  }

  if (musicStep % 8 === 6) {
    playTone(context, note * 1.5, now + 0.09, 0.18, 0.018, "triangle");
  }

  musicStep += 1;
};

const startMusicLoop = () => {
  const context = getAudioContext();
  if (!context || context.state !== "running" || !musicRequested) return false;
  if (musicTimer !== null) return true;

  playMusicStep();
  musicTimer = window.setInterval(playMusicStep, 360);
  return true;
};

const disarmUnlockListeners = () => {
  if (!unlockListenersArmed || typeof window === "undefined") return;
  unlockListenersArmed = false;
  window.removeEventListener("pointerdown", tryUnlockRequestedMusic);
  window.removeEventListener("touchstart", tryUnlockRequestedMusic);
  window.removeEventListener("touchend", tryUnlockRequestedMusic);
  window.removeEventListener("click", tryUnlockRequestedMusic);
  window.removeEventListener("keydown", tryUnlockRequestedMusic);
};

const resumeRequestedMusic = async () => {
  if (!musicRequested) {
    disarmUnlockListeners();
    return false;
  }

  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state !== "running") await context.resume();
  } catch {
    return false;
  }

  if (context.state !== "running") return false;
  const started = startMusicLoop();
  if (started) disarmUnlockListeners();
  return started;
};

function tryUnlockRequestedMusic() {
  void resumeRequestedMusic();
}

const armUnlockListeners = () => {
  if (unlockListenersArmed || typeof window === "undefined") return;
  unlockListenersArmed = true;

  // iOS può bloccare l'audio in autoplay: manteniamo il tentativo armato
  // fino alla prima vera interazione, qualunque essa sia.
  window.addEventListener("pointerdown", tryUnlockRequestedMusic, { passive: true });
  window.addEventListener("touchstart", tryUnlockRequestedMusic, { passive: true });
  window.addEventListener("touchend", tryUnlockRequestedMusic, { passive: true });
  window.addEventListener("click", tryUnlockRequestedMusic, { passive: true });
  window.addEventListener("keydown", tryUnlockRequestedMusic);
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
  musicRequested = true;

  const started = await resumeRequestedMusic();
  if (!started) armUnlockListeners();
  return started;
};

export const stopHomeMusic = () => {
  musicRequested = false;
  disarmUnlockListeners();

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
