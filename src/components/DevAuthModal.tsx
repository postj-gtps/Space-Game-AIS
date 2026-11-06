import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, KeyRound, AlertTriangle, X, ShieldCheck } from 'lucide-react';

export interface DevAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DevAuthModal: React.FC<DevAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setHasError(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = password.trim().toUpperCase();
      if (trimmed === 'DEVMODE') {
        setHasError(false);
        onSuccess();
      } else {
        setHasError(true);
        inputRef.current?.select();
      }
    },
    [password, onSuccess]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#07090e] border border-amber-500/40 rounded-lg shadow-[0_0_40px_rgba(245,158,11,0.25)] p-5 text-slate-200 font-mono relative"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 transition-colors p-1 rounded"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-2 text-amber-400">
          <div className="p-2 rounded bg-amber-950/60 border border-amber-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase text-slate-100">
              Developer Authorization
            </h3>
            <p className="text-[10px] text-slate-400">Security Clearance Required</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Full map camera pan, visual coordinate probes, and JSON instance authoring tools require verification.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
              <span>Access Password</span>
              <span className="text-amber-400 text-[10px] font-normal">Code: DEVMODE</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (hasError) setHasError(false);
                }}
                placeholder="Enter DEVMODE"
                className={`w-full bg-slate-950 border rounded px-3 py-2 text-sm font-mono tracking-wider text-amber-300 placeholder:text-slate-600 focus:outline-none transition-colors ${
                  hasError
                    ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    : 'border-slate-700 focus:border-amber-400'
                }`}
              />
              <KeyRound className="absolute right-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {hasError && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold bg-red-950/40 p-2 rounded border border-red-500/30 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>ACCESS DENIED: Enter "DEVMODE"</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Authenticate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
