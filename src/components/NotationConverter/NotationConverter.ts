import { PIECE_OFFSETS, PIECE_COLORS } from '../../core/pieces';

import { computeAllVariants } from '../../core/solver';

import { parseSolution, serializeSolution } from '../../core/notation';

import { transformOffsets, normalizePositions } from '../../core/rotations';

import { PIECE_NAMES } from '../../core/types';

import type { Orientation, PieceName, Placement, Vec3 } from '../../core/types';

import styles from './NotationConverter.module.css';

export interface NotationConverterCallbacks {
  onGoHome(): void;
}

// Piece P (#E8E8E8) is too light for text/UI use; override it on this page only.
const DISPLAY_COLORS: Record<PieceName, string> = {
  ...PIECE_COLORS,
  P: '#888888',
};

// ---------------------------------------------------------------------------
// Coordinate mapping between the 27-char common format and (x, y, z):
//
//   Input (stripped, 27 chars):
//     positions 0–8  → row 0 (y=0): layer z=0 (x=0..2), then z=1, then z=2
//     positions 9–17 → row 1 (y=1): same structure
//     positions 18–26→ row 2 (y=2): same structure
//
//   i → { x: i%3, z: floor((i%9)/3), y: floor(i/9) }
// Coordinate mapping between the 27-char common format and (x, y, z):
//
//   Common notation (stripped, 27 chars):
//     Left block   (positions 0–2, 9–11, 18–20) = top layer    → y = 2 in 3D
//     Middle block (positions 3–5, 12–14, 21–23) = middle layer → y = 1 in 3D
//     Right block  (positions 6–8, 15–17, 24–26) = bottom layer → y = 0 in 3D
//
//   Within each block, text rows map to the Z axis in 3D:
//     text row 0 (top)    → z = 0
//     text row 1 (middle) → z = 1
//     text row 2 (bottom) → z = 2
//
//   Columns within each block map to X:
//     col 0 (left) → x = 0 … col 2 (right) → x = 2
//
//   3D (x, y, z) derived from position i in stripped string:
//     layer = floor((i % 9) / 3)  [0 = left/top, 2 = right/bottom]
//     row   = floor(i / 9)         [0 = top text row, 2 = bottom]
//     col   = i % 3
//     → x = col,  y = 2 − layer,  z = row
//
//   Inverse (3D → display grid index for formatCommonNotation):
//     displayIndex = z * 9 + (2 − y) * 3 + x
// ---------------------------------------------------------------------------

function indexToXYZ(i: number): Vec3 {
  return {
    x: i % 3,
    y: 2 - Math.floor((i % 9) / 3),
    z: Math.floor(i / 9),
  };
}

// xyzToIndex is a DISPLAY-only helper: (col, textRow, displayLayer) → array index.
// displayLayer 0 = left/top block, 2 = right/bottom block.
function xyzToIndex(x: number, y: number, z: number): number {
  return y * 9 + z * 3 + x;
}

// ---------------------------------------------------------------------------
// Fingerprint map: normalized shape → { piece, orientation }
// ---------------------------------------------------------------------------

let _fingerprintMap: Map<
  string,
  { piece: PieceName; orientation: Orientation }
> | null = null;

function getFingerprintMap(): Map<
  string,
  { piece: PieceName; orientation: Orientation }
> {
  if (_fingerprintMap !== null) return _fingerprintMap;

  _fingerprintMap = new Map();

  const variants = computeAllVariants();

  for (const v of variants) {
    const key = v.offsets.map((p) => `${p.x},${p.y},${p.z}`).join('|');

    if (!_fingerprintMap.has(key)) {
      _fingerprintMap.set(key, { piece: v.piece, orientation: v.orientation });
    }
  }

  return _fingerprintMap;
}

// ---------------------------------------------------------------------------
// Recognize a set of cells as a specific piece variant.
// Returns the piece, orientation, and position (min-corner).
// ---------------------------------------------------------------------------

function recognizePiece(cells: Vec3[]): {
  piece: PieceName;
  orientation: Orientation;
  position: Vec3;
} | null {
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const minZ = Math.min(...cells.map((c) => c.z));

  const normalized = normalizePositions(cells);
  const key = normalized.map((p) => `${p.x},${p.y},${p.z}`).join('|');

  const match = getFingerprintMap().get(key);

  if (!match) return null;

  return {
    piece: match.piece,
    orientation: match.orientation,
    position: { x: minX, y: minY, z: minZ },
  };
}

// ---------------------------------------------------------------------------
// Parse common notation → Placement[]
// ---------------------------------------------------------------------------

interface ParseCommonSuccess {
  ok: true;
  placements: Placement[];
  symbolToPiece: Map<string, PieceName>;
}

interface ParseCommonError {
  ok: false;
  error: string;
}

function parseCommonNotation(
  input: string,
): ParseCommonSuccess | ParseCommonError {
  const stripped = input.replace(/[^a-zA-Z0-9]/g, '');

  if (stripped.length !== 27) {
    return {
      ok: false,
      error: `Expected 27 cells after removing delimiters, but got ${stripped.length}. Make sure every cell is filled.`,
    };
  }

  const usedSymbols = new Set(stripped);

  if (usedSymbols.size !== 7) {
    return {
      ok: false,
      error: `Expected exactly 7 unique symbols (one per piece), but found ${usedSymbols.size}.`,
    };
  }

  // Collect cells per symbol
  const symbolCells = new Map<string, Vec3[]>();

  for (let i = 0; i < 27; i++) {
    const sym = stripped[i]!;
    const cell = indexToXYZ(i);

    if (!symbolCells.has(sym)) symbolCells.set(sym, []);

    symbolCells.get(sym)!.push(cell);
  }

  // Validate size (1 piece of 3 cubelets, 6 of 4) and recognize each
  const placements: Placement[] = [];
  const symbolToPiece = new Map<string, PieceName>();
  const usedPieces = new Set<PieceName>();

  for (const [sym, cells] of symbolCells) {
    if (cells.length !== 3 && cells.length !== 4) {
      return {
        ok: false,
        error: `Symbol '${sym}' covers ${cells.length} cells; valid pieces have 3 or 4 cubelets.`,
      };
    }

    const result = recognizePiece(cells);

    if (!result) {
      return {
        ok: false,
        error: `Could not identify a valid Soma piece for symbol '${sym}'. Check that the cells form a legal piece shape.`,
      };
    }

    if (usedPieces.has(result.piece)) {
      return {
        ok: false,
        error: `Piece '${result.piece}' appears twice. Each Soma piece must appear exactly once.`,
      };
    }

    usedPieces.add(result.piece);
    symbolToPiece.set(sym, result.piece);

    placements.push({
      piece: result.piece,
      orientation: result.orientation,
      position: result.position,
    });
  }

  // Sort by canonical piece order
  placements.sort(
    (a, b) => PIECE_NAMES.indexOf(a.piece) - PIECE_NAMES.indexOf(b.piece),
  );

  return { ok: true, placements, symbolToPiece };
}

// ---------------------------------------------------------------------------
// Format our notation → common notation text (+ grid array)
// ---------------------------------------------------------------------------

interface FormatCommonSuccess {
  ok: true;
  text: string;
  grid: string[]; // 27-char grid, indexed by xyzToIndex
  symbolMap: Record<PieceName, string>;
}

interface FormatCommonError {
  ok: false;
  error: string;
}

function formatCommonNotation(
  notation: string,
  symbolMap: Record<PieceName, string>,
): FormatCommonSuccess | FormatCommonError {
  const placements = parseSolution(notation);

  if (!placements) {
    return { ok: false, error: 'Invalid notation string.' };
  }

  if (placements.length !== 7) {
    return {
      ok: false,
      error: `Expected 7 piece placements, got ${placements.length}.`,
    };
  }

  const grid: string[] = new Array(27).fill('');

  for (const p of placements) {
    const sym = symbolMap[p.piece];
    const cells = transformOffsets(
      PIECE_OFFSETS[p.piece],
      p.orientation,
      p.position,
    );

    for (const c of cells) {
      if (c.x < 0 || c.x > 2 || c.y < 0 || c.y > 2 || c.z < 0 || c.z > 2) {
        return {
          ok: false,
          error: `Piece ${p.piece} placement is out of the 3×3×3 grid.`,
        };
      }

      const idx = c.z * 9 + (2 - c.y) * 3 + c.x;

      if (grid[idx] !== '') {
        return {
          ok: false,
          error: `Overlap detected at (${c.x},${c.y},${c.z}).`,
        };
      }

      grid[idx] = sym;
    }
  }

  // Build text lines: 3 rows, each with 3 layer blocks separated by spaces
  const lines: string[] = [];

  for (let y = 0; y < 3; y++) {
    const blocks: string[] = [];

    for (let z = 0; z < 3; z++) {
      const cells: string[] = [];

      for (let x = 0; x < 3; x++) {
        cells.push(grid[xyzToIndex(x, y, z)]!);
      }

      blocks.push(cells.join(' '));
    }

    lines.push(blocks.join('   '));
  }

  return { ok: true, text: lines.join('\n'), grid, symbolMap };
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function renderGridDisplay(
  container: Element,
  grid: string[],
  colorBySymbol: Map<string, string>,
): void {
  container.innerHTML = '';

  // Layer header labels
  const layerNames = ['Layer 1', 'Layer 2', 'Layer 3'];

  for (let z = 0; z < 3; z++) {
    const label = document.createElement('div');
    label.className = styles.gridLayerLabel ?? '';
    label.textContent = layerNames[z]!;
    container.appendChild(label);

    if (z < 2) {
      const spacer = document.createElement('div');
      spacer.className = styles.gridSpacer ?? '';
      container.appendChild(spacer);
    }
  }

  // Data cells: for each row y, emit z=0,1,2 blocks with spacers
  for (let y = 0; y < 3; y++) {
    for (let z = 0; z < 3; z++) {
      for (let x = 0; x < 3; x++) {
        const sym = grid[xyzToIndex(x, y, z)] ?? '';
        const cell = document.createElement('div');
        cell.className = styles.gridCell ?? '';
        cell.textContent = sym || '?';

        const color = colorBySymbol.get(sym);

        if (color) {
          cell.style.background = color + '33';
          cell.style.borderColor = color;
          cell.style.color = color;
        }

        container.appendChild(cell);
      }

      if (z < 2) {
        const spacer = document.createElement('div');
        spacer.className = styles.gridSpacer ?? '';
        container.appendChild(spacer);
      }
    }
  }
}

function makeCopyButton(getText: () => string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = styles.copyBtn ?? '';
  btn.textContent = 'Copy';
  btn.addEventListener('click', () => {
    const text = getText();
    void navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = 'Copy';
      }, 1500);
    });
  });

  return btn;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function createNotationConverter(
  container: HTMLElement,
  callbacks: NotationConverterCallbacks,
): { destroy(): void } {
  container.innerHTML = `
    <div class="${styles.page}">
      <nav class="${styles.nav}">
        <span class="${styles.navTitle}">Soma Cube Solver</span>
        <button class="${styles.navBtn}" data-action="home">Home</button>
      </nav>

      <div class="${styles.content}">
        <h1 class="${styles.pageTitle}">Notation Converter</h1>
        <p class="${styles.pageSubtitle}">
          Convert between our compact token notation and the common layer-grid notation
          used in books and other Soma Cube resources.
        </p>

        <!-- ── Section 1: Common → Our notation ── -->
        <h2 class="${styles.sectionTitle}">Convert to Our Notation</h2>

        <p class="${styles.prose}">
          Enter a solution in the common layer-grid format. The grid shows three 3×3 layers
          arranged side by side (left = top layer, middle, right = bottom layer).
          Each cell holds one symbol; all 27 cells must be filled with exactly 7 unique symbols.
          Delimiters (spaces, newlines, pipes, etc.) are ignored.
        </p>

        <p class="${styles.prose}">
          Example:
        </p>

        <div class="${styles.outputBlock}" style="margin-bottom:14px">TTT VVZ LLL<br>PTA VBZ LBZ<br>PPA PAA BBZ</div>

        <label class="${styles.inputLabel}" for="nc-input-common">Common notation:</label>
        <textarea
          id="nc-input-common"
          class="${styles.textarea}"
          rows="5"
          placeholder="TTT VVZ LLL&#10;PTA VBZ LBZ&#10;PPA PAA BBZ"
          spellcheck="false"
        ></textarea>

        <button class="${styles.convertBtn}" id="nc-btn-to-ours">Convert →</button>

        <div id="nc-out-to-ours-error" class="${styles.errorBlock}" style="display:none"></div>
        <div id="nc-out-to-ours-wrap" style="display:none">
          <div id="nc-out-to-ours" class="${styles.outputBlock}"></div>
          <div id="nc-out-to-ours-mapping" class="${styles.prose}" style="margin-top:10px"></div>
          <div id="nc-out-to-ours-grid" class="${styles.gridDisplay}"></div>
        </div>

        <!-- ── Section 2: Our notation → Common ── -->
        <h2 class="${styles.sectionTitle}">Convert to Common Notation</h2>

        <p class="${styles.prose}">
          Enter a solution in our notation and optionally assign a custom symbol to each piece.
          Symbols must be a single alphanumeric character (<code>[a–z A–Z 0–9]</code>) and must all be unique.
          The seven placeholders default to the piece letters (V, L, T, Z, A, B, P).
        </p>

        <p class="${styles.prose}">
          Example:
        </p>

        <div class="${styles.outputBlock}" style="margin-bottom:14px">V010.0.1.0~L032.0.0.0~T010.0.2.0~Z001.2.0.0~A002.1.1.1~B030.0.0.1~P011.0.1.1</div>

        <label class="${styles.inputLabel}" for="nc-input-ours">Our notation:</label>
        <textarea
          id="nc-input-ours"
          class="${styles.textarea}"
          rows="3"
          placeholder="V000.0.0.0~L010.0.2.0~T100.0.0.2~Z000.1.0.0~A000.1.1.0~B011.0.1.1~P001.1.0.2"
          spellcheck="false"
        ></textarea>

        <div style="margin-top:16px">
          <div class="${styles.inputLabel}">Symbol mapping (optional):</div>
          <div class="${styles.mappingGrid}" id="nc-mapping-grid"></div>
        </div>

        <button class="${styles.convertBtn}" id="nc-btn-to-common">Convert →</button>

        <div id="nc-out-to-common-error" class="${styles.errorBlock}" style="display:none"></div>
        <div id="nc-out-to-common-wrap" style="display:none">
          <div id="nc-out-to-common" class="${styles.outputBlock}"></div>
          <div id="nc-out-to-common-grid" class="${styles.gridDisplay}"></div>
        </div>

      </div>
    </div>
  `;

  // ── Nav ──
  const homeBtn = container.querySelector<HTMLButtonElement>(
    "[data-action='home']",
  );
  homeBtn?.addEventListener('click', () => callbacks.onGoHome());

  // ── Symbol mapping inputs ──
  const mappingGridEl =
    container.querySelector<HTMLElement>('#nc-mapping-grid')!;

  const mappingInputs = new Map<PieceName, HTMLInputElement>();

  // First pass: append all labels (fills grid row 1)
  for (const piece of PIECE_NAMES) {
    const label = document.createElement('div');
    label.className = styles.mappingPieceLabel ?? '';
    label.style.color = DISPLAY_COLORS[piece];
    label.textContent = `Piece ${piece}`;
    mappingGridEl.appendChild(label);
  }

  // Second pass: append all inputs (fills grid row 2)
  for (const piece of PIECE_NAMES) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.className = styles.mappingInput ?? '';
    input.value = piece;
    input.setAttribute('aria-label', `Symbol for piece ${piece}`);

    // Only allow alphanumeric
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 1);
    });

    mappingGridEl.appendChild(input);
    mappingInputs.set(piece, input);
  }

  // ── Section 1: Convert common → our notation ──
  const btnToOurs =
    container.querySelector<HTMLButtonElement>('#nc-btn-to-ours')!;
  const inputCommon =
    container.querySelector<HTMLTextAreaElement>('#nc-input-common')!;
  const outToOursError = container.querySelector<HTMLElement>(
    '#nc-out-to-ours-error',
  )!;
  const outToOursWrap = container.querySelector<HTMLElement>(
    '#nc-out-to-ours-wrap',
  )!;
  const outToOursEl = container.querySelector<HTMLElement>('#nc-out-to-ours')!;
  const outToOursMappingEl = container.querySelector<HTMLElement>(
    '#nc-out-to-ours-mapping',
  )!;
  const outToOursGridEl = container.querySelector<HTMLElement>(
    '#nc-out-to-ours-grid',
  )!;

  let toOursCopyBtn: HTMLButtonElement | null = null;

  function runToOurs(): void {
    outToOursError.style.display = 'none';
    outToOursWrap.style.display = 'none';
    outToOursEl.innerHTML = '';
    outToOursMappingEl.innerHTML = '';
    outToOursGridEl.innerHTML = '';

    toOursCopyBtn?.remove();
    toOursCopyBtn = null;

    const result = parseCommonNotation(inputCommon.value);

    if (!result.ok) {
      outToOursError.textContent = result.error;
      outToOursError.style.display = '';
      return;
    }

    const notationStr = serializeSolution(result.placements);

    outToOursEl.textContent = notationStr;

    // Copy button
    toOursCopyBtn = makeCopyButton(() => notationStr);
    outToOursEl.appendChild(toOursCopyBtn);

    // Inferred mapping display
    const mappingParts: string[] = [];

    for (const [sym, piece] of result.symbolToPiece) {
      mappingParts.push(
        `<span style="color:${DISPLAY_COLORS[piece]};font-weight:700">${piece}</span>`,
      );
      mappingParts[mappingParts.length - 1] =
        `\u2018${sym}\u2019 \u2192 Piece <span style="color:${DISPLAY_COLORS[piece]};font-weight:700">${piece}</span>`;
    }

    outToOursMappingEl.innerHTML =
      `<strong>Inferred symbol mapping:</strong> ` +
      [...result.symbolToPiece.entries()]
        .map(
          ([sym, piece]) =>
            `\u2018${sym}\u2019\u202F→\u202FPiece <span style="color:${DISPLAY_COLORS[piece]};font-weight:700">${piece}</span>`,
        )
        .join(', ');

    // Build grid for visualization: fill 27-cell array
    const grid: string[] = new Array(27).fill('');
    const colorBySymbol = new Map<string, string>();

    for (const [sym, piece] of result.symbolToPiece) {
      colorBySymbol.set(sym, DISPLAY_COLORS[piece]);
    }

    const stripped = inputCommon.value.replace(/[^a-zA-Z0-9]/g, '');
    for (let i = 0; i < 27; i++) {
      grid[xyzToIndex(i % 3, Math.floor(i / 9), Math.floor((i % 9) / 3))] =
        stripped[i]!;
    }

    renderGridDisplay(outToOursGridEl, grid, colorBySymbol);

    outToOursWrap.style.display = '';
  }

  btnToOurs.addEventListener('click', runToOurs);

  // ── Section 2: Convert our notation → common ──
  const btnToCommon =
    container.querySelector<HTMLButtonElement>('#nc-btn-to-common')!;
  const inputOurs =
    container.querySelector<HTMLTextAreaElement>('#nc-input-ours')!;
  const outToCommonError = container.querySelector<HTMLElement>(
    '#nc-out-to-common-error',
  )!;
  const outToCommonWrap = container.querySelector<HTMLElement>(
    '#nc-out-to-common-wrap',
  )!;
  const outToCommonEl =
    container.querySelector<HTMLElement>('#nc-out-to-common')!;
  const outToCommonGridEl = container.querySelector<HTMLElement>(
    '#nc-out-to-common-grid',
  )!;

  let toCommonCopyBtn: HTMLButtonElement | null = null;

  function runToCommon(): void {
    outToCommonError.style.display = 'none';
    outToCommonWrap.style.display = 'none';
    outToCommonEl.innerHTML = '';
    outToCommonGridEl.innerHTML = '';

    toCommonCopyBtn?.remove();
    toCommonCopyBtn = null;

    // Validate and read symbol map
    const symbolMap = {} as Record<PieceName, string>;
    const seen = new Set<string>();

    for (const piece of PIECE_NAMES) {
      const sym = mappingInputs.get(piece)!.value.trim() || piece;

      if (!/^[a-zA-Z0-9]$/.test(sym)) {
        outToCommonError.textContent = `Symbol for piece ${piece} must be a single alphanumeric character.`;
        outToCommonError.style.display = '';
        return;
      }

      if (seen.has(sym)) {
        outToCommonError.textContent = `Symbol '${sym}' is used more than once. Each symbol must be unique.`;
        outToCommonError.style.display = '';
        return;
      }

      seen.add(sym);
      symbolMap[piece] = sym;
    }

    const result = formatCommonNotation(inputOurs.value.trim(), symbolMap);

    if (!result.ok) {
      outToCommonError.textContent = result.error;
      outToCommonError.style.display = '';
      return;
    }

    outToCommonEl.textContent = result.text;

    toCommonCopyBtn = makeCopyButton(() => result.text);
    outToCommonEl.appendChild(toCommonCopyBtn);

    // Build colorBySymbol
    const colorBySymbol = new Map<string, string>();

    for (const piece of PIECE_NAMES) {
      colorBySymbol.set(symbolMap[piece], DISPLAY_COLORS[piece]);
    }

    renderGridDisplay(outToCommonGridEl, result.grid, colorBySymbol);

    outToCommonWrap.style.display = '';
  }

  btnToCommon.addEventListener('click', runToCommon);

  return {
    destroy() {
      container.innerHTML = '';
    },
  };
}
