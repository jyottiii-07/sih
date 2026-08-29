import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}) => {
  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-[#0e1626] border border-[#1f324d] rounded-xl text-xs font-mono text-slate-400">
      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="bg-[#070b12] border border-[#1f324d] rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-400"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="hidden sm:inline">
          Showing {startRecord}–{endRecord} of {totalRecords}
        </span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded hover:bg-[#152238] text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded hover:bg-[#152238] text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 text-slate-200 font-semibold">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded hover:bg-[#152238] text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded hover:bg-[#152238] text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
