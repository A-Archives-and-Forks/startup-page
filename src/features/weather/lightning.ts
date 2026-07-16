/**
 * Deterministic lightning schedule shared by the bolt canvas (WeatherEffects) and the
 * volumetric cloud shader (u_flash uniform). Both derive the same strike timing from
 * wall-clock time, so the bolt, the screen flash, and the in-cloud illumination all
 * fire together without any cross-component state.
 */

export interface FlashEvent {
  /** Unique id per strike — reseed bolt geometry when this changes */
  seed: number;
  /** Milliseconds since the strike began */
  t: number;
  /** Total strike duration in ms (includes return-stroke flickers) */
  duration: number;
  /** Horizontal position of the strike 0-1 */
  x: number;
  /** Cloud-to-ground bolt, or diffuse intra-cloud sheet flash */
  type: "bolt" | "sheet";
}

export function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Mulberry32 PRNG for stable per-strike bolt geometry */
export function makeRng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getFlashEvent(nowMs: number, intensity: number): FlashEvent | null {
  if (intensity <= 0) return null;
  // Higher intensity → shorter cycles → more frequent strikes
  const cycle = 5600 / (0.5 + intensity * 1.1);
  const idx = Math.floor(nowMs / cycle);
  // Not every cycle produces a strike
  if (hash01(idx) > 0.3 + intensity * 0.55) return null;
  const duration = 380 + hash01(idx + 0.61) * 420;
  const offset = hash01(idx + 0.37) * Math.max(0, cycle - duration - 120);
  const t = nowMs - idx * cycle - offset;
  if (t < 0 || t > duration) return null;
  return {
    seed: idx,
    t,
    duration,
    x: 0.1 + hash01(idx + 0.83) * 0.8,
    type: hash01(idx + 0.19) < 0.4 + intensity * 0.3 ? "bolt" : "sheet",
  };
}

/**
 * Flash brightness envelope 0-1 at a given wall-clock time. Real strikes flicker:
 * an intense leader/return stroke followed by 1-3 weaker re-strikes.
 */
export function getFlashEnvelope(nowMs: number, intensity: number): number {
  const ev = getFlashEvent(nowMs, intensity);
  if (!ev) return 0;
  const strokes = 2 + Math.floor(hash01(ev.seed + 0.42) * 3);
  let envelope = 0;
  for (let i = 0; i < strokes; i++) {
    const at = (i / strokes) * ev.duration * 0.72 + hash01(ev.seed + i * 1.7) * 55;
    const amp = i === 0 ? 1 : 0.4 + hash01(ev.seed + i + 0.5) * 0.5;
    const width = i === 0 ? 60 : 42;
    const d = ev.t - at;
    envelope = Math.max(envelope, amp * Math.exp(-(d * d) / (2 * width * width)));
  }
  const typeScale = ev.type === "sheet" ? 0.5 : 1;
  return Math.min(1, envelope * (0.55 + intensity * 0.55)) * typeScale;
}
