import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import AddAccountDialog from "@/components/AddAccountDialog";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

const fetchAccounts = async () => {
  const { data, error } = await supabase.from("accounts").select("*").order('created_at');
  if (error) throw new Error(error.message);
  return data;
};

const Accounts = () => {
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const { data: accounts, isLoading, error } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contas</h1>
          <Button onClick={() => setIsAddAccountDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Conta
          </Button>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Suas Contas</CardTitle>
            <CardDescription>
              Uma lista de todas as suas contas financeiras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Carregando contas...</p>}
            {error && <p className="text-red-500">Erro ao carregar contas: {error.message}</p>}
            {accounts && accounts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Conta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.type}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              !isLoading && <p>Nenhuma conta encontrada. Adicione uma para começar!</p>
            )}
          </CardContent>
        </Card>
      </div>
      <AddAccountDialog
        isOpen={isAddAccountDialogOpen}
        onOpenChange={setIsAddAccountDialogOpen}
      />
    </>
  );
};

export default Accounts;