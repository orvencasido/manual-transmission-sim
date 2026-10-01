/**
 * Procedural Engine & Powertrain Audio System
 * Manual Driving Trainer — Phase 9
 *
 * Implements real-time procedural powertrain audio synthesis using native Web Audio API:
 * - 4-cylinder 4-stroke engine firing frequency oscillator stack & harmonic overtones.
 * - Non-linear wave-shaping distortion (exhaust rasp/throatiness under load).
 * - Dynamic low-pass filtering modulated by engine load and throttle opening.
 * - Rhythmic starter motor cranking sound with compression stroke modulation.
 * - Procedural one-shot gear shifter gate mechanical click (detent double-click).
 * - Procedural one-shot engine stall thud/cutoff.
 * - Graceful autoplay policy handling and clean resource lifecycle.
 */

import type { VehicleState } from '../simulation/types';

/**
 * Generate a soft-clipping saturation transfer curve (tanh-like) for the WaveShaperNode.
 */
function makeDistortionCurve(nSamples = 512): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(nSamples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < nSamples; i++) {
    const x = (i * 2) / (nSamples - 1) - 1; // [-1.0, 1.0]
    // Soft hyperbolic tangent curve for realistic internal combustion saturation
    curve[i] = Math.tanh(1.6 * x);
  }
  return curve;
}

export class EngineAudioSystem {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private _isMuted = false;

  // Master output bus & dynamics compressor
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;

  // Engine core synthesis graph
  private oscCrank: OscillatorNode | null = null;
  private gainCrank: GainNode | null = null;
  private oscFundamental: OscillatorNode | null = null;
  private gainFundamental: GainNode | null = null;
  private oscHarmonic2: OscillatorNode | null = null;
  private gainHarmonic2: GainNode | null = null;
  private oscHarmonic3: OscillatorNode | null = null;
  private gainHarmonic3: GainNode | null = null;

  private engineDriveGain: GainNode | null = null;
  private engineShaper: WaveShaperNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Starter motor synthesis graph
  private starterOsc: OscillatorNode | null = null;
  private starterLfo: OscillatorNode | null = null;
  private starterLfoGain: GainNode | null = null;
  private starterFilter: BiquadFilterNode | null = null;
  private starterGain: GainNode | null = null;

  // State change tracking for auxiliary SFX triggering
  private lastStatus: string | null = null;
  private lastGear: number | null = null;

  /**
   * Initialize Web Audio API context and procedural synthesis graph.
   * Safe to call multiple times or during user interaction.
   */
  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        console.warn('[EngineAudioSystem] Web Audio API is not supported in this environment.');
        return;
      }

      this.ctx = new AudioContextClass();
      this.buildGraph();

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('[EngineAudioSystem] Initialization failed:', err);
    }
  }

  /**
   * Resume suspended AudioContext (typically triggered on initial user gesture).
   */
  public async resume(): Promise<void> {
    if (!this.ctx) {
      await this.init();
      return;
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Build the complete Web Audio synthesis graph.
   */
  private buildGraph(): void {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Master Output Limiter / Compressor (prevents digital clipping across concurrent SFX)
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-4, now);
    this.compressor.knee.setValueAtTime(6, now);
    this.compressor.ratio.setValueAtTime(16, now);
    this.compressor.attack.setValueAtTime(0.003, now);
    this.compressor.release.setValueAtTime(0.1, now);
    this.compressor.connect(this.ctx.destination);

    // 2. Master Gain Bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this._isMuted ? 0.0 : 1.0, now);
    this.masterGain.connect(this.compressor);

    // 3. Auxiliary SFX Bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.75, now);
    this.sfxGain.connect(this.masterGain);

    // 4. Engine Synthesis Chain
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, now);
    this.engineGain.connect(this.masterGain);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(320, now);
    this.engineFilter.Q.setValueAtTime(1.0, now);
    this.engineFilter.connect(this.engineGain);

    this.engineShaper = this.ctx.createWaveShaper();
    this.engineShaper.curve = makeDistortionCurve(512);
    this.engineShaper.oversample = '2x';
    this.engineShaper.connect(this.engineFilter);

    this.engineDriveGain = this.ctx.createGain();
    this.engineDriveGain.gain.setValueAtTime(1.0, now);
    this.engineDriveGain.connect(this.engineShaper);

    // Engine Harmonic Oscillators
    // Crank Subharmonic (0.5x firing frequency - crankshaft mechanical thrum)
    this.oscCrank = this.ctx.createOscillator();
    this.oscCrank.type = 'triangle';
    this.oscCrank.frequency.setValueAtTime(14, now);
    this.gainCrank = this.ctx.createGain();
    this.gainCrank.gain.setValueAtTime(0.32, now);
    this.oscCrank.connect(this.gainCrank);
    this.gainCrank.connect(this.engineDriveGain);

    // Fundamental Firing Pulses (1.0x firing frequency)
    this.oscFundamental = this.ctx.createOscillator();
    this.oscFundamental.type = 'sawtooth';
    this.oscFundamental.frequency.setValueAtTime(28, now);
    this.gainFundamental = this.ctx.createGain();
    this.gainFundamental.gain.setValueAtTime(0.42, now);
    this.oscFundamental.connect(this.gainFundamental);
    this.gainFundamental.connect(this.engineDriveGain);

    // 2nd Harmonic (2.0x firing frequency - exhaust pulsation)
    this.oscHarmonic2 = this.ctx.createOscillator();
    this.oscHarmonic2.type = 'sawtooth';
    this.oscHarmonic2.frequency.setValueAtTime(56, now);
    this.gainHarmonic2 = this.ctx.createGain();
    this.gainHarmonic2.gain.setValueAtTime(0.24, now);
    this.oscHarmonic2.connect(this.gainHarmonic2);
    this.gainHarmonic2.connect(this.engineDriveGain);

    // 3rd Harmonic (3.0x firing frequency with slight detune for combustion chorus/growl)
    this.oscHarmonic3 = this.ctx.createOscillator();
    this.oscHarmonic3.type = 'triangle';
    this.oscHarmonic3.frequency.setValueAtTime(84, now);
    this.oscHarmonic3.detune.setValueAtTime(5, now);
    this.gainHarmonic3 = this.ctx.createGain();
    this.gainHarmonic3.gain.setValueAtTime(0.14, now);
    this.oscHarmonic3.connect(this.gainHarmonic3);
    this.gainHarmonic3.connect(this.engineDriveGain);

    // Start continuous engine oscillators
    this.oscCrank.start(now);
    this.oscFundamental.start(now);
    this.oscHarmonic2.start(now);
    this.oscHarmonic3.start(now);

    // 5. Starter Motor Synthesis Chain
    this.starterGain = this.ctx.createGain();
    this.starterGain.gain.setValueAtTime(0.0, now);
    this.starterGain.connect(this.masterGain);

    this.starterFilter = this.ctx.createBiquadFilter();
    this.starterFilter.type = 'bandpass';
    this.starterFilter.frequency.setValueAtTime(700, now);
    this.starterFilter.Q.setValueAtTime(2.2, now);
    this.starterFilter.connect(this.starterGain);

    this.starterOsc = this.ctx.createOscillator();
    this.starterOsc.type = 'sawtooth';
    this.starterOsc.frequency.setValueAtTime(105, now);
    this.starterOsc.connect(this.starterFilter);

    // Compression Stroke LFO (simulates starter motor struggling against compression strokes at ~250 RPM)
    this.starterLfo = this.ctx.createOscillator();
    this.starterLfo.type = 'sine';
    this.starterLfo.frequency.setValueAtTime(8.5, now); // ~8.5 Hz compression pulses
    this.starterLfoGain = this.ctx.createGain();
    this.starterLfoGain.gain.setValueAtTime(28, now);
    this.starterLfo.connect(this.starterLfoGain);
    this.starterLfoGain.connect(this.starterOsc.frequency);

    this.starterOsc.start(now);
    this.starterLfo.start(now);
  }

  /**
   * Main per-frame update method.
   * Modulates oscillator frequencies, filter cutoffs, distortion drive, and auxiliary sounds.
   * Supports both `update(state: VehicleState)` and legacy/debug `update(rpm, throttle, load)`.
   */
  public update(state: VehicleState): void;
  public update(rpm: number, throttle?: number, load?: number): void;
  public update(rpmOrState: VehicleState | number, throttleInput?: number, loadInput?: number): void {
    if (!this.isInitialized || !this.ctx) return;

    let rpm = 0;
    let throttle = 0;
    let load = 0;
    let status: 'OFF' | 'STARTING' | 'RUNNING' | 'STALLED' = 'OFF';
    let isStarterEngaged = false;
    let currentGear: number | null = null;

    if (typeof rpmOrState === 'number') {
      rpm = rpmOrState;
      throttle = throttleInput ?? 0;
      load = loadInput ?? throttle;
      status = rpm > 320 ? 'RUNNING' : 'OFF';
    } else if (rpmOrState && typeof rpmOrState === 'object') {
      const state = rpmOrState;
      rpm = state.engine?.rpm ?? 0;

      // Extract engine status / state
      const engRecord = state.engine as unknown as Record<string, unknown> | undefined;
      const rawStatus = (engRecord?.state ?? state.engine?.status) as string | undefined;

      if (rawStatus === 'RUNNING' || rawStatus === 'STARTING' || rawStatus === 'STALLED' || rawStatus === 'OFF') {
        status = rawStatus;
      } else if (rpm > 350) {
        status = 'RUNNING';
      } else {
        status = 'OFF';
      }

      // Starter engagement from controls or engine
      isStarterEngaged = Boolean(
        state.controls?.isStarterEngaged ||
        engRecord?.isStarterEngaged ||
        status === 'STARTING'
      );

      throttle = state.controls?.throttle ?? 0;

      // Engine load
      if (typeof engRecord?.load === 'number' && Number.isFinite(engRecord.load)) {
        load = engRecord.load;
      } else {
        const slipTorque = Math.abs(state.clutch?.slipTorque ?? 0);
        const clutchLoad = Math.min(1.0, slipTorque / 160);
        load = Math.min(1.0, Math.max(0.0, throttle * 0.65 + clutchLoad * 0.35));
      }

      currentGear = state.transmission?.currentGear ?? null;
    }

    // Auto-resume AudioContext if suspended upon detected user interaction
    if (this.ctx.state === 'suspended' && (throttle > 0.05 || isStarterEngaged || currentGear !== null)) {
      this.ctx.resume().catch(() => {});
    }

    // Sanitize values to guard against NaN, Infinity, or negative numbers
    const safeRpm = Number.isFinite(rpm) ? Math.max(0, Math.min(10000, rpm)) : 0;
    const safeThrottle = Number.isFinite(throttle) ? Math.max(0, Math.min(1.0, throttle)) : 0;
    const safeLoad = Number.isFinite(load) ? Math.max(0, Math.min(1.0, load)) : 0;

    // Detect state transitions for auxiliary SFX
    this.handleStateTransitions(status, currentGear);

    // Update real-time audio parameters
    this.updateAudioParameters(safeRpm, safeThrottle, safeLoad, status, isStarterEngaged);
  }

  /**
   * Monitor engine state and transmission gear shifts to trigger one-shot SFX.
   */
  private handleStateTransitions(
    status: 'OFF' | 'STARTING' | 'RUNNING' | 'STALLED',
    currentGear: number | null
  ): void {
    // 1. Engine stall detection (RUNNING -> STALLED)
    if (this.lastStatus === 'RUNNING' && status === 'STALLED') {
      this.playStallSound();
    }

    // 2. Gear shifter gate click detection
    if (this.lastGear !== null && currentGear !== null && this.lastGear !== currentGear) {
      this.playGearShiftSound();
    }

    this.lastStatus = status;
    if (currentGear !== null) {
      this.lastGear = currentGear;
    }
  }

  /**
   * Schedule smooth audio parameter transitions to completely prevent audio clicks or pops.
   */
  private updateAudioParameters(
    rpm: number,
    throttle: number,
    load: number,
    status: 'OFF' | 'STARTING' | 'RUNNING' | 'STALLED',
    isStarterEngaged: boolean
  ): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const isRunning = status === 'RUNNING';

    // 1. Core Engine Synthesis
    if (isRunning) {
      // 4-cylinder 4-stroke firing frequency: f_firing = (RPM / 60) * (4 / 2) = RPM / 30 Hz
      const f0 = Math.max(12, rpm / 30);

      // Modulate oscillator pitches
      if (this.oscCrank) this.oscCrank.frequency.setTargetAtTime(f0 * 0.5, now, 0.035);
      if (this.oscFundamental) this.oscFundamental.frequency.setTargetAtTime(f0 * 1.0, now, 0.035);
      if (this.oscHarmonic2) this.oscHarmonic2.frequency.setTargetAtTime(f0 * 2.0, now, 0.035);
      if (this.oscHarmonic3) this.oscHarmonic3.frequency.setTargetAtTime(f0 * 3.0, now, 0.035);

      // Low-pass filter: muffled at idle/closed throttle, opens up brightly under acceleration
      // Idle cutoff ~320 Hz, rises up to ~3800 Hz under high RPM & wide-open throttle
      const targetCutoff = Math.min(
        6000,
        Math.max(220, 300 + (rpm / 7000) * 1200 + (throttle * 0.65 + load * 0.35) * 2300)
      );
      if (this.engineFilter) {
        this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.04);
        // Resonance (Q) increases under load for throatier growl
        const targetQ = 1.0 + (throttle * 0.7 + load * 0.3) * 2.8;
        this.engineFilter.Q.setTargetAtTime(targetQ, now, 0.04);
      }

      // Distortion Drive: increases under load to drive wave-shaper into harmonic saturation
      const targetDrive = 0.75 + (throttle * 0.7 + load * 0.5) * 1.3;
      if (this.engineDriveGain) {
        this.engineDriveGain.gain.setTargetAtTime(targetDrive, now, 0.04);
      }

      // Master Engine Gain: scales smoothly with RPM and throttle punch
      const targetEngineGain = Math.min(0.65, 0.22 + (rpm / 7000) * 0.28 + throttle * 0.12);
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(targetEngineGain, now, 0.035);
      }
    } else {
      // Engine not running: fade out engine core sound smoothly
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0.0, now, 0.025);
      }
    }

    // 2. Starter Motor Cranking Sound
    const isCranking = (status === 'STARTING' || isStarterEngaged) && status !== 'RUNNING';
    if (this.starterGain) {
      if (isCranking) {
        this.starterGain.gain.setTargetAtTime(0.35, now, 0.04);
        if (this.starterOsc) {
          this.starterOsc.frequency.setTargetAtTime(105, now, 0.08);
        }
      } else {
        this.starterGain.gain.setTargetAtTime(0.0, now, 0.03);
      }
    }
  }

  /**
   * Procedural One-Shot: Gear shifter gate mechanical click.
   * Synthesizes a realistic double-click detent gate sound (disengage + dog teeth engage).
   */
  private playGearShiftSound(): void {
    if (!this.ctx || this._isMuted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // Click 1: Gate detent release / disengagement
    this.triggerMechanicalClick(now, 2200, 0.18, 0.018);

    // Click 2: Gate detent engagement / dog teeth lock (~48ms later)
    this.triggerMechanicalClick(now + 0.048, 1750, 0.22, 0.022);
  }

  /**
   * Synthesizes a short mechanical resonant click pulse.
   */
  private triggerMechanicalClick(time: number, freq: number, volume: number, duration: number): void {
    if (!this.ctx || !this.sfxGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.setTargetAtTime(freq * 0.35, time, duration * 0.35);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, time);
      filter.Q.setValueAtTime(4.5, time);

      gain.gain.setValueAtTime(volume, time);
      gain.gain.setTargetAtTime(0.0, time, duration * 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(time);
      osc.stop(time + duration);

      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // Ignore cleanup errors
        }
      };
    } catch {
      // Audio is secondary: prevent any SFX error from interrupting simulation
    }
  }

  /**
   * Procedural One-Shot: Engine stall sound effect.
   * Plays a quick mechanical thud and pitch drop when combustion ceases abruptly.
   */
  private playStallSound(): void {
    if (!this.ctx || this._isMuted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const duration = 0.32;

    try {
      // 1. Low frequency mechanical shudder / inertia pitch drop
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.setTargetAtTime(18, now, duration * 0.3);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);
      filter.frequency.setTargetAtTime(50, now, duration * 0.3);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.setTargetAtTime(0.0, now, duration * 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain ?? this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);

      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // Ignore cleanup errors
        }
      };

      // 2. Sudden mechanical shudder click
      this.triggerMechanicalClick(now, 620, 0.32, 0.04);
    } catch {
      // Secondary priority: ignore errors
    }
  }

  /**
   * Set global mute state for vehicle audio.
   */
  public setMuted(muted: boolean): void {
    if (this._isMuted === muted) return;
    this._isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(muted ? 0.0 : 1.0, now, 0.03);
    }
  }

  /**
   * Return whether audio is currently muted.
   */
  public isMutedState(): boolean {
    return this._isMuted;
  }

  /**
   * Convenience alias for isMutedState().
   */
  public isMuted(): boolean {
    return this._isMuted;
  }

  /**
   * Clean up all audio nodes and close AudioContext.
   */
  public destroy(): void {
    this.isInitialized = false;

    const stopAndDisconnect = (node: AudioNode | null) => {
      if (!node) return;
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore errors if already stopped or disconnected
      }
    };

    stopAndDisconnect(this.oscCrank);
    stopAndDisconnect(this.gainCrank);
    stopAndDisconnect(this.oscFundamental);
    stopAndDisconnect(this.gainFundamental);
    stopAndDisconnect(this.oscHarmonic2);
    stopAndDisconnect(this.gainHarmonic2);
    stopAndDisconnect(this.oscHarmonic3);
    stopAndDisconnect(this.gainHarmonic3);

    stopAndDisconnect(this.engineDriveGain);
    stopAndDisconnect(this.engineShaper);
    stopAndDisconnect(this.engineFilter);
    stopAndDisconnect(this.engineGain);

    stopAndDisconnect(this.starterLfo);
    stopAndDisconnect(this.starterLfoGain);
    stopAndDisconnect(this.starterOsc);
    stopAndDisconnect(this.starterFilter);
    stopAndDisconnect(this.starterGain);

    stopAndDisconnect(this.sfxGain);
    stopAndDisconnect(this.masterGain);
    stopAndDisconnect(this.compressor);

    this.oscCrank = null;
    this.gainCrank = null;
    this.oscFundamental = null;
    this.gainFundamental = null;
    this.oscHarmonic2 = null;
    this.gainHarmonic2 = null;
    this.oscHarmonic3 = null;
    this.gainHarmonic3 = null;

    this.engineDriveGain = null;
    this.engineShaper = null;
    this.engineFilter = null;
    this.engineGain = null;

    this.starterLfo = null;
    this.starterLfoGain = null;
    this.starterOsc = null;
    this.starterFilter = null;
    this.starterGain = null;

    this.sfxGain = null;
    this.masterGain = null;
    this.compressor = null;

    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}
