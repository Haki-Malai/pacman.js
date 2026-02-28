## 1. OpenSpec Artifacts

- [x] 1.1 Create `proposal.md` with new capabilities `gameplay-contract` and `spec-governance`
- [x] 1.2 Create `design.md` documenting migration decisions and risk mitigations
- [x] 1.3 Create `specs/gameplay-contract/spec.md` with implemented baseline and roadmap-not-implemented requirements
- [x] 1.4 Create `specs/spec-governance/spec.md` with approval and verification gate requirements

## 2. Legacy Spec Source Migration

- [x] 2.1 Remove root `SPECIFICATIONS.md`
- [x] 2.2 Remove root `ROADMAP.md`
- [x] 2.3 Repoint `scripts/check-specifications.mjs` to OpenSpec validation while preserving `pnpm run spec:check`

## 3. Contributor Guidance Updates

- [x] 3.1 Update `AGENTS.md` behavior-contract workflow to OpenSpec-first guidance
- [x] 3.2 Update `README.md` product docs section to OpenSpec paths

## 4. Verification

- [x] 4.1 Run `openspec validate initialize-openspec-spec-workflow --type change --strict --no-interactive`
- [x] 4.2 Run `pnpm run typecheck`
- [ ] 4.3 Run `pnpm run lint` (blocked locally: missing `eslint-plugin-tailwindcss` in `node_modules`)
- [x] 4.4 Run `pnpm run test`
- [x] 4.5 Run `pnpm run spec:check`
- [x] 4.6 Verify no stale legacy references with `rg -n "SPECIFICATIONS\\.md|ROADMAP\\.md" README.md AGENTS.md package.json scripts`
