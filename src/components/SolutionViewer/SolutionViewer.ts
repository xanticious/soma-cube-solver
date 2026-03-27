import type { Placement } from '../../core/types';

import { parseSolution, serializeSolution } from '../../core/notation';

import { validatePlacements } from '../../core/validation';

import {
  createScene,
  renderPlacements,
  renderGrid,
  setCameraForGrid,
  type SceneContext,
} from '../Scene/Scene';

import styles from './SolutionViewer.module.css';

export interface SolutionViewerCallbacks {
  onBack(): void;
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

  let currentStep = placements.length; // Start fully assembled

  let sceneCtx: SceneContext | null = null;

  function getVisiblePlacements(): Placement[] {
    return placements!.slice(0, currentStep);
  }

  function getValidation() {
    const visible = getVisiblePlacements();

    const result = validatePlacements(visible, 3);

    const totalCells = visible.reduce((sum, p) => {
      // Count cells for each piece (V=3, rest=4)

      return sum + (p.piece === 'V' ? 3 : 4);
    }, 0);

    const isFull = result.valid && result.occupiedCells.size === 27;

    return { result, isFull, totalCells };
  }

  function renderUI() {
    const { result, isFull } = getValidation();

    const fullNotation = serializeSolution(placements!);

    const visibleNotation = serializeSolution(getVisiblePlacements());

    let validationHtml = '';

    if (currentStep === placements!.length) {
      if (isFull) {
        validationHtml = `<div class="${styles.validationBanner} ${styles.validationOk}">Valid solution — cube is complete</div>`;
      } else if (!result.valid) {
        const issues: string[] = [];

        if (result.overlaps.length > 0)
          issues.push(`${result.overlaps.length} overlap(s)`);

        if (result.outOfBounds.length > 0)
          issues.push(`${result.outOfBounds.length} out-of-bounds`);

        validationHtml = `<div class="${styles.validationBanner} ${styles.validationError}">Invalid: ${issues.join(', ')}</div>`;
      }
    }

    const toolbarHtml = `
      <div class="${styles.toolbar}">
        <button data-action="back">Back</button>
        <button data-action="prev" ${currentStep <= 0 ? 'disabled' : ''}>Prev</button>
        <span class="${styles.stepInfo}">${currentStep} / ${placements!.length}</span>
        <button data-action="next" ${currentStep >= placements!.length ? 'disabled' : ''}>Next</button>
        <button data-action="reset">Show All</button>
      </div>
    `;

    const notationHtml = `
      <div class="${styles.notationBar}">
        <span class="${styles.notationText}">${escapeHtml(currentStep === placements!.length ? fullNotation : visibleNotation)}</span>
        <button class="${styles.copyBtn}" data-action="copy">Copy</button>
      </div>
    `;

    // Only rebuild DOM structure if scene doesn't exist yet

    if (!sceneCtx) {
      container.innerHTML = `
        <div class="${styles.container}">
          ${toolbarHtml}
          ${validationHtml}
          <div class="${styles.sceneContainer}" data-scene></div>
          ${notationHtml}
        </div>
      `;

      const sceneContainer = container.querySelector(
        '[data-scene]',
      ) as HTMLElement;

      sceneCtx = createScene(sceneContainer);

      renderGrid(sceneCtx, 3);

      setCameraForGrid(sceneCtx, 3);
    } else {
      // Update toolbar and notation without rebuilding scene

      const wrapper = container.querySelector(`.${styles.container}`)!;

      const toolbar = wrapper.querySelector(`.${styles.toolbar}`);

      if (toolbar) toolbar.outerHTML = toolbarHtml;

      // Remove old validation banner

      const oldBanner = wrapper.querySelector(`.${styles.validationBanner}`);

      if (oldBanner) oldBanner.remove();

      // Insert new validation banner after toolbar

      if (validationHtml) {
        const newToolbar = wrapper.querySelector(`.${styles.toolbar}`)!;

        newToolbar.insertAdjacentHTML('afterend', validationHtml);
      }

      const notationBar = wrapper.querySelector(`.${styles.notationBar}`);

      if (notationBar) notationBar.outerHTML = notationHtml;
    }

    // Render cubelets

    renderPlacements(sceneCtx!, getVisiblePlacements());

    // Bind events

    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', handleAction);
    });
  }

  function handleAction(e: Event) {
    const action = (e.currentTarget as HTMLElement).dataset.action;

    switch (action) {
      case 'back':
        callbacks.onBack();

        break;

      case 'prev':
        if (currentStep > 0) {
          currentStep--;

          renderUI();
        }

        break;

      case 'next':
        if (currentStep < placements!.length) {
          currentStep++;

          renderUI();
        }

        break;

      case 'reset':
        currentStep = placements!.length;

        renderUI();

        break;

      case 'copy':
        navigator.clipboard.writeText(
          currentStep === placements!.length
            ? serializeSolution(placements!)
            : serializeSolution(getVisiblePlacements()),
        );

        break;
    }
  }

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
