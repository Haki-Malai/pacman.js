## 1. OpenSpec Artifacts

- [x] 1.1 Create proposal for mobile swipe movement controls
- [x] 1.2 Create design notes for gesture handling, precedence, and pause behavior
- [x] 1.3 Add normative capability spec for mobile input controls
- [x] 1.4 Archive change artifacts after implementation

## 2. Input Runtime Changes

- [x] 2.1 Extend input manager with pointer lifecycle subscriptions (`pointerup`, `pointercancel`)
- [x] 2.2 Expose new pointer lifecycle events through browser input adapter
- [x] 2.3 Implement swipe gesture detection in `InputSystem` (threshold + axis lock)
- [x] 2.4 Ensure one direction commit per swipe and reset on pointer end/cancel
- [x] 2.5 Preserve keyboard directional priority while keys are held
- [x] 2.6 Preserve desktop pause toggle behavior while avoiding touch conflict during active play

## 3. Verification

- [x] 3.1 Run targeted tests for mobile swipe behavior (`inputSystem.test.ts`)
- [x] 3.2 Run typecheck (`pnpm run typecheck`)
