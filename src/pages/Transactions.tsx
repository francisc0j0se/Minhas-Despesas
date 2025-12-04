import { useState } from "react";
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
};

const Transactions = () => {
  const [isAddTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactionsWithAccount'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts (
            name
          )
        `)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    }
  });

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Transações</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <File className="h-3.5 w-3.5 mr-2" />
              Exportar
            </Button>
            <Button size="sm" onClick={() => setAddTransactionDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Transação
            </Button>
          </div>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Suas Transações</CardTitle>
            <CardDescription>
              Visualize e gerencie todas as suas transações aqui.
            </CardDescription>
            <div className="pt-4">
              <Input placeholder="Pesquisar transações..." />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transação</TableHead>
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
                {transactions && transactions.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.name}</TableCell>
                    <TableCell>
                      {transaction.category && <Badge variant="outline">{transaction.category}</Badge>}
                    </TableCell>
                    <TableCell>{transaction.accounts?.name || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell className={`text-right ${transaction.amount > 0 ? "text-green-500" : ""}`}>
                      {formatCurrency(transaction.amount)}
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
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Excluir</DropdownMenuItem>
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
              Mostrando <strong>1-{transactions?.length || 0}</strong> de <strong>{transactions?.length || 0}</strong> transações
            </div>
          </CardFooter>
        </Card>
      </div>
      <AddTransactionDialog 
        isOpen={isAddTransactionDialogOpen} 
        onOpenChange={setAddTransactionDialogOpen} 
      />
    </>
  );
};

export default Transactions;