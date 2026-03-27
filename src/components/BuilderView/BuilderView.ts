import type { PieceName, Placement, RotationStep } from "../../core/types";
import { PIECE_NAMES, GRID_SIZE_BUILDER } from "../../core/types";
import { PIECE_COLORS } from "../../core/pieces";
import { parseSolution, serializeSolution } from "../../core/notation";
import {
  createScene,
  renderPlacements,
  renderGrid,
  setCameraForGrid,
  type SceneContext,
} from "../Scene/Scene";
import styles from "./BuilderView.module.css";
interface BuilderState {
  placements: Placement[];
  usedPieces: Set<PieceName>;
  selectedPiece: PieceName | null;
}
export interface BuilderViewCallbacks {
  onBack(): void;
}
const ROTATION_OPTIONS: RotationStep[] = [0, 1, 2, 3];
const ROTATION_LABELS: Record<RotationStep, string> = {
  0: "0°",
  1: "90°",
  2: "180°",
  3: "270°",
};
function getPlacementForPiece(
  state: BuilderState,
  piece: PieceName,
): Placement | undefined {
  return state.placements.find((p) => p.piece === piece);
}
function isVisible(state: BuilderState, piece: PieceName): boolean {
  return state.usedPieces.has(piece);
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
  }; // Parse initial notation if provided

  if (initialNotation) {
    const parsed = parseSolution(initialNotation);
    if (parsed) {
      state.placements = parsed;
      for (const p of parsed) {
        state.usedPieces.add(p.piece);
      }
    }
  }
  function getOrCreatePlacement(piece: PieceName): Placement {
    let existing = getPlacementForPiece(state, piece);
    if (!existing) {
      existing = {
        piece,
        orientation: { a: 0, b: 0, c: 0 },
        position: { x: 0, y: 0, z: 0 },
      };
      state.placements.push(existing);
    }
    return existing;
  }
  function removePlacement(piece: PieceName) {
    state.placements = state.placements.filter((p) => p.piece !== piece);
  }
  function updateScene() {
    if (!sceneCtx) return;
    const visiblePlacements = state.placements.filter((p) =>
      state.usedPieces.has(p.piece),
    );
    renderPlacements(sceneCtx, visiblePlacements);
    updateNotationBar();
    updateUrl();
  }
  function updateNotationBar() {
    const visiblePlacements = state.placements.filter((p) =>
      state.usedPieces.has(p.piece),
    );
    const notationStr =
      visiblePlacements.length > 0
        ? serializeSolution(visiblePlacements)
        : "(empty)";
    const notationEl = container.querySelector(`.${styles.notation}`);
    if (notationEl) {
      notationEl.textContent = notationStr;
    }
  }
  function updateUrl() {
    const visiblePlacements = state.placements.filter((p) =>
      state.usedPieces.has(p.piece),
    );
    if (visiblePlacements.length > 0) {
      const notation = serializeSolution(visiblePlacements);
      const hash = `#notation=${notation}`;
      window.history.replaceState(null, "", `/build${hash}`);
    } else {
      window.history.replaceState(null, "", "/build");
    }
  }
  function renderFormPanel(): string {
    if (!state.selectedPiece) {
      return `<div class="${styles.formPanel}"><p class="${styles.formEmpty}">Click a piece to configure it</p></div>`;
    }
    const piece = state.selectedPiece;
    const placement = getPlacementForPiece(state, piece);
    const visible = isVisible(state, piece);
    const pos = placement?.position ?? { x: 0, y: 0, z: 0 };
    const orient = placement?.orientation ?? {
      a: 0 as RotationStep,
      b: 0 as RotationStep,
      c: 0 as RotationStep,
    };
    function rotationSelect(
      label: string,
      axis: string,
      value: RotationStep,
    ): string {
      const options = ROTATION_OPTIONS.map(
        (r) =>
          `<option value="${r}" ${r === value ? "selected" : ""}>${ROTATION_LABELS[r]}</option>`,
      ).join("");
      return `        <label class="${styles.formField}">          <span class="${styles.formLabel}">${label}</span>          <select data-rotation="${axis}" class="${styles.formSelect}">${options}</select>        </label>      `;
    }
    function numberInput(label: string, axis: string, value: number): string {
      return `        <label class="${styles.formField}">          <span class="${styles.formLabel}">${label}</span>          <input type="number" data-position="${axis}" class="${styles.formInput}" min="0" max="8" value="${value}" />        </label>      `;
    }
    return `      <div class="${styles.formPanel}">        <div class="${styles.formHeader}">          <span class="${styles.colorSwatch}" style="background:${PIECE_COLORS[piece]}"></span>          <strong>Piece ${piece}</strong>        </div>        <label class="${styles.formField} ${styles.formCheckboxField}">          <input type="checkbox" data-visible ${visible ? "checked" : ""} />          <span>Visible</span>        </label>        <fieldset class="${styles.formFieldset}">          <legend>Position</legend>          ${numberInput("X", "x", pos.x)}          ${numberInput("Y", "y", pos.y)}          ${numberInput("Z", "z", pos.z)}        </fieldset>        <fieldset class="${styles.formFieldset}">          <legend>Rotation</legend>          ${rotationSelect("A (Pitch)", "a", orient.a)}          ${rotationSelect("B (Yaw)", "b", orient.b)}          ${rotationSelect("C (Roll)", "c", orient.c)}        </fieldset>      </div>    `;
  }
  function renderUI() {
    const visiblePlacements = state.placements.filter((p) =>
      state.usedPieces.has(p.piece),
    );
    const notationStr =
      visiblePlacements.length > 0
        ? serializeSolution(visiblePlacements)
        : "(empty)";
    const pieceBtns = PIECE_NAMES.map((name) => {
      const active = state.selectedPiece === name;
      const visible = state.usedPieces.has(name);
      let cls = styles.pieceBtn;
      if (active) cls += ` ${styles.pieceBtnActive}`;
      if (visible) cls += ` ${styles.pieceBtnVisible}`;
      return `        <button class="${cls}" data-piece="${name}">          <span class="${styles.colorSwatch}" style="background:${PIECE_COLORS[name]}"></span>          ${name}          ${visible ? '<span class="' + styles.visibleIndicator + '">&#x2713;</span>' : ""}        </button>      `;
    }).join("");
    if (!sceneCtx) {
      container.innerHTML = `        <div class="${styles.container}">          <div class="${styles.sidebar}">            <p class="${styles.sidebarTitle}">Pieces</p>            <div class="${styles.pieceList}">${pieceBtns}</div>            ${renderFormPanel()}            <div class="${styles.sidebarActions}">              <button data-action="reset">Reset All</button>              <button data-action="home">Home</button>            </div>          </div>          <div class="${styles.main}">            <div class="${styles.sceneContainer}" data-scene></div>            <div class="${styles.statusBar}">              <span class="${styles.notation}">${escapeHtml(notationStr)}</span>              <button class="${styles.copyBtn}" data-action="copy">Copy</button>            </div>          </div>        </div>      `;
      const sceneContainer = container.querySelector(
        "[data-scene]",
      ) as HTMLElement;
      sceneCtx = createScene(sceneContainer);
      renderGrid(sceneCtx, GRID_SIZE_BUILDER);
      setCameraForGrid(sceneCtx, GRID_SIZE_BUILDER);
    } else {
      // Update piece buttons

      const pieceList = container.querySelector(`.${styles.pieceList}`);
      if (pieceList) {
        pieceList.innerHTML = pieceBtns;
      } // Update form panel

      const oldFormPanel = container.querySelector(`.${styles.formPanel}`);
      if (oldFormPanel) {
        oldFormPanel.outerHTML = renderFormPanel();
      }
    } // Render placed pieces

    updateScene();
    bindEvents();
  }
  function bindEvents() {
    container.querySelectorAll("[data-piece]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const piece = (btn as HTMLElement).dataset.piece as PieceName;
        state.selectedPiece = piece;
        renderUI();
      });
    });
    container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action === "reset") {
          state.placements = [];
          state.usedPieces.clear();
          state.selectedPiece = null;
          renderUI();
        } else if (action === "home") {
          callbacks.onBack();
        } else if (action === "copy") {
          const visiblePlacements = state.placements.filter((p) =>
            state.usedPieces.has(p.piece),
          );
          if (visiblePlacements.length > 0) {
            navigator.clipboard.writeText(serializeSolution(visiblePlacements));
          }
        }
      });
    }); // Form event handlers

    const visibleCheckbox = container.querySelector(
      "[data-visible]",
    ) as HTMLInputElement | null;
    if (visibleCheckbox && state.selectedPiece) {
      const piece = state.selectedPiece;
      visibleCheckbox.addEventListener("change", () => {
        if (visibleCheckbox.checked) {
          state.usedPieces.add(piece);
          getOrCreatePlacement(piece);
        } else {
          state.usedPieces.delete(piece);
          removePlacement(piece);
        }
        renderUI();
      });
    }
    container.querySelectorAll("[data-position]").forEach((input) => {
      const el = input as HTMLInputElement;
      const axis = el.dataset.position as "x" | "y" | "z";
      el.addEventListener("input", () => {
        if (!state.selectedPiece) return;
        const value = parseInt(el.value, 10);
        if (isNaN(value)) return;
        const placement = getOrCreatePlacement(state.selectedPiece);
        placement.position = { ...placement.position, [axis]: value };
        if (!state.usedPieces.has(state.selectedPiece)) {
          state.usedPieces.add(state.selectedPiece); // Update checkbox visually

          const cb = container.querySelector(
            "[data-visible]",
          ) as HTMLInputElement | null;
          if (cb) cb.checked = true;
        }
        updateScene();
      });
    });
    container.querySelectorAll("[data-rotation]").forEach((select) => {
      const el = select as HTMLSelectElement;
      const axis = el.dataset.rotation as "a" | "b" | "c";
      el.addEventListener("change", () => {
        if (!state.selectedPiece) return;
        const value = parseInt(el.value, 10) as RotationStep;
        const placement = getOrCreatePlacement(state.selectedPiece);
        placement.orientation = { ...placement.orientation, [axis]: value };
        if (!state.usedPieces.has(state.selectedPiece)) {
          state.usedPieces.add(state.selectedPiece);
          const cb = container.querySelector(
            "[data-visible]",
          ) as HTMLInputElement | null;
          if (cb) cb.checked = true;
        }
        updateScene();
      });
    });
  } // Initial render

  renderUI();
  return {
    destroy() {
      sceneCtx?.dispose();
      sceneCtx = null;
      container.innerHTML = "";
    },
  };
}
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
