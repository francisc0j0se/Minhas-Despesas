import { useState } from 'react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import SpendingChart from '@/components/SpendingChart';
import { PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import AddTransactionDialog from '@/components/AddTransactionDialog';

interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  status: string;
}

interface MonthlyExpense {
  id: string;
  name: string;
  amount: number;
}

const Index = () => {
  const [isAddTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthName = monthNames[now.getMonth()];

  const { data: fixedExpenses, isLoading: isLoadingFixedExpenses } = useQuery<MonthlyExpense[]>({
    queryKey: ["monthly_fixed_expenses", month, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_fixed_expenses', { p_month: month, p_year: year });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculateSummary = () => {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentTransactions = transactions || [];

    const totalBalance = currentTransactions.reduce((acc, t) => acc + t.amount, 0);
    
    const incomeThisMonth = currentTransactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.amount > 0 && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const expensesThisMonthFromTransactions = currentTransactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.amount < 0 && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      })
      .reduce((acc, t) => acc + t.amount, 0);
      
    const expensesThisMonthFromFixed = fixedExpenses
      ? fixedExpenses.reduce((acc, fe) => acc + fe.amount, 0)
      : 0;

    const totalExpensesThisMonth = Math.abs(expensesThisMonthFromTransactions) + expensesThisMonthFromFixed;
    const savingsThisMonth = incomeThisMonth - totalExpensesThisMonth;

    return [
      { title: 'Saldo Total', value: formatCurrency(totalBalance), change: '', description: '' },
      { title: 'Receita', value: formatCurrency(incomeThisMonth), change: '', description: 'este mês' },
      { title: 'Despesas', value: formatCurrency(totalExpensesThisMonth), change: '', description: 'este mês' },
      { title: 'Economia', value: formatCurrency(savingsThisMonth), change: '', description: 'este mês' },
    ];
  };

  const getSpendingChartData = () => {
    const monthlySpending: { [key: string]: { total: number; monthName: string } } = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

    // Processar transações variáveis
    (transactions || []).forEach(t => {
      if (t.amount < 0) {
        const date = new Date(t.date);
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthKey = `${year}-${month}`;
        
        if (!monthlySpending[monthKey]) {
          monthlySpending[monthKey] = { total: 0, monthName: monthNames[month] };
        }
        monthlySpending[monthKey].total += Math.abs(t.amount);
      }
    });

    // Adicionar despesas fixas do mês atual
    const fixedExpensesTotal = (fixedExpenses || []).reduce((acc, expense) => acc + expense.amount, 0);
    
    if (fixedExpensesTotal > 0) {
        if (!monthlySpending[currentMonthKey]) {
            monthlySpending[currentMonthKey] = { total: 0, monthName: monthNames[now.getMonth()] };
        }
        monthlySpending[currentMonthKey].total += fixedExpensesTotal;
    }

    // Formatar para o gráfico e ordenar por data
    const sortedKeys = Object.keys(monthlySpending).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        if (yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
    });

    return sortedKeys.map(key => ({
      month: monthlySpending[key].monthName,
      spending: monthlySpending[key].total
    })).slice(-7);
  };

  const isLoading = isLoadingTransactions || isLoadingFixedExpenses;

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  const summaryCards = calculateSummary();
  const spendingData = getSpendingChartData();

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Despesas de {monthName} de {year}</h1>
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
        <div className="grid gap-4">
          <SpendingChart data={spendingData} />
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