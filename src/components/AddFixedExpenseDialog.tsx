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

const expenseSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  amount: z.coerce.number().positive("O valor deve ser positivo."),
  category: z.string().optional(),
  day_of_month: z.coerce.number().min(1).max(31).optional(),
});

interface AddFixedExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const AddFixedExpenseDialog = ({ isOpen, onOpenChange }: AddFixedExpenseDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: "",
      category: "",
    }
  });

  const mutation = useMutation({
    mutationFn: async (newExpense: z.infer<typeof expenseSchema>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");
      const { error } = await supabase.from("fixed_expenses").insert([{ ...newExpense, user_id: user.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Despesa fixa adicionada!");
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
          <DialogTitle>Adicionar Despesa Fixa</DialogTitle>
          <DialogDescription>
            Cadastre uma despesa que se repete mensalmente.
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
            <Label htmlFor="day_of_month">Dia do Vencimento</Label>
            <Input id="day_of_month" type="number" min="1" max="31" {...register("day_of_month")} />
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

export default AddFixedExpenseDialog;