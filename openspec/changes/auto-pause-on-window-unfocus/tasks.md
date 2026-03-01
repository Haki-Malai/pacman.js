## 1. OpenSpec Artifacts

- [x] 1.1 Create `proposal.md` for focus-loss auto-pause behavior
- [x] 1.2 Create `design.md` for runtime listener/state approach
- [x] 1.3 Create capability delta `specs/pause-hud-presentation/spec.md`
- [x] 1.4 Create implementation checklist in `tasks.md`

## 2. Runtime Implementation

- [x] 2.1 Add runtime focus/visibility listeners in `GameRuntime` with start/destroy lifecycle management
- [x] 2.2 Add internal focus-auto-pause state tracking to separate manual pause vs focus-triggered pause
- [x] 2.3 Implement focus-loss pause handling for `window.blur` and hidden-document transitions
- [x] 2.4 Implement focus-return conditional auto-resume handling that preserves manual pauses

## 3. Tests

- [x] 3.1 Extend `gameRuntime.test.ts` with `window.blur` auto-pause behavior coverage
- [x] 3.2 Extend `gameRuntime.test.ts` with hidden-document auto-pause behavior coverage
- [x] 3.3 Extend `gameRuntime.test.ts` with conditional auto-resume and manual-pause-preservation coverage

## 4. Verification

- [x] 4.1 Run `pnpm run typecheck`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm run test`
- [x] 4.4 Run `pnpm run spec:check`
- [x] 4.5 Run `pnpm exec openspec validate auto-pause-on-window-unfocus --type change --strict --no-interactive`
