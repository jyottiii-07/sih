/**
 * Provisional API Sensor Provider
 *
 * PROVISIONAL SPECIFICATION:
 * The endpoints, WebSocket events, and payload formats defined herein represent
 * the proposed backend interface for NCPOR / MoES Seafloor Metal Detection Sensor.
 * Subject to final calibration and confirmation by the backend/hardware team.
 */

import { ISensorDataProvider, ReadingSubscriber, BatchReadingsSubscriber } from '../sensorService';
import { SensorReading } from '../../types/sensor';
import { validateSensorReading, validateSensorReadingsBatch } from '../../utils/validation';

export class ApiSensorProvider implements ISensorDataProvider {
  private apiBaseUrl: string;
  private wsUrl: string;
  private subscribers: Set<ReadingSubscriber> = new Set();
  private batchSubscribers: Set<BatchReadingsSubscriber> = new Set();
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(apiBaseUrl: string, wsUrl: string) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
    this.wsUrl = wsUrl;
  }

  public isMockMode(): boolean {
    return false;
  }

  /**
   * PROVISIONAL: GET /api/v1/readings
   */
  public async fetchAllReadings(): Promise<SensorReading[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/readings?limit=1000`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      const rawData = Array.isArray(json) ? json : json.data || [];
      const { valid, errors } = validateSensorReadingsBatch(rawData);

      if (errors.length > 0) {
        console.warn(`[ApiSensorProvider] Discarded ${errors.length} malformed records from API response.`);
      }

      return valid;
    } catch (error) {
      console.error('[ApiSensorProvider] Failed to fetch readings:', error);
      throw error;
    }
  }

  /**
   * PROVISIONAL: GET /api/v1/readings/latest
   */
  public async fetchLatestReading(): Promise<SensorReading | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/readings/latest`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      const rawItem = json.data || json;
      const result = validateSensorReading(rawItem);

      if (!result.success || !result.data) {
        console.warn('[ApiSensorProvider] Invalid latest reading payload:', result.errors);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('[ApiSensorProvider] Failed to fetch latest reading:', error);
      return null;
    }
  }

  /**
   * Connects to the provisional WebSocket stream
   */
  public subscribeToReadings(callback: ReadingSubscriber): () => void {
    this.subscribers.add(callback);
    this.ensureWebSocketConnection();

    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0 && this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  public subscribeToBatch(callback: BatchReadingsSubscriber): () => void {
    this.batchSubscribers.add(callback);
    return () => {
      this.batchSubscribers.delete(callback);
    };
  }

  private ensureWebSocketConnection(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[ApiSensorProvider] WebSocket connection established to', this.wsUrl);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // If message is an event envelope, ignore non-telemetry events
          if (message.event && message.event !== 'sensor_reading' && message.event !== 'new_reading') {
            return;
          }
          const rawReading = message.payload || message;
          const result = validateSensorReading(rawReading);

          if (result.success && result.data) {
            this.subscribers.forEach((cb) => cb(result.data!));
          } else {
            console.warn('[ApiSensorProvider] Malformed reading in WebSocket stream:', result.errors);
          }
        } catch (e) {
          console.error('[ApiSensorProvider] Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.warn('[ApiSensorProvider] WebSocket connection closed.');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[ApiSensorProvider] WebSocket error:', error);
      };
    } catch (e) {
      console.error('[ApiSensorProvider] Error creating WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ApiSensorProvider] Max reconnect attempts reached.');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const backoff = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;
    console.log(`[ApiSensorProvider] Scheduling WebSocket reconnect in ${backoff}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.ensureWebSocketConnection();
    }, backoff);
  }
}
