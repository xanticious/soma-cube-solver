export { PIECE_OFFSETS, PIECE_COLORS } from './pieces';

export {
  applyOrientation,
  transformOffsets,
  normalizePositions,
  DISTINCT_ORIENTATIONS,
  distinctPieceOrientations,
} from './rotations';

export {
  serializePlacement,
  parsePlacement,
  serializeSolution,
  parseSolution,
} from './notation';

export {
  validatePlacements,
  isCubeSolved,
  isPlacementValid,
} from './validation';

export {
  solveAll,
  filterDistinctSolutions,
  solutionCanonicalKey,
  solutionCanonicalKeyUnderRotation,
  computeAllVariants,
  groupVariantsByPiece,
  gridIndex,
  tryPlace,
} from './solver';

export type { PieceVariant } from './solver';

export {
  PIECE_NAMES,
  GRID_SIZE_SOLVER,
  GRID_SIZE_BUILDER,
  BUILDER_STAGING_GAP,
} from './types';

export type {
  Vec3,
  RotationStep,
  Orientation,
  Placement,
  PieceName,
  PieceArea,
} from './types';
