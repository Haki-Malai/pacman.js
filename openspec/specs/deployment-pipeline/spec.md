# deployment-pipeline Specification

## Purpose
TBD - created by archiving change add-pages-cicd-pipeline. Update Purpose after archive.
## Requirements
### Requirement: CI-First Branch Deployments
Deployments to GitHub Pages environment paths SHALL run only after a successful `CI` workflow run triggered by a `push` event on mapped deployment branches.

#### Scenario: Successful push CI deploys mapped environment
- **WHEN** a push to `development`, `int`, or `main` completes `CI` successfully
- **THEN** deployment runs for exactly one mapped environment path (`/dev/`, `/int/`, or `/prod/`)

### Requirement: Environment Path Isolation
Each deployment SHALL replace only the target environment subfolder on `gh-pages`, and MUST preserve other environment subfolders.

#### Scenario: Deploying one environment does not overwrite others
- **WHEN** deployment publishes `/int/`
- **THEN** existing `/dev/` and `/prod/` content remains unchanged

### Requirement: Manual Deploys Use Strict Mapped Branch Policy
Manual deployments SHALL require selecting one environment, MUST map that environment to its branch, and any optional `ref` input MUST resolve to a commit reachable from the mapped branch.

#### Scenario: Invalid manual ref is rejected
- **WHEN** manual deploy uses a `ref` not reachable from the mapped branch
- **THEN** deployment fails before build/publish with a clear error

### Requirement: Manual Deploys Require Prior CI Success
Manual deployments SHALL verify that the target commit has a successful `CI` workflow run before publishing.

#### Scenario: Manual deploy blocked without successful CI
- **WHEN** selected target commit has no successful `CI` run
- **THEN** deployment job fails and does not push to `gh-pages`

### Requirement: Pull Requests Do Not Deploy
Pull request events SHALL run repository CI checks, and MUST NOT trigger deployment publishing.

#### Scenario: PR run skips deployment
- **WHEN** a pull request triggers `CI`
- **THEN** no deployment workflow publishes to GitHub Pages

### Requirement: Root URL Redirects to Production Path
The root GitHub Pages document SHALL redirect to `./prod/`.

#### Scenario: Pages root sends traffic to production path
- **WHEN** a user opens the site root URL
- **THEN** the page redirects to the production environment path

