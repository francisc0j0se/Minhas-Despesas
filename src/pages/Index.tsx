import { useState } from 'react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import SpendingChart from '@/components/SpendingChart';
import { PlusCircle, Wallet, TrendingUp, TrendingDown, CheckCircle, PiggyBank } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import CategorySpendingChart from '@/components/CategorySpendingChart';
import UpcomingExpenses from '@/components/UpcomingExpenses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import PaidExpenses from '@/components/PaidExpenses';
import OverdueExpenses from '@/components/OverdueExpenses';
import RecentTransactions from '@/components/RecentTransactions';
import DailySpendingChart from '@/components/DailySpendingChart';

interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  category: string | null;
  status: string | null;
}

interface MonthlyExpense {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  day_of_month: number;
  is_paid: boolean;
}

interface YearlyFixedExpense {
  month: number;
  amount: number;
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

  // Query for monthly data (cards, pie chart)
  const { data: monthlyTransactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions', selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const { data, error } = await supabase
        .from('transactions')
        .select('id, name, date, amount, category, status')
        .gte('date', startDate)
        .lt('date', endDate);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // Query for monthly fixed expenses (cards, pie chart)
  const { data: monthlyFixedExpenses, isLoading: isLoadingFixedExpenses } = useQuery<MonthlyExpense[]>({
    queryKey: ["monthly_fixed_expenses", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_fixed_expenses', { p_month: selectedMonth, p_year: selectedYear });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // Query for yearly variable expenses (bar chart)
  const { data: yearlyTransactions, isLoading: isLoadingYearlyTransactions } = useQuery<Transaction[]>({
    queryKey: ['yearlyTransactions', selectedYear],
    queryFn: async () => {
      const startDate = new Date(selectedYear, 0, 1).toISOString();
      const endDate = new Date(selectedYear + 1, 0, 1).toISOString();
      const { data, error } = await supabase
        .from('transactions')
        .select('id, date, amount')
        .gte('date', startDate)
        .lt('date', endDate);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // Query for yearly fixed expenses (bar chart)
  const { data: yearlyFixedExpenses, isLoading: isLoadingYearlyFixed } = useQuery<YearlyFixedExpense[]>({
    queryKey: ["yearly_fixed_expenses", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_yearly_fixed_expenses', { p_year: selectedYear });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calculateSummary = () => {
    const currentTransactions = monthlyTransactions || [];
    const incomeThisMonth = currentTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    
    const expensesFromTransactions = currentTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
    const expensesFromFixed = (monthlyFixedExpenses || []).reduce((acc, fe) => acc + fe.amount, 0);
    const paidFixedExpenses = (monthlyFixedExpenses || []).filter(fe => fe.is_paid).reduce((acc, fe) => acc + fe.amount, 0);

    const totalExpensesThisMonth = (showVariable ? Math.abs(expensesFromTransactions) : 0) + (showFixed ? expensesFromFixed : 0);
    const totalPaidThisMonth = (showVariable ? Math.abs(expensesFromTransactions) : 0) + (showFixed ? paidFixedExpenses : 0);
    
    const savingsThisMonth = incomeThisMonth - totalExpensesThisMonth;
    const totalBalance = incomeThisMonth + (showVariable ? expensesFromTransactions : 0) - (showFixed ? expensesFromFixed : 0);

    return [
      { title: 'Saldo do Mês', value: formatCurrency(totalBalance), description: `Balanço de ${monthName}`, icon: Wallet, valueClassName: totalBalance >= 0 ? 'text-green-500' : 'text-red-500' },
      { title: 'Receita', value: formatCurrency(incomeThisMonth), description: 'Total de entradas no mês', icon: TrendingUp, valueClassName: 'text-green-500' },
      { title: 'Despesas', value: formatCurrency(totalExpensesThisMonth), description: 'Total de saídas no mês', icon: TrendingDown, valueClassName: 'text-red-500' },
      { title: 'Pagos', value: formatCurrency(totalPaidThisMonth), description: 'Total pago no mês', icon: CheckCircle },
      { title: 'Economia', value: formatCurrency(savingsThisMonth), description: 'Receita - Despesas', icon: PiggyBank, valueClassName: savingsThisMonth >= 0 ? 'text-green-500' : 'text-red-500' },
    ];
  };

  const getSpendingChartData = () => {
    const monthNamesChart = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthlySpending = Array.from({ length: 12 }, (_, i) => ({ month: monthNamesChart[i], spending: 0 }));

    if (showVariable && yearlyTransactions) {
      yearlyTransactions.filter(t => t.amount < 0).forEach(t => {
        const monthIndex = new Date(t.date).getMonth();
        monthlySpending[monthIndex].spending += Math.abs(t.amount);
      });
    }

    if (showFixed && yearlyFixedExpenses) {
      yearlyFixedExpenses.forEach(fe => {
        if (fe.month >= 1 && fe.month <= 12) {
          monthlySpending[fe.month - 1].spending += fe.amount;
        }
      });
    }

    return monthlySpending;
  };

  const getCategorySpendingData = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    if (showVariable) {
      (monthlyTransactions || []).filter(t => t.amount < 0).forEach(t => {
        const category = t.category || 'Sem Categoria';
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(t.amount);
      });
    }

    if (showFixed) {
      (monthlyFixedExpenses || []).forEach(fe => {
        const category = fe.category || 'Sem Categoria';
        categoryTotals[category] = (categoryTotals[category] || 0) + fe.amount;
      });
    }

    return Object.keys(categoryTotals).map(name => ({ name, value: categoryTotals[name] }));
  };

  const getDailySpendingData = () => {
    if (isLoadingTransactions || isLoadingFixedExpenses) return [];

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
      date: String(i + 1).padStart(2, '0'),
      spending: 0,
    }));

    if (showVariable && monthlyTransactions) {
      monthlyTransactions.filter(t => t.amount < 0).forEach(t => {
        const day = new Date(t.date).getUTCDate() - 1;
        if (day >= 0 && day < daysInMonth) {
          dailyData[day].spending += Math.abs(t.amount);
        }
      });
    }

    if (showFixed && monthlyFixedExpenses) {
      monthlyFixedExpenses.forEach(fe => {
        const day = fe.day_of_month - 1;
        if (day >= 0 && day < daysInMonth) {
          dailyData[day].spending += fe.amount;
        }
      });
    }

    return dailyData;
  };

  const getPaidExpenses = () => {
    return (monthlyFixedExpenses || [])
      .filter(fe => fe.is_paid)
      .sort((a, b) => a.day_of_month - b.day_of_month);
  };

  const getOverdueAndUpcomingExpenses = () => {
    const overdue: MonthlyExpense[] = [];
    const upcoming: MonthlyExpense[] = [];
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === selectedYear && now.getMonth() + 1 === selectedMonth;
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const unpaidExpenses = (monthlyFixedExpenses || []).filter(fe => !fe.is_paid);

    for (const expense of unpaidExpenses) {
      const expenseDueDate = new Date(selectedYear, selectedMonth - 1, expense.day_of_month);

      if (isCurrentMonth && expenseDueDate < startOfToday) {
        overdue.push(expense);
      } else {
        if (isCurrentMonth) {
          const sevenDaysFromNow = new Date(startOfToday);
          sevenDaysFromNow.setDate(startOfToday.getDate() + 7);

          if (expenseDueDate < sevenDaysFromNow) {
            upcoming.push(expense);
          }
        } else {
          upcoming.push(expense);
        }
      }
    }

    return {
      overdue: overdue.sort((a, b) => a.day_of_month - b.day_of_month),
      upcoming: upcoming.sort((a, b) => a.day_of_month - b.day_of_month),
    };
  };

  const getRecentTransactions = () => {
    return (monthlyTransactions || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  const isLoading = isLoadingTransactions || isLoadingFixedExpenses || isLoadingYearlyTransactions || isLoadingYearlyFixed;

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  const summaryCards = calculateSummary();
  const spendingData = getSpendingChartData();
  const categorySpendingData = getCategorySpendingData();
  const dailySpendingData = getDailySpendingData();
  const paidExpenses = getPaidExpenses();
  const { overdue: overdueExpenses, upcoming: upcomingExpenses } = getOverdueAndUpcomingExpenses();
  const recentTransactions = getRecentTransactions();

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
              icon={card.icon}
              description={card.description}
              valueClassName={card.valueClassName}
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          <SpendingChart data={spendingData} />
          <CategorySpendingChart data={categorySpendingData} />
          <DailySpendingChart data={dailySpendingData} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <OverdueExpenses expenses={overdueExpenses} />
          <UpcomingExpenses expenses={upcomingExpenses} />
          <PaidExpenses expenses={paidExpenses} />
          <RecentTransactions transactions={recentTransactions} />
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