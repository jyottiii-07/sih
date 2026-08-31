import { SensorReading } from '../types/sensor';

/**
 * Exports sensor readings array as a formatted CSV download
 */
export function exportToCSV(readings: SensorReading[], filenamePrefix: string = 'seafloor_survey_telemetry'): void {
  if (readings.length === 0) return;

  const headers = [
    'timestamp',
    'sensor_id',
    'x',
    'y',
    'bx',
    'by',
    'bz',
    'magnetic_signal',
    'anomaly_score',
    'classification',
  ];

  const rows = readings.map((r) => [
    `"${r.timestamp}"`,
    `"${r.sensor_id}"`,
    r.x,
    r.y,
    r.bx,
    r.by,
    r.bz,
    r.magnetic_signal,
    r.anomaly_score,
    `"${r.classification}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports sensor readings array as a formatted JSON download
 */
export function exportToJSON(readings: SensorReading[], filenamePrefix: string = 'seafloor_survey_telemetry'): void {
  if (readings.length === 0) return;

  const exportPayload = {
    metadata: {
      exported_at: new Date().toISOString(),
      record_count: readings.length,
      coordinate_system: 'Local Survey Coordinates (Grid Units)',
      disclaimer: 'Provisional Survey Units. ML classifications are upstream outputs.',
    },
    readings,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${timestamp}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
