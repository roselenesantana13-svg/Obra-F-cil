import React from 'react';
import { formatCurrencyBRL } from '../types';

interface SummaryCardsProps {
  materialTotal: number;
  laborTotal: number;
  grandTotal?: number;
  showTotalCard?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  materialTotal,
  laborTotal,
  grandTotal,
  showTotalCard = false,
}) => {
  return (
    <div className={`grid ${showTotalCard ? 'grid-cols-3' : 'grid-cols-2'} gap-2 sm:gap-3.5 my-1.5 sm:my-2`}>
      
      {/* 1. Material Card */}
      <div className="bg-white dark:bg-[#132238] rounded-xl sm:rounded-2xl py-2.5 px-3 sm:py-3.5 sm:px-4 border-2 border-blue-400/90 dark:border-blue-500/50 shadow-2xs flex flex-col justify-between min-w-0 transition-all hover:border-blue-500 hover:shadow-xs">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 min-w-0">
          <span className="text-sm sm:text-lg shrink-0" role="img" aria-label="Material">📦</span>
          <span className="uppercase text-[11px] min-[360px]:text-xs sm:text-sm font-extrabold tracking-wider text-slate-700 dark:text-slate-300 truncate">
            MATERIAL
          </span>
        </div>
        <div className="mt-1 sm:mt-1.5 text-sm min-[360px]:text-base sm:text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight whitespace-nowrap truncate">
          {formatCurrencyBRL(materialTotal)}
        </div>
      </div>

      {/* 2. Mão de Obra Card */}
      <div className="bg-white dark:bg-[#132238] rounded-xl sm:rounded-2xl py-2.5 px-3 sm:py-3.5 sm:px-4 border-2 border-slate-300 dark:border-slate-300 shadow-2xs flex flex-col justify-between min-w-0 transition-all hover:border-slate-400 dark:hover:border-slate-200 hover:shadow-xs">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 min-w-0">
          <span className="text-sm sm:text-lg shrink-0" role="img" aria-label="Mão de Obra">👷</span>
          <span className="uppercase text-[11px] min-[360px]:text-xs sm:text-sm font-extrabold tracking-wider text-slate-700 dark:text-slate-300 truncate">
            MÃO DE OBRA
          </span>
        </div>
        <div className="mt-1 sm:mt-1.5 text-sm min-[360px]:text-base sm:text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight whitespace-nowrap truncate">
          {formatCurrencyBRL(laborTotal)}
        </div>
      </div>

      {/* 3. Total Card (Optional fallback if requested) */}
      {showTotalCard && grandTotal !== undefined && (
        <div className="bg-[#172a46] dark:bg-[#15253d] rounded-xl sm:rounded-2xl py-2.5 px-2.5 sm:py-3.5 sm:px-4 shadow-2xs flex flex-col justify-between border-2 border-[#243e68] dark:border-[#2f4d7b] min-w-0 transition-all hover:border-[#32568c] hover:shadow-xs">
          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-300 min-w-0">
            <span className="text-sm sm:text-lg shrink-0" role="img" aria-label="Total">📊</span>
            <span className="uppercase text-[11px] min-[360px]:text-xs sm:text-sm font-extrabold tracking-wider text-slate-200 truncate">
              TOTAL
            </span>
          </div>
          <div className="mt-1 sm:mt-1.5 text-sm min-[360px]:text-base sm:text-xl font-black text-white tracking-tight whitespace-nowrap truncate">
            {formatCurrencyBRL(grandTotal)}
          </div>
        </div>
      )}

    </div>
  );
};
