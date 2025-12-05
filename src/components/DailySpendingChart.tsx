import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface DailySpendingChartProps {
  data: { date: string; spending: number }[];
}

const DailySpendingChart = ({ data }: DailySpending-ChartProps) => {
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
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
                formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Gastos']}
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