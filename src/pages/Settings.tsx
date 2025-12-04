import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";
import EditCategoryDialog from "@/components/EditCategoryDialog";

interface Category {
  id: string;
  name: string;
}

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const Settings = () => {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories, isLoading, error } = useQuery<Category[]>({
    queryKey: ["categories", "list"],
    queryFn: fetchCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const { error } = await supabase.rpc('delete_category_and_uncategorize_items', {
        category_name_to_delete: categoryName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Categoria excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      showError(`Erro ao excluir categoria: ${error.message}`);
    },
  });

  const handleEditClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (categoryName: string) => {
    deleteMutation.mutate(categoryName);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold">Configurações</h1>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Categorias</CardTitle>
            <CardDescription>
              Adicione, edite ou exclua suas categorias de despesas e receitas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Carregando categorias...</p>}
            {error && <p className="text-red-500">Erro: {error.message}</p>}
            {categories && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Categoria</TableHead>
                    <TableHead className="text-right w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(category.name)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria "{category.name}" e a removerá de todas as transações e despesas associadas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteClick(category.name)}>
                                  Continuar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <EditCategoryDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setEditDialogOpen}
        categoryName={selectedCategory}
      />
    </>
  );
};

export default Settings;