import { describe, it, expect } from "vitest";

import { PIECE_OFFSETS } from "@/core/pieces";

import type { PieceName } from "@/core/types";

import { PIECE_NAMES } from "@/core/types";

describe("pieces", () => {
  it("defines exactly 7 pieces", () => {
    expect(PIECE_NAMES).toHaveLength(7);

    expect(Object.keys(PIECE_OFFSETS)).toHaveLength(7);
  });

  it("V has 3 cubelets", () => {
    expect(PIECE_OFFSETS.V).toHaveLength(3);
  });

  it("all non-V pieces have 4 cubelets", () => {
    const nonV: PieceName[] = ["L", "T", "Z", "A", "B", "P"];

    for (const name of nonV) {
      expect(PIECE_OFFSETS[name]).toHaveLength(4);
    }
  });

  it("total cubelets = 27", () => {
    let total = 0;

    for (const name of PIECE_NAMES) {
      total += PIECE_OFFSETS[name].length;
    }

    expect(total).toBe(27);
  });

  it("anchor is always at (0,0,0)", () => {
    for (const name of PIECE_NAMES) {
      const anchor = PIECE_OFFSETS[name][0]!;

      expect(anchor).toEqual({ x: 0, y: 0, z: 0 });
    }
  });

  it("no duplicate offsets within a piece", () => {
    for (const name of PIECE_NAMES) {
      const offsets = PIECE_OFFSETS[name];

      const keys = offsets.map((o) => `${o.x},${o.y},${o.z}`);

      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
