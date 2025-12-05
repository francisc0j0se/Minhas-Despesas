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
import { CalendarClock } from 'lucide-react';
import { useVisibility } from '@/contexts/VisibilityProvider';

interface UpcomingExpense {
  name: string;
  amount: number;
  day_of_month: number;
}

interface UpcomingExpensesProps {
  expenses: UpcomingExpense[];
}

const UpcomingExpenses = ({ expenses }: UpcomingExpensesProps) => {
  const { isVisible } = useVisibility();

  const formatCurrency = (value: number) => {
    if (!isVisible) return 'R$ ••••••';
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
          <CalendarClock className="h-5 w-5" />
          Despesas a Vencer
        </CardTitle>
        <CardDescription>
          Contas fixas com vencimento nos próximos 7 dias.
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
                <TableRow key={index}>
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell>Dia {expense.day_of_month}</TableCell>
                  <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa vencendo na próxima semana.</p>
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

export default UpcomingExpenses;