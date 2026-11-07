import React from 'react';
import { X, Building2 } from 'lucide-react';
import { Obra, Expense } from '../types';
import { ObrasManager } from './ObrasManager';

interface ObrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  obras: Obra[];
  activeObraId: string;
  onSelectObra: (obraId: string) => void;
  onAddObra: (name: string) => Promise<void> | void;
  onRenameObra: (obraId: string, newName: string) => Promise<void> | void;
  onDeleteObra: (obraId: string) => Promise<void> | void;
  expenses: Expense[];
}

export const ObrasModal: React.FC<ObrasModalProps> = ({
  isOpen,
  onClose,
  obras,
  activeObraId,
  onSelectObra,
  onAddObra,
  onRenameObra,
  onDeleteObra,
  expenses,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#172a46] border border-[#243e68] text-slate-100 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#243e68] flex items-center justify-between bg-[#132238]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Minhas Obras
              </h2>
              <p className="text-[11px] text-slate-400">
                Selecione ou adicione novas obras para gerenciar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body with ObrasManager */}
        <div className="p-5 overflow-y-auto">
          <ObrasManager
            obras={obras}
            activeObraId={activeObraId}
            onSelectObra={(id) => {
              onSelectObra(id);
              onClose();
            }}
            onAddObra={onAddObra}
            onRenameObra={onRenameObra}
            onDeleteObra={onDeleteObra}
            expenses={expenses}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#243e68] bg-[#0f1b2d] flex items-center justify-between text-xs text-slate-400">
          <span>{obras.length} {obras.length === 1 ? 'obra cadastrada' : 'obras cadastradas'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
