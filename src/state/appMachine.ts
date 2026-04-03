import { createMachine, assign } from "xstate";

interface AppContext {
  currentNotation: string | null;
  stagingAreaNotation: string | null;
}

type AppEvent =
  | { type: "VIEW_SOLUTION"; notation: string }
  | {
      type: "OPEN_BUILDER";
      notation: string | null;
      stagingAreaNotation?: string | null;
    }
  | { type: "BACK_TO_BROWSER" };

export const appMachine = createMachine({
  id: "app",

  initial: "browser",

  types: {
    context: {} as AppContext,

    events: {} as AppEvent,
  },

  context: {
    currentNotation: null,
    stagingAreaNotation: null,
  },

  states: {
    browser: {
      on: {
        VIEW_SOLUTION: {
          target: "viewer",

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: () => null,
          }),
        },

        OPEN_BUILDER: {
          target: "builder",

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
        BACK_TO_BROWSER: {
          target: "browser",

          actions: assign({
            currentNotation: () => null,
            stagingAreaNotation: () => null,
          }),
        },

        VIEW_SOLUTION: {
          target: "viewer",

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: () => null,
          }),
        },

        OPEN_BUILDER: {
          target: "builder",

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
        BACK_TO_BROWSER: {
          target: "browser",

          actions: assign({
            currentNotation: () => null,
            stagingAreaNotation: () => null,
          }),
        },

        VIEW_SOLUTION: {
          target: "viewer",

          actions: assign({
            currentNotation: ({ event }) => event.notation,
            stagingAreaNotation: () => null,
          }),
        },

        OPEN_BUILDER: {
          target: "builder",

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
