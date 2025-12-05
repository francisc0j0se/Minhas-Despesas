import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  status: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const RecentTransactions = ({ transactions }: RecentTransactionsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
        <CardDescription>
          Suas últimas movimentações no mês.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transação</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div className="font-medium">{transaction.name}</div>
                  <div className="text-sm text-muted-foreground hidden md:inline">{formatDate(transaction.date)}</div>
                </TableCell>
                <TableCell className={`text-right ${transaction.amount > 0 ? 'text-green-500' : ''}`}>
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={transaction.status === 'Completed' ? 'default' : 'secondary'}>
                    {transaction.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando as últimas {transactions.length} transações.
        </div>
      </CardFooter>
    </Card>
  );
};

export default RecentTransactions;