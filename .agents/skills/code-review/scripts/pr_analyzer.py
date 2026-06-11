#!/usr/bin/env python3
"""Analyze changed files and suggest review/test scope for ts-match."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


def run(cmd: list[str], cwd: Path) -> str:
    result = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"command failed: {' '.join(cmd)}")
    return result.stdout.strip()


def get_repo_root(target: str) -> Path:
    start = Path(target).resolve()
    if start.is_file():
        start = start.parent
    output = run(["git", "rev-parse", "--show-toplevel"], start)
    return Path(output)


def command_succeeds(cmd: list[str], cwd: Path) -> bool:
    result = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    return result.returncode == 0


def diff_files(repo_root: Path, base: str, head: str, staged: bool) -> tuple[list[str], str]:
    if staged:
        output = run(["git", "diff", "--cached", "--name-only"], repo_root)
        files = [line for line in output.splitlines() if line]
        return files, "staged"

    files: list[str] = []
    diff_mode_parts: list[str] = []

    if base and command_succeeds(["git", "rev-parse", "--verify", "--quiet", base], repo_root):
        output = run(["git", "diff", "--name-only", f"{base}...{head}"], repo_root)
        files.extend(line for line in output.splitlines() if line)
        diff_mode_parts.append(f"{base}...{head}")
    else:
        fallback_ranges = [
            ["git", "diff", "--name-only", f"{head}~1", head],
            ["git", "diff", "--name-only", head],
        ]
        for cmd in fallback_ranges:
            if command_succeeds(cmd, repo_root):
                output = run(cmd, repo_root)
                files.extend(line for line in output.splitlines() if line)
                diff_mode_parts.append("fallback")
                break

    local_tracked_output = run(["git", "diff", "--name-only"], repo_root)
    local_staged_output = run(["git", "diff", "--cached", "--name-only"], repo_root)
    local_files = [
        line
        for line in (local_tracked_output.splitlines() + local_staged_output.splitlines())
        if line
    ]
    if local_files:
        files.extend(local_files)
        diff_mode_parts.append("working-tree")

    return sorted(set(files)), " + ".join(diff_mode_parts) if diff_mode_parts else "none"


def untracked_files(repo_root: Path) -> list[str]:
    output = run(["git", "ls-files", "--others", "--exclude-standard"], repo_root)
    return [line for line in output.splitlines() if line]


def load_package_scripts(repo_root: Path) -> dict[str, str]:
    package_json = repo_root / "package.json"
    if not package_json.exists():
        return {}

    try:
        payload = json.loads(package_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

    scripts = payload.get("scripts", {})
    if isinstance(scripts, dict):
        return {str(key): str(value) for key, value in scripts.items()}
    return {}


def detect_package_manager(repo_root: Path) -> str:
    if (repo_root / "pnpm-lock.yaml").exists():
        return "pnpm"
    if (repo_root / "bun.lockb").exists() or (repo_root / "bun.lock").exists():
        return "bun"
    if (repo_root / "yarn.lock").exists():
        return "yarn"
    if (repo_root / "package-lock.json").exists() or (repo_root / "package.json").exists():
        return "npm"
    return "unknown"


def run_script_command(package_manager: str, script_name: str) -> str:
    if package_manager == "pnpm":
        return f"pnpm {script_name}"
    if package_manager == "yarn":
        return f"yarn {script_name}"
    if package_manager == "bun":
        return f"bun run {script_name}"
    if package_manager == "npm":
        return f"npm run {script_name}"
    return f"<run {script_name}>"


def is_doc_file(path: str) -> bool:
    return (
        path.startswith("docs/")
        or path.endswith((".md", ".mdx", ".rst", ".adoc", ".txt"))
        or path
        in {
            "AGENTS.md",
            "CHANGELOG.md",
            "CONTEXT.md",
            "LICENSE",
            "README.md",
            "SKILL.md",
        }
    )


def is_runtime_test_file(path: str) -> bool:
    return path.startswith("tests/") or "__tests__" in path_segments(path) or ".test." in path or ".spec." in path


def is_type_test_file(path: str) -> bool:
    return path.startswith("type-tests/") or "__typecheck__" in path_segments(path) or ".typecheck." in path


def is_diagnostic_fixture(path: str) -> bool:
    return path.startswith("diagnostics/")


def is_test_file(path: str) -> bool:
    return is_runtime_test_file(path) or is_type_test_file(path) or is_diagnostic_fixture(path)


def is_ts_file(path: str) -> bool:
    return path.endswith((".ts", ".tsx", ".mts", ".cts"))


def path_segments(path: str) -> set[str]:
    return set(path.replace("\\", "/").split("/"))


def is_colocated_test_or_typecheck(path: str) -> bool:
    segments = path_segments(path)
    return path.startswith("src/") and ("__tests__" in segments or "__typecheck__" in segments)


def is_source_file(path: str) -> bool:
    return path.startswith("src/") and is_ts_file(path) and not is_colocated_test_or_typecheck(path)


def is_runtime_source(path: str) -> bool:
    return is_source_file(path) and path not in {"src/index.ts", "src/types.ts"} and not path.startswith("src/types/")


def is_public_surface(path: str) -> bool:
    return path in {
        "package.json",
        "src/assertions/index.ts",
        "src/assertions.ts",
        "src/errors/index.ts",
        "src/errors.ts",
        "src/group/index.ts",
        "src/group.ts",
        "src/index.ts",
        "src/match-by/index.ts",
        "src/match-by.ts",
        "src/match/index.ts",
        "src/match.ts",
        "src/patterns/index.ts",
        "src/patterns.ts",
        "src/types/index.ts",
        "src/types.ts",
        "README.md",
        "SKILL.md",
    }


def touches_path(path: str, prefixes: tuple[str, ...], exact: set[str]) -> bool:
    return path in exact or path.startswith(prefixes)


def classify(files: list[str]) -> dict[str, bool]:
    checks = {
        "touches_source": False,
        "touches_runtime_source": False,
        "touches_type_source": False,
        "touches_public_api": False,
        "touches_match": False,
        "touches_match_by": False,
        "touches_patterns": False,
        "touches_promise": False,
        "touches_runtime_tests": False,
        "touches_type_tests": False,
        "touches_diagnostics": False,
        "touches_docs": False,
        "touches_examples": False,
        "touches_benchmarks": False,
        "touches_package": False,
        "touches_scripts": False,
        "touches_config": False,
        "touches_ci": False,
    }

    config_files = {
        ".prettierrc",
        ".prettierrc.json",
        "eslint.config.mjs",
        "release-please-config.json",
        "tsconfig.build.json",
        "tsconfig.diagnostics.json",
        "tsconfig.eslint.json",
        "tsconfig.examples.json",
        "tsconfig.json",
        "tsconfig.type-bench.json",
        "tsconfig.type-tests.json",
        "vitest.config.ts",
        "vitest.coverage.config.ts",
    }

    package_files = {
        "package.json",
        "pnpm-lock.yaml",
        "package-lock.json",
        "yarn.lock",
        "bun.lock",
        "bun.lockb",
    }

    for file_path in files:
        path = file_path.replace("\\", "/")
        basename = Path(path).name

        if is_source_file(path):
            checks["touches_source"] = True
        if is_runtime_source(path):
            checks["touches_runtime_source"] = True
        if is_source_file(path):
            checks["touches_type_source"] = True
        if is_public_surface(path):
            checks["touches_public_api"] = True
        if touches_path(path, ("src/match/",), {"src/match.ts", "src/runtime.ts"}):
            checks["touches_match"] = True
        if touches_path(
            path,
            ("src/match-by/", "src/group/"),
            {"src/match-by.ts", "src/group.ts", "src/keys.ts", "src/shared/keys.ts"},
        ):
            checks["touches_match_by"] = True
        if touches_path(
            path,
            ("src/patterns/", "src/runtime/", "src/assertions/"),
            {"src/patterns.ts", "src/runtime.ts", "src/assertions.ts"},
        ):
            checks["touches_patterns"] = True
        if touches_path(
            path,
            ("src/promise/", "src/match/promise", "src/match-by/promise"),
            {"src/promise-runtime.ts", "src/match.ts", "src/match-by.ts"},
        ):
            checks["touches_promise"] = True
        if is_runtime_test_file(path):
            checks["touches_runtime_tests"] = True
        if is_type_test_file(path):
            checks["touches_type_tests"] = True
        if is_diagnostic_fixture(path):
            checks["touches_diagnostics"] = True
        if is_doc_file(path):
            checks["touches_docs"] = True
        if path.startswith("examples/"):
            checks["touches_examples"] = True
        if path.startswith("benchmarks/"):
            checks["touches_benchmarks"] = True
        if path in package_files:
            checks["touches_package"] = True
        if path.startswith("scripts/"):
            checks["touches_scripts"] = True
        if path in config_files or basename.endswith((".config.ts", ".config.js", ".config.cjs", ".config.mjs")):
            checks["touches_config"] = True
        if path.startswith((".github/workflows/", ".circleci/", ".buildkite/")):
            checks["touches_ci"] = True

    checks["docs_only"] = bool(files) and all(is_doc_file(file_path.replace("\\", "/")) for file_path in files)
    return checks


def risk_level(classes: dict[str, bool]) -> str:
    if classes.get("docs_only"):
        return "low"

    score = 0
    if classes["touches_public_api"]:
        score += 3
    if classes["touches_source"]:
        score += 2
    if classes["touches_package"]:
        score += 2
    if classes["touches_diagnostics"]:
        score += 1
    if classes["touches_config"] or classes["touches_ci"]:
        score += 1
    if classes["touches_benchmarks"]:
        score += 1

    if score >= 5:
        return "high"
    if score >= 2:
        return "medium"
    return "low"


def append_script(
    checks: list[str],
    scripts: dict[str, str],
    package_manager: str,
    script_name: str,
    suffix: str = "",
) -> None:
    if script_name in scripts:
        checks.append(f"{run_script_command(package_manager, script_name)}{suffix}")


def recommend_checks(
    classes: dict[str, bool],
    risk: str,
    files: list[str],
    scripts: dict[str, str],
    package_manager: str,
) -> tuple[list[str], list[str]]:
    notes: list[str] = []

    if not files:
        return ["No changed files detected."], notes

    checks: list[str] = []

    if classes["docs_only"]:
        append_script(checks, scripts, package_manager, "test:docs")
        if not checks:
            checks.append("No mandatory tests (docs-only change).")
        return checks, notes

    if classes["touches_source"]:
        append_script(checks, scripts, package_manager, "build")
        append_script(checks, scripts, package_manager, "typecheck:only")

    if classes["touches_runtime_source"] or classes["touches_runtime_tests"]:
        append_script(checks, scripts, package_manager, "test")

    if classes["touches_type_source"] or classes["touches_type_tests"] or classes["touches_public_api"]:
        append_script(checks, scripts, package_manager, "test:type")

    if classes["touches_diagnostics"] or classes["touches_type_source"]:
        append_script(checks, scripts, package_manager, "test:diagnostics")

    if classes["touches_docs"]:
        append_script(checks, scripts, package_manager, "test:docs")

    if classes["touches_examples"]:
        append_script(checks, scripts, package_manager, "test:examples:validate")
        append_script(checks, scripts, package_manager, "test:examples:run")

    if classes["touches_public_api"]:
        append_script(checks, scripts, package_manager, "smoke:exports")
        notes.append("Public API touched; verify README, examples, type tests, and release notes expectations.")

    if classes["touches_package"]:
        append_script(checks, scripts, package_manager, "pack:check")
        append_script(checks, scripts, package_manager, "check:zero-runtime-deps")

    if classes["touches_benchmarks"]:
        append_script(checks, scripts, package_manager, "bench:native:check")
        append_script(checks, scripts, package_manager, "bench:types")

    if classes["touches_scripts"] or classes["touches_config"] or classes["touches_ci"]:
        append_script(checks, scripts, package_manager, "lint")
        if risk == "high":
            append_script(checks, scripts, package_manager, "check")

    if classes["touches_source"] and not (
        classes["touches_runtime_tests"]
        or classes["touches_type_tests"]
        or classes["touches_diagnostics"]
    ):
        notes.append("Source changed without runtime, type, or diagnostic fixture changes; confirm existing coverage is sufficient.")

    if classes["touches_package"]:
        notes.append("Package metadata changed; verify exports, package contents, and zero runtime dependencies.")

    if risk == "high" and "check" in scripts:
        notes.append(f"High-risk library change; run {run_script_command(package_manager, 'check')} before merge.")

    if not checks:
        checks.append("Run the project validation command for the touched areas.")

    deduped: list[str] = []
    for check in checks:
        if check not in deduped:
            deduped.append(check)

    return deduped, notes


def build_report(repo_root: Path, files: list[str], base: str, head: str, diff_mode: str) -> dict[str, Any]:
    classes = classify(files)
    risk = risk_level(classes)
    scripts = load_package_scripts(repo_root)
    package_manager = detect_package_manager(repo_root)
    checks, notes = recommend_checks(classes, risk, files, scripts, package_manager)

    return {
        "repo_root": str(repo_root),
        "base": base,
        "head": head,
        "diff_mode": diff_mode,
        "package_manager": package_manager,
        "available_scripts": sorted(scripts.keys()),
        "changed_file_count": len(files),
        "changed_files": sorted(files),
        "classification": classes,
        "risk_level": risk,
        "recommended_checks": checks,
        "notes": notes,
    }


def print_human(report: dict[str, Any]) -> None:
    print("PR Analyzer")
    print("=" * 40)
    print(f"Diff mode: {report['diff_mode']}")
    print(f"Package manager: {report['package_manager']}")
    print(f"Changed files: {report['changed_file_count']}")
    print(f"Risk level: {report['risk_level']}")

    if report["available_scripts"]:
        print("\nDetected scripts:")
        for script_name in report["available_scripts"]:
            print(f"- {script_name}")

    print("\nClassification:")
    for key, value in report["classification"].items():
        print(f"- {key}: {'yes' if value else 'no'}")

    if report["changed_files"]:
        print("\nChanged files:")
        for file_path in report["changed_files"]:
            print(f"- {file_path}")

    print("\nRecommended checks:")
    for check in report["recommended_checks"]:
        print(f"- {check}")

    if report["notes"]:
        print("\nNotes:")
        for note in report["notes"]:
            print(f"- {note}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze git diff scope for ts-match review.")
    parser.add_argument("--target", default=".", help="Repository path or file inside repo.")
    parser.add_argument("--base", default="origin/main", help="Base ref for diff comparison.")
    parser.add_argument("--head", default="HEAD", help="Head ref for diff comparison.")
    parser.add_argument("--staged", action="store_true", help="Analyze staged files only.")
    parser.add_argument(
        "--include-untracked",
        action="store_true",
        help="Include untracked files in changed file list.",
    )
    parser.add_argument("--json", action="store_true", help="Print report as JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        repo_root = get_repo_root(args.target)
        files, diff_mode = diff_files(repo_root, args.base, args.head, args.staged)
        if args.include_untracked:
            files = sorted(set(files + untracked_files(repo_root)))

        report = build_report(repo_root, files, args.base, args.head, diff_mode)

        if args.json:
            print(json.dumps(report, indent=2))
        else:
            print_human(report)

        return 0
    except RuntimeError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
