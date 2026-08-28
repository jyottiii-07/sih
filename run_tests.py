"""
Test runner script.
"""
import sys
import pytest

if __name__ == "__main__":
    exit_code = pytest.main(["-v", "-p", "no:anyio", "tests"])
    sys.exit(exit_code)
