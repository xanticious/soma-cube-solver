import type { PieceName, Placement } from '../../core/types';
import { PIECE_NAMES } from '../../core/types';
import { PIECE_COLORS } from '../../core/pieces';
import { parseSolution, serializeSolution } from '../../core/notation';
import {
  createScene,
  renderPlacements,
  renderGrid,
  setCameraForGrid,
  type SceneContext,
} from '../Scene/Scene';
import solutionsData from '../../data/solutions.json';
import styles from './SolutionViewer.module.css';

interface SolutionEntry {
  notation: string;
  distinct: boolean;
  canonical: string;
}

const allSolutionsData = solutionsData as SolutionEntry[];

export interface SolutionViewerCallbacks {
  onBackToList(): void;
  onGoHome(): void;
}

export function createSolutionViewer(
  container: HTMLElement,
  notation: string,
  callbacks: SolutionViewerCallbacks,
): { destroy(): void } {
  const placements = parseSolution(notation);

  if (!placements || placements.length === 0) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#c62828;">Invalid notation string.</div>`;
    return {
      destroy() {
        container.innerHTML = '';
      },
    };
  }

  const placementMap = new Map<PieceName, Placement>();
  for (const p of placements) {
    placementMap.set(p.piece, p);
  }

  // Only pieces present in this solution, in canonical order
  const solutionPieces: PieceName[] = PIECE_NAMES.filter((n) =>
    placementMap.has(n),
  );

  // All pieces visible by default
  const hiddenPieces = new Set<PieceName>();

  let sceneCtx: SceneContext | null = null;

  const fullNotation = serializeSolution(placements);

  // Look up this solution in the pre-computed data to get canonical info.
  const entry = allSolutionsData.find((s) => s.notation === fullNotation);
  const canonicalIndex = entry
    ? allSolutionsData.findIndex((s) => s.notation === entry.canonical) + 1
    : null;

  function getVisiblePlacements(): Placement[] {
    return solutionPieces
      .filter((n) => !hiddenPieces.has(n))
      .map((n) => placementMap.get(n)!);
  }

  function pieceListHtml(): string {
    return solutionPieces
      .map((name) => {
        const hidden = hiddenPieces.has(name);
        return `<div class="${styles.pieceRow}${hidden ? ` ${styles.pieceRowHidden}` : ''}">
          <span class="${styles.colorSwatch}" style="background:${PIECE_COLORS[name]}"></span>
          <span class="${styles.pieceName}">${name}</span>
          <button class="${styles.toggleBtn}" data-toggle="${name}">${hidden ? 'Show' : 'Hide'}</button>
        </div>`;
      })
      .join('');
  }

  function canonicalInfoHtml(): string {
    if (!entry) return '';
    if (entry.distinct) {
      return `<div class="${styles.canonicalInfo}">
        <span class="${styles.distinctBadge}">One of 240 Distinct Solutions</span>
      </div>`;
    }
    const url = `#view=visualize&notation=${entry.canonical}`;
    return `<div class="${styles.canonicalInfo}">
      <p class="${styles.canonicalLabel}">Rotation / reflection of:</p>
      <a class="${styles.canonicalLink}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">#${canonicalIndex}&nbsp;${escapeHtml(entry.canonical)}</a>
    </div>`;
  }

  function updatePieceList() {
    const el = container.querySelector('[data-piece-list]');
    if (el) el.innerHTML = pieceListHtml();
  }

  function handleClick(e: MouseEvent) {
    const btn = (e.target as HTMLElement).closest(
      '[data-action],[data-toggle]',
    ) as HTMLElement | null;
    if (!btn) return;

    const toggle = btn.dataset.toggle as PieceName | undefined;
    if (toggle) {
      if (hiddenPieces.has(toggle)) hiddenPieces.delete(toggle);
      else hiddenPieces.add(toggle);
      updatePieceList();
      renderPlacements(sceneCtx!, getVisiblePlacements());
      return;
    }

    switch (btn.dataset.action) {
      case 'home':
        callbacks.onGoHome();
        break;
      case 'back':
        callbacks.onBackToList();
        break;
      case 'show-all':
        hiddenPieces.clear();
        updatePieceList();
        renderPlacements(sceneCtx!, getVisiblePlacements());
        break;
      case 'hide-all':
        for (const n of solutionPieces) hiddenPieces.add(n);
        updatePieceList();
        renderPlacements(sceneCtx!, getVisiblePlacements());
        break;
      case 'copy':
        navigator.clipboard.writeText(fullNotation);
        break;
    }
  }

  container.addEventListener('click', handleClick);

  // Initial render
  container.innerHTML = `
    <div class="${styles.container}">
      <div class="${styles.sidebar}">
        <div class="${styles.sidebarHeader}">
          <button data-action="home">Home</button>
          <button data-action="back">Back to List</button>
        </div>
        ${canonicalInfoHtml()}
        <div class="${styles.bulkActions}">
          <button data-action="show-all">Show All</button>
          <button data-action="hide-all">Hide All</button>
        </div>
        <div class="${styles.pieceList}" data-piece-list>${pieceListHtml()}</div>
      </div>
      <div class="${styles.main}">
        <div class="${styles.sceneContainer}" data-scene></div>
        <div class="${styles.notationBar}">
          <span class="${styles.notationText}">${escapeHtml(fullNotation)}</span>
          <button class="${styles.copyBtn}" data-action="copy">Copy</button>
        </div>
      </div>
    </div>`;

  const sceneContainer = container.querySelector('[data-scene]') as HTMLElement;
  sceneCtx = createScene(sceneContainer, () => {
    if (sceneCtx) setCameraForGrid(sceneCtx, 3);
  });
  renderGrid(sceneCtx, 3);
  setCameraForGrid(sceneCtx, 3);
  renderPlacements(sceneCtx, getVisiblePlacements());

  return {
    destroy() {
      container.removeEventListener('click', handleClick);
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
