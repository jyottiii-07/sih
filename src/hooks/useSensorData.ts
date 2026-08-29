import { useContext } from 'react';
import { SensorDataContext, SensorDataContextType } from '../context/SensorDataContext';

/**
 * Primary custom hook to access global sensor data, selection state, and simulation controls.
 */
export function useSensorData(): SensorDataContextType {
  const context = useContext(SensorDataContext);
  if (!context) {
    throw new Error('useSensorData must be used within a SensorDataProvider');
  }
  return context;
}
