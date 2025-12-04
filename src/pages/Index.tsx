import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import SpendingChart from '@/components/SpendingChart';
import RecentTransactions from '@/components/RecentTransactions';
import { PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import FixedExpensesCard from '@/components/FixedExpensesCard';

interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  status: string;
}

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar transações:', error);
      } else if (data) {
        setTransactions(data);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculateSummary = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalBalance = transactions.reduce((acc, t) => acc + t.amount, 0);
    
    const incomeThisMonth = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.amount > 0 && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const expensesThisMonth = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.amount < 0 && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      })
      .reduce((acc, t) => acc + t.amount, 0);
      
    const savingsThisMonth = incomeThisMonth + expensesThisMonth;

    return [
      { title: 'Saldo Total', value: formatCurrency(totalBalance), change: '', description: '' },
      { title: 'Receita', value: formatCurrency(incomeThisMonth), change: '', description: 'este mês' },
      { title: 'Despesas', value: formatCurrency(Math.abs(expensesThisMonth)), change: '', description: 'este mês' },
      { title: 'Economia', value: formatCurrency(savingsThisMonth), change: '', description: 'este mês' },
    ];
  };

  const getSpendingChartData = () => {
    const monthlySpending: { [key: string]: number } = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    transactions.forEach(t => {
      if (t.amount < 0) {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlySpending[monthKey]) {
          monthlySpending[monthKey] = 0;
        }
        monthlySpending[monthKey] += Math.abs(t.amount);
      }
    });

    return Object.keys(monthlySpending).map(key => {
      const [year, month] = key.split('-');
      return {
        month: `${monthNames[parseInt(month, 10)]}`,
        spending: monthlySpending[key]
      };
    }).slice(-7);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  const summaryCards = calculateSummary();
  const spendingData = getSpendingChartData();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel</h1>
        <Button>
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
          <RecentTransactions transactions={transactions.slice(0, 5)} />
        </div>
      </div>
      <div className="grid gap-4">
        <FixedExpensesCard />
      </div>
    </div>
  );
};

export default Index;