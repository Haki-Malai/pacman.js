## Context

Pause feedback currently applies visual filters only to the canvas. HUD text is rendered as fixed-position DOM in `document.body` at the top-left, which prevents a cohesive pause treatment and does not satisfy the requested bottom status bar layout.

## Goals

- Make pause state visually unambiguous by applying monochrome/dim treatment to the whole game mount.
- Keep pause overlay semantics intact (visible only when paused).
- Move HUD into a persistent bottom bar with clear left/right sections.
- Represent lives with heart icons while preserving score/lives event-driven updates.

## Non-Goals

- No gameplay logic changes to pause timing semantics.
- No score/lives rules changes.
- No map/camera/animation behavior changes beyond presentation classes.

## Decisions

1. Apply paused visual classes to `mount` in `PauseOverlaySystem`.
   - Reason: includes both canvas and HUD without introducing cross-system style coupling.
2. Keep pause overlay as a mount child, toggled by runtime pause state.
   - Reason: preserves existing accessibility and interaction model.
3. Refactor HUD adapter to mount under game root, not `document.body`.
   - Reason: keeps HUD within shared pause treatment surface and localizes lifecycle cleanup.
4. Render lives as repeated heart `<img>` nodes plus a numeric text label.
   - Reason: icon-first presentation with readable fallback/value text.

## Risks and Mitigations

- Risk: class ordering can violate Tailwind lint rules.
  - Mitigation: keep deterministic class strings and run lint gate.
- Risk: DOM-focused tests in a `node` test environment.
  - Mitigation: use lightweight local DOM stubs in dedicated unit tests without changing global Vitest environment.
- Risk: HUD may overlap content incorrectly on small screens.
  - Mitigation: fixed bottom bar with compact typography and responsive-safe spacing.

## Validation Plan

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run spec:check`
- `openspec validate pause-monochrome-bottom-hud-bar --type change --strict --no-interactive`

