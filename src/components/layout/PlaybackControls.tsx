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
    return null; // Stream controls only apply in mock simulation mode
  }

  const speeds = [1, 2, 5, 10];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-[#070b12]/90 border border-[#1f324d] rounded-xl px-2.5 sm:px-3 py-1.5 backdrop-blur-md">
      <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono pr-2 border-r border-[#1f324d]">
        <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>Stream Sim:</span>
        <span className="text-slate-200 font-bold">
          {playbackIndex} / {totalAvailable}
        </span>
      </div>

      {isPlaying ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={pausePlayback}
          icon={<Pause className="w-3.5 h-3.5 text-amber-400" />}
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
        icon={<StepForward className="w-3.5 h-3.5 text-slate-300" />}
        title="Step one packet forward"
        disabled={isPlaying || playbackIndex >= totalAvailable}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={resetPlayback}
        icon={<RotateCcw className="w-3.5 h-3.5 text-slate-300" />}
        title="Reset to full dataset"
      />

      {/* Speed Multipliers */}
      <div className="flex items-center bg-[#0e1626] border border-[#1f324d] rounded-lg p-0.5 ml-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => setPlaybackSpeed(s)}
            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded transition-all ${
              playbackSpeed === s
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};
