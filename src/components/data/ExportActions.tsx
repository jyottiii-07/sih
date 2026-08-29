import React from 'react';
import { SensorReading } from '../../types/sensor';
import { exportToCSV, exportToJSON } from '../../utils/export';
import { Button } from '../common/Button';
import { FileSpreadsheet, FileCode } from 'lucide-react';

interface ExportActionsProps {
  readings: SensorReading[];
}

export const ExportActions: React.FC<ExportActionsProps> = ({ readings }) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => exportToCSV(readings)}
        icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
        title="Export dataset as CSV"
      >
        Export CSV
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => exportToJSON(readings)}
        icon={<FileCode className="w-3.5 h-3.5 text-cyan-400" />}
        title="Export dataset as JSON"
      >
        Export JSON
      </Button>
    </div>
  );
};
