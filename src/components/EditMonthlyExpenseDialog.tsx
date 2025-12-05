import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/utils/toast";
import { useEffect } from "react";

const expenseSchema = z.object({
  amount: z.coerce.number().positive("O valor deve ser positivo."),
  is_paid: z.boolean(),
});

interface EditMonthlyExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: { fixed_expense_id: string; name: string; amount: number; is_paid: boolean; } | null;
  month: number;
  year: number;
}

const EditMonthlyExpenseDialog = ({ isOpen, onOpenChange, expense, month, year }: EditMonthlyExpenseDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      is_paid: false,
    }
  });

  useEffect(() => {
    if (expense) {
      reset({
        amount: expense.amount,
        is_paid: expense.is_paid,
      });
    }
  }, [expense, reset]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseSchema>) => {
      if (!expense) throw new Error("Despesa não selecionada.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const overridePromise = supabase.from("expense_overrides").upsert({
        user_id: user.id,
        fixed_expense_id: expense.fixed_expense_id,
        month,
        year,
        amount: data.amount,
      }, { onConflict: 'user_id,fixed_expense_id,month,year' });

      const statusPromise = supabase.from("monthly_expense_status").upsert({
        user_id: user.id,
        fixed_expense_id: expense.fixed_expense_id,
        month,
        year,
        is_paid: data.is_paid,
      }, { onConflict: 'user_id,fixed_expense_id,month,year' });

      const [overrideResult, statusResult] = await Promise.all([overridePromise, statusPromise]);

      if (overrideResult.error) throw overrideResult.error;
      if (statusResult.error) throw statusResult.error;
    },
    onSuccess: () => {
      showSuccess("Despesa do mês atualizada!");
      queryClient.invalidateQueries({ queryKey: ["monthly_fixed_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["allExpenses"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(`Erro: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof expenseSchema>) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Despesa do Mês</DialogTitle>
          <DialogDescription>
            Alterando o valor e status de "{expense?.name}" apenas para o mês atual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="amount">Novo Valor (R$)</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
          </div>
          <div className="flex items-center space-x-2">
             <Controller
              name="is_paid"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="is_paid"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="is_paid">Marcar como Pago</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar Alteração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMonthlyExpenseDialog;