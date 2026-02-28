## Why

The repository currently has CI checks but no deployment pipeline that keeps dedicated GitHub Pages environments available for development, integration, and production. We need a CI-first deployment workflow that only publishes after successful checks and keeps `/dev/`, `/int/`, and `/prod/` available at all times.

## What Changes

- Add a dedicated deploy workflow (`.github/workflows/deploy-pages.yml`) that runs after successful `CI` workflow runs on mapped branches.
- Map branches to environment paths:
  - `development -> /dev/`
  - `int -> /int/`
  - `main -> /prod/`
- Add manual deployment via `workflow_dispatch` with strict branch mapping and ref validation.
- Publish to `gh-pages` by replacing only the target environment subfolder and preserving the others.
- Auto-bootstrap `gh-pages` on first deployment when missing.
- Ensure root Pages path (`/`) redirects to `/prod/`.
- Document deployment behavior and usage in `README.md`.

## Capabilities

### New Capabilities
- `deployment-pipeline`: CI-first environment deployment requirements for GitHub Pages branch and manual operational controls.

### Modified Capabilities
- None.

## Impact

- Affected workflows: `.github/workflows/deploy-pages.yml` (new), `.github/workflows/ci.yml` (no behavior change required).
- Affected docs: `README.md`.
- Affected operations: one-time creation of remote `int` branch from `main`.
- No gameplay/runtime behavior changes.
