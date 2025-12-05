import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/utils/toast";

const copySchema = z.object({
  source_month: z.coerce.number(),
  source_year: z.coerce.number(),
  dest_month: z.coerce.number(),
  dest_year: z.coerce.number(),
}).refine(data => !(data.source_year === data.dest_year && data.source_month === data.dest_month), {
  message: "O mês de origem e destino não podem ser os mesmos.",
  path: ["dest_month"],
});

interface CopyExpensesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentMonth: number;
  currentYear: number;
}

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const CopyExpensesDialog = ({ isOpen, onOpenChange, currentMonth, currentYear }: CopyExpensesDialogProps) => {
  const queryClient = useQueryClient();
  const { handleSubmit, control, formState: { errors } } = useForm<z.infer<typeof copySchema>>({
    resolver: zodResolver(copySchema),
    defaultValues: {
      source_month: currentMonth,
      source_year: currentYear,
      dest_month: currentMonth === 12 ? 1 : currentMonth + 1,
      dest_year: currentMonth === 12 ? currentYear + 1 : currentYear,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof copySchema>) => {
      const { error } = await supabase.rpc('copy_monthly_expenses', {
        p_source_year: data.source_year,
        p_source_month: data.source_month,
        p_dest_year: data.dest_year,
        p_dest_month: data.dest_month,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      showSuccess(`Despesas copiadas para ${monthNames[variables.dest_month - 1]} de ${variables.dest_year}!`);
      queryClient.invalidateQueries({ queryKey: ["allExpenses", variables.dest_month, variables.dest_year] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(`Erro ao copiar despesas: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof copySchema>) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar Despesas do Mês</DialogTitle>
          <DialogDescription>
            Copie todas as despesas (fixas e variáveis) de um mês para outro. Isso irá adicionar as despesas ao mês de destino.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Copiar de:</Label>
              <Controller
                name="source_month"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                name="source_year"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Para:</Label>
              <Controller
                name="dest_month"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                name="dest_year"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          {errors.dest_month && <p className="text-red-500 text-sm">{errors.dest_month.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Copiando..." : "Copiar Despesas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CopyExpensesDialog;