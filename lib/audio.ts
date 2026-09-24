export let audioCtx: AudioContext | null = null;
export let bgmAudio: HTMLAudioElement | null = null;

export let sfxVolume = 0.5;
export let bgmVolume = 0.3;

function getStoredVolume(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    }
  } catch {}
  return fallback;
}

if (typeof window !== 'undefined') {
  sfxVolume = getStoredVolume('sfxVolume', 0.5);
  bgmVolume = getStoredVolume('bgmVolume', 0.3);
}

export function setSfxVolume(vol: number) {
  sfxVolume = Math.max(0, Math.min(1, vol));
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('sfxVolume', sfxVolume.toString()); } catch {}
  }
}

export function setBgmVolume(vol: number) {
  bgmVolume = Math.max(0, Math.min(1, vol));
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('bgmVolume', bgmVolume.toString()); } catch {}
  }
  if (!bgmAudio && typeof window !== 'undefined') {
    initAudio();
  }
  if (bgmAudio) {
    bgmAudio.volume = bgmVolume;
    if (bgmVolume > 0 && bgmAudio.paused) {
      bgmAudio.play().catch(() => {});
    } else if (bgmVolume === 0 && !bgmAudio.paused) {
      bgmAudio.pause();
    }
  }
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function initAudio() {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  if (!bgmAudio) {
    bgmAudio = new Audio('/bgm.mp3');
    bgmAudio.loop = true;
    bgmAudio.volume = bgmVolume;
  }

  if (bgmAudio && bgmVolume > 0 && bgmAudio.paused) {
    bgmAudio.play().catch(() => {
      // Browsers may block until a direct click
    });
  }
}

export function playBgm() {
  if (!bgmAudio) {
    initAudio();
  }
  if (bgmAudio && bgmAudio.paused && bgmVolume > 0) {
    bgmAudio.volume = bgmVolume;
    bgmAudio.play().catch(() => {});
  }
}

export function pauseBgm() {
  if (bgmAudio && !bgmAudio.paused) {
    bgmAudio.pause();
  }
}

function playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const targetGain = Math.max(0.001, vol * sfxVolume);
    gain.gain.setValueAtTime(targetGain, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('playTone error:', err);
  }
}

export function playBeep() {
  playTone(480, 'sine', 0.08, 0.2);
}

export function playSelect() {
  playTone(650, 'square', 0.09, 0.15);
}

export function playError() {
  playTone(180, 'sawtooth', 0.2, 0.25);
}

export function playShoot() {
  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

    const targetGain = Math.max(0.001, 0.2 * sfxVolume);
    gain.gain.setValueAtTime(targetGain, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (err) {
    console.warn('playShoot error:', err);
  }
}

export function playCapture() {
  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.setValueAtTime(440, now + 0.08);
    osc.frequency.setValueAtTime(554, now + 0.16);
    osc.frequency.setValueAtTime(659, now + 0.24);

    const targetGain = Math.max(0.001, 0.22 * sfxVolume);
    gain.gain.setValueAtTime(targetGain, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (err) {
    console.warn('playCapture error:', err);
  }
}

let bgmFadeInterval: ReturnType<typeof setInterval> | null = null;
export let victoryAudio: HTMLAudioElement | null = null;

export function stopBgm() {
  if (bgmFadeInterval) {
    clearInterval(bgmFadeInterval);
    bgmFadeInterval = null;
  }
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  }
}

export function fadeBgmOut(durationMs: number = 1500) {
  if (bgmFadeInterval) {
    clearInterval(bgmFadeInterval);
    bgmFadeInterval = null;
  }
  if (!bgmAudio) return;
  const startVol = bgmAudio.volume;
  if (startVol <= 0.001) {
    stopBgm();
    return;
  }
  const steps = 25;
  const stepTime = durationMs / steps;
  let currentStep = 0;
  bgmFadeInterval = setInterval(() => {
    currentStep++;
    if (!bgmAudio) {
      if (bgmFadeInterval) clearInterval(bgmFadeInterval);
      return;
    }
    const ratio = Math.max(0, 1 - currentStep / steps);
    bgmAudio.volume = startVol * ratio;
    if (currentStep >= steps) {
      if (bgmFadeInterval) clearInterval(bgmFadeInterval);
      bgmFadeInterval = null;
      bgmAudio.pause();
    }
  }, stepTime);
}

export function restoreBgm() {
  stopVictoryMusic();
  if (bgmFadeInterval) {
    clearInterval(bgmFadeInterval);
    bgmFadeInterval = null;
  }
  if (!bgmAudio) return;
  if (bgmVolume > 0) {
    bgmAudio.volume = bgmVolume;
    if (bgmAudio.paused) {
      bgmAudio.play().catch(() => {});
    }
  }
}

export function stopVictoryMusic() {
  if (victoryAudio) {
    victoryAudio.pause();
    victoryAudio.currentTime = 0;
  }
}

export function playVictoryMusic() {
  // 1. Instantly stop standard background music
  stopBgm();

  if (typeof window === 'undefined') return;

  // 2. Try user's victory music file from public/ (e.g. /victory.mp3 or /win.mp3)
  if (!victoryAudio) {
    victoryAudio = new Audio('/victory.mp3');
  }
  victoryAudio.volume = Math.max(0.2, bgmVolume > 0 ? bgmVolume : 0.4);
  victoryAudio.currentTime = 0;

  const playPromise = victoryAudio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // If /victory.mp3 is not present or failed, try /win.mp3
      const fallbackWin = new Audio('/win.mp3');
      fallbackWin.volume = Math.max(0.2, bgmVolume > 0 ? bgmVolume : 0.4);
      const fallbackPromise = fallbackWin.play();
      if (fallbackPromise !== undefined) {
        fallbackPromise
          .then(() => {
            victoryAudio = fallbackWin;
          })
          .catch(() => {
            // If no custom file in public/ yet, play the grand synthesized Web Audio fanfare
            playVictorySynthFanfare();
          });
      } else {
        playVictorySynthFanfare();
      }
    });
  }
}

export function playVictory() {
  playVictoryMusic();
}

/** Triumphant magical fanfare for successful decrees/prompts — does NOT stop BGM */
export function playDecreeSuccess() {
  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      const vol = Math.max(0.001, 0.18 * sfxVolume);
      gain.gain.setValueAtTime(vol, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  } catch (err) {
    console.warn('playDecreeSuccess error:', err);
  }
}

export function playVictorySynthFanfare() {

  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const playNote = (freq: number, start: number, duration: number, type: OscillatorType = 'triangle', vol: number = 0.25) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);

      const targetGain = Math.max(0.001, vol * sfxVolume);
      gain.gain.setValueAtTime(targetGain, now + start);
      gain.gain.linearRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    };

    // 1. Triumphant Fanfare Arpeggio (C5 -> E5 -> G5 -> C6)
    playNote(523.25, 0.00, 0.16, 'triangle', 0.28);
    playNote(659.25, 0.14, 0.16, 'triangle', 0.28);
    playNote(783.99, 0.28, 0.20, 'triangle', 0.32);
    playNote(1046.50, 0.44, 0.45, 'triangle', 0.38);

    // 2. Brass flourish: G5 -> A5 -> B5
    playNote(783.99, 0.82, 0.12, 'square', 0.18);
    playNote(880.00, 0.94, 0.12, 'square', 0.18);
    playNote(987.77, 1.06, 0.14, 'square', 0.20);

    // 3. Grand Sustained Finale Chord (C Major: C4 + G4 + C5 + E5 + G5 + C6)
    const chordTime = 1.18;
    const chordDur = 1.8;
    playNote(261.63, chordTime, chordDur, 'triangle', 0.26); // C4
    playNote(392.00, chordTime, chordDur, 'triangle', 0.26); // G4
    playNote(523.25, chordTime, chordDur, 'triangle', 0.30); // C5
    playNote(659.25, chordTime, chordDur, 'triangle', 0.30); // E5
    playNote(783.99, chordTime, chordDur, 'triangle', 0.28); // G5
    playNote(1046.50, chordTime, chordDur, 'sine', 0.35);     // C6

    // 4. Shimmering celebration bells
    playNote(1318.51, chordTime + 0.08, 0.7, 'sine', 0.18);
    playNote(1567.98, chordTime + 0.18, 0.7, 'sine', 0.18);
    playNote(2093.00, chordTime + 0.28, 0.9, 'sine', 0.20);
  } catch (err) {
    console.warn('playVictory error:', err);
  }
}

export function playDefeat() {
  fadeBgmOut(1400);

  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const playNote = (freq: number, start: number, duration: number, type: OscillatorType = 'sawtooth', vol: number = 0.2) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);

      const targetGain = Math.max(0.001, vol * sfxVolume);
      gain.gain.setValueAtTime(targetGain, now + start);
      gain.gain.linearRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    };

    // Solemn descending minor notes
    playNote(392.00, 0.00, 0.32, 'triangle', 0.25);
    playNote(349.23, 0.30, 0.32, 'triangle', 0.25);
    playNote(311.13, 0.60, 0.38, 'triangle', 0.25);
    playNote(261.63, 0.95, 0.85, 'sawtooth', 0.20);
  } catch (err) {
    console.warn('playDefeat error:', err);
  }
}

export function playPenalty() {
  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Ominous heavy bass boom
    const oscBass = ctx.createOscillator();
    const gainBass = ctx.createGain();
    oscBass.type = 'sawtooth';
    oscBass.frequency.setValueAtTime(130, now);
    oscBass.frequency.exponentialRampToValueAtTime(50, now + 0.6);

    const bassVol = Math.max(0.001, 0.28 * sfxVolume);
    gainBass.gain.setValueAtTime(bassVol, now);
    gainBass.gain.linearRampToValueAtTime(0.0001, now + 0.65);

    oscBass.connect(gainBass);
    gainBass.connect(ctx.destination);
    oscBass.start(now);
    oscBass.stop(now + 0.65);

    // Eerie descending dissonance
    const notes = [
      { f: 277.18, t: 0.04, d: 0.22 }, // C#4
      { f: 246.94, t: 0.16, d: 0.25 }, // B3
      { f: 196.00, t: 0.30, d: 0.40 }, // G3
      { f: 138.59, t: 0.44, d: 0.55 }, // C#3 (dark tritone drop)
    ];
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      const targetGain = Math.max(0.001, 0.2 * sfxVolume);
      gain.gain.setValueAtTime(targetGain, now + note.t);
      gain.gain.linearRampToValueAtTime(0.0001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d);
    }
  } catch (err) {
    console.warn('playPenalty error:', err);
  }
}

let lastClashTime = 0;
export function playClash() {
  if (sfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  if (now - lastClashTime < 0.14) return; // Throttled to avoid sound clutter
  lastClashTime = now;

  try {
    // High metallic ping 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1850 + Math.random() * 250, now);
    osc1.frequency.exponentialRampToValueAtTime(750, now + 0.08);

    const v1 = Math.max(0.001, 0.16 * sfxVolume);
    gain1.gain.setValueAtTime(v1, now);
    gain1.gain.linearRampToValueAtTime(0.0001, now + 0.08);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Sharp resonant ping 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(2450 + Math.random() * 200, now);
    osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.06);

    const v2 = Math.max(0.001, 0.07 * sfxVolume);
    gain2.gain.setValueAtTime(v2, now);
    gain2.gain.linearRampToValueAtTime(0.0001, now + 0.06);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.06);
  } catch (err) {
    console.warn('playClash error:', err);
  }
}

