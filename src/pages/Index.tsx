import { useState } from 'react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import SpendingChart from '@/components/SpendingChart';
import { PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import CategorySpendingChart from '@/components/CategorySpendingChart';
import UpcomingExpenses from '@/components/UpcomingExpenses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  category: string | null;
}

interface MonthlyExpense {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  day_of_month: number;
  is_paid: boolean;
}

const Index = () => {
  const [isAddTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showFixed, setShowFixed] = useState(true);
  const [showVariable, setShowVariable] = useState(true);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const monthName = monthNames[selectedMonth - 1];

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions', selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const { data, error } = await supabase
        .from('transactions')
        .select('id, name, date, amount, category')
        .gte('date', startDate)
        .lt('date', endDate);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { data: fixedExpenses, isLoading: isLoadingFixedExpenses } = useQuery<MonthlyExpense[]>({
    queryKey: ["monthly_fixed_expenses", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_fixed_expenses', { p_month: selectedMonth, p_year: selectedYear });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calculateSummary = () => {
    const currentTransactions = transactions || [];
    const incomeThisMonth = currentTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    
    const expensesFromTransactions = currentTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
    const expensesFromFixed = (fixedExpenses || []).reduce((acc, fe) => acc + fe.amount, 0);
    const paidFixedExpenses = (fixedExpenses || []).filter(fe => fe.is_paid).reduce((acc, fe) => acc + fe.amount, 0);

    const totalExpensesThisMonth = (showVariable ? Math.abs(expensesFromTransactions) : 0) + (showFixed ? expensesFromFixed : 0);
    const totalPaidThisMonth = (showVariable ? Math.abs(expensesFromTransactions) : 0) + (showFixed ? paidFixedExpenses : 0);
    
    const savingsThisMonth = incomeThisMonth - totalExpensesThisMonth;
    const totalBalance = incomeThisMonth + (showVariable ? expensesFromTransactions : 0) - (showFixed ? expensesFromFixed : 0);

    return [
      { title: 'Saldo do Mês', value: formatCurrency(totalBalance), change: '', description: '' },
      { title: 'Receita', value: formatCurrency(incomeThisMonth), change: '', description: 'este mês' },
      { title: 'Despesas', value: formatCurrency(totalExpensesThisMonth), change: '', description: 'este mês' },
      { title: 'Pagos', value: formatCurrency(totalPaidThisMonth), change: '', description: 'despesas fixas e variáveis' },
      { title: 'Economia', value: formatCurrency(savingsThisMonth), change: '', description: 'este mês' },
    ];
  };

  const getSpendingChartData = () => {
    const monthlySpending: { [key: string]: number } = {};
    const monthNamesChart = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    if (showVariable) {
      (transactions || []).filter(t => t.amount < 0).forEach(t => {
        const date = new Date(t.date);
        const monthKey = monthNamesChart[date.getMonth()];
        monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + Math.abs(t.amount);
      });
    }

    if (showFixed) {
      const fixedExpensesTotal = (fixedExpenses || []).reduce((acc, expense) => acc + expense.amount, 0);
      const currentMonthName = monthNamesChart[selectedMonth - 1];
      monthlySpending[currentMonthName] = (monthlySpending[currentMonthName] || 0) + fixedExpensesTotal;
    }

    return Object.keys(monthlySpending).map(key => ({ month: key, spending: monthlySpending[key] }));
  };

  const getCategorySpendingData = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    if (showVariable) {
      (transactions || []).filter(t => t.amount < 0).forEach(t => {
        const category = t.category || 'Sem Categoria';
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(t.amount);
      });
    }

    if (showFixed) {
      (fixedExpenses || []).forEach(fe => {
        const category = fe.category || 'Sem Categoria';
        categoryTotals[category] = (categoryTotals[category] || 0) + fe.amount;
      });
    }

    return Object.keys(categoryTotals).map(name => ({ name, value: categoryTotals[name] }));
  };

  const getUpcomingExpenses = () => {
    const now = new Date();
    const today = now.getDate();
    const nextWeek = new Date();
    nextWeek.setDate(today + 7);

    return (fixedExpenses || [])
      .filter(fe => !fe.is_paid)
      .filter(fe => {
        const dueDate = fe.day_of_month;
        if (nextWeek.getMonth() !== now.getMonth()) {
          return dueDate >= today || dueDate <= nextWeek.getDate();
        }
        return dueDate >= today && dueDate <= nextWeek.getDate();
      })
      .sort((a, b) => a.day_of_month - b.day_of_month);
  };

  const isLoading = isLoadingTransactions || isLoadingFixedExpenses;

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  const summaryCards = calculateSummary();
  const spendingData = getSpendingChartData();
  const categorySpendingData = getCategorySpendingData();
  const upcomingExpenses = getUpcomingExpenses();

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Painel de {monthName} de {selectedYear}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="fixed" checked={showFixed} onCheckedChange={(checked) => setShowFixed(!!checked)} />
                <Label htmlFor="fixed">Despesas Fixas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="variable" checked={showVariable} onCheckedChange={(checked) => setShowVariable(!!checked)} />
                <Label htmlFor="variable">Despesas Variáveis</Label>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex gap-2">
              <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setAddTransactionDialogOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Transação
            </Button>
          </div>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {summaryCards.map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              change={card.change}
              description={card.description}
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <SpendingChart data={spendingData} />
          </div>
          <div className="lg:col-span-3">
            <CategorySpendingChart data={categorySpendingData} />
          </div>
        </div>
        <div>
          <UpcomingExpenses expenses={upcomingExpenses} />
        </div>
      </div>
      <AddTransactionDialog 
        isOpen={isAddTransactionDialogOpen} 
        onOpenChange={setAddTransactionDialogOpen} 
      />
    </>
  );
};

export default Index;