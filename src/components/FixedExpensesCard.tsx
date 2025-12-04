import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Edit, CheckCircle2, Circle } from "lucide-react";
import AddFixedExpenseDialog from "./AddFixedExpenseDialog";
import EditMonthlyExpenseDialog from "./EditMonthlyExpenseDialog";
import { showSuccess, showError } from "@/utils/toast";

interface MonthlyExpense {
  id: string;
  name: string;
  amount: number;
  is_override: boolean;
  fixed_expense_id: string;
  category: string | null;
  day_of_month: number | null;
  is_paid: boolean;
}

const FixedExpensesCard = () => {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<MonthlyExpense | null>(null);
  const queryClient = useQueryClient();

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

  const togglePaidMutation = useMutation({
    mutationFn: async ({ expense, is_paid }: { expense: MonthlyExpense; is_paid: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase.from("monthly_expense_status").upsert({
        user_id: user.id,
        fixed_expense_id: expense.fixed_expense_id,
        month,
        year,
        is_paid,
      }, { onConflict: 'user_id,fixed_expense_id,month,year' });

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Status de pagamento atualizado!");
      queryClient.invalidateQueries({ queryKey: ["monthly_fixed_expenses", month, year] });
    },
    onError: (error) => {
      showError(`Erro ao atualizar status: ${error.message}`);
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
            <CardDescription>Suas contas recorrentes. Marque as que já foram pagas.</CardDescription>
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
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`paid-${expense.id}`}
                      checked={expense.is_paid}
                      onCheckedChange={(checked) => {
                        togglePaidMutation.mutate({ expense, is_paid: !!checked });
                      }}
                      className="h-5 w-5"
                    />
                    {expense.is_paid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <label htmlFor={`paid-${expense.id}`} className="font-medium cursor-pointer">{expense.name}</label>
                      <p className="text-sm text-muted-foreground">
                        {expense.category}
                        {expense.day_of_month && ` - Vence dia ${expense.day_of_month}`}
                        {expense.is_override && <span className="text-xs text-blue-500 ml-2">(valor editado)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(expense)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar valor do mês</span>
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