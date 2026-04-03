import { createMachine, assign } from 'xstate';

interface AppContext {
  currentNotation: string | null;
  stagingAreaNotation: string | null;
}

type AppEvent =
  | { type: 'VIEW_SOLUTION'; notation: string }
  | {
      type: 'OPEN_BUILDER';
      notation: string | null;
      stagingAreaNotation?: string | null;
    }
  | { type: 'BACK_TO_BROWSER' }
  | { type: 'GO_HOME' }
  | { type: 'GO_TO_BROWSER' };

export const appMachine = createMachine({
  id: 'app',

  initial: 'home',

  types: {
    context: {} as AppContext,

    events: {} as AppEvent,
  },

  context: {
    currentNotation: null,
    stagingAreaNotation: null,
  },

  states: {
    home: {
      on: {
        GO_TO_BROWSER: {
          target: 'browser',
        },

        OPEN_BUILDER: {
          target: 'builder',

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: ({ event }) =>
              event.stagingAreaNotation ?? null,
          }),
        },
      },
    },

    browser: {
      on: {
        GO_HOME: {
          target: 'home',

          actions: assign({
            currentNotation: () => null,
            stagingAreaNotation: () => null,
          }),
        },

        VIEW_SOLUTION: {
          target: 'viewer',

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: () => null,
          }),
        },

        OPEN_BUILDER: {
          target: 'builder',

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: ({ event }) =>
              event.stagingAreaNotation ?? null,
          }),
        },
      },
    },

    viewer: {
      on: {
        GO_HOME: {
          target: 'home',

          actions: assign({
            currentNotation: () => null,
            stagingAreaNotation: () => null,
          }),
        },

        BACK_TO_BROWSER: {
          target: 'browser',

          actions: assign({
            currentNotation: () => null,
            stagingAreaNotation: () => null,
          }),
        },

        VIEW_SOLUTION: {
          target: 'viewer',

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: () => null,
          }),
        },

        OPEN_BUILDER: {
          target: 'builder',

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: ({ event }) =>
              event.stagingAreaNotation ?? null,
          }),
        },
      },
    },

    builder: {
      on: {
        GO_HOME: {
          target: 'home',

          actions: assign({
            currentNotation: () => null,
            stagingAreaNotation: () => null,
          }),
        },

        BACK_TO_BROWSER: {
          target: 'browser',

          actions: assign({
            currentNotation: () => null,
            stagingAreaNotation: () => null,
          }),
        },

        VIEW_SOLUTION: {
          target: 'viewer',

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: () => null,
          }),
        },

        OPEN_BUILDER: {
          target: 'builder',

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: ({ event }) =>
              event.stagingAreaNotation ?? null,
          }),
        },
      },
    },
  },
});
