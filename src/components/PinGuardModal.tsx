import React, { useState } from 'react';
import { Lock, ShieldAlert, X, Check } from 'lucide-react';

interface PinGuardModalProps {
  isOpen: boolean;
  actionDescription: string;
  expectedPin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinGuardModal: React.FC<PinGuardModalProps> = ({
  isOpen,
  actionDescription,
  expectedPin,
  onSuccess,
  onCancel,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim() === expectedPin) {
      setEnteredPin('');
      setError('');
      onSuccess();
    } else {
      setError('Incorrect PIN code. Protection settings remain locked.');
      setEnteredPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                PIN Verification Required
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                18+ Filtering & DNS Settings are protected by PIN Lock
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-100">Protected Action: </span>
            <span>{actionDescription}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="pin-verification-input"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Enter Your Security PIN
            </label>
            <input
              id="pin-verification-input"
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              value={enteredPin}
              onChange={(e) => {
                setEnteredPin(e.target.value);
                if (error) setError('');
              }}
              placeholder="••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-center font-mono text-lg tracking-widest text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Unlock & Apply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
