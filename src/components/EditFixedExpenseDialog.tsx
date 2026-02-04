import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/utils/toast";
import { CategoryCombobox } from "./CategoryCombobox";
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const expenseSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  amount: z.coerce.number().positive("O valor deve ser positivo."),
  category: z.string().optional(),
  day_of_month: z.coerce.number().min(1).max(31).optional().nullable(),
});

interface FixedExpenseToEdit {
    id: string;
    name: string;
    amount: number;
    category: string | null;
    day_of_month: number | null;
}

interface EditFixedExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: FixedExpenseToEdit | null;
}

const daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1);

const EditFixedExpenseDialog = ({ isOpen, onOpenChange, expense }: EditFixedExpenseDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    if (expense) {
      reset({
        name: expense.name,
        amount: expense.amount,
        category: expense.category || "",
        day_of_month: expense.day_of_month || undefined,
      });
    }
  }, [expense, reset]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseSchema>) => {
      if (!expense) throw new Error("Nenhuma despesa selecionada.");
      
      // Garante que day_of_month seja null se for undefined/vazio
      const updateData = {
        name: data.name,
        amount: data.amount,
        category: data.category,
        day_of_month: data.day_of_month === undefined || data.day_of_month === null ? null : data.day_of_month,
      };

      const { error } = await supabase.from("fixed_expenses").update(updateData).eq("id", expense.id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Despesa fixa atualizada!");
      queryClient.invalidateQueries({ queryKey: ["allExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_fixed_expenses"] });
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
          <DialogTitle>Editar Despesa Fixa Padrão</DialogTitle>
          <DialogDescription>
            Altere os detalhes padrão desta despesa. O dia de vencimento é recorrente mensalmente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Despesa</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="amount">Valor Padrão (R$)</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <Label>Categoria</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <CategoryCombobox
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div>
            <Label htmlFor="day_of_month">Dia do Vencimento (Opcional)</Label>
            <Controller
              name="day_of_month"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                  value={field.value ? String(field.value) : ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia do mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfMonth.map(day => (
                      <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.day_of_month && <p className="text-red-500 text-sm mt-1">{errors.day_of_month.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFixedExpenseDialog;