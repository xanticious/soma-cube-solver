import solutionsData from "../../data/solutions.json";

import styles from "./SolutionBrowser.module.css";

interface SolutionEntry {
  notation: string;

  distinct: boolean;
}

const solutions: SolutionEntry[] = solutionsData as SolutionEntry[];

export interface SolutionBrowserCallbacks {
  onSelectSolution(notation: string): void;

  onNavigateToBuild(): void;
}

export function createSolutionBrowser(
  container: HTMLElement,

  callbacks: SolutionBrowserCallbacks,
): { destroy(): void } {
  let showDistinctOnly = false;

  function render() {
    const filtered = showDistinctOnly
      ? solutions.filter((s) => s.distinct)
      : solutions;

    container.innerHTML = `
      <div class="${styles.container}">
        <div class="${styles.header}">
          <h2>Soma Cube Solutions</h2>
          <div class="${styles.filterToggle}">
            <button class="${styles.filterBtn} ${!showDistinctOnly ? styles.filterBtnActive : ""}" data-filter="all">
              All (${solutions.length})
            </button>
            <button class="${styles.filterBtn} ${showDistinctOnly ? styles.filterBtnActive : ""}" data-filter="distinct">
              Distinct (${solutions.filter((s) => s.distinct).length})
            </button>
          </div>
          <button class="${styles.filterBtn}" data-action="build">
            Builder
          </button>
        </div>
        <div class="${styles.list}">
          ${
            filtered.length === 0
              ? `<div class="${styles.empty}">No solutions found. Run <code>npm run solve</code> to generate solutions.</div>`
              : filtered

                  .map(
                    (sol, i) => `
                <div class="${styles.solutionRow}" data-notation="${encodeURIComponent(sol.notation)}">
                  <span class="${styles.solutionIndex}">#${i + 1}</span>
                  <span class="${styles.solutionNotation}">${escapeHtml(sol.notation)}</span>
                  ${sol.distinct ? `<span class="${styles.distinctBadge}">distinct</span>` : ""}
                </div>
              `,
                  )

                  .join("")
          }
        </div>
      </div>
    `;

    // Event listeners

    container.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = (btn as HTMLElement).dataset.filter;

        showDistinctOnly = filter === "distinct";

        render();
      });
    });

    container.querySelectorAll("[data-notation]").forEach((row) => {
      row.addEventListener("click", () => {
        const notation = decodeURIComponent(
          (row as HTMLElement).dataset.notation ?? "",
        );

        callbacks.onSelectSolution(notation);
      });
    });

    container.querySelectorAll("[data-action='build']").forEach((btn) => {
      btn.addEventListener("click", () => {
        callbacks.onNavigateToBuild();
      });
    });
  }

  render();

  return {
    destroy() {
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
