import { useMemo } from 'react';
import { useSensorData } from './useSensorData';
import { TelemetryStats } from '../types/sensor';

export function useTelemetryStats(): TelemetryStats {
  const { readings } = useSensorData();

  return useMemo(() => {
    if (readings.length === 0) {
      return {
        totalReadings: 0,
        normalCount: 0,
        weakAnomalyCount: 0,
        strongAnomalyCount: 0,
        peakMagneticSignal: 0,
        latestAnomalyScore: 0,
        averageAnomalyScore: 0,
        latestReading: null,
        activeSensorId: 'N/A',
        surveyGridBounds: { minX: 0, maxX: 60, minY: 0, maxY: 60 },
      };
    }

    let normalCount = 0;
    let weakAnomalyCount = 0;
    let strongAnomalyCount = 0;
    let peakMagneticSignal = 0;
    let totalAnomalyScore = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < readings.length; i++) {
      const r = readings[i];
      if (r.classification === 'normal') normalCount++;
      else if (r.classification === 'weak_anomaly') weakAnomalyCount++;
      else if (r.classification === 'strong_anomaly') strongAnomalyCount++;

      if (r.magnetic_signal > peakMagneticSignal) peakMagneticSignal = r.magnetic_signal;
      totalAnomalyScore += r.anomaly_score;

      if (r.x < minX) minX = r.x;
      if (r.x > maxX) maxX = r.x;
      if (r.y < minY) minY = r.y;
      if (r.y > maxY) maxY = r.y;
    }

    const latestReading = readings[readings.length - 1];

    return {
      totalReadings: readings.length,
      normalCount,
      weakAnomalyCount,
      strongAnomalyCount,
      peakMagneticSignal: Number(peakMagneticSignal.toFixed(2)),
      latestAnomalyScore: Number(latestReading.anomaly_score.toFixed(2)),
      averageAnomalyScore: Number((totalAnomalyScore / readings.length).toFixed(2)),
      latestReading,
      activeSensorId: latestReading.sensor_id,
      surveyGridBounds: {
        minX: isFinite(minX) ? Math.floor(minX) : 0,
        maxX: isFinite(maxX) ? Math.ceil(maxX) : 60,
        minY: isFinite(minY) ? Math.floor(minY) : 0,
        maxY: isFinite(maxY) ? Math.ceil(maxY) : 60,
      },
    };
  }, [readings]);
}
