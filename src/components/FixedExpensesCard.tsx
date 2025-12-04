import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit } from "lucide-react";
import AddFixedExpenseDialog from "./AddFixedExpenseDialog";
import EditMonthlyExpenseDialog from "./EditMonthlyExpenseDialog";

interface MonthlyExpense {
  id: string;
  name: string;
  amount: number;
  is_override: boolean;
  fixed_expense_id: string;
}

const FixedExpensesCard = () => {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<MonthlyExpense | null>(null);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: expenses, isLoading } = useQuery<MonthlyExpense[]>({
    queryKey: ["monthly_fixed_expenses", month, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_fixed_expenses', { p_month: month, p_year: year });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const handleEditClick = (expense: MonthlyExpense) => {
    setSelectedExpense(expense);
    setEditDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Despesas Fixas do Mês</CardTitle>
            <CardDescription>Suas contas recorrentes para este mês.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando despesas...</p>
          ) : expenses && expenses.length > 0 ? (
            <ul className="space-y-2">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                  <div>
                    <span className="font-medium">{expense.name}</span>
                    {expense.is_override && <span className="text-xs text-blue-500 ml-2">(editado)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(expense)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma despesa fixa cadastrada.</p>
          )}
        </CardContent>
      </Card>
      <AddFixedExpenseDialog isOpen={isAddDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditMonthlyExpenseDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setEditDialogOpen}
        expense={selectedExpense}
        month={month}
        year={year}
      />
    </>
  );
};

export default FixedExpensesCard;