## 1. Camera Startup Behavior Fix

- [x] 1.1 Add an explicit camera startup snap path in `Camera2D` that places the camera at the clamped follow-centered position without per-frame lerp.
- [x] 1.2 Update `CameraSystem.start()` to initialize bounds/zoom/viewport/follow and invoke the startup snap so the first visible frame is not from `(0, 0)`.
- [x] 1.3 Confirm regular update-time follow interpolation remains unchanged after startup initialization.

## 2. Camera Regression Test Coverage

- [x] 2.1 Add/expand `Camera2D` unit tests covering startup snap behavior, follow interpolation behavior, and map-bounds clamping.
- [x] 2.2 Add `CameraSystem` lifecycle tests covering startup initialization sequencing and resize-driven viewport updates.
- [x] 2.3 Ensure camera tests are deterministic and run as part of the default `pnpm run test` workflow.

## 3. Camera Behavior Documentation

- [x] 3.1 Document current camera startup/follow/bounds/resize behavior in repository docs, aligned with `camera-runtime-contract`.
- [x] 3.2 Cross-check docs wording against OpenSpec scenarios to keep behavioral intent consistent.

## 4. Verification

- [x] 4.1 Run `pnpm run typecheck`.
- [x] 4.2 Run `pnpm run lint`.
- [x] 4.3 Run `pnpm run test`.
- [x] 4.4 Run `pnpm run spec:check`.
