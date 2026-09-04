import { ISensorDataProvider, ReadingSubscriber, BatchReadingsSubscriber } from '../sensorService';
import { SensorReading } from '../../types/sensor';
import rawMockData from '../../data/mockSensorData.json';
import { validateSensorReadingsBatch } from '../../utils/validation';

export class MockSensorProvider implements ISensorDataProvider {
  private readings: SensorReading[] = [];
  private subscribers: Set<ReadingSubscriber> = new Set();
  private batchSubscribers: Set<BatchReadingsSubscriber> = new Set();
  private currentIndex: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isStreaming: boolean = false;
  private playbackSpeed: number = 1;

  constructor() {
    // Strictly validate all records at initialization
    const { valid, invalidCount, errors } = validateSensorReadingsBatch(rawMockData);
    if (invalidCount > 0) {
      console.warn(`[MockSensorProvider] Warning: ${invalidCount} invalid mock records discarded:`, errors);
    }
    this.readings = valid;
    this.currentIndex = this.readings.length; // Default to full dataset loaded
  }

  public isMockMode(): boolean {
    return true;
  }

  public async fetchAllReadings(): Promise<SensorReading[]> {
    // Return a copy to avoid external mutation
    return Promise.resolve([...this.readings]);
  }

  public async fetchLatestReading(): Promise<SensorReading | null> {
    if (this.readings.length === 0) return Promise.resolve(null);
    const index = Math.min(this.currentIndex, this.readings.length) - 1;
    return Promise.resolve(index >= 0 ? this.readings[index] : null);
  }

  public async clearAllReadings(): Promise<void> {
    this.readings = [];
    this.currentIndex = 0;
    this.notifyBatch([]);
    return Promise.resolve();
  }

  public subscribeToReadings(callback: ReadingSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public subscribeToBatch(callback: BatchReadingsSubscriber): () => void {
    this.batchSubscribers.add(callback);
    return () => {
      this.batchSubscribers.delete(callback);
    };
  }

  public notifySubscribers(reading: SensorReading): void {
    this.subscribers.forEach((callback) => callback(reading));
  }

  public notifyBatch(readings: SensorReading[]): void {
    this.batchSubscribers.forEach((callback) => callback(readings));
  }

  // Simulation Controls
  public getSimulationState() {
    return {
      currentIndex: this.currentIndex,
      totalCount: this.readings.length,
      isStreaming: this.isStreaming,
      playbackSpeed: this.playbackSpeed,
      currentReadings: this.readings.slice(0, this.currentIndex),
    };
  }

  public startSimulation(speedMultiplier: number = 1, onUpdate?: (currentReadings: SensorReading[]) => void): void {
    this.playbackSpeed = speedMultiplier;
    this.isStreaming = true;

    if (this.currentIndex >= this.readings.length) {
      this.currentIndex = 1; // Restart from first point if at end
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    const intervalMs = Math.max(100, Math.floor(1000 / this.playbackSpeed));

    this.intervalId = setInterval(() => {
      if (this.currentIndex < this.readings.length) {
        this.currentIndex++;
        const currentSlice = this.readings.slice(0, this.currentIndex);
        const newReading = this.readings[this.currentIndex - 1];
        
        this.notifySubscribers(newReading);
        this.notifyBatch(currentSlice);
        if (onUpdate) onUpdate(currentSlice);
      } else {
        this.pauseSimulation();
      }
    }, intervalMs);
  }

  public pauseSimulation(): void {
    this.isStreaming = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public resetSimulation(onUpdate?: (currentReadings: SensorReading[]) => void): void {
    this.pauseSimulation();
    this.currentIndex = this.readings.length; // Reset to full survey view
    const currentSlice = this.readings.slice(0, this.currentIndex);
    this.notifyBatch(currentSlice);
    if (onUpdate) onUpdate(currentSlice);
  }

  public restartFromBeginning(onUpdate?: (currentReadings: SensorReading[]) => void): void {
    this.pauseSimulation();
    this.currentIndex = 1;
    const currentSlice = this.readings.slice(0, this.currentIndex);
    this.notifyBatch(currentSlice);
    if (onUpdate) onUpdate(currentSlice);
  }

  public stepForward(onUpdate?: (currentReadings: SensorReading[]) => void): void {
    if (this.currentIndex < this.readings.length) {
      this.currentIndex++;
      const currentSlice = this.readings.slice(0, this.currentIndex);
      const newReading = this.readings[this.currentIndex - 1];
      this.notifySubscribers(newReading);
      this.notifyBatch(currentSlice);
      if (onUpdate) onUpdate(currentSlice);
    }
  }
}
