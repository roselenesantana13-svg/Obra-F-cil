import React, { useState } from 'react';
import { Check, Pencil, Trash2, Plus, X, Building2 } from 'lucide-react';
import { Obra, Expense, formatCurrencyBRL } from '../types';
import { capitalizeWords } from './ExpenseModal';

interface ObrasManagerProps {
  obras: Obra[];
  activeObraId: string;
  onSelectObra: (obraId: string) => void;
  onAddObra: (name: string) => Promise<void> | void;
  onRenameObra: (obraId: string, newName: string) => Promise<void> | void;
  onDeleteObra: (obraId: string) => Promise<void> | void;
  expenses: Expense[];
}

export const ObrasManager: React.FC<ObrasManagerProps> = ({
  obras,
  activeObraId,
  onSelectObra,
  onAddObra,
  onRenameObra,
  onDeleteObra,
  expenses,
}) => {
  const [newObraName, setNewObraName] = useState('');
  const [editingObraId, setEditingObraId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to calculate stats per obra
  const getObraStats = (obra: Obra, index: number) => {
    // If expense has obraId, match it. If no obraId, associate with the first/default obra
    const isFirstObra = index === 0;
    const obraExpenses = expenses.filter((e) => {
      if (e.obraId) {
        return e.obraId === obra.id;
      }
      return isFirstObra;
    });

    const count = obraExpenses.length;
    const total = obraExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return { count, total };
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newObraName.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddObra(capitalizeWords(trimmed));
      setNewObraName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRename = (obra: Obra, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingObraId(obra.id);
    setEditingName(obra.name);
  };

  const handleSaveRename = async (obraId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingObraId(null);
      return;
    }
    await onRenameObra(obraId, capitalizeWords(trimmed));
    setEditingObraId(null);
  };

  const handleDelete = async (obra: Obra, e: React.MouseEvent) => {
    e.stopPropagation();
    if (obras.length <= 1) {
      alert('Você precisa manter pelo menos uma obra cadastrada.');
      return;
    }

    const { count } = getObraStats(obra, obras.findIndex((o) => o.id === obra.id));
    const confirmMessage =
      count > 0
        ? `Atenção: A obra "${obra.name}" possui ${count} lançamento(s). Deseja realmente excluir esta obra e todos os seus gastos vinculados?`
        : `Deseja realmente excluir a obra "${obra.name}"?`;

    if (window.confirm(confirmMessage)) {
      await onDeleteObra(obra.id);
    }
  };

  return (
    <div className="space-y-3">
      {/* List of Obras */}
      <div className="space-y-2.5">
        {obras.map((obra, index) => {
          const isSelected = obra.id === activeObraId;
          const { count, total } = getObraStats(obra, index);
          const isEditing = editingObraId === obra.id;

          return (
            <div
              key={obra.id}
              onClick={() => {
                if (!isEditing && !isSelected) {
                  onSelectObra(obra.id);
                }
              }}
              className={`rounded-2xl p-4 transition-all duration-200 cursor-pointer relative ${
                isSelected
                  ? 'bg-[#121f33] border-2 border-[#f59e0b] shadow-lg shadow-amber-500/10'
                  : 'bg-[#121f33] border border-slate-700/60 hover:border-slate-600/80 hover:bg-[#16253c]'
              }`}
            >
              {isEditing ? (
                /* Inline Rename Form */
                <form
                  onSubmit={(e) => handleSaveRename(obra.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="space-y-2"
                >
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Editar Nome da Obra
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      className="flex-1 bg-[#0a121e] border border-amber-500/80 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
                      placeholder="Nome da obra..."
                    />
                    <button
                      type="submit"
                      className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Salvar"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingObraId(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs transition-colors cursor-pointer"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard Display matching user screenshot */
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Checkmark (if selected) + Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#f59e0b] shrink-0 stroke-[2.8]" />
                      )}
                      <h4 className="text-[15px] font-bold text-white tracking-tight truncate">
                        {obra.name}
                      </h4>
                    </div>

                    {/* Subtitle: 0 lançamentos · R$ 0,00 */}
                    <div className="mt-1 text-xs text-slate-400 font-medium">
                      {count} {count === 1 ? 'lançamento' : 'lançamentos'} · {formatCurrencyBRL(total)}
                    </div>

                    {/* Action buttons (pencil, trash) placed underneath */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(obra, e)}
                        title="Editar nome da obra"
                        aria-label={`Editar nome da obra ${obra.name}`}
                        className="w-8 h-8 rounded-xl bg-[#1c2e47] hover:bg-[#253d5e] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(obra, e)}
                        title="Excluir obra"
                        aria-label={`Excluir obra ${obra.name}`}
                        className="w-8 h-8 rounded-xl bg-[#1c2e47] hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Row: Nova obra... input + Round amber plus button */}
      <form onSubmit={handleCreate} className="flex items-center gap-2.5 pt-1">
        <input
          type="text"
          value={newObraName}
          onChange={(e) => setNewObraName(e.target.value)}
          placeholder="Nova obra..."
          disabled={isSubmitting}
          className="flex-1 bg-[#0a121e] border border-slate-700/70 focus:border-amber-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none transition-colors shadow-inner"
        />
        <button
          type="submit"
          disabled={!newObraName.trim() || isSubmitting}
          title="Adicionar Obra"
          aria-label="Adicionar Obra"
          className="w-11 h-11 rounded-full bg-slate-500 hover:bg-slate-400 disabled:opacity-50 disabled:hover:bg-slate-500 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all cursor-pointer border border-slate-400/50"
        >
          <Plus className="w-5 h-5 stroke-[2.8]" />
        </button>
      </form>
    </div>
  );
};
