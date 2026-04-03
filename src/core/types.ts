/**
 * A 3D integer coordinate.
 */

export interface Vec3 {
  x: number;

  y: number;

  z: number;
}

/**
 * Rotation values: 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°.
 */

export type RotationStep = 0 | 1 | 2 | 3;

/**
 * Orientation described by yaw (a/Z), pitch (b/X), roll (c/Y).
 */

export interface Orientation {
  a: RotationStep;

  b: RotationStep;

  c: RotationStep;
}

/**
 * A placed piece in the grid.
 */

export interface Placement {
  piece: PieceName;

  orientation: Orientation;

  position: Vec3;
}

export const PIECE_NAMES = ["V", "L", "T", "Z", "A", "B", "P"] as const;

export type PieceName = (typeof PIECE_NAMES)[number];

export const GRID_SIZE_SOLVER = 3;

export const GRID_SIZE_BUILDER = 3;

/**
 * Gap (in cubelet units) between staging and solution grids in builder mode.
 */
export const BUILDER_STAGING_GAP = 2;

export type PieceArea = "hidden" | "staging" | "solution";
