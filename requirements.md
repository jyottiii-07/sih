# Requirements Specification — Seafloor Magnetic Anomaly Detection ML Module

**Project ID:** 26064  
**Module:** Machine Learning & Data Processing Pipeline (Strict ML Scope)

---

## 1. Runtime Environment

* **Python Version:** `>= 3.10` (Recommended: `3.10` or `3.11`)
* **Operating System:** Platform-agnostic (Windows, Linux, macOS)

---

## 2. Core Dependencies

| Package | Minimum Version | Purpose / Rationale |
| :--- | :--- | :--- |
| **`numpy`** | `>= 1.24.0` | Vectorized numerical operations, vector magnitude $\sqrt{bx^2 + by^2 + bz^2}$, matrix manipulations, synthetic signal synthesis. |
| **`pandas`** | `>= 2.0.0` | Tabular data structures, rolling window statistics (`rolling().mean()`, `rolling().std()`), time-series sorting, and data serialization. |
| **`scikit-learn`** | `>= 1.3.0` | `IsolationForest` implementation, preprocessing scalers (`MinMaxScaler`, `RobustScaler`), and evaluation metrics (`precision_recall_curve`, `confusion_matrix`). |
| **`pyyaml`** | `>= 6.0.0` | Parsing and loading configuration files (`default_config.yaml`) for clean configuration management without hard-coded constants. |
| **`joblib`** | `>= 1.3.0` | Efficient model and scaler persistence/serialization (`.joblib` format). |

---

## 3. Development & Testing Dependencies

| Package | Minimum Version | Purpose / Rationale |
| :--- | :--- | :--- |
| **`pytest`** | `>= 7.4.0` | Automated test suite execution for unit tests (validation, math, features) and integration tests. |
| **`pytest-cov`** | `>= 4.1.0` | Test coverage reporting across the ML module. |
| **`matplotlib`** | `>= 3.7.0` | Generating diagnostic and exploratory plots for ML verification (score distributions, synthetic spatial heatmaps for ML analysis only). |

---

## 4. Strict Dependency Exclusion Policy

The following categories of libraries are **explicitly prohibited** to maintain the strict ML-only scope:
* ❌ **Web Frameworks:** `fastapi`, `flask`, `django`, `uvicorn`, `requests`, `aiohttp`
* ❌ **Database Drivers:** `sqlalchemy`, `psycopg2`, `pymongo`, `sqlite3`
* ❌ **Deep Learning Frameworks:** `torch`, `tensorflow`, `keras`, `jax` (not justified at this stage)
* ❌ **UI / Frontend:** `streamlit`, `gradio`, `dash`, `react`
* ❌ **Hardware / IoT:** `pyserial`, `paho-mqtt`, `bleak`
