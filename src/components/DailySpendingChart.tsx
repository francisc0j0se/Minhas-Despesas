import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useVisibility } from '@/contexts/VisibilityProvider';

interface DailySpendingChartProps {
  data: { date: string; spending: number }[];
}

const DailySpendingChart = ({ data }: DailySpendingChartProps) => {
  const { isVisible } = useVisibility();

  const yAxisFormatter = (value: number) => {
    if (!isVisible) return 'R$•••';
    return `R$${value}`;
  };

  const tooltipFormatter = (value: number) => {
    if (!isVisible) return ['R$ ••••••', 'Gastos'];
    return [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Gastos'];
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Despesas por Dia do Vencimento</CardTitle>
        <CardDescription>Evolução das suas despesas ao longo do mês selecionado.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={yAxisFormatter}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
                formatter={tooltipFormatter}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Line type="monotone" dataKey="spending" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-sm text-muted-foreground">Não há dados de despesas para exibir.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySpendingChart;