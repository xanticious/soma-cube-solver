import { createActor } from "xstate";

import { appMachine } from "./state/appMachine";

import { createSolutionBrowser } from "./components/SolutionBrowser/SolutionBrowser";

import { createSolutionViewer } from "./components/SolutionViewer/SolutionViewer";

import { createBuilderView } from "./components/BuilderView/BuilderView";

import "./styles/global.css";

const app = document.getElementById("app")!;

const actor = createActor(appMachine);

let currentView: { destroy(): void } | null = null;

function destroyCurrent() {
  currentView?.destroy();

  currentView = null;
}

/**
 * Parse hash-based notation: #notation=...
 */
function getHashNotation(): string | null {
  const hash = window.location.hash;

  if (!hash || hash.length < 2) return null;

  const params = new URLSearchParams(hash.substring(1));

  return params.get("notation");
}

function renderView(
  state: string,

  notation: string | null,
) {
  destroyCurrent();

  switch (state) {
    case "browser":
      currentView = createSolutionBrowser(app, {
        onSelectSolution(n) {
          actor.send({ type: "VIEW_SOLUTION", notation: n });
        },

        onNavigateToBuild() {
          actor.send({ type: "OPEN_BUILDER", notation: null });
        },
      });

      updateUrl("/", null);

      break;

    case "viewer":
      if (notation) {
        currentView = createSolutionViewer(app, notation, {
          onBack() {
            actor.send({ type: "BACK_TO_BROWSER" });
          },
        });

        updateUrl("/visualize", notation);
      }

      break;

    case "builder":
      currentView = createBuilderView(app, notation, {
        onBack() {
          actor.send({ type: "BACK_TO_BROWSER" });
        },
      });

      updateUrl("/build", notation);

      break;
  }
}

function updateUrl(path: string, notation: string | null) {
  const hash = notation ? `#notation=${notation}` : "";

  const url = `${path}${hash}`;

  window.history.pushState(null, "", url);
}

actor.subscribe((snapshot) => {
  const stateValue = snapshot.value as string;

  const notation = snapshot.context.currentNotation;

  renderView(stateValue, notation);
});

// Handle initial URL

function handleInitialUrl() {
  const pathname = window.location.pathname;

  const notation = getHashNotation();

  if (pathname === "/build") {
    actor.send({ type: "OPEN_BUILDER", notation });
  } else if (pathname === "/visualize" && notation) {
    actor.send({ type: "VIEW_SOLUTION", notation });
  } else if (notation) {
    // Legacy support: notation on root path goes to viewer
    actor.send({ type: "VIEW_SOLUTION", notation });
  }

  // Otherwise stays in browser (initial state)
}

// Handle popstate (back/forward)

window.addEventListener("popstate", () => {
  const pathname = window.location.pathname;

  const notation = getHashNotation();

  if (pathname === "/build") {
    actor.send({ type: "OPEN_BUILDER", notation });
  } else if (pathname === "/visualize" && notation) {
    actor.send({ type: "VIEW_SOLUTION", notation });
  } else if (notation) {
    actor.send({ type: "VIEW_SOLUTION", notation });
  } else {
    actor.send({ type: "BACK_TO_BROWSER" });
  }
});

actor.start();

handleInitialUrl();
