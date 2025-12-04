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

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthName = monthNames[now.getMonth()];

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions', month, year],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();
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
    queryKey: ["monthly_fixed_expenses", month, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_fixed_expenses', { p_month: month, p_year: year });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calculateSummary = () => {
    const currentTransactions = transactions || [];
    const totalBalance = currentTransactions.reduce((acc, t) => acc + t.amount, 0);
    const incomeThisMonth = currentTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const expensesFromTransactions = currentTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
    const expensesFromFixed = (fixedExpenses || []).reduce((acc, fe) => acc + fe.amount, 0);
    const totalExpensesThisMonth = Math.abs(expensesFromTransactions) + expensesFromFixed;
    const savingsThisMonth = incomeThisMonth - totalExpensesThisMonth;

    return [
      { title: 'Saldo do Mês', value: formatCurrency(totalBalance), change: '', description: '' },
      { title: 'Receita', value: formatCurrency(incomeThisMonth), change: '', description: 'este mês' },
      { title: 'Despesas', value: formatCurrency(totalExpensesThisMonth), change: '', description: 'este mês' },
      { title: 'Economia', value: formatCurrency(savingsThisMonth), change: '', description: 'este mês' },
    ];
  };

  const getSpendingChartData = () => {
    // This logic can be simplified or removed if the main chart is replaced by category chart
    // For now, let's keep it as a general spending overview
    const monthlySpending: { [key: string]: number } = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    (transactions || []).filter(t => t.amount < 0).forEach(t => {
      const date = new Date(t.date);
      const monthKey = monthNames[date.getMonth()];
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + Math.abs(t.amount);
    });

    const fixedExpensesTotal = (fixedExpenses || []).reduce((acc, expense) => acc + expense.amount, 0);
    const currentMonthName = monthNames[now.getMonth()];
    monthlySpending[currentMonthName] = (monthlySpending[currentMonthName] || 0) + fixedExpensesTotal;

    return Object.keys(monthlySpending).map(key => ({ month: key, spending: monthlySpending[key] }));
  };

  const getCategorySpendingData = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    (transactions || []).filter(t => t.amount < 0).forEach(t => {
      const category = t.category || 'Sem Categoria';
      categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(t.amount);
    });

    (fixedExpenses || []).forEach(fe => {
      const category = fe.category || 'Sem Categoria';
      categoryTotals[category] = (categoryTotals[category] || 0) + fe.amount;
    });

    return Object.keys(categoryTotals).map(name => ({ name, value: categoryTotals[name] }));
  };

  const getUpcomingExpenses = () => {
    const today = now.getDate();
    const nextWeek = new Date();
    nextWeek.setDate(today + 7);

    return (fixedExpenses || [])
      .filter(fe => !fe.is_paid)
      .filter(fe => {
        const dueDate = fe.day_of_month;
        if (nextWeek.getMonth() !== now.getMonth()) {
          // Handle month rollover
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
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Painel de {monthName} de {year}</h1>
          <Button onClick={() => setAddTransactionDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Transação
          </Button>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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