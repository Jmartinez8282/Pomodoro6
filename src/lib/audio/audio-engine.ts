/**
 * Synthesized audio. No `.mp3` files anywhere in the repo.
 *
 * Every sound the app makes is generated at runtime from oscillators and noise
 * buffers. That means no asset payload, no licensing question, and ambient
 * tracks that loop seamlessly because they are noise rather than a recording
 * with a seam in it.
 *
 * Two browser realities shape the design:
 *
 * 1. Autoplay policy. An `AudioContext` created before a user gesture starts
 *    `suspended` and stays silent. The context is therefore created lazily on
 *    the first gesture and resumed on every `visibilitychange`.
 *
 * 2. Timer throttling. The completion chime is scheduled on the *audio* clock
 *    (`currentTime + delay`), not with `setTimeout`. The audio clock is not
 *    throttled in background tabs, so the chime lands on time even when the
 *    main thread has been frozen for minutes.
 */
import type { AlarmSoundId, AmbientSoundId } from '@/types';

interface ScheduledAlarm {
  sources: AudioScheduledSourceNode[];
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private scheduledAlarm: ScheduledAlarm | null = null;
  private noiseBuffers = new Map<AmbientSoundId, AudioBuffer>();

  /** Created lazily: constructing a context before a gesture yields a suspended one. */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.context) return this.context;

    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    this.context = new Ctor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.context.destination);
    return this.context;
  }

  /** Call from a user gesture handler. Safe to call repeatedly. */
  async unlock(): Promise<void> {
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        /* the next gesture will try again */
      }
    }
  }

  get isUnlocked(): boolean {
    return this.context?.state === 'running';
  }

  /**
   * Schedule the completion chime at an absolute wall-clock time.
   *
   * Converting to an offset on the audio clock is what makes this survive a
   * backgrounded tab: the browser will not throttle audio playback that has
   * already been scheduled.
   */
  scheduleAlarm(atEpochMs: number, sound: AlarmSoundId, volume: number): void {
    this.cancelAlarm();
    if (sound === 'none' || volume <= 0) return;

    const context = this.ensureContext();
    if (!context || !this.masterGain) return;

    const delaySeconds = Math.max(0, (atEpochMs - Date.now()) / 1000);
    this.scheduledAlarm = {
      sources: this.buildChime(
        context,
        this.masterGain,
        context.currentTime + delaySeconds,
        sound,
        volume,
      ),
    };
  }

  cancelAlarm(): void {
    if (!this.scheduledAlarm) return;
    for (const source of this.scheduledAlarm.sources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.scheduledAlarm = null;
  }

  /** Play the chime immediately — the fallback when scheduling was not possible. */
  playAlarm(sound: AlarmSoundId, volume: number): void {
    if (sound === 'none' || volume <= 0) return;
    const context = this.ensureContext();
    if (!context || !this.masterGain) return;
    this.buildChime(context, this.masterGain, context.currentTime + 0.01, sound, volume);
  }

  /**
   * A short arpeggio of sine partials through a percussive envelope.
   *
   * The envelope matters more than the pitches: a raw oscillator switched on
   * and off produces an audible click at both ends, because the waveform jumps
   * discontinuously. Ramping the gain removes it.
   */
  private buildChime(
    context: AudioContext,
    destination: GainNode,
    startAt: number,
    sound: Exclude<AlarmSoundId, 'none'>,
    volume: number,
  ): AudioScheduledSourceNode[] {
    const voices: Record<
      Exclude<AlarmSoundId, 'none'>,
      { freqs: number[]; decay: number; type: OscillatorType }
    > = {
      chime: { freqs: [880, 1108.73, 1318.51], decay: 1.6, type: 'sine' },
      bell: { freqs: [523.25, 1046.5, 1567.98], decay: 2.4, type: 'sine' },
      marimba: { freqs: [659.25, 987.77], decay: 0.9, type: 'triangle' },
    };

    const voice = voices[sound];
    const sources: AudioScheduledSourceNode[] = [];

    voice.freqs.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const onset = startAt + index * 0.12;
      const peak = (volume * 0.5) / (index + 1);

      oscillator.type = voice.type;
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.0001, onset);
      gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), onset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, onset + voice.decay);

      oscillator.connect(gain);
      gain.connect(destination);
      oscillator.start(onset);
      oscillator.stop(onset + voice.decay + 0.05);
      sources.push(oscillator);
    });

    return sources;
  }

  /**
   * Ambient loops, generated once and cached.
   *
   * Brown noise (a random walk) sounds like rain; band-passed pink-ish noise
   * reads as room tone. A generated buffer loops without a seam, which a
   * recorded loop cannot do without careful crossfading.
   */
  private getNoiseBuffer(context: AudioContext, kind: AmbientSoundId): AudioBuffer | null {
    if (kind === 'none') return null;
    const cached = this.noiseBuffers.get(kind);
    if (cached) return cached;

    const seconds = 4;
    const length = context.sampleRate * seconds;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);

    if (kind === 'brownNoise' || kind === 'rain') {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    } else {
      // A simple pink-ish approximation: cheaper than a proper filter bank and
      // indistinguishable once it is sitting under a work session.
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57555 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.15;
      }
    }

    // Smooth the wrap point so the loop has no audible click at the seam.
    const fade = Math.floor(context.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const factor = i / fade;
      data[i] = (data[i] ?? 0) * factor;
      data[length - 1 - i] = (data[length - 1 - i] ?? 0) * factor;
    }

    this.noiseBuffers.set(kind, buffer);
    return buffer;
  }

  setAmbient(kind: AmbientSoundId, volume: number): void {
    const context = this.ensureContext();
    if (!context || !this.masterGain) return;

    if (kind === 'none' || volume <= 0) {
      this.stopAmbient();
      return;
    }

    if (this.ambientNodes) {
      // Already playing: just ride the gain rather than restarting the source,
      // which would produce an audible discontinuity.
      this.ambientNodes.gain.gain.linearRampToValueAtTime(volume * 0.3, context.currentTime + 0.3);
      return;
    }

    const buffer = this.getNoiseBuffer(context, kind);
    if (!buffer) return;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = context.createBiquadFilter();
    if (kind === 'rain') {
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
    } else if (kind === 'cafe') {
      filter.type = 'bandpass';
      filter.frequency.value = 700;
      filter.Q.value = 0.6;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 900;
    }

    const gain = context.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(volume * 0.3, context.currentTime + 0.8);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this.ambientNodes = { source, gain };
  }

  stopAmbient(): void {
    if (!this.ambientNodes || !this.context) return;
    const { source, gain } = this.ambientNodes;
    const stopAt = this.context.currentTime + 0.4;
    // Fade out rather than cutting: an abrupt stop on a noise loop is a pop.
    gain.gain.linearRampToValueAtTime(0.0001, stopAt);
    try {
      source.stop(stopAt + 0.05);
    } catch {
      /* already stopped */
    }
    this.ambientNodes = null;
  }

  dispose(): void {
    this.cancelAlarm();
    this.stopAmbient();
    void this.context?.close();
    this.context = null;
    this.masterGain = null;
    this.noiseBuffers.clear();
  }
}

let engine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  engine ??= new AudioEngine();
  return engine;
}
