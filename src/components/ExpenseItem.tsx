import React from 'react';
import { Pencil, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { Expense, formatCurrencyBRL } from '../types';

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onViewReceipt: (receiptUrl: string, description: string) => void;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  onEdit,
  onDelete,
  onViewReceipt,
}) => {
  const isLabor = expense.category === 'mao_de_obra';

  return (
    <div className="bg-white dark:bg-[#132238] rounded-xl py-2 px-3 sm:py-2.5 sm:px-4 border border-slate-200/90 dark:border-[#223d66] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 transition-all hover:shadow-xs hover:border-slate-300 dark:hover:border-[#32568c]">
      
      {/* Left section: Category badge, date, and description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge matching screenshot */}
          {isLabor ? (
            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-[#132238] text-blue-600 dark:text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-full border-2 border-slate-300 dark:border-slate-300 shadow-2xs">
              Mão de Obra
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-[#dbeafe] dark:bg-blue-950/70 text-[#1e40af] dark:text-blue-300 text-[9px] font-bold px-2 py-0.5 rounded-full border-2 border-blue-400 dark:border-blue-400 shadow-2xs">
              Material
            </span>
          )}

          {/* Date */}
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400">
            {expense.date}
          </span>

          {/* Receipt thumbnail button if attached */}
          {expense.receiptUrl && (
            <button
              onClick={() => onViewReceipt(expense.receiptUrl!, expense.description)}
              className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-semibold px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
              title="Ver foto do comprovante"
            >
              <ImageIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Nota</span>
            </button>
          )}
        </div>

        {/* Description title */}
        <h3 className="mt-0.5 text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-snug tracking-tight break-words">
          {expense.description}
        </h3>
      </div>

      {/* Right section: Amount and action buttons */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
        {/* Formatted amount */}
        <span className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white tracking-tight">
          {formatCurrencyBRL(expense.amount)}
        </span>

        {/* Action buttons (pencil edit & trash delete) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(expense)}
            title="Editar gasto"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-[#1a2d4a] hover:bg-slate-100 dark:hover:bg-[#233d64] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/90 dark:border-[#2a456c] transition-colors cursor-pointer active:scale-95"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            title="Excluir gasto"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-[#1a2d4a] hover:bg-rose-50 dark:hover:bg-rose-950/70 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200/90 dark:border-[#2a456c] hover:border-rose-200 dark:hover:border-rose-800/80 transition-colors cursor-pointer active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
