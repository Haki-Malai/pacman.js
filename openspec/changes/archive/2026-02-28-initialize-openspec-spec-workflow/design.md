## Context

The repository currently documents product behavior in root-level markdown files (`SPECIFICATIONS.md` and `ROADMAP.md`) and validates them with a custom script. OpenSpec is already initialized, but the active change has no artifacts yet, so the project cannot use an end-to-end OpenSpec proposal-to-apply workflow.

Constraints for this migration:
- Keep gameplay/runtime behavior unchanged.
- Keep existing mechanics JSON fixtures under `tests/specs/*.json`.
- Keep the npm script name `spec:check` stable to avoid churn in existing command habits and CI wiring.
- Keep the migration focused: update only `AGENTS.md` and `README.md` among markdown docs.

## Goals / Non-Goals

**Goals:**
- Make OpenSpec artifacts the authoritative source for behavior and workflow governance.
- Produce an apply-ready change with `proposal`, `design`, `specs`, and `tasks`.
- Remove legacy root spec markdown files.
- Preserve a `spec:check` command that now validates OpenSpec content.

**Non-Goals:**
- No gameplay feature implementation, removal, or balancing changes.
- No refactor of mechanics fixture schema or tests under `tests/specs`.
- No broad documentation rewrite beyond `AGENTS.md` and `README.md`.

## Decisions

1. **Use concise, capability-based OpenSpec specs instead of a full one-to-one migration of old prose.**
   - Why: keeps requirements normative and maintainable while still preserving contractual intent.
   - Alternative considered: full content port from old root docs; rejected due to verbosity and duplicate maintenance burden.

2. **Delete only root `SPECIFICATIONS.md` and `ROADMAP.md`; keep `tests/specs/*.json`.**
   - Why: root docs are legacy authority, while JSON files are test fixtures consumed by existing Vitest helpers.
   - Alternative considered: delete JSON fixtures too; rejected because it would break mechanics tests and expands scope.

3. **Repoint `scripts/check-specifications.mjs` to OpenSpec validation while preserving `pnpm run spec:check`.**
   - Why: maintains stable command surface and updates semantics to OpenSpec compliance.
   - Alternative considered: rename or remove `spec:check`; rejected to avoid CI/script churn.

4. **Update `AGENTS.md` and `README.md` to remove legacy references and establish OpenSpec workflow usage.**
   - Why: prevents conflicting guidance and aligns contributor instructions with tooling.
   - Alternative considered: leave docs unchanged temporarily; rejected because stale instructions create operational risk.

## Risks / Trade-offs

- [Risk] Concise rewrite could omit an important legacy requirement detail.  
  → Mitigation: encode normative MUST/SHALL requirements for implemented behavior and explicit roadmap-not-implemented boundaries.

- [Risk] `spec:check` semantics change may surprise contributors expecting old heading/ID validation.  
  → Mitigation: document the new OpenSpec validation behavior in `AGENTS.md` and `README.md`.

- [Risk] Deleting root files may leave stale references in scripts/docs.  
  → Mitigation: run targeted grep checks and completion gate commands after edits.

## Migration Plan

1. Create OpenSpec artifacts (`proposal.md`, `design.md`, capability specs, `tasks.md`) and verify status reaches apply-ready.
2. Remove root legacy spec docs.
3. Replace legacy checker logic with OpenSpec validation invocation.
4. Update `AGENTS.md` and `README.md`.
5. Run validation gates (`openspec validate ...`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run spec:check`).

## Open Questions

- None for this migration scope.
