import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  change: string;
}

const StatCard = ({ title, value, description, change }: StatCardProps) => {
  const isPositive = change.startsWith('+');
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>{change}</span> {description}
        </p>
      </CardContent>
    </Card>
  );
};

export default StatCard;