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
    <div className="p-4 bg-[#0e1626] border border-[#1f324d] rounded-xl space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Classification Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            Class:
          </span>

          <button
            onClick={() => setClassification('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              filters.classification === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-[#152238] text-slate-400 hover:text-slate-200 border border-[#1f324d]'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setClassification('normal')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              filters.classification === 'normal'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-[#152238] text-slate-400 hover:text-emerald-300 border border-[#1f324d]'
            }`}
          >
            Normal
          </button>

          <button
            onClick={() => setClassification('weak_anomaly')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              filters.classification === 'weak_anomaly'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-[#152238] text-slate-400 hover:text-amber-300 border border-[#1f324d]'
            }`}
          >
            Weak Anomaly
          </button>

          <button
            onClick={() => setClassification('strong_anomaly')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              filters.classification === 'strong_anomaly'
                ? 'bg-red-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : 'bg-[#152238] text-slate-400 hover:text-red-300 border border-[#1f324d]'
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
              className="w-full bg-[#070b12] border border-[#1f324d] focus:border-cyan-400 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
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

      {/* Coordinate Bounding Box Filter (Expandable) */}
      {showCoordFilters && (
        <div className="p-3 bg-[#070b12] border border-[#1f324d] rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in">
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Min X:</label>
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
              className="w-full bg-[#0e1626] border border-[#1f324d] rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Max X:</label>
            <input
              type="number"
              placeholder="60"
              value={filters.maxX ?? ''}
              onChange={(e) =>
                onFilterChange((prev) => ({
                  ...prev,
                  maxX: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full bg-[#0e1626] border border-[#1f324d] rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Min Y:</label>
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
              className="w-full bg-[#0e1626] border border-[#1f324d] rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Max Y:</label>
            <input
              type="number"
              placeholder="60"
              value={filters.maxY ?? ''}
              onChange={(e) =>
                onFilterChange((prev) => ({
                  ...prev,
                  maxY: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full bg-[#0e1626] border border-[#1f324d] rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      )}

      {/* Record Counter */}
      <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-[#1f324d]/60 font-mono">
        <span>
          SHOWING: <strong className="text-cyan-300">{filteredCount}</strong> OF{' '}
          <strong className="text-slate-200">{totalRecords}</strong> SURVEY RECORDS
        </span>
        {filteredCount < totalRecords && (
          <span className="text-amber-400">Filters Active</span>
        )}
      </div>
    </div>
  );
};
