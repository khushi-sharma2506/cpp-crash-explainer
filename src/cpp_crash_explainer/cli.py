"""Command-line interface for C++ Crash Explainer."""

import argparse
import sys
from pathlib import Path
from cpp_crash_explainer.parser import parse_report
from cpp_crash_explainer.rules import explain_report


def main(args=None):
    parser = argparse.ArgumentParser(
        prog="cpp-crash-explainer",
        description="Explain C++ AddressSanitizer diagnostic reports in plain English."
    )
    parser.add_argument(
        "report_file",
        nargs="?",
        type=str,
        help="Path to the file containing the AddressSanitizer report (reads stdin if omitted)."
    )

    parsed_args = parser.parse_args(args)

    if parsed_args.report_file:
        path = Path(parsed_args.report_file)
        if not path.exists():
            print(f"Error: File not found: {parsed_args.report_file}", file=sys.stderr)
            sys.exit(1)
        raw_text = path.read_text(encoding="utf-8", errors="replace")
    else:
        if sys.stdin.isatty():
            parser.print_help()
            sys.exit(1)
        raw_text = sys.stdin.read()

    report = parse_report(raw_text)
    explanation = explain_report(report)
    print(explanation.format_text())


if __name__ == "__main__":
    main()
