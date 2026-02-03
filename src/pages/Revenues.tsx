import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { PlusCircle, MoreHorizontal, Trash2 } from "lucide-react";
import AddRevenueDialog from "@/components/AddRevenueDialog";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isMonthPast } from "@/utils/date";
import { showSuccess, showError } from "@/utils/toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  account_id: string;
  category: string | null;
  accounts: { name: string } | null;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
};

const Revenues = () => {
  const queryClient = useQueryClient();
  const [isAddRevenueDialogOpen, setAddRevenueDialogOpen] = useState(false);
  const [isEditTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  const { data: revenues, isLoading, error } = useQuery<Transaction[]>({
    queryKey: ['revenues', selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 1).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select(`*, accounts (name)`)
        .gt('amount', 0) // Apenas receitas (crédito)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data as Transaction[];
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Receita excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['revenues', selectedMonth, selectedYear] });
    },
    onError: (error) => {
      showError(`Erro ao excluir receita: ${error.message}`);
    },
  });

  const handleEditClick = (transaction: Transaction) => {
    if (isPastMonth) {
      showError("Não é possível editar transações em meses passados.");
      return;
    }
    setSelectedTransaction(transaction);
    setEditTransactionDialogOpen(true);
  };

  const handleDeleteClick = (transactionId: string, name: string) => {
    if (isPastMonth) {
      showError("Não é possível excluir transações em meses passados.");
      return;
    }
    deleteTransactionMutation.mutate(transactionId);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Receitas</h1>
          <Button size="sm" onClick={() => setAddRevenueDialogOpen(true)} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Receita
          </Button>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Suas Receitas de {monthNames[selectedMonth - 1]} de {selectedYear}</CardTitle>
            <CardDescription>
              Visualize e gerencie todas as suas entradas aqui.
            </CardDescription>
            <div className="pt-4 flex flex-col md:flex-row gap-4">
              <Input placeholder="Pesquisar receitas..." className="flex-grow" />
              <div className="flex gap-2">
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receita</TableHead>
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
                    <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-red-500">{error.message}</TableCell>
                  </TableRow>
                )}
                {revenues && revenues.map((revenue) => (
                  <TableRow key={revenue.id}>
                    <TableCell className="font-medium">{revenue.name}</TableCell>
                    <TableCell>
                      {revenue.category && <Badge variant="outline">{revenue.category}</Badge>}
                    </TableCell>
                    <TableCell>{revenue.accounts?.name || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(revenue.date)}
                    </TableCell>
                    <TableCell className="text-right text-green-500">
                      {formatCurrency(revenue.amount)}
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
                          <DropdownMenuItem onClick={() => handleEditClick(revenue)} disabled={isPastMonth}>
                            Editar
                          </DropdownMenuItem>
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
                                  Tem certeza que deseja excluir a receita "{revenue.name}"? Esta ação não pode ser desfeita e removerá o registro permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteClick(revenue.id, revenue.name)} className="bg-red-600 hover:bg-red-700">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
              Mostrando <strong>{revenues?.length || 0}</strong> de <strong>{revenues?.length || 0}</strong> receitas
            </div>
          </CardFooter>
        </Card>
      </div>
      <AddRevenueDialog 
        isOpen={isAddRevenueDialogOpen} 
        onOpenChange={setAddRevenueDialogOpen} 
      />
      <EditTransactionDialog 
        isOpen={isEditTransactionDialogOpen} 
        onOpenChange={setEditTransactionDialogOpen} 
        transaction={selectedTransaction}
        type="revenue"
      />
    </>
  );
};

export default Revenues;