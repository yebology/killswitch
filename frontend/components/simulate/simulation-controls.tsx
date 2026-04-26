"use client";

import { cn } from "@/lib/utils";

/** Speed multiplier options for simulation playback. */
const SPEED_OPTIONS = [1, 2, 4] as const;

interface SimulationControlsProps {
  /** Whether the simulation is currently playing. */
  isPlaying: boolean;
  /** Current playback speed multiplier. */
  speed: number;
  /** Current event index in the timeline. */
  currentIndex: number;
  /** Total number of events in the timeline. */
  totalEvents: number;
  /** Start or resume playback. */
  onPlay: () => void;
  /** Pause playback. */
  onPause: () => void;
  /** Reset simulation to the beginning. */
  onReset: () => void;
  /** Change playback speed. */
  onSpeedChange: (speed: number) => void;
}

/**
 * Playback controls for the Drift hack simulation.
 * Provides play/pause toggle, speed selector (1x/2x/4x), reset, and progress bar.
 */
export function SimulationControls({
  isPlaying,
  speed,
  currentIndex,
  totalEvents,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
}: SimulationControlsProps) {
  const progress = totalEvents > 0 ? ((currentIndex + 1) / totalEvents) * 100 : 0;
  const isComplete = currentIndex >= totalEvents - 1 && totalEvents > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        {/* Play/Pause + Reset */}
        <div className="flex items-center gap-2">
          {/* Play/Pause toggle */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={isComplete && !isPlaying}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              isPlaying
                ? "bg-status-yellow/20 text-status-yellow hover:bg-status-yellow/30"
                : "bg-status-green/20 text-status-green hover:bg-status-green/30",
              isComplete && !isPlaying && "opacity-50 cursor-not-allowed"
            )}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              /* Pause icon */
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              /* Play icon */
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground hover:bg-surface-2/80 hover:text-foreground transition-colors"
            title="Reset"
          >
            {/* RotateCcw icon */}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M1 4v6h6"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.51 15a9 9 0 102.13-9.36L1 10"
              />
            </svg>
          </button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Event counter */}
        <span className="text-xs text-muted-foreground">
          {totalEvents > 0 ? currentIndex + 1 : 0} / {totalEvents}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
