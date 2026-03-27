import type { PieceName, Vec3 } from "./types";

/**
 * Piece definitions as cubelet offsets from the anchor (first entry = anchor at 0,0,0).
 *
 * Soma cube pieces:
 *   V — 3 cubelets (corner)
 *   L — 4 cubelets (L-shape, flat)
 *   T — 4 cubelets (T-shape, flat)
 *   Z — 4 cubelets (S/Z skew, flat)
 *   A — 4 cubelets (left-handed tricube + 1, non-planar)
 *   B — 4 cubelets (right-handed tricube + 1, non-planar, mirror of A)
 *   P — 4 cubelets (branch / right-angle + branch, non-planar)
 */

export const PIECE_OFFSETS: Record<PieceName, readonly Vec3[]> = {
  // Corner piece — three cubelets in an L on one plane

  //  X

  //  X X  (anchor at corner)

  V: [
    { x: 0, y: 0, z: 0 },

    { x: 1, y: 0, z: 0 },

    { x: 0, y: 1, z: 0 },
  ],

  // L-tetracube — row of 3 + 1 on end

  //  X

  //  X

  //  X X

  L: [
    { x: 0, y: 0, z: 0 },

    { x: 1, y: 0, z: 0 },

    { x: 2, y: 0, z: 0 },

    { x: 2, y: 1, z: 0 },
  ],

  // T-tetracube — row of 3 with branch in middle

  //  X X X

  //    X

  T: [
    { x: 0, y: 0, z: 0 },

    { x: 1, y: 0, z: 0 },

    { x: 2, y: 0, z: 0 },

    { x: 1, y: 1, z: 0 },
  ],

  // Z-tetracube (S/skew) — flat

  //  X X

  //    X X

  Z: [
    { x: 0, y: 0, z: 0 },

    { x: 1, y: 0, z: 0 },

    { x: 1, y: 1, z: 0 },

    { x: 2, y: 1, z: 0 },
  ],

  // A — left-handed screw (non-planar)

  //  Layer z=0:    Layer z=1:

  //   X X            X

  //   X

  A: [
    { x: 0, y: 0, z: 0 },

    { x: 1, y: 0, z: 0 },

    { x: 0, y: 1, z: 0 },

    { x: 0, y: 1, z: 1 },
  ],

  // B — right-handed screw (mirror of A, non-planar)

  //  Layer z=0:    Layer z=1:

  //   X X               X

  //     X

  B: [
    { x: 0, y: 0, z: 0 },

    { x: 1, y: 0, z: 0 },

    { x: 1, y: 1, z: 0 },

    { x: 1, y: 1, z: 1 },
  ],

  // P — branch (non-planar)

  //  Layer z=0:    Layer z=1:

  //   X X           X

  //   X

  P: [
    { x: 0, y: 0, z: 0 },

    { x: 1, y: 0, z: 0 },

    { x: 0, y: 1, z: 0 },

    { x: 0, y: 0, z: 1 },
  ],
};

/** Piece colors — Lego-inspired child-friendly palette */

export const PIECE_COLORS: Record<PieceName, string> = {
  V: "#CC0000", // Bright Red

  L: "#FFD700", // Bright Yellow

  T: "#0057A8", // Bright Blue

  Z: "#00A550", // Bright Green

  A: "#FF6E00", // Bright Orange

  B: "#9B27AF", // Bright Purple

  P: "#E8E8E8", // Light Gray
};
