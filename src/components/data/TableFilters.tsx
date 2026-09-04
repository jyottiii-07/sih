import React, { useState } from 'react';
import { FilterOptions, Classification } from '../../types/sensor';
import { Search, Filter, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';

interface TableFiltersProps {
  filters: FilterOptions;
  onFilterChange: React.Dispatch<React.SetStateAction<FilterOptions>>;
  totalRecords: number;
  filteredCount: number;
}

export const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  onFilterChange,
  totalRecords,
  filteredCount,
}) => {
  const [showCoordFilters, setShowCoordFilters] = useState(false);

  const setClassification = (classification: 'all' | Classification) => {
    onFilterChange((prev) => ({ ...prev, classification }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchQuery = e.target.value;
    onFilterChange((prev) => ({ ...prev, searchQuery }));
  };

  const resetFilters = () => {
    onFilterChange({
      classification: 'all',
      searchQuery: '',
      minX: undefined,
      maxX: undefined,
      minY: undefined,
      maxY: undefined,
    });
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Classification Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Class:
          </span>

          <button
            onClick={() => setClassification('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filters.classification === 'all'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setClassification('normal')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filters.classification === 'normal'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Normal
          </button>

          <button
            onClick={() => setClassification('weak_anomaly')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filters.classification === 'weak_anomaly'
                ? 'bg-amber-500 text-white font-semibold shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Weak Anomaly
          </button>

          <button
            onClick={() => setClassification('strong_anomaly')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filters.classification === 'strong_anomaly'
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            Strong Anomaly
          </button>
        </div>

        {/* Search Input & Advanced Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, timestamp..."
              value={filters.searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCoordFilters(!showCoordFilters)}
            icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            title="Toggle coordinate filters"
          >
            <span className="hidden sm:inline">Coords</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Reset all filters"
          />
        </div>
      </div>

      {/* Coordinate Bounding Box Filter */}
      {showCoordFilters && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in">
          <div>
            <label className="text-[11px] uppercase font-mono text-slate-500 block mb-1">Min X:</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minX ?? ''}
              onChange={(e) =>
                onFilterChange((prev) => ({
                  ...prev,
                  minX: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase font-mono text-slate-500 block mb-1">Max X:</label>
            <input
              type="number"
              placeholder="50"
              value={filters.maxX ?? ''}
              onChange={(e) =>
                onFilterChange((prev) => ({
                  ...prev,
                  maxX: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase font-mono text-slate-500 block mb-1">Min Y:</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minY ?? ''}
              onChange={(e) =>
                onFilterChange((prev) => ({
                  ...prev,
                  minY: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase font-mono text-slate-500 block mb-1">Max Y:</label>
            <input
              type="number"
              placeholder="50"
              value={filters.maxY ?? ''}
              onChange={(e) =>
                onFilterChange((prev) => ({
                  ...prev,
                  maxY: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Record Counter */}
      <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100 font-mono">
        <span>
          Showing <strong className="text-slate-900">{filteredCount}</strong> of{' '}
          <strong className="text-slate-900">{totalRecords}</strong> survey records
        </span>
        {filteredCount < totalRecords && (
          <span className="text-amber-700 font-sans font-medium text-xs">Filters Active</span>
        )}
      </div>
    </div>
  );
};
