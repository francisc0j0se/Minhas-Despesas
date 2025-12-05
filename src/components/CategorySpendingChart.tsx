import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface CategorySpendingChartProps {
  data: { name: string; value: number }[];
}

const CategorySpendingChart = ({ data }: CategorySpendingChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas por Categoria</CardTitle>
        <CardDescription>Distribuição dos seus gastos no mês atual.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <XAxis
                dataKey="name"
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
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
                formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
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

export default CategorySpendingChart;