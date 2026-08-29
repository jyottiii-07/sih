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
    <div className="flex flex-wrap items-center gap-2 p-2 bg-[#0e1626]/95 border border-[#1f324d] rounded-xl shadow-2xl backdrop-blur-md">
      {/* Zoom Controls */}
      <div className="flex items-center bg-[#070b12] border border-[#1f324d] rounded-lg p-0.5">
        <button
          onClick={onZoomOut}
          disabled={zoom <= 0.75}
          className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 rounded hover:bg-[#152238] transition-colors"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="px-2 font-mono text-xs text-cyan-300 font-semibold min-w-[44px] text-center">
          {zoom.toFixed(2)}x
        </span>
        <button
          onClick={onZoomIn}
          disabled={zoom >= 4.0}
          className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 rounded hover:bg-[#152238] transition-colors"
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
        icon={<RotateCcw className="w-3.5 h-3.5" />}
        title="Reset grid view"
      >
        <span className="hidden sm:inline">Reset</span>
      </Button>

      {onCenterPeak && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onCenterPeak}
          icon={<Navigation className="w-3.5 h-3.5 text-red-400" />}
          title="Center on peak anomaly"
        >
          <span className="hidden sm:inline">Peak Target</span>
        </Button>
      )}

      <div className="h-5 w-px bg-[#1f324d] mx-1 hidden sm:block" />

      {/* Layer Visibility Toggles */}
      <div className="flex items-center gap-1 text-xs">
        {/* Normal */}
        <button
          onClick={() => onToggleLayer('normal')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono transition-all ${
            activeLayers.normal
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-[#070b12] border-slate-700 text-slate-500 opacity-60'
          }`}
          title="Toggle normal readings"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px]">Normal</span>
        </button>

        {/* Weak */}
        <button
          onClick={() => onToggleLayer('weak')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono transition-all ${
            activeLayers.weak
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
              : 'bg-[#070b12] border-slate-700 text-slate-500 opacity-60'
          }`}
          title="Toggle weak anomaly readings"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[11px]">Weak</span>
        </button>

        {/* Strong */}
        <button
          onClick={() => onToggleLayer('strong')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono transition-all ${
            activeLayers.strong
              ? 'bg-red-950/60 border-red-500/50 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
              : 'bg-[#070b12] border-slate-700 text-slate-500 opacity-60'
          }`}
          title="Toggle strong anomaly readings"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px]">Strong</span>
        </button>
      </div>
    </div>
  );
};
