/**
 * Builds `assets/sounds/rest-done.wav`, the bell rung when a rest ends.
 *
 * The sound is synthesised instead of shipped as a downloaded clip so it stays
 * licence-free and reproducible. A bell is a struck metal body, so it is not a
 * tone with harmonics: its partials sit at ratios that no single fundamental
 * explains, and the high ones die away first. Those two traits are what make it
 * read as a bell rather than as a beep, so both are written out below.
 *
 * The partials are kept above 800 Hz, where a phone speaker still moves enough
 * air to be heard across a gym.
 *
 * Run with `npm run build:sounds`.
 */
import { writeFileSync } from 'node:fs';

const OUTPUT = new URL('../assets/sounds/rest-done.wav', import.meta.url);

const SAMPLE_RATE = 44100;
const DURATION_S = 1.2;

/** Pitch of the prime partial, the note the bell is heard as. */
const PRIME_HZ = 880;

/**
 * The bell's partials, after the ratios of a tuned bell: hum, prime, tierce,
 * quint and nominal, then the struck-metal shimmer on top. `decayS` is the time
 * each one takes to fall to about a third of its level, short for the high
 * partials so the strike is bright and the tail is dark.
 */
const PARTIALS = [
  { ratio: 0.5, amplitude: 0.2, decayS: 0.9 },
  { ratio: 1.0, amplitude: 1.0, decayS: 0.8 },
  { ratio: 1.2, amplitude: 0.6, decayS: 0.5 },
  { ratio: 1.5, amplitude: 0.4, decayS: 0.4 },
  { ratio: 2.0, amplitude: 0.8, decayS: 0.35 },
  { ratio: 2.5, amplitude: 0.3, decayS: 0.2 },
  { ratio: 3.0, amplitude: 0.25, decayS: 0.15 },
  { ratio: 4.2, amplitude: 0.2, decayS: 0.08 },
  { ratio: 5.4, amplitude: 0.15, decayS: 0.05 },
];

/** Ramps avoid the click a waveform cut mid-cycle makes. */
const ATTACK_S = 0.003;
const RELEASE_S = 0.04;

/** Peak amplitude, as a share of full scale. Left below 1 to keep clipping out. */
const AMPLITUDE = 0.7;

/** Envelope at `t` seconds, applied on top of the decay of each partial. */
function envelope(t) {
  if (t < ATTACK_S) return t / ATTACK_S;

  const remaining = DURATION_S - t;
  if (remaining < RELEASE_S) return Math.max(0, remaining / RELEASE_S);

  return 1;
}

/** Wraps 16-bit mono PCM samples in the WAV header players expect. */
function encodeWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (const [index, sample] of samples.entries()) {
    data.writeInt16LE(Math.round(sample * 32767), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Size of this chunk.
  header.writeUInt16LE(1, 20); // Uncompressed PCM.
  header.writeUInt16LE(1, 22); // Mono.
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // Bytes per second.
  header.writeUInt16LE(2, 32); // Bytes per frame.
  header.writeUInt16LE(16, 34); // Bits per sample.
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

const raw = Array.from({ length: Math.round(SAMPLE_RATE * DURATION_S) }, (_, index) => {
  const t = index / SAMPLE_RATE;
  const bell = PARTIALS.reduce(
    (sum, { ratio, amplitude, decayS }) =>
      sum + amplitude * Math.exp(-t / decayS) * Math.sin(2 * Math.PI * PRIME_HZ * ratio * t),
    0,
  );

  return bell * envelope(t);
});

// The partials line up at the strike, so the sum overshoots: scale by what was
// actually reached rather than by the amplitudes that went in.
const peak = raw.reduce((highest, sample) => Math.max(highest, Math.abs(sample)), 0);
const samples = raw.map((sample) => (sample / peak) * AMPLITUDE);

writeFileSync(OUTPUT, encodeWav(samples));
console.log(`Escrito ${OUTPUT.pathname}`);
