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
import { Input } from "@/components/ui/input";
import { PlusCircle, MoreHorizontal, Trash2, ArrowUpDown } from "lucide-react";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import EditMonthlyExpenseDialog from "@/components/EditMonthlyExpenseDialog";
import EditFixedExpenseDialog from "@/components/EditFixedExpenseDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";

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
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
};

type SortableKeys = keyof CombinedEntry;

const Expenses = () => {
  const queryClient = useQueryClient();
  const [isAddExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  const [isEditTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [isEditFixedExpenseDialogOpen, setIsEditFixedExpenseDialogOpen] = useState(false);
  const [isEditMonthlyOverrideDialogOpen, setIsEditMonthlyOverrideDialogOpen] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedFixedExpense, setSelectedFixedExpense] = useState<FixedExpense | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

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
    },
    onError: (error) => {
      showError(`Erro ao excluir despesa: ${error.message}`);
    },
  });

  const sortedData = useMemo<CombinedEntry[]>(() => {
    if (!data) return [];

    const combined: CombinedEntry[] = [
      ...data.transactions.map((t): CombinedEntry => ({ 
        ...t, 
        type: 'Variável', 
        accountName: t.accounts?.name || null,
        is_paid: true, 
      })),
      ...data.fixedExpenses.map((fe): CombinedEntry => ({
        id: fe.id, 
        name: fe.name, 
        amount: -fe.amount, 
        date: new Date(selectedYear, selectedMonth - 1, fe.day_of_month).toISOString(),
        category: fe.category, 
        type: 'Fixa', 
        accountName: 'N/A', 
        is_paid: fe.is_paid, 
        fixed_expense_id: fe.fixed_expense_id,
      }))
    ];

    return combined.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      
      let comparison = 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (sortConfig.key === 'date') {
        comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, selectedMonth, selectedYear, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEditVariableClick = (entry: CombinedEntry) => {
    const originalTransaction = data?.transactions.find(t => t.id === entry.id);
    if (originalTransaction) {
      setSelectedTransaction(originalTransaction);
      setEditTransactionDialogOpen(true);
    }
  };

  const handleEditFixedClick = (entry: CombinedEntry) => {
    const originalExpense = data?.fixedExpenses.find(fe => fe.id === entry.id);
    if (originalExpense) {
      setSelectedFixedExpense(originalExpense);
      setIsEditFixedExpenseDialogOpen(true);
    }
  };

  const handleOverrideClick = (entry: CombinedEntry) => {
    const originalExpense = data?.fixedExpenses.find(fe => fe.id === entry.id);
    if (originalExpense) {
      setSelectedFixedExpense(originalExpense);
      setIsEditMonthlyOverrideDialogOpen(true);
    }
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const renderSortArrow = (key: SortableKeys) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return <ArrowUpDown className={`ml-2 h-4 w-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />;
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Despesas</h1>
          <Button size="sm" onClick={() => setAddExpenseDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Despesa
          </Button>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Suas Despesas de {monthNames[selectedMonth - 1]} de {selectedYear}</CardTitle>
            <CardDescription>
              Visualize e gerencie todas as suas saídas aqui.
            </CardDescription>
            <div className="pt-4 flex flex-col md:flex-row gap-4">
              <Input placeholder="Pesquisar despesas..." className="flex-grow" />
              <div className="flex gap-2">
                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('category')} className="px-2">
                      Categoria {renderSortArrow('category')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('accountName')} className="px-2">
                      Conta {renderSortArrow('accountName')}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button variant="ghost" onClick={() => requestSort('date')} className="px-2">
                      Data {renderSortArrow('date')}
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
                    <TableCell colSpan={8} className="text-center">Carregando...</TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-red-500">{(error as Error).message}</TableCell>
                  </TableRow>
                )}
                {sortedData.map((entry) => (
                  <TableRow key={`${entry.type}-${entry.id}`} data-paid={entry.type === 'Fixa' && entry.is_paid} className="data-[paid=true]:bg-green-50 dark:data-[paid=true]:bg-green-950/50">
                    <TableCell>
                      {entry.type === 'Fixa' ? (
                        <Badge variant={entry.is_paid ? 'default' : 'secondary'}>
                          {entry.is_paid ? 'Pago' : 'Pendente'}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell>
                      <Badge variant={entry.type === 'Fixa' ? 'secondary' : 'outline'}>{entry.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {entry.category && <Badge variant="outline">{entry.category}</Badge>}
                    </TableCell>
                    <TableCell>{entry.accountName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                       <DropdownMenu>
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
                                <DropdownMenuItem onClick={() => handleEditVariableClick(entry)}>Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Excluir</DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleOverrideClick(entry)}>Alterar Valor do Mês</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditFixedClick(entry)}>Editar Despesa Padrão</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
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
                                      <AlertDialogAction onClick={() => deleteFixedExpenseMutation.mutate(entry.id)} className="bg-red-600 hover:bg-red-700">
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Mostrando <strong>{sortedData.length || 0}</strong> de <strong>{sortedData.length || 0}</strong> despesas
            </div>
          </CardFooter>
        </Card>
      </div>
      <AddExpenseDialog 
        isOpen={isAddExpenseDialogOpen} 
        onOpenChange={setAddExpenseDialogOpen} 
      />
      <EditTransactionDialog 
        isOpen={isEditTransactionDialogOpen} 
        onOpenChange={setEditTransactionDialogOpen} 
        transaction={selectedTransaction}
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
    </>
  );
};

export default Expenses;