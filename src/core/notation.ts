import { PIECE_NAMES } from './types';

import type {
  Orientation,
  PieceName,
  Placement,
  RotationStep,
  Vec3,
} from './types';

/**
 * Notation format:
 *   {Piece}-a{0-3}-b{0-3}-c{0-3}-x{N}-y{N}-z{N}
 *
 * A full solution is 7 comma-separated placement tokens.
 * Example: V-a0-b0-c0-x0-y0-z0,L-a1-b2-c0-x1-y0-z2
 */

const PLACEMENT_REGEX =
  /^([VLTZABP])-a([0-3])-b([0-3])-c([0-3])-x(-?\d+)-y(-?\d+)-z(-?\d+)$/;

function isRotationStep(n: number): n is RotationStep {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

function isPieceName(s: string): s is PieceName {
  return (PIECE_NAMES as readonly string[]).includes(s);
}

export function serializePlacement(p: Placement): string {
  return `${p.piece}-a${p.orientation.a}-b${p.orientation.b}-c${p.orientation.c}-x${p.position.x}-y${p.position.y}-z${p.position.z}`;
}

export function parsePlacement(token: string): Placement | null {
  const m = PLACEMENT_REGEX.exec(token.trim());

  if (!m) return null;

  const piece = m[1]!;

  const a = Number(m[2]);

  const b = Number(m[3]);

  const c = Number(m[4]);

  const x = Number(m[5]);

  const y = Number(m[6]);

  const z = Number(m[7]);

  if (!isPieceName(piece)) return null;

  if (!isRotationStep(a) || !isRotationStep(b) || !isRotationStep(c))
    return null;

  const orientation: Orientation = { a, b, c };

  const position: Vec3 = { x, y, z };

  return { piece, orientation, position };
}

export function serializeSolution(placements: Placement[]): string {
  return placements.map(serializePlacement).join(',');
}

export function parseSolution(notation: string): Placement[] | null {
  const tokens = notation.split(',');

  const placements: Placement[] = [];

  for (const token of tokens) {
    const p = parsePlacement(token);

    if (!p) return null;

    placements.push(p);
  }

  return placements;
}
