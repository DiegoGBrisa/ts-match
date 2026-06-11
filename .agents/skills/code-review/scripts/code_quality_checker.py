#!/usr/bin/env python3
"""Run ts-match-specific static guardrail checks for code review."""

from __future__ import annotations

import argparse
import json
import re
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


def get_repo_root(target: str) -> Path:
    start = Path(target).resolve()
    if start.is_file():
        start = start.parent
    output = run(["git", "rev-parse", "--show-toplevel"], start)
    return Path(output)


def changed_files(repo_root: Path, base: str, head: str, staged: bool) -> list[str]:
    if staged:
        output = run(["git", "diff", "--cached", "--name-only"], repo_root)
        return [line for line in output.splitlines() if line]

    files: list[str] = []

    if base and command_succeeds(["git", "rev-parse", "--verify", "--quiet", base], repo_root):
        output = run(["git", "diff", "--name-only", f"{base}...{head}"], repo_root)
        files.extend(line for line in output.splitlines() if line)
    else:
        fallback_ranges = [
            ["git", "diff", "--name-only", f"{head}~1", head],
            ["git", "diff", "--name-only", head],
        ]

        for cmd in fallback_ranges:
            if command_succeeds(cmd, repo_root):
                output = run(cmd, repo_root)
                files.extend(line for line in output.splitlines() if line)
                break

    local_tracked_output = run(["git", "diff", "--name-only"], repo_root)
    local_staged_output = run(["git", "diff", "--cached", "--name-only"], repo_root)
    files.extend(
        line
        for line in (local_tracked_output.splitlines() + local_staged_output.splitlines())
        if line
    )

    return sorted(set(files))


def tracked_files(repo_root: Path) -> list[str]:
    output = run(["git", "ls-files"], repo_root)
    return [line for line in output.splitlines() if line]


def untracked_files(repo_root: Path) -> list[str]:
    output = run(["git", "ls-files", "--others", "--exclude-standard"], repo_root)
    return [line for line in output.splitlines() if line]


def read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None


def is_scan_target(path: str) -> bool:
    return path.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"))


def path_segments(path: str) -> set[str]:
    return set(path.replace("\\", "/").split("/"))


def is_colocated_test_or_typecheck(path: str) -> bool:
    segments = path_segments(path)
    return path.startswith("src/") and ("__tests__" in segments or "__typecheck__" in segments)


def is_source_file(path: str) -> bool:
    return path.startswith("src/") and path.endswith((".ts", ".mts", ".cts")) and not is_colocated_test_or_typecheck(path)


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
    }


def is_runtime_test_file(path: str) -> bool:
    return path.startswith("tests/") or "__tests__" in path_segments(path) or ".test." in path or ".spec." in path


def is_type_test_file(path: str) -> bool:
    return path.startswith("type-tests/") or "__typecheck__" in path_segments(path) or ".typecheck." in path


def is_test_or_fixture(path: str) -> bool:
    return is_runtime_test_file(path) or is_type_test_file(path) or path.startswith("diagnostics/")


def find_line(text: str, pattern: re.Pattern[str]) -> int:
    for index, line in enumerate(text.splitlines(), start=1):
        if pattern.search(line):
            return index
    return 1


def add_finding(
    findings: list[dict[str, Any]],
    severity: str,
    file_path: str,
    line: int,
    title: str,
    detail: str,
) -> None:
    findings.append(
        {
            "severity": severity,
            "file": file_path,
            "line": line,
            "title": title,
            "detail": detail,
        }
    )


GENERATED_PATTERNS = (".gen.ts", ".gen.js", ".generated.ts", ".generated.js")
GENERATED_DIRS = ("dist/", ".pack/", "coverage/")
IMPORT_PATTERN = re.compile(
    r"(?:import|export)\s+(?:type\s+)?(?:[^'\"\n]*?\s+from\s+)?['\"]([^'\"]+)['\"]"
)


def import_specifiers(content: str) -> list[tuple[int, str]]:
    imports: list[tuple[int, str]] = []
    in_block_comment = False
    for index, line in enumerate(content.splitlines(), start=1):
        stripped = line.strip()
        if in_block_comment:
            if "*/" in stripped:
                in_block_comment = False
            continue
        if stripped.startswith("/*"):
            if "*/" not in stripped:
                in_block_comment = True
            continue
        if stripped.startswith(("//", "*")):
            continue

        match = IMPORT_PATTERN.search(line)
        if match:
            imports.append((index, match.group(1)))
    return imports


def check_package_json(repo_root: Path, findings: list[dict[str, Any]]) -> None:
    package_path = repo_root / "package.json"
    content = read_text(package_path)
    if content is None:
        return

    try:
        payload = json.loads(content)
    except json.JSONDecodeError as error:
        add_finding(
            findings,
            "high",
            "package.json",
            error.lineno,
            "Invalid package.json",
            "Package metadata must parse before publish checks can run.",
        )
        return

    dependencies = payload.get("dependencies", {})
    if isinstance(dependencies, dict) and dependencies:
        add_finding(
            findings,
            "high",
            "package.json",
            find_line(content, re.compile(r'"dependencies"\s*:')),
            "Runtime dependencies added",
            "ts-match promises zero runtime dependencies; add dependency-free code or justify a contract change.",
        )

    if payload.get("type") != "module":
        add_finding(
            findings,
            "high",
            "package.json",
            find_line(content, re.compile(r'"type"\s*:')),
            "ESM-only package contract changed",
            'The package should keep `"type": "module"` unless the release intentionally changes module format.',
        )

    engines = payload.get("engines", {})
    node_range = engines.get("node") if isinstance(engines, dict) else None
    if not isinstance(node_range, str) or "20" not in node_range:
        add_finding(
            findings,
            "medium",
            "package.json",
            find_line(content, re.compile(r'"engines"\s*:')),
            "Node 20+ engine contract unclear",
            "The repository targets Node 20+; keep package metadata aligned with that contract.",
        )


def check_file(repo_root: Path, file_path: str, findings: list[dict[str, Any]]) -> None:
    normalized = file_path.replace("\\", "/")

    if any(normalized.startswith(directory) for directory in GENERATED_DIRS):
        add_finding(
            findings,
            "high",
            normalized,
            1,
            "Generated artifact modified",
            "Generated artifacts should not be edited manually or committed as source changes.",
        )
        return

    if any(normalized.endswith(pattern) for pattern in GENERATED_PATTERNS):
        add_finding(
            findings,
            "high",
            normalized,
            1,
            "Generated file modified",
            "Generated artifacts should not be edited manually.",
        )
        return

    if normalized == "package.json":
        check_package_json(repo_root, findings)

    if not is_scan_target(normalized):
        return

    content = read_text(repo_root / normalized)
    if content is None:
        return

    if is_source_file(normalized):
        for line, specifier in import_specifiers(content):
            if specifier.startswith((".", "node:")):
                continue
            add_finding(
                findings,
                "high",
                normalized,
                line,
                "External import in runtime source",
                "Source files should remain dependency-free; external imports can violate the zero-runtime-dependency contract.",
            )

        forbidden_boundary_pattern = re.compile(r"['\"](?:\.\./)?(?:tests|type-tests|diagnostics|examples|dist)/")
        if forbidden_boundary_pattern.search(content):
            add_finding(
                findings,
                "high",
                normalized,
                find_line(content, forbidden_boundary_pattern),
                "Source imports test/generated boundary",
                "Published source must not depend on tests, fixtures, examples, or generated dist output.",
            )

        process_env_pattern = re.compile(r"\bprocess\.env\b")
        if process_env_pattern.search(content):
            add_finding(
                findings,
                "medium",
                normalized,
                find_line(content, process_env_pattern),
                "Runtime source reads process.env",
                "The library should keep matching behavior deterministic and independent of ambient environment.",
            )

        ts_ignore_pattern = re.compile(r"@ts-(?:ignore|expect-error)")
        if ts_ignore_pattern.search(content):
            add_finding(
                findings,
                "medium",
                normalized,
                find_line(content, ts_ignore_pattern),
                "TypeScript suppression in source",
                "Public library source should prove its type behavior without suppressing compiler errors.",
            )

        generic_error_pattern = re.compile(r"throw\s+new\s+Error\s*\(")
        if is_runtime_source(normalized) and generic_error_pattern.search(content):
            add_finding(
                findings,
                "low",
                normalized,
                find_line(content, generic_error_pattern),
                "Generic Error thrown from runtime source",
                "Check whether a public error class or clearer ts-match message is required for user-facing failures.",
            )

    as_any_pattern = re.compile(r"\bas any\b")
    if as_any_pattern.search(content):
        severity = "medium" if is_source_file(normalized) else "low"
        add_finding(
            findings,
            severity,
            normalized,
            find_line(content, as_any_pattern),
            "Type escape hatch (`as any`) detected",
            "Prefer explicit refinement or a narrower assertion; if this is intentional, verify tests cover the contract.",
        )

    double_assertion_pattern = re.compile(r"\bas unknown as\b")
    if double_assertion_pattern.search(content):
        severity = "medium" if is_source_file(normalized) else "low"
        add_finding(
            findings,
            severity,
            normalized,
            find_line(content, double_assertion_pattern),
            "Double assertion detected",
            "Double assertions can hide type-level regressions; keep them local and covered by fixtures.",
        )


def check_missing_tests(files: list[str], findings: list[dict[str, Any]]) -> None:
    normalized_files = [path.replace("\\", "/") for path in files]
    source_changes = [path for path in normalized_files if is_source_file(path)]
    runtime_source_changes = [path for path in normalized_files if is_runtime_source(path)]
    public_surface_changes = [path for path in normalized_files if is_public_surface(path)]

    runtime_tests_changed = any(is_runtime_test_file(path) for path in normalized_files)
    type_tests_changed = any(is_type_test_file(path) for path in normalized_files)
    diagnostics_changed = any(path.startswith("diagnostics/") for path in normalized_files)
    docs_or_examples_changed = any(
        path.startswith(("docs/", "examples/")) or path in {"README.md", "SKILL.md"}
        for path in normalized_files
    )

    if runtime_source_changes and not runtime_tests_changed:
        add_finding(
            findings,
            "medium",
            runtime_source_changes[0],
            1,
            "Runtime source changed without runtime tests",
            "Add or update Vitest coverage, or document why existing runtime tests cover this behavior.",
        )

    if source_changes and not type_tests_changed:
        add_finding(
            findings,
            "medium",
            source_changes[0],
            1,
            "Source changed without type tests",
            "Update type fixtures when inference, narrowing, exhaustiveness, or public helper behavior can change.",
        )

    if source_changes and not diagnostics_changed:
        add_finding(
            findings,
            "low",
            source_changes[0],
            1,
            "Source changed without diagnostic fixture updates",
            "Confirm existing diagnostic fixtures still cover user-facing `ts-match:` compiler messages.",
        )

    if public_surface_changes and not docs_or_examples_changed:
        add_finding(
            findings,
            "low",
            public_surface_changes[0],
            1,
            "Public surface changed without docs or examples",
            "Confirm README, docs, examples, and release notes do not need updates for this public contract change.",
        )


def severity_weight(severity: str) -> int:
    order = {"high": 0, "medium": 1, "low": 2}
    return order.get(severity, 3)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run static guardrail checks for ts-match review.")
    parser.add_argument("--target", default=".", help="Repository path or file inside repo.")
    parser.add_argument("--base", default="origin/main", help="Base ref for changed-file scan.")
    parser.add_argument("--head", default="HEAD", help="Head ref for changed-file scan.")
    parser.add_argument("--staged", action="store_true", help="Scan staged files only.")
    parser.add_argument("--all-files", action="store_true", help="Scan all tracked files.")
    parser.add_argument("--include-untracked", action="store_true", help="Include untracked files.")
    parser.add_argument("--json", action="store_true", help="Print output as JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        repo_root = get_repo_root(args.target)

        if args.all_files:
            files = tracked_files(repo_root)
        else:
            files = changed_files(repo_root, args.base, args.head, args.staged)

        if args.include_untracked:
            files = sorted(set(files + untracked_files(repo_root)))

        findings: list[dict[str, Any]] = []
        for file_path in sorted(set(files)):
            check_file(repo_root, file_path, findings)

        check_missing_tests(files, findings)
        findings.sort(key=lambda item: (severity_weight(item["severity"]), item["file"], item["line"]))

        report: dict[str, Any] = {
            "repo_root": str(repo_root),
            "scanned_file_count": len(sorted(set(files))),
            "findings": findings,
            "summary": {
                "high": sum(1 for item in findings if item["severity"] == "high"),
                "medium": sum(1 for item in findings if item["severity"] == "medium"),
                "low": sum(1 for item in findings if item["severity"] == "low"),
            },
        }

        if args.json:
            print(json.dumps(report, indent=2))
        else:
            print("Code Quality Checker")
            print("=" * 40)
            print(f"Scanned files: {report['scanned_file_count']}")
            print(
                "Findings: "
                f"high={report['summary']['high']} "
                f"medium={report['summary']['medium']} "
                f"low={report['summary']['low']}"
            )
            if findings:
                print("\nDetails:")
                for finding in findings:
                    print(
                        f"- [{finding['severity'].upper()}] {finding['title']} "
                        f"({finding['file']}:{finding['line']})"
                    )
                    print(f"  {finding['detail']}")
            else:
                print("No static guardrail findings.")

        return 0
    except RuntimeError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
