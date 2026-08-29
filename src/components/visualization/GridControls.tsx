import React from 'react';
import { Button } from '../common/Button';
import { ZoomIn, ZoomOut, RotateCcw, Navigation } from 'lucide-react';

interface GridControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  activeLayers: {
    normal: boolean;
    weak: boolean;
    strong: boolean;
  };
  onToggleLayer: (layer: 'normal' | 'weak' | 'strong') => void;
  onCenterPeak?: () => void;
}

export const GridControls: React.FC<GridControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  activeLayers,
  onToggleLayer,
  onCenterPeak,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs">
      {/* Zoom Controls */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
        <button
          onClick={onZoomOut}
          disabled={zoom <= 0.75}
          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-white transition-colors"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="px-2 font-mono text-xs text-slate-700 font-semibold min-w-[40px] text-center">
          {zoom.toFixed(2)}x
        </span>
        <button
          onClick={onZoomIn}
          disabled={zoom >= 4.0}
          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-white transition-colors"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Reset & Center Controls */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onReset}
        icon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
        title="Reset grid view"
      >
        <span className="hidden sm:inline">Reset</span>
      </Button>

      {onCenterPeak && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onCenterPeak}
          icon={<Navigation className="w-3.5 h-3.5 text-rose-600" />}
          title="Center on peak anomaly"
        >
          <span className="hidden sm:inline">Peak Target</span>
        </Button>
      )}

      <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

      {/* Layer Visibility Toggles */}
      <div className="flex items-center gap-1 text-xs">
        {/* Normal */}
        <button
          onClick={() => onToggleLayer('normal')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
            activeLayers.normal
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
          }`}
          title="Toggle normal readings"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px]">Normal</span>
        </button>

        {/* Weak */}
        <button
          onClick={() => onToggleLayer('weak')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
            activeLayers.weak
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
          }`}
          title="Toggle weak anomaly readings"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[11px]">Weak</span>
        </button>

        {/* Strong */}
        <button
          onClick={() => onToggleLayer('strong')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
            activeLayers.strong
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
          }`}
          title="Toggle strong anomaly readings"
        >
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          <span className="text-[11px]">Strong</span>
        </button>
      </div>
    </div>
  );
};
