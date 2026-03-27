import { describe, it, expect } from "vitest";

import {
  serializePlacement,
  parsePlacement,
  serializeSolution,
  parseSolution,
} from "@/core/notation";

import type { Placement } from "@/core/types";

describe("notation", () => {
  const samplePlacement: Placement = {
    piece: "V",

    orientation: { a: 0, b: 2, c: 1 },

    position: { x: 1, y: 0, z: 2 },
  };

  describe("serializePlacement", () => {
    it("serializes correctly", () => {
      const result = serializePlacement(samplePlacement);

      expect(result).toBe("V021.1.0.2");
    });
  });

  describe("parsePlacement", () => {
    it("parses a valid token", () => {
      const result = parsePlacement("V021.1.0.2");

      expect(result).toEqual(samplePlacement);
    });

    it("returns null for invalid piece name", () => {
      expect(parsePlacement("X000.0.0.0")).toBeNull();
    });

    it("returns null for invalid rotation step", () => {
      expect(parsePlacement("V500.0.0.0")).toBeNull();
    });

    it("returns null for garbage", () => {
      expect(parsePlacement("not-a-placement")).toBeNull();
    });

    it("allows negative coordinates", () => {
      const result = parsePlacement("L100.-1.0.-2");

      expect(result).not.toBeNull();

      expect(result!.position).toEqual({ x: -1, y: 0, z: -2 });
    });
  });

  describe("serializeSolution / parseSolution", () => {
    it("round-trips", () => {
      const placements: Placement[] = [
        {
          piece: "V",
          orientation: { a: 0, b: 0, c: 0 },
          position: { x: 0, y: 0, z: 0 },
        },

        {
          piece: "L",
          orientation: { a: 1, b: 2, c: 0 },
          position: { x: 1, y: 0, z: 2 },
        },
      ];

      const str = serializeSolution(placements);

      const parsed = parseSolution(str);

      expect(parsed).toEqual(placements);
    });

    it("returns null for invalid notation", () => {
      expect(parseSolution("garbage~more-garbage")).toBeNull();
    });
  });
});
