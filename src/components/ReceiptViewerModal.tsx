import React from 'react';
import { X, Download, ZoomIn } from 'lucide-react';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  description: string;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  receiptUrl,
  description,
}) => {
  if (!isOpen || !receiptUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#132238] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-[#223d66] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1626]">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[280px]">
              Comprovante: {description}
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Nota Fiscal / Comprovante</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[70vh] overflow-auto">
          <img
            src={receiptUrl}
            alt={`Comprovante de ${description}`}
            className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        <div className="p-3 bg-slate-50 dark:bg-[#0c1626] flex items-center justify-between px-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Visualização do comprovante</span>
          <a
            href={receiptUrl}
            download={`comprovante_${description.replace(/\s+/g, '_')}.jpg`}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Foto</span>
          </a>
        </div>
      </div>
    </div>
  );
};
