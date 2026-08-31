import React from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { Button } from '../common/Button';
import { Play, Pause, RotateCcw, StepForward, Activity } from 'lucide-react';

export const PlaybackControls: React.FC = () => {
  const {
    isPlaying,
    playbackIndex,
    totalAvailable,
    playbackSpeed,
    startPlayback,
    pausePlayback,
    resetPlayback,
    stepPlayback,
    setPlaybackSpeed,
    dataSource,
  } = useSensorData();

  if (dataSource !== 'mock') {
    return null;
  }

  const speeds = [1, 2, 5, 10];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
      <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-mono pr-2 border-r border-slate-200">
        <Activity className="w-3.5 h-3.5 text-blue-600" />
        <span>Sim:</span>
        <span className="text-slate-900 font-semibold">
          {playbackIndex}/{totalAvailable}
        </span>
      </div>

      {isPlaying ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={pausePlayback}
          icon={<Pause className="w-3.5 h-3.5 text-amber-600" />}
          title="Pause simulation"
        >
          <span className="hidden sm:inline">Pause</span>
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={startPlayback}
          icon={<Play className="w-3.5 h-3.5 fill-current" />}
          title="Play simulation"
        >
          <span className="hidden sm:inline">Play</span>
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={stepPlayback}
        icon={<StepForward className="w-3.5 h-3.5 text-slate-600" />}
        title="Step one packet forward"
        disabled={isPlaying || playbackIndex >= totalAvailable}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={resetPlayback}
        icon={<RotateCcw className="w-3.5 h-3.5 text-slate-600" />}
        title="Reset to full dataset"
      />

      {/* Speed Multipliers */}
      <div className="flex items-center bg-slate-200/80 rounded p-0.5 ml-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => setPlaybackSpeed(s)}
            className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded transition-colors ${
              playbackSpeed === s
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};
