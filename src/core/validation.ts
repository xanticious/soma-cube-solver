import { PIECE_OFFSETS } from './pieces';

import { transformOffsets } from './rotations';

import type { Placement, Vec3 } from './types';

function vecKey(v: Vec3): string {
  return `${v.x},${v.y},${v.z}`;
}

export interface ValidationResult {
  valid: boolean;

  overlaps: Vec3[];

  outOfBounds: Vec3[];

  occupiedCells: Map<string, { piece: string; position: Vec3 }>;
}

/**
 * Validate a set of placements against a grid of the given size.
 * Detects overlaps and out-of-bounds cubelets.
 */

export function validatePlacements(
  placements: Placement[],

  gridSize: number,
): ValidationResult {
  const occupiedCells = new Map<string, { piece: string; position: Vec3 }>();

  const overlaps: Vec3[] = [];

  const outOfBounds: Vec3[] = [];

  for (const placement of placements) {
    const offsets = PIECE_OFFSETS[placement.piece];

    const cells = transformOffsets(
      offsets,

      placement.orientation,

      placement.position,
    );

    for (const cell of cells) {
      if (
        cell.x < 0 ||
        cell.y < 0 ||
        cell.z < 0 ||
        cell.x >= gridSize ||
        cell.y >= gridSize ||
        cell.z >= gridSize
      ) {
        outOfBounds.push(cell);

        continue;
      }

      const key = vecKey(cell);

      if (occupiedCells.has(key)) {
        overlaps.push(cell);
      } else {
        occupiedCells.set(key, { piece: placement.piece, position: cell });
      }
    }
  }

  return {
    valid: overlaps.length === 0 && outOfBounds.length === 0,

    overlaps,

    outOfBounds,

    occupiedCells,
  };
}

/**
 * Check if a 3x3x3 cube is fully packed (27 cells occupied, no overlaps/gaps).
 */

export function isCubeSolved(placements: Placement[]): boolean {
  const result = validatePlacements(placements, 3);

  return result.valid && result.occupiedCells.size === 27;
}

/**
 * Check whether adding a single placement to existing placements is valid.
 */

export function isPlacementValid(
  existingPlacements: Placement[],

  newPlacement: Placement,

  gridSize: number,
): boolean {
  const offsets = PIECE_OFFSETS[newPlacement.piece];

  const cells = transformOffsets(
    offsets,

    newPlacement.orientation,

    newPlacement.position,
  );

  // Build occupied set from existing placements

  const occupied = new Set<string>();

  for (const p of existingPlacements) {
    const pCells = transformOffsets(
      PIECE_OFFSETS[p.piece],

      p.orientation,

      p.position,
    );

    for (const c of pCells) {
      occupied.add(vecKey(c));
    }
  }

  for (const cell of cells) {
    if (
      cell.x < 0 ||
      cell.y < 0 ||
      cell.z < 0 ||
      cell.x >= gridSize ||
      cell.y >= gridSize ||
      cell.z >= gridSize
    ) {
      return false;
    }

    if (occupied.has(vecKey(cell))) {
      return false;
    }
  }

  return true;
}
