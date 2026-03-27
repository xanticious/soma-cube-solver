# Soma Cube Solver & Visualizer

A static web app for solving and visualizing solutions to the [Soma cube](https://en.wikipedia.org/wiki/Soma_cube) — a classic 3D block-placing puzzle where seven irregular pieces must be assembled into a 3×3×3 cube.

## Features

- **Solution Browser** — Browse all 11,520 solutions (or filter to ~240 distinct solutions, unique under rotation)
- **Solution Viewer** — 3D visualization with orbit controls; step through piece placements one at a time (Prev/Next)
- **Builder View** — Free-form 9×9×9 grid where you can manually place pieces, rotate them, and build cubes or other shapes
- **Notation System** — Compact, human-readable notation for describing solutions: `V-a0-b0-c0-x0-y0-z0,L-a1-b2-c0-x1-y0-z2,...`
- **URL Sharing** — Solutions are addressable via `?notation=...` query parameters

## Tech Stack

| Tool        | Purpose                      |
| ----------- | ---------------------------- |
| TypeScript  | Language                     |
| Vite        | Build tool                   |
| Three.js    | 3D rendering                 |
| XState      | Application state management |
| Vitest      | Unit testing                 |
| Oxlint      | Linting                      |
| Oxfmt       | Formatting                   |
| CSS Modules | Scoped styling               |

## Getting Started

```bash
npm install

# Generate all solutions (pre-computed, bundled as JSON)
npm run solve

# Start dev server
npm run dev
```

## Scripts

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start Vite dev server                            |
| `npm run build`      | Type-check and build for production              |
| `npm run preview`    | Preview production build                         |
| `npm run solve`      | Run solver to generate `src/data/solutions.json` |
| `npm test`           | Run unit tests                                   |
| `npm run test:watch` | Run tests in watch mode                          |
| `npm run lint`       | Lint with Oxlint                                 |
| `npm run fmt`        | Format with Oxfmt                                |
| `npm run fmt:check`  | Check formatting                                 |

## Notation Format

Each piece placement is encoded as:

```
{Piece}-a{yaw}-b{pitch}-c{roll}-x{X}-y{Y}-z{Z}
```

- **Piece**: `V` (3 cubelets), `L`, `T`, `Z`, `A`, `B`, `P` (4 cubelets each)
- **a/b/c**: Rotation steps (0–3 → 0°/90°/180°/270°). a = yaw (Z-axis), b = pitch (X-axis), c = roll (Y-axis)
- **x/y/z**: Grid position of the anchor cubelet

A full solution is 7 comma-separated tokens. Example:

```
V-a0-b0-c0-x0-y0-z0,L-a1-b2-c0-x1-y0-z2,T-a0-b0-c0-x0-y2-z0,...
```

## Project Structure

```
soma-cube-solver/
├── scripts/
│   └── solve.ts              # Generates solutions.json at build time
├── src/
│   ├── core/
│   │   ├── types.ts           # Shared types (Vec3, Orientation, Placement, etc.)
│   │   ├── pieces.ts          # Piece cubelet offset definitions & colors
│   │   ├── rotations.ts       # 24 rotation matrices, orientation helpers
│   │   ├── notation.ts        # Parse & serialize notation strings
│   │   ├── solver.ts          # Backtracking solver & deduplication
│   │   └── validation.ts      # Overlap / gap / bounds detection
│   ├── data/
│   │   └── solutions.json     # Pre-computed solutions (generated)
│   ├── components/
│   │   ├── Scene/             # Three.js scene, lights, orbit controls
│   │   ├── SolutionBrowser/   # List all solutions with filter
│   │   ├── SolutionViewer/    # 3D step-through viewer
│   │   └── BuilderView/       # Free-form piece placement
│   ├── state/
│   │   └── appMachine.ts      # XState machine for app navigation
│   ├── styles/
│   │   └── global.css
│   └── main.ts                # Entry point
├── test/
│   └── core/                  # Mirrored unit tests
└── index.html
```

## Builder Controls

1. **Select** a piece from the sidebar palette
2. **Rotate** with keyboard: `A` (yaw), `B` (pitch), `C` (roll)
3. **Place** by entering Layer (Y), Column (X), Row (Z) via number keys 0–8
4. **Cancel** with `Escape`

## Piece Colors (Lego-inspired)

| Piece | Color         | Hex       |
| ----- | ------------- | --------- |
| V     | Bright Red    | `#CC0000` |
| L     | Bright Yellow | `#FFD700` |
| T     | Bright Blue   | `#0057A8` |
| Z     | Bright Green  | `#00A550` |
| A     | Bright Orange | `#FF6E00` |
| B     | Bright Purple | `#9B27AF` |
| P     | Light Gray    | `#E8E8E8` |

## License

MIT
