"""
Data Preservation and Immutability Verification Engine.
Problem Statement ID: 26064

Enforces strict separation of stages:
    data/raw/        -> IMMUTABLE SOURCE (read-only, never modified)
    data/processed/  -> calibrated and preprocessed data
    data/features/   -> feature matrices
    data/predictions/-> model anomaly scores and classifications

Includes SHA-256 cryptographic hashing to prove raw data integrity before and after pipeline execution.
"""

import hashlib
import os
import stat
from typing import Dict, List, Optional


def compute_file_sha256(filepath: str) -> str:
    """Computes SHA-256 hash of a file to verify immutability."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found for hash calculation: {filepath}")
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


def ensure_directory_structure(base_data_dir: str = "data") -> Dict[str, str]:
    """
    Creates and validates the canonical 4-tier data directory structure.
    
    Returns:
        Dictionary mapping stage name to directory path.
    """
    stages = {
        "raw": os.path.join(base_data_dir, "raw"),
        "processed": os.path.join(base_data_dir, "processed"),
        "features": os.path.join(base_data_dir, "features"),
        "predictions": os.path.join(base_data_dir, "predictions"),
        "fixtures": os.path.join(base_data_dir, "fixtures"),
    }
    for path in stages.values():
        os.makedirs(path, exist_ok=True)
    return stages


def verify_raw_data_unmodified(
    filepath: str,
    original_hash: str,
) -> bool:
    """
    Verifies that a raw sensor data file was not mutated during processing.
    
    Args:
        filepath: Path to raw file.
        original_hash: SHA-256 hash recorded before pipeline execution.
        
    Returns:
        True if identical.
        
    Raises:
        ValueError if file was modified.
    """
    current_hash = compute_file_sha256(filepath)
    if current_hash != original_hash:
        raise ValueError(
            f"DATA INTEGRITY VIOLATION: Raw file '{filepath}' was mutated!\n"
            f"Expected SHA-256: {original_hash}\n"
            f"Current SHA-256:  {current_hash}"
        )
    return True
