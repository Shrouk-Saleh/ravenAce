import React, { useEffect, useState } from 'react';

/**
 * WarningToast Component
 * Displays temporary security violation warnings (e.g. "Focus lost", "Copy prohibited").
 */
export default function WarningToast({ warnings = [], onClearWarning }) {
  if (!warnings || warnings.length === 0) return null;

  // Render the most recent warning
  const currentWarning = warnings[warnings.length - 1];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-bg-surface p-4 shadow-2xl shadow-error/10">
        <div className="mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-error/20 p-1.5 text-error">
          <span className="material-symbols-outlined text-[20px]">warning</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-error">Security Violation Warning</h4>
          <p className="mt-1 text-sm text-text-secondary">{currentWarning.message}</p>
        </div>
        <button 
          onClick={() => onClearWarning(currentWarning.id)}
          className="ml-2 flex shrink-0 items-center justify-center rounded p-1 text-text-secondary hover:bg-bg-card hover:text-text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
