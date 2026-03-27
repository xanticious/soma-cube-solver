import { createActor } from 'xstate';

import { appMachine } from './state/appMachine';

import { createSolutionBrowser } from './components/SolutionBrowser/SolutionBrowser';

import { createSolutionViewer } from './components/SolutionViewer/SolutionViewer';

import { createBuilderView } from './components/BuilderView/BuilderView';

import './styles/global.css';

const app = document.getElementById('app')!;

const actor = createActor(appMachine);

let currentView: { destroy(): void } | null = null;

function destroyCurrent() {
  currentView?.destroy();

  currentView = null;
}

function renderView(
  state: string,

  notation: string | null,
) {
  destroyCurrent();

  switch (state) {
    case 'browser':
      currentView = createSolutionBrowser(app, {
        onSelectSolution(n) {
          actor.send({ type: 'VIEW_SOLUTION', notation: n });
        },

        onNavigateToBuild() {
          actor.send({ type: 'OPEN_BUILDER', notation: null });
        },
      });

      updateUrl('/', null);

      break;

    case 'viewer':
      if (notation) {
        currentView = createSolutionViewer(app, notation, {
          onBack() {
            actor.send({ type: 'BACK_TO_BROWSER' });
          },
        });

        updateUrl('/', notation);
      }

      break;

    case 'builder':
      currentView = createBuilderView(app, notation, {
        onBack() {
          actor.send({ type: 'BACK_TO_BROWSER' });
        },
      });

      updateUrl('/build', notation);

      break;
  }
}

function updateUrl(path: string, notation: string | null) {
  const url = new URL(window.location.href);

  url.pathname = path;

  if (notation) {
    url.searchParams.set('notation', notation);
  } else {
    url.searchParams.delete('notation');
  }

  window.history.pushState(null, '', url.toString());
}

actor.subscribe((snapshot) => {
  const stateValue = snapshot.value as string;

  const notation = snapshot.context.currentNotation;

  renderView(stateValue, notation);
});

// Handle initial URL

function handleInitialUrl() {
  const url = new URL(window.location.href);

  const notation = url.searchParams.get('notation');

  if (url.pathname === '/build') {
    actor.send({ type: 'OPEN_BUILDER', notation });
  } else if (notation) {
    actor.send({ type: 'VIEW_SOLUTION', notation });
  }

  // Otherwise stays in browser (initial state)
}

// Handle popstate (back/forward)

window.addEventListener('popstate', () => {
  const url = new URL(window.location.href);

  const notation = url.searchParams.get('notation');

  if (url.pathname === '/build') {
    actor.send({ type: 'OPEN_BUILDER', notation });
  } else if (notation) {
    actor.send({ type: 'VIEW_SOLUTION', notation });
  } else {
    actor.send({ type: 'BACK_TO_BROWSER' });
  }
});

actor.start();

handleInitialUrl();
