import type {
  Orientation,
  PieceName,
  Placement,
  RotationStep,
} from '../../core/types';

import { PIECE_NAMES, GRID_SIZE_BUILDER } from '../../core/types';

import { PIECE_COLORS } from '../../core/pieces';

import { parseSolution, serializeSolution } from '../../core/notation';

import { isPlacementValid } from '../../core/validation';

import {
  createScene,
  renderPlacements,
  renderFloatingPiece,
  clearFloatingPieces,
  renderGrid,
  setCameraForGrid,
  type SceneContext,
} from '../Scene/Scene';

import styles from './BuilderView.module.css';

type PlacementPhase = 'idle' | 'selectLayer' | 'selectColumn' | 'selectRow';

interface BuilderState {
  placements: Placement[];

  usedPieces: Set<PieceName>;

  selectedPiece: PieceName | null;

  orientation: Orientation;

  phase: PlacementPhase;

  selectedLayer: number;

  selectedColumn: number;
}

export interface BuilderViewCallbacks {
  onBack(): void;
}

export function createBuilderView(
  container: HTMLElement,

  initialNotation: string | null,

  callbacks: BuilderViewCallbacks,
): { destroy(): void } {
  let sceneCtx: SceneContext | null = null;

  const state: BuilderState = {
    placements: [],

    usedPieces: new Set(),

    selectedPiece: null,

    orientation: { a: 0, b: 0, c: 0 },

    phase: 'idle',

    selectedLayer: 0,

    selectedColumn: 0,
  };

  // Parse initial notation if provided

  if (initialNotation) {
    const parsed = parseSolution(initialNotation);

    if (parsed) {
      state.placements = parsed;

      for (const p of parsed) {
        state.usedPieces.add(p.piece);
      }
    }
  }

  function nextRotationStep(step: RotationStep): RotationStep {
    return ((step + 1) % 4) as RotationStep;
  }

  function getPhasePrompt(): string {
    switch (state.phase) {
      case 'idle':
        return 'Select a piece from the palette';

      case 'selectLayer':
        return 'Click to select Layer (Y)';

      case 'selectColumn':
        return `Layer ${state.selectedLayer} — Click to select Column (X)`;

      case 'selectRow':
        return `Layer ${state.selectedLayer}, Col ${state.selectedColumn} — Click to select Row (Z)`;
    }
  }

  function renderUI() {
    const notationStr =
      state.placements.length > 0
        ? serializeSolution(state.placements)
        : '(empty)';

    const pieceBtns = PIECE_NAMES.map((name) => {
      const used = state.usedPieces.has(name);

      const active = state.selectedPiece === name;

      let cls = styles.pieceBtn;

      if (active) cls += ` ${styles.pieceBtnActive}`;

      if (used) cls += ` ${styles.pieceBtnUsed}`;

      return `
        <button class="${cls}" data-piece="${name}" ${used ? 'disabled' : ''}>
          <span class="${styles.colorSwatch}" style="background:${PIECE_COLORS[name]}"></span>
          ${name}
        </button>
      `;
    }).join('');

    if (!sceneCtx) {
      container.innerHTML = `
        <div class="${styles.container}">
          <div class="${styles.sidebar}">
            <p class="${styles.sidebarTitle}">Pieces</p>
            ${pieceBtns}
            <div class="${styles.sidebarActions}">
              <button data-action="reset">Reset All</button>
              <button data-action="back">Back to Browser</button>
            </div>
          </div>
          <div class="${styles.main}">
            <div class="${styles.toolbar}">
              <span class="${styles.clickPrompt}">${getPhasePrompt()}</span>
              <span class="${styles.orientationInfo}">
                ${state.selectedPiece ? `a=${state.orientation.a} b=${state.orientation.b} c=${state.orientation.c}` : ''}
              </span>
              <span>Rotate: <kbd>A</kbd> yaw <kbd>B</kbd> pitch <kbd>C</kbd> roll — <kbd>Esc</kbd> cancel</span>
            </div>
            <div class="${styles.sceneContainer}" data-scene></div>
            <div class="${styles.statusBar}">
              <span class="${styles.notation}">${escapeHtml(notationStr)}</span>
              <button class="${styles.copyBtn}" data-action="copy">Copy</button>
            </div>
          </div>
        </div>
      `;

      const sceneContainer = container.querySelector(
        '[data-scene]',
      ) as HTMLElement;

      sceneCtx = createScene(sceneContainer);

      renderGrid(sceneCtx, GRID_SIZE_BUILDER);

      setCameraForGrid(sceneCtx, GRID_SIZE_BUILDER);
    } else {
      // Update sidebar

      const sidebar = container.querySelector(`.${styles.sidebar}`);

      if (sidebar) {
        const title = sidebar.querySelector(`.${styles.sidebarTitle}`);

        const actions = sidebar.querySelector(`.${styles.sidebarActions}`);

        if (title && actions) {
          // Replace piece buttons

          const btns = sidebar.querySelectorAll(`.${styles.pieceBtn}`);

          btns.forEach((b) => b.remove());

          title.insertAdjacentHTML('afterend', pieceBtns);
        }
      }

      // Update toolbar

      const toolbar = container.querySelector(`.${styles.toolbar}`);

      if (toolbar) {
        toolbar.innerHTML = `
          <span class="${styles.clickPrompt}">${getPhasePrompt()}</span>
          <span class="${styles.orientationInfo}">
            ${state.selectedPiece ? `a=${state.orientation.a} b=${state.orientation.b} c=${state.orientation.c}` : ''}
          </span>
          <span>Rotate: <kbd>A</kbd> yaw <kbd>B</kbd> pitch <kbd>C</kbd> roll — <kbd>Esc</kbd> cancel</span>
        `;
      }

      // Update notation

      const notationEl = container.querySelector(`.${styles.notation}`);

      if (notationEl) {
        notationEl.textContent = notationStr;
      }
    }

    // Render placed pieces

    renderPlacements(sceneCtx!, state.placements);

    // Render floating piece if one is selected

    if (state.selectedPiece && state.phase !== 'idle') {
      const previewPos = {
        x:
          state.phase === 'selectLayer'
            ? 4
            : state.phase === 'selectColumn'
              ? 4
              : state.selectedColumn,

        y: state.phase === 'selectLayer' ? 4 : state.selectedLayer,

        z: state.phase === 'selectRow' ? 4 : 0,
      };

      renderFloatingPiece(
        sceneCtx!,

        state.selectedPiece,

        state.orientation,

        previewPos,
      );
    }

    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('[data-piece]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const piece = (btn as HTMLElement).dataset.piece as PieceName;

        selectPiece(piece);
      });
    });

    container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;

        if (action === 'reset') {
          state.placements = [];

          state.usedPieces.clear();

          state.selectedPiece = null;

          state.phase = 'idle';

          state.orientation = { a: 0, b: 0, c: 0 };

          renderUI();
        } else if (action === 'back') {
          callbacks.onBack();
        } else if (action === 'copy') {
          if (state.placements.length > 0) {
            navigator.clipboard.writeText(serializeSolution(state.placements));
          }
        }
      });
    });
  }

  function selectPiece(piece: PieceName) {
    if (state.usedPieces.has(piece)) return;

    state.selectedPiece = piece;

    state.orientation = { a: 0, b: 0, c: 0 };

    state.phase = 'selectLayer';

    renderUI();
  }

  function handleSceneClick() {
    if (!state.selectedPiece) return;

    switch (state.phase) {
      case 'selectLayer':
        // Cycle through layers 0..8

        state.selectedLayer = (state.selectedLayer + 1) % GRID_SIZE_BUILDER;

        state.phase = 'selectColumn';

        renderUI();

        break;

      case 'selectColumn':
        state.selectedColumn = (state.selectedColumn + 1) % GRID_SIZE_BUILDER;

        state.phase = 'selectRow';

        renderUI();

        break;

      case 'selectRow': {
        // For now, cycle through rows; in a full implementation we'd use raycasting

        const row = 0; // Will be replaced by actual click-based selection

        const placement: Placement = {
          piece: state.selectedPiece,

          orientation: { ...state.orientation },

          position: {
            x: state.selectedColumn,

            y: state.selectedLayer,

            z: row,
          },
        };

        if (isPlacementValid(state.placements, placement, GRID_SIZE_BUILDER)) {
          state.placements.push(placement);

          state.usedPieces.add(state.selectedPiece);

          state.selectedPiece = null;

          state.phase = 'idle';

          // Update URL

          updateUrl();
        }

        renderUI();

        break;
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!state.selectedPiece) return;

    switch (e.key.toLowerCase()) {
      case 'a':
        state.orientation = {
          ...state.orientation,

          a: nextRotationStep(state.orientation.a),
        };

        clearFloatingPieces(sceneCtx!);

        renderUI();

        break;

      case 'b':
        state.orientation = {
          ...state.orientation,

          b: nextRotationStep(state.orientation.b),
        };

        clearFloatingPieces(sceneCtx!);

        renderUI();

        break;

      case 'c':
        state.orientation = {
          ...state.orientation,

          c: nextRotationStep(state.orientation.c),
        };

        clearFloatingPieces(sceneCtx!);

        renderUI();

        break;

      case 'escape':
        state.selectedPiece = null;

        state.phase = 'idle';

        clearFloatingPieces(sceneCtx!);

        renderUI();

        break;
    }
  }

  // Layer/column/row selection via number keys (0-8)

  function handleNumberKey(e: KeyboardEvent) {
    const num = parseInt(e.key, 10);

    if (isNaN(num) || num < 0 || num > 8) return;

    if (!state.selectedPiece) return;

    switch (state.phase) {
      case 'selectLayer':
        state.selectedLayer = num;

        state.phase = 'selectColumn';

        renderUI();

        break;

      case 'selectColumn':
        state.selectedColumn = num;

        state.phase = 'selectRow';

        renderUI();

        break;

      case 'selectRow': {
        const placement: Placement = {
          piece: state.selectedPiece,

          orientation: { ...state.orientation },

          position: {
            x: state.selectedColumn,

            y: state.selectedLayer,

            z: num,
          },
        };

        if (isPlacementValid(state.placements, placement, GRID_SIZE_BUILDER)) {
          state.placements.push(placement);

          state.usedPieces.add(state.selectedPiece);

          state.selectedPiece = null;

          state.phase = 'idle';

          updateUrl();
        }

        renderUI();

        break;
      }
    }
  }

  function updateUrl() {
    if (state.placements.length > 0) {
      const notation = serializeSolution(state.placements);

      const url = new URL(window.location.href);

      url.pathname = '/build';

      url.searchParams.set('notation', notation);

      window.history.replaceState(null, '', url.toString());
    }
  }

  function onKeydown(e: KeyboardEvent) {
    handleKeydown(e);

    handleNumberKey(e);
  }

  document.addEventListener('keydown', onKeydown);

  // Initial render

  renderUI();

  // Set up scene click handler

  const sceneEl = container.querySelector('[data-scene]');

  if (sceneEl) {
    sceneEl.addEventListener('click', handleSceneClick);
  }

  return {
    destroy() {
      document.removeEventListener('keydown', onKeydown);

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
