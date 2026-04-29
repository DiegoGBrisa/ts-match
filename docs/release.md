# Release process

This document describes how ts-match releases work after the repository and npm package are already configured.

## Overview

Releases are driven by Conventional Commits and release-please:

1. Changes land on `main`.
2. release-please opens or updates a release PR.
3. The release PR updates `package.json`, `pnpm-lock.yaml`, and `CHANGELOG.md`.
4. Merging the release PR creates a GitHub Release and tag.
5. The same Release Please workflow validates that tag and publishes `@diegogbrisa/ts-match` to npm with provenance.

The npm registry is the only publish target. npm, pnpm, Yarn, and Bun users all install the same npm package.

## Commit messages

Use Conventional Commits for every commit that lands on `main`.

Release-triggering commits:

- `feat(scope): description` creates a minor release.
- `fix(scope): description` creates a patch release.
- `feat(scope)!: description` or a `BREAKING CHANGE:` footer creates a major release.

Non-release commits by themselves:

- `docs(scope): description`
- `test(scope): description`
- `chore(scope): description`
- `refactor(scope): description`
- `ci(scope): description`
- `build(scope): description`

If a docs or refactor change also changes public behavior, use the commit type that matches the public impact.

## Release PRs

release-please owns version and changelog updates. Do not bump `package.json` manually for normal releases.

The manifest records `1.0.0` as the current package version, and `release-please-config.json` uses `bootstrap-sha` to start release-note collection after that baseline. Future release PRs should only include commits made after the published `1.0.0` release baseline.

When a release PR opens:

1. Review the version bump.
2. Review the `CHANGELOG.md` entry.
3. Confirm CI is green.
4. Merge the release PR.

After merge, release-please creates the GitHub Release and the Release Please workflow publishes npm from the same workflow run. This avoids relying on a separate `release.published` workflow event, because GitHub does not start downstream workflow runs for releases created with the repository `GITHUB_TOKEN`.

## Automated npm publishing

`.github/workflows/release-please.yml` owns both release creation and npm publishing.

When release-please creates a stable release, the workflow:

1. Checks out the release tag.
2. Verifies the tag matches `package.json` version, for example `v1.2.3` ↔ `1.2.3`.
3. Runs validation on Node 20, 22, and 24.
4. Runs package-manager smoke tests for npm, pnpm, Yarn v4, and Bun across Node 20, 22, and 24.
5. Verifies the npm version is not already published.
6. Publishes with npm Trusted Publishing provenance:

```bash
npm publish --provenance --access public
```

The npm Trusted Publisher must match the publishing workflow and environment:

- workflow filename: `release-please.yml`
- environment name: `npm`

Do not publish manually for normal releases.

## Changelog formatting

release-please owns `CHANGELOG.md` and may generate Markdown that differs from Prettier's preferred bullet and spacing style. `CHANGELOG.md` is intentionally excluded from Prettier so generated release PRs and historical release tags are not blocked by formatting-only churn.

## Local preflight

Run this before merging release-sensitive changes or before manually checking a release branch:

```bash
pnpm release:preflight
```

That runs:

- linting and formatting checks;
- source and type tests;
- diagnostic fixture checks;
- runtime coverage;
- example validation;
- TypeScript performance diagnostics;
- runtime benchmark budgets;
- tarball contents and export smoke;
- production dependency audit;
- zero-runtime-dependency check.

For package-manager-specific local checks, pack first:

```bash
pnpm pack:check
```

Then run any installed package-manager smoke checks:

```bash
pnpm smoke:package-manager -- npm
pnpm smoke:package-manager -- pnpm
YARN_VERSION=4.5.3 pnpm smoke:package-manager -- yarn
PATH="$HOME/.bun/bin:$PATH" pnpm smoke:package-manager -- bun
```

CI remains the source of truth for the full Node/package-manager matrix.

## Runtime benchmark budgets

Runtime budgets live in [`benchmarks/budgets.json`](../benchmarks/budgets.json).

Policy:

- budgets are broad absolute `ns/op` ceilings;
- only ts-match scenarios are budgeted;
- native baseline scenarios may be reported but are not budget gates;
- missing budgeted scenarios fail;
- unbudgeted scenarios are allowed but reported.

Update budgets only when a reviewed performance change intentionally changes the expected envelope.

## Package contents

`pnpm pack:check` builds the package, creates a tarball, checks its contents against a strict allowlist, and runs import smoke tests.

The package intentionally includes:

- `dist` JavaScript and declaration files;
- `README.md`;
- `CHANGELOG.md`;
- `LICENSE`;
- `docs`;
- `examples`;
- `diagnostics`;
- `benchmarks/native.ts`.

The package intentionally excludes source maps, declaration maps, tests, type tests, and internal comparison/dispatch benchmarks.

## Verifying a published release

After the Release Please workflow publishes npm:

```bash
npm view @diegogbrisa/ts-match@<version> version
npm view @diegogbrisa/ts-match@<version> dist.integrity
```

Then verify package-manager installs if you want an extra manual check:

```bash
npm install @diegogbrisa/ts-match
pnpm add @diegogbrisa/ts-match
yarn add @diegogbrisa/ts-match
bun add @diegogbrisa/ts-match
```

Use disposable directories for manual install checks.

## Failed release recovery

### Validation fails before npm publish

If validation fails before `npm publish` runs, rerun the workflow only if the failure is clearly transient. Release publishing runs the same substantive checks as `pnpm check` but intentionally omits `format:check`, because historical release tags should not be blocked by generated changelog formatting. If the tag is bad, delete the GitHub Release and tag, fix `main`, and let release-please create a new release.

### GitHub Release exists but npm publish did not run

Use the Release Please workflow's manual dispatch with `publish_tag` set to the existing tag, for example `v1.0.1`. The workflow validates the tag, verifies the npm version is unpublished, and publishes with provenance.

### npm version already exists

npm versions are immutable. If a version already exists, do not try to overwrite it. Confirm whether the package published successfully. If a fix is needed, make a new Conventional Commit and release the next version.

### npm publish succeeds but a later step fails

Treat the npm version as published. Fix forward with a new release.

## Do not do this

- Avoid running `npm publish` locally for normal releases.
- Use neither `pnpm publish`, `yarn npm publish`, nor `bun publish` for this package.
- Keep `NPM_TOKEN` unset unless Trusted Publishing is intentionally replaced.
- Never reuse a published npm version.
- Leave release-please version bumps untouched, except intentional changelog wording edits inside the release PR.
