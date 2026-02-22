# Pacman

A modern TypeScript + Vite rewrite of my original Pac-Man school project.

This repo keeps the gameplay architecture clean/testable while preserving the old vibe (including the classic intro/menu feel from the original `Games/Pac-Man JavaScript` project).

- Legacy repo reference: [Haki-Malai/Games → Pac-Man JavaScript](https://github.com/Haki-Malai/Games/tree/main/Pac-Man%20JavaScript)

## Getting started

- `pnpm install`
- `pnpm dev` to launch the Vite dev server.
- `pnpm build` to produce the deployable bundle in `dist/`.
- `pnpm preview` to serve the built bundle locally.
- `pnpm typecheck` to run TypeScript with `--noEmit`.
- `pnpm lint` to run ESLint.
- `pnpm test` to execute the Vitest suite.

## Tech stack

- TypeScript + Vite
- Vitest (unit/mechanics/fuzz checks)
- ESLint + Prettier
- Tailwind CSS (for UI shell/menu/HUD styling)
- Canvas2D runtime for gameplay rendering

## Project layout

- `src/main.ts` boots the shell experience (menu + runtime lifecycle).
- `src/ui/` contains the product shell and legacy-inspired menu controller.
- `src/game/` contains runtime composition, systems, domain, and infrastructure adapters.
- `src/engine/` contains loop/camera/input/timer/tween/renderer primitives.
- `src/style.css` contains Tailwind layers + custom animation classes.
- `public/assets/` holds sprites, tilemaps, and static assets copied to `dist/`.

## Product docs

- `SPECIFICATIONS.md` defines the player-facing behavior contract.
- `ROADMAP.md` defines the product path to `v1.0`.
- `docs/ARCHITECTURE.md` explains boundaries and runtime wiring.
- `docs/LEGACY_MENU_MIGRATION.md` documents the old-to-new menu migration mapping.

## Current status (high level)

Implemented:

- Grid movement with buffered turns.
- Ghost jail/release + baseline decision behavior.
- Portal behavior.
- Pause/resume timing semantics.
- Legacy-style animated intro/menu integration.

Planned next major items:

- Ghost defeat/respawn loop.
- Full scoring/lives/game-over flow.
- Level progression.
- Audio polish.
