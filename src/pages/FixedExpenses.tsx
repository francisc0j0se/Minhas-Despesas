import FixedExpensesCard from "@/components/FixedExpensesCard";

const FixedExpenses = () => {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Despesas Fixas</h1>
      </header>
      <FixedExpensesCard />
    </div>
  );
};

export default FixedExpenses;