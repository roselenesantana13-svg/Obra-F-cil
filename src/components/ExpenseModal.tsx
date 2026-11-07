import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Plus, Check, Trash2, Calendar, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Expense, ExpenseCategory, Obra, parseBRLInput, formatCurrencyBRL } from '../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: {
    description: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    receiptUrl?: string;
    obraId?: string;
  }) => Promise<void>;
  editingExpense?: Expense | null;
  obras?: Obra[];
  activeObraId?: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Parses DD/MM/YYYY into a valid Date object (local time)
function parseDateString(str: string): Date {
  if (!str) return new Date();
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 0 && m <= 11) {
      return new Date(y, m, d);
    }
  }
  return new Date();
}

// Formats a Date object as DD/MM/YYYY
function formatDateToString(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Formats cents to masked BRL string "X.XXX,XX"
function formatCentsToBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// Capitaliza a primeira letra de cada palavra (ex: "sacos de cimento" -> "Sacos De Cimento", "5 cimento" -> "5 Cimento")
export function capitalizeWords(text: string): string {
  return text.replace(/(^|[\s\-\/])(\p{L})/gu, (_, prefix, char) => prefix + char.toUpperCase());
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingExpense,
  obras = [],
  activeObraId,
}) => {
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('material');
  const [date, setDate] = useState('');
  const [selectedObraId, setSelectedObraId] = useState<string>(activeObraId || (obras[0]?.id || ''));
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar interactive dropdown state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // Format today's date as DD/MM/YYYY
  const getTodayFormatted = () => {
    return formatDateToString(new Date());
  };

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description);
      // Format number to masked R$ string (e.g., "250,00")
      setAmountStr(formatCentsToBRL(Math.round(editingExpense.amount * 100)));
      setCategory(editingExpense.category);
      const initialDate = editingExpense.date || getTodayFormatted();
      setDate(initialDate);
      setCalendarViewDate(parseDateString(initialDate));
      setReceiptUrl(editingExpense.receiptUrl);
      setSelectedObraId(editingExpense.obraId || activeObraId || (obras[0]?.id || ''));
    } else {
      setDescription('');
      setAmountStr('');
      setCategory('material');
      const today = getTodayFormatted();
      setDate(today);
      setCalendarViewDate(new Date());
      setReceiptUrl(undefined);
      setSelectedObraId(activeObraId || (obras[0]?.id || ''));
    }
    setErrorMessage('');
    setIsCalendarOpen(false);
  }, [editingExpense, isOpen, activeObraId, obras]);

  // Input mask for Brazilian currency (BRL): automatically formats digits as typing
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Extract only digits
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setAmountStr('');
      return;
    }
    const cents = parseInt(digits, 10);
    if (isNaN(cents) || cents === 0) {
      setAmountStr('');
      return;
    }
    // Limit to max 999.999.999,99
    if (cents > 99999999999) return;
    setAmountStr(formatCentsToBRL(cents));
  };

  // Close calendar popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarContainerRef.current &&
        !calendarContainerRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  if (!isOpen) return null;

  // Handle image upload and compress via canvas
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecione um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max dimension 900px to maintain crispness while keeping size small for Firestore (<200KB)
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 900;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setReceiptUrl(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedDesc = capitalizeWords(description.trim());
    if (!trimmedDesc) {
      setErrorMessage('Por favor informe a descrição do gasto.');
      return;
    }

    const parsedAmount = parseBRLInput(amountStr);
    if (parsedAmount <= 0) {
      setErrorMessage('Por favor informe um valor válido maior que zero (ex: 350,00).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        description: trimmedDesc,
        amount: parsedAmount,
        category,
        date: date.trim() || getTodayFormatted(),
        receiptUrl: receiptUrl || undefined,
        obraId: selectedObraId || activeObraId,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao salvar gasto. Verifique os dados e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Modal Dialog Container */}
      <div 
        className="bg-white dark:bg-[#132238] rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-[#223d66] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="text-xl">➕</span>
              <span>{editingExpense ? 'Editar Gasto' : 'Lançar Novo Gasto'}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#1e3456] hover:bg-slate-200 dark:hover:bg-[#284570] text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Obra Destino (quando houver mais de 1 obra cadastrada) */}
          {obras && obras.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Obra para Construção</span>
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                  Vincular a
                </span>
              </label>
              <div className="relative">
                <select
                  value={selectedObraId}
                  onChange={(e) => setSelectedObraId(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-[#f8fafc] dark:bg-[#0c1626] border border-slate-200 dark:border-[#223d66] rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer appearance-none"
                >
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      🏗️ {o.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* 1. Categoria */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Categoria
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Material Button */}
              <button
                type="button"
                onClick={() => setCategory('material')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  category === 'material'
                    ? 'bg-[#dbeafe] dark:bg-blue-950/80 text-[#1e40af] dark:text-blue-300 border-2 border-blue-400 dark:border-blue-500 shadow-xs'
                    : 'bg-[#f1f5f9] dark:bg-[#0c1626] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#223d66] hover:bg-slate-100 dark:hover:bg-[#162740]'
                }`}
              >
                <span className="text-base" role="img" aria-label="Material">📦</span>
                <span>Material</span>
              </button>

              {/* Mão de Obra Button */}
              <button
                type="button"
                onClick={() => setCategory('mao_de_obra')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  category === 'mao_de_obra'
                    ? 'bg-slate-100 dark:bg-[#132238] text-blue-600 dark:text-blue-400 border-2 border-slate-300 dark:border-slate-300 shadow-xs'
                    : 'bg-[#f1f5f9] dark:bg-[#0c1626] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#223d66] hover:bg-slate-100 dark:hover:bg-[#162740]'
                }`}
              >
                <span className="text-base" role="img" aria-label="Mão de Obra">👷</span>
                <span>Mão de Obra</span>
              </button>
            </div>
          </div>

          {/* 2. Data do Gasto */}
          <div ref={calendarContainerRef} className="relative">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Data do Gasto
            </label>
            <div className="relative">
              <input
                type="text"
                value={date}
                readOnly
                onClick={() => {
                  setIsCalendarOpen((prev) => !prev);
                  setCalendarViewDate(parseDateString(date));
                }}
                placeholder="DD/MM/AAAA"
                className="w-full pl-4 pr-11 py-2.5 bg-[#f8fafc] dark:bg-[#0c1626] hover:bg-slate-100/70 dark:hover:bg-[#14233a] border border-slate-200 dark:border-[#223d66] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  setIsCalendarOpen((prev) => !prev);
                  setCalendarViewDate(parseDateString(date));
                }}
                title="Abrir calendário para escolher o dia"
                className="w-8 h-8 rounded-lg hover:bg-slate-200/80 dark:hover:bg-[#1e3456] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white absolute right-1.5 top-1.5 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* Interactive Calendar Dropdown Popup */}
            {isCalendarOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#101b2d] border border-slate-200 dark:border-[#223d66] rounded-2xl shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150">
                
                {/* Calendar Month Navigation Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarViewDate(
                        new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1)
                      );
                    }}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 capitalize select-none">
                    {MONTH_NAMES[calendarViewDate.getMonth()]} de {calendarViewDate.getFullYear()}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setCalendarViewDate(
                        new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1)
                      );
                    }}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Weekday column names */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1 select-none">
                  {WEEKDAY_NAMES.map((dayName, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-400 uppercase py-0.5">
                      {dayName}
                    </span>
                  ))}
                </div>

                {/* Days matrix */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Blank leading slots */}
                  {Array.from({
                    length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1).getDay(),
                  }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-7" />
                  ))}

                  {/* Month days */}
                  {Array.from({
                    length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate(),
                  }).map((_, i) => {
                    const dayNum = i + 1;
                    const thisDayDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), dayNum);
                    const thisDayStr = formatDateToString(thisDayDate);
                    const isSelected = date === thisDayStr;
                    const isToday = formatDateToString(new Date()) === thisDayStr;

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => {
                          setDate(thisDayStr);
                          setIsCalendarOpen(false);
                        }}
                        className={`h-7 w-full rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-300'
                            : isToday
                            ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Quick actions at bottom: Hoje & Fechar */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs select-none">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setDate(formatDateToString(today));
                      setCalendarViewDate(today);
                      setIsCalendarOpen(false);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* 3. Descrição com Capitalização Automática da Primeira Letra das Palavras */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(capitalizeWords(e.target.value))}
              autoCapitalize="words"
              autoCorrect="on"
              spellCheck="true"
              placeholder="Descrição (ex: Sacos de Cimento)"
              required
              className="w-full px-4 py-3 bg-[#f8fafc] dark:bg-[#0c1626] border border-slate-200 dark:border-[#223d66] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 4. Valor em R$ com Máscara de Entrada (Input Mask) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Valor em R$
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-sm font-bold text-slate-500 dark:text-slate-400 pointer-events-none select-none">
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={handleAmountChange}
                placeholder="0,00"
                required
                className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] dark:bg-[#0c1626] border border-slate-200 dark:border-[#223d66] rounded-xl text-slate-900 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 4. Foto da Nota de Venda / Comprovante (Opcional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Foto da Nota de Venda / Comprovante (Opcional)
            </label>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />

            {receiptUrl ? (
              <div className="relative border-2 border-slate-200 dark:border-[#223d66] rounded-2xl p-2 bg-slate-50 dark:bg-[#0c1626] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={receiptUrl}
                    alt="Comprovante"
                    className="w-14 h-14 object-cover rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Comprovante anexado
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Pronto para salvar
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptUrl(undefined)}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                  title="Remover foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-4 border-2 border-dashed border-blue-300 dark:border-blue-600/60 hover:border-blue-500 rounded-2xl bg-blue-50/40 dark:bg-[#0c1626] hover:bg-blue-50/80 dark:hover:bg-[#122035] text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold"
              >
                <span className="text-lg">📷</span>
                <span>Tirar foto da nota ou escolher da galeria</span>
              </button>
            )}
          </div>

          {/* Action Buttons matching screenshot */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#f1f5f9] dark:bg-[#1e3456] hover:bg-slate-200 dark:hover:bg-[#284570] text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black rounded-xl text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{editingExpense ? 'Salvar Gasto' : 'Adicionar Gasto'}</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
