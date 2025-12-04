import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/utils/toast";
import { useEffect } from "react";

const expenseSchema = z.object({
  amount: z.coerce.number().positive("O valor deve ser positivo."),
});

interface EditMonthlyExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: { fixed_expense_id: string; name: string; amount: number } | null;
  month: number;
  year: number;
}

const EditMonthlyExpenseDialog = ({ isOpen, onOpenChange, expense, month, year }: EditMonthlyExpenseDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    if (expense) {
      setValue("amount", expense.amount);
    }
  }, [expense, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseSchema>) => {
      if (!expense) throw new Error("Despesa não selecionada.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase.from("expense_overrides").upsert({
        user_id: user.id,
        fixed_expense_id: expense.fixed_expense_id,
        month,
        year,
        amount: data.amount,
      }, { onConflict: 'user_id,fixed_expense_id,month,year' });

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Valor do mês atualizado!");
      queryClient.invalidateQueries({ queryKey: ["monthly_fixed_expenses"] });
      onOpenChange(false);
      reset();
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
          <DialogTitle>Editar Valor para este Mês</DialogTitle>
          <DialogDescription>
            Alterando o valor de "{expense?.name}" apenas para o mês atual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="amount">Novo Valor (R$)</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
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