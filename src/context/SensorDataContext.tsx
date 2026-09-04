import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SensorReading, FilterOptions, DataSourceType, ProviderStatus } from '../types/sensor';
import { getSensorDataProvider, ISensorDataProvider } from '../services/sensorService';
import { MockSensorProvider } from '../services/mock/mockProvider';

export interface SensorDataContextType {
  readings: SensorReading[];
  allReadings: SensorReading[];
  selectedReading: SensorReading | null;
  status: ProviderStatus;
  dataSource: DataSourceType;
  errorMessage: string | null;
  filters: FilterOptions;
  filteredReadings: SensorReading[];
  
  // Playback & Simulation State
  isPlaying: boolean;
  playbackIndex: number;
  totalAvailable: number;
  playbackSpeed: number;
  
  // Actions
  setSelectedReading: (reading: SensorReading | null) => void;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  startPlayback: () => void;
  pausePlayback: () => void;
  resetPlayback: () => void;
  restartPlayback: () => void;
  stepPlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  refreshData: () => Promise<void>;
  clearData: () => Promise<void>;
}

export const SensorDataContext = createContext<SensorDataContextType | null>(null);

const DEFAULT_FILTERS: FilterOptions = {
  classification: 'all',
  searchQuery: '',
};

export const SensorDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [provider] = useState<ISensorDataProvider>(() => getSensorDataProvider());
  const [allReadings, setAllReadings] = useState<SensorReading[]>([]);
  const [activeReadings, setActiveReadings] = useState<SensorReading[]>([]);
  const [selectedReading, setSelectedReading] = useState<SensorReading | null>(null);
  const [status, setStatus] = useState<ProviderStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1);

  const dataSource: DataSourceType = provider.isMockMode() ? 'mock' : 'api';

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setStatus('loading');
      setErrorMessage(null);
      const data = await provider.fetchAllReadings();
      setAllReadings(data);
      setActiveReadings(data);
      setPlaybackIndex(data.length);
      setStatus('idle');

      // Initial selection is null until user clicks or inspects
      setSelectedReading(null);
    } catch (err) {
      console.error('[SensorDataContext] Failed to load sensor data:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown data loading error');
    }
  }, [provider]);

  useEffect(() => {
    loadInitialData();

    // Subscribe to live / simulation updates
    const unsubscribe = provider.subscribeToReadings((newReading) => {
      setActiveReadings((prev) => {
        const next = [...prev, newReading];
        return next;
      });
      setPlaybackIndex((prev) => prev + 1);
    });

    if (provider.subscribeToBatch) {
      const unsubBatch = provider.subscribeToBatch((batch) => {
        setActiveReadings(batch);
        setPlaybackIndex(batch.length);
      });
      return () => {
        unsubscribe();
        unsubBatch();
      };
    }

    return () => {
      unsubscribe();
    };
  }, [provider, loadInitialData]);

  // Simulation Controls (for Mock Provider)
  const startPlayback = useCallback(() => {
    if (provider instanceof MockSensorProvider) {
      setIsPlaying(true);
      provider.startSimulation(playbackSpeed, (currentSlice) => {
        setActiveReadings(currentSlice);
        setPlaybackIndex(currentSlice.length);
      });
    }
  }, [provider, playbackSpeed]);

  const pausePlayback = useCallback(() => {
    if (provider instanceof MockSensorProvider) {
      setIsPlaying(false);
      provider.pauseSimulation();
    }
  }, [provider]);

  const resetPlayback = useCallback(() => {
    if (provider instanceof MockSensorProvider) {
      setIsPlaying(false);
      provider.resetSimulation((fullSlice) => {
        setActiveReadings(fullSlice);
        setPlaybackIndex(fullSlice.length);
      });
    }
  }, [provider]);

  const restartPlayback = useCallback(() => {
    if (provider instanceof MockSensorProvider) {
      setIsPlaying(true);
      provider.restartFromBeginning((initialSlice) => {
        setActiveReadings(initialSlice);
        setPlaybackIndex(initialSlice.length);
      });
      provider.startSimulation(playbackSpeed, (currentSlice) => {
        setActiveReadings(currentSlice);
        setPlaybackIndex(currentSlice.length);
      });
    }
  }, [provider, playbackSpeed]);

  const stepPlayback = useCallback(() => {
    if (provider instanceof MockSensorProvider) {
      provider.stepForward((currentSlice) => {
        setActiveReadings(currentSlice);
        setPlaybackIndex(currentSlice.length);
      });
    }
  }, [provider]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    if (provider instanceof MockSensorProvider && isPlaying) {
      provider.startSimulation(speed, (currentSlice) => {
        setActiveReadings(currentSlice);
        setPlaybackIndex(currentSlice.length);
      });
    }
  }, [provider, isPlaying]);

  const clearData = useCallback(async () => {
    try {
      setStatus('loading');
      if (provider.clearAllReadings) {
        await provider.clearAllReadings();
      }
      setAllReadings([]);
      setActiveReadings([]);
      setPlaybackIndex(0);
      setSelectedReading(null);
      setStatus('idle');
    } catch (err) {
      console.error('[SensorDataContext] Failed to clear data:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to clear survey data');
    }
  }, [provider]);

  // Filtered readings computation
  const filteredReadings = useMemo(() => {
    return activeReadings.filter((reading) => {
      // Classification filter
      if (filters.classification !== 'all' && reading.classification !== filters.classification) {
        return false;
      }

      // Search query (sensor_id or timestamp substring)
      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        const matchesId = reading.sensor_id.toLowerCase().includes(query);
        const matchesTime = reading.timestamp.toLowerCase().includes(query);
        const matchesClass = reading.classification.toLowerCase().includes(query);
        if (!matchesId && !matchesTime && !matchesClass) return false;
      }

      // Coordinate bounds
      if (filters.minX !== undefined && reading.x < filters.minX) return false;
      if (filters.maxX !== undefined && reading.x > filters.maxX) return false;
      if (filters.minY !== undefined && reading.y < filters.minY) return false;
      if (filters.maxY !== undefined && reading.y > filters.maxY) return false;

      return true;
    });
  }, [activeReadings, filters]);

  const value = useMemo(
    () => ({
      readings: activeReadings,
      allReadings,
      selectedReading,
      status,
      dataSource,
      errorMessage,
      filters,
      filteredReadings,
      isPlaying,
      playbackIndex,
      totalAvailable: allReadings.length,
      playbackSpeed,
      setSelectedReading,
      setFilters,
      startPlayback,
      pausePlayback,
      resetPlayback,
      restartPlayback,
      stepPlayback,
      setPlaybackSpeed,
      refreshData: loadInitialData,
      clearData,
    }),
    [
      activeReadings,
      allReadings,
      selectedReading,
      status,
      dataSource,
      errorMessage,
      filters,
      filteredReadings,
      isPlaying,
      playbackIndex,
      playbackSpeed,
      startPlayback,
      pausePlayback,
      resetPlayback,
      restartPlayback,
      stepPlayback,
      setPlaybackSpeed,
      loadInitialData,
      clearData,
    ]
  );

  return <SensorDataContext.Provider value={value}>{children}</SensorDataContext.Provider>;
};
