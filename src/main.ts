import { createActor } from "xstate";

import { appMachine } from "./state/appMachine";

import { createHomePage } from "./components/HomePage/HomePage";

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
 * Parse hash-based notation: #notation=...&stagingAreaNotation=...
 */
function getHashNotation(): string | null {
  const hash = window.location.hash;

  if (!hash || hash.length < 2) return null;

  const params = new URLSearchParams(hash.substring(1));

  return params.get("notation");
}

function getHashStagingNotation(): string | null {
  const hash = window.location.hash;

  if (!hash || hash.length < 2) return null;

  const params = new URLSearchParams(hash.substring(1));

  return params.get("stagingAreaNotation");
}

function getHashView(): string | null {
  const hash = window.location.hash;

  if (!hash || hash.length < 2) return null;

  const params = new URLSearchParams(hash.substring(1));

  return params.get("view");
}

function renderView(
  state: string,
  notation: string | null,
  stagingAreaNotation?: string | null,
) {
  destroyCurrent();

  switch (state) {
    case "home":
      currentView = createHomePage(app, {
        onGoToSolutions() {
          actor.send({ type: "GO_TO_BROWSER" });
        },
        onGoToBuilder() {
          actor.send({ type: "OPEN_BUILDER", notation: null });
        },
      });

      updateUrl("home", null);

      break;

    case "browser":
      currentView = createSolutionBrowser(app, {
        onSelectSolution(n) {
          actor.send({ type: "VIEW_SOLUTION", notation: n });
        },

        onNavigateToBuild() {
          actor.send({ type: "OPEN_BUILDER", notation: null });
        },

        onGoHome() {
          actor.send({ type: "GO_HOME" });
        },
      });

      updateUrl("browser", null);

      break;

    case "viewer":
      if (notation) {
        currentView = createSolutionViewer(app, notation, {
          onBackToList() {
            actor.send({ type: "BACK_TO_BROWSER" });
          },
          onGoHome() {
            actor.send({ type: "GO_HOME" });
          },
        });

        updateUrl("viewer", notation);
      }

      break;

    case "builder":
      currentView = createBuilderView(
        app,
        notation,
        stagingAreaNotation ?? null,
        {
          onGoHome() {
            actor.send({ type: "GO_HOME" });
          },
        },
      );

      updateUrl("builder", notation);

      break;
  }
}

function updateUrl(state: string, notation: string | null) {
  if (state === "home") {
    window.history.pushState(null, "", window.location.pathname);
    return;
  }

  if (state === "browser") {
    window.history.pushState(null, "", "#view=solutions");
    return;
  }

  const viewName = state === "viewer" ? "visualize" : "build";
  let hash = `#view=${viewName}`;
  if (notation) hash += `&notation=${notation}`;

  window.history.pushState(null, "", hash);
}

// Handle popstate (back/forward)

window.addEventListener("popstate", () => {
  const view = getHashView();

  const notation = getHashNotation();

  const stagingNotation = getHashStagingNotation();

  if (view === "build") {
    actor.send({
      type: "OPEN_BUILDER",
      notation,
      stagingAreaNotation: stagingNotation,
    });
  } else if (view === "visualize" && notation) {
    actor.send({ type: "VIEW_SOLUTION", notation });
  } else if (view === "solutions") {
    actor.send({ type: "GO_TO_BROWSER" });
  } else {
    actor.send({ type: "GO_HOME" });
  }
});

// Start actor, then determine what to render based on the initial URL.
// We subscribe AFTER start + initial routing so the first 'browser'
// state doesn't push '/' over the user's URL.
actor.start();

const initView = getHashView();

const initNotation = getHashNotation();

const initStagingNotation = getHashStagingNotation();

if (initView === "build") {
  actor.send({
    type: "OPEN_BUILDER",
    notation: initNotation,
    stagingAreaNotation: initStagingNotation,
  });
} else if (initView === "visualize" && initNotation) {
  actor.send({ type: "VIEW_SOLUTION", notation: initNotation });
} else if (initView === "solutions") {
  actor.send({ type: "GO_TO_BROWSER" });
}

// Now subscribe for future updates
actor.subscribe((snapshot) => {
  const stateValue = snapshot.value as string;

  const notation = snapshot.context.currentNotation;

  const stagingNotation = snapshot.context.stagingAreaNotation;

  renderView(stateValue, notation, stagingNotation);
});

// Manually render the current state (the subscribe above won't
// fire for the current snapshot, only for future transitions)
renderView(
  actor.getSnapshot().value as string,
  actor.getSnapshot().context.currentNotation,
  actor.getSnapshot().context.stagingAreaNotation,
);
