## 1. OpenSpec Artifacts

- [x] 1.1 Create `proposal.md` for CI-first multi-environment Pages deployment
- [x] 1.2 Create `design.md` with deployment decisions and constraints
- [x] 1.3 Create `specs/deployment-pipeline/spec.md` with normative requirements
- [x] 1.4 Create implementation task checklist

## 2. Deployment Workflow

- [x] 2.1 Add `.github/workflows/deploy-pages.yml` with `workflow_run` + `workflow_dispatch` triggers
- [x] 2.2 Implement target resolution (`env_path`, `mapped_branch`, `target_sha`) and strict manual ref validation
- [x] 2.3 Enforce manual CI-success guard before deployment
- [x] 2.4 Build and publish to `gh-pages` with per-environment folder replacement and auto-bootstrap
- [x] 2.5 Add root redirect (`/ -> ./prod/`) and no-op detection (skip commit when unchanged)

## 3. Documentation and Rollout

- [x] 3.1 Update `README.md` with deployment mapping, URLs, CI-first rule, and manual usage
- [x] 3.2 Create remote `int` branch from `main` for integration deployments

## 4. Verification

- [x] 4.1 Run `pnpm run typecheck`
- [x] 4.2 Run `pnpm run lint`
- [x] 4.3 Run `pnpm run test`
- [x] 4.4 Run `pnpm run spec:check`
