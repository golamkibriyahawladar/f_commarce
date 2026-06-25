import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  itemName: string;
  confirmWord?: string; // e.g. "DISCONNECT", if not provided, defaults to itemName
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmWord,
  loading = false
}: DeleteConfirmationModalProps) {
  const [confirmInput, setConfirmInput] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetConfirmWord = confirmWord || itemName;
  const isMatch = confirmInput.trim() === targetConfirmWord.trim();

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMatch && !loading) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[420px] rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={handleConfirm}>
          
          {/* Header */}
          <div className="p-6 pb-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 rounded-xl border border-red-100 shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">{title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 font-medium max-w-[220px] truncate" title={itemName}>
                    {itemName}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose}
                disabled={loading}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-zinc-600 leading-relaxed mb-5">{message}</p>
            
            {/* Instruction Banner */}
            <div className="p-3.5 bg-red-50/60 border border-red-100/80 rounded-xl mb-4">
              <p className="text-[11px] text-red-800 leading-relaxed">
                To confirm, type <span className="font-mono font-bold bg-red-100 px-1.5 py-0.5 rounded text-red-900 break-all select-all">{targetConfirmWord}</span> in the box below:
              </p>
            </div>

            {/* Confirm Input */}
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`Type ${targetConfirmWord} here...`}
              disabled={loading}
              className={`w-full px-4 py-2.5 border-2 rounded-xl text-xs font-mono tracking-wider focus:outline-none transition-all ${
                isMatch 
                  ? 'border-red-500 bg-red-50/30 text-red-900 focus:border-red-650' 
                  : 'border-zinc-200 bg-zinc-50 text-zinc-700 focus:border-zinc-350'
              }`}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 px-6 pb-6">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 border border-zinc-300 text-xs font-bold text-zinc-700 rounded-xl hover:bg-zinc-50 transition-colors bg-white cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!isMatch || loading}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                isMatch && !loading
                  ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm hover:shadow-red-600/10 active:scale-95 duration-150'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
