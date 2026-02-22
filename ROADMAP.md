# Product Roadmap

## Audience and Purpose

This roadmap is for product owner, design, and delivery planning.

It defines how this game moves from the currently implemented mechanics to a complete `v1.0` desktop-web product. It is intentionally human-readable and outcome-first, with concise execution notes to guide future tasks.

## Definition of Complete Product (v1.0)

`v1.0` is considered complete when all of the following are true:

- The game has a full playable core loop with clear win and lose outcomes.
- Gameplay systems are complete: scoring, lives, ghost interactions, and level progression.
- Product shell UX is complete: start, pause, game-over, win, restart, and new-run flow.
- Audio and feedback are integrated and tuned.
- Stability and determinism quality gates are passing consistently.
- A player can run a full session without relying on developer-only controls.

## Current State Snapshot

Current implemented baseline (from `SPECIFICATIONS.md`):

- Grid-based Pacman movement with buffered turning and collision rules.
- Ghost jail behavior, release behavior, free-roam decision logic, and scared mode behavior.
- Portal behavior with center-only teleport and same-tick guard.
- Legacy-style intro/menu shell flow (START-gated runtime launch).
- Pause/resume semantics and deterministic test harness support.
- Basic HUD and collision debug tools.

Known roadmap gaps already tracked:

- `RD-GHOST-001` ghost death to jail/respawn lifecycle.
- `RD-SCORE-001` collectible scoring and score event gameplay integration.
- `RD-LIFE-001` life-loss and deterministic reset flow.
- `RD-LEVEL-001` level completion transition and progression.
- `RD-MAP-001` production map contract checks for portal/pen-gate validity.

## v1.0 Non-Goals

- Mobile controls/parity and mobile-first UX.
- Online services, multiplayer, cloud sync, or accounts.
- Monetization, live-ops economy, or ad systems.
- Seasonal content systems.

## Milestones

### M1 Core Loop Completion

Outcome:

- Player can win/lose a round with complete moment-to-moment gameplay consequences.

Includes:

- Ghost death/respawn behavior.
- Score integration from collectibles and key events.
- Life-loss, respawn/reset, and game-over flow.

Delivery notes:

- Prioritize deterministic behavior and reproducible tests for every new mechanic.
- Keep behavior aligned with `SPECIFICATIONS.md` and update that file only when approved.

Exit criteria:

- `RD-GHOST-001`, `RD-SCORE-001`, and `RD-LIFE-001` are implemented and test-backed.
- Core loop can reach game-over and restart cleanly.

### M2 Progression and Leveling

Outcome:

- Player can finish a level and continue through at least one additional level state.

Includes:

- Collectible completion detection.
- Level-complete transition.
- Level reset/next-level spawn rules.
- Initial difficulty ramp decisions.

Delivery notes:

- Reuse existing map contract approach before introducing new runtime complexity.

Exit criteria:

- `RD-LEVEL-001` implemented with deterministic progression behavior.
- At least one end-to-end multi-level session path exists.

### M3 Product Shell and UX

Outcome:

- Product has complete user-facing flow outside raw gameplay.

Includes:

- Menu/start screen.
- In-game pause UX.
- Game-over and win screens.
- Restart/new-run UX.
- HUD readability polish.

Delivery notes:

- Desktop keyboard-first interaction remains the primary target.
- Preserve existing debug controls while ensuring they are not required for normal play.

Exit criteria:

- A player can start, play, lose/win, and restart without developer/debug interactions.

### M4 Audio and Feedback

Outcome:

- Gameplay has clear and polished audio feedback.

Includes:

- SFX and music integration.
- Mute/volume controls.
- Feedback for collect, death, level transition, and major state changes.

Delivery notes:

- Audio behavior must remain correct across pause/resume and scene transitions.

Exit criteria:

- Audio can be toggled and behaves consistently across full session flow.

### M5 Balance and Stability

Outcome:

- Gameplay tuning feels intentional and defects are reduced to acceptable release threshold.

Includes:

- Tuning of speed, timers, and scoring values.
- Mechanics regression pass and fuzz confidence.
- Bug triage and resolution pass for top-priority defects.

Delivery notes:

- Balance changes must be test-observable where possible.
- Keep deterministic checks and replay tooling usable for regressions.

Exit criteria:

- No known P0/P1 gameplay defects.
- Mechanics gate remains consistently green.

### M6 Release Readiness (`v1.0`)

Outcome:

- Project is ready for a first polished desktop-web release.

Includes:

- Release checklist completion.
- Documentation consistency (`SPECIFICATIONS.md` and this roadmap).
- QA signoff and final build verification.

Delivery notes:

- Final pass should remove ambiguity between product behavior docs and implementation.

Exit criteria:

- `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run spec:check`, and production build all pass.
- `v1.0` product checklist is complete.

## Feature Sections (To Be Implemented)

This section groups the player-facing feature set to build for `v1.0`.

Scope guard:

- Include only gameplay, UX, visuals, and audio features.
- Exclude backend, online services, and infrastructure workstreams.

### Core Loop Features

- **Ghost defeat and respawn flow** (`RD-GHOST-001`): vulnerable ghost interaction, return-to-jail behavior, and re-entry into active play.
- **Scoring system integration** (`RD-SCORE-001`): point rules for collectibles and event-driven score updates during play.
- **Lives and game-over flow** (`RD-LIFE-001`): life decrement, round reset behavior, and game-over state transition.

### Progression Features

- **Level completion and transition** (`RD-LEVEL-001`): detect full collectible clear and transition once per completed level.
- **Level pacing and difficulty ramp**: progressively tune challenge across levels while preserving readability.
- **Map contract validation in play context** (`RD-MAP-001`): ensure required portal/pen-gate behavior appears correctly in production content.

### Session UX Features

- **Start/menu flow** (`PRD-UX-001`): clear entry point from launch to active run.
- **Win/lose/restart loop** (`PRD-UX-002`): complete end-of-run UX with restart/new run options.
- **HUD clarity polish** (`PRD-HUD-001`): score/lives readability and in-session status communication.
- **Pause UX polish**: ensure pause state is understandable and recoverable without confusion.

### Audio and Feedback Features

- **Core sound package** (`PRD-AUD-001`): gameplay SFX + music with mute/volume controls.
- **Event-based audio cues** (`PRD-AUD-002`): collect/death/level/pause feedback cues.
- **Moment-to-moment feedback polish**: improve perceived responsiveness via visual/audio feedback alignment.

### Replayability Features (Client-Side Only)

- **Local highscores**: persistent local ranking for repeat sessions.
- **Session summary screen**: show final score, level reached, and run outcome context.
- **Challenge presets**: optional run variants (for example pace/constraint presets) that remain single-player desktop focused.

## Backlog by Priority (Now / Next / Later)

| ID           | Area                        | Outcome                                                           | Priority | Depends On                            | Status      |
| ------------ | --------------------------- | ----------------------------------------------------------------- | -------- | ------------------------------------- | ----------- |
| RD-GHOST-001 | M1 Core Loop Completion     | Ghost death returns ghost to jail and re-enters release lifecycle | Now      | none                                  | planned     |
| RD-SCORE-001 | M1 Core Loop Completion     | Collectibles and events update score during gameplay              | Now      | none                                  | planned     |
| RD-LIFE-001  | M1 Core Loop Completion     | Pacman life-loss and deterministic reset flow                     | Now      | RD-SCORE-001                          | planned     |
| RD-LEVEL-001 | M2 Progression and Leveling | Completing collectibles transitions level once                    | Next     | RD-SCORE-001, RD-LIFE-001             | planned     |
| RD-MAP-001   | M2 Progression and Leveling | Enforced map portal/pen-gate contract for production maze         | Next     | none                                  | planned     |
| PRD-UX-001   | M3 Product Shell and UX     | Start/menu screen and game session entry flow                     | Done     | none                                  | implemented |
| PRD-UX-002   | M3 Product Shell and UX     | Game-over/win/restart flow with clear UX states                   | Next     | PRD-UX-001, RD-LIFE-001, RD-LEVEL-001 | planned     |
| PRD-HUD-001  | M3 Product Shell and UX     | HUD polish for score/lives/readability at gameplay speed          | Next     | RD-SCORE-001, RD-LIFE-001             | planned     |
| PRD-AUD-001  | M4 Audio and Feedback       | SFX/music and mute/volume controls                                | Later    | M3 UX flow complete                   | planned     |
| PRD-AUD-002  | M4 Audio and Feedback       | Audio hooks for collect/death/level/pause events                  | Later    | PRD-AUD-001, M1/M2 events complete    | planned     |
| PRD-BAL-001  | M5 Balance and Stability    | Gameplay tuning pass for movement, release timing, and scoring    | Later    | M1, M2, M4                            | planned     |
| PRD-QA-001   | M5 Balance and Stability    | Defect triage and regression pass to release threshold            | Later    | PRD-BAL-001                           | planned     |
| PRD-REL-001  | M6 Release Readiness        | Release checklist + docs + verification signoff                   | Later    | M1-M5 complete                        | planned     |

## Delivery Rules for Future Tasks

- Any behavior-changing task must begin with a **Proposed Behavior Delta** and explicit approval before implementation.
- Each roadmap item must define acceptance criteria before coding starts.
- After completing any roadmap item:
    - reconcile product behavior with `SPECIFICATIONS.md`,
    - run `pnpm run typecheck`,
    - run `pnpm run lint`,
    - run `pnpm run test`,
    - run `pnpm run spec:check`.
- This roadmap is manually governed (no CI/schema enforcement for roadmap content).
- Public API impact for this roadmap document itself: none.

## Risks and Mitigations

| Risk                                                   | Impact                                   | Mitigation                                                                   |
| ------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------- |
| Behavior drift between implementation and product docs | Confusing decisions and regressions      | Keep `SPECIFICATIONS.md` authoritative and reconcile after each roadmap item |
| Expanding scope before core loop completion            | Delayed v1.0 and unfinished fundamentals | Lock priority to M1 then M2 before shell/audio polish                        |
| Non-deterministic changes reduce test confidence       | Hard-to-reproduce bugs                   | Preserve seeded tests and add deterministic assertions for new mechanics     |
| UX additions conflict with gameplay state logic        | Broken transitions or stuck states       | Define explicit state transitions and test full session flows                |
| Late balancing causes repeated rework                  | Schedule churn near release              | Run balance checkpoints at M3 and M5, not only at end                        |

## Exit Checklist for v1.0

- Core loop complete: scoring, lives, ghost outcomes, win/lose behavior.
- Level progression complete and stable across at least one full multi-level run.
- Product shell complete: menu/start/pause/win/lose/restart.
- Audio and feedback complete with functional mute/volume controls.
- Stability and balancing pass complete with no known P0/P1 gameplay defects.
- Documentation aligned: `SPECIFICATIONS.md` and `ROADMAP.md`.
- Quality gates pass:
    - `pnpm run typecheck`
    - `pnpm run lint`
    - `pnpm run test`
    - `pnpm run spec:check`
    - `pnpm run build`
