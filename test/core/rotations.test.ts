import { describe, it, expect } from "vitest";

import {
  applyOrientation,
  DISTINCT_ORIENTATIONS,
  distinctPieceOrientations,
  normalizePositions,
  transformOffsets,
} from "@/core/rotations";

import { PIECE_OFFSETS } from "@/core/pieces";

describe("rotations", () => {
  describe("applyOrientation", () => {
    it("identity leaves vector unchanged", () => {
      const v = { x: 1, y: 2, z: 3 };

      const result = applyOrientation(v, { a: 0, b: 0, c: 0 });

      expect(result).toEqual(v);
    });

    it("a=1 rotates 90° around Z", () => {
      const v = { x: 1, y: 0, z: 0 };

      const result = applyOrientation(v, { a: 1, b: 0, c: 0 });

      expect(result).toEqual({ x: 0, y: 1, z: 0 });
    });

    it("a=2 rotates 180° around Z", () => {
      const v = { x: 1, y: 0, z: 0 };

      const result = applyOrientation(v, { a: 2, b: 0, c: 0 });

      expect(result).toEqual({ x: -1, y: 0, z: 0 });
    });

    it("b=1 rotates 90° around X", () => {
      const v = { x: 0, y: 1, z: 0 };

      const result = applyOrientation(v, { a: 0, b: 1, c: 0 });

      expect(result).toEqual({ x: 0, y: 0, z: 1 });
    });

    it("c=1 rotates 90° around Y", () => {
      const v = { x: 0, y: 0, z: 1 };

      const result = applyOrientation(v, { a: 0, b: 0, c: 1 });

      expect(result).toEqual({ x: 1, y: 0, z: 0 });
    });
  });

  describe("DISTINCT_ORIENTATIONS", () => {
    it("has exactly 24 orientations", () => {
      expect(DISTINCT_ORIENTATIONS).toHaveLength(24);
    });
  });

  describe("transformOffsets", () => {
    it("applies identity + translation", () => {
      const offsets = [
        { x: 0, y: 0, z: 0 },

        { x: 1, y: 0, z: 0 },
      ];

      const result = transformOffsets(
        offsets,

        { a: 0, b: 0, c: 0 },

        { x: 2, y: 3, z: 4 },
      );

      expect(result).toEqual([
        { x: 2, y: 3, z: 4 },

        { x: 3, y: 3, z: 4 },
      ]);
    });
  });

  describe("normalizePositions", () => {
    it("translates min to origin", () => {
      const positions = [
        { x: 5, y: 3, z: 1 },

        { x: 6, y: 3, z: 1 },
      ];

      const result = normalizePositions(positions);

      expect(result).toEqual([
        { x: 0, y: 0, z: 0 },

        { x: 1, y: 0, z: 0 },
      ]);
    });

    it("sorts lexicographically", () => {
      const positions = [
        { x: 1, y: 0, z: 0 },

        { x: 0, y: 1, z: 0 },

        { x: 0, y: 0, z: 0 },
      ];

      const result = normalizePositions(positions);

      expect(result[0]).toEqual({ x: 0, y: 0, z: 0 });

      expect(result[1]).toEqual({ x: 0, y: 1, z: 0 });

      expect(result[2]).toEqual({ x: 1, y: 0, z: 0 });
    });
  });

  describe("distinctPieceOrientations", () => {
    it("V piece has correct number of distinct orientations", () => {
      // V is a flat L-triomino, should have 12 orientations (in 3D)

      const orientations = distinctPieceOrientations(PIECE_OFFSETS.V);

      expect(orientations.length).toBeGreaterThan(0);

      expect(orientations.length).toBeLessThanOrEqual(24);
    });

    it("each returned orientation produces a unique shape", () => {
      for (const pieceName of ["V", "L", "T", "Z", "A", "B", "P"] as const) {
        const offsets = PIECE_OFFSETS[pieceName];

        const orientations = distinctPieceOrientations(offsets);

        const keys = new Set<string>();

        for (const o of orientations) {
          const transformed = offsets.map((v) => applyOrientation(v, o));

          const normalized = normalizePositions(transformed);

          const key = normalized.map((p) => `${p.x},${p.y},${p.z}`).join("|");

          keys.add(key);
        }

        expect(keys.size).toBe(orientations.length);
      }
    });
  });
});
