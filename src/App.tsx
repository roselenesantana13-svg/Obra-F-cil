import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  Plus,
  Search,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  db,
  auth,
  googleProvider,
  testConnection,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  Expense,
  ExpenseCategory,
  Obra,
  INITIAL_IMAGE_EXPENSES,
  formatCurrencyBRL,
  compareExpensesNewestFirst,
} from './types';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { ExpenseItem } from './components/ExpenseItem';
import { ExpenseModal } from './components/ExpenseModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { ObrasModal } from './components/ObrasModal';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // In-memory / Realtime Expenses list
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sidebar and Configuration States
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>(() => {
    const saved = localStorage.getItem('obra_facil_project_name');
    if (saved && saved !== 'Minha Obra') {
      return saved;
    }
    if (saved === 'Minha Obra') {
      localStorage.removeItem('obra_facil_project_name');
    }
    return '';
  });

  // Multi-obra states matching user request & screenshot
  const [obras, setObras] = useState<Obra[]>(() => {
    const saved = localStorage.getItem('obra_facil_obras');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    const legacyName = localStorage.getItem('obra_facil_project_name') || 'Minha Obra';
    return [
      {
        id: 'obra_default',
        name: legacyName,
        createdAt: new Date().toISOString(),
        userId: 'guest',
      },
    ];
  });
  const [activeObraId, setActiveObraId] = useState<string>(() => {
    const savedId = localStorage.getItem('obra_facil_active_obra_id');
    return savedId || 'obra_default';
  });
  const [isObrasModalOpen, setIsObrasModalOpen] = useState<boolean>(false);

  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    const saved = localStorage.getItem('obra_facil_budget_limit');
    if (saved !== null) {
      const num = Number(saved);
      if (num === 5000) {
        localStorage.removeItem('obra_facil_budget_limit');
        return 0;
      }
      return isNaN(num) ? 0 : num;
    }
    return 0;
  });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{ url: string; desc: string } | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [authErrorModal, setAuthErrorModal] = useState<{
    title: string;
    message: string;
    code?: string;
    domainToCopy?: string;
    linkUrl?: string;
    linkText?: string;
  } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);

  // 1. Initial Connection Test
  useEffect(() => {
    testConnection().then((connected) => {
      setIsFirebaseConnected(connected);
    });
  }, []);

  // 2. Auth State Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // 3. Real-time Firestore Sync for Obras and Expenses
  useEffect(() => {
    if (!user) {
      // Load saved guest expenses if any (filtering out any previous demo seed data)
      const localStored = localStorage.getItem('obra_facil_guest_expenses');
      if (localStored) {
        try {
          const parsed = JSON.parse(localStored);
          const filtered = Array.isArray(parsed)
            ? parsed.filter((item: Expense) => !item.id?.startsWith('demo_'))
            : [];
          filtered.sort(compareExpensesNewestFirst);
          setExpenses(filtered);
          localStorage.setItem('obra_facil_guest_expenses', JSON.stringify(filtered));
        } catch {
          // fallback to empty
        }
      } else {
        setExpenses([]);
      }

      // Load saved guest obras
      const savedObras = localStorage.getItem('obra_facil_obras');
      if (savedObras) {
        try {
          const parsed = JSON.parse(savedObras);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setObras(parsed);
          }
        } catch {}
      }
      return;
    }

    // Authenticated user: Listen to real-time Obras from Firestore
    const obrasRef = collection(db, 'users', user.uid, 'obras');
    const unsubscribeObras = onSnapshot(
      obrasRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Auto create first default obra for new user
          const defaultDocRef = doc(db, 'users', user.uid, 'obras', 'obra_default');
          const initialObra: Obra = {
            id: 'obra_default',
            name: projectName || 'Minha Obra',
            userId: user.uid,
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(defaultDocRef, initialObra);
            setObras([initialObra]);
            setActiveObraId(initialObra.id);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/obras/obra_default`);
          }
        } else {
          const items: Obra[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              name: data.name || 'Sem nome',
              userId: data.userId || user.uid,
              createdAt: data.createdAt || new Date().toISOString(),
              budgetLimit: data.budgetLimit,
              updatedAt: data.updatedAt,
            });
          });
          items.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
          setObras(items);
          setActiveObraId((prev) => {
            if (items.some((o) => o.id === prev)) return prev;
            return items[0]?.id || 'obra_default';
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/obras`);
      }
    );

    // Authenticated user: Listen to real-time Expenses from Firestore
    setIsSyncing(true);
    const expensesRef = collection(db, 'users', user.uid, 'expenses');
    const q = query(expensesRef);

    const unsubscribeExpenses = onSnapshot(
      q,
      (snapshot) => {
        const items: Expense[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            description: data.description || '',
            amount: Number(data.amount) || 0,
            category: data.category as ExpenseCategory,
            date: data.date || '',
            receiptUrl: data.receiptUrl,
            userId: data.userId || user.uid,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
            obraId: data.obraId,
          });
        });

        items.sort(compareExpensesNewestFirst);
        setExpenses(items);
        setIsSyncing(false);
        setIsFirebaseConnected(true);
      },
      (error) => {
        setIsSyncing(false);
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/expenses`);
      }
    );

    return () => {
      unsubscribeObras();
      unsubscribeExpenses();
    };
  }, [user]);

  // Auth Handlers
  const handleOpenAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showNotice('Conectado com sucesso com o Google!');
    } catch (error: any) {
      const code = error?.code || '';
      const currentHost = window.location.hostname;

      // User closed the popup intentionally or switched tabs; not an application error
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }

      if (code === 'auth/unauthorized-domain') {
        setAuthErrorModal({
          title: 'Domínio Não Autorizado no Firebase',
          message: 'Para o login do Google funcionar no seu celular ou neste link, você precisa adicionar este domínio na lista de Domínios Autorizados no Firebase Console do projeto obra-facil-d5691 (Authentication > Settings > Authorized domains). Você também pode entrar usando seu E-mail e Senha cadastrados.',
          code: code,
          domainToCopy: currentHost,
          linkUrl: 'https://console.firebase.google.com/project/obra-facil-d5691/authentication/settings',
          linkText: 'Abrir Configurações do Firebase Console',
        });
        return;
      }

      if (code === 'auth/operation-not-allowed') {
        setAuthErrorModal({
          title: 'Login com Google Desativado',
          message: 'O provedor Google ainda não foi ativado no Firebase Console do projeto obra-facil-d5691. No entanto, o login por E-mail e Senha já está ativado e disponível!',
          code: code,
          linkUrl: 'https://console.firebase.google.com/project/obra-facil-d5691/authentication/providers',
          linkText: 'Ativar Google no Firebase Console',
        });
        return;
      }

      if (code === 'auth/popup-blocked') {
        setAuthErrorModal({
          title: 'Pop-up Bloqueado no Celular',
          message: 'O navegador do seu celular bloqueou a janela pop-up de login do Google. Você pode permitir pop-ups nas configurações ou usar o login por E-mail e Senha diretamente.',
          code: code,
        });
        return;
      }

      console.warn('Sign-in status:', error?.message || error);
      setAuthErrorModal({
        title: 'Não foi possível concluir o login com o Google',
        message: error?.message || 'Ocorreu uma falha ao tentar autenticar com o Google. Experimente entrar com E-mail e Senha.',
        code: code,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showNotice('Sessão encerrada.');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Seed sample expenses directly to Firestore for authenticated user
  const handleSeedToFirebase = async () => {
    if (!user) {
      handleOpenAuthModal();
      return;
    }

    setIsSyncing(true);
    try {
      const now = new Date().toISOString();
      for (let i = 0; i < INITIAL_IMAGE_EXPENSES.length; i++) {
        const item = INITIAL_IMAGE_EXPENSES[i];
        const newId = `exp_${Date.now()}_${i}`;
        const docRef = doc(db, 'users', user.uid, 'expenses', newId);
        await setDoc(docRef, {
          description: item.description,
          amount: item.amount,
          category: item.category,
          date: item.date,
          userId: user.uid,
          createdAt: now,
        });
      }
      showNotice('Gastos da imagem importados com sucesso para seu Firebase!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/expenses`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Active Obra resolution
  const activeObra = obras.find((o) => o.id === activeObraId) || obras[0];
  const firstObraId = obras[0]?.id;

  // Filter expenses strictly belonging to the active obra
  // (Expenses with no obraId are associated with the first/default obra for 100% backward compatibility)
  const currentObraExpenses = expenses.filter((e) => {
    if (e.obraId) {
      return e.obraId === activeObra?.id;
    }
    return activeObra?.id === firstObraId;
  });

  // Calculate totals for active obra
  const materialTotal = currentObraExpenses
    .filter((e) => e.category === 'material')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const laborTotal = currentObraExpenses
    .filter((e) => e.category === 'mao_de_obra')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const grandTotal = materialTotal + laborTotal;

  // Category counts for active obra
  const materialCount = currentObraExpenses.filter((e) => e.category === 'material').length;
  const laborCount = currentObraExpenses.filter((e) => e.category === 'mao_de_obra').length;
  const totalCount = currentObraExpenses.length;

  // Filtered expenses for active obra (sorted: latest launch on top down to the first launch)
  const filteredExpenses = currentObraExpenses
    .filter((e) => {
      const matchesCategory =
        selectedCategory === 'todos' ||
        (selectedCategory === 'material' && e.category === 'material') ||
        (selectedCategory === 'mao_de_obra' && e.category === 'mao_de_obra');

      const matchesSearch =
        !searchTerm.trim() ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.date.includes(searchTerm);

      return matchesCategory && matchesSearch;
    })
    .sort(compareExpensesNewestFirst);

  // Obra Management Handlers
  const handleSelectObra = (obraId: string) => {
    setActiveObraId(obraId);
    localStorage.setItem('obra_facil_active_obra_id', obraId);
    const selected = obras.find((o) => o.id === obraId);
    if (selected) {
      showNotice(`Obra "${selected.name}" selecionada!`);
    }
  };

  const handleAddObra = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newId = `obra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newObra: Obra = {
      id: newId,
      name: trimmed,
      userId: user ? user.uid : 'guest',
      createdAt: new Date().toISOString(),
    };

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'obras', newId), newObra);
        setActiveObraId(newId);
        showNotice(`Obra "${trimmed}" adicionada com sucesso!`);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/obras/${newId}`);
      }
    } else {
      const updated = [...obras, newObra];
      setObras(updated);
      setActiveObraId(newId);
      localStorage.setItem('obra_facil_obras', JSON.stringify(updated));
      localStorage.setItem('obra_facil_active_obra_id', newId);
      showNotice(`Obra "${trimmed}" adicionada localmente!`);
    }
  };

  const handleRenameObra = async (obraId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (user) {
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'obras', obraId),
          { name: trimmed, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        showNotice(`Obra renomeada para "${trimmed}".`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/obras/${obraId}`);
      }
    } else {
      const updated = obras.map((o) =>
        o.id === obraId ? { ...o, name: trimmed, updatedAt: new Date().toISOString() } : o
      );
      setObras(updated);
      localStorage.setItem('obra_facil_obras', JSON.stringify(updated));
      showNotice(`Obra renomeada para "${trimmed}".`);
    }
  };

  const handleDeleteObra = async (obraId: string) => {
    if (obras.length <= 1) {
      alert('Você precisa manter pelo menos uma obra cadastrada.');
      return;
    }

    const obraToDelete = obras.find((o) => o.id === obraId);
    const nextObra = obras.find((o) => o.id !== obraId);
    const nextObraId = nextObra ? nextObra.id : 'obra_default';

    if (user) {
      setIsSyncing(true);
      try {
        // Delete all expenses belonging to this obra
        const toDelete = expenses.filter((e) => e.obraId === obraId);
        for (const exp of toDelete) {
          await deleteDoc(doc(db, 'users', user.uid, 'expenses', exp.id));
        }
        await deleteDoc(doc(db, 'users', user.uid, 'obras', obraId));

        if (activeObraId === obraId) {
          setActiveObraId(nextObraId);
        }
        showNotice(`Obra "${obraToDelete?.name || ''}" excluída.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/obras/${obraId}`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      const updatedExpenses = expenses.filter((e) => e.obraId !== obraId);
      setExpenses(updatedExpenses);
      localStorage.setItem('obra_facil_guest_expenses', JSON.stringify(updatedExpenses));

      const updatedObras = obras.filter((o) => o.id !== obraId);
      setObras(updatedObras);
      localStorage.setItem('obra_facil_obras', JSON.stringify(updatedObras));

      if (activeObraId === obraId) {
        setActiveObraId(nextObraId);
        localStorage.setItem('obra_facil_active_obra_id', nextObraId);
      }
      showNotice(`Obra "${obraToDelete?.name || ''}" excluída.`);
    }
  };

  // Add or Edit Expense (automatically attaches target obraId)
  const handleSaveExpense = async (expenseData: {
    description: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    receiptUrl?: string;
    obraId?: string;
  }) => {
    const targetObraId = expenseData.obraId || activeObraId || (obras[0]?.id || 'obra_default');

    if (user) {
      // Save directly to Firestore
      const path = editingExpense
        ? `users/${user.uid}/expenses/${editingExpense.id}`
        : `users/${user.uid}/expenses`;

      try {
        const docId = editingExpense ? editingExpense.id : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const docRef = doc(db, 'users', user.uid, 'expenses', docId);

        const payload: Record<string, any> = {
          description: expenseData.description,
          amount: expenseData.amount,
          category: expenseData.category,
          date: expenseData.date,
          userId: user.uid,
          obraId: targetObraId,
          createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
        };

        if (expenseData.receiptUrl) {
          payload.receiptUrl = expenseData.receiptUrl;
        }

        if (editingExpense) {
          payload.updatedAt = new Date().toISOString();
        }

        await setDoc(docRef, payload, { merge: true });
        showNotice(editingExpense ? 'Gasto atualizado no Firebase!' : 'Gasto lançado no Firebase!');
      } catch (error) {
        handleFirestoreError(error, editingExpense ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    } else {
      // Guest local update
      if (editingExpense) {
        const updated = expenses
          .map((item) =>
            item.id === editingExpense.id
              ? { ...item, ...expenseData, obraId: targetObraId, updatedAt: new Date().toISOString() }
              : item
          )
          .sort(compareExpensesNewestFirst);
        setExpenses(updated);
        localStorage.setItem('obra_facil_guest_expenses', JSON.stringify(updated));
        showNotice('Gasto atualizado localmente!');
      } else {
        const newExpense: Expense = {
          id: `guest_${Date.now()}`,
          ...expenseData,
          userId: 'guest',
          obraId: targetObraId,
          createdAt: new Date().toISOString(),
        };
        const updated = [newExpense, ...expenses].sort(compareExpensesNewestFirst);
        setExpenses(updated);
        localStorage.setItem('obra_facil_guest_expenses', JSON.stringify(updated));
        showNotice('Gasto adicionado localmente!');
      }
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    const confirmDelete = window.confirm('Deseja realmente excluir este lançamento?');
    if (!confirmDelete) return;

    if (user) {
      const path = `users/${user.uid}/expenses/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
        showNotice('Gasto removido do Firebase!');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      localStorage.setItem('obra_facil_guest_expenses', JSON.stringify(updated));
      showNotice('Gasto removido.');
    }
  };

  const handleUpdateProjectName = (name: string) => {
    const trimmed = name.trim();
    setProjectName(trimmed);
    if (trimmed) {
      localStorage.setItem('obra_facil_project_name', trimmed);
    } else {
      localStorage.removeItem('obra_facil_project_name');
    }
    showNotice(trimmed ? 'Nome da obra atualizado!' : 'Nome da obra redefinido.');
  };

  const handleUpdateBudgetLimit = (limit: number) => {
    setBudgetLimit(limit);
    if (limit > 0) {
      localStorage.setItem('obra_facil_budget_limit', limit.toString());
    } else {
      localStorage.removeItem('obra_facil_budget_limit');
    }
    showNotice(limit > 0 ? 'Limite de orçamento atualizado!' : 'Limite de orçamento desativado.');
  };

  const handleRestoreSampleData = async () => {
    if (user) {
      await handleSeedToFirebase();
    } else {
      const sampleList: Expense[] = INITIAL_IMAGE_EXPENSES.map((item, idx) => ({
        ...item,
        id: `demo_${Date.now()}_${idx + 1}`,
        userId: 'guest',
        obraId: activeObraId,
        createdAt: new Date().toISOString(),
      }));
      setExpenses(sampleList);
      localStorage.setItem('obra_facil_guest_expenses', JSON.stringify(sampleList));
      showNotice('Gastos da imagem restaurados com sucesso!');
    }
  };

  const handleClearAllData = async () => {
    if (user) {
      setIsSyncing(true);
      try {
        for (const exp of currentObraExpenses) {
          await deleteDoc(doc(db, 'users', user.uid, 'expenses', exp.id));
        }
        showNotice(`Todos os gastos de "${activeObra?.name || 'Obra'}" foram removidos.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/expenses`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      const remaining = expenses.filter((e) => !currentObraExpenses.some((c) => c.id === e.id));
      setExpenses(remaining);
      localStorage.setItem('obra_facil_guest_expenses', JSON.stringify(remaining));
      showNotice(`Todos os gastos de "${activeObra?.name || 'Obra'}" foram removidos.`);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Descrição', 'Categoria', 'Data', 'Valor (R$)'];
    const rows = filteredExpenses.map((e) => [
      `"${e.description.replace(/"/g, '""')}"`,
      e.category === 'mao_de_obra' ? 'Mão de Obra' : 'Material',
      e.date,
      e.amount.toFixed(2),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_obra_facil_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f3f6f9] dark:bg-[#0b1320] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-200 transition-colors">
      
      {/* Sticky Fixed Top Section (Header + Summary Cards + Histórico Toolbar) */}
      <div className="sticky top-0 z-30 bg-[#f3f6f9] dark:bg-[#0b1320] border-b border-slate-200/90 dark:border-[#1a2942] shadow-2xs transition-colors">
        {/* Header component */}
        <Header
          user={user}
          isFirebaseConnected={isFirebaseConnected}
          onSignIn={handleOpenAuthModal}
          onSignOut={handleSignOut}
          isSyncing={isSyncing}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          projectName={projectName}
          activeObraName={activeObra?.name || 'Minha Obra'}
          onOpenObrasModal={() => setIsObrasModalOpen(true)}
          grandTotal={grandTotal}
        />

        {/* Top Summary Cards and Histórico Toolbar pinned to top */}
        <div className="max-w-4xl w-full mx-auto px-3 sm:px-6 pt-1 pb-1.5 bg-[#f3f6f9] dark:bg-[#0b1320] transition-colors">
          {/* Summary Cards: Material, Mão de Obra */}
          <SummaryCards
            materialTotal={materialTotal}
            laborTotal={laborTotal}
            grandTotal={grandTotal}
            showTotalCard={false}
          />

          {/* Subheader: Quick search input and Category Filter with count */}
          <div className="flex items-center justify-between gap-2.5 pt-0.5">
            
            {/* Quick search input */}
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Buscar lançamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1 bg-white dark:bg-[#132238] border border-slate-200 dark:border-[#223d66] rounded-lg text-xs text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2 top-2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Filter select dropdown showing count next to Todos */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-white dark:bg-[#132238] border border-slate-200 dark:border-[#223d66] text-slate-800 dark:text-slate-100 text-xs font-bold py-1 pl-2.5 pr-7 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="todos">Todos ({totalCount})</option>
                  <option value="material">Material ({materialCount})</option>
                  <option value="mao_de_obra">Mão de Obra ({laborCount})</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-2.5 pb-24">
        
        {/* Floating Notification Toast */}
        {feedbackNotice && (
          <div className="fixed top-16 right-4 z-50 bg-slate-900 text-amber-300 border border-slate-700 shadow-xl rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {/* Expenses List */}
        <div className="space-y-2">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                onEdit={(exp) => {
                  setEditingExpense(exp);
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteExpense}
                onViewReceipt={(url, desc) => setActiveReceipt({ url, desc })}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white dark:bg-[#132238] rounded-3xl border border-dashed border-slate-300 dark:border-[#223d66] p-6 transition-colors">
              <span className="text-3xl block mb-2">📋</span>
              <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-base">
                Nenhum gasto encontrado
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? `Nenhum resultado para "${searchTerm}". Tente outro termo.`
                  : 'Comece adicionando seu primeiro lançamento de material ou mão de obra.'}
              </p>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setIsModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 bg-slate-500 hover:bg-slate-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer border border-slate-400/40"
              >
                <Plus className="w-4 h-4" />
                <span>Lançar Novo Gasto</span>
              </button>
            </div>
          )}
        </div>

      </main>

      {/* Floating Action Button on Bottom-Right */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          title="Lançar Novo Gasto"
          aria-label="Lançar Novo Gasto"
          className="w-14 h-14 bg-slate-500 hover:bg-slate-400 text-white flex items-center justify-center rounded-full shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer border-2 border-slate-300 dark:border-slate-400 group"
        >
          <Plus className="w-7 h-7 stroke-[3] group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      {/* Expense Modal (Create & Edit) */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveExpense}
        editingExpense={editingExpense}
        obras={obras}
        activeObraId={activeObraId}
      />

      {/* Full-view Receipt Lightbox Modal */}
      <ReceiptViewerModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        receiptUrl={activeReceipt?.url || null}
        description={activeReceipt?.desc || ''}
      />

      {/* Side Menu Drawer (Configurações & Gerenciamento de Obras) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onSignIn={handleOpenAuthModal}
        onSignOut={handleSignOut}
        onRestoreSampleData={handleRestoreSampleData}
        onClearAllData={handleClearAllData}
        onExportCSV={handleExportCSV}
        grandTotal={grandTotal}
        totalExpensesCount={currentObraExpenses.length}
        obras={obras}
        activeObraId={activeObraId}
        onSelectObra={handleSelectObra}
        onAddObra={handleAddObra}
        onRenameObra={handleRenameObra}
        onDeleteObra={handleDeleteObra}
        budgetLimit={budgetLimit}
        onUpdateBudgetLimit={handleUpdateBudgetLimit}
        allExpenses={expenses}
      />

      {/* Quick Obras Switcher Modal */}
      <ObrasModal
        isOpen={isObrasModalOpen}
        onClose={() => setIsObrasModalOpen(false)}
        obras={obras}
        activeObraId={activeObraId}
        onSelectObra={handleSelectObra}
        onAddObra={handleAddObra}
        onRenameObra={handleRenameObra}
        onDeleteObra={handleDeleteObra}
        expenses={expenses}
      />

      {/* Email / Password & Google Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(msg) => showNotice(msg)}
        onGoogleSignIn={handleGoogleSignIn}
      />

      {/* Auth Error Guidance Modal */}
      {authErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-5 sm:p-6 text-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-amber-600">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {authErrorModal.title}
                </h3>
              </div>
              <button
                onClick={() => setAuthErrorModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {authErrorModal.message}
            </p>

            {authErrorModal.domainToCopy && (
              <div className="mt-3.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Domínio a ser adicionado:
                </div>
                <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <code className="text-xs font-mono font-bold text-blue-700 truncate">
                    {authErrorModal.domainToCopy}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(authErrorModal.domainToCopy!);
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 2500);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-blue-600 px-2 py-1 bg-slate-100 hover:bg-blue-50 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedDomain ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {authErrorModal.code && (
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                Código do Firebase: {authErrorModal.code}
              </div>
            )}

            <div className="mt-5 flex flex-col sm:flex-row items-center gap-2.5">
              {authErrorModal.linkUrl && (
                <a
                  href={authErrorModal.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold py-2.5 px-3 rounded-xl transition-colors shadow-xs"
                >
                  <span>{authErrorModal.linkText || 'Abrir Firebase Console'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => setAuthErrorModal(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
