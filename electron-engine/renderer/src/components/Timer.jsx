import React, { useState, useEffect } from 'react';

export default function Timer({ initialDurationMs, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(initialDurationMs);
  const [isStalled, setIsStalled] = useState(false);

  useEffect(() => {
    let stallTimeout;
    
    const removeListener = window.ravenAPI.onTimerUpdate((secondsLeft) => {
      const msLeft = secondsLeft * 1000;
      setTimeLeft(msLeft);
      setIsStalled(false);
      
      clearTimeout(stallTimeout);
      stallTimeout = setTimeout(() => {
        setIsStalled(true);
      }, 3000);

      if (msLeft <= 0 && onExpire) {
        onExpire();
      }
    });

    // Initial stall timer
    stallTimeout = setTimeout(() => setIsStalled(true), 3000);

    return () => {
      if (removeListener) removeListener();
      clearTimeout(stallTimeout);
    };
  }, [onExpire]);

  // Format ms to HH:MM:SS
  const formatTime = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const isLowTime = timeLeft > 0 && timeLeft <= 5 * 60 * 1000; // <= 5 minutes

  return (
    <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 transition-colors ${
      isLowTime 
        ? 'border-error/50 bg-error/10' 
        : 'border-border bg-bg-card'
    }`}>
      <span className={`material-symbols-outlined text-[18px] ${
        isLowTime || isStalled ? 'text-error animate-pulse' : 'text-warning'
      }`}>
        {isStalled ? 'warning' : 'schedule'}
      </span>
      <span className={`font-mono text-sm font-semibold ${
        isLowTime || isStalled ? 'text-error' : 'text-warning'
      }`}>
        {isStalled ? 'SYNC ERROR' : formatTime(timeLeft)}
      </span>
    </div>
  );
}
