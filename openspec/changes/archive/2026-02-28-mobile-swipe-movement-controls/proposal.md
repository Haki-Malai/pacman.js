## Why

Mobile controls currently depend on keyboard-only direction changes, while touch pointer-down is used for pause toggling. This makes movement on phones/tablets unreliable and unintuitive.

## What Changes

- Add swipe/slide-to-move direction input for touch/coarse pointer usage.
- Add pointer lifecycle handling (`pointerup`, `pointercancel`) to support deterministic gesture completion/reset.
- Add threshold + axis-lock gesture rules to reduce accidental diagonal jitter.
- Preserve existing keyboard movement behavior and make keyboard directional input authoritative while keys are held.
- Keep desktop pointer pause-toggle behavior.

## Capabilities

### New Capabilities
- `mobile-input-controls`: normative swipe input behavior for touch devices.

### Modified Capabilities
- None.

## Impact

- Runtime/input code:
  - `src/engine/input.ts`
  - `src/game/infrastructure/adapters/BrowserInputAdapter.ts`
  - `src/game/systems/InputSystem.ts`
  - `src/config/constants.ts`
- Tests:
  - `src/__tests__/inputSystem.test.ts`
- No gameplay physics/pathfinding changes.
