import confetti from "canvas-confetti";

/**
 * Synthesizes a clean, pleasant celebration chime using native Web Audio API.
 * No external audio files or network requests required.
 */
export function playCelebrationChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // 4 ascending harmonic notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      // Envelope: quick attack, smooth exponential decay
      const noteStart = now + index * 0.08;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.4);
    });
  } catch (err) {
    // Ignore audio permission or autoplay policy errors silently
    console.warn("Celebration chime not supported or muted:", err);
  }
}

/**
 * Synthesizes a high-resonance "shield activation" chime for the Discipline Shield badge.
 */
export function playShieldChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major triumphant chord

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + index * 0.05);

      const noteStart = now + index * 0.05;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.55);
    });
  } catch {
    // Ignore
  }
}

/**
 * Fires a dual-corner or centered particle celebration burst.
 */
export function fireConfettiBurst(accentHex = "#22d3ee"): void {
  try {
    // Left cannon
    confetti({
      particleCount: 45,
      angle: 60,
      spread: 55,
      origin: { x: 0.1, y: 0.8 },
      colors: [accentHex, "#f59e0b", "#10b981", "#38bdf8", "#ec4899"],
      disableForReducedMotion: true,
      zIndex: 9999,
    });

    // Right cannon
    confetti({
      particleCount: 45,
      angle: 120,
      spread: 55,
      origin: { x: 0.9, y: 0.8 },
      colors: [accentHex, "#f59e0b", "#10b981", "#38bdf8", "#ec4899"],
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  } catch (err) {
    console.warn("Confetti effect failed:", err);
  }
}

/**
 * Combined celebration for streak milestones (3-day, 7-day, etc.)
 */
export function celebrateStreakMilestone(streakDays: number, accentHex = "#22d3ee"): void {
  playCelebrationChime();
  fireConfettiBurst(accentHex);
}

/**
 * Combined celebration for Discipline Shield (spend < 50% daily limit)
 */
export function celebrateDisciplineShield(accentHex = "#10b981"): void {
  playShieldChime();
  fireConfettiBurst(accentHex);
}

/**
 * 1. Crisp tech 'chirp' on Quick-Add pill taps & expense logging
 */
export function playQuickAddChirp(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.065);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // Ignore audio errors
  }
}

/**
 * 2. Heavy low-frequency 'thud' on Emergency Lockdown activation
 */
export function playLockdownThud(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Sub-bass impact oscillator
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(145, now);
    subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.32);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.35, now + 0.018);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.38);

    // Metallic lock click harmonic
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = "sawtooth";
    clickOsc.frequency.setValueAtTime(320, now);
    clickOsc.frequency.exponentialRampToValueAtTime(95, now + 0.09);

    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.11);
  } catch {
    // Ignore audio errors
  }
}

/**
 * 3. Cash register / coin drop chime when settling a debt in Khata
 */
export function playCashRegisterChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Classic "Ka-Ching" coin drop intervals: B5 (987.77 Hz) -> E6 (1318.51 Hz) with metallic overtone
    const bellNotes = [
      { freq: 987.77, delay: 0, duration: 0.12, vol: 0.16 },
      { freq: 1318.51, delay: 0.075, duration: 0.42, vol: 0.2 },
      { freq: 2637.02, delay: 0.075, duration: 0.28, vol: 0.08 },
    ];

    bellNotes.forEach(({ freq, delay, duration, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);

      const start = now + delay;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  } catch {
    // Ignore audio errors
  }
}

/**
 * 4. High-frequency dual-tone luxury vault chime when toggling PRO Black Edition features
 */
export function playProVaultChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // High-frequency dual tone: D6 (1174.66 Hz) -> A6 (1760.00 Hz)
    const dualTones = [
      { freq: 1174.66, delay: 0, duration: 0.14, vol: 0.14 },
      { freq: 1760.0, delay: 0.07, duration: 0.28, vol: 0.16 },
    ];

    dualTones.forEach(({ freq, delay, duration, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);

      const start = now + delay;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  } catch {
    // Ignore audio errors
  }
}

/**
 * 5. High-tech Iron Man Armor / Arc Reactor Boot Sound (power surge 200Hz -> 1200Hz)
 */
export function playArmorBootSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Primary turbine power surge: 200Hz -> 1200Hz
    const surgeOsc = ctx.createOscillator();
    const surgeGain = ctx.createGain();
    surgeOsc.type = "sawtooth";
    surgeOsc.frequency.setValueAtTime(200, now);
    surgeOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.34);

    surgeGain.gain.setValueAtTime(0.001, now);
    surgeGain.gain.linearRampToValueAtTime(0.16, now + 0.08);
    surgeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    surgeOsc.connect(surgeGain);
    surgeGain.connect(ctx.destination);
    surgeOsc.start(now);
    surgeOsc.stop(now + 0.4);

    // Pure sine harmonic core resonance: 200Hz -> 1200Hz
    const coreOsc = ctx.createOscillator();
    const coreGain = ctx.createGain();
    coreOsc.type = "sine";
    coreOsc.frequency.setValueAtTime(200, now);
    coreOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.32);

    coreGain.gain.setValueAtTime(0.001, now);
    coreGain.gain.linearRampToValueAtTime(0.22, now + 0.12);
    coreGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    coreOsc.connect(coreGain);
    coreGain.connect(ctx.destination);
    coreOsc.start(now);
    coreOsc.stop(now + 0.44);
  } catch {
    // Ignore audio errors
  }
}

/**
 * 6. Crisp Cyber Roulette Tick for the Stark Reward Vault Wheel
 */
export function playRouletteTick(pitchMultiplier = 1): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(620 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(1180 * pitchMultiplier, now + 0.035);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // Ignore audio errors
  }
}

/**
 * 7. Micro Sound Chime for "Late Night Cravings Shield" (10:00 PM - 4:00 AM Midnight Impulse Alert)
 */
export function playMidnightCravingsChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Midnight radar double-ping + descending caution harmonic
    const tones = [
      { freq: 1046.5, delay: 0, duration: 0.11, type: "sine" as OscillatorType, vol: 0.16 },
      { freq: 1318.5, delay: 0.11, duration: 0.12, type: "sine" as OscillatorType, vol: 0.18 },
      { freq: 587.33, delay: 0.24, duration: 0.32, type: "triangle" as OscillatorType, vol: 0.15 },
    ];

    tones.forEach(({ freq, delay, duration, type, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delay);

      const start = now + delay;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  } catch {
    // Ignore audio errors
  }
}




