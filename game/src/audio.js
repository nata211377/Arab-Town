// Every sound in Arab Town is synthesized with WebAudio: no audio files, no network,
// just oscillators and filtered noise shaped into an engine hum, a siren, gunshots,
// coins, crashes and footsteps. The audio context starts on the first key or click,
// as browsers require, and a mute key (M) silences it.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  /** A short tone that slides from one frequency to another. */
  function tone(freqFrom, freqTo, seconds, type, volume, when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  /** A burst of filtered noise, for shots, crashes and footsteps. */
  function noise(seconds, filterFreq, volume, type = 'lowpass', when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  function startEngine() {
    if (!ensure() || muted || engineOsc) return;
    engineOsc = context.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = context.createGain();
    engineGain.gain.value = 0.0;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  function stopEngine() {
    if (!engineOsc) return;
    try {
      engineGain.gain.setTargetAtTime(0, context.currentTime, 0.05);
      const osc = engineOsc;
      window.setTimeout(() => {
        try { osc.stop(); } catch { /* already stopped */ }
      }, 300);
    } catch { /* context gone */ }
    engineOsc = null;
    engineGain = null;
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (muted) {
        stopEngine();
        this.stopSiren();
      }
      return muted;
    },

    click() { tone(660, 520, 0.07, 'square', 0.12); },
    coin() { tone(880, 880, 0.08, 'sine', 0.2); tone(1320, 1320, 0.14, 'sine', 0.18, 0.08); },
    pickup() { tone(520, 780, 0.12, 'triangle', 0.2); },
    crash() { noise(0.25, 300, 0.5); tone(120, 45, 0.25, 'sine', 0.4); },
    punch() { noise(0.08, 900, 0.3); },
    gunshot() { noise(0.14, 2600, 0.55, 'highpass'); tone(220, 60, 0.1, 'square', 0.25); },
    enemyShot() { noise(0.12, 2000, 0.3, 'highpass'); },
    mission() { tone(523, 523, 0.12, 'triangle', 0.22); tone(659, 659, 0.12, 'triangle', 0.22, 0.12); tone(784, 784, 0.22, 'triangle', 0.22, 0.24); },
    fail() { tone(392, 392, 0.16, 'triangle', 0.2); tone(311, 311, 0.3, 'triangle', 0.2, 0.16); },
    wanted() { tone(220, 220, 0.14, 'square', 0.16); tone(220, 220, 0.14, 'square', 0.16, 0.18); },
    busted() { tone(330, 165, 0.5, 'sawtooth', 0.2); },
    step() { noise(0.04, 500, 0.06); },
    door() { noise(0.1, 700, 0.2); tone(180, 120, 0.1, 'sine', 0.15); },

    /** The engine note follows speed: call every frame while driving. */
    engine(speed, maxSpeed) {
      if (muted) { stopEngine(); return; }
      if (!engineOsc) startEngine();
      if (!engineOsc) return;
      const ratio = Math.min(1, Math.abs(speed) / maxSpeed);
      engineOsc.frequency.setTargetAtTime(50 + ratio * 130, context.currentTime, 0.05);
      engineGain.gain.setTargetAtTime(0.02 + ratio * 0.06, context.currentTime, 0.08);
    },
    engineOff() { stopEngine(); },

    /** The police siren: two alternating tones while any police car is near. */
    siren(on) {
      if (!on) { this.stopSiren(); return; }
      if (!ensure() || muted) return;
      if (!sirenOsc) {
        sirenOsc = context.createOscillator();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 700;
        sirenGain = context.createGain();
        sirenGain.gain.value = 0.05;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        sirenTimer = 0;
        sirenHigh = true;
      }
    },
    updateSiren(dt) {
      if (!sirenOsc) return;
      sirenTimer += dt;
      if (sirenTimer > 0.42) {
        sirenTimer = 0;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setTargetAtTime(sirenHigh ? 700 : 950, context.currentTime, 0.02);
      }
    },
    stopSiren() {
      if (!sirenOsc) return;
      try { sirenOsc.stop(); } catch { /* already stopped */ }
      sirenOsc = null;
      sirenGain = null;
    },
  };
}
