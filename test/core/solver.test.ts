import { describe, it, expect, beforeAll } from 'vitest';

import {
  computeAllVariants,
  groupVariantsByPiece,
  gridIndex,
  tryPlace,
  solutionCanonicalKey,
  solutionCanonicalKeyUnderRotation,
  solveAll,
  filterDistinctSolutions,
} from '@/core/solver';

import { PIECE_OFFSETS } from '@/core/pieces';
import { transformOffsets, normalizePositions } from '@/core/rotations';
import { validatePlacements, isCubeSolved } from '@/core/validation';
import { serializeSolution, parseSolution } from '@/core/notation';
import { PIECE_NAMES } from '@/core/types';
import type { Placement, Vec3 } from '@/core/types';

// ---------------------------------------------------------------------------
// gridIndex
// ---------------------------------------------------------------------------

describe('gridIndex', () => {
  it('maps (0,0,0) to 0', () => {
    expect(gridIndex(0, 0, 0)).toBe(0);
  });

  it('maps (2,2,2) to 26', () => {
    expect(gridIndex(2, 2, 2)).toBe(26);
  });

  it('maps (1,0,0) to 9', () => {
    expect(gridIndex(1, 0, 0)).toBe(9);
  });

  it('maps (0,1,0) to 3', () => {
    expect(gridIndex(0, 1, 0)).toBe(3);
  });

  it('maps (0,0,1) to 1', () => {
    expect(gridIndex(0, 0, 1)).toBe(1);
  });

  it('produces 27 unique indices for all 3x3x3 cells', () => {
    const indices = new Set<number>();
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
          indices.add(gridIndex(x, y, z));
        }
      }
    }
    expect(indices.size).toBe(27);
  });
});

// ---------------------------------------------------------------------------
// tryPlace
// ---------------------------------------------------------------------------

describe('tryPlace', () => {
  it('places a single cubelet at origin in empty grid', () => {
    const grid = new Uint8Array(27);
    const offsets: Vec3[] = [{ x: 0, y: 0, z: 0 }];
    const result = tryPlace(offsets, 0, 0, 0, grid, 3);
    expect(result).toEqual([0]);
  });

  it('places V piece offsets at origin', () => {
    const grid = new Uint8Array(27);
    // V = (0,0,0), (1,0,0), (0,1,0) — already normalized
    const offsets: Vec3[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ];
    const result = tryPlace(offsets, 0, 0, 0, grid, 3);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    // Check indices are correct
    expect(result).toContain(gridIndex(0, 0, 0));
    expect(result).toContain(gridIndex(1, 0, 0));
    expect(result).toContain(gridIndex(0, 1, 0));
  });

  it('returns null when piece goes out of bounds', () => {
    const grid = new Uint8Array(27);
    // Piece extends to x=3 (out of 3x3x3)
    const offsets: Vec3[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ];
    const result = tryPlace(offsets, 2, 0, 0, grid, 3);
    expect(result).toBeNull();
  });

  it('returns null when cell is already occupied', () => {
    const grid = new Uint8Array(27);
    grid[0] = 1; // occupy (0,0,0)
    const offsets: Vec3[] = [{ x: 0, y: 0, z: 0 }];
    const result = tryPlace(offsets, 0, 0, 0, grid, 3);
    expect(result).toBeNull();
  });

  it('can place at non-zero position', () => {
    const grid = new Uint8Array(27);
    const offsets: Vec3[] = [{ x: 0, y: 0, z: 0 }];
    const result = tryPlace(offsets, 2, 2, 2, grid, 3);
    expect(result).toEqual([gridIndex(2, 2, 2)]);
  });

  it('returns null for negative resulting coordinates', () => {
    const grid = new Uint8Array(27);
    const offsets: Vec3[] = [{ x: -1, y: 0, z: 0 }];
    const result = tryPlace(offsets, 0, 0, 0, grid, 3);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeAllVariants
// ---------------------------------------------------------------------------

describe('computeAllVariants', () => {
  const variants = computeAllVariants();

  it('produces variants for all 7 pieces', () => {
    const pieces = new Set(variants.map((v) => v.piece));
    expect(pieces.size).toBe(7);
    for (const name of PIECE_NAMES) {
      expect(pieces.has(name)).toBe(true);
    }
  });

  it('each variant has the correct number of cubelets', () => {
    for (const v of variants) {
      const expectedCount = v.piece === 'V' ? 3 : 4;
      expect(v.offsets).toHaveLength(expectedCount);
    }
  });

  it('all variant offsets are non-negative (normalized)', () => {
    for (const v of variants) {
      for (const o of v.offsets) {
        expect(o.x).toBeGreaterThanOrEqual(0);
        expect(o.y).toBeGreaterThanOrEqual(0);
        expect(o.z).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('no duplicate offsets within any single variant', () => {
    for (const v of variants) {
      const keys = v.offsets.map((o) => `${o.x},${o.y},${o.z}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('variant offsets fit in 3x3x3 bounding box', () => {
    for (const v of variants) {
      for (const o of v.offsets) {
        expect(o.x).toBeLessThan(3);
        expect(o.y).toBeLessThan(3);
        expect(o.z).toBeLessThan(3);
      }
    }
  });

  it('produces expected variant counts per piece', () => {
    const grouped = groupVariantsByPiece(variants);
    for (const name of PIECE_NAMES) {
      const count = grouped.get(name)!.length;
      // All pieces should have at least 1 variant and at most 24
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(24);
    }
  });

  it('variant offsets match what transformOffsets + normalizePositions produce', () => {
    for (const v of variants) {
      const baseOffsets = PIECE_OFFSETS[v.piece];
      const transformed = transformOffsets(baseOffsets, v.orientation, {
        x: 0,
        y: 0,
        z: 0,
      });
      const normalized = normalizePositions(transformed);
      expect(v.offsets).toEqual(normalized);
    }
  });
});

// ---------------------------------------------------------------------------
// groupVariantsByPiece
// ---------------------------------------------------------------------------

describe('groupVariantsByPiece', () => {
  const variants = computeAllVariants();
  const grouped = groupVariantsByPiece(variants);

  it('has exactly 7 keys', () => {
    expect(grouped.size).toBe(7);
  });

  it('total variants across all pieces equals computeAllVariants length', () => {
    let total = 0;
    for (const [, list] of grouped) {
      total += list.length;
    }
    expect(total).toBe(variants.length);
  });

  it('each group only contains variants for that piece', () => {
    for (const [name, list] of grouped) {
      for (const v of list) {
        expect(v.piece).toBe(name);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Placement round-trip: solver output → notation → parse → validate
// ---------------------------------------------------------------------------

describe('placement round-trip integrity', () => {
  it('a single placement serializes and parses back correctly', () => {
    const placement: Placement = {
      piece: 'V',
      orientation: { a: 0, b: 0, c: 0 },
      position: { x: 0, y: 0, z: 0 },
    };
    const notation = serializeSolution([placement]);
    const parsed = parseSolution(notation);
    expect(parsed).toEqual([placement]);
  });

  it('transformOffsets of a placement produces cells inside the grid', () => {
    const placement: Placement = {
      piece: 'L',
      orientation: { a: 0, b: 0, c: 0 },
      position: { x: 0, y: 0, z: 0 },
    };
    const cells = transformOffsets(
      PIECE_OFFSETS[placement.piece],
      placement.orientation,
      placement.position,
    );
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(3);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThan(3);
      expect(c.z).toBeGreaterThanOrEqual(0);
      expect(c.z).toBeLessThan(3);
    }
  });
});

// ---------------------------------------------------------------------------
// solutionCanonicalKey
// ---------------------------------------------------------------------------

describe('solutionCanonicalKey', () => {
  it('produces a 27-char string for a valid placement set', () => {
    const placements: Placement[] = [
      {
        piece: 'V',
        orientation: { a: 0, b: 0, c: 0 },
        position: { x: 0, y: 0, z: 0 },
      },
    ];
    const key = solutionCanonicalKey(placements);
    expect(key).toHaveLength(27);
    expect(key.split('').filter((c) => c === 'V')).toHaveLength(3);
    expect(key.split('').filter((c) => c === '.')).toHaveLength(24);
  });

  it('cells are indexed as x*9 + y*3 + z', () => {
    // Place V at (0,0,0): occupies (0,0,0), (1,0,0), (0,1,0)
    const placements: Placement[] = [
      {
        piece: 'V',
        orientation: { a: 0, b: 0, c: 0 },
        position: { x: 0, y: 0, z: 0 },
      },
    ];
    const key = solutionCanonicalKey(placements);
    // (0,0,0) -> idx 0, (1,0,0) -> idx 9, (0,1,0) -> idx 3
    expect(key[0]).toBe('V');
    expect(key[9]).toBe('V');
    expect(key[3]).toBe('V');
  });
});

// ---------------------------------------------------------------------------
// solutionCanonicalKeyUnderRotation
// ---------------------------------------------------------------------------

describe('solutionCanonicalKeyUnderRotation', () => {
  it('returns a 27-char string', () => {
    const placements: Placement[] = [
      {
        piece: 'V',
        orientation: { a: 0, b: 0, c: 0 },
        position: { x: 0, y: 0, z: 0 },
      },
    ];
    const key = solutionCanonicalKeyUnderRotation(placements);
    expect(key).toHaveLength(27);
  });

  it('is deterministic', () => {
    const placements: Placement[] = [
      {
        piece: 'V',
        orientation: { a: 0, b: 0, c: 0 },
        position: { x: 0, y: 0, z: 0 },
      },
    ];
    const key1 = solutionCanonicalKeyUnderRotation(placements);
    const key2 = solutionCanonicalKeyUnderRotation(placements);
    expect(key1).toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// solveAll — full solver validation (shares a single solve run)
// ---------------------------------------------------------------------------

describe('solveAll', { timeout: 300_000 }, () => {
  let allSolutions: Placement[][] = [];

  beforeAll(() => {
    allSolutions = solveAll();
  });

  it('finds solutions', () => {
    expect(allSolutions.length).toBeGreaterThan(0);
  });

  it('each solution has exactly 7 placements', () => {
    for (const sol of allSolutions) {
      expect(sol).toHaveLength(7);
    }
  });

  it('each solution uses all 7 distinct pieces', () => {
    for (const sol of allSolutions) {
      const pieces = new Set(sol.map((p) => p.piece));
      expect(pieces.size).toBe(7);
      for (const name of PIECE_NAMES) {
        expect(pieces.has(name)).toBe(true);
      }
    }
  });

  it('each solution occupies exactly 27 cells via transformOffsets', () => {
    for (const sol of allSolutions) {
      const allCells: Vec3[] = [];
      for (const p of sol) {
        const cells = transformOffsets(
          PIECE_OFFSETS[p.piece],
          p.orientation,
          p.position,
        );
        allCells.push(...cells);
      }
      expect(allCells).toHaveLength(27);
    }
  });

  it('no solution has overlapping cells', () => {
    for (const sol of allSolutions) {
      const result = validatePlacements(sol, 3);
      expect(result.overlaps).toHaveLength(0);
    }
  });

  it('no solution has out-of-bounds cells', () => {
    for (const sol of allSolutions) {
      const result = validatePlacements(sol, 3);
      expect(result.outOfBounds).toHaveLength(0);
    }
  });

  it('every solution passes isCubeSolved', () => {
    for (const sol of allSolutions) {
      expect(isCubeSolved(sol)).toBe(true);
    }
  });

  it('all cells are within 0-2 range', () => {
    for (const sol of allSolutions) {
      for (const p of sol) {
        const cells = transformOffsets(
          PIECE_OFFSETS[p.piece],
          p.orientation,
          p.position,
        );
        for (const c of cells) {
          expect(c.x).toBeGreaterThanOrEqual(0);
          expect(c.x).toBeLessThanOrEqual(2);
          expect(c.y).toBeGreaterThanOrEqual(0);
          expect(c.y).toBeLessThanOrEqual(2);
          expect(c.z).toBeGreaterThanOrEqual(0);
          expect(c.z).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('first solution survives serialize → parse → validate', () => {
    const first = allSolutions[0]!;

    // Serialize to notation
    const notation = serializeSolution(first);

    // Parse back
    const parsed = parseSolution(notation);
    expect(parsed).not.toBeNull();
    expect(parsed!).toHaveLength(7);

    // Validate the parsed solution is still a valid cube
    expect(isCubeSolved(parsed!)).toBe(true);

    // Verify the parsed placements produce the same cells
    for (let i = 0; i < first.length; i++) {
      const originalCells = transformOffsets(
        PIECE_OFFSETS[first[i]!.piece],
        first[i]!.orientation,
        first[i]!.position,
      );
      const parsedCells = transformOffsets(
        PIECE_OFFSETS[parsed![i]!.piece],
        parsed![i]!.orientation,
        parsed![i]!.position,
      );
      expect(parsedCells).toEqual(originalCells);
    }
  });

  it('filterDistinctSolutions returns fewer or equal solutions', () => {
    const distinct = filterDistinctSolutions(allSolutions);
    expect(distinct.length).toBeLessThanOrEqual(allSolutions.length);
    expect(distinct.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Consistency between solver grid and transformOffsets
// ---------------------------------------------------------------------------

describe('solver grid consistency', () => {
  it("solver's internal normalized offsets match transformOffsets output", () => {
    const variants = computeAllVariants();

    for (const v of variants) {
      const px = 0;
      const py = 0;
      const pz = 0;

      // Method 1: solver's approach — add normalized offset to position
      const solverCells = v.offsets.map((o) => ({
        x: o.x + px,
        y: o.y + py,
        z: o.z + pz,
      }));

      // Method 2: transformOffsets with original piece offsets
      const transformCells = transformOffsets(
        PIECE_OFFSETS[v.piece],
        v.orientation,
        { x: 0, y: 0, z: 0 },
      );
      const normalizedTransform = normalizePositions(transformCells);

      // These should be the same
      const sortedSolver = [...solverCells].sort(
        (a, b) => a.x - b.x || a.y - b.y || a.z - b.z,
      );
      expect(sortedSolver).toEqual(normalizedTransform);
    }
  });

  it('solver placement position + normalized offsets yield same cells as transformOffsets + position', () => {
    // Key test: the solver stores normalized offsets and adds position.
    // But the notation/validation use transformOffsets(baseOffsets, orientation, position).
    // These MUST produce the same cell set for solutions to be valid.
    const variants = computeAllVariants();

    for (const v of variants) {
      const px = 1;
      const py = 1;
      const pz = 0;

      // Solver method: normalized_offset + position
      const solverCells = v.offsets
        .map((o) => ({
          x: o.x + px,
          y: o.y + py,
          z: o.z + pz,
        }))
        .sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);

      // transformOffsets method (used by notation/validation):
      // transformOffsets(baseOffsets, orientation, position)
      const transformCells = transformOffsets(
        PIECE_OFFSETS[v.piece],
        v.orientation,
        { x: px, y: py, z: pz },
      );
      const sortedTransform = [...transformCells].sort(
        (a, b) => a.x - b.x || a.y - b.y || a.z - b.z,
      );

      // CRITICAL: these must match. If they don't, the solver is finding
      // valid packings internally but the notation represents different cells.
      expect(solverCells).toEqual(sortedTransform);
    }
  });
});
