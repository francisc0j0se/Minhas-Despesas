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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, getDate } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

const expenseSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  amount: z.coerce.number().positive("O valor deve ser positivo."),
  category: z.string().optional(),
  // Usamos 'date' para representar a data de início/referência
  date: z.date({ required_error: "A data de início é obrigatória." }),
});

interface FixedExpenseToEdit {
    id: string;
    name: string;
    amount: number;
    category: string | null;
    day_of_month: number | null;
    // Assumimos que created_at pode ser usado como data de referência se day_of_month for nulo
    created_at: string; 
}

interface EditFixedExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: FixedExpenseToEdit | null;
}

const EditFixedExpenseDialog = ({ isOpen, onOpenChange, expense }: EditFixedExpenseDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    if (expense) {
      // Se day_of_month existe, criamos uma data de referência no mês atual com esse dia.
      // Caso contrário, usamos created_at.
      let initialDate: Date;
      if (expense.day_of_month) {
        const now = new Date();
        initialDate = new Date(now.getFullYear(), now.getMonth(), expense.day_of_month);
      } else {
        initialDate = new Date(expense.created_at);
      }

      reset({
        name: expense.name,
        amount: expense.amount,
        category: expense.category || "",
        date: initialDate,
      });
    }
  }, [expense, reset]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseSchema>) => {
      if (!expense) throw new Error("Nenhuma despesa selecionada.");
      
      // Extrai o dia do mês da data selecionada para salvar como day_of_month
      const dayOfMonth = getDate(data.date);

      const updateData = {
        name: data.name,
        amount: data.amount,
        category: data.category,
        day_of_month: dayOfMonth, // Salva o dia extraído da data
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
            Altere os detalhes padrão desta despesa. O dia de vencimento será o dia da data selecionada.
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
            <Label htmlFor="date">Dia de Vencimento Recorrente</Label>
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
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? `Dia ${getDate(field.value)} (${format(field.value, "PPP")})` : <span>Escolha uma data</span>}
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