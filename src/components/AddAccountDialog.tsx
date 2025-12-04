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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/utils/toast";

const accountSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  type: z.string().min(1, "O tipo é obrigatório."),
  balance: z.coerce.number(),
});

interface AddAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const AddAccountDialog = ({ isOpen, onOpenChange }: AddAccountDialogProps) => {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "",
      balance: 0,
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: async (newAccount: z.infer<typeof accountSchema>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase.from("accounts").insert([{ ...newAccount, user_id: user.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Conta adicionada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      showError(`Erro ao adicionar conta: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof accountSchema>) => {
    addAccountMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Nova Conta</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da sua nova conta financeira.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Conta</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="type">Tipo de Conta</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                    <SelectItem value="Poupança">Poupança</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Investimentos">Investimentos</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
          </div>
          <div>
            <Label htmlFor="balance">Saldo Inicial</Label>
            <Input id="balance" type="number" step="0.01" {...register("balance")} />
            {errors.balance && <p className="text-red-500 text-sm mt-1">{errors.balance.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={addAccountMutation.isPending}>
              {addAccountMutation.isPending ? "Salvando..." : "Salvar Conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountDialog;