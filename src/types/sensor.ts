/**
 * Seafloor Metal Detection Sensor - Locked Data Contract & Type Definitions
 * Problem Statement ID: 26064 (NCPOR / MoES)
 *
 * STRICT RULE: No additional sensor/physical fields (depth, temperature, pressure,
 * salinity, battery, GPS, lat, long, etc.) may be added to SensorReading.
 */

export type Classification = 'normal' | 'weak_anomaly' | 'strong_anomaly';

/**
 * Locked 10-Field Telemetry Data Contract
 */
export interface SensorReading {
  /** Unique hardware identifier for the seafloor sensor node */
  sensor_id: string;
  /** ISO-8601 UTC timestamp of measurement acquisition */
  timestamp: string;
  /** Local survey Cartesian X-coordinate (Grid Units) */
  x: number;
  /** Local survey Cartesian Y-coordinate (Grid Units) */
  y: number;
  /** Magnetic vector X-component (Provisional Survey Units) */
  bx: number;
  /** Magnetic vector Y-component (Provisional Survey Units) */
  by: number;
  /** Magnetic vector Z-component (Provisional Survey Units) */
  bz: number;
  /** Composite scalar magnitude of the magnetic field (Provisional Survey Units) */
  magnetic_signal: number;
  /** ML model anomaly likelihood score (0.0 - 1.0) */
  anomaly_score: number;
  /** Upstream ML model anomaly classification */
  classification: Classification;
  /** Sensing technology mode (e.g. 'hall_effect' or 'magnetometer_3axis') */
  sensor_type?: string;
}

/**
 * Derived Telemetry Summary Metrics
 */
export interface TelemetryStats {
  totalReadings: number;
  normalCount: number;
  weakAnomalyCount: number;
  strongAnomalyCount: number;
  peakMagneticSignal: number;
  latestAnomalyScore: number;
  averageAnomalyScore: number;
  latestReading: SensorReading | null;
  activeSensorId: string;
  surveyGridBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Filter options for data logs and visualization
 */
export interface FilterOptions {
  classification: 'all' | Classification;
  searchQuery: string;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

/**
 * Data Provider Operational Status
 */
export type ProviderStatus = 'idle' | 'loading' | 'streaming' | 'error';
export type DataSourceType = 'mock' | 'api';

export interface DataProviderState {
  status: ProviderStatus;
  dataSource: DataSourceType;
  errorMessage: string | null;
  readings: SensorReading[];
  selectedReading: SensorReading | null;
  playbackIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // e.g., 1x, 2x, 5x, 10x
}

/**
 * Active Navigation Views
 */
export type ActiveTab = 'dashboard' | 'survey' | 'analytics' | 'logs';
