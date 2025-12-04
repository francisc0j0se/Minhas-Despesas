import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PlusCircle, MoreHorizontal, File } from "lucide-react";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}

interface CombinedEntry extends Omit<Transaction, 'accounts' | 'account_id'> {
  type: 'Variável' | 'Fixa';
  accountName: string | null;
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

const Expenses = () => {
  const [isAddTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [isEditTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data, isLoading, error } = useQuery({
    queryKey: ['allExpenses', selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 1).toISOString();

      const transactionsPromise = supabase
        .from('transactions')
        .select(`*, accounts (name)`)
        .lt('amount', 0) // Apenas despesas (débito)
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

  const combinedData = useMemo<CombinedEntry[]>(() => {
    if (!data) return [];

    const variableEntries: CombinedEntry[] = data.transactions.map(t => ({
      ...t,
      type: 'Variável',
      accountName: t.accounts?.name || null,
    }));

    const fixedEntries: CombinedEntry[] = data.fixedExpenses.map(fe => ({
      id: fe.id,
      name: fe.name,
      amount: -fe.amount,
      date: new Date(selectedYear, selectedMonth - 1, fe.day_of_month).toISOString(),
      category: fe.category,
      type: 'Fixa',
      accountName: 'N/A',
    }));

    return [...variableEntries, ...fixedEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, selectedMonth, selectedYear]);

  const handleEditClick = (entry: CombinedEntry) => {
    const originalTransaction = data?.transactions.find(t => t.id === entry.id);
    if (originalTransaction) {
      setSelectedTransaction(originalTransaction);
      setEditTransactionDialogOpen(true);
    }
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Despesas</h1>
          <Button size="sm" onClick={() => setAddTransactionDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Despesa
          </Button>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Suas Despesas</CardTitle>
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
                  <TableHead>Despesa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Carregando...</TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-red-500">{(error as Error).message}</TableCell>
                  </TableRow>
                )}
                {combinedData.map((entry) => (
                  <TableRow key={`${entry.type}-${entry.id}`}>
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
                      {entry.type === 'Variável' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditClick(entry)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Mostrando <strong>{combinedData.length || 0}</strong> de <strong>{combinedData.length || 0}</strong> despesas
            </div>
          </CardFooter>
        </Card>
      </div>
      <AddTransactionDialog 
        isOpen={isAddTransactionDialogOpen} 
        onOpenChange={setAddTransactionDialogOpen} 
      />
      <EditTransactionDialog 
        isOpen={isEditTransactionDialogOpen} 
        onOpenChange={setEditTransactionDialogOpen} 
        transaction={selectedTransaction}
      />
    </>
  );
};

export default Expenses;