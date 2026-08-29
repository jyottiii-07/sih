import React, { useState, useMemo } from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { LogsTable } from '../../components/data/LogsTable';
import { TableFilters } from '../../components/data/TableFilters';
import { TablePagination } from '../../components/data/TablePagination';
import { ExportActions } from '../../components/data/ExportActions';
import { LoadingView, EmptyView, ErrorView } from '../../components/common/StateViews';
import { Table, Info } from 'lucide-react';
import { SensorReading } from '../../types/sensor';

interface LogsPageProps {
  onSelectReading?: (reading: SensorReading) => void;
}

export const LogsPage: React.FC<LogsPageProps> = ({ onSelectReading }) => {
  const {
    readings,
    filteredReadings,
    filters,
    setFilters,
    status,
    errorMessage,
    refreshData,
    selectedReading,
    setSelectedReading,
  } = useSensorData();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const totalFiltered = filteredReadings.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;

  // Paginated slice
  const paginatedReadings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReadings.slice(start, start + pageSize);
  }, [filteredReadings, currentPage, pageSize]);

  const handleSelect = (reading: SensorReading) => {
    setSelectedReading(reading);
    if (onSelectReading) onSelectReading(reading);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  if (status === 'loading' && readings.length === 0) {
    return <LoadingView message="Loading Seafloor Telemetry Log Records..." />;
  }

  if (status === 'error' && readings.length === 0) {
    return <ErrorView message={errorMessage || 'Failed to load telemetry logs.'} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0e1626] border border-[#1f324d]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 border border-cyan-500/40 rounded-xl text-cyan-400">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-100">
              Sensor Telemetry Logs & Data Exporter
            </h2>
            <p className="text-xs text-slate-400">
              Full 10-field telemetry log records with column sorting, classification filtering, and scientific export
            </p>
          </div>
        </div>

        {/* Data Export Buttons */}
        <ExportActions readings={filteredReadings} />
      </div>

      {/* Filters Toolbar */}
      <TableFilters
        filters={filters}
        onFilterChange={setFilters}
        totalRecords={readings.length}
        filteredCount={filteredReadings.length}
      />

      {/* Logs Table */}
      {filteredReadings.length === 0 ? (
        <EmptyView
          title="No Matching Survey Records"
          description="No telemetry readings match your active classification or search filters."
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
            totalRecords={totalFiltered}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* Notice */}
      <div className="p-3.5 bg-[#0e1626]/70 border border-[#1f324d] rounded-xl flex items-center gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>
          Click any table row to open the <strong>Reading Detail Drawer</strong> and view raw sensor telemetry alongside upstream ML analysis.
        </span>
      </div>
    </div>
  );
};
