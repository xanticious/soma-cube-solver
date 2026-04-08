import { PIECE_COLORS, PIECE_OFFSETS } from '../../core/pieces';

import { PIECE_NAMES } from '../../core/types';

import type { PieceName } from '../../core/types';

import {
  createScene,
  renderPlacements,
  renderGrid,
  type SceneContext,
} from '../Scene/Scene';

import styles from './HomePage.module.css';

export interface HomePageCallbacks {
  onGoToSolutions(): void;

  onGoToBuilder(): void;

  onGoToConverter(): void;
}

// Piece descriptions shown under each preview

const PIECE_DESCRIPTIONS: Record<PieceName, string> = {
  V: 'tricube (3 cubelets)',

  L: 'L-tetracube',

  T: 'T-tetracube',

  Z: 'Z-tetracube (skew)',

  A: 'left-handed screw',

  B: 'right-handed screw',

  P: 'branch',
};

function createPiecePreviewScene(
  container: HTMLElement,

  piece: PieceName,
): SceneContext {
  const ctx = createScene(container);

  renderGrid(ctx, 3);

  renderPlacements(ctx, [
    {
      piece,

      orientation: { a: 0, b: 0, c: 0 },

      position: { x: 0, y: 0, z: 0 },
    },
  ]);

  // Compute bounding box of the piece to center the camera

  const offsets = PIECE_OFFSETS[piece];

  const maxX = Math.max(...offsets.map((o) => o.x));

  const maxY = Math.max(...offsets.map((o) => o.y));

  const maxZ = Math.max(...offsets.map((o) => o.z));

  const cx = maxX / 2;

  const cy = maxY / 2;

  const cz = maxZ / 2;

  const dist = 3.8;

  ctx.controls.target.set(cx, cy, cz);

  ctx.camera.position.set(cx + dist, cy + dist * 0.8, cz + dist);

  ctx.controls.update();

  return ctx;
}

export function createHomePage(
  container: HTMLElement,

  callbacks: HomePageCallbacks,
): { destroy(): void } {
  const sceneContexts: SceneContext[] = [];

  container.innerHTML = `
    <div class="${styles.page}">
      <nav class="${styles.nav}">
        <span class="${styles.navTitle}">Soma Cube Solver</span>
        <button class="${styles.navBtn} ${styles.navBtnPrimary}" data-action="solutions">Solutions</button>
        <button class="${styles.navBtn}" data-action="builder">Builder</button>
        <button class="${styles.navBtn}" data-action="converter">Converter</button>
      </nav>

      <div class="${styles.content}">

        <h1 class="${styles.heroTitle}">Soma Cube</h1>

        <p class="${styles.lead}">
          Soma Cube is a 3D dissection puzzle invented by Danish mathematician and poet
          <a class="${styles.sourceLink}" href="https://en.wikipedia.org/wiki/Piet_Hein_(scientist)" target="_blank" rel="noopener noreferrer">Piet Hein</a>
          in 1933 while attending a lecture on quantum mechanics.
          The goal is to arrange seven irregular polycube pieces into a 3×3×3 cube.
          The seven pieces together contain exactly 27 cubelets — filling the grid completely.
          Despite the puzzle's simple appearance, there are <strong>11,250 total solutions</strong>,
          reducible to <strong>240 distinct solutions</strong> once rotations and reflections are removed.
        </p>

        <div class="${styles.ctaRow}">
          <button class="${styles.ctaBtn} ${styles.ctaBtnPrimary}" data-action="solutions">
            Browse Solutions
          </button>
          <button class="${styles.ctaBtn} ${styles.ctaBtnSecondary}" data-action="builder">
            Open Builder
          </button>
        </div>

        <!-- Pieces -->
        <h2 class="${styles.sectionTitle}">The Pieces</h2>

        <p class="${styles.prose}">
          The set consists of one <strong>tricube</strong> (3 cubelets) and six <strong>tetracubes</strong>
          (4 cubelets each) — the seven polycubes of those sizes that aren't already rectangular prisms.
          Pieces <strong>A</strong> and <strong>B</strong> are mirror images of each other (chiral).
          The other planar pieces (L, T, Z) have symmetrical orientations reachable by rotation alone.
          Left-drag (or touch and drag) to rotate, right-drag (or two-finger drag) to pan, and scroll (or pinch) to zoom:
        </p>

        <div class="${styles.pieceGrid}" id="piece-gallery"></div>

        <!-- Notation -->
        <h2 class="${styles.sectionTitle}">Notation</h2>

        <p class="${styles.prose}">
          Each piece placement is encoded as a compact, URL-safe token:
        </p>

        <div class="${styles.notationFormat}">{Piece}{a}{b}{c}.{x}.{y}.{z}</div>

        <table class="${styles.notationTable}">
          <thead>
            <tr>
              <th>Field</th>
              <th>Values</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>{Piece}</code></td>
              <td><code>V L T Z A B P</code></td>
              <td>Piece identifier — one uppercase letter</td>
            </tr>
            <tr>
              <td><code>{a}</code></td>
              <td><code>0 – 3</code></td>
              <td>Yaw: rotation around the Z-axis in 90° steps, applied first</td>
            </tr>
            <tr>
              <td><code>{b}</code></td>
              <td><code>0 – 3</code></td>
              <td>Pitch: rotation around the X-axis in 90° steps, applied second</td>
            </tr>
            <tr>
              <td><code>{c}</code></td>
              <td><code>0 – 3</code></td>
              <td>Roll: rotation around the Y-axis in 90° steps, applied third</td>
            </tr>
            <tr>
              <td><code>.{x}.{y}.{z}</code></td>
              <td><code>0 – 2</code></td>
              <td>Grid position of the piece's anchor cubelet (minimum-coordinate corner after rotation)</td>
            </tr>
          </tbody>
        </table>

        <p class="${styles.prose}">
          The <strong>all-zeroes orientation</strong> (<code>a=0, b=0, c=0</code>) is the piece's
          natural shape as defined: no rotation is applied. This is the reference orientation
          from which all other placements are derived.
          A full solution is seven tokens separated by <code>~</code>:
        </p>

        <div class="${styles.exampleBlock}">V000.0.0.0~L010.0.2.0~T100.0.0.2~Z000.1.0.0~A000.1.1.0~B011.0.1.1~P001.1.0.2</div>

        <p class="${styles.prose}">
          All characters are URL-safe, so solutions can be linked to directly as hash parameters
          (e.g. <code>#view=visualize&amp;notation=…</code>).
        </p>

        <!-- Distinct Solutions -->
        <h2 class="${styles.sectionTitle}">Distinct Solutions</h2>

        <p class="${styles.prose}">
          A 3×3×3 cube has <strong>48 symmetries</strong>: 24 proper rotations (orientation-preserving)
          and 24 improper rotations (reflections). Two solutions are considered equivalent
          if any of these symmetries maps one to the other.
        </p>

        <p class="${styles.prose}">
          To find the canonical representative of a solution, the solver applies all 48 symmetry
          transformations to the filled grid. Each symmetry permutes and/or negates the three
          coordinate axes around the centre of the cube. Because pieces <strong>A</strong> and
          <strong>B</strong> are chiral mirrors of each other, any <em>improper</em> symmetry
          (determinant −1) also swaps the labels A and B in the transformed grid. The
          <strong>lexicographically smallest</strong> resulting 27-character grid string
          is retained as the canonical key. Two solutions share a canonical key if and only
          if they are equivalent under rotation and reflection.
        </p>

        <p class="${styles.prose}">
          Applying this normalization to all 11,250 solutions yields <strong>240 distinct
          solutions</strong>. Each distinct solution is the canonical representative for a class
          of up to 48 equivalent arrangements (some solutions have self-symmetry and therefore
          fewer equivalents).
        </p>

        <!-- Soma Cube Solver -->
        <h2 class="${styles.sectionTitle}">Soma Cube Solver</h2>

        <p class="${styles.prose}">
          The solver uses <strong>backtracking search</strong>.
          Pieces are placed one at a time in a fixed order: V, L, T, Z, A, B, P.
          Before searching, all distinct oriented variants of each piece are pre-computed
          by enumerating the 24 orientations of the cube and deduplicating by normalised
          cubelet positions (accounting for rotational symmetry within each piece).
          This gives between 3 and 24 distinct orientations per piece.
        </p>

        <p class="${styles.prose}">
          For each piece, every orientation is tried at every valid grid position (0–2 in each
          axis). A placement is accepted only if all of its cubelets fall within the 3×3×3 grid
          and none overlap an already-occupied cell. When no valid placement exists for the
          current piece, the algorithm backtracks to the previous piece and tries the next
          untested variant. Once all seven pieces are placed the completed arrangement is
          recorded as a solution.
        </p>

        <p class="${styles.prose}">
          The search takes approximately <strong>60 seconds</strong> on typical hardware
          and is run offline via <code>npm run solve</code>. The results are stored in
          <code>src/data/solutions.json</code> and served as a static asset so the app
          loads instantly without running the solver in the browser.
        </p>

        <!-- Source Code -->
        <h2 class="${styles.sectionTitle}">Source Code</h2>

        <p class="${styles.prose}">
          The full source code — solver, viewer, builder, and this page — is available on GitHub:
        </p>

        <p class="${styles.prose}">
          <a
            class="${styles.sourceLink}"
            href="https://github.com/xanticious/soma-cube-solver"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/xanticious/soma-cube-solver
          </a>
        </p>

      </div>
    </div>
  `;

  // Wire nav / CTA buttons

  container.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = (btn as HTMLElement).dataset.action;

      if (action === 'solutions') callbacks.onGoToSolutions();
      else if (action === 'builder') callbacks.onGoToBuilder();
      else if (action === 'converter') callbacks.onGoToConverter();
    });
  });

  // Build the piece gallery — defer one frame so containers have layout

  requestAnimationFrame(() => {
    const gallery = container.querySelector('#piece-gallery');

    if (!gallery) return;

    for (const piece of PIECE_NAMES) {
      const card = document.createElement('div');

      card.className = styles.pieceCard ?? '';

      const labelEl = document.createElement('div');

      labelEl.className = styles.pieceLabel ?? '';

      labelEl.style.color = PIECE_COLORS[piece];

      labelEl.textContent = `Piece ${piece}`;

      const sceneEl = document.createElement('div');

      sceneEl.className = styles.pieceScene ?? '';

      const metaEl = document.createElement('div');

      metaEl.className = styles.pieceMeta ?? '';

      metaEl.textContent = PIECE_DESCRIPTIONS[piece] ?? '';

      card.appendChild(labelEl);

      card.appendChild(sceneEl);

      card.appendChild(metaEl);

      gallery.appendChild(card);

      const ctx = createPiecePreviewScene(sceneEl, piece);

      sceneContexts.push(ctx);
    }
  });

  return {
    destroy() {
      for (const ctx of sceneContexts) {
        ctx.dispose();
      }

      sceneContexts.length = 0;

      container.innerHTML = '';
    },
  };
}
