import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("name").order("name");
  if (error) throw new Error(error.message);
  return data.map(c => c.name);
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const [open, setOpen] = React.useState(false);

  const { data: categories, isLoading } = useQuery<string[]>({
    queryKey: ["categories", "names"],
    queryFn: fetchCategories,
  });

  const displayedCategories = categories || [];
  const allCategories = ["Todas", ...displayedCategories];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value && value !== "Todas" ? value : "Filtrar por Categoria"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Pesquisar categoria..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Carregando..." : "Nenhuma categoria encontrada."}
            </CommandEmpty>
            <CommandGroup>
              {allCategories.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={(currentValue) => {
                    const newValue = currentValue === "Todas" ? null : currentValue;
                    onChange(newValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      (value === category || (value === null && category === "Todas")) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}