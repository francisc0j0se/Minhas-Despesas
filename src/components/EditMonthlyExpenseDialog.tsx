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
import { isMonthPast } from "@/utils/date";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

const expenseSchema = z.object({
  amount: z.coerce.number().positive("O valor deve ser positivo."),
  is_paid: z.boolean(),
  date: z.date({ required_error: "A data é obrigatória." }),
});

interface FixedExpenseToOverride {
  fixed_expense_id: string; 
  name: string; 
  amount: number; 
  is_paid: boolean; 
  date: string; // Data calculada/atual
}

interface EditMonthlyExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: FixedExpenseToOverride | null;
  month: number;
  year: number;
}

const EditMonthlyExpenseDialog = ({ isOpen, onOpenChange, expense, month, year }: EditMonthlyExpenseDialogProps) => {
  const queryClient = useQueryClient();
  const isPast = isMonthPast(month, year);
  
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    if (expense) {
      reset({
        amount: expense.amount,
        is_paid: expense.is_paid,
        date: new Date(expense.date),
      });
    }
  }, [expense, reset]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseSchema>) => {
      if (isPast) throw new Error("Não é possível alterar despesas em meses passados.");
      if (!expense) throw new Error("Despesa não selecionada.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      // 1. Atualiza o Override (Valor e Data de Vencimento)
      const overridePromise = supabase.from("expense_overrides").upsert({
        user_id: user.id,
        fixed_expense_id: expense.fixed_expense_id,
        month,
        year,
        amount: data.amount,
        due_date: format(data.date, 'yyyy-MM-dd'), // Salva a data completa
      }, { onConflict: 'user_id,fixed_expense_id,month,year' });

      // 2. Atualiza o Status de Pago
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
            Alterando o valor, data de vencimento e status de "{expense?.name}" apenas para o mês atual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isPast && (
            <div className="text-red-500 font-medium">
              Este mês já passou. A edição está bloqueada.
            </div>
          )}
          <div>
            <Label htmlFor="amount">Novo Valor (R$)</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} disabled={isPast} />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <Label htmlFor="date">Nova Data de Vencimento</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isPast}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
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
                  disabled={isPast}
                />
              )}
            />
            <Label htmlFor="is_paid">Marcar como Pago</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending || isPast}>
              {mutation.isPending ? "Salvando..." : "Salvar Alteração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMonthlyExpenseDialog;