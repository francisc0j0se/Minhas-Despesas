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
import { CheckCircle2 } from 'lucide-react';
import { useVisibility } from '@/contexts/VisibilityProvider';

interface PaidExpense {
  name: string;
  amount: number;
  day_of_month: number;
}

interface PaidExpensesProps {
  expenses: PaidExpense[];
}

const PaidExpenses = ({ expenses }: PaidExpensesProps) => {
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
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Despesas Pagas no Mês
        </CardTitle>
        <CardDescription>
          Contas fixas que já foram marcadas como pagas.
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
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa fixa paga este mês.</p>
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

export default PaidExpenses;