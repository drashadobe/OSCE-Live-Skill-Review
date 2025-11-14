import React, { useState, useEffect } from 'react';
import { SessionStatus } from '../types';

interface TimerProps {
  sessionStatus: SessionStatus;
  startTime: number | null;
  duration: number | null; // in seconds
  onTimeUp: () => void;
}

const Timer: React.FC<TimerProps> = ({ sessionStatus, startTime, duration, onTimeUp }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(duration ?? 0);

  useEffect(() => {
    if (sessionStatus !== SessionStatus.LIVE || !startTime || duration === null) {
      if (duration !== null) {
          setRemainingSeconds(duration);
      }
      return;
    }

    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = duration - elapsed;
      
      if (remaining <= 0) {
        setRemainingSeconds(0);
        onTimeUp();
        clearInterval(intervalId);
      } else {
        setRemainingSeconds(remaining);
      }
    }, 1000);

    // Set initial time immediately to avoid 1-second delay
    const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
    setRemainingSeconds(Math.max(0, duration - initialElapsed));

    return () => clearInterval(intervalId);
  }, [sessionStatus, startTime, duration, onTimeUp]);

  if (sessionStatus !== SessionStatus.LIVE || duration === null) {
    return null; // Don't render if not live or no duration is set
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const timeColor = remainingSeconds <= 10
      ? 'text-red-500 animate-pulse'
      : remainingSeconds <= 60
      ? 'text-amber-400'
      : 'text-slate-200';

  return (
    <div className="bg-blue-950/60 backdrop-blur-sm border border-blue-800/50 rounded-lg px-4 py-2 flex items-center space-x-2">
       <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>
      <span className={`font-mono text-lg font-bold transition-colors ${timeColor}`} aria-live="off" aria-atomic="true">
        {formatTime(remainingSeconds)}
      </span>
    </div>
  );
};

export default Timer;
