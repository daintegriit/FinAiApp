import subprocess
import sys


def test_global_validation_runs():
    """
    Ensure the global validation pipeline runs successfully.
    """

    result = subprocess.run(
        [sys.executable, "-m", "scripts.run_global_validation"],
        capture_output=True,
        text=True
    )

    assert result.returncode == 0