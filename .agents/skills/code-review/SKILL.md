---
name: code-review
description: Review local diffs and pull requests for @diegogbrisa/ts-match: runtime correctness, type-level behavior, diagnostics, public API compatibility, tests, docs, packaging, and maintainability.
---

# Code Review

Review for bugs first. Summaries are secondary.

## Workflow

1. Load repository context before reviewing:
   - `AGENTS.md`
   - `CONTEXT.md`
   - `docs/agents/domain.md`
   - Relevant docs under `docs/` and `docs/adr/` when the diff touches their topic.
2. Inspect the diff and current dirty tree. Treat unrelated local changes as user work unless told otherwise.
3. Run the bundled analyzers when useful:

```bash
python3 .agents/skills/code-review/scripts/pr_analyzer.py --base origin/main --include-untracked
python3 .agents/skills/code-review/scripts/code_quality_checker.py --base origin/main --include-untracked
```

To generate a markdown scaffold from both helpers:

```bash
python3 .agents/skills/code-review/scripts/review_report_generator.py --base origin/main --include-untracked
```

4. Apply repository terminology from `CONTEXT.md` before generic style preferences.
5. Run or recommend the narrowest relevant verification commands from `package.json`.
6. Report findings first, ordered by severity.

## Review Priorities

1. Public API compatibility and package export stability.
2. Runtime matching correctness, especially edge cases and error behavior.
3. Type-level behavior, exhaustiveness, narrowing, and selected handler payloads.
4. `ts-match:` diagnostics readability and fixture coverage.
5. Missing or weak runtime, type, diagnostic, docs, example, or package checks.
6. ESM-first/CommonJS compatibility packaging, Node 20+ behavior, and zero runtime dependencies.
7. Performance regressions in hot matching paths, with evidence.
8. Maintainability issues that make future matcher behavior harder to reason about.

## ts-match Checks

- Public APIs remain intentional: `match`, `match.promise`, `matchBy`, `matchBy.promise`, `P`, named `p*` helpers, `group`, assertion helpers, and public errors.
- Runtime semantics and type-level semantics stay aligned for patterns, selections, promise builders, `matchBy` property paths, grouped cases, partial cases, and fallbacks.
- Exhaustiveness changes update runtime tests, type tests, and diagnostic fixtures where relevant.
- Error changes preserve public classes and readable messages for `NonExhaustiveMatchError`, `PatternMismatchError`, and `ts-match:` compiler diagnostics.
- Package changes preserve ESM imports, CommonJS compatibility exports, declaration output, package contents, examples, README links, and zero runtime dependencies.
- New helpers are covered through runtime tests, type fixtures, docs/examples, and public export smoke checks.
- Benchmarks are considered when matching runtime loops, dispatch strategy, or type-level complexity changes in a meaningful way.

## Useful Verification

- Runtime behavior: `pnpm test`
- Type-level behavior: `pnpm test:type`
- Diagnostics: `pnpm test:diagnostics`
- Public API and declarations: `pnpm build`, `pnpm typecheck:only`, `pnpm smoke:exports`
- Docs/examples: `pnpm test:docs`, `pnpm test:examples:validate`, `pnpm test:examples:run`
- Package contents: `pnpm pack:check`
- Full local gate: `pnpm check`

Prefer targeted commands while reviewing. Recommend `pnpm check` or `pnpm release:preflight` only when the change scope justifies the cost.

## Output Contract

- Findings first, ordered by severity.
- Include concrete file and line references.
- Explain the impact and violated rule or contract.
- If no findings exist, state that and list residual risks or testing gaps.
- Keep the summary short.

## Severity

- `P0`: security issue, data loss/corruption, broken package publication, or release blocker.
- `P1`: high-probability functional bug, public API break, type-system regression, or major runtime regression.
- `P2`: moderate correctness, diagnostic, test, packaging, architecture, or maintainability issue.
- `P3`: minor improvement, clarity issue, or polish.

## References

- `references/code_review_checklist.md`
- `references/coding_standards.md`
- `references/common_antipatterns.md`
