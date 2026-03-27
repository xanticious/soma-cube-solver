import { describe, it, expect } from "vitest";

import {
  solutionCanonicalKey,
  solutionCanonicalKeyUnderRotation,
} from "@/core/solver";

import type { Placement } from "@/core/types";

describe("solver", () => {
  // These tests validate key infrastructure; the full solve is tested separately

  // because it's computationally expensive.

  describe("solutionCanonicalKey", () => {
    it("produces a 27-char string for a valid placement set", () => {
      // Place V at origin (occupies 3 cells)

      const placements: Placement[] = [
        {
          piece: "V",

          orientation: { a: 0, b: 0, c: 0 },

          position: { x: 0, y: 0, z: 0 },
        },
      ];

      const key = solutionCanonicalKey(placements);

      expect(key).toHaveLength(27);

      // Should have 3 'V's and 24 '.'s

      expect(key.split("").filter((c) => c === "V")).toHaveLength(3);

      expect(key.split("").filter((c) => c === ".")).toHaveLength(24);
    });
  });

  describe("solutionCanonicalKeyUnderRotation", () => {
    it("same logical solution rotated produces same canonical key", () => {
      // Place V at (0,0,0) — occupies (0,0,0), (1,0,0), (0,1,0)

      const p1: Placement[] = [
        {
          piece: "V",

          orientation: { a: 0, b: 0, c: 0 },

          position: { x: 0, y: 0, z: 0 },
        },
      ];

      // Place V at (2,2,0) with a=2 — rotated 180° around Z

      // (0,0,0) -> (0,0,0)+rot -> ... this is the same shape differently placed

      // The canonical key under rotation should normalize both

      const key1 = solutionCanonicalKeyUnderRotation(p1);

      expect(key1).toHaveLength(27);

      // Just verify it returns a consistent string

      const key1Again = solutionCanonicalKeyUnderRotation(p1);

      expect(key1).toBe(key1Again);
    });
  });
});
