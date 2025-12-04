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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { PlusCircle, MoreHorizontal, File } from "lucide-react";

const mockTransactions = [
  {
    id: "txn_1",
    name: "Salário Mensal",
    amount: 5000.0,
    date: "2024-07-05",
    account: "Conta Corrente",
    category: "Receita",
    status: "Concluído",
  },
  {
    id: "txn_2",
    name: "Aluguel",
    amount: -1500.0,
    date: "2024-07-06",
    account: "Conta Corrente",
    category: "Moradia",
    status: "Concluído",
  },
  {
    id: "txn_3",
    name: "Supermercado",
    amount: -350.75,
    date: "2024-07-10",
    account: "Cartão de Crédito",
    category: "Alimentação",
    status: "Concluído",
  },
  {
    id: "txn_4",
    name: "Assinatura Netflix",
    amount: -39.9,
    date: "2024-07-12",
    account: "Cartão de Crédito",
    category: "Lazer",
    status: "Concluído",
  },
  {
    id: "txn_5",
    name: "Gasolina",
    amount: -150.0,
    date: "2024-07-15",
    account: "Conta Corrente",
    category: "Transporte",
    status: "Concluído",
  },
  {
    id: "txn_6",
    name: "Restaurante",
    amount: -85.5,
    date: "2024-07-18",
    account: "Cartão de Crédito",
    category: "Alimentação",
    status: "Concluído",
  },
  {
    id: "txn_7",
    name: "Compra Online",
    amount: -250.0,
    date: "2024-07-20",
    account: "Cartão de Crédito",
    category: "Compras",
    status: "Pendente",
  },
];

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
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transações</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <File className="h-3.5 w-3.5 mr-2" />
            Exportar
          </Button>
          <Button size="sm">
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
              {mockTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell>{transaction.account}</TableCell>
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
            Mostrando <strong>1-7</strong> de <strong>32</strong> transações
          </div>
          <Pagination className="ml-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Transactions;