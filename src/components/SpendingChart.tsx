import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useVisibility } from '@/contexts/VisibilityProvider';

interface SpendingChartProps {
  data: { month: string; spending: number }[];
}

const SpendingChart = ({ data }: SpendingChartProps) => {
  const { isVisible } = useVisibility();

  const yAxisFormatter = (value: number) => {
    if (!isVisible) return 'R$•••';
    return `R$${value}`;
  };

  const tooltipFormatter = (value: number) => {
    if (!isVisible) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Visão Geral de Gastos</CardTitle>
        <CardDescription>Soma de despesas fixas e variáveis durante o ano.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="month"
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
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
              }}
              formatter={tooltipFormatter}
            />
            <Bar dataKey="spending" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SpendingChart;