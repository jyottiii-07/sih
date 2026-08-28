"""
Data Validation and Preprocessing Pipeline for Seafloor Magnetic Sensor Readings.
Problem Statement ID: 26064

Includes:
- Strict schema and datatype validation
- Non-null, finite bounds, and timestamp integrity verification
- Time-series chronological sorting
- Total magnetic field signal calculation: B = sqrt(bx^2 + by^2 + bz^2)
- Robust rolling-median background baseline estimation and residual calculation
"""

from datetime import datetime
import json
import os
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


REQUIRED_COLUMNS = ["sensor_id", "timestamp", "x", "y", "bx", "by", "bz"]
NUMERIC_COLUMNS = ["x", "y", "bx", "by", "bz"]


class ValidationError(ValueError):
    """Raised when incoming sensor data fails schema or integrity validation."""
    pass


def validate_single_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates a single sensor reading dictionary.
    
    Args:
        record: Raw sensor reading dictionary.
        
    Returns:
        Validated record with coerced numeric types.
        
    Raises:
        ValidationError: If schema is invalid, fields are missing, or values are non-finite.
    """
    if not isinstance(record, dict):
        raise ValidationError(f"Expected dictionary record, got {type(record).__name__}")
        
    missing = [col for col in REQUIRED_COLUMNS if col not in record]
    if missing:
        raise ValidationError(f"Missing required fields: {missing}")
        
    # Validate sensor_id
    sensor_id = str(record["sensor_id"]).strip()
    if not sensor_id:
        raise ValidationError("sensor_id must be a non-empty string")
        
    # Validate timestamp
    raw_ts = record["timestamp"]
    if isinstance(raw_ts, datetime):
        ts = raw_ts.isoformat()
    elif isinstance(raw_ts, str):
        try:
            # Verify parsing
            datetime.fromisoformat(raw_ts)
            ts = raw_ts
        except Exception as e:
            raise ValidationError(f"Invalid timestamp format '{raw_ts}': {e}") from e
    else:
        raise ValidationError(f"Invalid timestamp type: {type(raw_ts).__name__}")
        
    # Validate numeric fields
    validated_numerics = {}
    for col in NUMERIC_COLUMNS:
        val = record[col]
        try:
            float_val = float(val)
        except (ValueError, TypeError) as e:
            raise ValidationError(f"Field '{col}' must be a numeric value, got '{val}'") from e
            
        if not np.isfinite(float_val):
            raise ValidationError(f"Field '{col}' contains non-finite value (NaN or Inf): {float_val}")
        validated_numerics[col] = float_val
        
    return {
        "sensor_id": sensor_id,
        "timestamp": ts,
        "x": validated_numerics["x"],
        "y": validated_numerics["y"],
        "bx": validated_numerics["bx"],
        "by": validated_numerics["by"],
        "bz": validated_numerics["bz"],
    }


def validate_sensor_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validates a pandas DataFrame of sensor readings.
    
    Args:
        df: Input DataFrame.
        
    Returns:
        Validated DataFrame.
        
    Raises:
        ValidationError: If validation fails.
    """
    if not isinstance(df, pd.DataFrame):
        raise ValidationError(f"Expected pandas DataFrame, got {type(df).__name__}")
        
    if df.empty:
        raise ValidationError("Input DataFrame is empty")
        
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValidationError(f"DataFrame missing required columns: {missing}")
        
    # Check nulls
    null_counts = df[REQUIRED_COLUMNS].isnull().sum()
    if null_counts.any():
        bad_cols = null_counts[null_counts > 0].to_dict()
        raise ValidationError(f"DataFrame contains null/missing values in columns: {bad_cols}")
        
    # Check numeric types and finite values
    for col in NUMERIC_COLUMNS:
        if not np.issubdtype(df[col].dtype, np.number):
            # Attempt coercion
            try:
                df[col] = df[col].astype(float)
            except Exception as e:
                raise ValidationError(f"Column '{col}' could not be converted to float: {e}") from e
                
        if not np.all(np.isfinite(df[col].values)):
            raise ValidationError(f"Column '{col}' contains NaN or infinite values")
            
    # Validate timestamps
    try:
        pd.to_datetime(df["timestamp"])
    except Exception as e:
        raise ValidationError(f"DataFrame contains invalid timestamp strings: {e}") from e
        
    return df


def calculate_magnetic_signal(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates the total magnetic field magnitude:
    B = sqrt(bx^2 + by^2 + bz^2)
    
    Args:
        df: DataFrame containing bx, by, bz columns.
        
    Returns:
        DataFrame with added 'magnetic_signal' column.
    """
    df = df.copy()
    bx = df["bx"].values
    by = df["by"].values
    bz = df["bz"].values
    
    df["magnetic_signal"] = np.sqrt(bx**2 + by**2 + bz**2)
    return df


def estimate_baseline(
    df: pd.DataFrame,
    window_size: int = 31,
    min_periods: int = 5,
) -> pd.DataFrame:
    """
    Estimates the background magnetic baseline using a rolling median filter,
    and calculates the residual deviation from baseline.
    
    Args:
        df: DataFrame with 'magnetic_signal' column.
        window_size: Rolling window size (number of samples).
        min_periods: Minimum samples in window.
        
    Returns:
        DataFrame with 'baseline_B' and 'residual' columns added.
    """
    df = df.copy()
    if "magnetic_signal" not in df.columns:
        df = calculate_magnetic_signal(df)
        
    effective_min_periods = max(1, min(len(df), min_periods))
    effective_window_size = max(1, min(len(df), window_size))
    
    # Rolling median centered window
    baseline = (
        df["magnetic_signal"]
        .rolling(window=effective_window_size, center=True, min_periods=effective_min_periods)
        .median()
    )
    
    # Fill edge gaps using forward/backward fill and fallback to signal if single point
    baseline = baseline.bfill().ffill().fillna(df["magnetic_signal"])
    
    df["baseline_B"] = baseline
    df["residual"] = df["magnetic_signal"] - df["baseline_B"]
    return df


def unpack_sensor_payload(
    data: Any,
) -> Union[pd.DataFrame, List[Dict[str, Any]], Dict[str, Any]]:
    """
    Safely unpacks sensor data payload if wrapped in a fixture, envelope, or file path.
    Preserves raw flat sensor records without alteration.

    Supports:
    1. Direct physical sensor records (flat dict or list of flat dicts)
    2. REAL-DATA SCHEMA FIXTURE envelope format (e.g. {"fixture_type": ..., "record": {...}})
    3. Standard envelope keys ("records", "data")
    4. Existing JSON file paths (str)
    """
    if isinstance(data, str):
        if os.path.exists(data):
            with open(data, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            try:
                data = json.loads(data)
            except Exception:
                raise ValidationError(f"Input string is neither an existing file path nor valid JSON: {data[:100]}")

    if isinstance(data, dict):
        # If it's already a direct flat sensor record with all required columns, return directly
        if all(col in data for col in REQUIRED_COLUMNS):
            return data
        # Support REAL-DATA SCHEMA FIXTURE envelope
        if "record" in data and isinstance(data["record"], dict):
            return data["record"]
        if "records" in data and isinstance(data["records"], list):
            return data["records"]
        if "data" in data and isinstance(data["data"], (dict, list)):
            return data["data"]

    elif isinstance(data, list):
        unpacked = []
        for item in data:
            if isinstance(item, dict):
                # Skip pure metadata header objects if any
                if "sensor_id" not in item and ("fixture_type" in item or "_metadata" in item or "_comment" in item):
                    continue
                if "record" in item and isinstance(item["record"], dict):
                    unpacked.append(item["record"])
                else:
                    unpacked.append(item)
            else:
                unpacked.append(item)
        return unpacked

    return data


def preprocess_pipeline(
    data: Union[pd.DataFrame, List[Dict[str, Any]], Dict[str, Any], str],
    window_size: int = 31,
    min_periods: int = 5,
) -> pd.DataFrame:
    """
    Full preprocessing entrypoint:
    1. Payload unpacking (handles both direct sensor records and fixture envelopes)
    2. Validation
    3. Chronological/Index sorting
    4. Total magnetic signal calculation
    5. Rolling baseline estimation & residual calculation
    
    Args:
        data: Input dict, list of dicts, DataFrame, or JSON filepath.
        window_size: Baseline rolling median window size.
        min_periods: Minimum observations for rolling window.
        
    Returns:
        Preprocessed DataFrame ready for feature extraction.
    """
    data = unpack_sensor_payload(data)

    if isinstance(data, dict):
        validated = [validate_single_record(data)]
        df = pd.DataFrame(validated)
    elif isinstance(data, list):
        if not data:
            raise ValidationError("Input list of records is empty")
        validated = [validate_single_record(rec) for rec in data]
        df = pd.DataFrame(validated)
    elif isinstance(data, pd.DataFrame):
        df = validate_sensor_dataframe(data.copy())
    else:
        raise ValidationError(f"Unsupported data input type: {type(data).__name__}")
        
    # Sort chronologically
    df["_dt_temp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by="_dt_temp").reset_index(drop=True)
    df = df.drop(columns=["_dt_temp"])
    
    # Calculate magnetic signal
    df = calculate_magnetic_signal(df)
    
    # Baseline estimation
    df = estimate_baseline(df, window_size=window_size, min_periods=min_periods)
    
    return df
