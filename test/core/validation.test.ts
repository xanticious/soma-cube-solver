import { describe, it, expect } from "vitest";

import {
  validatePlacements,
  isCubeSolved,
  isPlacementValid,
} from "@/core/validation";

import type { Placement } from "@/core/types";

describe("validation", () => {
  describe("validatePlacements", () => {
    it("empty placements are valid", () => {
      const result = validatePlacements([], 3);

      expect(result.valid).toBe(true);

      expect(result.overlaps).toHaveLength(0);

      expect(result.outOfBounds).toHaveLength(0);
    });

    it("detects out-of-bounds placement", () => {
      const placements: Placement[] = [
        {
          piece: "L",

          orientation: { a: 0, b: 0, c: 0 },

          position: { x: 2, y: 0, z: 0 }, // L extends to x=4 which is out of bounds in 3x3x3
        },
      ];

      const result = validatePlacements(placements, 3);

      expect(result.outOfBounds.length).toBeGreaterThan(0);
    });

    it("detects overlapping placements", () => {
      const placements: Placement[] = [
        {
          piece: "V",

          orientation: { a: 0, b: 0, c: 0 },

          position: { x: 0, y: 0, z: 0 },
        },

        {
          piece: "T",

          orientation: { a: 0, b: 0, c: 0 },

          position: { x: 0, y: 0, z: 0 }, // Overlaps with V at (0,0,0) and (1,0,0)
        },
      ];

      const result = validatePlacements(placements, 3);

      expect(result.overlaps.length).toBeGreaterThan(0);
    });
  });

  describe("isPlacementValid", () => {
    it("first placement in empty grid is valid if in bounds", () => {
      const placement: Placement = {
        piece: "V",

        orientation: { a: 0, b: 0, c: 0 },

        position: { x: 0, y: 0, z: 0 },
      };

      expect(isPlacementValid([], placement, 3)).toBe(true);
    });

    it("rejects placement that overlaps existing", () => {
      const existing: Placement[] = [
        {
          piece: "V",

          orientation: { a: 0, b: 0, c: 0 },

          position: { x: 0, y: 0, z: 0 },
        },
      ];

      const newPlacement: Placement = {
        piece: "L",

        orientation: { a: 0, b: 0, c: 0 },

        position: { x: 0, y: 0, z: 0 }, // Overlaps
      };

      expect(isPlacementValid(existing, newPlacement, 3)).toBe(false);
    });
  });

  describe("isCubeSolved", () => {
    it("empty placements is not solved", () => {
      expect(isCubeSolved([])).toBe(false);
    });
  });
});
