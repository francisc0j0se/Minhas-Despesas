import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import SpendingChart from '@/components/SpendingChart';
import RecentTransactions from '@/components/RecentTransactions';
import { summaryCards } from '@/data/mockData';
import { PlusCircle } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Transaction
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
          <SpendingChart />
        </div>
        <div className="lg:col-span-3">
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
};

export default Index;