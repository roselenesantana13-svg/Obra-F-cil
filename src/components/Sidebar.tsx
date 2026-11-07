import React, { useState } from 'react';
import {
  X,
  Cloud,
  User,
  LogOut,
  LogIn,
  Trash2,
  FileSpreadsheet,
  Settings,
  Database,
  Building,
  Target,
  CheckCircle2,
  Info,
  Sun,
  Moon,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Obra, Expense, formatCurrencyBRL, parseBRLInput } from '../types';
import { capitalizeWords } from './ExpenseModal';
import { useTheme } from '../context/ThemeContext';
import { ObrasManager } from './ObrasManager';

function formatCentsToBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onRestoreSampleData?: () => void;
  onClearAllData: () => void;
  onExportCSV: () => void;
  grandTotal: number;
  totalExpensesCount: number;
  obras: Obra[];
  activeObraId: string;
  onSelectObra: (obraId: string) => void;
  onAddObra: (name: string) => Promise<void> | void;
  onRenameObra: (obraId: string, newName: string) => Promise<void> | void;
  onDeleteObra: (obraId: string) => Promise<void> | void;
  budgetLimit: number;
  onUpdateBudgetLimit: (limit: number) => void;
  allExpenses: Expense[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  user,
  onSignIn,
  onSignOut,
  onClearAllData,
  onExportCSV,
  grandTotal,
  totalExpensesCount,
  obras,
  activeObraId,
  onSelectObra,
  onAddObra,
  onRenameObra,
  onDeleteObra,
  budgetLimit,
  onUpdateBudgetLimit,
  allExpenses,
}) => {
  const { theme, setTheme } = useTheme();
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(() =>
    budgetLimit > 0 ? formatCentsToBRL(Math.round(budgetLimit * 100)) : ''
  );
  const activeObra = obras.find((o) => o.id === activeObraId) || obras[0];

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setTempBudget('');
      return;
    }
    const cents = parseInt(digits, 10);
    if (isNaN(cents) || cents === 0) {
      setTempBudget('');
      return;
    }
    if (cents > 99999999999) return;
    setTempBudget(formatCentsToBRL(cents));
  };

  if (!isOpen) return null;

  const budgetProgress = budgetLimit > 0 ? Math.min(100, (grandTotal / budgetLimit) * 100) : 0;
  const isOverBudget = budgetLimit > 0 && grandTotal > budgetLimit;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <aside
          className="w-screen max-w-sm sm:max-w-md bg-[#172a46] text-slate-100 shadow-2xl flex flex-col border-r border-[#243e68] animate-in slide-in-from-left duration-250 ease-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#243e68] flex items-center justify-between bg-[#132238]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Configurações
                </h2>
                <p className="text-[11px] text-slate-400">
                  Gerenciamento, sincronização e obra
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

            {/* CARD EXATO DA IMAGEM ANEXADA: Sincronização em Tempo Real no Firebase */}
            {!user ? (
              <div className="bg-gradient-to-br from-[#25337b] via-[#2a388f] to-[#303f9f] rounded-2xl p-5 shadow-lg border border-indigo-400/30 text-white relative overflow-hidden">
                <div className="flex items-start gap-4">
                  {/* Cloud Icon container matching screenshot */}
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    <Cloud className="w-6 h-6 text-white stroke-[2.5]" />
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white leading-tight">
                      Sincronização em Tempo Real no Firebase
                    </h3>
                    <p className="mt-1.5 text-xs text-indigo-100/90 leading-relaxed">
                      Entre com seu e-mail e senha (ou Google) para salvar e sincronizar seus lançamentos com segurança na nuvem.
                    </p>
                  </div>
                </div>

                {/* "Conectar Minha Conta" button matching screenshot */}
                <div className="mt-4 pt-1">
                  <button
                    onClick={() => {
                      onSignIn();
                      onClose();
                    }}
                    className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black py-3 px-4 rounded-xl text-sm shadow-md transition-all active:scale-95 cursor-pointer text-center block"
                  >
                    Conectar Minha Conta
                  </button>
                </div>
              </div>
            ) : (
              /* User logged in state */
              <div className="bg-[#1a2333] border border-slate-700/80 rounded-2xl p-4.5 shadow-md">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Usuário'}
                      className="w-11 h-11 rounded-full ring-2 ring-emerald-400 object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-500 text-white font-extrabold flex items-center justify-center text-base">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-white truncate">
                      {user.displayName || 'Usuário Conectado'}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {user.email}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3 inline" /> Nuvem Firestore Ativa
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Status da Conta</span>
                  <button
                    onClick={() => {
                      onSignOut();
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            )}

            {/* SEÇÃO 2: Obras para Construção (Multi-Obra) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  <span>Obras para Construção ({obras.length})</span>
                </h4>
              </div>

              {/* Exact Manager UI matching user screenshot */}
              <ObrasManager
                obras={obras}
                activeObraId={activeObraId}
                onSelectObra={onSelectObra}
                onAddObra={onAddObra}
                onRenameObra={onRenameObra}
                onDeleteObra={onDeleteObra}
                expenses={allExpenses}
              />

              {/* Teto de Orçamento da Obra Selecionada */}
              <div className="bg-[#151f30] rounded-2xl p-4 border border-slate-800 space-y-3 mt-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Orçamento de: {activeObra?.name || 'Obra Ativa'}</span>
                </div>

                {/* Teto de Orçamento */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Target className="w-3 h-3 text-amber-400" />
                      <span>Limite de Orçamento</span>
                    </label>
                    <button
                      onClick={() => {
                        if (editingBudget) {
                          const val = parseBRLInput(tempBudget);
                          onUpdateBudgetLimit(val);
                          setEditingBudget(false);
                        } else {
                          setTempBudget(budgetLimit > 0 ? formatCentsToBRL(Math.round(budgetLimit * 100)) : '');
                          setEditingBudget(true);
                        }
                      }}
                      className="text-[11px] text-amber-400 font-semibold hover:underline cursor-pointer"
                    >
                      {editingBudget ? 'Confirmar' : (budgetLimit > 0 ? 'Alterar' : 'Definir')}
                    </button>
                  </div>

                  {editingBudget ? (
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-slate-500 pointer-events-none select-none">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={tempBudget}
                        onChange={handleBudgetChange}
                        placeholder="0,00"
                        autoFocus
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between text-xs font-extrabold mb-1">
                        <span className="text-slate-300">Gasto: {formatCurrencyBRL(grandTotal)}</span>
                        <span className={isOverBudget ? 'text-rose-400' : 'text-amber-400'}>
                          {budgetLimit > 0 ? formatCurrencyBRL(budgetLimit) : 'Não definido'}
                        </span>
                      </div>

                      {budgetLimit > 0 && (
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOverBudget ? 'bg-rose-500' : budgetProgress > 80 ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${budgetProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO TEMA / APARÊNCIA */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Aparência / Tema</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 bg-[#111927] p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Tema Claro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#223d66] text-amber-300 shadow-xs border border-[#32568c]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Tema Escuro</span>
                </button>
              </div>
            </div>

            {/* SEÇÃO 3: Gerenciamento de Dados */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Gerenciamento de Dados</span>
              </h4>

              <div className="space-y-2">
                {/* Exportar CSV */}
                <button
                  onClick={() => {
                    onExportCSV();
                  }}
                  className="w-full flex items-center justify-between p-3 bg-[#151f30] hover:bg-[#1a263c] rounded-xl border border-slate-800 transition-colors text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Exportar Relatório (CSV)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">.csv</span>
                </button>

                {/* Limpar todos os dados */}
                <button
                  onClick={() => {
                    const confirmClear = window.confirm(
                      'Atenção: deseja realmente excluir todos os lançamentos cadastrados?'
                    );
                    if (confirmClear) {
                      onClearAllData();
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 transition-colors text-xs font-semibold text-rose-300 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Limpar Todos os Gastos</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-bold">
                    {totalExpensesCount} itens
                  </span>
                </button>
              </div>
            </div>

            {/* SEÇÃO 4: Sobre o Sistema & Firebase */}
            <div className="bg-[#111927] rounded-xl p-3.5 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Aplicativo:</span>
                <span>Obra Fácil v1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Banco de Dados:</span>
                <span className="text-emerald-400 font-mono text-[10px]">Firestore Enterprise</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Sincronização:</span>
                <span className="text-amber-400">Tempo Real (onSnapshot)</span>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-800 bg-[#0b1120] text-center text-[11px] text-slate-500">
            Obra Fácil • Controle de Gastos Simplificado
          </div>
        </aside>
      </div>
    </div>
  );
};
