import type { Orientation, RotationStep, Vec3 } from './types';

/**
 * Apply a single 90° rotation step around an axis.
 * Step 0 = identity, 1 = 90°, 2 = 180°, 3 = 270°.
 */

function rotateZ(v: Vec3, steps: number): Vec3 {
  const s = ((steps % 4) + 4) % 4;

  switch (s) {
    case 0:
      return v;

    case 1:
      return { x: -v.y, y: v.x, z: v.z };

    case 2:
      return { x: -v.x, y: -v.y, z: v.z };

    case 3:
      return { x: v.y, y: -v.x, z: v.z };

    default:
      return v;
  }
}

function rotateX(v: Vec3, steps: number): Vec3 {
  const s = ((steps % 4) + 4) % 4;

  switch (s) {
    case 0:
      return v;

    case 1:
      return { x: v.x, y: -v.z, z: v.y };

    case 2:
      return { x: v.x, y: -v.y, z: -v.z };

    case 3:
      return { x: v.x, y: v.z, z: -v.y };

    default:
      return v;
  }
}

function rotateY(v: Vec3, steps: number): Vec3 {
  const s = ((steps % 4) + 4) % 4;

  switch (s) {
    case 0:
      return v;

    case 1:
      return { x: v.z, y: v.y, z: -v.x };

    case 2:
      return { x: -v.x, y: v.y, z: -v.z };

    case 3:
      return { x: -v.z, y: v.y, z: v.x };

    default:
      return v;
  }
}

/**
 * Apply orientation (a=yaw/Z, b=pitch/X, c=roll/Y) to a vector.
 * Application order: a → b → c (yaw first, then pitch, then roll).
 */

export function applyOrientation(v: Vec3, o: Orientation): Vec3 {
  let result = rotateZ(v, o.a);

  result = rotateX(result, o.b);

  result = rotateY(result, o.c);

  // Scrub negative zeros

  return { x: result.x || 0, y: result.y || 0, z: result.z || 0 };
}

/**
 * Compute the absolute cubelet positions for a set of offsets given an orientation and position.
 */

export function transformOffsets(
  offsets: readonly Vec3[],

  orientation: Orientation,

  position: Vec3,
): Vec3[] {
  const rotated = offsets.map((offset) =>
    applyOrientation(offset, orientation),
  );

  const normalized = normalizePositions(rotated);

  return normalized.map((p) => ({
    x: p.x + position.x,

    y: p.y + position.y,

    z: p.z + position.z,
  }));
}

/**
 * Normalize a set of cubelet positions: translate so minimum x/y/z is 0,
 * then sort lexicographically for comparison.
 */

export function normalizePositions(positions: Vec3[]): Vec3[] {
  if (positions.length === 0) return [];

  const minX = Math.min(...positions.map((p) => p.x));

  const minY = Math.min(...positions.map((p) => p.y));

  const minZ = Math.min(...positions.map((p) => p.z));

  return positions

    .map((p) => ({ x: p.x - minX, y: p.y - minY, z: p.z - minZ }))

    .sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
}

/**
 * All 24 distinct orientations of a cube, expressed as (a, b, c) triples.
 * Pre-computed by generating all 64 combinations and deduplicating
 * by the resulting rotation matrix.
 */

export const DISTINCT_ORIENTATIONS: readonly Orientation[] =
  computeDistinctOrientations();

function orientationKey(o: Orientation): string {
  // Apply orientation to three basis vectors and use the result as a key

  const ex = applyOrientation({ x: 1, y: 0, z: 0 }, o);

  const ey = applyOrientation({ x: 0, y: 1, z: 0 }, o);

  const ez = applyOrientation({ x: 0, y: 0, z: 1 }, o);

  return `${ex.x},${ex.y},${ex.z}|${ey.x},${ey.y},${ey.z}|${ez.x},${ez.y},${ez.z}`;
}

function computeDistinctOrientations(): Orientation[] {
  const seen = new Set<string>();

  const result: Orientation[] = [];

  const steps: RotationStep[] = [0, 1, 2, 3];

  for (const a of steps) {
    for (const b of steps) {
      for (const c of steps) {
        const o: Orientation = { a, b, c };

        const key = orientationKey(o);

        if (!seen.has(key)) {
          seen.add(key);

          result.push(o);
        }
      }
    }
  }

  return result;
}

/**
 * Get all distinct orientations of a piece (cubelet offset set),
 * deduplicating by normalized position set.
 */

export function distinctPieceOrientations(
  offsets: readonly Vec3[],
): Orientation[] {
  const seen = new Set<string>();

  const result: Orientation[] = [];

  for (const o of DISTINCT_ORIENTATIONS) {
    const transformed = offsets.map((v) => applyOrientation(v, o));

    const normalized = normalizePositions(transformed);

    const key = normalized.map((p) => `${p.x},${p.y},${p.z}`).join('|');

    if (!seen.has(key)) {
      seen.add(key);

      result.push(o);
    }
  }

  return result;
}
