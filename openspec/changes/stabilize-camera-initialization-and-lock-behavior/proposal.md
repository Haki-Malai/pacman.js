## Why

Camera behavior is currently under-specified and largely untested, which makes refactors risky and allows visual regressions to slip in unnoticed. We need to lock current expected camera behavior with explicit specs and tests, while fixing the startup issue where the camera visibly animates in from the top-left corner.

## What Changes

- Define a camera behavior contract that documents the current follow, bounds, zoom, resize, and startup expectations.
- Add detailed automated tests for camera behavior at engine and system levels so future changes cannot silently alter established behavior.
- Fix camera initialization so gameplay starts directly at the intended follow position instead of tweening in from the top-left.
- Keep camera public APIs stable; this change is behavioral hardening and regression prevention.

## Capabilities

### New Capabilities
- `camera-runtime-contract`: Normative requirements for camera startup, follow motion, bounds clamping, viewport/resize response, and regression-test coverage expectations.

### Modified Capabilities
- None.

## Impact

- Affected runtime code: `src/engine/camera.ts`, `src/game/systems/CameraSystem.ts`, and camera wiring in `src/game/app/GameCompositionRoot.ts` (if needed for startup alignment).
- Affected tests: new/expanded camera-focused unit tests under `src/__tests__/` (including deterministic startup and follow scenarios).
- Affected specs: new OpenSpec capability under `openspec/changes/stabilize-camera-initialization-and-lock-behavior/specs/camera-runtime-contract/spec.md`.
- No dependency additions and no intended gameplay API surface changes.
