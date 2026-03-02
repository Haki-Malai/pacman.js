## 1. OpenSpec Artifacts

- [x] 1.1 Create `proposal.md` describing combined diagnostics mode and control remap
- [x] 1.2 Create `design.md` documenting input/system design decisions and trade-offs
- [x] 1.3 Create capability spec at `specs/developer-runtime-diagnostics/spec.md`
- [x] 1.4 Validate OpenSpec artifacts with strict validation command

## 2. Runtime Implementation

- [x] 2.1 Update `InputSystem` keyboard handling so `Option+KeyC` toggles diagnostics mode
- [x] 2.2 Preserve `Shift+KeyC` clipboard copy behavior while making plain `C` a no-op
- [x] 2.3 Extend `DebugOverlaySystem` with a runtime diagnostics panel (FPS + frame time)
- [x] 2.4 Keep collision debug and runtime metrics visibility bound to a single mode flag

## 3. Tests

- [x] 3.1 Extend `inputSystem.test.ts` with `Option+KeyC` toggle coverage and plain `C` no-op coverage
- [x] 3.2 Add `debugOverlaySystem.test.ts` covering runtime panel visibility and metrics output
- [x] 3.3 Verify diagnostics mode disable path clears relevant panel text/state

## 4. Documentation & Verification

- [x] 4.1 Update README controls documentation for `Option+KeyC` and `Shift+KeyC`
- [x] 4.2 Run `pnpm run typecheck`
- [x] 4.3 Run `pnpm run lint`
- [x] 4.4 Run `pnpm run test`
- [x] 4.5 Run `pnpm run spec:check`
- [x] 4.6 Run `pnpm exec openspec validate add-dev-tools-runtime-diagnostics --type change --strict --no-interactive`
