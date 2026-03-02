# Pacman
This is a pacman game i am currently working on for fun. I have developed it again with similar animations and sprites but due to it being my first javascript project it didn't come out as good and scalable. The code was messy and the bugs were countless. The old repository is [here](https://github.com/Haki-Malai/Games/tree/main/Pac-Man%20JavaScript).

## Getting started
- `pnpm install`
- `pnpm dev` to launch the Vite dev server (serves from `public/assets` and `src/`).
- `pnpm build` to produce the deployable bundle in `dist/`.
- `pnpm preview` to serve the built bundle locally.
- `pnpm run map:demo:convert` to generate `public/assets/mazes/default/demo.json` from `demo.tmx` + `tileset.tsx`.
- `pnpm typecheck` to run the strict TypeScript compiler with `--noEmit`.
- `pnpm lint` to run ESLint against the TypeScript sources (including Tailwind utility class validation).
- `pnpm format` / `pnpm format:check` to run Prettier (Tailwind utility classes are auto-sorted).
- `pnpm test` to execute the Vitest suite.

## Demo map runtime selection
- Set `VITE_GAME_ENV=DEMO` to run with `public/assets/mazes/default/demo.json`.
- Any other `VITE_GAME_ENV` value (or missing env) keeps default runtime map loading (`public/assets/mazes/default/maze.json`).
- Regenerate demo JSON after Tiled edits:
  - `pnpm run map:demo:convert`
  - then run `pnpm run test` to validate parser/runtime contracts.

## Project layout
- `src/main.ts` boots the custom Canvas2D game runtime.
- `src/engine/` contains the in-repo engine primitives (loop, camera, input, timers, tweens, renderer).
- `src/game/` contains map parsing, runtime gameplay wiring, and UI overlay modules.
- `src/tailwind.css` is the Tailwind entry stylesheet (`@tailwind base/components/utilities`).
- `public/assets/` holds sprites, tilemaps, and other static assets copied to `dist/`.
- `index.html` is the Vite entry HTML.

## Product docs
- `openspec/specs/` defines approved product behavior contracts and governance capabilities.
- `openspec/changes/` contains proposed changes and implementation tasks before they are archived into specs.
- `pnpm run spec:check` validates OpenSpec artifacts.

## Deployment
- CI checks are defined in `.github/workflows/ci.yml`.
- GitHub Pages deployments are defined in `.github/workflows/deploy-pages.yml` and run only after successful `CI` runs for `push` events.
- Branch to environment mapping:
  - `development` -> `/dev/`
  - `int` -> `/int/`
  - `main` -> `/prod/`
- Expected project URLs:
  - `https://haki-malai.github.io/pacman.js/dev/`
  - `https://haki-malai.github.io/pacman.js/int/`
  - `https://haki-malai.github.io/pacman.js/prod/`
  - Root `https://haki-malai.github.io/pacman.js/` redirects to `/prod/`.
- `workflow_dispatch` supports:
  - `environment`: `dev`, `int`, or `prod` (maps to `development`, `int`, `main`)
  - `ref` (optional): must resolve to a commit reachable from the mapped branch
- Pull request events run CI but do not publish deployments.

## About the game
The code is written with scalability in mind. Levels are authored in Tiled using the included tileset and exported JSON map. Object layers supply Pacman and ghost spawns (including pen bounds) and place collectibles directly in the map data.
