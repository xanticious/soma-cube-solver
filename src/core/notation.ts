import { PIECE_NAMES } from "./types";

import type {
  Orientation,
  PieceName,
  Placement,
  RotationStep,
  Vec3,
} from "./types";

/**
 * URL-friendly notation format:
 *   {Piece}{a}{b}{c}.{x}.{y}.{z}
 *
 * - Piece: single uppercase letter (V, L, T, Z, A, B, P)
 * - a, b, c: single digits 0-3 (rotation steps), packed with no separator
 * - x, y, z: integer coordinates, dot-separated
 *
 * A full solution is multiple placement tokens separated by '~'.
 * Example: V000.0.0.0~L120.1.0.2
 *
 * All characters are URL-safe (no percent-encoding needed).
 */

const PLACEMENT_REGEX =
  /^([VLTZABP])([0-3])([0-3])([0-3])\.(-?\d+)\.(-?\d+)\.(-?\d+)$/;

function isRotationStep(n: number): n is RotationStep {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

function isPieceName(s: string): s is PieceName {
  return (PIECE_NAMES as readonly string[]).includes(s);
}

export function serializePlacement(p: Placement): string {
  return `${p.piece}${p.orientation.a}${p.orientation.b}${p.orientation.c}.${p.position.x}.${p.position.y}.${p.position.z}`;
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
  return placements.map(serializePlacement).join("~");
}

export function parseSolution(notation: string): Placement[] | null {
  const tokens = notation.split("~");

  const placements: Placement[] = [];

  for (const token of tokens) {
    const p = parsePlacement(token);

    if (!p) return null;

    placements.push(p);
  }

  return placements;
}
