## Overview

Implement mobile swipe movement as a lightweight gesture layer on top of existing input/runtime flow.

## Gesture Model

- Track one active touch-like pointer gesture (`pointerId`, start X/Y).
- On pointer move:
  - require minimum displacement threshold
  - apply dominant-axis lock ratio
  - commit exactly one direction per gesture
- Reset active gesture on pointer up/cancel.

## Input Source Priority

- Keyboard directional input remains existing source of truth while keys are held.
- Swipe commits are ignored while directional keyboard input is active.

## Pause Interaction

- Touch-like pointer down should not pause active gameplay; it starts a swipe gesture.
- If game is paused, touch pointer down resumes via existing toggle path.
- Desktop pointer behavior remains unchanged (pointer down toggles pause).

## Scope Boundaries

- No changes to movement rules or collision behavior.
- No HUD or camera system redesign.
