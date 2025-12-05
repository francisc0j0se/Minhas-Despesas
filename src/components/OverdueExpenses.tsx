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
import { AlertCircle } from 'lucide-react';

interface OverdueExpense {
  name: string;
  amount: number;
  day_of_month: number;
}

interface OverdueExpensesProps {
  expenses: OverdueExpense[];
}

const OverdueExpenses = ({ expenses }: OverdueExpensesProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Despesas Vencidas
        </CardTitle>
        <CardDescription>
          Contas que passaram do vencimento e não foram pagas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {expenses && expenses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Despesa</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense, index) => (
                <TableRow key={index} className="bg-red-50 dark:bg-red-950/50">
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell>Dia {expense.day_of_month}</TableCell>
                  <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa vencida este mês.</p>
        )}
      </CardContent>
      {expenses && expenses.length > 0 && (
        <CardFooter className="flex justify-end">
          <div className="text-lg font-bold">
            Total: {formatCurrency(totalAmount)}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default OverdueExpenses;