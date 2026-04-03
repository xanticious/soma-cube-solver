import type {
  PieceName,
  Placement,
  RotationStep,
  PieceArea,
} from '../../core/types';
import {
  PIECE_NAMES,
  GRID_SIZE_BUILDER,
  BUILDER_STAGING_GAP,
} from '../../core/types';
import { PIECE_COLORS } from '../../core/pieces';
import { parseSolution, serializeSolution } from '../../core/notation';
import {
  createScene,
  renderPlacements,
  renderDualGrids,
  renderDualGridLabels,
  setCameraForDualGrids,
  type SceneContext,
} from '../Scene/Scene';
import styles from './BuilderView.module.css';

interface PieceState {
  area: PieceArea;
  orientation: { a: RotationStep; b: RotationStep; c: RotationStep };
  position: { x: number; y: number; z: number };
}

interface BuilderState {
  pieces: Record<PieceName, PieceState>;
  selectedPiece: PieceName | null;
}

export interface BuilderViewCallbacks {
  onGoHome(): void;
}

const ROTATION_OPTIONS: RotationStep[] = [0, 1, 2, 3];
const POSITION_OPTIONS = [0, 1, 2];

function defaultPieceState(): PieceState {
  return {
    area: 'hidden',
    orientation: { a: 0, b: 0, c: 0 },
    position: { x: 0, y: 0, z: 0 },
  };
}

function buildInitialState(
  solutionNotation: string | null,
  stagingNotation: string | null,
): BuilderState {
  const pieces = {} as Record<PieceName, PieceState>;
  for (const name of PIECE_NAMES) {
    pieces[name] = defaultPieceState();
  }

  // Solution placements take priority
  const solutionPieces = new Set<PieceName>();
  if (solutionNotation) {
    const parsed = parseSolution(solutionNotation);
    if (parsed) {
      for (const p of parsed) {
        pieces[p.piece] = {
          area: 'solution',
          orientation: { ...p.orientation },
          position: { ...p.position },
        };
        solutionPieces.add(p.piece);
      }
    }
  }

  // Staging placements (ignored if piece already in solution)
  if (stagingNotation) {
    const parsed = parseSolution(stagingNotation);
    if (parsed) {
      for (const p of parsed) {
        if (solutionPieces.has(p.piece)) continue;
        pieces[p.piece] = {
          area: 'staging',
          orientation: { ...p.orientation },
          position: { ...p.position },
        };
      }
    }
  }

  return { pieces, selectedPiece: null };
}

/** Convert piece state to a Placement with an X offset for the staging grid. */
function toPlacement(piece: PieceName, ps: PieceState): Placement {
  const xOffset =
    ps.area === 'staging' ? GRID_SIZE_BUILDER + BUILDER_STAGING_GAP : 0;
  return {
    piece,
    orientation: { ...ps.orientation },
    position: {
      x: ps.position.x + xOffset,
      y: ps.position.y,
      z: ps.position.z,
    },
  };
}

export function createBuilderView(
  container: HTMLElement,
  initialNotation: string | null,
  initialStagingNotation: string | null,
  callbacks: BuilderViewCallbacks,
): { destroy(): void } {
  let sceneCtx: SceneContext | null = null;

  const state: BuilderState = buildInitialState(
    initialNotation,
    initialStagingNotation,
  );

  function getVisiblePlacements(): Placement[] {
    const result: Placement[] = [];
    for (const name of PIECE_NAMES) {
      const ps = state.pieces[name];
      if (ps.area !== 'hidden') {
        result.push(toPlacement(name, ps));
      }
    }
    return result;
  }

  function getSolutionPlacements(): Placement[] {
    const result: Placement[] = [];
    for (const name of PIECE_NAMES) {
      const ps = state.pieces[name];
      if (ps.area === 'solution') {
        result.push({
          piece: name,
          orientation: { ...ps.orientation },
          position: { ...ps.position },
        });
      }
    }
    return result;
  }

  function getStagingPlacements(): Placement[] {
    const result: Placement[] = [];
    for (const name of PIECE_NAMES) {
      const ps = state.pieces[name];
      if (ps.area === 'staging') {
        result.push({
          piece: name,
          orientation: { ...ps.orientation },
          position: { ...ps.position },
        });
      }
    }
    return result;
  }

  function updateScene() {
    if (!sceneCtx) return;
    renderPlacements(sceneCtx, getVisiblePlacements());
    updateNotationBar();
    updateUrl();
  }

  function updateNotationBar() {
    const solutionPlacements = getSolutionPlacements();
    const solutionStr =
      solutionPlacements.length > 0
        ? serializeSolution(solutionPlacements)
        : '(empty)';
    const notationEl = container.querySelector(`.${styles.notation}`);
    if (notationEl) {
      notationEl.textContent = solutionStr;
    }
  }

  function updateUrl() {
    const solutionPlacements = getSolutionPlacements();
    const stagingPlacements = getStagingPlacements();

    const parts: string[] = [];
    if (solutionPlacements.length > 0) {
      parts.push(`notation=${serializeSolution(solutionPlacements)}`);
    }
    if (stagingPlacements.length > 0) {
      parts.push(`stagingAreaNotation=${serializeSolution(stagingPlacements)}`);
    }

    const hash = parts.length > 0 ? `#${parts.join('&')}` : '';
    window.history.replaceState(null, '', `/build${hash}`);
  }

  function radioGroup(
    groupName: string,
    options: { value: string; label: string }[],
    selected: string,
  ): string {
    return options
      .map(
        (o) =>
          `<label class="${styles.radioLabel}"><input type="radio" name="${groupName}" value="${o.value}" ${o.value === selected ? 'checked' : ''} />${o.label}</label>`,
      )
      .join('');
  }

  function renderFormPanel(): string {
    if (!state.selectedPiece) {
      return `<div class="${styles.formPanel}"><p class="${styles.formEmpty}">Click a piece to configure it</p></div>`;
    }

    const piece = state.selectedPiece;
    const ps = state.pieces[piece];

    const areaOptions = [
      { value: 'hidden', label: 'Hidden' },
      { value: 'staging', label: 'Staging Area' },
      { value: 'solution', label: 'Solution Area' },
    ];

    const posOptions = POSITION_OPTIONS.map((v) => ({
      value: String(v),
      label: String(v),
    }));

    const rotOptions = ROTATION_OPTIONS.map((v) => ({
      value: String(v),
      label: `${v} (${v * 90}°)`,
    }));

    return `
      <div class="${styles.formPanel}">
        <div class="${styles.formHeader}">
          <span class="${styles.colorSwatch}" style="background:${PIECE_COLORS[piece]}"></span>
          <strong>Piece ${piece}</strong>
        </div>
        <fieldset class="${styles.formFieldset}">
          <legend>Area</legend>
          <div class="${styles.radioGroup}" data-field="area">
            ${radioGroup(`area-${piece}`, areaOptions, ps.area)}
          </div>
        </fieldset>
        <fieldset class="${styles.formFieldset}">
          <legend>Position</legend>
          <div class="${styles.formField}">
            <span class="${styles.formLabel}">X</span>
            <div class="${styles.radioGroup}" data-field="pos-x">
              ${radioGroup(`pos-x-${piece}`, posOptions, String(ps.position.x))}
            </div>
          </div>
          <div class="${styles.formField}">
            <span class="${styles.formLabel}">Y</span>
            <div class="${styles.radioGroup}" data-field="pos-y">
              ${radioGroup(`pos-y-${piece}`, posOptions, String(ps.position.y))}
            </div>
          </div>
          <div class="${styles.formField}">
            <span class="${styles.formLabel}">Z</span>
            <div class="${styles.radioGroup}" data-field="pos-z">
              ${radioGroup(`pos-z-${piece}`, posOptions, String(ps.position.z))}
            </div>
          </div>
        </fieldset>
        <fieldset class="${styles.formFieldset}">
          <legend>Rotation</legend>
          <div class="${styles.formField}">
            <span class="${styles.formLabel}">A (Pitch)</span>
            <div class="${styles.radioGroup}" data-field="rot-a">
              ${radioGroup(`rot-a-${piece}`, rotOptions, String(ps.orientation.a))}
            </div>
          </div>
          <div class="${styles.formField}">
            <span class="${styles.formLabel}">B (Yaw)</span>
            <div class="${styles.radioGroup}" data-field="rot-b">
              ${radioGroup(`rot-b-${piece}`, rotOptions, String(ps.orientation.b))}
            </div>
          </div>
          <div class="${styles.formField}">
            <span class="${styles.formLabel}">C (Roll)</span>
            <div class="${styles.radioGroup}" data-field="rot-c">
              ${radioGroup(`rot-c-${piece}`, rotOptions, String(ps.orientation.c))}
            </div>
          </div>
        </fieldset>
      </div>`;
  }

  function renderUI() {
    const solutionPlacements = getSolutionPlacements();
    const notationStr =
      solutionPlacements.length > 0
        ? serializeSolution(solutionPlacements)
        : '(empty)';

    const pieceBtns = PIECE_NAMES.map((name) => {
      const active = state.selectedPiece === name;
      const ps = state.pieces[name];
      const visible = ps.area !== 'hidden';
      let cls = styles.pieceBtn;
      if (active) cls += ` ${styles.pieceBtnActive}`;
      if (visible) cls += ` ${styles.pieceBtnVisible}`;
      const areaLabel =
        ps.area === 'solution' ? 'S' : ps.area === 'staging' ? 'T' : '';
      return `
        <button class="${cls}" data-piece="${name}">
          <span class="${styles.colorSwatch}" style="background:${PIECE_COLORS[name]}"></span>
          ${name}
          ${visible ? `<span class="${styles.visibleIndicator}">${areaLabel}</span>` : ''}
        </button>`;
    }).join('');

    if (!sceneCtx) {
      container.innerHTML = `
        <div class="${styles.container}">
          <div class="${styles.sidebar}">
            <div class="${styles.sidebarActions}">
              <button data-action="home">Home</button>
              <button data-action="reset">Reset All</button>
            </div>
            <p class="${styles.sidebarTitle}">Pieces</p>
            <div class="${styles.pieceList}">${pieceBtns}</div>
            ${renderFormPanel()}
          </div>
          <div class="${styles.main}">
            <div class="${styles.sceneContainer}" data-scene></div>
            <div class="${styles.statusBar}">
              <span class="${styles.notation}">${escapeHtml(notationStr)}</span>
              <button class="${styles.copyBtn}" data-action="copy">Copy</button>
            </div>
          </div>
        </div>`;

      const sceneContainer = container.querySelector(
        '[data-scene]',
      ) as HTMLElement;
      sceneCtx = createScene(sceneContainer);
      renderDualGrids(sceneCtx, GRID_SIZE_BUILDER, BUILDER_STAGING_GAP);
      renderDualGridLabels(sceneCtx, GRID_SIZE_BUILDER, BUILDER_STAGING_GAP);
      setCameraForDualGrids(sceneCtx, GRID_SIZE_BUILDER, BUILDER_STAGING_GAP);
    } else {
      const pieceList = container.querySelector(`.${styles.pieceList}`);
      if (pieceList) {
        pieceList.innerHTML = pieceBtns;
      }
      const oldFormPanel = container.querySelector(`.${styles.formPanel}`);
      if (oldFormPanel) {
        oldFormPanel.outerHTML = renderFormPanel();
      }
    }

    updateScene();
    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('[data-piece]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const piece = (btn as HTMLElement).dataset.piece as PieceName;
        state.selectedPiece = piece;
        renderUI();
      });
    });

    container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'reset') {
          for (const name of PIECE_NAMES) {
            state.pieces[name] = defaultPieceState();
          }
          state.selectedPiece = null;
          renderUI();
        } else if (action === 'home') {
          callbacks.onGoHome();
        } else if (action === 'copy') {
          const solutionPlacements = getSolutionPlacements();
          if (solutionPlacements.length > 0) {
            navigator.clipboard.writeText(
              serializeSolution(solutionPlacements),
            );
          }
        }
      });
    });

    // Area radio buttons
    const areaGroup = container.querySelector('[data-field="area"]');
    if (areaGroup && state.selectedPiece) {
      const piece = state.selectedPiece;
      areaGroup.querySelectorAll('input[type=radio]').forEach((radio) => {
        radio.addEventListener('change', () => {
          const value = (radio as HTMLInputElement).value as PieceArea;
          state.pieces[piece].area = value;
          renderUI();
        });
      });
    }

    // Position radio buttons
    for (const axis of ['x', 'y', 'z'] as const) {
      const group = container.querySelector(`[data-field="pos-${axis}"]`);
      if (group && state.selectedPiece) {
        const piece = state.selectedPiece;
        group.querySelectorAll('input[type=radio]').forEach((radio) => {
          radio.addEventListener('change', () => {
            const value = parseInt((radio as HTMLInputElement).value, 10);
            state.pieces[piece].position = {
              ...state.pieces[piece].position,
              [axis]: value,
            };
            updateScene();
          });
        });
      }
    }

    // Rotation radio buttons
    for (const axis of ['a', 'b', 'c'] as const) {
      const group = container.querySelector(`[data-field="rot-${axis}"]`);
      if (group && state.selectedPiece) {
        const piece = state.selectedPiece;
        group.querySelectorAll('input[type=radio]').forEach((radio) => {
          radio.addEventListener('change', () => {
            const value = parseInt(
              (radio as HTMLInputElement).value,
              10,
            ) as RotationStep;
            state.pieces[piece].orientation = {
              ...state.pieces[piece].orientation,
              [axis]: value,
            };
            updateScene();
          });
        });
      }
    }
  }

  // Initial render
  renderUI();

  return {
    destroy() {
      sceneCtx?.dispose();
      sceneCtx = null;
      container.innerHTML = '';
    },
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
