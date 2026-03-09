# backend/scripts/export_validation_report.py

"""
Aggregate validation run outputs into a simple report.
"""

from pathlib import Path

VALIDATION_DIR = Path("../validation_runs")


def main():
    files = list(VALIDATION_DIR.glob("*.json"))

    print("Validation Run Report")
    print("---------------------")

    for f in sorted(files):
        print(f.name)

    print(f"\nTotal validation runs: {len(files)}")


if __name__ == "__main__":
    main()