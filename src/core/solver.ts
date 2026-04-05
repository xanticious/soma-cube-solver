import { PIECE_OFFSETS } from "./pieces";

import {
  distinctPieceOrientations,
  normalizePositions,
  transformOffsets,
} from "./rotations";

import type { Orientation, Placement, PieceName, Vec3 } from "./types";

import { PIECE_NAMES } from "./types";

export interface PieceVariant {
  piece: PieceName;

  orientation: Orientation;

  /** Normalized offsets after rotation (min = 0). */

  offsets: Vec3[];
}

/**
 * Pre-compute all distinct oriented variants of each piece.
 */

export function computeAllVariants(): PieceVariant[] {
  const variants: PieceVariant[] = [];

  for (const piece of PIECE_NAMES) {
    const baseOffsets = PIECE_OFFSETS[piece];

    const orientations = distinctPieceOrientations(baseOffsets);

    for (const orientation of orientations) {
      const transformed = transformOffsets(baseOffsets, orientation, {
        x: 0,
        y: 0,
        z: 0,
      });

      const normalized = normalizePositions(transformed);

      variants.push({ piece, orientation, offsets: normalized });
    }
  }

  return variants;
}

/**
 * Group variants by piece name.
 */

export function groupVariantsByPiece(
  variants: PieceVariant[],
): Map<PieceName, PieceVariant[]> {
  const map = new Map<PieceName, PieceVariant[]>();

  for (const v of variants) {
    const list = map.get(v.piece) ?? [];

    list.push(v);

    map.set(v.piece, list);
  }

  return map;
}

/**
 * Solve the Soma cube: find all ways to pack 7 pieces into a 3x3x3 grid.
 * Returns all solutions as arrays of Placements.
 */

export function gridIndex(x: number, y: number, z: number): number {
  return x * 9 + y * 3 + z;
}

/**
 * Try to place the piece variant at position (px, py, pz).
 * Returns the list of grid indices occupied, or null if invalid.
 */

export function tryPlace(
  offsets: Vec3[],
  px: number,
  py: number,
  pz: number,
  grid: Uint8Array,
  gridSize: number,
): number[] | null {
  const indices: number[] = [];

  for (const o of offsets) {
    const x = o.x + px;

    const y = o.y + py;

    const z = o.z + pz;

    if (
      x < 0 ||
      x >= gridSize ||
      y < 0 ||
      y >= gridSize ||
      z < 0 ||
      z >= gridSize
    ) {
      return null;
    }

    const idx = gridIndex(x, y, z);

    if (grid[idx]) return null;

    indices.push(idx);
  }

  return indices;
}

export function solveAll(): Placement[][] {
  const allVariants = computeAllVariants();

  const variantsByPiece = groupVariantsByPiece(allVariants);

  const solutions: Placement[][] = [];

  const gridSize = 3;

  // Grid occupation: 3x3x3 flat array

  const grid = new Uint8Array(27); // 0 = empty

  const currentPlacements: Placement[] = [];

  function solve(pieceIndex: number): void {
    if (pieceIndex === PIECE_NAMES.length) {
      solutions.push([...currentPlacements]);

      return;
    }

    const pieceName = PIECE_NAMES[pieceIndex]!;

    const variants = variantsByPiece.get(pieceName) ?? [];

    for (const variant of variants) {
      for (let px = 0; px < gridSize; px++) {
        for (let py = 0; py < gridSize; py++) {
          for (let pz = 0; pz < gridSize; pz++) {
            const indices = tryPlace(
              variant.offsets,
              px,
              py,
              pz,
              grid,
              gridSize,
            );

            if (!indices) continue;

            // Place

            for (const idx of indices) {
              grid[idx] = pieceIndex + 1;
            }

            currentPlacements.push({
              piece: pieceName,

              orientation: variant.orientation,

              position: { x: px, y: py, z: pz },
            });

            solve(pieceIndex + 1);

            // Unplace

            currentPlacements.pop();

            for (const idx of indices) {
              grid[idx] = 0;
            }
          }
        }
      }
    }
  }

  solve(0);

  return solutions;
}

/**
 * Convert a solution to a canonical form for deduplication.
 * A solution is represented as a sorted 27-char string where each cell
 * is labeled by its piece name, read in xyz order.
 */

export function solutionCanonicalKey(placements: Placement[]): string {
  const grid = Array.from<string>({ length: 27 }).fill(".");

  for (const p of placements) {
    const offsets = PIECE_OFFSETS[p.piece];

    const cells = transformOffsets(offsets, p.orientation, p.position);

    for (const c of cells) {
      const idx = c.x * 9 + c.y * 3 + c.z;

      grid[idx] = p.piece;
    }
  }

  return grid.join("");
}

/**
 * The 48 symmetries (rotations + reflections) of the cube as coordinate
 * permutation+sign functions, paired with their determinant.
 * det=+1 → proper rotation; det=-1 → improper rotation (reflection).
 * Each maps (x, y, z) in a 3x3x3 grid to a new (x, y, z).
 */

interface CubeSymmetry {
  fn: (v: Vec3) => Vec3;
  det: 1 | -1;
}

function cubeSymmetries(): CubeSymmetry[] {
  // For a 3x3x3 grid with coords 0-2, we rotate/reflect around center (1,1,1)

  const syms: CubeSymmetry[] = [];

  const signs = [1, -1];

  const perms: [number, number, number][] = [
    [0, 1, 2],

    [0, 2, 1],

    [1, 0, 2],

    [1, 2, 0],

    [2, 0, 1],

    [2, 1, 0],
  ];

  for (const perm of perms) {
    for (const s0 of signs) {
      for (const s1 of signs) {
        for (const s2 of signs) {
          const ss = [s0, s1, s2];

          const permSign =
            perm[0] === 0
              ? perm[1] === 1
                ? 1
                : -1
              : perm[0] === 1
                ? perm[1] === 0
                  ? -1
                  : perm[1] === 2
                    ? 1
                    : -1
                : perm[1] === 0
                  ? 1
                  : -1;

          const det = (permSign * s0 * s1 * s2) as 1 | -1;

          syms.push({
            det,

            fn: (v: Vec3) => {
              const coords = [v.x, v.y, v.z];

              // Rotate/reflect around center (1,1,1): translate to origin, apply, translate back

              const centered = coords.map((c) => c - 1);

              const rotated = [
                ss[0]! * centered[perm[0]!]!,

                ss[1]! * centered[perm[1]!]!,

                ss[2]! * centered[perm[2]!]!,
              ];

              return {
                x: rotated[0]! + 1,

                y: rotated[1]! + 1,

                z: rotated[2]! + 1,
              };
            },
          });
        }
      }
    }
  }

  return syms;
}

/**
 * Get the canonical key for a solution under all 48 cube symmetries
 * (rotations + reflections). Returns the lexicographically smallest key.
 *
 * Pieces A and B are chiral mirrors of each other: a reflection of the whole
 * cube swaps which cells are filled by A vs B. All other pieces are achiral
 * (their reflected orientations are reachable by proper rotation).
 */

export function solutionCanonicalKeyUnderRotation(
  placements: Placement[],
): string {
  // Build grid map: cell -> piece name

  const gridSize = 3;

  const grid = Array.from<string>({ length: 27 }).fill(".");

  for (const p of placements) {
    const offsets = PIECE_OFFSETS[p.piece];

    const cells = transformOffsets(offsets, p.orientation, p.position);

    for (const c of cells) {
      grid[c.x * 9 + c.y * 3 + c.z] = p.piece;
    }
  }

  const symmetries = cubeSymmetries();

  let minKey = grid.join("");

  for (const { fn: rot, det } of symmetries) {
    const rotatedGrid = Array.from<string>({ length: 27 }).fill(".");

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          let src = grid[x * 9 + y * 3 + z]!;

          // Reflections (det=-1) swap the chiral piece pair A↔B.
          if (det === -1) {
            if (src === "A") src = "B";
            else if (src === "B") src = "A";
          }

          const dest = rot({ x, y, z });

          rotatedGrid[dest.x * 9 + dest.y * 3 + dest.z] = src;
        }
      }
    }

    const key = rotatedGrid.join("");

    if (key < minKey) {
      minKey = key;
    }
  }

  return minKey;
}

/**
 * Filter solutions to distinct ones (unique under rotation and reflection of the whole cube).
 */

export function filterDistinctSolutions(
  solutions: Placement[][],
): Placement[][] {
  const seen = new Set<string>();

  const distinct: Placement[][] = [];

  for (const sol of solutions) {
    const key = solutionCanonicalKeyUnderRotation(sol);

    if (!seen.has(key)) {
      seen.add(key);

      distinct.push(sol);
    }
  }

  return distinct;
}
