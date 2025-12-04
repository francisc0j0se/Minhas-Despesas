import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("name").order("name");
  if (error) throw new Error(error.message);
  return data.map(c => c.name);
};

export function CategoryCombobox({ value, onChange }: CategoryComboboxProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: categories, isLoading } = useQuery<string[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");
      const { error } = await supabase.from("categories").insert([{ name: categoryName, user_id: user.id }]);
      if (error) {
        if (error.code === '23505') {
          throw new Error(`A categoria "${categoryName}" já existe.`);
        }
        throw error;
      }
      return categoryName;
    },
    onSuccess: (newCategory) => {
      showSuccess(`Categoria "${newCategory}" criada!`);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onChange(newCategory);
      setOpen(false);
      setSearch("");
    },
    onError: (error) => {
      showError(`Erro: ${error.message}`);
    },
  });

  const handleCreateNew = () => {
    const trimmedSearch = search.trim();
    if (!trimmedSearch) return;

    const categoryExists = categories?.some(
      (c) => c.trim().toLowerCase() === trimmedSearch.toLowerCase()
    );

    if (!categoryExists) {
      addCategoryMutation.mutate(trimmedSearch);
    }
  };

  const displayedCategories = categories || [];
  const trimmedSearch = search.trim();
  const categoryExists = displayedCategories.some(c => c.trim().toLowerCase() === trimmedSearch.toLowerCase());
  const showCreateOption = trimmedSearch && !isLoading && !categoryExists;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || "Selecione uma categoria..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command filter={(value, search) => {
          if (value.toLowerCase().includes(search.toLowerCase())) return 1;
          return 0;
        }}>
          <CommandInput 
            placeholder="Pesquisar ou criar nova..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Carregando..." : "Nenhuma categoria encontrada."}
            </CommandEmpty>
            <CommandGroup>
              {displayedCategories.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreateOption && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={trimmedSearch}
                    onSelect={handleCreateNew}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Criar "{trimmedSearch}"</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}