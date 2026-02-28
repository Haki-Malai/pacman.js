## Context

The project uses GitHub Actions for CI (`.github/workflows/ci.yml`) and deploys a Vite bundle. We need environment-specific GitHub Pages deployments while preserving CI as the gating workflow.

Constraints:
- Deployments must be CI-first.
- Three environments must remain simultaneously available at stable URLs.
- PR events must not deploy.
- Manual deploys must stay aligned with mapped branch policy.
- Keep workflow changes focused and avoid gameplay/runtime modifications.

## Goals / Non-Goals

**Goals**
- Publish `/dev/`, `/int/`, `/prod/` from `development`, `int`, `main`.
- Trigger deployment only after `CI` succeeds for push events.
- Support manual deploy input (`environment`, optional `ref`) with strict mapped-branch validation.
- Ensure `gh-pages` is auto-created when absent.
- Preserve non-target environment folders on each deployment.
- Redirect root Pages path to `./prod/`.

**Non-Goals**
- PR preview deployments.
- User allowlist deployment gates.
- Changes to CI job content itself.

## Decisions

1. **Use a separate deploy workflow (`deploy-pages.yml`) triggered by `workflow_run` and `workflow_dispatch`.**
   - Keeps `CI` as a pure check pipeline and deployment concerns isolated.

2. **Require `workflow_run` event constraints `conclusion == success` and `event == push`.**
   - Prevents PR-triggered CI runs from deploying.

3. **Implement strict branch mapping for all deployments.**
   - `dev -> development`, `int -> int`, `prod -> main`.
   - Manual `ref` must resolve to a commit reachable from the mapped branch.

4. **Use `gh-pages` branch sync instead of `actions/deploy-pages`.**
   - Allows replacing only one environment subfolder while preserving the others.

5. **Add a manual CI-success guard for `workflow_dispatch`.**
   - Prevents deploying commits that have not passed `CI`.

6. **Serialize deployments with workflow-level concurrency.**
   - Avoids races when multiple deployments push to `gh-pages`.

## Data Flow

1. Resolve deployment target (`env_path`, `mapped_branch`, `target_sha`) from event context.
2. For manual runs, verify successful `CI` for `target_sha`.
3. Build Vite bundle from `target_sha`.
4. Sync artifact into `gh-pages/<env_path>/` only.
5. Ensure `.nojekyll` and root redirect document exist.
6. Commit and push only when content changed.

## Risks / Mitigations

- **Risk:** `workflow_run` triggers from PR checks.
  - **Mitigation:** explicit `github.event.workflow_run.event == 'push'` guard.

- **Risk:** manual ref points outside mapped branch history.
  - **Mitigation:** strict ancestor check against `origin/<mapped_branch>`.

- **Risk:** first deployment fails if `gh-pages` is absent.
  - **Mitigation:** auto-bootstrap orphan `gh-pages` branch in publish step.

- **Risk:** concurrent publishes overwrite each other.
  - **Mitigation:** single concurrency group for deployment workflow.
