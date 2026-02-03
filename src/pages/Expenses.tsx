import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Trash2, ArrowUpDown, Copy, Edit, CheckCircle, XCircle } from "lucide-react";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import AddFixedExpenseDialog from "@/components/AddFixedExpenseDialog";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import EditMonthlyExpenseDialog from "@/components/EditMonthlyExpenseDialog";
import EditFixedExpenseDialog from "@/components/EditFixedExpenseDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import CopyExpensesDialog from "@/components/CopyExpensesDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import FilterBar from "@/components/FilterBar";
import { isMonthPast } from "@/utils/date";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  account_id: string;
  category: string | null;
  accounts: { name: string } | null;
}

interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  day_of_month: number;
  category: string | null;
  is_paid: boolean;
  fixed_expense_id: string;
}

interface CombinedEntry {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string | null;
  type: 'Variável' | 'Fixa';
  accountName: string | null;
  is_paid: boolean;
  fixed_expense_id?: string;
  uniqueKey: string;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
};

type SortableKeys = keyof CombinedEntry | 'date_day';

const Expenses = () => {
  const queryClient = useQueryClient();
  const [isAddExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  const [isAddFixedExpenseDialogOpen, setAddFixedExpenseDialogOpen] = useState(false);
  const [isEditTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [isEditFixedExpenseDialogOpen, setIsEditFixedExpenseDialogOpen] = useState(false);
  const [isEditMonthlyOverrideDialogOpen, setIsEditMonthlyOverrideDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isAddOptionsSheetOpen, setAddOptionsSheetOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedFixedExpense, setSelectedFixedExpense] = useState<FixedExpense | null>(null);
  const [selectedEntryForAction, setSelectedEntryForAction] = useState<CombinedEntry | null>(null);
  
  // Filter States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'fixa' | 'variavel'>('all');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  const isMobile = useIsMobile();
  const isPastMonth = isMonthPast(selectedMonth, selectedYear);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const availableMonths = monthNames
    .map((month, index) => ({ name: month, value: index + 1 }))
    .filter(m => selectedYear !== currentYear || m.value <= currentMonth);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['allExpenses', selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 1).toISOString();

      const transactionsPromise = supabase
        .from('transactions')
        .select(`*, accounts (name)`)
        .lt('amount', 0)
        .gte('date', startDate)
        .lt('date', endDate);

      const fixedExpensesPromise = supabase.rpc('get_monthly_fixed_expenses', { 
        p_month: selectedMonth, 
        p_year: selectedYear 
      });

      const [transactionsRes, fixedExpensesRes] = await Promise.all([transactionsPromise, fixedExpensesPromise]);

      if (transactionsRes.error) throw new Error(transactionsRes.error.message);
      if (fixedExpensesRes.error) throw new Error(fixedExpensesRes.error.message);

      return {
        transactions: (transactionsRes.data as Transaction[]) || [],
        fixedExpenses: (fixedExpensesRes.data as FixedExpense[]) || [],
      };
    }
  });

  const deleteFixedExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from("fixed_expenses").delete().eq("id", expenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Despesa fixa excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['allExpenses', selectedMonth, selectedYear] });
      setIsActionSheetOpen(false);
    },
    onError: (error) => {
      showError(`Erro ao excluir despesa: ${error.message}`);
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Despesa variável excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['allExpenses', selectedMonth, selectedYear] });
      setIsActionSheetOpen(false);
    },
    onError: (error) => {
      showError(`Erro ao excluir despesa: ${error.message}`);
    },
  });

  const togglePaidStatusMutation = useMutation({
    mutationFn: async ({ expenseId, isPaid }: { expenseId: string; isPaid: boolean }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado.");

        const { error } = await supabase.from("monthly_expense_status").upsert({
            user_id: user.id,
            fixed_expense_id: expenseId,
            month: selectedMonth,
            year: selectedYear,
            is_paid: isPaid,
        }, { onConflict: 'user_id,fixed_expense_id,month,year' });

        if (error) throw error;
    },
    onSuccess: () => {
        showSuccess("Status da despesa atualizado!");
        queryClient.invalidateQueries({ queryKey: ['allExpenses', selectedMonth, selectedYear] });
        setIsActionSheetOpen(false);
    },
    onError: (error) => {
        showError(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const handleTogglePaidStatus = (entry: CombinedEntry) => {
    if (isPastMonth) {
      showError("Não é possível alterar o status de despesas em meses passados.");
      return;
    }
    togglePaidStatusMutation.mutate({
        expenseId: entry.id,
        isPaid: !entry.is_paid,
    });
  };

  const combinedData = useMemo<CombinedEntry[]>(() => {
    if (!data) return [];

    const transactions = data.transactions.map((t): CombinedEntry => ({ 
      ...t, 
      type: 'Variável', 
      accountName: t.accounts?.name || null,
      is_paid: true, // Variáveis são consideradas pagas ao serem registradas
      uniqueKey: `V-${t.id}`,
      amount: Math.abs(t.amount), // Usar valor absoluto para despesas
    }));

    const fixedExpenses = data.fixedExpenses.map((fe): CombinedEntry => ({
      id: fe.id, 
      name: fe.name, 
      amount: fe.amount, 
      date: new Date(selectedYear, selectedMonth - 1, fe.day_of_month).toISOString(),
      category: fe.category, 
      type: 'Fixa', 
      accountName: 'N/A', 
      is_paid: fe.is_paid, 
      fixed_expense_id: fe.fixed_expense_id,
      uniqueKey: `F-${fe.id}`,
    }));

    return [...transactions, ...fixedExpenses];
  }, [data, selectedMonth, selectedYear]);

  const filteredAndSortedData = useMemo<CombinedEntry[]>(() => {
    let filtered = combinedData;
    const query = searchQuery.toLowerCase().trim();

    // 1. Filtering
    if (query) {
      filtered = filtered.filter(entry => 
        entry.name.toLowerCase().includes(query) ||
        entry.category?.toLowerCase().includes(query) ||
        entry.accountName?.toLowerCase().includes(query)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(entry => 
        filterType === 'fixa' ? entry.type === 'Fixa' : entry.type === 'Variável'
      );
    }

    if (filterCategory) {
      filtered = filtered.filter(entry => entry.category === filterCategory);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(entry => {
        if (entry.type === 'Variável') return filterStatus === 'paid'; // Variáveis são sempre pagas
        
        return filterStatus === 'paid' ? entry.is_paid : !entry.is_paid;
      });
    }

    // 2. Sorting
    return filtered.sort((a, b) => {
      const key = sortConfig.key;
      const direction = sortConfig.direction;
      
      let valA: any;
      let valB: any;

      if (key === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (key === 'date_day') {
        valA = a.type === 'Fixa' ? new Date(a.date).getUTCDate() : new Date(a.date).getUTCDate();
        valB = b.type === 'Fixa' ? new Date(b.date).getUTCDate() : new Date(b.date).getUTCDate();
      } else {
        valA = a[key as keyof CombinedEntry];
        valB = b[key as keyof CombinedEntry];
      }
      
      let comparison = 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        comparison = (valA === valB) ? 0 : (valA ? 1 : -1);
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [combinedData, searchQuery, filterType, filterCategory, filterStatus, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEditVariableClick = (entry: CombinedEntry) => {
    if (isPastMonth) {
      showError("Não é possível editar transações em meses passados.");
      return;
    }
    const originalTransaction = data?.transactions.find(t => `V-${t.id}` === entry.uniqueKey);
    if (originalTransaction) {
      setSelectedTransaction(originalTransaction);
      setEditTransactionDialogOpen(true);
    }
    setIsActionSheetOpen(false);
  };

  const handleEditFixedClick = (entry: CombinedEntry) => {
    const originalExpense = data?.fixedExpenses.find(fe => `F-${fe.id}` === entry.uniqueKey);
    if (originalExpense) {
      setSelectedFixedExpense(originalExpense);
      setIsEditFixedExpenseDialogOpen(true);
    }
    setIsActionSheetOpen(false);
  };

  const handleOverrideClick = (entry: CombinedEntry) => {
    if (isPastMonth) {
      showError("Não é possível alterar o valor mensal de despesas em meses passados.");
      return;
    }
    const originalExpense = data?.fixedExpenses.find(fe => `F-${fe.id}` === entry.uniqueKey);
    if (originalExpense) {
      setSelectedFixedExpense(originalExpense);
      setIsEditMonthlyOverrideDialogOpen(true);
    }
    setIsActionSheetOpen(false);
  };

  const handleDeleteFixed = (entry: CombinedEntry) => {
    if (isPastMonth) {
      showError("Não é possível excluir despesas fixas em meses passados.");
      return;
    }
    deleteFixedExpenseMutation.mutate(entry.id);
  };

  const handleDeleteVariable = (entry: CombinedEntry) => {
    if (isPastMonth) {
      showError("Não é possível excluir transações em meses passados.");
      return;
    }
    deleteTransactionMutation.mutate(entry.id);
  };

  const handleActionClick = (entry: CombinedEntry) => {
    setSelectedEntryForAction(entry);
    if (isMobile) {
      setIsActionSheetOpen(true);
    }
  };

  const renderSortArrow = (key: SortableKeys) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return <ArrowUpDown className={`ml-2 h-4 w-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />;
  };

  const toggleRowSelection = (key: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredAndSortedData.length && filteredAndSortedData.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedData.map(entry => entry.uniqueKey)));
    }
  };

  const totalSelectedAmount = useMemo(() => {
    return filteredAndSortedData
      .filter(entry => selectedRows.has(entry.uniqueKey))
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [selectedRows, filteredAndSortedData]);

  const ActionSheet = () => {
    if (!selectedEntryForAction) return null;

    const entry = selectedEntryForAction;
    const isFixed = entry.type === 'Fixa';
    const isEditable = !isPastMonth;

    return (
      <Sheet open={isActionSheetOpen} onOpenChange={setIsActionSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>Ações para: {entry.name}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4">
            {isFixed ? (
              <>
                <Button
                  size="lg"
                  variant={entry.is_paid ? "secondary" : "default"}
                  onClick={() => handleTogglePaidStatus(entry)}
                  disabled={!isEditable}
                >
                  {entry.is_paid ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Marcar como Pendente
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Paga
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleOverrideClick(entry)}
                  disabled={!isEditable}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Alterar Valor do Mês
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleEditFixedClick(entry)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Despesa Padrão
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="lg" variant="destructive" className="mt-4" disabled={!isEditable}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Despesa Fixa
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a despesa fixa "{entry.name}"? Esta ação não pode ser desfeita e removerá o registro permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteFixed(entry)} className="bg-red-600 hover:bg-red-700">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => handleEditVariableClick(entry)}
                  disabled={!isEditable}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Despesa Variável
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="lg" variant="destructive" className="mt-4" disabled={!isEditable}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Despesa Variável
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a despesa variável "{entry.name}"? Esta ação não pode ser desfeita e removerá o registro permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteVariable(entry)} className="bg-red-600 hover:bg-red-700">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {!isEditable && (
              <p className="text-sm text-center text-red-500">Mês passado. Edição bloqueada.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Despesas</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setIsCopyDialogOpen(true)} className="flex-1 sm:flex-grow-0">
              <Copy className="h-4 w-4 mr-2" />
              Copiar Mês
            </Button>
            {isMobile ? (
              <Sheet open={isAddOptionsSheetOpen} onOpenChange={setAddOptionsSheetOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" className="flex-1 sm:flex-grow-0">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Despesa
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-lg">
                  <SheetHeader className="text-left mb-4">
                    <SheetTitle>O que deseja adicionar?</SheetTitle>
                  </SheetHeader>
                  <div className="grid gap-4">
                    <Button
                      size="lg"
                      onClick={() => {
                        setAddExpenseDialogOpen(true);
                        setAddOptionsSheetOpen(false);
                      }}
                    >
                      Despesa Variável
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setAddFixedExpenseDialogOpen(true);
                        setAddOptionsSheetOpen(false);
                      }}
                    >
                      Despesa Fixa
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="flex-1 sm:flex-grow-0">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Despesa
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setAddExpenseDialogOpen(true)}>
                    Adicionar Despesa Variável
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setAddFixedExpenseDialogOpen(true)}>
                    Adicionar Despesa Fixa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Suas Despesas de {monthNames[selectedMonth - 1]} de {selectedYear}</CardTitle>
            <CardDescription>
              Visualize e gerencie todas as suas saídas aqui.
            </CardDescription>
            <div className="pt-4 flex flex-col md:flex-row gap-4">
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month.name} value={String(month.value)}>{month.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger className="w-full md:w-[120px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4">
              <FilterBar
                search={searchQuery}
                onSearchChange={setSearchQuery}
                filterType={filterType}
                onFilterTypeChange={setFilterType}
                filterCategory={filterCategory}
                onFilterCategoryChange={setFilterCategory}
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] p-0 text-center">
                    <Checkbox
                      checked={selectedRows.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('name')} className="px-2">
                      Despesa {renderSortArrow('name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('type')} className="px-2">
                      Tipo {renderSortArrow('type')}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button variant="ghost" onClick={() => requestSort('category')} className="px-2">
                      Categoria {renderSortArrow('category')}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    <Button variant="ghost" onClick={() => requestSort('accountName')} className="px-2">
                      Conta {renderSortArrow('accountName')}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button variant="ghost" onClick={() => requestSort('date_day')} className="px-2">
                      Dia {renderSortArrow('date_day')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('amount')} className="px-2">
                      Valor {renderSortArrow('amount')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Carregando...</TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-red-500">{(error as Error).message}</TableCell>
                  </TableRow>
                )}
                {filteredAndSortedData.map((entry) => (
                  <TableRow key={entry.uniqueKey} data-paid={entry.type === 'Fixa' && entry.is_paid} className="data-[paid=true]:bg-green-50 dark:data-[paid=true]:bg-green-950/50">
                    <TableCell className="p-0 text-center">
                      <Checkbox
                        checked={selectedRows.has(entry.uniqueKey)}
                        onCheckedChange={() => toggleRowSelection(entry.uniqueKey)}
                      />
                    </TableCell>
                    <TableCell>
                      {entry.type === 'Fixa' ? (
                        <Badge variant={entry.is_paid ? 'default' : 'secondary'}>
                          {entry.is_paid ? 'Pago' : 'Pendente'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Concluído</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.name}
                      <div className="text-xs text-muted-foreground lg:hidden mt-1">
                        {entry.category && <Badge variant="outline" className="mr-1">{entry.category}</Badge>}
                        {entry.accountName && <span className="mr-1">{entry.accountName}</span>}
                        {entry.type === 'Fixa' ? `Dia ${new Date(entry.date).getUTCDate()}` : formatDate(entry.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.type === 'Fixa' ? 'secondary' : 'outline'}>{entry.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {entry.category && <Badge variant="outline">{entry.category}</Badge>}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{entry.accountName || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entry.type === 'Fixa' ? `Dia ${new Date(entry.date).getUTCDate()}` : formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                      {isMobile ? (
                        <Button aria-haspopup="true" size="icon" variant="ghost" onClick={() => handleActionClick(entry)}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      ) : (
                        <DropdownMenu onOpenChange={(open) => {
                          if (open) handleActionClick(entry);
                          else setSelectedEntryForAction(null);
                        }}>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            {entry.type === 'Variável' ? (
                              <>
                                <DropdownMenuItem onSelect={() => handleEditVariableClick(entry)} disabled={isPastMonth}>Editar</DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600" disabled={isPastMonth}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir a despesa variável "{entry.name}"? Esta ação não pode ser desfeita e removerá o registro permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteVariable(entry)} className="bg-red-600 hover:bg-red-700">
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onSelect={() => handleTogglePaidStatus(entry)} disabled={isPastMonth}>
                                  {entry.is_paid ? "Marcar como Pendente" : "Marcar como Paga"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOverrideClick(entry)} disabled={isPastMonth}>Alterar Valor do Mês</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleEditFixedClick(entry)}>Editar Despesa Padrão</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600" disabled={isPastMonth}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir a despesa fixa "{entry.name}"? Esta ação não pode ser desfeita e removerá o registro permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteFixed(entry)} className="bg-red-600 hover:bg-red-700">
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Mostrando <strong>{filteredAndSortedData.length || 0}</strong> de <strong>{combinedData.length || 0}</strong> despesas
            </div>
            {selectedRows.size > 0 && (
              <div className="text-lg font-bold text-red-600">
                Total Selecionado: {formatCurrency(totalSelectedAmount)}
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
      <AddExpenseDialog 
        isOpen={isAddExpenseDialogOpen} 
        onOpenChange={setAddExpenseDialogOpen} 
      />
      <AddFixedExpenseDialog
        isOpen={isAddFixedExpenseDialogOpen}
        onOpenChange={setAddFixedExpenseDialogOpen}
      />
      <EditTransactionDialog 
        isOpen={isEditTransactionDialogOpen} 
        onOpenChange={setEditTransactionDialogOpen} 
        transaction={selectedTransaction ? { ...selectedTransaction, amount: Math.abs(selectedTransaction.amount) } : null}
        type="expense"
      />
      <EditFixedExpenseDialog
        isOpen={isEditFixedExpenseDialogOpen}
        onOpenChange={setIsEditFixedExpenseDialogOpen}
        expense={selectedFixedExpense}
      />
      <EditMonthlyExpenseDialog
        isOpen={isEditMonthlyOverrideDialogOpen}
        onOpenChange={setIsEditMonthlyOverrideDialogOpen}
        expense={selectedFixedExpense}
        month={selectedMonth}
        year={selectedYear}
      />
      <CopyExpensesDialog
        isOpen={isCopyDialogOpen}
        onOpenChange={setIsCopyDialogOpen}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
      />
      <ActionSheet />
    </>
  );
};

export default Expenses;