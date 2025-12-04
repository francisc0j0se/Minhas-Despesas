import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/utils/toast";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CategoryCombobox } from "./CategoryCombobox";
import { useEffect } from "react";

const transactionSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  amount: z.coerce.number().positive("O valor deve ser um número positivo."),
  date: z.date({ required_error: "A data é obrigatória." }),
  account_id: z.string().uuid("Selecione uma conta válida."),
  category: z.string().optional(),
  type: z.enum(['income', 'expense'], { required_error: "Selecione o tipo da transação." }),
});

interface TransactionToEdit {
    id: string;
    name: string;
    amount: number;
    date: string;
    account_id: string;
    category: string | null;
}

interface EditTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  transaction: TransactionToEdit | null;
}

const fetchAccounts = async () => {
  const { data, error } = await supabase.from("accounts").select("id, name");
  if (error) throw new Error(error.message);
  return data || [];
};

const EditTransactionDialog = ({ isOpen, onOpenChange, transaction }: EditTransactionDialogProps) => {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
  });

  useEffect(() => {
    if (transaction) {
      reset({
        ...transaction,
        date: new Date(transaction.date),
        category: transaction.category || "",
        type: transaction.amount < 0 ? 'expense' : 'income',
        amount: Math.abs(transaction.amount),
      });
    }
  }, [transaction, reset]);

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const editTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transactionSchema>) => {
      if (!transaction) throw new Error("Nenhuma transação selecionada para edição.");
      
      const amountToUpdate = data.type === 'expense' ? data.amount * -1 : data.amount;
      const { type, ...transactionData } = data;

      const { error } = await supabase
        .from("transactions")
        .update({ ...transactionData, amount: amountToUpdate })
        .eq("id", transaction.id);

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Transação atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactionsWithAccount"] });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(`Erro ao atualizar transação: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof transactionSchema>) => {
    editTransactionMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
          <DialogDescription>
            Atualize os detalhes da sua transação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
           <div>
            <Label>Tipo de Transação</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex items-center space-x-4 pt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="edit-expense" />
                    <Label htmlFor="edit-expense">Despesa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="edit-income" />
                    <Label htmlFor="edit-income">Receita</Label>
                  </div>
                </RadioGroup>
              )}
            />
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
          </div>
          <div>
            <Label htmlFor="name">Nome da Transação</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <Label htmlFor="account_id">Conta</Label>
            <Controller
              name="account_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger disabled={isLoadingAccounts}>
                    <SelectValue placeholder={isLoadingAccounts ? "Carregando..." : "Selecione uma conta"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map(account => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.account_id && <p className="text-red-500 text-sm mt-1">{errors.account_id.message}</p>}
          </div>
          <div>
            <Label htmlFor="date">Data</Label>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={editTransactionMutation.isPending}>
              {editTransactionMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionDialog;