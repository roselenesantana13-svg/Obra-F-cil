export type ExpenseCategory = 'material' | 'mao_de_obra';

export interface Obra {
  id: string;
  name: string;
  budgetLimit?: number;
  createdAt: string;
  userId: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  receiptUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  obraId?: string;
}

export const INITIAL_IMAGE_EXPENSES: Omit<Expense, 'id' | 'userId' | 'createdAt'>[] = [];

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseBRLInput(input: string): number {
  // Strip R$, spaces, dots used as thousand separators, and convert comma to dot
  const clean = input
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Extrai timestamp numérico de lançamento para ordenação precisa
export function getExpenseLaunchTimestamp(exp: Expense): number {
  if (exp.createdAt) {
    const t = new Date(exp.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  // Se o ID contiver timestamp numérico (ex: exp_1730700000000_xxx ou guest_1730700000000)
  const match = exp.id.match(/_(\d{10,14})/);
  if (match && match[1]) {
    const t = Number(match[1]);
    if (!isNaN(t) && t > 0) return t;
  }
  // Fallback para a data digitada (DD/MM/YYYY)
  if (exp.date) {
    const parts = exp.date.trim().split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const t = new Date(y, m, d).getTime();
      if (!isNaN(t)) return t;
    }
    const t = new Date(exp.date).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

// Ordena: último lançamento no topo até o primeiro lançamento lançado
export function compareExpensesNewestFirst(a: Expense, b: Expense): number {
  const timeA = getExpenseLaunchTimestamp(a);
  const timeB = getExpenseLaunchTimestamp(b);
  if (timeB !== timeA) {
    return timeB - timeA; // Mais recente (maior timestamp) primeiro
  }
  return b.id.localeCompare(a.id);
}
