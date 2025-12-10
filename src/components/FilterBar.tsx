import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryFilter } from "./CategoryFilter";
import { StatusFilter } from "./StatusFilter";

interface FilterBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  filterType: 'all' | 'fixa' | 'variavel';
  onFilterTypeChange: (type: 'all' | 'fixa' | 'variavel') => void;
  filterCategory: string | null;
  onFilterCategoryChange: (category: string | null) => void;
  filterStatus: 'all' | 'paid' | 'pending';
  onFilterStatusChange: (status: 'all' | 'paid' | 'pending') => void;
}

const FilterBar = ({
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterCategory,
  onFilterCategoryChange,
  filterStatus,
  onFilterStatusChange,
}: FilterBarProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Input 
        placeholder="Pesquisar por nome..." 
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="col-span-full lg:col-span-1"
      />
      
      <Select value={filterType} onValueChange={onFilterTypeChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filtrar por Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Tipos</SelectItem>
          <SelectItem value="fixa">Fixa</SelectItem>
          <SelectItem value="variavel">Variável</SelectItem>
        </SelectContent>
      </Select>

      <CategoryFilter 
        value={filterCategory} 
        onChange={onFilterCategoryChange} 
      />

      <StatusFilter 
        value={filterStatus} 
        onChange={onFilterStatusChange} 
      />
    </div>
  );
};

export default FilterBar;