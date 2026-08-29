import React, { useState, useMemo } from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { FilterOptions, SensorReading } from '../../types/sensor';
import { TableFilters } from '../../components/data/TableFilters';
import { LogsTable } from '../../components/data/LogsTable';
import { TablePagination } from '../../components/data/TablePagination';
import { ExportActions } from '../../components/data/ExportActions';
import { LoadingView, EmptyView, ErrorView } from '../../components/common/StateViews';
import { Table, Info } from 'lucide-react';

interface LogsPageProps {
  onSelectReading?: (reading: SensorReading) => void;
}

export const LogsPage: React.FC<LogsPageProps> = ({ onSelectReading }) => {
  const { readings, selectedReading, setSelectedReading, status, errorMessage, refreshData } =
    useSensorData();

  const [filters, setFilters] = useState<FilterOptions>({
    classification: 'all',
    searchQuery: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Apply filters
  const filteredReadings = useMemo(() => {
    return readings.filter((r) => {
      // Classification filter
      if (filters.classification !== 'all' && r.classification !== filters.classification) {
        return false;
      }

      // Search query (sensor_id or timestamp or coords)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchId = r.sensor_id.toLowerCase().includes(query);
        const matchTime = r.timestamp.toLowerCase().includes(query);
        const matchCoords = `${r.x},${r.y}`.includes(query);
        if (!matchId && !matchTime && !matchCoords) return false;
      }

      // Coordinate filters
      if (filters.minX !== undefined && r.x < filters.minX) return false;
      if (filters.maxX !== undefined && r.x > filters.maxX) return false;
      if (filters.minY !== undefined && r.y < filters.minY) return false;
      if (filters.maxY !== undefined && r.y > filters.maxY) return false;

      return true;
    });
  }, [readings, filters]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredReadings.length / pageSize);
  const paginatedReadings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReadings.slice(start, start + pageSize);
  }, [filteredReadings, currentPage, pageSize]);

  const handleSelect = (reading: SensorReading) => {
    setSelectedReading(reading);
    if (onSelectReading) onSelectReading(reading);
  };

  if (status === 'loading' && readings.length === 0) {
    return <LoadingView message="Loading Telemetry Logs..." />;
  }

  if (status === 'error' && readings.length === 0) {
    return <ErrorView message={errorMessage || 'Failed to load telemetry logs.'} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-lg bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
              Sensor Telemetry Logs & Export
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              10-field locked sensor telemetry data table with sorting, filtering, and dataset export
            </p>
          </div>
        </div>

        <ExportActions readings={filteredReadings} />
      </div>

      {/* Filter Toolbar */}
      <TableFilters
        filters={filters}
        onFilterChange={setFilters}
        totalRecords={readings.length}
        filteredCount={filteredReadings.length}
      />

      {/* Table Content */}
      {filteredReadings.length === 0 ? (
        <EmptyView
          title="No Matching Telemetry Records"
          description="Try adjusting your classification, search, or coordinate boundary filters."
        />
      ) : (
        <div className="space-y-4">
          <LogsTable
            readings={paginatedReadings}
            selectedReading={selectedReading}
            onSelectReading={handleSelect}
          />

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={filteredReadings.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Locked Contract Notice */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">Strict 10-Field Telemetry Contract:</span>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            sensor_id, timestamp, x, y, bx, by, bz, magnetic_signal, anomaly_score, classification.
          </p>
        </div>
      </div>
    </div>
  );
};
