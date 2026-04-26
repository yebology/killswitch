"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SimulationEvent } from "@/types";

/** Base interval in milliseconds between events at 1x speed. */
const BASE_INTERVAL_MS = 1500;

/** Valid speed multipliers. */
export type SimulationSpeed = 1 | 2 | 4;

/** Return type for the useSimulation hook. */
export interface UseSimulationReturn {
  /** Index of the current event being displayed. */
  currentIndex: number;
  /** Whether the simulation is currently playing. */
  isPlaying: boolean;
  /** Current playback speed multiplier. */
  speed: SimulationSpeed;
  /** Elapsed time in milliseconds since playback started. */
  elapsedTime: number;
  /** Start or resume playback. */
  play: () => void;
  /** Pause playback. */
  pause: () => void;
  /** Reset simulation to the beginning. */
  reset: () => void;
  /** Change playback speed. */
  setSpeed: (speed: SimulationSpeed) => void;
}

/**
 * Custom hook for simulation playback.
 * Advances events via setInterval at a rate determined by playback speed.
 * Stops at the last event and retains final state.
 *
 * @param events - Array of simulation events to play through
 */
export function useSimulation(events: SimulationEvent[]): UseSimulationReturn {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState<SimulationSpeed>(1);
  const [elapsedTime, setElapsedTime] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  /** Clear the active interval. */
  const clearActiveInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Start or resume playback. */
  const play = useCallback(() => {
    if (events.length === 0) return;

    // If at the end, don't restart — user must reset first
    setCurrentIndex((prev) => {
      if (prev >= events.length - 1) return prev;
      // If not started yet, advance to first event
      if (prev < 0) return 0;
      return prev;
    });

    setIsPlaying(true);
    startTimeRef.current = Date.now() - elapsedTime;
  }, [events.length, elapsedTime]);

  /** Pause playback. */
  const pause = useCallback(() => {
    setIsPlaying(false);
    clearActiveInterval();
  }, [clearActiveInterval]);

  /** Reset simulation to the beginning. */
  const reset = useCallback(() => {
    setIsPlaying(false);
    clearActiveInterval();
    setCurrentIndex(-1);
    setElapsedTime(0);
    startTimeRef.current = 0;
  }, [clearActiveInterval]);

  /** Change playback speed. */
  const setSpeed = useCallback((newSpeed: SimulationSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  // Manage the interval for advancing events
  useEffect(() => {
    clearActiveInterval();

    if (!isPlaying || events.length === 0) return;

    const intervalMs = BASE_INTERVAL_MS / speed;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= events.length) {
          // Reached the end — stop playback
          setIsPlaying(false);
          clearActiveInterval();
          return events.length - 1;
        }
        return next;
      });

      setElapsedTime(Date.now() - startTimeRef.current);
    }, intervalMs);

    return () => clearActiveInterval();
  }, [isPlaying, speed, events.length, clearActiveInterval]);

  // When play is called and currentIndex is -1, advance to 0 immediately
  useEffect(() => {
    if (isPlaying && currentIndex < 0 && events.length > 0) {
      setCurrentIndex(0);
      startTimeRef.current = Date.now();
    }
  }, [isPlaying, currentIndex, events.length]);

  return {
    currentIndex,
    isPlaying,
    speed,
    elapsedTime,
    play,
    pause,
    reset,
    setSpeed,
  };
}
