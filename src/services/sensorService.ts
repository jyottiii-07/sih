import { SensorReading } from '../types/sensor';
import { MockSensorProvider } from './mock/mockProvider';
import { ApiSensorProvider } from './api/apiProvider';

export type ReadingSubscriber = (reading: SensorReading) => void;
export type BatchReadingsSubscriber = (readings: SensorReading[]) => void;

/**
 * Unified Sensor Data Provider Interface
 * All UI components interact solely through this abstraction.
 */
export interface ISensorDataProvider {
  /** Retrieves all historical survey readings available */
  fetchAllReadings(): Promise<SensorReading[]>;
  /** Retrieves the latest telemetry reading */
  fetchLatestReading(): Promise<SensorReading | null>;
  /** Subscribes to real-time incoming sensor readings */
  subscribeToReadings(callback: ReadingSubscriber): () => void;
  /** Subscribes to batch reading updates */
  subscribeToBatch?(callback: BatchReadingsSubscriber): () => void;
  /** Returns whether provider is operating in mock mode */
  isMockMode(): boolean;
}

let providerInstance: ISensorDataProvider | null = null;

/**
 * Factory function to retrieve the configured data provider
 * Controlled by VITE_USE_MOCK_DATA environment variable.
 */
export function getSensorDataProvider(): ISensorDataProvider {
  if (!providerInstance) {
    const useMock = import.meta.env.VITE_USE_MOCK_DATA !== 'false';
    if (useMock) {
      providerInstance = new MockSensorProvider();
    } else {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/telemetry';
      providerInstance = new ApiSensorProvider(apiBaseUrl, wsUrl);
    }
  }
  return providerInstance;
}

/**
 * Helper to reset provider instance (useful for testing or dynamic switching)
 */
export function setSensorDataProvider(provider: ISensorDataProvider): void {
  providerInstance = provider;
}
